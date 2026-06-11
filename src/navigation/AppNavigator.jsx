/**
 * @module AppNavigator
 * @description Root navigator for AttendEase.
 *              Decides between AuthNavigator and MainNavigator
 *              based on auth state from authStore.
 *
 *              Routing logic:
 *                not authenticated           → AuthNavigator (Login stack)
 *                authenticated + firstLogin  → SetPasswordScreen
 *                authenticated + !faceEnrolled → FaceEnrollScreen
 *                authenticated + faceEnrolled  → MainNavigator (tabs)
 *
 *              Also bootstraps:
 *                - authStore.hydrate()   (token check on boot)
 *                - offlineQueueStore.hydrate() (load persisted queue)
 *                - push notification setup
 *                - foreground notification listener
 *              Called by: App root (index.js / AppEntry).
 */

import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import useAuthStore             from '../store/authStore.js';
import useOfflineQueueStore     from '../store/offlineQueueStore.js';
import useNotificationStore     from '../store/notificationStore.js';
import AuthNavigator            from './AuthNavigator.jsx';
import MainNavigator            from './MainNavigator.jsx';
import { colors }               from '../theme/colors.js';
import {
  setupPushNotifications,
  addForegroundNotificationListener,
  addNotificationResponseListener,
  addPushTokenRefreshListener,
  getLastNotificationResponse,
} from '../services/notificationService.js';
import { getDeviceId }          from '../services/deviceService.js';
import useAppState              from '../hooks/useAppState.js';
import { navigationRef, navigateFromNotificationAction } from './navigationService.js';

const AppNavigator = () => {
  const hydrate        = useAuthStore((s) => s.hydrate);
  const isAuthenticated= useAuthStore((s) => s.isAuthenticated);
  const hydrateQueue   = useOfflineQueueStore((s) => s.hydrate);
  const addNotification= useNotificationStore((s) => s.addIncomingNotification);
  const [isBooting, setIsBooting] = useState(true);
  const [deviceId, setDeviceId] = useState(null);

  // Boot sequence
  useEffect(() => {
    const boot = async () => {
      try {
        await hydrate();
        await hydrateQueue();

        // Resolve device ID for notification registration and device binding.
        const resolvedDeviceId = await getDeviceId();
        setDeviceId(resolvedDeviceId);
      } finally {
        setIsBooting(false);
      }
    };
    boot();
  }, []);

  // Foreground push notification listener
  useEffect(() => {
    const sub = addForegroundNotificationListener((notification) => {
      const data = notification.request.content.data || {};
      addNotification({
        id:        notification.request.identifier,
        title:     notification.request.content.title,
        body:      notification.request.content.body,
        actionUrl: data.action_url || data.actionUrl || '',
        data,
        isRead:    false,
        createdAt: new Date().toISOString(),
      });
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const sub = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data || {};
      navigateFromNotificationAction(data.action_url || data.actionUrl);
    });

    getLastNotificationResponse().then((response) => {
      const data = response?.notification?.request?.content?.data || {};
      navigateFromNotificationAction(data.action_url || data.actionUrl);
    }).catch(() => {});

    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !deviceId) {
      return;
    }

    setupPushNotifications(deviceId, { requestPermission: false }).catch(() => {});
  }, [isAuthenticated, deviceId]);

  useEffect(() => {
    if (!deviceId) {
      return undefined;
    }

    if (!isAuthenticated) {
      return undefined;
    }

    const sub = addPushTokenRefreshListener(deviceId);
    return () => sub.remove();
  }, [deviceId, isAuthenticated]);

  // App state hook (background → foreground sync)
  useAppState();

  // Loading screen while checking stored tokens
  if (isBooting) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef}>
          {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: colors.bgPrimary,
  },
});

export default AppNavigator;
