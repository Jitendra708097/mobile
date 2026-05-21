import React, { useEffect, useRef, useState } from 'react';
import { Linking, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { v4 as uuidv4 } from 'uuid';
import AppButton from '../../components/common/AppButton.jsx';
import { ErrorMessage, LoadingOverlay } from '../../components/common/CommonComponents.jsx';
import useAttendanceStore from '../../store/attendanceStore.js';
import useNetworkStatus from '../../hooks/useNetworkStatus.js';
import useCountdown from '../../hooks/useCountdown.js';
import { compressSelfie, deleteTempImage, detectChallengeCompletion, quickFaceCheck, validateFaceQuality } from '../../services/faceService.js';
import { getDeviceId } from '../../services/deviceService.js';
import { getLocationErrorMessage, getVerifiedLocation } from '../../services/locationService.js';
import { requestAttendanceChallenge } from '../../services/attendanceService.js';
import { submitKioskScan } from '../../services/kioskService.js';
import { LIVENESS_CHALLENGE_LABELS, SESSION } from '../../utils/constants.js';
import { colors } from '../../theme/colors.js';
import { spacing } from '../../theme/spacing.js';
import { typography } from '../../theme/typography.js';

const DETECT_INTERVAL_MS = 450;

export default function KioskModeScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const isOnline = useNetworkStatus();
  const assessPremiseLocation = useAttendanceStore((state) => state.assessPremiseLocation);
  const syncWithServer = useAttendanceStore((state) => state.syncWithServer);

  const [challenge, setChallenge] = useState(null);
  const [hint, setHint] = useState('Preparing kiosk...');
  const [isBusy, setIsBusy] = useState(true);
  const [error, setError] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const [stage, setStage] = useState('ready');
  const [challengeEndsAt, setChallengeEndsAt] = useState(null);

  const cameraRef = useRef(null);
  const detectRef = useRef(null);
  const isDetecting = useRef(false);
  const hasCompleted = useRef(false);
  const hasInitialized = useRef(false);
  const submitRef = useRef(false);
  const faceIssueRef = useRef({ reason: '', count: 0 });
  const challengeProgressRef = useRef({});
  const verifiedPremiseLocationRef = useRef(null);
  const { formatted: challengeCountdown, isComplete: challengeTimedOut } = useCountdown(
    challengeEndsAt,
    SESSION.CHALLENGE_TIMEOUT_MS / 1000
  );

  useEffect(() => {
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
    initializeKiosk();

    return () => {
      clearInterval(detectRef.current);
      cameraRef.current = null;
    };
  }, [permission?.granted]);

  useEffect(() => {
    if (permission?.granted && challenge && !isBusy && !lastResult) {
      startDetectionLoop();
    }

    return () => clearInterval(detectRef.current);
  }, [permission?.granted, challenge, isBusy, lastResult]);

  useEffect(() => {
    const hasActuallyTimedOut = challengeEndsAt
      ? Date.now() >= new Date(challengeEndsAt).getTime()
      : false;

    if (!challenge || !challengeEndsAt || isBusy || hasCompleted.current || !challengeTimedOut || !hasActuallyTimedOut) {
      return;
    }

    clearInterval(detectRef.current);
    setChallenge(null);
    setChallengeEndsAt(null);
    challengeProgressRef.current = {};
    setStage('ready');
    setHint('Challenge timed out.');
    setError('Challenge timed out. Tap Retry Now for a fresh scan.');
  }, [challenge, challengeEndsAt, challengeTimedOut, isBusy]);

  const initializeKiosk = async () => {
    clearInterval(detectRef.current);
    setIsBusy(true);
    setError('');
    setLastResult(null);
    setStage('ready');
    setChallenge(null);
    setChallengeEndsAt(null);
    challengeProgressRef.current = {};
    faceIssueRef.current = { reason: '', count: 0 };
    hasCompleted.current = false;
    submitRef.current = false;

    try {
      if (!permission?.granted) {
        throw new Error('Camera permission is required for kiosk mode.');
      }

      if (!isOnline) {
        throw new Error('Kiosk mode requires internet connection.');
      }

      setHint('Verifying kiosk location...');
      setStage('location');
      const startupLocation = await getVerifiedLocation();
      const premiseStatus = await assessPremiseLocation(startupLocation);
      if (!premiseStatus.verified || !premiseStatus.inside) {
        throw new Error('Kiosk mode is available only inside office premises.');
      }
      verifiedPremiseLocationRef.current = startupLocation;

      setHint('Preparing liveness challenge...');
      setStage('challenge');
      const nextChallenge = await requestAttendanceChallenge();
      setChallengeEndsAt(new Date(Date.now() + SESSION.CHALLENGE_TIMEOUT_MS).toISOString());
      setChallenge(nextChallenge);
      setHint(LIVENESS_CHALLENGE_LABELS[nextChallenge.challengeType] || 'Follow the challenge');
    } catch (err) {
      setError(err.message || 'Unable to start kiosk mode.');
      setChallenge(null);
    } finally {
      setIsBusy(false);
    }
  };

  const resetForNextScan = async (message) => {
    clearInterval(detectRef.current);
    challengeProgressRef.current = {};
    faceIssueRef.current = { reason: '', count: 0 };
    hasCompleted.current = true;
    submitRef.current = true;
    setChallenge(null);
    setChallengeEndsAt(null);
    setHint(message ? `${message}. Ready for next scan.` : 'Scan complete. Ready for next scan.');
    setStage('ready');
  };

  const startDetectionLoop = () => {
    clearInterval(detectRef.current);

    detectRef.current = setInterval(async () => {
      if (isDetecting.current || hasCompleted.current || lastResult || !cameraRef.current) {
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

        const useFastDetection = !['blink', 'smile'].includes(challenge.challengeType);
        const result = await quickFaceCheck(snapUri, {
          fast: useFastDetection,
          allowClosedEyes: challenge.challengeType === 'blink',
        });
        if (!result.valid) {
          setStage('face');
          const reason = result.reason || 'Keep face inside the guide';
          const previous = faceIssueRef.current;
          const count = previous.reason === reason ? previous.count + 1 : 1;
          faceIssueRef.current = { reason, count };
          const requiredCount = reason.includes('Multiple faces') ? 3 : 2;
          if (count >= requiredCount) {
            setHint(reason);
          }
          return;
        }

        faceIssueRef.current = { reason: '', count: 0 };
        setStage('challenge');
        const completion = detectChallengeCompletion(
          result.face,
          challenge.challengeType,
          challengeProgressRef.current
        );
        challengeProgressRef.current = completion.progress || challengeProgressRef.current;

        if (completion.completed) {
          hasCompleted.current = true;
          clearInterval(detectRef.current);
          await captureAndSubmit();
        } else {
          setHint(LIVENESS_CHALLENGE_LABELS[challenge.challengeType] || 'Complete the challenge');
        }
      } catch (err) {
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
    if (submitRef.current) {
      return;
    }

    submitRef.current = true;
    setIsBusy(true);
    setError('');
    setHint('Capturing face...');
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
        throw new Error(finalFace.reason || 'Please capture a clearer face.');
      }

      setHint('Verifying location...');
      setStage('location');
      let location = await getVerifiedLocation();
      let premiseStatus = await assessPremiseLocation(location);
      const cachedLocationAgeMs = verifiedPremiseLocationRef.current?.timestamp
        ? Date.now() - Number(verifiedPremiseLocationRef.current.timestamp)
        : Infinity;

      if ((!premiseStatus.verified || !premiseStatus.inside) && cachedLocationAgeMs <= 2 * 60 * 1000) {
        location = verifiedPremiseLocationRef.current;
        premiseStatus = await assessPremiseLocation(location);
      }

      if (!premiseStatus.verified || !premiseStatus.inside) {
        throw new Error('Kiosk mode is available only inside office premises.');
      }
      verifiedPremiseLocationRef.current = location;

      setHint('Submitting kiosk scan...');
      setStage('submit');
      const deviceId = await getDeviceId();
      const data = await submitKioskScan({
        clientRequestId: uuidv4(),
        challengeToken: challenge.challengeToken,
        captureTimestamp: location.timestamp || Date.now(),
        deviceId,
        selfieBase64: compressed.base64,
        faceEmbedding: null,
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy,
        altitude: location.altitude,
        speed: location.speed,
        isMocked: Boolean(location.isMocked),
      });

      const actionLabel = data.action === 'check_out' ? 'checked out' : 'checked in';
      setLastResult({
        name: data.matchedEmployee?.name || 'Employee',
        empCode: data.matchedEmployee?.empCode || '',
        actionLabel,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      await syncWithServer();
      await resetForNextScan(`${data.matchedEmployee?.name || 'Employee'} ${actionLabel}`);
    } catch (err) {
      const message = err?.response?.data?.error?.message || (err.code ? getLocationErrorMessage(err.code) : err.message);
      setError(message || 'Kiosk scan failed.');
      setStage('ready');
      setChallenge(null);
      setChallengeEndsAt(null);
      setHint('Scan failed. Tap Retry Now after reading the message.');
      submitRef.current = false;
    } finally {
      if (compressedUri) {
        await deleteTempImage(compressedUri);
      }
      setIsBusy(false);
    }
  };

  if (!permission) {
    return <View style={styles.safe} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permissionBlock}>
          <Text style={styles.title}>Kiosk Mode</Text>
          <Text style={styles.permissionCopy}>
            Camera access is required for shared attendance scans.
          </Text>
          <AppButton label="Grant Camera Permission" onPress={requestPermission} />
          <AppButton
            label="Open Settings"
            variant="outline"
            onPress={() => Linking.openSettings()}
            style={{ marginTop: spacing.sm }}
          />
          <AppButton
            label="Exit"
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
        <Text style={styles.title}>Kiosk Mode</Text>
        <Text style={styles.subtitle}>{hint}</Text>
        {challenge ? <Text style={styles.countdown}>Time left {challengeCountdown}</Text> : null}
        <View style={styles.activeBanner}>
          <Text style={styles.activeText}>Shared kiosk is active on this device</Text>
        </View>
        <View style={styles.stepRow}>
          {[
            ['ready', 'Ready'],
            ['face', 'Face'],
            ['challenge', 'Challenge'],
            ['location', 'Location'],
            ['submit', 'Submit'],
          ].map(([key, label]) => (
            <View key={key} style={[styles.stepPill, stage === key && styles.stepPillActive]}>
              <Text style={[styles.stepText, stage === key && styles.stepTextActive]}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front" />
        <View style={styles.ovalGuide} />
      </View>

      <View style={styles.footer}>
        {lastResult ? (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>{lastResult.name}</Text>
            <Text style={styles.resultText}>
              {lastResult.empCode ? `${lastResult.empCode} - ` : ''}{lastResult.actionLabel}
            </Text>
            <Text style={styles.resultTime}>{lastResult.time}</Text>
          </View>
        ) : null}
        <Text style={styles.challengeText}>
          {lastResult
            ? 'Tap Next Scan to continue'
            : challenge
              ? LIVENESS_CHALLENGE_LABELS[challenge.challengeType]
              : 'Waiting for next scan'}
        </Text>
        <ErrorMessage message={error} />
        {error ? (
          <AppButton
            label="Retry Now"
            variant="outline"
            onPress={initializeKiosk}
            style={{ marginBottom: spacing.sm }}
          />
        ) : null}
        {lastResult && !challenge && !isBusy && !error ? (
          <AppButton
            label="Next Scan"
            onPress={initializeKiosk}
            style={{ marginBottom: spacing.sm }}
          />
        ) : null}
        <AppButton label="Exit Kiosk" variant="outline" onPress={() => navigation.goBack()} />
      </View>

      {isBusy && <LoadingOverlay message={hint} subMessage="Keep the face inside the frame" />}
    </SafeAreaView>
  );
}

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
  countdown: {
    fontFamily: typography.fontMonoMed,
    fontSize: typography.sm,
    color: colors.accent,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  activeBanner: {
    alignSelf: 'center',
    marginTop: spacing.base,
    borderRadius: 999,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(13, 115, 119, 0.28)',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  activeText: {
    fontFamily: typography.fontSemiBold,
    fontSize: typography.xs,
    color: colors.textInverse,
  },
  stepRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
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
  permissionCopy: {
    fontFamily: typography.fontRegular,
    fontSize: typography.base,
    color: colors.bgSubtle,
    textAlign: 'center',
    lineHeight: typography.base * typography.normal,
    marginVertical: spacing.base,
  },
  resultBox: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  resultTitle: {
    fontFamily: typography.fontBold,
    fontSize: typography.lg,
    color: colors.textInverse,
    textAlign: 'center',
  },
  resultText: {
    fontFamily: typography.fontRegular,
    fontSize: typography.sm,
    color: colors.bgSubtle,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  resultTime: {
    fontFamily: typography.fontMono,
    fontSize: typography.xs,
    color: colors.bgSubtle,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
