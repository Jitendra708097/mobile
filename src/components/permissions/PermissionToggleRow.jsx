import React from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../theme/colors.js';
import { spacing } from '../../theme/spacing.js';
import { typography } from '../../theme/typography.js';

const STATUS_STYLES = {
  granted: {
    bg: colors.successLight,
    text: colors.success,
    icon: 'checkmark-circle',
  },
  denied: {
    bg: colors.dangerLight,
    text: colors.danger,
    icon: 'alert-circle-outline',
  },
  failed: {
    bg: colors.dangerLight,
    text: colors.danger,
    icon: 'alert-circle-outline',
  },
  missing: {
    bg: colors.warningLight,
    text: colors.warning,
    icon: 'alert-circle-outline',
  },
};

const PermissionToggleRow = ({ item, status, busy = false, onToggle, onOpenSettings }) => {

  const state = status?.state || 'missing';
  const statusConfig = STATUS_STYLES[state] || STATUS_STYLES.missing;
  const granted = status?.granted === true;
  const canOpenSettings = state === 'granted' || (state === 'denied' && status?.canAskAgain === false);

  return (
    <View style={styles.row}>
      <View style={styles.iconBox}>
        <Ionicons name={item.icon} size={22} color={colors.accent} />
      </View>

      <View style={styles.content}>
        <View style={styles.titleLine}>
          <Text style={styles.title}>{item.title}</Text>
          <View style={[
            styles.requirementChip,
            item.required ? styles.requiredChip : styles.recommendedChip,
          ]}>
            <Text style={[
              styles.requirementText,
              item.required ? styles.requiredText : styles.recommendedText,
            ]}>
              {item.requirementLabel}
            </Text>
          </View>
        </View>

        <Text style={styles.description}>{item.description}</Text>

        <View style={styles.metaLine}>
          <View style={[styles.statusChip, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon} size={14} color={statusConfig.text} />
            <Text style={[styles.statusText, { color: statusConfig.text }]}>
              {status?.statusLabel || 'Missing'}
            </Text>
          </View>

          {canOpenSettings ? (
            <TouchableOpacity onPress={onOpenSettings} style={styles.settingsBtn}>
              <Ionicons name="settings-outline" size={14} color={colors.accent} />
              <Text style={styles.settingsText}>Open Settings</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.switchWrap}>
        {busy ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Switch
            value={granted}
            onValueChange={onToggle}
            trackColor={{ false: colors.border, true: colors.accentLight }}
            thumbColor={granted ? colors.accent : colors.bgSubtle}
            accessibilityLabel={`${item.title} permission`}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentLight,
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: typography.fontSemiBold,
    fontSize: typography.md,
    color: colors.textPrimary,
  },
  requirementChip: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  requiredChip: {
    backgroundColor: colors.dangerLight,
  },
  recommendedChip: {
    backgroundColor: colors.infoLight,
  },
  requirementText: {
    fontFamily: typography.fontBold,
    fontSize: typography.xs,
  },
  requiredText: {
    color: colors.danger,
  },
  recommendedText: {
    color: colors.info,
  },
  description: {
    fontFamily: typography.fontRegular,
    fontSize: typography.sm,
    lineHeight: typography.sm * typography.normal,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusChip: {
    minHeight: 26,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: {
    fontFamily: typography.fontBold,
    fontSize: typography.xs,
  },
  settingsBtn: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  settingsText: {
    fontFamily: typography.fontSemiBold,
    fontSize: typography.xs,
    color: colors.accent,
  },
  switchWrap: {
    minWidth: 52,
    alignItems: 'flex-end',
    paddingTop: spacing.xs,
    marginLeft: spacing.sm,
  },
});

export default PermissionToggleRow;
