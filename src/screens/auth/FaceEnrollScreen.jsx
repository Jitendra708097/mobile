import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
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

const FaceEnrollScreen = ({ navigation }) => {
  const user = useAuthStore((state) => state.user);
  const markFaceEnrolled = useAuthStore((state) => state.markFaceEnrolled);

  const [permission, requestPermission] = useCameraPermissions();
  const [quality, setQuality] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const cameraRef = useRef(null);
  const detectRef = useRef(null);
  const isDetecting = useRef(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }

    return () => {
      clearInterval(detectRef.current);
    };
  }, []);

  useEffect(() => {
    if (permission?.granted && !isUploading) {
      startDetectionLoop();
    }

    return () => clearInterval(detectRef.current);
  }, [permission?.granted, isUploading]);

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

        if (result.valid) {
          clearInterval(detectRef.current);
          await captureAndUpload();
        }
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
    setIsCapturing(true);
    setStatusMsg('Capturing your enrollment selfie...');

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85, base64: false });
      const compressed = await compressSelfie(photo.uri);
      await deleteTempImage(photo.uri);

      setIsUploading(true);
      setStatusMsg('Submitting face enrollment...');

      await api.post(API_ROUTES.FACE_ENROLL, {
        selfieBase64: compressed.base64,
        faceEmbedding: null,
      });

      await pollEnrollmentStatus();
    } catch (error) {
      setIsUploading(false);
      setIsCapturing(false);
      setStatusMsg('');
      setQuality({ valid: false, reason: 'Enrollment failed. Please try again.' });
      startDetectionLoop();
    }
  };

  const pollEnrollmentStatus = async () => {
    const employeeId = user?.id;

    if (!employeeId) {
      throw new Error('Missing employee id');
    }

    let attempts = 0;

    const poll = async () => {
      const response = await api.get(`${API_ROUTES.FACE_ENROLL_STATUS}/${employeeId}`);
      const status = response.data.data.status;

      if (status === 'enrolled') {
        await markFaceEnrolled();
        setStatusMsg('Enrollment complete');
        setTimeout(() => {
          navigation.replace('Tabs');
        }, 800);
        return;
      }

      if (status === 'failed') {
        throw new Error('Enrollment failed');
      }

      attempts += 1;
      if (attempts >= 10) {
        throw new Error('Enrollment timed out');
      }

      setTimeout(poll, 1000);
    };

    await poll();
  };

  if (!permission) {
    return <View style={styles.safe} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permissionBlock}>
          <Text style={styles.permEmoji}>Camera</Text>
          <Text style={styles.permTitle}>Camera Access Needed</Text>
          <Text style={styles.permSub}>AttendEase needs camera access to enroll your face.</Text>
          <AppButton label="Grant Permission" onPress={requestPermission} style={{ marginTop: spacing.xl }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Face Enrollment</Text>
      <Text style={styles.subtitle}>Center your face inside the guide and hold still.</Text>

      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front" />
        <View style={styles.ovalGuide} />
      </View>

      <View style={styles.feedbackBox}>
        {quality?.valid === false ? (
          <Text style={styles.feedbackBad}>{quality.reason}</Text>
        ) : (
          <Text style={styles.feedbackNeutral}>Good lighting and one face only.</Text>
        )}
      </View>

      {(isCapturing || isUploading) && (
        <LoadingOverlay message={statusMsg || 'Processing...'} subMessage="This may take a few seconds" />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.textPrimary },
  title: {
    fontFamily: typography.fontBold,
    fontSize: typography.xl,
    color: colors.textInverse,
    textAlign: 'center',
    marginTop: spacing.lg,
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
  permissionBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
    backgroundColor: colors.bgPrimary,
  },
  permEmoji: { fontSize: 40, marginBottom: spacing.base, color: colors.textPrimary },
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
