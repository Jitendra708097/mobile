import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../../components/common/AppButton.jsx';
import { ErrorMessage } from '../../components/common/CommonComponents.jsx';
import useAuthStore from '../../store/authStore.js';
import { colors } from '../../theme/colors.js';
import { spacing } from '../../theme/spacing.js';
import { typography } from '../../theme/typography.js';
import { validateEmail, validateNewPassword, validatePasswordMatch } from '../../utils/validators.js';

const ForgotPasswordScreen = ({ navigation }) => {
  const forgotPassword = useAuthStore((s) => s.forgotPassword);
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const isLoading = useAuthStore((s) => s.isLoading);
  const storeErr = useAuthStore((s) => s.error);
  const clearErr = useAuthStore((s) => s.clearError);

  const [email, setEmail] = useState('');
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleSendOtp = async ({ resend = false } = {}) => {
    clearErr();
    setSuccessMessage('');

    const validation = validateEmail(email);
    if (!validation.valid) {
      setLocalError(validation.message);
      return;
    }

    setLocalError('');

    if (resend) {
      setIsResending(true);
    }

    try {
      const result = await forgotPassword(email);
      if (!result?.success) {
        return;
      }

      setOtpSent(true);
      setSuccessMessage(
        resend
          ? 'A fresh OTP has been sent. Enter it below to reset your password.'
          : 'OTP sent successfully. Enter it below to continue.'
      );
    } finally {
      if (resend) {
        setIsResending(false);
      }
    }
  };

  const validateResetForm = () => {
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return emailValidation.message;
    }

    if (!/^\d{6}$/.test(otp.trim())) {
      return 'Enter the 6-digit OTP sent to your email.';
    }

    const passwordValidation = validateNewPassword(newPassword);
    if (!passwordValidation.valid) {
      return passwordValidation.message;
    }

    const confirmValidation = validatePasswordMatch(newPassword, confirmPassword);
    if (!confirmValidation.valid) {
      return confirmValidation.message;
    }

    return '';
  };

  const handleResetPassword = async () => {
    clearErr();
    setSuccessMessage('');

    const validationMessage = validateResetForm();
    if (validationMessage) {
      setLocalError(validationMessage);
      return;
    }

    setLocalError('');

    const result = await resetPassword(email, otp, newPassword);
    if (!result?.success) {
      return;
    }

    navigation?.replace?.('Login', {
      email: String(email).trim().toLowerCase(),
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.heroIcon}>{otpSent ? 'OTP' : '@'}</Text>
            <Text style={styles.title}>{otpSent ? 'Enter OTP' : 'Reset Your Password'}</Text>
            <Text style={styles.subtitle}>
              {otpSent
                ? 'Enter the 6-digit OTP from your email and choose a new password.'
                : 'Enter your work email and we will send a 6-digit OTP to verify your account.'}
            </Text>
          </View>

          <View style={styles.card}>
            {(storeErr || localError) ? <ErrorMessage message={storeErr || localError} /> : null}
            {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

            <Text style={styles.label}>Employee Email</Text>
            <TextInput
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setLocalError('');
                setSuccessMessage('');
              }}
              placeholder="you@company.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />

            {otpSent ? (
              <>
                <Text style={styles.label}>OTP</Text>
                <TextInput
                  value={otp}
                  onChangeText={(value) => {
                    setOtp(value.replace(/[^0-9]/g, '').slice(0, 6));
                    setLocalError('');
                  }}
                  placeholder="6-digit code"
                  keyboardType="number-pad"
                  maxLength={6}
                  style={[styles.input, styles.otpInput]}
                />

                <Text style={styles.label}>New Password</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    value={newPassword}
                    onChangeText={(value) => {
                      setNewPassword(value);
                      setLocalError('');
                    }}
                    placeholder="Min. 8 characters"
                    secureTextEntry={!showPassword}
                    style={[styles.input, styles.inputWithIcon]}
                  />
                  <TouchableOpacity onPress={() => setShowPassword((value) => !value)} style={styles.eyeIconBtn}>
                    <Text style={styles.eyeIcon}>{showPassword ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(value) => {
                      setConfirmPassword(value);
                      setLocalError('');
                    }}
                    placeholder="Re-enter your password"
                    secureTextEntry={!showConfirmPassword}
                    style={[styles.input, styles.inputWithIcon]}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword((value) => !value)}
                    style={styles.eyeIconBtn}
                  >
                    <Text style={styles.eyeIcon}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>

                <AppButton
                  label="Reset Password"
                  onPress={handleResetPassword}
                  loading={isLoading && !isResending}
                  fullWidth
                  style={styles.primaryButton}
                />

                <TouchableOpacity
                  onPress={() => handleSendOtp({ resend: true })}
                  disabled={isLoading || isResending}
                  style={styles.linkRow}
                >
                  <Text style={styles.linkText}>{isResending ? 'Sending OTP...' : 'Resend OTP'}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <AppButton
                label="Send OTP"
                onPress={handleSendOtp}
                loading={isLoading}
                fullWidth
                style={styles.primaryButton}
              />
            )}

            <AppButton
              label="Back to Login"
              onPress={() => navigation?.goBack?.()}
              variant="ghost"
              fullWidth
              style={styles.secondaryButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPrimary },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  heroIcon: {
    fontSize: 44,
    color: colors.accent,
    marginBottom: spacing.base,
    fontFamily: typography.fontBold,
  },
  title: {
    fontFamily: typography.fontBold,
    fontSize: typography['2xl'],
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.fontRegular,
    fontSize: typography.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.base * typography.normal,
  },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: 20,
    padding: spacing.xl,
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.07)',
    elevation: 4,
  },
  successText: {
    color: colors.accent,
    fontFamily: typography.fontMedium,
    fontSize: typography.sm,
    marginBottom: spacing.sm,
  },
  label: {
    fontFamily: typography.fontSemiBold,
    fontSize: typography.sm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    marginTop: spacing.base,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    fontFamily: typography.fontRegular,
    fontSize: typography.base,
    color: colors.textPrimary,
    backgroundColor: colors.bgSubtle,
  },
  otpInput: {
    letterSpacing: 6,
  },
  passwordRow: {
    position: 'relative',
  },
  inputWithIcon: {
    paddingRight: spacing['4xl'],
  },
  eyeIconBtn: {
    position: 'absolute',
    right: spacing.base,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeIcon: {
    fontFamily: typography.fontMedium,
    fontSize: typography.sm,
    color: colors.accent,
  },
  primaryButton: {
    marginTop: spacing.xl,
  },
  linkRow: {
    alignItems: 'center',
    marginTop: spacing.base,
  },
  linkText: {
    fontFamily: typography.fontMedium,
    fontSize: typography.sm,
    color: colors.accent,
  },
  secondaryButton: {
    marginTop: spacing.sm,
  },
});

export default ForgotPasswordScreen;
