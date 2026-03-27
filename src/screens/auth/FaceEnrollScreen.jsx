/**
 * @module FaceEnrollScreen
 * @description 3-selfie face enrollment flow.
 *
 *   Uses expo-camera (CameraView) + @react-native-ml-kit/face-detection
 *   via periodic camera snapshots (the same strategy as LivenessChallenge.jsx).
 *
 *   REMOVED (were not in package.json — caused metro bundler crash):
 *     ✗ react-native-vision-camera
 *     ✗ vision-camera-face-detector
 *
 *   Detection loop:
 *     1. setInterval fires every DETECT_INTERVAL_MS
 *     2. Takes a low-quality snapshot with takePictureAsync
 *     3. Runs quickFaceCheck on the snapshot (fast ML Kit mode)
 *     4. Provides real-time quality feedback to user
 *     5. On valid face → clears interval → takes full-quality capture → continues
 *
 *   No back button — employee must complete enrollment.
 *   Called by: AuthNavigator, MainNavigator (when !faceEnrolled).
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';

import useAuthStore from '../../store/authStore.js';
import api          from '../../api/axiosInstance.js';
import AppButton    from '../../components/common/AppButton.jsx';
import { LoadingOverlay } from '../../components/common/CommonComponents.jsx';
import {
  quickFaceCheck,
  compressSelfie,
  deleteTempImage,
} from '../../services/faceService.js';
import { colors }     from '../../theme/colors.js';
import { typography } from '../../theme/typography.js';
import { spacing }    from '../../theme/spacing.js';
import { API_ROUTES } from '../../utils/constants.js';

const TOTAL_STEPS        = 3;
const POLL_INTERVAL      = 3000;    // ms between backend status polls
const DETECT_INTERVAL_MS = 1200;    // ms between ML Kit detection snapshots

const STEP_INSTRUCTIONS = [
  'Look directly at the camera',
  'Slightly tilt your head left',
  'Slightly tilt your head right',
];

const FaceEnrollScreen = ({ navigation }) => {
  const markFaceEnrolled = useAuthStore((s) => s.markFaceEnrolled);

  const [permission, requestPermission] = useCameraPermissions();
  const [step,        setStep]       = useState(0);
  const [captured,    setCaptured]   = useState([]);
  const [quality,     setQuality]    = useState(null);   // { valid, reason } | null
  const [isCapturing, setCapturing]  = useState(false);
  const [isUploading, setUploading]  = useState(false);
  const [isDone,      setDone]       = useState(false);
  const [statusMsg,   setStatusMsg]  = useState('');

  const cameraRef         = useRef(null);
  const pollRef           = useRef(null);
  const detectRef         = useRef(null);   // detection interval
  const isDetecting       = useRef(false);  // prevents concurrent snapshots
  const isCapturingRef    = useRef(false);  // prevents re-entry on final capture
  const capturedRef       = useRef([]);     // mirrors captured state for closure access

  // ── Keep ref in sync with state ──────────────────────────────────────────
  useEffect(() => { capturedRef.current = captured; }, [captured]);

  // ── Boot ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!permission?.granted) requestPermission();
    return () => {
      clearInterval(detectRef.current);
      clearInterval(pollRef.current);
    };
  }, []);

  // ── Start detection loop once camera is ready ────────────────────────────
  useEffect(() => {
    if (permission?.granted && !isDone && !isUploading) {
      startDetectionLoop();
    }
    return () => clearInterval(detectRef.current);
  }, [permission?.granted, isDone, isUploading]);

  const startDetectionLoop = useCallback(() => {
    clearInterval(detectRef.current);
    isDetecting.current = false;

    detectRef.current = setInterval(async () => {
      if (isDetecting.current || isCapturingRef.current || !cameraRef.current) return;

      isDetecting.current = true;
      let snapUri = null;

      try {
        // Low-quality snapshot for detection only
        const snap = await cameraRef.current.takePictureAsync({
          quality:        0.3,
          skipProcessing: true,
          base64:         false,
        });
        snapUri = snap.uri;

        const result = await quickFaceCheck(snapUri);
        setQuality(result);

        if (result.valid && !isCapturingRef.current) {
          // Good face detected — stop polling and do the full capture
          clearInterval(detectRef.current);
          isCapturingRef.current = true;
          setCapturing(true);
          await performCapture();
        }
      } catch {
        // Camera busy or detection error — try again next tick
      } finally {
        if (snapUri) deleteTempImage(snapUri);
        isDetecting.current = false;
      }
    }, DETECT_INTERVAL_MS);
  }, []);

  const performCapture = async () => {
    try {
      // Full-quality capture for enrollment
      const photo      = await cameraRef.current.takePictureAsync({ quality: 0.85, base64: false });
      const compressed = await compressSelfie(photo.uri);
      await deleteTempImage(photo.uri);

      const nextCaptured = [...capturedRef.current, compressed.base64];
      setCaptured(nextCaptured);

      if (nextCaptured.length < TOTAL_STEPS) {
        // Move to next step and restart detection
        setStep(nextCaptured.length);
        setQuality(null);
        isCapturingRef.current = false;
        setCapturing(false);
        startDetectionLoop();
      } else {
        // All 3 captured — upload
        await uploadEnrollment(nextCaptured);
      }
    } catch {
      setQuality({ valid: false, reason: 'Capture failed. Please try again.' });
      isCapturingRef.current = false;
      setCapturing(false);
      startDetectionLoop();
    }
  };

  const uploadEnrollment = async (images) => {
    setUploading(true);
    setStatusMsg('Submitting enrollment...');
    try {
      await api.post(API_ROUTES.FACE_ENROLL, { images });
      pollEnrollmentStatus();
    } catch {
      setUploading(false);
      setStatusMsg('Upload failed. Please try again.');
      isCapturingRef.current = false;
      setCapturing(false);
      startDetectionLoop();
    }
  };

  const pollEnrollmentStatus = () => {
    pollRef.current = setInterval(async () => {
      try {
        const res    = await api.get(API_ROUTES.FACE_ENROLL_STATUS);
        const { status } = res.data.data;

        if (status === 'completed') {
          clearInterval(pollRef.current);
          setDone(true);
          setUploading(false);
          await markFaceEnrolled();
          setTimeout(() => {
            if (navigation?.replace) navigation.replace('Tabs');
          }, 1500);
        } else if (status === 'failed') {
          clearInterval(pollRef.current);
          setUploading(false);
          setStatusMsg('Enrollment failed. Please try again.');
          setCaptured([]);
          setStep(0);
          isCapturingRef.current = false;
          setCapturing(false);
          startDetectionLoop();
        }
      } catch {
        clearInterval(pollRef.current);
        setUploading(false);
        isCapturingRef.current = false;
        setCapturing(false);
      }
    }, POLL_INTERVAL);
  };

  // ── Permission screens ───────────────────────────────────────────────────
  if (!permission) return <View style={styles.safe} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permissionBlock}>
          <Text style={styles.permEmoji}>📷</Text>
          <Text style={styles.permTitle}>Camera Access Needed</Text>
          <Text style={styles.permSub}>
            AttendEase needs camera access to enroll your face for secure attendance.
          </Text>
          <AppButton
            label="Grant Permission"
            onPress={requestPermission}
            style={{ marginTop: spacing.xl }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      {/* Progress bar */}
      <View style={styles.progressBar}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.progressSegment,
              i <= (isDone ? 2 : step) && styles.progressActive,
            ]}
          />
        ))}
      </View>
      <Text style={styles.stepLabel}>
        {isDone ? 'Enrollment Complete ✅' : `Step ${step + 1} of ${TOTAL_STEPS}`}
      </Text>

      {/* Camera — uses expo-camera CameraView (no vision-camera dependency) */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
        />

        {/* Oval face guide */}
        <View style={styles.ovalGuide} />

        {/* Quality feedback */}
        <View style={styles.feedbackBox}>
          {isCapturing ? (
            <Text style={styles.feedbackGood}>✓ Good — capturing...</Text>
          ) : quality?.valid === false ? (
            <Text style={styles.feedbackBad}>⚠ {quality.reason}</Text>
          ) : quality?.valid === true ? (
            <Text style={styles.feedbackGood}>✓ Checking quality...</Text>
          ) : (
            <Text style={styles.feedbackNeutral}>{STEP_INSTRUCTIONS[step]}</Text>
          )}
        </View>
      </View>

      {/* Thumbnail strip */}
      <View style={styles.thumbRow}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[styles.thumb, captured.length > i && styles.thumbDone]}
          >
            <Text style={styles.thumbText}>{captured.length > i ? '✓' : (i + 1)}</Text>
          </View>
        ))}
      </View>

      {isUploading && (
        <LoadingOverlay
          message={statusMsg || 'Processing...'}
          subMessage="This may take a few seconds"
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.textPrimary },

  progressBar: {
    flexDirection:     'row',
    paddingHorizontal: spacing.xl,
    paddingTop:        spacing.base,
    gap:               spacing.sm,
  },
  progressSegment: {
    flex:            1,
    height:          4,
    borderRadius:    2,
    backgroundColor: colors.bgSubtle,
  },
  progressActive: { backgroundColor: colors.accent },

  stepLabel: {
    fontFamily:   typography.fontSemiBold,
    fontSize:     typography.base,
    color:        colors.textInverse,
    textAlign:    'center',
    marginTop:    spacing.sm,
    marginBottom: spacing.base,
  },

  cameraContainer: { flex: 1, position: 'relative' },
  camera:          { flex: 1 },

  ovalGuide: {
    position:     'absolute',
    top:          '10%',
    left:         '15%',
    right:        '15%',
    bottom:       '20%',
    borderRadius: 200,
    borderWidth:  3,
    borderColor:  colors.accent,
    borderStyle:  'dashed',
  },

  feedbackBox: {
    position:        'absolute',
    bottom:          spacing.xl,
    left:            spacing.base,
    right:           spacing.base,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius:    12,
    padding:         spacing.md,
    alignItems:      'center',
  },
  feedbackNeutral: {
    fontFamily: typography.fontMedium,
    fontSize:   typography.base,
    color:      colors.textInverse,
    textAlign:  'center',
  },
  feedbackGood: {
    fontFamily: typography.fontSemiBold,
    fontSize:   typography.base,
    color:      colors.success,
    textAlign:  'center',
  },
  feedbackBad: {
    fontFamily: typography.fontSemiBold,
    fontSize:   typography.sm,
    color:      colors.dangerLight,
    textAlign:  'center',
  },

  thumbRow: {
    flexDirection:  'row',
    justifyContent: 'center',
    padding:        spacing.xl,
    gap:            spacing.base,
  },
  thumb: {
    width:           48,
    height:          48,
    borderRadius:    24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth:     2,
    borderColor:     'rgba(255,255,255,0.3)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  thumbDone: {
    backgroundColor: colors.accent,
    borderColor:     colors.accent,
  },
  thumbText: {
    fontFamily: typography.fontBold,
    fontSize:   typography.base,
    color:      colors.textInverse,
  },

  permissionBlock: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        spacing['2xl'],
    backgroundColor: colors.bgPrimary,
  },
  permEmoji: { fontSize: 56, marginBottom: spacing.base },
  permTitle: {
    fontFamily:   typography.fontBold,
    fontSize:     typography.xl,
    color:        colors.textPrimary,
    marginBottom: spacing.sm,
  },
  permSub: {
    fontFamily: typography.fontRegular,
    fontSize:   typography.base,
    color:      colors.textSecondary,
    textAlign:  'center',
    lineHeight: typography.base * 1.5,
  },
});

export default FaceEnrollScreen;