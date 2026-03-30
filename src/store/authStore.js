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
  pendingPassword: null,
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
        pendingPassword: password,
      });

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
      const data = await changePasswordRequest({
        currentPassword: get().pendingPassword,
        newPassword,
      });
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
        pendingPassword: null,
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

      set({
        employee: null,
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        pendingPassword: null,
        error: null,
      });
    }
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);

    set({
      employee: null,
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      pendingPassword: null,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
