/**
 * @module useNetworkStatus
 * @description Real-time network connectivity tracking using NetInfo.
 *              Returns true only when both connected AND internet reachable.
 *              Triggers offline banner display and offline queue sync.
 *              Called by: OfflineBanner, attendanceStore, offlineQueueStore.
 */

import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * @returns {boolean} isOnline
 */
const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Get initial state
    NetInfo.fetch().then((state) => {
      console.log("Connection type", state.type);
      console.log("Is connected?", state.isConnected);
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable));
    });

    // Subscribe to changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable));
    });

    return unsubscribe;
  }, []);

  return isOnline;
};

export default useNetworkStatus;
