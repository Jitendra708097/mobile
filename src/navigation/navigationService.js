/**
 * @module navigationService
 * @description Shared helpers for routing notification taps through the root navigator.
 */

import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

const ACTION_ROUTE_MAP = {
  '/attendance':      { name: 'Tabs', params: { screen: 'Home' } },
  '/history':         { name: 'Tabs', params: { screen: 'History' } },
  '/leave':           { name: 'Tabs', params: { screen: 'Leave' } },
  '/notifications':   { name: 'Notifications' },
  '/device-exception': { name: 'DeviceException' },
  '/regularisation':  { name: 'Tabs', params: { screen: 'History' } },
};

export function navigateFromNotificationAction(actionUrl) {
  const route = ACTION_ROUTE_MAP[actionUrl];

  if (!route || !navigationRef.isReady()) {
    return false;
  }

  navigationRef.navigate(route.name, route.params);
  return true;
}
