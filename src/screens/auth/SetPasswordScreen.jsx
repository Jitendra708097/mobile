/**
 * @module SetPasswordScreen
 * @description First-login password setup screen.
 *              Shows real-time password requirement checklist.
 *              On success → FaceEnrollScreen.
 *              Called by: AuthNavigator after first login detection.
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import useAuthStore  from '../../store/authStore.js';
import AppButton     from '../../components/common/AppButton.jsx';
import { ErrorMessage } from '../../components/common/CommonComponents.jsx';
import { colors }    from '../../theme/colors.js';
import { typography }from '../../theme/typography.js';
import { spacing }   from '../../theme/spacing.js';
import { validateNewPassword, validatePasswordMatch, getPasswordChecks } from '../../utils/validators.js';

const CheckRow = ({ met, label }) => (
  <View style={styles.checkRow}>
    <View style={[styles.checkDot, met && styles.checkDotMet]}>
      {met ? (
        <Ionicons name="checkmark" size={14} color={colors.success} />
      ) : (
        <Ionicons name="remove" size={14} color={colors.textMuted} />
      )}
    </View>
    <Text style={[styles.checkLabel, met && styles.checkLabelMet]}>
      {label}
    </Text>
  </View>
);

const SetPasswordScreen = ({ navigation }) => {
  const setPassword = useAuthStore((s) => s.setPassword);
  const isLoading   = useAuthStore((s) => s.isLoading);
  const storeErr    = useAuthStore((s) => s.error);
  const clearErr    = useAuthStore((s) => s.clearError);

  const [newPass,     setNewPass]     = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors,      setErrors]      = useState({});

  const checks = getPasswordChecks(newPass);
  const completedChecks = [checks.minLength, checks.uppercase, checks.number].filter(Boolean).length;
  const passwordsMatch = confirmPass.length > 0 && newPass === confirmPass;
  const canSubmit = completedChecks === 3 && passwordsMatch && !isLoading;

  const validate = () => {
    const e  = {};
    const pv = validateNewPassword(newPass);
    const cv = validatePasswordMatch(newPass, confirmPass);
    if (!pv.valid) e.newPass     = pv.message;
    if (!cv.valid) e.confirmPass = cv.message;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    clearErr();
    if (!validate()) return;
    const result = await setPassword(newPass);
    if (!result || !result.success) {
      return;
    }
    if (navigation?.replace) {
      navigation.replace('FaceEnroll');
    }
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
          <View style={styles.header}>
            <View style={styles.iconBadge}>
              <Ionicons name="key-outline" size={27} color={colors.accent} />
            </View>
            <Text style={styles.title}>Set Your Password</Text>
            <Text style={styles.subtitle}>
              Create a secure password before continuing to face enrollment.
            </Text>
          </View>

          <View style={styles.form}>
            {storeErr && <ErrorMessage message={storeErr} />}

            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                value={newPass}
                onChangeText={(v) => { setNewPass(v); setErrors((p) => ({ ...p, newPass: '' })); }}
                placeholder="Min. 8 characters"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showNew}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                returnKeyType="next"
                style={[styles.input, styles.inputWithIcon, errors.newPass && styles.inputError]}
              />
              <TouchableOpacity onPress={() => setShowNew((p) => !p)} style={styles.eyeIconBtn}>
                <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.accent} />
              </TouchableOpacity>
            </View>
            {errors.newPass && <Text style={styles.errorText}>{errors.newPass}</Text>}

            <View style={styles.checklist}>
              <View style={styles.strengthHeader}>
                <Text style={styles.strengthTitle}>Password strength</Text>
                <Text style={styles.strengthCount}>{completedChecks}/3</Text>
              </View>
              <View style={styles.meterTrack}>
                <View style={[styles.meterFill, { width: `${(completedChecks / 3) * 100}%` }]} />
              </View>
              <CheckRow met={checks.minLength} label="At least 8 characters" />
              <CheckRow met={checks.uppercase} label="One uppercase letter" />
              <CheckRow met={checks.number}    label="One number" />
            </View>

            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                value={confirmPass}
                onChangeText={(v) => { setConfirmPass(v); setErrors((p) => ({ ...p, confirmPass: '' })); }}
                placeholder="Re-enter your password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                style={[styles.input, styles.inputWithIcon, errors.confirmPass && styles.inputError]}
              />
              <TouchableOpacity onPress={() => setShowConfirm((p) => !p)} style={styles.eyeIconBtn}>
                <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.accent} />
              </TouchableOpacity>
            </View>
            {errors.confirmPass && <Text style={styles.errorText}>{errors.confirmPass}</Text>}
            {passwordsMatch ? <Text style={styles.matchText}>Passwords match</Text> : null}

            <AppButton
              label="Set Password & Continue"
              onPress={handleSubmit}
              loading={isLoading}
              disabled={!canSubmit}
              fullWidth
              style={styles.btn}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bgPrimary },
  flex:   { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.xl, paddingTop: spacing['2xl'] },

  header: { alignItems: 'center', marginBottom: spacing['2xl'] },
  title: {
    fontFamily:   typography.fontBold,
    fontSize:     typography['2xl'],
    color:        colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.fontRegular,
    fontSize:   typography.base,
    color:      colors.textSecondary,
    textAlign:  'center',
    lineHeight: typography.base * typography.normal,
  },

  form: {
    backgroundColor: colors.bgSurface,
    borderRadius:    20,
    padding:         spacing.xl,
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.07)',
    elevation: 4,
  },

  // ── TextInput Styles ─────────────────────────────────────────────────────────
  label: {
    fontFamily:   typography.fontSemiBold,
    fontSize:     typography.sm,
    color:        colors.textPrimary,
    marginBottom: spacing.xs,
    marginTop:    spacing.base,
  },
  input: {
    borderWidth:       1,
    borderColor:       colors.border,
    borderRadius:      12,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    fontFamily:        typography.fontRegular,
    fontSize:          typography.base,
    color:             colors.textPrimary,
    backgroundColor:   colors.bgSubtle,
  },
  inputError: {
    borderColor:     colors.danger,
    backgroundColor: colors.danger + '10',
  },
  inputWithIcon: {
    paddingRight: spacing['3xl'],
  },
  passwordRow: {
    position: 'relative',
  },
  eyeIconBtn: {
    position:       'absolute',
    right:          spacing.base,
    top:            0,
    bottom:         0,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  errorText: {
    fontFamily: typography.fontRegular,
    fontSize:   typography.xs,
    color:      colors.danger,
    marginTop:  spacing.xs,
  },

  checklist: {
    backgroundColor: colors.bgSubtle,
    borderRadius:    12,
    padding:         spacing.md,
    marginBottom:    spacing.base,
    marginTop:       -spacing.sm,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  spacing.xs,
  },
  checkLabel: {
    fontFamily: typography.fontRegular,
    fontSize:   typography.sm,
    color:      colors.textMuted,
  },
  checkLabelMet: { color: colors.success },

  matchText: {
    fontFamily: typography.fontMedium,
    fontSize: typography.xs,
    color: colors.success,
    marginTop: spacing.xs,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentLight,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.base,
  },
  strengthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  strengthTitle: {
    fontFamily: typography.fontSemiBold,
    fontSize: typography.sm,
    color: colors.textPrimary,
  },
  strengthCount: {
    fontFamily: typography.fontMonoMed,
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  meterTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  meterFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  checkDot: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkDotMet: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing['2xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.base,
  },
  title: {
    fontFamily: typography.fontBold,
    fontSize: typography['2xl'],
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: typography.fontRegular,
    fontSize: typography.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.base * typography.normal,
    maxWidth: 330,
  },
  form: {
    backgroundColor: colors.bgSurface,
    borderRadius: 8,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 3px 10px rgba(17, 24, 39, 0.06)',
    elevation: 3,
  },
  label: {
    fontFamily: typography.fontSemiBold,
    fontSize: typography.sm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.base,
    fontFamily: typography.fontRegular,
    fontSize: typography.base,
    color: colors.textPrimary,
    backgroundColor: colors.bgSubtle,
  },
  inputError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  eyeIconBtn: {
    position: 'absolute',
    right: spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  checklist: {
    backgroundColor: colors.bgPrimary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  checkRow: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkLabel: {
    flex: 1,
    fontFamily: typography.fontRegular,
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  btn: { marginTop: spacing.lg, borderRadius: 8 },
});

export default SetPasswordScreen;
