/**
 * @module AppButton
 * @description Reusable animated button with loading state.
 *              Spring scale animation on press/release.
 *              Supports: primary (teal), danger (red), outline, ghost variants.
 *              Minimum touch target: 56px. Full-width or auto-width.
 *              Loading state: spinner replaces label, button disabled.
 *              Called by: all screens for primary actions.
 */

import React from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors }     from '../../theme/colors.js';
import { typography } from '../../theme/typography.js';
import { spacing }    from '../../theme/spacing.js';

/**
 * @param {object}  props
 * @param {string}  props.label           - Button text
 * @param {function}props.onPress         - Tap handler
 * @param {'primary'|'danger'|'outline'|'ghost'} [props.variant='primary']
 * @param {boolean} [props.loading=false] - Show spinner
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.fullWidth=true]
 * @param {object}  [props.style]         - Additional container style
 * @param {object}  [props.textStyle]     - Additional text style
 * @param {React.ReactNode} [props.icon]  - Leading icon element
 */
const AppButton = ({
  label,
  onPress,
  variant   = 'primary',
  loading   = false,
  disabled  = false,
  fullWidth = true,
  style,
  textStyle,
  icon,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn  = () => { scale.value = withSpring(0.96, { damping: 15 }); };
  const handlePressOut = () => { scale.value = withSpring(1.0,  { damping: 15 }); };

  const isDisabled = disabled || loading;

  const containerStyle = [
    styles.base,
    fullWidth && styles.fullWidth,
    styles[variant] || styles.primary,
    isDisabled && styles.disabled,
    style,
  ];

  const labelStyle = [
    styles.label,
    styles[`${variant}Label`] || styles.primaryLabel,
    isDisabled && styles.disabledLabel,
    textStyle,
  ];

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={1}
        style={containerStyle}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'outline' || variant === 'ghost'
              ? colors.accent
              : colors.textInverse
            }
          />
        ) : (
          <View style={styles.row}>
            {icon && <View style={styles.icon}>{icon}</View>}
            <Text style={labelStyle}>{label}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight:     56,
    borderRadius:  14,
    alignItems:    'center',
    justifyContent:'center',
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.md,
  },
  fullWidth: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  icon: {
    marginRight: spacing.sm,
  },

  // ── Variants ───────────────────────────────────────────────────────────────
  primary: {
    backgroundColor: colors.accent,
    boxShadow: '0px 6px 12px rgba(13, 115, 119, 0.28)',
    elevation: 6,
  },
  danger: {
    backgroundColor: colors.danger,
    boxShadow: '0px 6px 12px rgba(220, 38, 38, 0.25)',
    elevation: 6,
  },
  outline: {
    backgroundColor: colors.transparent,
    borderWidth:  1.5,
    borderColor:  colors.accent,
  },
  ghost: {
    backgroundColor: colors.transparent,
  },

  // ── Labels ─────────────────────────────────────────────────────────────────
  label: {
    fontFamily: typography.fontSemiBold,
    fontSize:   typography.md,
    lineHeight: typography.md * typography.normal,
  },
  primaryLabel: { color: colors.textInverse },
  dangerLabel:  { color: colors.textInverse },
  outlineLabel: { color: colors.accent },
  ghostLabel:   { color: colors.accent },

  // ── Disabled ───────────────────────────────────────────────────────────────
  disabled: {
    opacity: 0.55,
    elevation: 0,
    boxShadow: 'none',
  },
  disabledLabel: {
    opacity: 0.8,
  },
});

export default AppButton;
