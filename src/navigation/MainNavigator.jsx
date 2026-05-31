/**
 * @module MainNavigator
 * @description Bottom tab navigator for authenticated employees.
 */

import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/home/HomeScreen.jsx';
import HistoryScreen from '../screens/history/HistoryScreen.jsx';
import LeaveScreen from '../screens/leave/LeaveScreen.jsx';
import ProfileScreen from '../screens/profile/ProfileScreen.jsx';
import FeedbackScreen from '../screens/profile/FeedbackScreen.jsx';
import DeviceExceptionScreen from '../screens/DeviceExceptionScreen.jsx';
import NotificationsScreen from '../screens/notifications/NotificationsScreen.jsx';
import LivenessChallenge from '../screens/home/LivenessChallenge.jsx';
import KioskModeScreen from '../screens/kiosk/KioskModeScreen.jsx';
import RegularisationModal from '../screens/history/RegularisationModal.jsx';
import RegularisationRequestsScreen from '../screens/history/RegularisationRequestsScreen.jsx';
import SetPasswordScreen from '../screens/auth/SetPasswordScreen.jsx';
import FaceEnrollScreen from '../screens/auth/FaceEnrollScreen.jsx';
import FaceEnrollIntroScreen from '../screens/auth/FaceEnrollIntroScreen.jsx';

import useAuthStore from '../store/authStore.js';
import useNotificationStore from '../store/notificationStore.js';
import { colors } from '../theme/colors.js';
import { typography } from '../theme/typography.js';
import { spacing } from '../theme/spacing.js';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TAB_ICONS = {
  Home: ['home', 'home-outline'],
  History: ['calendar', 'calendar-outline'],
  Leave: ['briefcase', 'briefcase-outline'],
  Profile: ['person', 'person-outline'],
};

const BellButton = ({ navigation }) => {
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <TouchableOpacity
      onPress={() => navigation.push('Notifications')}
      style={bellStyles.btn}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <View style={bellStyles.icon}>
        <Ionicons name="notifications-outline" size={17} color={colors.accent} />
      </View>
      {unreadCount > 0 && (
        <View style={bellStyles.badge}>
          <Text style={bellStyles.badgeText}>
            {unreadCount > 9 ? '9+' : String(unreadCount)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const bellStyles = StyleSheet.create({
  btn: { marginRight: spacing.base, position: 'relative' },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    color: colors.textInverse,
    lineHeight: 16,
  },
});

const TabNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        headerStyle: {
          backgroundColor: colors.bgSurface,
          elevation: 3,
        },
        headerTitleStyle: {
          fontFamily: typography.fontSemiBold,
          fontSize: typography.md,
          color: colors.textPrimary,
        },
        headerRight: () => <BellButton navigation={navigation} />,
        tabBarStyle: {
          backgroundColor: colors.bgSurface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
        },
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: typography.fontMedium,
          fontSize: 11,
          marginTop: -2,
        },
        tabBarIcon: ({ focused, color }) => (
          <View style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            overflow: 'hidden',
            backgroundColor: focused ? colors.accentLight : colors.bgSubtle,
            opacity: focused ? 1 : 0.85,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Ionicons
              name={focused ? TAB_ICONS[route.name][0] : TAB_ICONS[route.name][1]}
              size={15}
              color={color}
            />
          </View>
        ),
      })}
    >
      <>
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Attendance', tabBarLabel: 'Home' }}
        />
        <Tab.Screen
          name="History"
          component={HistoryScreen}
          options={{ title: 'History', tabBarLabel: 'History' }}
        />
        <Tab.Screen
          name="Leave"
          component={LeaveScreen}
          options={{ title: 'Leave', tabBarLabel: 'Leave' }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: 'My Profile', tabBarLabel: 'Profile' }}
        />
      </>
    </Tab.Navigator>
  );
};

const RegularisationScreenWrapper = ({ route, navigation }) => (
  <RegularisationModal
    visible
    onClose={() => navigation.goBack()}
    onSubmitted={() => navigation.replace('RegularisationRequests')}
    date={route?.params?.date}
  />
);

const MainNavigator = () => {
  const user = useAuthStore((s) => s.user);
  const [showFaceEnrollCamera, setShowFaceEnrollCamera] = useState(false);

  if (user?.isFirstLogin) return <SetPasswordScreen />;
  if (!user?.faceEnrolled) {
    return showFaceEnrollCamera
      ? <FaceEnrollScreen onBack={() => setShowFaceEnrollCamera(false)} />
      : <FaceEnrollIntroScreen onStart={() => setShowFaceEnrollCamera(true)} />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.bgPrimary },
        animationEnabled: true,
      }}
    >
      <>
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{
            headerShown: true,
            title: 'Notifications',
            headerStyle: {
              backgroundColor: colors.bgSurface,
              elevation: 3,
            },
            headerTitleStyle: {
              fontFamily: typography.fontSemiBold,
              fontSize: typography.md,
              color: colors.textPrimary,
            },
            headerBackTitleVisible: false,
            headerTintColor: colors.accent,
          }}
        />
        <Stack.Screen
          name="LivenessChallenge"
          component={LivenessChallenge}
          options={{
            headerShown: false,
            gestureEnabled: false,
            cardStyle: { backgroundColor: '#000' },
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="KioskMode"
          component={KioskModeScreen}
          options={{
            headerShown: false,
            gestureEnabled: false,
            cardStyle: { backgroundColor: '#000' },
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="RegularisationRequests"
          component={RegularisationRequestsScreen}
          options={{
            headerShown: true,
            title: 'Regularisations',
            headerStyle: {
              backgroundColor: colors.bgSurface,
              elevation: 3,
            },
            headerTitleStyle: {
              fontFamily: typography.fontSemiBold,
              fontSize: typography.md,
              color: colors.textPrimary,
            },
            headerBackTitleVisible: false,
            headerTintColor: colors.accent,
          }}
        />
        <Stack.Screen
          name="Regularisation"
          component={RegularisationScreenWrapper}
          options={{
            headerShown: false,
            presentation: 'modal',
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="DeviceException"
          component={DeviceExceptionScreen}
          options={{
            headerShown: true,
            title: 'Device Exception',
            headerStyle: {
              backgroundColor: colors.bgSurface,
              elevation: 3,
            },
            headerTitleStyle: {
              fontFamily: typography.fontSemiBold,
              fontSize: typography.md,
              color: colors.textPrimary,
            },
            headerBackTitleVisible: false,
            headerTintColor: colors.accent,
          }}
        />
        <Stack.Screen
          name="Feedback"
          component={FeedbackScreen}
          options={{
            headerShown: true,
            title: 'Feedback',
            headerStyle: {
              backgroundColor: colors.bgSurface,
              elevation: 3,
            },
            headerTitleStyle: {
              fontFamily: typography.fontSemiBold,
              fontSize: typography.md,
              color: colors.textPrimary,
            },
            headerBackTitleVisible: false,
            headerTintColor: colors.accent,
          }}
        />
      </>
    </Stack.Navigator>
  );
};

export default MainNavigator;
