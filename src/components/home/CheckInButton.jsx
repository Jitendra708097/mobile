/**
 * @module CheckInButton
 * @description The most important UI element in the app.
 *              Large teal button with spring scale animation and teal glow shadow.
 *              State: CHECK_IN — green, "Mark Attendance".
 *              Height: 64px. Full-width minus screen padding.
 *              Called by: HomeScreen when buttonState === 'CHECK_IN'.
 */

import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors }     from '../../theme/colors.js';
import { typography } from '../../theme/typography.js';
import { spacing }    from '../../theme/spacing.js';

/**
 * @param {object}   props
 * @param {function} props.onPress   - Tap handler (opens LivenessChallenge)
 * @param {boolean}  [props.loading] - Disable during API call
 */
const CheckInButton = ({ onPress, loading = false, disabled = false, label = 'Mark Attendance', hint }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn  = () => { scale.value = withSpring(0.96, { damping: 12 }); };
  const handlePressOut = () => { scale.value = withSpring(1.0,  { damping: 12 }); };
  const isDisabled = loading || disabled;

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={1}
        style={[styles.button, isDisabled && styles.buttonDisabled]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
      >
        <View style={styles.content}>
          <Ionicons
            name="checkmark-circle"
            size={20}
            color={isDisabled ? colors.textSecondary : colors.textInverse}
            style={styles.icon}
          />
          <Text style={[styles.label, isDisabled && styles.disabledText]}>{loading ? 'Checking...' : label}</Text>
        </View>
      </TouchableOpacity>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  button: {
    backgroundColor: colors.accent,
    height:          64,
    borderRadius:    14,
    alignItems:      'center',
    justifyContent:  'center',
    // iOS glow
    boxShadow: '0px 8px 16px rgba(13, 115, 119, 0.32)',
    // Android
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: colors.bgSubtle,
    elevation: 0,
    boxShadow: 'none',
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    flexDirection:  'row',
    alignItems:     'center',
  },
  icon: {
    marginRight: spacing.sm,
  },
  label: {
    fontFamily: typography.fontSemiBold,
    fontSize:   typography.md,
    color:      colors.textInverse,
    letterSpacing: 0.2,
    flexShrink: 1,
    textAlign: 'center',
  },
  disabledText: {
    color: colors.textSecondary,
  },
  hint: {
    fontFamily: typography.fontRegular,
    fontSize: typography.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});

export default CheckInButton;
