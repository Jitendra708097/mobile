import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../theme/colors.js';
import { spacing } from '../../theme/spacing.js';
import { typography } from '../../theme/typography.js';

const TOAST_BY_TYPE = {
  success: {
    bg: colors.successLight,
    text: colors.success,
    icon: 'checkmark-circle',
  },
  warning: {
    bg: colors.warningLight,
    text: colors.warning,
    icon: 'alert-circle-outline',
  },
  danger: {
    bg: colors.dangerLight,
    text: colors.danger,
    icon: 'alert-circle-outline',
  },
  info: {
    bg: colors.infoLight,
    text: colors.info,
    icon: 'information-circle-outline',
  },
};

const PermissionToast = ({ toast, onClose }) => {
  if (!toast?.message)
  {
    return null;
  }
  
  const config = TOAST_BY_TYPE[toast.type] || TOAST_BY_TYPE.info;

  return (
    <View style={[styles.toast, { backgroundColor: config.bg }]}>
      <Ionicons name={config.icon} size={18} color={config.text} />
      <Text style={[styles.toastText, { color: config.text }]}>{toast.message}</Text>
      {toast.actionLabel ? (
        <TouchableOpacity onPress={toast.onAction} style={styles.toastAction}>
          <Text style={[styles.toastActionText, { color: config.text }]}>
            {toast.actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity onPress={onClose} style={styles.toastClose}>
        <Ionicons name="close" size={17} color={config.text} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.base,
    right: spacing.base,
    bottom: spacing.base,
    minHeight: 54,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    boxShadow: '0px 6px 16px rgba(15, 23, 42, 0.16)',
    elevation: 8,
  },
  toastText: {
    flex: 1,
    fontFamily: typography.fontSemiBold,
    fontSize: typography.sm,
    lineHeight: typography.sm * typography.normal,
  },
  toastAction: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  toastActionText: {
    fontFamily: typography.fontBold,
    fontSize: typography.xs,
  },
  toastClose: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PermissionToast;
