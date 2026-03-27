import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// NEW: Vision Camera & Reanimated
import { 
  Camera, 
  useCameraDevice, 
  useFrameProcessor, 
  runAtTargetFps 
} from 'react-native-vision-camera';
import { scanFaces } from 'vision-camera-face-detector';
import { runOnJS } from 'react-native-reanimated';

import useAuthStore from '../../store/authStore.js';
import api from '../../api/axiosInstance.js';
import AppButton from '../../components/common/AppButton.jsx';
import { LoadingOverlay } from '../../components/common/LoadingOverlay.jsx';
import { validateFaceQuality, compressSelfie } from '../../services/faceService.js';
import { colors } from '../../theme/colors.js';
import { typography } from '../../theme/typography.js';
import { spacing } from '../../theme/spacing.js';
import { API_ROUTES } from '../../utils/constants.js';

const TOTAL_STEPS = 3;
const POLL_INTERVAL = 3000;

const STEP_INSTRUCTIONS = [
  'Look directly at the camera',
  'Slightly tilt your head left',
  'Slightly tilt your head right',
];

const FaceEnrollScreen = ({ navigation }) => {
  const markFaceEnrolled = useAuthStore((s) => s.markFaceEnrolled);

  const [hasPermission, setHasPermission] = useState(false);
  const [step, setStep] = useState(0);
  const [captured, setCaptured] = useState([]);
  const [quality, setQuality] = useState(null);
  const [isCapturing, setCapturing] = useState(false);
  const [isUploading, setUploading] = useState(false);
  const [isDone, setDone] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const device = useCameraDevice('front');
  const cameraRef = useRef(null);
  const pollRef = useRef(null);

  // Handle Permissions
  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
    return () => clearInterval(pollRef.current);
  }, []);

  // Capture Logic (Back on JS Thread)
  const processFaceResult = useCallback(async (face) => {
    if (isCapturing || captured.length !== step || isDone) return;

    const validation = validateFaceQuality(face);
    setQuality(validation);

    if (validation.valid) {
      setCapturing(true);
      try {
        // Take snapshot is faster than takePhoto for enrollment
        const photo = await cameraRef.current.takeSnapshot({ quality: 85 });
        const compressed = await compressSelfie(photo.path);

        const nextCaptured = [...captured, compressed.base64];
        setCaptured(nextCaptured);

        if (nextCaptured.length < TOTAL_STEPS) {
          setStep(nextCaptured.length);
          setQuality(null);
        } else {
          await uploadEnrollment(nextCaptured);
        }
      } catch (e) {
        setQuality({ valid: false, reason: 'Capture failed. Try again.' });
      } finally {
        setCapturing(false);
      }
    }
  }, [isCapturing, captured, step, isDone]);

  // Frame Processor (Native Thread)
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    runAtTargetFps(5, () => {
      const faces = scanFaces(frame);
      if (faces.length > 0) {
        runOnJS(processFaceResult)(faces[0]);
      } else {
        runOnJS(setQuality)({ valid: false, reason: 'No face detected.' });
      }
    });
  }, [processFaceResult]);

  // --- API Functions (Upload & Poll remain the same as your original) ---
  const uploadEnrollment = async (images) => {
    setUploading(true);
    setStatusMsg('Submitting enrollment...');
    try {
      await api.post(API_ROUTES.FACE_ENROLL, { images });
      pollEnrollmentStatus();
    } catch {
      setUploading(false);
      setStatusMsg('Upload failed. Retrying...');
    }
  };

  const pollEnrollmentStatus = () => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(API_ROUTES.FACE_ENROLL_STATUS);
        if (res.data.data.status === 'completed') {
          clearInterval(pollRef.current);
          setDone(true);
          setUploading(false);
          await markFaceEnrolled();
          setTimeout(() => navigation.replace('Tabs'), 1500);
        }
      } catch (e) { /* silent poll error handling */ }
    }, POLL_INTERVAL);
  };

  if (!hasPermission) return <SafeAreaView style={styles.safe}><Text>No Camera Access</Text></SafeAreaView>;
  if (!device) return <SafeAreaView style={styles.safe}><Text>No Camera Device Found</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Progress Bar (0, 1, 2) */}
      <View style={styles.progressBar}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.progressSegment, i <= (isDone ? 2 : step) && styles.progressActive]} />
        ))}
      </View>
      
      <Text style={styles.stepLabel}>
        {isDone ? 'Enrollment Complete ✅' : `Step ${step + 1} of ${TOTAL_STEPS}`}
      </Text>

      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          device={device}
          isActive={!isDone && !isUploading}
          frameProcessor={frameProcessor}
          pixelFormat="yuv"
          photo={true}
        />

        <View style={styles.ovalGuide} />

        <View style={styles.feedbackBox}>
          {quality?.valid === false && <Text style={styles.feedbackBad}>⚠ {quality.reason}</Text>}
          {quality?.valid === true && <Text style={styles.feedbackGood}>✓ Good — capturing...</Text>}
          {!quality && <Text style={styles.feedbackNeutral}>{STEP_INSTRUCTIONS[step]}</Text>}
        </View>
      </View>

      {/* Thumbnails */}
      <View style={styles.thumbRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.thumb, captured.length > i && styles.thumbDone]}>
            <Text style={styles.thumbText}>{captured.length > i ? '✓' : (i + 1)}</Text>
          </View>
        ))}
      </View>

      {isUploading && <LoadingOverlay message={statusMsg} />}
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.textPrimary },

  progressBar: {
    flexDirection:   'row',
    paddingHorizontal: spacing.xl,
    paddingTop:      spacing.base,
    gap:             spacing.sm,
  },
  progressSegment: {
    flex:         1,
    height:       4,
    borderRadius: 2,
    backgroundColor: colors.bgSubtle,
  },
  progressActive: { backgroundColor: colors.accent },
  stepLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize:   typography.base,
    color:      colors.textInverse,
    textAlign:  'center',
    marginTop:  spacing.sm,
    marginBottom: spacing.base,
  },

  cameraContainer: {
    flex:     1,
    position: 'relative',
  },
  camera: { flex: 1 },
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

  // Permission screen
  permissionBlock: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        spacing['2xl'],
  },
  permEmoji: { fontSize: 56, marginBottom: spacing.base },
  permTitle: {
    fontFamily: typography.fontBold,
    fontSize:   typography.xl,
    color:      colors.textPrimary,
    marginBottom: spacing.sm,
  },
  permSub: {
    fontFamily: typography.fontRegular,
    fontSize:   typography.base,
    color:      colors.textSecondary,
    textAlign:  'center',
  },
});

export default FaceEnrollScreen;
