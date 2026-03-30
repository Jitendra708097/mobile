import { create } from 'zustand';
import { parseError } from '../utils/errorParser.js';
import { BUTTON_STATES, SESSION } from '../utils/constants.js';
import { getDeviceId } from '../services/deviceService.js';
import {
  requestAttendanceChallenge,
  getTodayAttendanceStatus,
  checkInRequest,
  checkOutRequest,
  undoCheckoutRequest,
} from '../services/attendanceService.js';

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

  checkIn: async ({ selfieBase64, location, challengeToken, isOnline }) => {
    set({ isLoading: true, error: null });

    if (!isOnline) {
      const message = 'Internet connection is required for secure attendance check-in.';
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }

    try {
      const deviceId = await getDeviceId();
      const data = await checkInRequest({
        challengeToken,
        captureTimestamp: location.timestamp || Date.now(),
        deviceId,
        selfieBase64,
        faceEmbedding: null,
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy,
        altitude: location.altitude,
        speed: location.speed,
        isMocked: Boolean(location.isMocked),
      });

      set({
        buttonState: BUTTON_STATES.CHECKED_IN,
        openSession: data.session,
        sessionsToday: get().sessionsToday + 1,
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
}));

export default useAttendanceStore;
