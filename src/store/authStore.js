import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { parseError } from '../utils/errorParser.js';
import { getDevicePayload } from '../services/deviceService.js';
import { STORAGE_KEYS } from '../utils/constants.js';
import {
  loginRequest,
  logoutRequest,
  changePasswordRequest,
} from '../services/authService.js';

const useAuthStore = create((set, get) => ({
  employee: null,
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  hydrate: async () => {
    try {
      const accessToken = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      const userData = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);

      if (accessToken && refreshToken && userData) {
        set({
          employee: JSON.parse(userData),
          user: JSON.parse(userData),
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }
    } catch (error) {
      // fall through to clear state
    }

    set({
      employee: null,
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  login: async (email, password, deviceIdOverride) => {
    set({ isLoading: true, error: null });

    try {
      const devicePayload = await getDevicePayload();
      const data = await loginRequest({
        email: String(email).trim().toLowerCase(),
        password,
        deviceId: deviceIdOverride || devicePayload.deviceId,
      });

      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(data.employee));

      set({
        employee: data.employee,
        user: data.employee,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });

      // ✅ SECURITY FIX: Store password temporarily in secure storage, not in Zustand
      await SecureStore.setItemAsync('_tempPassword', password);

      return { success: true, employee: data.employee };
    } catch (error) {
      const message = parseError(error);
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  setPassword: async (newPassword) => {
    set({ isLoading: true, error: null });

    try {
      // ✅ SECURITY FIX: Retrieve from secure storage, not Zustand
      const currentPassword = await SecureStore.getItemAsync('_tempPassword');

      if (!currentPassword) {
        throw new Error('Session expired. Please log in again.');
      }

      const data = await changePasswordRequest({
        currentPassword,
        newPassword,
      });
      const updatedEmployee = {
        ...get().employee,
        ...data,
        isFirstLogin: false,
        requiresPasswordChange: false,
      };

      await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedEmployee));
      // ✅ SECURITY FIX: Clear temporary password after use
      await SecureStore.deleteItemAsync('_tempPassword');

      set({
        employee: updatedEmployee,
        user: updatedEmployee,
        isLoading: false,
      });

      return { success: true };
    } catch (error) {
      const message = parseError(error);
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    set({ isLoading: true, error: null });

    try {
      const data = await changePasswordRequest({ currentPassword, newPassword });
      const updatedEmployee = {
        ...get().employee,
        ...data,
        isFirstLogin: false,
        requiresPasswordChange: false,
      };

      await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedEmployee));

      set({
        employee: updatedEmployee,
        user: updatedEmployee,
        isLoading: false,
      });

      return { success: true };
    } catch (error) {
      const message = parseError(error);
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  markFaceEnrolled: async () => {
    const updatedEmployee = {
      ...get().employee,
      faceEnrolled: true,
    };

    await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedEmployee));
    set({ employee: updatedEmployee, user: updatedEmployee });
  },

  logout: async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);

      if (refreshToken) {
        await logoutRequest(refreshToken).catch(() => {});
      }
    } finally {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
      // ✅ SECURITY FIX: Also clear temporary password
      await SecureStore.deleteItemAsync('_tempPassword');

      set({
        employee: null,
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
    // ✅ SECURITY FIX: Also clear temporary password
    await SecureStore.deleteItemAsync('_tempPassword');

    set({
      employee: null,
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
