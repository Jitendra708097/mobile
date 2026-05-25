import React, { useEffect, useRef, useState } from 'react';
import { Linking, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import useAttendanceStore from '../../store/attendanceStore.js';
import useNetworkStatus from '../../hooks/useNetworkStatus.js';
import useCountdown from '../../hooks/useCountdown.js';
import AppButton from '../../components/common/AppButton.jsx';
import { LoadingOverlay, ErrorMessage } from '../../components/common/CommonComponents.jsx';
import { compressSelfie, deleteTempImage, validateFaceQuality } from '../../services/faceService.js';
import { getVerifiedLocation, getLocationErrorMessage } from '../../services/locationService.js';
import { SESSION } from '../../utils/constants.js';
import { colors } from '../../theme/colors.js';
import { typography } from '../../theme/typography.js';
import { spacing } from '../../theme/spacing.js';

const STAGE_STEPS = [
  ['face', 'Face'],
  ['capture', 'Selfie'],
  ['location', 'GPS'],
  ['submit', 'Done'],
];

const WORKFLOW_COPY = {
  checkIn: {
    title: 'Face Verification',
    locationHint: 'Verifying your location...',
    submitHint: 'Submitting attendance...',
    errorMessage: 'Could not complete attendance check-in.',
  },
  checkOut: {
    title: 'Checkout Face Verification',
    locationHint: 'Verifying your checkout location...',
    submitHint: 'Submitting check-out...',
    errorMessage: 'Could not complete attendance check-out.',
  },
};

const LivenessChallenge = ({ navigation, route }) => {
  const requestCheckIn = useAttendanceStore((state) => state.requestCheckIn);
  const checkIn = useAttendanceStore((state) => state.checkIn);
  const checkOut = useAttendanceStore((state) => state.checkOut);
  const clearError = useAttendanceStore((state) => state.clearError);
  const storeError = useAttendanceStore((state) => state.error);

  const mode = route?.params?.mode === 'checkOut' ? 'checkOut' : 'checkIn';
  const isFinalCheckout = Boolean(route?.params?.isFinalCheckout);
  const initialLocationQuality = route?.params?.locationQuality || null;
  const initialIsGeofenceBuffered = Boolean(route?.params?.isGeofenceBuffered);
  const workflowCopy = WORKFLOW_COPY[mode];

  const isOnline = useNetworkStatus();
  const [permission, requestPermission] = useCameraPermissions();
  const [challenge, setChallenge] = useState(null);
  const [hint, setHint] = useState('Preparing camera...');
  const [isBusy, setIsBusy] = useState(true);
  const [localError, setLocalError] = useState('');
  const [stage, setStage] = useState('face');
  const [challengeEndsAt, setChallengeEndsAt] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const cameraRef = useRef(null);
  const hasCompleted = useRef(false);
  const hasInitialized = useRef(false);
  const submitRef = useRef(false);
  const challengeRef = useRef(null);
  const { isComplete: challengeTimedOut } = useCountdown(
    challengeEndsAt,
    SESSION.CHALLENGE_TIMEOUT_MS / 1000
  );
  const captureInstruction = 'Tap Capture Selfie when your face is centered.';
  const cameraPrompt = stage === 'face'
    ? 'Center your face in the guide'
    : stage === 'capture'
        ? 'Hold still for selfie'
        : stage === 'location'
          ? 'Keep phone steady for GPS'
          : 'Finishing attendance';

  const setActiveChallenge = (nextChallenge) => {
    challengeRef.current = nextChallenge;
    setChallenge(nextChallenge);
  };

  useEffect(() => {
    clearError();

    if (!permission) {
      return;
    }

    if (!permission.granted) {
      requestPermission();
      setIsBusy(false);
      return;
    }

    if (hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;
    initializeChallenge();

    return () => {
      cameraRef.current = null;
    };
  }, [permission?.granted]);

  useEffect(() => {
    const hasActuallyTimedOut = challengeEndsAt
      ? Date.now() >= new Date(challengeEndsAt).getTime()
      : false;

    if (!challenge || !challengeEndsAt || isBusy || hasCompleted.current || !challengeTimedOut || !hasActuallyTimedOut) {
      return;
    }

    setActiveChallenge(null);
    setChallengeEndsAt(null);
    setStage('face');
    setHint('Session timed out. Please retry.');
    setLocalError('Session timed out. Please start a fresh scan.');
  }, [challenge, challengeEndsAt, challengeTimedOut, isBusy]);

  const initializeChallenge = async () => {
    setIsBusy(true);
    setLocalError('');
    setSuccessMessage('');
    setActiveChallenge(null);
    setChallengeEndsAt(null);
    hasCompleted.current = false;
    submitRef.current = false;
    setStage('face');

    if (!permission?.granted) {
      setHint('Camera permission is required to continue.');
      setIsBusy(false);
      return;
    }

    if (!isOnline) {
      const localChallenge = {
        challengeToken: `offline-${Date.now()}`,
        challengeType: 'selfie',
        offline: true,
      };
      setChallengeEndsAt(new Date(Date.now() + SESSION.CHALLENGE_TIMEOUT_MS).toISOString());
      setActiveChallenge(localChallenge);
      setHint(captureInstruction);
      setStage('face');
      setIsBusy(false);
      return;
    }

    const response = await requestCheckIn();

    if (!response.success) {
      setLocalError(response.error);
      setIsBusy(false);
      return;
    }

    setChallengeEndsAt(new Date(Date.now() + SESSION.CHALLENGE_TIMEOUT_MS).toISOString());
    setActiveChallenge(response.data);
    setHint(captureInstruction);
    setStage('face');
    setIsBusy(false);
  };

  const getSubmitChallenge = async () => {
    const activeChallenge = challengeRef.current;

    if (!isOnline || activeChallenge?.offline) {
      return activeChallenge;
    }

    const expiresAt = challengeEndsAt ? new Date(challengeEndsAt).getTime() : 0;
    const isNearExpiry = !expiresAt || expiresAt - Date.now() < 15000;

    if (activeChallenge?.challengeToken && !isNearExpiry) {
      return activeChallenge;
    }

    setHint('Refreshing secure token...');
    const response = await requestCheckIn();

    if (!response.success) {
      throw new Error(response.error || 'Could not refresh challenge token.');
    }

    setActiveChallenge(response.data);
    setChallengeEndsAt(new Date(Date.now() + SESSION.CHALLENGE_TIMEOUT_MS).toISOString());
    return response.data;
  };

  const captureAndSubmit = async () => {
    if (submitRef.current) {
      return;
    }

    if (!cameraRef.current) {
      setHint('Camera is getting ready. Please try again.');
      return;
    }

    submitRef.current = true;
    hasCompleted.current = true;
    setIsBusy(true);
    setHint('Capturing selfie...');
    setStage('capture');

    let compressedUri = null;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
      });
      const compressed = await compressSelfie(photo.uri);
      compressedUri = compressed.uri;
      await deleteTempImage(photo.uri);

      setHint('Checking final selfie...');
      const finalFace = await validateFaceQuality(compressed.uri);
      if (!finalFace.valid) {
        throw new Error(finalFace.reason || 'Please capture a clearer selfie.');
      }

      setHint(workflowCopy.locationHint);
      setStage('location');
      const location = await getVerifiedLocation();

      const submitChallenge = await getSubmitChallenge();
      if (!submitChallenge?.challengeToken) {
        throw new Error('Secure token is missing. Please start a fresh scan.');
      }

      setHint(workflowCopy.submitHint);
      setStage('submit');
      const response = mode === 'checkOut'
        ? await checkOut({
            isFinalCheckout,
          selfieBase64: compressed.base64,
          faceEmbedding: null,
          location,
          challengeToken: submitChallenge.challengeToken,
          isOnline,
          locationQuality: initialLocationQuality,
          isGeofenceBuffered: initialIsGeofenceBuffered,
        })
        : await checkIn({
            selfieBase64: compressed.base64,
            faceEmbedding: null,
            location,
            challengeToken: submitChallenge.challengeToken,
            isOnline,
            locationQuality: initialLocationQuality,
            isGeofenceBuffered: initialIsGeofenceBuffered,
          });

      if (!response.success) {
        throw new Error(response.error);
      }

      setActiveChallenge(null);
      setChallengeEndsAt(null);
      setSuccessMessage(mode === 'checkOut'
        ? 'Check-out recorded successfully.'
        : response.data?.offline
          ? 'Attendance saved offline. It will sync when internet returns.'
          : 'Attendance marked successfully.'
      );
      setIsBusy(false);
      setTimeout(() => navigation.goBack(), 1100);
    } catch (error) {
      const message = error.code ? getLocationErrorMessage(error.code) : error.message;
      setLocalError(message || workflowCopy.errorMessage);
      hasCompleted.current = false;
      setActiveChallenge(null);
      setChallengeEndsAt(null);
      setStage('face');
      setIsBusy(false);
    } finally {
      if (compressedUri) {
        await deleteTempImage(compressedUri);
      }
    }
  };

  if (!permission) {
    return <View style={styles.safe} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permissionBlock}>
          <Text style={styles.permissionTitle}>{workflowCopy.title}</Text>
          <Text style={styles.permissionCopy}>
            Camera access is required to verify your face before attendance is submitted.
          </Text>
          <AppButton label="Grant Permission" onPress={requestPermission} />
          <AppButton
            label="Open Settings"
            variant="outline"
            onPress={() => Linking.openSettings()}
            style={{ marginTop: spacing.sm }}
          />
          <AppButton
            label="Cancel"
            variant="ghost"
            onPress={() => navigation.goBack()}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{workflowCopy.title}</Text>
        <Text style={styles.subtitle}>{hint}</Text>
        <View style={styles.stepRow}>
          {STAGE_STEPS.map(([key, label]) => (
            <View key={key} style={[styles.stepPill, stage === key && styles.stepPillActive]}>
              <Text style={[styles.stepText, stage === key && styles.stepTextActive]}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front" />
        <View style={styles.ovalGuide} />
        <View style={styles.cameraPrompt}>
          <Text style={styles.cameraPromptText}>{cameraPrompt}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.challengeText}>{captureInstruction}</Text>
        <ErrorMessage message={localError || storeError} />
        {(localError || storeError) ? (
          <AppButton
            label="Retry Scan"
            variant="outline"
            onPress={initializeChallenge}
            style={{ marginBottom: spacing.sm }}
          />
        ) : null}
        {!localError && !storeError && !successMessage ? (
          <AppButton
            label="Capture Selfie"
            onPress={captureAndSubmit}
            disabled={!challenge || isBusy}
            style={{ marginBottom: spacing.sm }}
          />
        ) : null}
        <AppButton label="Cancel" variant="outline" onPress={() => navigation.goBack()} />
      </View>

      {isBusy && <LoadingOverlay message={hint} subMessage="Please keep your face in frame" />}
      {successMessage ? (
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Done</Text>
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        </View>
      ) : null}
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
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.base,
  },
  stepPill: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  stepPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  stepText: {
    fontFamily: typography.fontMedium,
    fontSize: typography.xs,
    color: colors.bgSubtle,
  },
  stepTextActive: {
    color: colors.textInverse,
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
  cameraPrompt: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  cameraPromptText: {
    fontFamily: typography.fontSemiBold,
    fontSize: typography.sm,
    color: colors.textInverse,
    textAlign: 'center',
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
    marginBottom: spacing.xs,
  },
  challengeTip: {
    fontFamily: typography.fontRegular,
    fontSize: typography.sm,
    color: colors.bgSubtle,
    textAlign: 'center',
    lineHeight: typography.sm * typography.normal,
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
  permissionCopy: {
    fontFamily: typography.fontRegular,
    fontSize: typography.base,
    color: colors.bgSubtle,
    textAlign: 'center',
    lineHeight: typography.base * typography.normal,
    marginBottom: spacing.base,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  successCard: {
    width: '100%',
    borderRadius: 16,
    padding: spacing['2xl'],
    backgroundColor: colors.bgSurface,
    alignItems: 'center',
  },
  successTitle: {
    fontFamily: typography.fontBold,
    fontSize: typography['2xl'],
    color: colors.success,
    marginBottom: spacing.sm,
  },
  successText: {
    fontFamily: typography.fontMedium,
    fontSize: typography.base,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});

export default LivenessChallenge;
