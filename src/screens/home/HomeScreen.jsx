/**
 * @module HomeScreen
 * @description Main attendance screen — the heart of the app.
 *              Syncs button state from server on EVERY screen focus (not just mount).
 *              Handles 4 button states: CHECK_IN, CHECKED_IN, COOLDOWN, CAP_REACHED.
 *              Renders GPS status bar, shift card, action button, today summary.
 *              Called by: MainNavigator (Tab 1 — Home).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';

import useAttendanceStore   from '../../store/attendanceStore.js';
import useAuthStore         from '../../store/authStore.js';
import useNotificationStore from '../../store/notificationStore.js';
import useOfflineQueueStore from '../../store/offlineQueueStore.js';
import useSyncOnFocus       from '../../hooks/useSyncOnFocus.js';
import useNetworkStatus     from '../../hooks/useNetworkStatus.js';

import CheckInButton        from '../../components/home/CheckInButton.jsx';
import CheckOutButton       from '../../components/home/CheckOutButton.jsx';
import CooldownTimer        from '../../components/home/CooldownTimer.jsx';
import TodaySummaryCard     from '../../components/home/TodaySummaryCard.jsx';
import GpsStatusBar, { GPS_STATUS } from '../../components/home/GpsStatusBar.jsx';
import { OfflineBanner }    from '../../components/common/CommonComponents.jsx';
import ConfirmCheckoutSheet from './ConfirmCheckoutSheet.jsx';
import UndoCheckoutBar      from './UndoCheckoutBar.jsx';

import { getQuickLocation, hasLocationPermission, requestLocationPermission } from '../../services/locationService.js';
import { distanceToPolygonMeters, isInsidePolygon } from '../../utils/geofenceUtils.js';
import { colors }    from '../../theme/colors.js';
import { typography }from '../../theme/typography.js';
import { spacing }   from '../../theme/spacing.js';
import { BUTTON_STATES, SESSION } from '../../utils/constants.js';
import { getGreeting, formatShiftRange } from '../../utils/formatters.js';
import dayjs from 'dayjs';

const HomeScreen = ({ navigation }) => {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const hasRequestedHomePermissions = useRef(false);
  const user = useAuthStore((s) => s.user);

  const buttonState      = useAttendanceStore((s) => s.buttonState);
  const openSession      = useAttendanceStore((s) => s.openSession);
  const cooldownEndsAt   = useAttendanceStore((s) => s.cooldownEndsAt);
  const lastCheckout     = useAttendanceStore((s) => s.lastCheckout);
  const lastCheckOutTime = useAttendanceStore((s) => s.lastCheckOutTime);
  const totalWorkedMins  = useAttendanceStore((s) => s.totalWorkedMins);
  const sessionsToday    = useAttendanceStore((s) => s.sessionsToday);
  const todayStatus      = useAttendanceStore((s) => s.todayStatus);
  const firstCheckInTime = useAttendanceStore((s) => s.firstCheckInTime);
  const shiftInfo        = useAttendanceStore((s) => s.shiftInfo);
  const orgTimezone      = useAttendanceStore((s) => s.orgTimezone);
  const isSyncing        = useAttendanceStore((s) => s.isSyncing);
  const fetchBranchGeofence = useAttendanceStore((s) => s.fetchBranchGeofence);
  const assessPremiseLocation = useAttendanceStore((s) => s.assessPremiseLocation);
  const branchPolygon    = useAttendanceStore((s) => s.branchPolygon);
  const storedBranchName = useAttendanceStore((s) => s.branchName);
  const lastPremiseCheckedAt = useAttendanceStore((s) => s.lastPremiseCheckedAt);

  const refreshUnread    = useNotificationStore((s) => s.refreshUnreadCount);
  const pendingOfflineCount = useOfflineQueueStore((s) => s.queue.length);
  const hydrateOfflineQueue = useOfflineQueueStore((s) => s.hydrate);
  const syncOfflineQueue = useOfflineQueueStore((s) => s.syncQueue);
  const isQueueSyncing = useOfflineQueueStore((s) => s.isSyncing);

  const isOnline         = useNetworkStatus();

  const [gpsStatus,  setGpsStatus]  = useState(GPS_STATUS.IDLE);
  const [branchName, setBranchName] = useState('');
  const [gpsMessage, setGpsMessage] = useState('');
  const [gpsCheckedAt, setGpsCheckedAt] = useState(null);
  const [isGpsRefreshing, setIsGpsRefreshing] = useState(false);
  const [statusNotice, setStatusNotice] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Sync on every focus ──────────────────────────────────────────────────
  useSyncOnFocus();

  // ── Refresh GPS status + unread count on focus ───────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
            await hydrateOfflineQueue();
            const branchData = await fetchBranchGeofence();
            setBranchName(branchData?.name || storedBranchName || '');
            await refreshUnread();
      }  catch (error) {
        console.error('Failed to refresh: ',error);
      }
    }

    init();
  },[]);

  useEffect(() => {
    const requestHomePermissions = async () => {
      if (!cameraPermission || hasRequestedHomePermissions.current) {
        return;
      }

      hasRequestedHomePermissions.current = true;

      if (!cameraPermission.granted && cameraPermission.canAskAgain !== false) {
        await requestCameraPermission();
      }

      const locationGranted = await hasLocationPermission();
      if (!locationGranted) {
        await requestLocationPermission();
      }
    };

    requestHomePermissions();
  }, [cameraPermission, requestCameraPermission]);

  useFocusEffect(
    useCallback(() => {
      refreshUnread();
    }, [refreshUnread])
  );

  const refreshGps = async () => {
    setIsGpsRefreshing(true);
    setGpsStatus(GPS_STATUS.LOADING);
    setGpsMessage('');

    try {
      const branchData = await fetchBranchGeofence();
      const resolvedBranchName = branchData?.name || storedBranchName || '';
      setBranchName(resolvedBranchName);

      const loc = await getQuickLocation();
      setGpsCheckedAt(dayjs().format('hh:mm A'));
      if (!loc)
      {
        setGpsMessage('Could not verify your current location. Enable location and retry.');
        setGpsStatus(GPS_STATUS.OUTSIDE);
        return { status: GPS_STATUS.OUTSIDE, message: 'Could not verify your current location. Enable location and retry.' };
      }

      const polygon = Array.isArray(branchData?.polygon) ? branchData.polygon : branchPolygon;
      const accuracy = loc.coords.accuracy;

      if (Array.isArray(polygon) && polygon.length >= 3) {
        const point = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        const insidePremise = isInsidePolygon(point, polygon);
        const distanceToBoundary = insidePremise ? 0 : distanceToPolygonMeters(point, polygon);
        const toleranceMeters = Math.min(Math.max(Number(accuracy || 0), 15), 50);
        const insideWithBuffer = insidePremise || distanceToBoundary <= toleranceMeters;

        if (!insideWithBuffer) {
          setGpsMessage(resolvedBranchName ? `Outside ${resolvedBranchName}` : 'Outside office premises');
          setGpsStatus(GPS_STATUS.OUTSIDE);
          return { status: GPS_STATUS.OUTSIDE, message: resolvedBranchName ? `Outside ${resolvedBranchName}` : 'Outside office premises' };
        }
        else if (!insidePremise)
        {
          setGpsMessage(resolvedBranchName ? `Inside ${resolvedBranchName}. Location verified with low accuracy.` : 'Location verified with low accuracy.');
          setGpsStatus(GPS_STATUS.WEAK);
          return { status: GPS_STATUS.WEAK };
        }
        else if (accuracy > 50)
        {
          setGpsMessage(resolvedBranchName ? `Inside ${resolvedBranchName}. Location accuracy is low.` : 'Location accuracy is low.');
          setGpsStatus(GPS_STATUS.WEAK);
          return { status: GPS_STATUS.WEAK };
        }
        else
        {
          setGpsStatus(GPS_STATUS.INSIDE);
          return { status: GPS_STATUS.INSIDE };
        }
      }

      if (accuracy > 100)
      {
        setGpsMessage('Location accuracy is too low to verify office boundary.');
        setGpsStatus(GPS_STATUS.OUTSIDE);
        return { status: GPS_STATUS.OUTSIDE, message: 'Location accuracy is too low to verify office boundary.' };
      }
      else
      {
        setGpsMessage('Location detected. Office boundary is not available yet.');
        setGpsStatus(GPS_STATUS.WEAK);
        return { status: GPS_STATUS.WEAK };
      }
    } finally {
      setIsGpsRefreshing(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshGps(),
        refreshUnread(),
        hydrateOfflineQueue(),
        useAttendanceStore.getState().syncWithServer(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [hydrateOfflineQueue, refreshUnread]);

  const handleSyncPending = useCallback(async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Pending records will sync once internet is available.');
      return;
    }

    const result = await syncOfflineQueue();
    await useAttendanceStore.getState().syncWithServer();
    await hydrateOfflineQueue();
    if (result?.results) {
      const synced = result.results.filter((item) => item.status === 'synced' || item.status === 'duplicate').length;
      const failed = result.results.length - synced;
      setStatusNotice({
        type: failed > 0 ? 'warning' : 'success',
        text: failed > 0 ? `${synced} synced, ${failed} need review.` : `${synced} offline record${synced === 1 ? '' : 's'} synced.`,
      });
    }
  }, [hydrateOfflineQueue, isOnline, syncOfflineQueue]);

  // ── CAP_REACHED grey button ──────────────────────────────────────────────
  const minSessionMinutes = shiftInfo ? shiftInfo.minSessionMinutes : SESSION.MIN_SESSION_MINUTES;
  const cooldownMinutes = shiftInfo ? shiftInfo.cooldownMinutes : SESSION.COOLDOWN_MINUTES;
  const maxSessionsPerDay = shiftInfo?.maxSessionsPerDay ?? null;

  const CapReachedButton = () => (
    <View style={styles.capButton}>
      <Ionicons name="checkmark-done-circle-outline" size={22} color={colors.capGrey} style={styles.capIcon} />
      <Text style={styles.capLabel}>Done for today</Text>
      <Text style={styles.capSub}>{maxSessionsPerDay ? `${maxSessionsPerDay} sessions completed` : 'Final checkout completed'}</Text>
    </View>
  );

  const sessionMinutes = openSession?.checkInTime
    ? Math.floor((Date.now() - new Date(openSession.checkInTime)) / 60000)
    : 0;

  const handleCheckoutVerification = useCallback((isFinalCheckout) => {
    setShowCheckout(false);
    navigation.push('LivenessChallenge', {
      mode: 'checkOut',
      isFinalCheckout,
    });
  }, [navigation]);

  const handleCheckInPress = useCallback(async () => {
    const result = await refreshGps();
    const nextStatus = result?.status || gpsStatus;
    const nextMessage = result?.message || gpsMessage;

    if (nextStatus === GPS_STATUS.OUTSIDE) {
      Alert.alert(
        'Move inside office',
        nextMessage || 'You need to be inside office premises before marking attendance.',
        [
          { text: 'Request Correction', onPress: () => navigation.navigate('Regularisation') },
          { text: 'Retry Location', onPress: refreshGps },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    if (nextStatus === GPS_STATUS.WEAK) {
      Alert.alert(
        'Low accuracy location',
        'GPS accuracy is weak. Continue only if you are inside the office premises.',
        [
          { text: 'Retry GPS', onPress: refreshGps },
          { text: 'Continue', onPress: () => navigation.push('LivenessChallenge') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    navigation.push('LivenessChallenge');
  }, [gpsMessage, gpsStatus, navigation]);

  const handleOpenKioskMode = useCallback(async () => {
    if (!isOnline) {
      Alert.alert('Kiosk unavailable', 'Kiosk mode requires internet connection.');
      return;
    }

    const premiseStatus = await assessPremiseLocation();
    if (!premiseStatus.verified || !premiseStatus.inside) {
      Alert.alert('Kiosk unavailable', 'Kiosk mode can be opened only inside office premises.');
      return;
    }

    navigation.push('KioskMode');
  }, [assessPremiseLocation, isOnline, navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <OfflineBanner visible={!isOnline} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.greeting} numberOfLines={1}>
              {getGreeting()}, {user?.name?.split(' ')[0]}
            </Text>
            <Text style={styles.date} numberOfLines={1}>
              {dayjs().format('dddd, D MMMM YYYY')}
            </Text>
          </View>
        </View>

        {/* ── GPS Status Bar ── */}
        <GpsStatusBar
          status={gpsStatus}
          branchName={branchName}
          message={gpsMessage}
          checkedAt={lastPremiseCheckedAt || gpsCheckedAt}
          onRetry={refreshGps}
          isRetrying={isGpsRefreshing}
        />

        {statusNotice && (
          <View style={[styles.notice, statusNotice.type === 'warning' && styles.noticeWarning]}>
            <Text style={styles.noticeText}>{statusNotice.text}</Text>
            <TouchableOpacity onPress={() => setStatusNotice(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.noticeDismiss}>Close</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Shift Info Card ── */}
        {shiftInfo && (
          <View style={styles.shiftCard}>
            <Text style={styles.shiftName} numberOfLines={1}>{shiftInfo.name}</Text>
            <Text style={styles.shiftTime}>
              {formatShiftRange(shiftInfo.startTime, shiftInfo.endTime)}
            </Text>
          </View>
        )}

        {/* ── THE BUTTON ── */}
        <View style={styles.buttonSection}>
          {buttonState === BUTTON_STATES.CHECK_IN && (
            <CheckInButton
              onPress={handleCheckInPress}
              loading={isSyncing || isGpsRefreshing}
              disabled={gpsStatus === GPS_STATUS.LOADING}
              label={gpsStatus === GPS_STATUS.OUTSIDE ? 'Check Location Again' : 'Mark Attendance'}
              hint={gpsStatus === GPS_STATUS.IDLE ? 'Location will be verified when you tap.' : gpsStatus === GPS_STATUS.OUTSIDE ? 'Retry after you enter the office premises.' : null}
            />
          )}

          {buttonState === BUTTON_STATES.CHECKED_IN && (
            <CheckOutButton
              onPress={() => setShowCheckout(true)}
              sessionStartTime={openSession?.checkInTime}
              timezone={orgTimezone}
              sessionMinutes={sessionMinutes}
              minSessionMinutes={minSessionMinutes}
            />
          )}

          {buttonState === BUTTON_STATES.COOLDOWN && (
            <CooldownTimer cooldownEndsAt={cooldownEndsAt} />
          )}

          {buttonState === BUTTON_STATES.CAP_REACHED && (
            <CapReachedButton />
          )}
        </View>

        {/* ── Today Summary ── */}
        <TodaySummaryCard
          totalWorkedMins={totalWorkedMins}
          sessionsToday={sessionsToday}
          todayStatus={todayStatus}
          firstCheckInTime={firstCheckInTime}
          lastCheckOutTime={lastCheckOutTime}
          isActive={Boolean(openSession)}
          timezone={orgTimezone}
          maxSessionsPerDay={maxSessionsPerDay}
          hasPendingSync={pendingOfflineCount > 0 || Boolean(openSession?.offline)}
        />

        {pendingOfflineCount > 0 && (
          <View style={styles.syncCard}>
            <View style={styles.syncMeta}>
              <Text style={styles.syncTitle}>{pendingOfflineCount} pending sync</Text>
              <Text style={styles.syncSubtitle}>Offline attendance records are waiting to upload.</Text>
            </View>
            <TouchableOpacity
              style={styles.syncButton}
              onPress={handleSyncPending}
              disabled={isQueueSyncing}
              activeOpacity={0.85}
            >
              <Text style={styles.syncButtonText}>{isQueueSyncing ? 'Syncing' : 'Sync'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.kioskCard} onPress={handleOpenKioskMode} activeOpacity={0.85}>
          <View style={styles.kioskIconWrap}>
            <Ionicons name="people-outline" size={21} color={colors.accent} />
          </View>
          <View style={styles.kioskMeta}>
            <Text style={styles.kioskTitle}>Kiosk Mode</Text>
            <Text style={styles.kioskSubtitle} numberOfLines={2}>Shared face attendance on this device while inside office.</Text>
          </View>
          <View style={styles.kioskActionPill}>
            <Text style={styles.kioskAction}>Open</Text>
            <Ionicons name="chevron-forward" size={15} color={colors.accent} />
          </View>
        </TouchableOpacity>

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* ── Checkout Confirmation Sheet ── */}
      <ConfirmCheckoutSheet
        visible={showCheckout}
        onClose={() => setShowCheckout(false)}
        onConfirmCheckout={handleCheckoutVerification}
        sessionStartTime={openSession?.checkInTime}
        timezone={orgTimezone}
        sessionMinutes={sessionMinutes}
        minSessionMinutes={minSessionMinutes}
        cooldownMinutes={cooldownMinutes}
      />

      {/* ── Undo Checkout Bar ── */}
      {lastCheckout && (
        <UndoCheckoutBar undoWindowEndsAt={lastCheckout} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bgPrimary },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing['3xl'] },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'flex-start',
    paddingHorizontal: spacing.base,
    paddingTop:      spacing.base,
    paddingBottom:   spacing.sm,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  greeting: {
    fontFamily: typography.fontSemiBold,
    fontSize:   typography.lg,
    color:      colors.textPrimary,
    lineHeight: typography.lg * 1.25,
  },
  date: {
    fontFamily: typography.fontRegular,
    fontSize:   typography.sm,
    color:      colors.textMuted,
    marginTop:  spacing.xs,
  },
  // ── Shift Card ────────────────────────────────────────────────────────────
  shiftCard: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    backgroundColor: colors.bgSurface,
    marginHorizontal: spacing.base,
    marginBottom:    spacing.base,
    borderRadius:    12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderLeftWidth:  3,
    borderLeftColor:  colors.accent,
    gap:              spacing.sm,
  },
  shiftName: {
    flex:       1,
    minWidth:   0,
    fontFamily: typography.fontSemiBold,
    fontSize:   typography.sm,
    color:      colors.textPrimary,
  },
  shiftTime: {
    fontFamily: typography.fontMono,
    fontSize:   typography.sm,
    color:      colors.textSecondary,
    flexShrink: 0,
  },

  // ── Button section ────────────────────────────────────────────────────────
  kioskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgSurface,
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
    marginBottom: spacing.base,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 76,
  },
  kioskIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  kioskMeta: { flex: 1, minWidth: 0, paddingRight: spacing.sm },
  kioskTitle: {
    fontFamily: typography.fontSemiBold,
    fontSize: typography.base,
    color: colors.textPrimary,
    lineHeight: typography.base * 1.25,
  },
  kioskSubtitle: {
    fontFamily: typography.fontRegular,
    fontSize: typography.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: typography.xs * typography.normal,
  },
  kioskActionPill: {
    flexDirection: 'row',
    minWidth: 58,
    minHeight: 34,
    borderRadius: 999,
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  kioskAction: {
    fontFamily: typography.fontBold,
    fontSize: typography.sm,
    color: colors.accent,
    textAlign: 'center',
    marginRight: 2,
  },

  buttonSection: {
    paddingHorizontal: spacing.base,
    marginBottom:      spacing.base,
  },

  syncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warningLight,
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    marginBottom: spacing.base,
    borderRadius: 12,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  syncMeta: { flex: 1, paddingRight: spacing.base },
  syncTitle: {
    fontFamily: typography.fontSemiBold,
    fontSize: typography.base,
    color: colors.textPrimary,
  },
  syncSubtitle: {
    fontFamily: typography.fontRegular,
    fontSize: typography.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  syncButton: {
    borderRadius: 10,
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    minWidth: 72,
    alignItems: 'center',
  },
  syncButtonText: {
    fontFamily: typography.fontSemiBold,
    fontSize: typography.sm,
    color: colors.textInverse,
  },

  // ── Cap Reached ───────────────────────────────────────────────────────────
  capButton: {
    backgroundColor: colors.bgSubtle,
    minHeight:       64,
    borderRadius:    14,
    borderWidth:     1,
    borderColor:     colors.border,
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  capIcon:  {
    marginBottom: 2,
  },
  capLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize:   typography.base,
    color:      colors.capGrey,
    textAlign:  'center',
  },
  capSub: {
    fontFamily: typography.fontRegular,
    fontSize:   typography.xs,
    color:      colors.textMuted,
    marginTop:  2,
    textAlign:  'center',
  },

  bottomPad: { height: spacing['2xl'] },
  notice: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
    borderRadius: 10,
    padding: spacing.base,
    backgroundColor: colors.successLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  noticeWarning: {
    backgroundColor: colors.warningLight,
    borderLeftColor: colors.warning,
  },
  noticeText: {
    flex: 1,
    fontFamily: typography.fontMedium,
    fontSize: typography.sm,
    color: colors.textPrimary,
  },
  noticeDismiss: {
    fontFamily: typography.fontBold,
    fontSize: typography.xs,
    color: colors.accent,
  },
});

export default HomeScreen;
