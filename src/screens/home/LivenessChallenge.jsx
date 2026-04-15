import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import useAttendanceStore from '../../store/attendanceStore.js';
import useNetworkStatus from '../../hooks/useNetworkStatus.js';
import AppButton from '../../components/common/AppButton.jsx';
import { LoadingOverlay, ErrorMessage } from '../../components/common/CommonComponents.jsx';
import { quickFaceCheck, detectChallengeCompletion, compressSelfie, deleteTempImage,} from '../../services/faceService.js';
import { getVerifiedLocation, getLocationErrorMessage } from '../../services/locationService.js';
import { LIVENESS_CHALLENGE_LABELS } from '../../utils/constants.js';
import { colors } from '../../theme/colors.js';
import { typography } from '../../theme/typography.js';
import { spacing } from '../../theme/spacing.js';

const DETECT_INTERVAL_MS = 1000;

const LivenessChallenge = ({ navigation }) => {
  const requestCheckIn = useAttendanceStore((state) => state.requestCheckIn);
  const checkIn = useAttendanceStore((state) => state.checkIn);
  const clearError = useAttendanceStore((state) => state.clearError);
  const storeError = useAttendanceStore((state) => state.error);

  const isOnline = useNetworkStatus();
  const [permission, requestPermission] = useCameraPermissions();
  const [challenge, setChallenge] = useState(null);
  const [hint, setHint] = useState('Preparing challenge...');
  const [isBusy, setIsBusy] = useState(true);
  const [localError, setLocalError] = useState('');

  const cameraRef = useRef(null);
  const detectRef = useRef(null);
  const isDetecting = useRef(false);
  const hasCompleted = useRef(false);

  useEffect(() => {
    clearError();

    if (!permission?.granted) {
      requestPermission();
    }

    initializeChallenge();

    return () => {
      clearInterval(detectRef.current);
      cameraRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (permission?.granted && challenge && !isBusy) {
      startDetectionLoop();
    }

    return () => clearInterval(detectRef.current);
  }, [permission?.granted, challenge, isBusy]);

  const initializeChallenge = async () => {
    setIsBusy(true);
    const response = await requestCheckIn();

    if (!response.success) {
      setLocalError(response.error);
      setIsBusy(false);
      return;
    }

    setChallenge(response.data);
    setHint(LIVENESS_CHALLENGE_LABELS[response.data.challengeType] || 'Follow the on-screen challenge');
    setIsBusy(false);
  };

  const startDetectionLoop = () => {
    clearInterval(detectRef.current);

    detectRef.current = setInterval(async () => {
      if (isDetecting.current || hasCompleted.current || !cameraRef.current) {
        return;
      }

      isDetecting.current = true;
      let snapUri = null;

      try {
        const snap = await cameraRef.current.takePictureAsync({
          quality: 0.25,
          skipProcessing: true,
          base64: false,
        });
        snapUri = snap.uri;

        const result = await quickFaceCheck(snapUri);
        if (!result.valid) {
          setHint(result.reason || 'Keep your face inside the guide');
          return;
        }

        const completion = detectChallengeCompletion(result.face, challenge.challengeType);

        if (completion.completed) {
          hasCompleted.current = true;
          clearInterval(detectRef.current);
          await captureAndSubmit();
        } else {
          setHint(LIVENESS_CHALLENGE_LABELS[challenge.challengeType] || 'Complete the challenge');
        }
      } catch (error) {
        setHint('Camera is getting ready. Please hold still.');
      } finally {
        if (snapUri) {
          await deleteTempImage(snapUri);
        }
        isDetecting.current = false;
      }
    }, DETECT_INTERVAL_MS);
  };

  const captureAndSubmit = async () => {
    setIsBusy(true);
    setHint('Capturing selfie...');

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
      });
      const compressed = await compressSelfie(photo.uri);
      await deleteTempImage(photo.uri);

      setHint('Verifying your location...');
      const location = await getVerifiedLocation();

      setHint('Submitting attendance...');
      const response = await checkIn({
        selfieBase64: compressed.base64,
        location,
        challengeToken: challenge.challengeToken,
        isOnline,
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      navigation.goBack();
    } catch (error) {
      const message = error.code ? getLocationErrorMessage(error.code) : error.message;
      setLocalError(message || 'Could not complete attendance check-in.');
      hasCompleted.current = false;
      setIsBusy(false);
      startDetectionLoop();
    }
  };

  if (!permission) {
    return <View style={styles.safe} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permissionBlock}>
          <Text style={styles.permissionTitle}>Camera permission required</Text>
          <AppButton label="Grant Permission" onPress={requestPermission} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Liveness Check</Text>
        <Text style={styles.subtitle}>{hint}</Text>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front" />
        <View style={styles.ovalGuide} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.challengeText}>
          {challenge ? LIVENESS_CHALLENGE_LABELS[challenge.challengeType] : 'Preparing challenge...'}
        </Text>
        <ErrorMessage message={localError || storeError} />
        <AppButton label="Cancel" variant="outline" onPress={() => navigation.goBack()} />
      </View>

      {isBusy && <LoadingOverlay message={hint} subMessage="Please keep your face in frame" />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.textPrimary },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.base,
  },
  title: {
    fontFamily: typography.fontBold,
    fontSize: typography.xl,
    color: colors.textInverse,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: typography.fontRegular,
    fontSize: typography.base,
    color: colors.bgSubtle,
    textAlign: 'center',
    marginTop: spacing.sm,
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
  footer: {
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  challengeText: {
    fontFamily: typography.fontSemiBold,
    fontSize: typography.lg,
    color: colors.textInverse,
    textAlign: 'center',
    marginBottom: spacing.base,
  },
  permissionBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  permissionTitle: {
    fontFamily: typography.fontBold,
    fontSize: typography.xl,
    color: colors.textInverse,
    marginBottom: spacing.base,
  },
});

export default LivenessChallenge;
