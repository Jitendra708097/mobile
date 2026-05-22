import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import AppButton from '../../components/common/AppButton.jsx';
import useAuthStore from '../../store/authStore.js';
import { colors } from '../../theme/colors.js';
import { spacing } from '../../theme/spacing.js';
import { typography } from '../../theme/typography.js';

const FaceEnrollIntroScreen = ({ onStart }) => {
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const handleBackToLogin = () => {
    Alert.alert(
      'Go back to login?',
      'Face enrollment is required before you can access the app. You can sign in again and complete enrollment anytime.',
      [
        { text: 'Stay Here', style: 'cancel' },
        {
          text: 'Back to Login',
          style: 'destructive',
          onPress: clearAuth,
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.illustration}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
            <View style={styles.faceCircle}>
              <Ionicons name="person-outline" size={56} color={colors.accent} />
            </View>
            <View style={styles.shieldBadge}>
              <Ionicons name="shield-checkmark" size={22} color={colors.textInverse} />
            </View>
          </View>
        </View>

        <View style={styles.copy}>
          <Text style={styles.kicker}>Password updated</Text>
          <Text style={styles.title}>Face Enrollment Required</Text>
          <Text style={styles.message}>
            To start using AttendEase, please complete face enrollment. This helps verify your identity when marking attendance.
          </Text>
          <View style={styles.tipRow}>
            <Ionicons name="sunny-outline" size={18} color={colors.accent} />
            <Text style={styles.tipText}>
              Use good lighting and keep your face clearly visible.
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <AppButton
            label="Start Face Enrollment"
            onPress={onStart}
            icon={<Ionicons name="camera-outline" size={20} color={colors.textInverse} />}
            fullWidth
            style={styles.primaryBtn}
          />
          <AppButton
            label="Back to Login"
            onPress={handleBackToLogin}
            variant="outline"
            icon={<Ionicons name="log-out-outline" size={20} color={colors.accent} />}
            fullWidth
            style={styles.secondaryBtn}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing['2xl'],
  },
  illustration: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  scanFrame: {
    width: 196,
    height: 196,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  faceCircle: {
    width: 126,
    height: 126,
    borderRadius: 63,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shieldBadge: {
    position: 'absolute',
    right: 30,
    bottom: 30,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: colors.bgPrimary,
  },
  corner: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderColor: colors.accent,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    right: 0,
    bottom: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderBottomRightRadius: 8,
  },
  copy: {
    alignItems: 'center',
  },
  kicker: {
    fontFamily: typography.fontSemiBold,
    fontSize: typography.sm,
    color: colors.accent,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: typography.fontBold,
    fontSize: typography['2xl'],
    lineHeight: typography['2xl'] * typography.tight,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    maxWidth: 340,
    fontFamily: typography.fontRegular,
    fontSize: typography.base,
    lineHeight: typography.base * typography.normal,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tipRow: {
    width: '100%',
    maxWidth: 360,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.base,
    marginTop: spacing.xl,
  },
  tipText: {
    flex: 1,
    fontFamily: typography.fontMedium,
    fontSize: typography.sm,
    lineHeight: typography.sm * typography.normal,
    color: colors.textPrimary,
  },
  actions: {
    marginTop: spacing['2xl'],
    gap: spacing.md,
  },
  primaryBtn: {
    borderRadius: 8,
  },
  secondaryBtn: {
    borderRadius: 8,
  },
});

export default FaceEnrollIntroScreen;
