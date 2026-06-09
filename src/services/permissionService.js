import { Linking } from 'react-native';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { getDeviceId } from './deviceService.js';
import { setupPushNotifications } from './notificationService.js';

export const APP_PERMISSIONS = {
  CAMERA: 'camera',
  LOCATION: 'location',
  NOTIFICATIONS: 'notifications',
};

export const PERMISSION_ITEMS = [
  {
    key: APP_PERMISSIONS.CAMERA,
    title: 'Camera',
    icon: 'camera-outline',
    required: true,
    requirementLabel: 'Required',
    description: 'Required for face enrollment and attendance verification.',
    grantedMessage: 'Camera permission granted.',
    deniedMessage: 'Camera permission is required for face enrollment. Please allow camera access to continue.',
    failedMessage: 'Could not check camera permission. Please try again.',
  },
  {
    key: APP_PERMISSIONS.LOCATION,
    title: 'Location',
    icon: 'location-outline',
    required: true,
    requirementLabel: 'Required',
    description: 'Required to confirm your work location when marking attendance.',
    grantedMessage: 'Location permission granted.',
    deniedMessage: 'Location permission is required to mark attendance from an approved workplace.',
    failedMessage: 'Could not check location permission. Please try again.',
  },
  {
    key: APP_PERMISSIONS.NOTIFICATIONS,
    title: 'Notifications',
    icon: 'notifications-outline',
    required: false,
    requirementLabel: 'Recommended',
    description: 'Used for attendance reminders and important updates.',
    grantedMessage: 'Notifications enabled. You will receive reminders and important updates.',
    deniedMessage: 'Notifications are off. You can enable them later from Profile > Permissions.',
    failedMessage: 'Could not check notification permission. Please try again later.',
  },
];

const DEFAULT_STATUS = {
  granted: false,
  state: 'missing',
  statusLabel: 'Missing',
  canAskAgain: true,
};

const normalizePermissionResponse = (response) => {
  if (!response) {
    return DEFAULT_STATUS;
  }

  if (response.granted || response.status === 'granted') {
    return {
      granted: true,
      state: 'granted',
      statusLabel: 'Granted',
      canAskAgain: Boolean(response.canAskAgain),
      rawStatus: response.status,
    };
  }

  const canAskAgain = response.canAskAgain !== false;
  const state = response.status === 'denied' ? 'denied' : 'missing';

  return {
    granted: false,
    state,
    statusLabel: state === 'denied' ? 'Denied' : 'Missing',
    canAskAgain,
    rawStatus: response.status,
  };
};

const getErrorDetails = (error) => ({
  code: error?.code,
  name: error?.name,
  message: error?.message || String(error),
});

const logPermissionError = (key, action, error) => {
  const details = getErrorDetails(error);
  console.error(`[permissionService] ${action} failed for ${key}`, details);
  return details;
};

const failedStatus = (errorDetails) => ({
  granted: false,
  state: 'failed',
  statusLabel: 'Failed',
  canAskAgain: false,
  errorCode: errorDetails?.code,
  errorName: errorDetails?.name,
  errorMessage: errorDetails?.message,
});

export const getPermissionItem = (key) =>
  PERMISSION_ITEMS.find((item) => item.key === key);

export const getPermissionStatus = async (key) => {
  try {
    if (key === APP_PERMISSIONS.CAMERA) {
      return normalizePermissionResponse(await Camera.getCameraPermissionsAsync());
    }

    if (key === APP_PERMISSIONS.LOCATION) {
      return normalizePermissionResponse(await Location.getForegroundPermissionsAsync());
    }

    if (key === APP_PERMISSIONS.NOTIFICATIONS) {
      if (!Device.isDevice) {
        return {
          granted: false,
          state: 'missing',
          statusLabel: 'Missing',
          canAskAgain: true,
        };
      }

      return normalizePermissionResponse(await Notifications.getPermissionsAsync());
    }
  } catch (error) {
    return failedStatus(logPermissionError(key, 'status check', error));
  }

  return failedStatus();
};

export const getAllPermissionStatuses = async () => {
  const entries = await Promise.all(
    PERMISSION_ITEMS.map(async (item) => [item.key, await getPermissionStatus(item.key)])
  );

  return Object.fromEntries(entries);
};

export const requestAppPermission = async (key) => {
  try {
    if (key === APP_PERMISSIONS.CAMERA) {
      return normalizePermissionResponse(await Camera.requestCameraPermissionsAsync());
    }

    if (key === APP_PERMISSIONS.LOCATION) {
      return normalizePermissionResponse(await Location.requestForegroundPermissionsAsync());
    }

    if (key === APP_PERMISSIONS.NOTIFICATIONS) {
      if (!Device.isDevice) {
        return {
          granted: false,
          state: 'missing',
          statusLabel: 'Missing',
          canAskAgain: true,
        };
      }

      const normalized = normalizePermissionResponse(await Notifications.requestPermissionsAsync());
      if (normalized.granted) {
        const deviceId = await getDeviceId();
        await setupPushNotifications(deviceId, { requestPermission: false });
      }
      return normalized;
    }
  } catch (error) {
    return failedStatus(logPermissionError(key, 'permission request', error));
  }

  return failedStatus();
};

export const areRequiredPermissionsGranted = (statuses = {}) =>
  PERMISSION_ITEMS
    .filter((item) => item.required)
    .every((item) => statuses[item.key]?.granted === true);

export const openPermissionSettings = async () => {
  await Linking.openSettings();
};
