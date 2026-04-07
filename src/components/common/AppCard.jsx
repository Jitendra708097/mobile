/**
 * @module AppCard
 * @description White surface card with platform-appropriate shadow.
 *              Border radius 16px. Both shadowColor and elevation written.
 *              Called by: all screens for content grouping.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors }  from '../../theme/colors.js';
import { spacing } from '../../theme/spacing.js';

/**
 * @param {object}           props
 * @param {React.ReactNode}  props.children
 * @param {object}           [props.style]     - Override container style
 * @param {number}           [props.padding]   - Inner padding (default: spacing.base)
 * @param {boolean}          [props.noShadow]  - Disable shadow for flat variant
 */
const AppCard = ({ children, style, padding = spacing.base, noShadow = false }) => {
  return (
    <View style={[styles.card, noShadow && styles.noShadow, { padding }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius:    16,
    boxShadow: '0px 2px 12px rgba(0, 0, 0, 0.07)',
    elevation: 3,
  },
  noShadow: {
    boxShadow: 'none',
    elevation:     0,
    borderWidth:   1,
    borderColor:   colors.border,
  },
});

export default AppCard;
