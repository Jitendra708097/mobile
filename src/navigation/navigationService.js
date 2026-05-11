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
  '/profile':         { name: 'Tabs', params: { screen: 'Profile' } },
  '/notifications':   { name: 'Notifications' },
  '/device-exception': { name: 'DeviceException' },
  '/regularisation':  { name: 'Tabs', params: { screen: 'History' } },
};

function routeFromActionUrl(actionUrl) {
  if (typeof actionUrl !== 'string') {
    return null;
  }

  const target = actionUrl.trim();
  if (!target) {
    return null;
  }

  if (ACTION_ROUTE_MAP[target]) {
    return ACTION_ROUTE_MAP[target];
  }

  if (target.startsWith('attendease://')) {
    const path = target.replace('attendease://', '');
    const [screen, id] = path.split('/');

    switch (screen) {
      case 'checkout':
        return { name: 'LivenessChallenge', params: { mode: 'checkOut', attendanceId: id } };
      case 'leave':
        return { name: 'Tabs', params: { screen: 'Leave', params: { leaveId: id } } };
      case 'regularise':
        return { name: 'Regularisation', params: { regularisationId: id } };
      case 'attendance':
        return { name: 'Tabs', params: { screen: 'History' } };
      case 'profile':
        return { name: 'Tabs', params: { screen: 'Profile' } };
      default:
        return { name: 'Tabs', params: { screen: 'Home' } };
    }
  }

  return null;
}

export function navigateFromNotificationAction(actionUrl) {
  const route = routeFromActionUrl(actionUrl);

  if (!route || !navigationRef.isReady()) {
    return false;
  }

  navigationRef.navigate(route.name, route.params);
  return true;
}
