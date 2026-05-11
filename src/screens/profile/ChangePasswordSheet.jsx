/**
 * @module ChangePasswordSheet
 * @description Bottom sheet for changing employee password from Profile screen.
 *              Fields: current password, new password, confirm new password.
 *              Validates: new ≠ current, requirements met, passwords match.
 *              Snaps to 60% height.
 *              Called by: ProfileScreen "Change Password" action row.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
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
    <View style={styles.checkMark}>
      <Ionicons
        name={met ? 'checkmark' : 'remove'}
        size={13}
        color={met ? colors.success : colors.textMuted}
      />
    </View>
    <Text style={[styles.checkLabel, met && styles.checkLabelMet]}>{label}</Text>
  </View>
);

const PasswordField = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  showToggle = false,
  isVisible = false,
  onToggle,
}) => (
  <View style={styles.inputBlock}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={styles.inputWrap}>
      <BottomSheetTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.textInput, showToggle && styles.textInputWithIcon]}
      />
      {showToggle ? (
        <TouchableOpacity
          onPress={onToggle}
          style={styles.eyeButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={isVisible ? 'Hide password' : 'Show password'}
        >
          <Ionicons
            name={isVisible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.accent}
          />
        </TouchableOpacity>
      ) : null}
    </View>
  </View>
);

/**
 * @param {object} props
 * @param {object} props.sheetRef   - ref passed from ProfileScreen
 * @param {function} props.onClose  - called when sheet is dismissed
 */
const ChangePasswordSheet = ({ sheetRef, onClose }) => {
  const changePassword = useAuthStore((s) => s.changePassword);
  const isLoading      = useAuthStore((s) => s.isLoading);

  const [current,  setCurrent]  = useState('');
  const [newPass,  setNewPass]  = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showCur,  setShowCur]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);

  const checks = getPasswordChecks(newPass);

  const reset = () => {
    setCurrent(''); setNewPass(''); setConfirm('');
    setError(''); setSuccess(false);
  };

  const handleClose = () => {
    reset();
    onClose?.();
    sheetRef?.current?.close();
  };

  const handleSave = async () => {
    setError('');

    if (!current.trim()) { setError('Current password is required.'); return; }

    const pv = validateNewPassword(newPass);
    if (!pv.valid) { setError(pv.message); return; }

    const cv = validatePasswordMatch(newPass, confirm);
    if (!cv.valid) { setError(cv.message); return; }

    if (newPass === current) {
      setError('New password must be different from your current password.'); return;
    }

    const result = await changePassword(current, newPass);
    if (result.success) {
      setSuccess(true);
      setTimeout(handleClose, 1600);
    } else {
      setError(result.error);
    }
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={['82%']}
      enablePanDownToClose
      onClose={reset}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Change Password</Text>

        {success && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>Password updated successfully.</Text>
          </View>
        )}

        {error && <ErrorMessage message={error} />}

        <PasswordField
          label="Current Password"
          value={current}
          onChangeText={(v) => { setCurrent(v); setError(''); }}
          secureTextEntry={!showCur}
          placeholder="Your current password"
          showToggle
          isVisible={showCur}
          onToggle={() => setShowCur((p) => !p)}
        />

        <PasswordField
          label="New Password"
          value={newPass}
          onChangeText={(v) => { setNewPass(v); setError(''); }}
          secureTextEntry={!showNew}
          placeholder="Min. 8 characters"
          showToggle
          isVisible={showNew}
          onToggle={() => setShowNew((p) => !p)}
        />

        {/* Requirements */}
        {newPass.length > 0 && (
          <View style={styles.checklist}>
            <CheckRow met={checks.minLength} label="At least 8 characters" />
            <CheckRow met={checks.uppercase} label="One uppercase letter" />
            <CheckRow met={checks.number}    label="One number" />
          </View>
        )}

        <PasswordField
          label="Confirm New Password"
          value={confirm}
          onChangeText={(v) => { setConfirm(v); setError(''); }}
          secureTextEntry
          placeholder="Re-enter new password"
        />

        <AppButton
          label="Save Password"
          onPress={handleSave}
          loading={isLoading}
          fullWidth
          style={styles.saveBtn}
        />

        <AppButton
          label="Cancel"
          onPress={handleClose}
          variant="ghost"
          fullWidth
        />
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: colors.bgSurface },
  handle:  { backgroundColor: colors.border, width: 40 },
  content: { padding: spacing.xl, paddingBottom: 320 },

  title: {
    fontFamily:   typography.fontBold,
    fontSize:     typography.xl,
    color:        colors.textPrimary,
    marginBottom: spacing.base,
  },

  successBox: {
    backgroundColor: colors.successLight,
    borderRadius:    10,
    padding:         spacing.sm,
    marginBottom:    spacing.base,
    alignItems:      'center',
  },
  successText: {
    fontFamily: typography.fontSemiBold,
    fontSize:   typography.sm,
    color:      colors.success,
  },

  inputBlock: {
    marginBottom: spacing.base,
  },
  inputLabel: {
    fontFamily: typography.fontMedium,
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    letterSpacing: 0.2,
  },
  inputWrap: {
    position: 'relative',
  },
  textInput: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgSurface,
    fontFamily: typography.fontRegular,
    fontSize: typography.base,
    color: colors.textPrimary,
  },
  textInputWithIcon: {
    paddingRight: spacing['4xl'],
  },
  eyeButton: {
    position: 'absolute',
    right: spacing.base,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },

  checklist: {
    backgroundColor: colors.bgSubtle,
    borderRadius:    10,
    padding:         spacing.sm,
    marginTop:       -spacing.sm,
    marginBottom:    spacing.base,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  3,
  },
  checkMark:    { marginRight: spacing.sm, width: 14, alignItems: 'center' },
  checkLabel:   { fontFamily: typography.fontRegular, fontSize: typography.xs, color: colors.textMuted },
  checkLabelMet:{ color: colors.success },

  saveBtn: { marginTop: spacing.sm, marginBottom: spacing.sm },
});

export default ChangePasswordSheet;
