import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { parseError } from '../utils/errorParser.js';
import { BUTTON_STATES, SESSION } from '../utils/constants.js';
import { getDeviceId } from '../services/deviceService.js';
import { getMyDeviceExceptions } from '../services/deviceExceptionService.js';
import { getVerifiedLocation } from '../services/locationService.js';
import { distanceToPolygonMeters, isInsidePolygon } from '../utils/geofenceUtils.js';
import { requestAttendanceChallenge, getTodayAttendanceStatus, checkInRequest, checkOutRequest, undoCheckoutRequest, getBranchGeofence } from '../services/attendanceService.js';
import useOfflineQueueStore from './offlineQueueStore.js';

const findUsableDeviceException = async (deviceId, selectedDeviceException) => {
  const now = Date.now();

  if (
    selectedDeviceException?.status === 'approved' &&
    selectedDeviceException?.tempDeviceId === deviceId &&
    (!selectedDeviceException.expiresAt || new Date(selectedDeviceException.expiresAt).getTime() > now)
  ) {
    return selectedDeviceException;
  }

  try {
    const data = await getMyDeviceExceptions();
    return (data.exceptions || []).find(
      (item) =>
        item.status === 'approved' &&
        item.tempDeviceId === deviceId &&
        (!item.expiresAt || new Date(item.expiresAt).getTime() > now)
    ) || null;
  } catch (error) {
    return selectedDeviceException || null;
  }
};

const resolveOrgTimezone = (value) => {
  const timezone = String(value || '').trim();
  return timezone && !['UTC', 'Etc/UTC', 'GMT'].includes(timezone) ? timezone : 'Asia/Kolkata';
};

const useAttendanceStore = create((set, get) => ({
  buttonState: BUTTON_STATES.CHECK_IN,
  openSession: null,
  cooldownEndsAt: null,
  lastCheckout: null,
  lastCheckoutId: null,
  lastCheckOutTime: null,
  todayStatus: null,
  totalWorkedMins: 0,
  sessionsToday: 0,
  firstCheckInTime: null,
  shiftInfo: null,
  orgTimezone: 'Asia/Kolkata',
  isLoading: false,
  isSyncing: false,
  error: null,
  offlineQueue: [],
  selectedDeviceException: null,
  // Geofencing state
  branchPolygon: null,
  branchName: '',
  hasGeofence: false,
  insidePremise: false,
  currentLocation: null,
  premiseMonitoringInterval: null,

  syncWithServer: async () => {
    if (get().isSyncing) {
      return;
    }

    set({ isSyncing: true, error: null });

    try {
      const data = await getTodayAttendanceStatus();

      let buttonState = BUTTON_STATES.CHECK_IN;
      if (data.openSession) {
        buttonState = BUTTON_STATES.CHECKED_IN;
      } else if (data.cooldownEndsAt && new Date(data.cooldownEndsAt) > new Date()) {
        buttonState = BUTTON_STATES.COOLDOWN;
      } else if (data.sessionsToday >= SESSION.MAX_SESSIONS_PER_DAY) {
        buttonState = BUTTON_STATES.CAP_REACHED;
      }

      set({
        buttonState,
        openSession: data.openSession || null,
        cooldownEndsAt: data.cooldownEndsAt || null,
        lastCheckout: data.lastCheckout || null,
        lastCheckoutId: data.lastCheckoutId || null,
        lastCheckOutTime: data.lastCheckout || null,
        todayStatus: data.todayStatus || null,
        totalWorkedMins: data.totalWorkedMins || 0,
        sessionsToday: data.sessionsToday || 0,
        firstCheckInTime: data.firstCheckInTime || null,
        shiftInfo: data.shiftInfo || null,
        orgTimezone: resolveOrgTimezone(data.orgTimezone || get().orgTimezone),
        isSyncing: false,
      });
    } catch (error) {
      set({ isSyncing: false, error: parseError(error) });
    }
  },

  checkIn: async ({ selfieBase64, faceEmbedding, location, challengeToken, isOnline }) => {
    set({ isLoading: true, error: null });

    if (!isOnline) {
      const record = {
        clientRecordId: uuidv4(),
        type: 'check_in',
        timestamp: location.timestamp || Date.now(),
        selfieBase64,
        faceEmbedding: Array.isArray(faceEmbedding) ? faceEmbedding : null,
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy,
        altitude: location.altitude,
        speed: location.speed,
        isMocked: Boolean(location.isMocked),
      };
      await useOfflineQueueStore.getState().addRecord(record);
      set({
        buttonState: BUTTON_STATES.CHECKED_IN,
        openSession: { id: record.clientRecordId, checkInTime: new Date(record.timestamp).toISOString(), status: 'open' },
        todayStatus: 'pending',
        sessionsToday: get().sessionsToday + 1,
        isLoading: false,
        error: null,
      });
      return { success: true, data: { offline: true, record } };
    }

    const premiseStatus = await get().assessPremiseLocation(location);
    if (premiseStatus.verified && !premiseStatus.inside) {
      const message = 'You are outside office premises. Please move inside to check in.';
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }

    try {
      const deviceId = await getDeviceId();
      const selectedDeviceException = await findUsableDeviceException(
        deviceId,
        get().selectedDeviceException
      );
      const data = await checkInRequest({
        challengeToken,
        captureTimestamp: location.timestamp || Date.now(),
        deviceId,
        selfieBase64,
        faceEmbedding: Array.isArray(faceEmbedding) ? faceEmbedding : null,
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy,
        altitude: location.altitude,
        speed: location.speed,
        isMocked: Boolean(location.isMocked),
        useDeviceException: Boolean(selectedDeviceException),
        exceptionId: selectedDeviceException?.id,
      });

      set({
        buttonState: BUTTON_STATES.CHECKED_IN,
        openSession: data.session,
        todayStatus: data.attendanceStatus || 'present',
        firstCheckInTime: data.session?.checkInTime || get().firstCheckInTime,
        sessionsToday: get().sessionsToday + 1,
        selectedDeviceException: null,
        isLoading: false,
        error: null,
      });

      return { success: true, data };
    } catch (error) {
      const message = parseError(error);
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }
  },

  checkOut: async ({
    isFinalCheckout = false,
    selfieBase64,
    faceEmbedding,
    location,
    challengeToken,
    isOnline,
  }) => {
    set({ isLoading: true, error: null });

    if (!isOnline) {
      const record = {
        clientRecordId: uuidv4(),
        type: 'check_out',
        timestamp: location.timestamp || Date.now(),
        selfieBase64,
        faceEmbedding: Array.isArray(faceEmbedding) ? faceEmbedding : null,
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy,
        altitude: location.altitude,
        speed: location.speed,
        isMocked: Boolean(location.isMocked),
        isFinalCheckout,
      };
      await useOfflineQueueStore.getState().addRecord(record);
      set({
        buttonState: isFinalCheckout ? BUTTON_STATES.CAP_REACHED : BUTTON_STATES.COOLDOWN,
        openSession: null,
        lastCheckout: new Date(record.timestamp).toISOString(),
        lastCheckOutTime: new Date(record.timestamp).toISOString(),
        totalWorkedMins: get().totalWorkedMins,
        isLoading: false,
        error: null,
      });
      return { success: true, session: { id: record.clientRecordId, offline: true } };
    }

    try {
      const premiseStatus = await get().assessPremiseLocation(location);
      if (premiseStatus.verified && !premiseStatus.inside) {
        const message = 'You are outside office premise. Please move inside to check out.';
        set({ isLoading: false, error: message });
        return { success: false, error: message };
      }

      const deviceId = await getDeviceId();
      const selectedDeviceException = await findUsableDeviceException(
        deviceId,
        get().selectedDeviceException
      );
      const data = await checkOutRequest({
        challengeToken,
        captureTimestamp: location.timestamp || Date.now(),
        deviceId,
        selfieBase64,
        faceEmbedding: Array.isArray(faceEmbedding) ? faceEmbedding : null,
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy,
        altitude: location.altitude,
        speed: location.speed,
        isMocked: Boolean(location.isMocked),
        useDeviceException: Boolean(selectedDeviceException),
        exceptionId: selectedDeviceException?.id,
        isFinalCheckout,
      });
      const newButtonState =
        isFinalCheckout || get().sessionsToday >= SESSION.MAX_SESSIONS_PER_DAY - 1
          ? BUTTON_STATES.CAP_REACHED
          : BUTTON_STATES.COOLDOWN;

      const undoWindowEndsAt = new Date(Date.now() + SESSION.UNDO_WINDOW_MINUTES * 60000).toISOString();

      set({
        buttonState: newButtonState,
        openSession: null,
        cooldownEndsAt: data.cooldownEndsAt || null,
        lastCheckout: undoWindowEndsAt,
        lastCheckoutId: data.session.id,
        lastCheckOutTime: data.session?.checkOutTime || new Date().toISOString(),
        totalWorkedMins: data.totalWorkedMins || 0,
        selectedDeviceException: null,
        isLoading: false,
        error: null,
      });

      return { success: true, session: data.session };
    } catch (error) {
      const message = parseError(error);
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }
  },

  undoCheckout: async () => {
    set({ isLoading: true, error: null });

    try {
      const data = await undoCheckoutRequest();

      set({
        buttonState: BUTTON_STATES.CHECKED_IN,
        openSession: data.session,
        lastCheckout: null,
        lastCheckoutId: null,
        lastCheckOutTime: null,
        isLoading: false,
        error: null,
      });

      return { success: true };
    } catch (error) {
      const message = parseError(error);
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }
  },

  requestCheckIn: async () => {
    try {
      const data = await requestAttendanceChallenge();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: parseError(error) };
    }
  },

  clearError: () => set({ error: null }),
  setLoading: (value) => set({ isLoading: value }),
  setSelectedDeviceException: (value) => set({ selectedDeviceException: value }),

  // ── Geofencing Methods ──────────────────────────────────────────────────
  /**
   * Fetch branch geofence polygon from server
   */
  fetchBranchGeofence: async () => {
    try {
      const data = await getBranchGeofence();
      const polygon = Array.isArray(data?.polygon) ? data.polygon : [];

      set({
        branchPolygon: polygon,
        branchName: data?.name || '',
        hasGeofence: polygon.length >= 3,
      });

      return data;
    } catch (error) {
      console.error('Failed to fetch branch geofence:', error);
      return null;
    }
  },

  assessPremiseLocation: async (locationOverride = null) => {
    try {
      let branchPolygon = get().branchPolygon;

      if (!Array.isArray(branchPolygon) || branchPolygon.length < 3) {
        const branchData = await get().fetchBranchGeofence();
        branchPolygon = Array.isArray(branchData?.polygon) ? branchData.polygon : get().branchPolygon;
      }

      const location = locationOverride || await getVerifiedLocation();
      if (!location) {
        return { verified: false, inside: null, location: null };
      }

      const currentLocation = {
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy,
      };

      if (!Array.isArray(branchPolygon) || branchPolygon.length < 3) {
        set({
          hasGeofence: false,
          insidePremise: false,
          currentLocation,
        });
        return { verified: false, inside: null, location: currentLocation };
      }

      const point = { lat: location.latitude, lng: location.longitude };
      const insideExact = isInsidePolygon(point, branchPolygon);
      const distanceToBoundary = insideExact ? 0 : distanceToPolygonMeters(point, branchPolygon);
      const accuracy = Number(location.accuracy || 0);
      const toleranceMeters = Math.min(Math.max(accuracy, 15), 50);
      const inside = insideExact || distanceToBoundary <= toleranceMeters;

      set({
        hasGeofence: true,
        insidePremise: inside,
        currentLocation,
      });

      return {
        verified: true,
        inside,
        location: currentLocation,
        insideExact,
        buffered: !insideExact && inside,
        distanceToBoundary: Number.isFinite(distanceToBoundary) ? Number(distanceToBoundary.toFixed(2)) : null,
        toleranceMeters,
      };
    } catch (error) {
      console.error('Premise check failed:', error);
      return { verified: false, inside: null, location: null, error };
    }
  },

  /**
   * Check if user's current location is inside premise polygon
   * Updates state and returns boolean
   */
  checkPremiseStatus: async (locationOverride = null) => {
    const result = await get().assessPremiseLocation(locationOverride);
    return Boolean(result.verified && result.inside);
  },

  /**
   * Start periodic premise monitoring (every 5 seconds)
   * Stores interval ID for cleanup
   */
  startPremiseMonitoring: () => {
    // Prevent multiple intervals
    if (get().premiseMonitoringInterval) {
      return;
    }

    const intervalId = setInterval(() => {
      get().checkPremiseStatus();
    }, 5000);

    set({ premiseMonitoringInterval: intervalId });
    return intervalId;
  },

  /**
   * Stop premise monitoring and clear interval
   */
  stopPremiseMonitoring: () => {
    const intervalId = get().premiseMonitoringInterval;
    if (intervalId) {
      clearInterval(intervalId);
      set({ premiseMonitoringInterval: null });
    }
  },
}));

export default useAttendanceStore;
