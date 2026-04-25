/**
 * @module useAppState
 * @description Tracks app foreground/background transitions.
 *              On foreground return: triggers offline queue sync.
 *              Called by: MainNavigator (mounted once at app root).
 */

import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import useAuthStore from '../store/authStore.js';
import useOfflineQueueStore from '../store/offlineQueueStore.js';
import useNotificationStore from '../store/notificationStore.js';

/**
 * @returns {{ appState: string }}
 */
const useAppState = () => {
  const appState      = useRef(AppState.currentState);
  const syncOffline   = useOfflineQueueStore((s) => s.syncQueue);
  const refreshUnread = useNotificationStore((s) => s.refreshUnreadCount);
  const syncFaceEnrollmentStatus = useAuthStore((s) => s.syncFaceEnrollmentStatus);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasBackground = appState.current.match(/inactive|background/);
      const isActive      = nextState === 'active';

      if (wasBackground && isActive) {
        // App came to foreground — sync any offline records
        syncOffline();
        refreshUnread();
        syncFaceEnrollmentStatus();
      }

      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [refreshUnread, syncFaceEnrollmentStatus, syncOffline]);

  return { appState: appState.current };
};

export default useAppState;
