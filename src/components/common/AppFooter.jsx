import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

import { colors } from '../../theme/colors.js';
import { spacing } from '../../theme/spacing.js';
import { typography } from '../../theme/typography.js';

const appVersion = Constants.expoConfig?.version || '1.0.0';

const AppFooter = ({ style, lastSyncedLabel }) => (
  <View style={[styles.container, style]}>
    <View style={styles.madeRow}>
      <Ionicons name="flag-outline" size={13} color={colors.textMuted} />
      <Text style={styles.madeText}>Made in India</Text>
    </View>
    <Text style={styles.detailText}>
      {lastSyncedLabel || `AttendEase v${appVersion} \u2022 Secure attendance for your organisation`}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.xl,
  },
  madeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  madeText: {
    fontFamily: typography.fontSemiBold,
    fontSize: typography.xs,
    color: colors.textMuted,
  },
  detailText: {
    fontFamily: typography.fontRegular,
    fontSize: typography.xs,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: typography.xs * typography.normal,
  },
});

export default AppFooter;
