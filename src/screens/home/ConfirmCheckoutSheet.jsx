/**
 * @module ConfirmCheckoutSheet
 * @description Bottom sheet confirmation before checking out.
 *              Shows session start time, duration, and final-checkout toggle.
 *              Uses @gorhom/bottom-sheet — never Alert.alert().
 *              Called by: HomeScreen checkout button tap.
 */

import React, { useRef, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Switch } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

import AppButton          from '../../components/common/AppButton.jsx';
import { colors }    from '../../theme/colors.js';
import { typography }from '../../theme/typography.js';
import { spacing }   from '../../theme/spacing.js';
import { formatTime, formatDuration } from '../../utils/formatters.js';
import { SESSION } from '../../utils/constants.js';

/**
 * @param {object}  props
 * @param {boolean} props.visible          - Controls sheet open/close
 * @param {function}props.onClose          - Called when sheet closes
 * @param {function}props.onConfirmCheckout - Starts checkout verification flow
 * @param {string}  props.sessionStartTime - ISO string
 * @param {string}  [props.timezone]       - Org timezone
 * @param {number}  props.sessionMinutes   - Minutes in current session
 */
const ConfirmCheckoutSheet = ({ visible, onClose, onConfirmCheckout, sessionStartTime, timezone = 'Asia/Kolkata', sessionMinutes = 0, minSessionMinutes = SESSION.MIN_SESSION_MINUTES, cooldownMinutes = SESSION.COOLDOWN_MINUTES }) => {
  const [isFinal, setIsFinal] = useState(false);
  const sheetRef = useRef(null);
  const belowMinimum = sessionMinutes > 0 && sessionMinutes < minSessionMinutes;
  const hasCooldown = cooldownMinutes != null && Number(cooldownMinutes) > 0;

  useEffect(() => {
    if (visible)
    {
     sheetRef.current?.expand();
    }
    else
    {
     sheetRef.current?.close();
    }
  }, [visible]);

  const handleConfirm = () => {
    onConfirmCheckout?.(isFinal);
    setIsFinal(false);
  };

  const handleClose = () => {
    setIsFinal(false);
    onClose();
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={['58%', '82%']}
      enablePanDownToClose
      onClose={handleClose}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Confirm Check Out?</Text>

        {/* Session info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Started at</Text>
            <Text style={styles.infoValue}>{formatTime(sessionStartTime, timezone)}</Text>
          </View>
          <View style={[styles.infoRow, styles.durationRow]}>
            <Text style={styles.infoLabel}>Session duration</Text>
            <Text style={styles.durationValue}>{formatDuration(sessionMinutes)}</Text>
          </View>
        </View>

        {belowMinimum && (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Short session</Text>
            <Text style={styles.warningText}>
              This session is below the {minSessionMinutes} min policy. It may need admin review.
            </Text>
          </View>
        )}

        {!isFinal && hasCooldown ? (
          <View style={styles.policyBox}>
            <Text style={styles.policyText}>Next check-in unlocks after about {cooldownMinutes} min.</Text>
          </View>
        ) : null}

        {/* Final checkout toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <Text style={styles.toggleLabel}>Final check-out for today</Text>
            <Text style={styles.toggleSub}>No more check-ins after this</Text>
            {isFinal ? <Text style={styles.finalWarning}>This will close your attendance day.</Text> : null}
          </View>
          <Switch
            value={isFinal}
            onValueChange={setIsFinal}
            trackColor={{ false: colors.border, true: colors.accentLight }}
            thumbColor={isFinal ? colors.accent : colors.bgSubtle}
          />
        </View>
        {/* Buttons */}
        <View style={styles.btnRow}>
          <AppButton
            label="Cancel"
            onPress={handleClose}
            variant="outline"
            style={styles.btnHalf}
          />
          <AppButton
            label={isFinal ? 'Final Check Out' : 'Check Out'}
            onPress={handleConfirm}
            variant="danger"
            style={styles.btnHalf}
          />
        </View>
        </ScrollView>
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: colors.bgSurface },
  handle:  { backgroundColor: colors.border, width: 40 },
  content: { padding: spacing.xl, flex: 1 },

  title: {
    fontFamily:   typography.fontBold,
    fontSize:     typography.xl,
    color:        colors.textPrimary,
    marginBottom: spacing.base,
  },

  infoCard: {
    backgroundColor: colors.bgSubtle,
    borderRadius:    12,
    padding:         spacing.base,
    marginBottom:    spacing.base,
  },
  infoRow: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    paddingVertical: spacing.xs,
  },
  durationRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop:      spacing.xs,
    paddingTop:     spacing.sm,
  },
  infoLabel: {
    fontFamily: typography.fontRegular,
    fontSize:   typography.sm,
    color:      colors.textSecondary,
  },
  infoValue: {
    fontFamily: typography.fontMono,
    fontSize:   typography.base,
    color:      colors.textPrimary,
  },
  durationValue: {
    fontFamily: typography.fontMonoMed,
    fontSize:   typography['2xl'],
    color:      colors.accent,
  },

  toggleRow: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    backgroundColor: colors.bgSubtle,
    borderRadius:    12,
    padding:         spacing.base,
    marginBottom:    spacing.base,
  },
  toggleLeft: { flex: 1, marginRight: spacing.base },
  toggleLabel: {
    fontFamily: typography.fontMedium,
    fontSize:   typography.base,
    color:      colors.textPrimary,
  },
  toggleSub: {
    fontFamily: typography.fontRegular,
    fontSize:   typography.xs,
    color:      colors.textMuted,
    marginTop:  2,
  },
  finalWarning: {
    fontFamily: typography.fontBold,
    fontSize: typography.xs,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  warningBox: {
    backgroundColor: colors.warningLight,
    borderRadius: 12,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  warningTitle: {
    fontFamily: typography.fontBold,
    fontSize: typography.sm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  warningText: {
    fontFamily: typography.fontRegular,
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: typography.sm * typography.normal,
  },
  policyBox: {
    backgroundColor: colors.bgSubtle,
    borderRadius: 12,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  policyText: {
    fontFamily: typography.fontMedium,
    fontSize: typography.sm,
    color: colors.textSecondary,
  },

  btnRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
    marginTop:     spacing.sm,
  },
  btnHalf: { flex: 1 },
});

export default ConfirmCheckoutSheet;
