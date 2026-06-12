import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../theme/colors.js';
import { spacing } from '../../theme/spacing.js';
import { typography } from '../../theme/typography.js';

const WorkContextCard = ({ icon, title, value, subtitle, missing }) => (
  <View style={[styles.card, missing && styles.cardMissing]}>
    <View style={[styles.iconWrap, missing && styles.iconWrapMissing]}>
      <Ionicons
        name={icon}
        size={20}
        color={missing ? colors.warning : colors.accent}
      />
    </View>
    <Text style={styles.title}>{title}</Text>
    <Text
      style={[styles.value, missing && styles.valueMissing]}
      numberOfLines={2}
      adjustsFontSizeToFit
      minimumFontScale={0.86}
    >
      {value}
    </Text>
    <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
  </View>
);

const WorkContextGrid = ({ branchName, shiftName, shiftTime }) => {
  const hasBranch = Boolean(branchName);
  const hasShift = Boolean(shiftName);

  return (
    <View style={styles.grid}>
      <WorkContextCard
        icon="business-outline"
        title="Branch"
        value={hasBranch ? branchName : 'Not assigned'}
        subtitle="Assigned work location"
        missing={!hasBranch}
      />
      <WorkContextCard
        icon="time-outline"
        title="Today's Shift"
        value={hasShift ? shiftName : 'Not assigned'}
        subtitle={hasShift && shiftTime ? shiftTime : 'Shift timing unavailable'}
        missing={!hasShift}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.base,
  },
  card: {
    flex: 1,
    aspectRatio: 1,
    minHeight: 132,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSurface,
    padding: spacing.base,
    justifyContent: 'space-between',
  },
  cardMissing: {
    borderColor: colors.warning,
    backgroundColor: colors.warningLight,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapMissing: {
    backgroundColor: colors.bgSurface,
  },
  title: {
    fontFamily: typography.fontMedium,
    fontSize: typography.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  value: {
    fontFamily: typography.fontBold,
    fontSize: typography.md,
    color: colors.textPrimary,
    lineHeight: typography.md * 1.16,
  },
  valueMissing: {
    color: colors.warning,
  },
  subtitle: {
    fontFamily: typography.fontRegular,
    fontSize: typography.xs,
    color: colors.textSecondary,
    lineHeight: typography.xs * typography.normal,
  },
});

export default WorkContextGrid;
