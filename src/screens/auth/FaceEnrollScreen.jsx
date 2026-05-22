import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axiosInstance.js';
import useAuthStore from '../../store/authStore.js';
import AppButton from '../../components/common/AppButton.jsx';
import { LoadingOverlay } from '../../components/common/CommonComponents.jsx';
import { quickFaceCheck, compressSelfie, deleteTempImage } from '../../services/faceService.js';
import { API_ROUTES } from '../../utils/constants.js';
import { colors } from '../../theme/colors.js';
import { typography } from '../../theme/typography.js';
import { spacing } from '../../theme/spacing.js';

const DETECT_INTERVAL_MS = 1200;

const FaceEnrollScreen = ({ onBack }) => {
  const user = useAuthStore((state) => state.user);
  const markFaceEnrolled = useAuthStore((state) => state.markFaceEnrolled);

  const [permission, requestPermission] = useCameraPermissions();
  const [quality, setQuality] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const cameraRef = useRef(null);
  const detectRef = useRef(null);
  const successTimeoutRef = useRef(null);
  const isDetecting = useRef(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }

    return () => {
      clearInterval(detectRef.current);
      clearTimeout(successTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (permission?.granted && !isUploading && !isSuccess) {
      startDetectionLoop();
    }

    return () => clearInterval(detectRef.current);
  }, [permission?.granted, isUploading, isSuccess]);

  const startDetectionLoop = () => {
    clearInterval(detectRef.current);

    detectRef.current = setInterval(async () => {
      if (isDetecting.current || !cameraRef.current || isCapturing) {
        return;
      }

      isDetecting.current = true;
      let snapUri = null;

      try {
        const snap = await cameraRef.current.takePictureAsync({
          quality: 0.3,
          skipProcessing: true,
          base64: false,
        });
        snapUri = snap.uri;

        const result = await quickFaceCheck(snapUri);
        setQuality(result);
      } catch (error) {
        setQuality({ valid: false, reason: 'Camera is getting ready. Please hold still.' });
      } finally {
        if (snapUri) {
          await deleteTempImage(snapUri);
        }
        isDetecting.current = false;
      }
    }, DETECT_INTERVAL_MS);
  };

  const captureAndUpload = async () => {
    if (isDetecting.current) {
      setQuality({ valid: false, reason: 'Camera is checking your face. Try again in a moment.' });
      return;
    }

    if (!cameraRef.current || !quality?.valid) {
      setQuality({ valid: false, reason: 'Center your face clearly before capturing.' });
      return;
    }

    clearInterval(detectRef.current);
    setIsCapturing(true);
    setStatusMsg('Capturing your enrollment selfie...');

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85, base64: false });
      const compressed = await compressSelfie(photo.uri);
      await deleteTempImage(photo.uri);

      setIsCapturing(false);
      setIsUploading(true);
      setStatusMsg('Submitting face enrollment...');

      await api.post(API_ROUTES.FACE_ENROLL, {
        selfieBase64: compressed.base64,
        faceEmbedding: null,
      });

      await pollEnrollmentStatus();
      setIsUploading(false);
      setStatusMsg('');
      setIsSuccess(true);
      successTimeoutRef.current = setTimeout(() => {
        markFaceEnrolled();
      }, 1400);
    } catch (error) {
      setIsUploading(false);
      setIsCapturing(false);
      setStatusMsg('');
      setQuality({ 
        valid: false, 
        reason: error.message || 'Enrollment failed. Please try again.' 
      });
      startDetectionLoop();
    }
  };

  const pollEnrollmentStatus = async () => {
    const employeeId = user?.id;

    if (!employeeId || !user) {
      throw new Error('Missing employee information. Please log in again.');
    }

    let attempts = 0;
    const MAX_ATTEMPTS = 10;
    const POLL_INTERVAL = 1000;
    const MAX_POLL_TIME = 15000;

    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const poll = async () => {
        try {
          const elapsedTime = Date.now() - startTime;
          if (elapsedTime > MAX_POLL_TIME) {
            reject(new Error('Enrollment verification timed out after 15 seconds'));
            return;
          }

          const response = await api.get(`${API_ROUTES.FACE_ENROLL_STATUS}/${employeeId}`);
          const status = response.data.data.status;

          if (status === 'enrolled') {
            resolve();
            return;
          }

          if (status === 'failed') {
            reject(new Error('Server rejected face enrollment'));
            return;
          }

          attempts += 1;
          if (attempts >= MAX_ATTEMPTS) {
            reject(new Error('Enrollment verification still pending after 10 attempts'));
            return;
          }

          setTimeout(poll, POLL_INTERVAL);
        } catch (err) {
          if (attempts < MAX_ATTEMPTS) {
            attempts += 1;
            setTimeout(poll, POLL_INTERVAL);
          } else {
            reject(err);
          }
        }
      };

      poll();
    });
  };

  if (!permission) {
    return <View style={styles.safe} />;
  }

  if (isSuccess) {
    return (
      <SafeAreaView style={styles.successSafe}>
        <View style={styles.successBlock}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={42} color={colors.textInverse} />
          </View>
          <Text style={styles.successTitle}>Enrollment Successful</Text>
          <Text style={styles.successSub}>
            Welcome to AttendEase. Taking you to your attendance dashboard.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permissionBlock}>
          <Ionicons name="camera-outline" size={44} color={colors.textPrimary} style={styles.permIcon} />
          <Text style={styles.permTitle}>Camera Access Needed</Text>
          <Text style={styles.permSub}>AttendEase needs camera access to enroll your face.</Text>
          <AppButton label="Grant Permission" onPress={requestPermission} style={{ marginTop: spacing.xl }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        {onBack ? (
          <AppButton
            label="Back"
            onPress={onBack}
            variant="ghost"
            icon={<Ionicons name="chevron-back" size={20} color={colors.accent} />}
            fullWidth={false}
            style={styles.backBtn}
            textStyle={styles.backBtnText}
          />
        ) : null}
        <Text style={styles.title}>Face Enrollment</Text>
        <Text style={styles.subtitle}>Center your face inside the guide, then capture your photo.</Text>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front" />
        <View style={styles.ovalGuide} />
      </View>

      <View style={styles.feedbackBox}>
        {quality?.valid === false ? (
          <Text style={styles.feedbackBad}>{quality.reason}</Text>
        ) : quality?.valid ? (
          <Text style={styles.feedbackGood}>Ready to capture.</Text>
        ) : (
          <Text style={styles.feedbackNeutral}>Good lighting and one face only.</Text>
        )}
        <AppButton
          label="Capture Photo"
          onPress={captureAndUpload}
          disabled={!quality?.valid || isCapturing || isUploading}
          icon={<Ionicons name="camera" size={20} color={colors.textInverse} />}
          fullWidth
          style={styles.captureBtn}
        />
      </View>

      {(isCapturing || isUploading) && (
        <LoadingOverlay message={statusMsg || 'Processing...'} subMessage="This may take a few seconds" />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.textPrimary },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.base,
  },
  backBtn: {
    minHeight: 40,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  backBtnText: {
    fontSize: typography.sm,
  },
  title: {
    fontFamily: typography.fontBold,
    fontSize: typography.xl,
    color: colors.textInverse,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.fontRegular,
    fontSize: typography.base,
    color: colors.bgSubtle,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.base,
    paddingHorizontal: spacing.lg,
  },
  cameraContainer: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  ovalGuide: {
    position: 'absolute',
    top: '12%',
    left: '15%',
    right: '15%',
    bottom: '22%',
    borderRadius: 200,
    borderWidth: 3,
    borderColor: colors.accent,
    borderStyle: 'dashed',
  },
  feedbackBox: {
    padding: spacing.base,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  feedbackNeutral: {
    fontFamily: typography.fontMedium,
    color: colors.textInverse,
    textAlign: 'center',
  },
  feedbackBad: {
    fontFamily: typography.fontMedium,
    color: colors.dangerLight,
    textAlign: 'center',
  },
  feedbackGood: {
    fontFamily: typography.fontSemiBold,
    color: colors.success,
    textAlign: 'center',
  },
  captureBtn: {
    marginTop: spacing.base,
    borderRadius: 8,
  },
  successSafe: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  successBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    marginBottom: spacing.xl,
  },
  successTitle: {
    fontFamily: typography.fontBold,
    fontSize: typography['2xl'],
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  successSub: {
    maxWidth: 320,
    fontFamily: typography.fontRegular,
    fontSize: typography.base,
    lineHeight: typography.base * typography.normal,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  permissionBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
    backgroundColor: colors.bgPrimary,
  },
  permIcon: { marginBottom: spacing.base },
  permTitle: {
    fontFamily: typography.fontBold,
    fontSize: typography.xl,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  permSub: {
    fontFamily: typography.fontRegular,
    fontSize: typography.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default FaceEnrollScreen;
