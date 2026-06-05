/**
 * @module AuthNavigator
 * @description Stack navigator for the unauthenticated flow.
 */

import { createStackNavigator } from '@react-navigation/stack';

import LoginScreen from '../screens/auth/LoginScreen.jsx';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen.jsx';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen.jsx';
import SetPasswordScreen from '../screens/auth/SetPasswordScreen.jsx';
import PermissionSetupScreen from '../screens/auth/PermissionSetupScreen.jsx';
import FaceEnrollScreen from '../screens/auth/FaceEnrollScreen.jsx';
import FaceEnrollIntroScreen from '../screens/auth/FaceEnrollIntroScreen.jsx';
import { colors } from '../theme/colors.js';

const Stack = createStackNavigator();

const FaceEnrollIntroWrapper = ({ navigation }) => (
  <FaceEnrollIntroScreen onStart={() => navigation.replace('FaceEnroll')} />
);

const PermissionSetupWrapper = ({ navigation }) => (
  <PermissionSetupScreen onContinue={() => navigation.replace('FaceEnrollIntro')} />
);

const AuthNavigator = () => (
  <Stack.Navigator
    screenOptions={
      {
      headerShown: false,
      cardStyle: { backgroundColor: colors.bgPrimary },
      animationEnabled: true,
    }
  }
  >
    <>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="SetPassword" component={SetPasswordScreen} />
      <Stack.Screen name="PermissionSetup" component={PermissionSetupWrapper} />
      <Stack.Screen name="FaceEnrollIntro" component={FaceEnrollIntroWrapper} />
      <Stack.Screen name="FaceEnroll"  component={FaceEnrollScreen}  options={{ gestureEnabled: false }} />
    </>
  </Stack.Navigator>
);

export default AuthNavigator;
