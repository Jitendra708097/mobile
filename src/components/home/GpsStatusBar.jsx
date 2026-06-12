/**
 * @module GpsStatusBar
 * @description Location status indicator bar with 4 possible states.
 *
 *   ✅ Inside office — green
 *   ⚠️ GPS weak     — amber
 *   ❌ Outside       — red
 *   📡 Getting GPS  — muted, pulsing
 *
 *   Never relies on color alone — icon + color + text always shown.
 *   Called by: HomeScreen below header.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {  useAnimatedStyle,  useSharedValue,  withRepeat,  withTiming,  Easing} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { colors }     from '../../theme/colors.js';
import { typography } from '../../theme/typography.js';
import { spacing }    from '../../theme/spacing.js';

dayjs.extend(relativeTime);

export const GPS_STATUS = {
  IDLE:     'idle',
  LOADING:  'loading',
  INSIDE:   'inside',
  WEAK:     'weak',
  OUTSIDE:  'outside',
};

const STATUS_CONFIG = {
  idle: {
    icon:    'location-outline',
    text:    'Location will be checked when needed',
    bg:      colors.bgSubtle,
    textColor: colors.textMuted,
  },
  loading: {
    icon:    'locate-outline',
    text:    'Checking location...',
    bg:      colors.bgSubtle,
    textColor: colors.textMuted,
  },
  inside: {
    icon:    'checkmark-circle-outline',
    text:    'Inside Office',
    bg:      colors.successLight,
    textColor: colors.success,
  },
  weak: {
    icon:    'warning-outline',
    text:    'Near office boundary',
    bg:      colors.warningLight,
    textColor: colors.warning,
  },
  outside: {
    icon:    'close-circle-outline',
    text:    'Outside Office',
    bg:      colors.dangerLight,
    textColor: colors.danger,
  },
};

/**
 * @param {object} props
 * @param {'loading'|'inside'|'weak'|'outside'} props.status
 * @param {string} [props.branchName] - e.g. "Acme HQ Mumbai"
 * @param {string} [props.message] - Optional status copy override
 */
const GpsStatusBar = ({ status = GPS_STATUS.LOADING, branchName, message, checkedAt, onRetry, isRetrying = false }) => {
  const config  = STATUS_CONFIG[status] || STATUS_CONFIG.loading;
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  useEffect(() => {
    if (status === GPS_STATUS.LOADING) {
      opacity.value = withRepeat(
        withTiming(0.4, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [status]);

  const displayText = message || config.text;
  const checkedLabel = checkedAt
    ? dayjs(checkedAt).isValid()
      ? `checked ${dayjs(checkedAt).fromNow()}`
      : `checked ${checkedAt}`
    : null;

  return (
    <Animated.View style={[styles.bar, { backgroundColor: config.bg }, animatedStyle]}>
      <View style={styles.icon}>
        <Ionicons name={config.icon} size={19} color={config.textColor} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.text, { color: config.textColor }]}>{displayText}</Text>
        {checkedLabel ? <Text style={styles.checked}>{checkedLabel}</Text> : null}
      </View>
      {onRetry ? (
        <TouchableOpacity
          onPress={onRetry}
          disabled={isRetrying}
          style={styles.retry}
          accessibilityRole="button"
          accessibilityLabel="Retry location"
          accessibilityState={{ busy: isRetrying, disabled: isRetrying }}
        >
          <Text style={[styles.retryText, { color: config.textColor }]}>
            {isRetrying ? 'Checking' : 'Retry'}
          </Text>
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection:   'row',
    alignItems:      'center',
    borderRadius:    10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    marginHorizontal: spacing.base,
    marginBottom:    spacing.base,
  },
  icon: {
    marginRight: spacing.sm,
    minWidth: 24,
    alignItems: 'center',
  },
  copy: {
    flex: 1,
  },
  text: {
    fontFamily: typography.fontMedium,
    fontSize:   typography.sm,
    lineHeight: typography.sm * 1.35,
  },
  checked: {
    fontFamily: typography.fontRegular,
    fontSize: typography.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  retry: {
    minHeight: 36,
    justifyContent: 'center',
    paddingLeft: spacing.sm,
  },
  retryText: {
    fontFamily: typography.fontBold,
    fontSize: typography.xs,
  },
});

export default GpsStatusBar;
