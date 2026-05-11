/**
 * @module LoadingOverlay
 * @description Full-screen semi-transparent loading overlay with spinner and message.
 *              Used during check-in/out API calls and face verification.
 *              Called by: HomeScreen, LivenessChallenge, FaceEnrollScreen.
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors }     from '../../theme/colors.js';
import { typography } from '../../theme/typography.js';
import { spacing }    from '../../theme/spacing.js';

const EMPTY_STATE_ICONS = {
  R: 'calendar-clear-outline',
  L: 'briefcase-outline',
  N: 'notifications-outline',
  i: 'information-circle-outline',
};

export const LoadingOverlay = ({ message = 'Loading...', subMessage }) => (
  <View style={loStyles.overlay}>
    <View style={loStyles.card}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={loStyles.message}>{message}</Text>
      {subMessage ? <Text style={loStyles.sub}>{subMessage}</Text> : null}
    </View>
  </View>
);

const loStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    alignItems:      'center',
    justifyContent:  'center',
    zIndex:          999,
  },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius:    16,
    padding:         spacing['2xl'],
    alignItems:      'center',
    minWidth:        200,
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.15)',
    elevation: 8,
  },
  message: {
    fontFamily: typography.fontSemiBold,
    fontSize:   typography.base,
    color:      colors.textPrimary,
    marginTop:  spacing.base,
    textAlign:  'center',
  },
  sub: {
    fontFamily: typography.fontRegular,
    fontSize:   typography.sm,
    color:      colors.textSecondary,
    marginTop:  spacing.xs,
    textAlign:  'center',
  },
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @module ErrorMessage
 * @description Inline error display below form fields or sections.
 *              Red background with error text.
 *              Called by: all screens with API error state.
 */
export const ErrorMessage = ({ message, style }) => {
  if (!message) return null;
  return (
    <View style={[emStyles.container, style]}>
      <Ionicons name="warning-outline" size={16} color={colors.danger} style={emStyles.icon} />
      <Text style={emStyles.text}>{message}</Text>
    </View>
  );
};

const emStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.dangerLight,
    borderRadius:    10,
    padding:         spacing.md,
    marginVertical:  spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  icon: {
    marginRight: spacing.xs,
    marginTop: 1,
  },
  text: {
    flex: 1,
    fontFamily: typography.fontMedium,
    fontSize:   typography.sm,
    color:      colors.danger,
    lineHeight: typography.sm * typography.normal,
  },
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @module EmptyState
 * @description Centered empty state with emoji, title, and subtitle.
 *              Called by: HistoryScreen, LeaveHistoryList, NotificationsScreen.
 */
export const EmptyState = ({ icon = 'i', title, subtitle, style }) => (
  <View style={[esStyles.container, style]}>
    <View style={esStyles.iconCircle}>
      <Ionicons
        name={EMPTY_STATE_ICONS[icon] || icon || EMPTY_STATE_ICONS.i}
        size={26}
        color={colors.accent}
      />
    </View>
    <Text style={esStyles.title}>{title}</Text>
    {subtitle ? <Text style={esStyles.subtitle}>{subtitle}</Text> : null}
  </View>
);

const esStyles = StyleSheet.create({
  container: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        spacing['2xl'],
    minHeight:      200,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  icon: {
    fontFamily: typography.fontBold,
    fontSize: typography.xl,
    color: colors.accent,
  },
  title: {
    fontFamily: typography.fontSemiBold,
    fontSize:   typography.md,
    color:      colors.textPrimary,
    textAlign:  'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.fontRegular,
    fontSize:   typography.base,
    color:      colors.textSecondary,
    textAlign:  'center',
    lineHeight: typography.base * typography.normal,
  },
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @module Avatar
 * @description Circle avatar displaying a profile photo when available,
 *              with initials fallback.
 *              Called by: ProfileScreen, HomeScreen header, notification items.
 */
export const Avatar = ({ name = '', uri, size = 48, style }) => {
  const initial = (name || 'U').charAt(0).toUpperCase();
  const fontSize = size * 0.4;

  return (
    <View
      style={[
        avStyles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : (
      <Text style={[avStyles.initial, { fontSize }]}>{initial}</Text>
      )}
    </View>
  );
};

const avStyles = StyleSheet.create({
  circle: {
    backgroundColor: colors.accent,
    alignItems:      'center',
    justifyContent:  'center',
    overflow:        'hidden',
  },
  initial: {
    fontFamily: typography.fontBold,
    color:      colors.textInverse,
  },
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @module Divider
 * @description Thin horizontal divider line.
 *              Called by: ProfileScreen, list items.
 */
export const Divider = ({ style }) => (
  <View style={[divStyles.line, style]} />
);

const divStyles = StyleSheet.create({
  line: {
    height:          1,
    backgroundColor: colors.border,
    marginVertical:  spacing.sm,
  },
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @module OfflineBanner
 * @description Red banner displayed at top of screen when no internet.
 *              Slides in/out based on network status.
 *              Called by: HomeScreen, HistoryScreen.
 */
export const OfflineBanner = ({ visible }) => {
  if (!visible) return null;
  return (
    <View style={obStyles.banner}>
      <Text style={obStyles.text}>Offline. Attendance will sync when connected.</Text>
    </View>
  );
};

const obStyles = StyleSheet.create({
  banner: {
    backgroundColor: colors.danger,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    alignItems:      'center',
  },
  text: {
    fontFamily: typography.fontMedium,
    fontSize:   typography.sm,
    color:      colors.textInverse,
  },
});
