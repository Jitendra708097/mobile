/**
 * @module SetPasswordScreen
 * @description First-login password setup screen.
 *              Shows real-time password requirement checklist.
 *              On success → FaceEnrollScreen.
 *              Called by: AuthNavigator after first login detection.
 */

import React, { useState } from 'react';
import {
  View, Text, ScrollView, KeyboardAvoidingView,
  Platform, StyleSheet, TextInput, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import useAuthStore  from '../../store/authStore.js';
import AppButton     from '../../components/common/AppButton.jsx';
import { ErrorMessage } from '../../components/common/CommonComponents.jsx';
import { colors }    from '../../theme/colors.js';
import { typography }from '../../theme/typography.js';
import { spacing }   from '../../theme/spacing.js';
import {
  validateNewPassword,
  validatePasswordMatch,
  getPasswordChecks,
} from '../../utils/validators.js';

const CheckRow = ({ met, label }) => (
  <View style={styles.checkRow}>
    <Text style={[styles.checkIcon, met && styles.checkIconMet]}>
      {met ? '✓' : '○'}
    </Text>
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
    navigation.replace('FaceEnroll');
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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>🔐</Text>
            <Text style={styles.title}>Set Your Password</Text>
            <Text style={styles.subtitle}>
              Choose a secure password for your account.{'\n'}
              You'll use this every time you sign in.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {storeErr && <ErrorMessage message={storeErr} />}

            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                value={newPass}
                onChangeText={(v) => { setNewPass(v); setErrors((p) => ({ ...p, newPass: '' })); }}
                placeholder="Min. 8 characters"
                secureTextEntry={!showNew}
                style={[styles.input, styles.inputWithIcon, errors.newPass && styles.inputError]}
              />
              <TouchableOpacity onPress={() => setShowNew((p) => !p)} style={styles.eyeIconBtn}>
                <Text style={styles.eye}>{showNew ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {errors.newPass && <Text style={styles.errorText}>{errors.newPass}</Text>}

            {/* Requirements checklist */}
            <View style={styles.checklist}>
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
                secureTextEntry={!showConfirm}
                style={[styles.input, styles.inputWithIcon, errors.confirmPass && styles.inputError]}
              />
              <TouchableOpacity onPress={() => setShowConfirm((p) => !p)} style={styles.eyeIconBtn}>
                <Text style={styles.eye}>{showConfirm ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {errors.confirmPass && <Text style={styles.errorText}>{errors.confirmPass}</Text>}

            <AppButton
              label="Set Password & Continue"
              onPress={handleSubmit}
              loading={isLoading}
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
  emoji:  { fontSize: 48, marginBottom: spacing.base },
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
  eye: { fontSize: 18 },
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
  checkIcon: {
    fontFamily:  typography.fontBold,
    fontSize:    typography.sm,
    color:       colors.textMuted,
    marginRight: spacing.sm,
    width:       16,
  },
  checkIconMet:  { color: colors.success },
  checkLabel: {
    fontFamily: typography.fontRegular,
    fontSize:   typography.sm,
    color:      colors.textMuted,
  },
  checkLabelMet: { color: colors.success },

  btn: { marginTop: spacing.sm },
});

export default SetPasswordScreen;
