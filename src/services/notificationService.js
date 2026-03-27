/**
 * @module notificationService
 * @description FCM push notification setup for Android and iOS.
 *              Handles permission request, FCM token retrieval,
 *              and registration of the token with the backend.
 *              Sets up foreground notification handler.
 *
 *              IMPORTANT: getExpoPushTokenAsync requires the EAS project UUID
 *              (from app.json extra.eas.projectId), NOT the slug string.
 *              Using the slug causes silent null or throws on SDK 53+.
 *              The UUID is read via expo-constants at runtime.
 *
 *              Called by: AppNavigator (on auth), ProfileScreen toggle.
 */

import * as Notifications from 'expo-notifications';
import * as Device        from 'expo-device';
import Constants          from 'expo-constants';
import { Platform }       from 'react-native';
import api from '../api/axiosInstance.js';

// ─── Configure foreground notification behaviour ──────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

// ─── EAS project ID (set in app.json → extra.eas.projectId) ──────────────────
const EAS_PROJECT_ID = Constants.expoConfig?.extra?.eas?.projectId;

/**
 * Request push notification permission from the OS.
 * @returns {Promise<boolean>} true if granted
 */
export const requestNotificationPermission = async () => {
  if (!Device.isDevice) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

/**
 * Get the Expo push token (wraps FCM token for Expo's delivery system).
 * Requires EAS_PROJECT_ID to be set in app.json — falls back gracefully if missing.
 * @returns {Promise<string|null>}
 */
export const getExpoPushToken = async () => {
  try {
    if (!Device.isDevice) return null;
    if (!EAS_PROJECT_ID) {
      console.warn(
        '[notificationService] EAS projectId missing from app.json extra.eas.projectId. ' +
        'Push tokens will not work. Replace REPLACE_WITH_YOUR_EAS_PROJECT_UUID.'
      );
      return null;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: EAS_PROJECT_ID,
    });
    return token;
  } catch {
    return null;
  }
};

/**
 * Get the raw FCM/APNs device token (for direct server-side sending).
 * @returns {Promise<string|null>}
 */
export const getFCMToken = async () => {
  try {
    if (!Device.isDevice) return null;
    const { data: token } = await Notifications.getDevicePushTokenAsync();
    return token;
  } catch {
    return null;
  }
};

/**
 * Register the device FCM token with the AttendEase backend.
 * @param {string} fcmToken
 * @param {string} deviceId
 */
export const registerTokenWithBackend = async (fcmToken, deviceId) => {
  try {
    await api.post('/device-tokens', {
      fcmToken,
      deviceId,
      platform: Platform.OS,
    });
  } catch {
    // Non-critical — silently fail, will retry on next launch
  }
};

/**
 * Full setup: request permission → get token → register with backend.
 * Safe to call multiple times — permission check is idempotent.
 *
 * @param {string} deviceId
 * @returns {Promise<{ token: string|null, granted: boolean }>}
 */
export const setupPushNotifications = async (deviceId) => {
  const granted = await requestNotificationPermission();
  if (!granted) return { token: null, granted: false };

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name:             'AttendEase',
      importance:       Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:       '#0d7377',
    });
  }

  const fcmToken = await getFCMToken();
  if (fcmToken && deviceId) {
    await registerTokenWithBackend(fcmToken, deviceId);
  }

  return { token: fcmToken, granted: true };
};

/**
 * Add a listener for notifications received while app is in the foreground.
 * @param {function} handler
 * @returns {Notifications.Subscription}
 */
export const addForegroundNotificationListener = (handler) =>
  Notifications.addNotificationReceivedListener(handler);

/**
 * Add a listener for notification taps (app in background/killed).
 * @param {function} handler
 * @returns {Notifications.Subscription}
 */
export const addNotificationResponseListener = (handler) =>
  Notifications.addNotificationResponseReceivedListener(handler);

/**
 * Set the app badge count.
 * @param {number} count
 */
export const setBadgeCount = async (count) => {
  await Notifications.setBadgeCountAsync(count);
};