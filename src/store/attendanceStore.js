import { create } from 'zustand';
import { parseError } from '../utils/errorParser.js';
import { BUTTON_STATES, SESSION } from '../utils/constants.js';
import { getDeviceId } from '../services/deviceService.js';
import { getVerifiedLocation } from '../services/locationService.js';
import { isInsidePolygon } from '../utils/geofenceUtils.js';
import { requestAttendanceChallenge, getTodayAttendanceStatus, checkInRequest, checkOutRequest, undoCheckoutRequest, getBranchGeofence } from '../services/attendanceService.js';

const useAttendanceStore = create((set, get) => ({
  buttonState: BUTTON_STATES.CHECK_IN,
  openSession: null,
  cooldownEndsAt: null,
  lastCheckout: null,
  lastCheckoutId: null,
  todayStatus: null,
  totalWorkedMins: 0,
  sessionsToday: 0,
  firstCheckInTime: null,
  shiftInfo: null,
  isLoading: false,
  isSyncing: false,
  error: null,
  offlineQueue: [],
  selectedDeviceException: null,
  // Geofencing state
  branchPolygon: null,
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
        todayStatus: data.todayStatus || null,
        totalWorkedMins: data.totalWorkedMins || 0,
        sessionsToday: data.sessionsToday || 0,
        firstCheckInTime: data.firstCheckInTime || null,
        shiftInfo: data.shiftInfo || null,
        isSyncing: false,
      });
    } catch (error) {
      set({ isSyncing: false, error: parseError(error) });
    }
  },

  checkIn: async ({ selfieBase64, faceEmbedding, location, challengeToken, isOnline }) => {
    set({ isLoading: true, error: null });

    if (!isOnline) {
      const message = 'Internet connection is required for secure attendance check-in.';
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }

    // Pre-check: Verify user is inside premise
    const insidePremise = await get().checkPremiseStatus();
    console.log("is: ",insidePremise);
    if (!insidePremise) {
      const message = '❌ You are outside office premise. Please move inside to check-in.';
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }

    try {
      const deviceId = await getDeviceId();
      const selectedDeviceException = get().selectedDeviceException;
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

  checkOut: async (isFinalCheckout = false) => {
    set({ isLoading: true, error: null });

    try {
      const data = await checkOutRequest({ isFinalCheckout });
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
        totalWorkedMins: data.totalWorkedMins || 0,
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
      console.log("Data: ",data);
      if (data?.polygon) {
        set({ branchPolygon: data.polygon });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to fetch branch geofence:', error);
      return false;
    }
  },

  /**
   * Check if user's current location is inside premise polygon
   * Updates state and returns boolean
   */
  checkPremiseStatus: async () => {
    try {
      const branchPolygon = get().branchPolygon;
      if (!branchPolygon || branchPolygon.length < 3) {
        console.warn('No valid branch polygon available');
        return false;
      }

      const location = await getVerifiedLocation();
      if (!location) {
        console.warn('Failed to get verified location');
        return false;
      }

      const inside = isInsidePolygon(
        { lat: location.latitude, lng: location.longitude },
        branchPolygon
      );

      set({
        insidePremise: inside,
        currentLocation: {
          lat: location.latitude,
          lng: location.longitude,
          accuracy: location.accuracy,
        },
      });

      return inside;
    } catch (error) {
      console.error('Premise check failed:', error);
      return false;
    }
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
