/**
 * @module RegularisationModal
 * @description Full-screen modal for submitting attendance regularisation requests.
 *              Two-level approval (Manager → Admin).
 *              Evidence type mandatory. Optional photo upload.
 *              Called by: HistoryScreen FAB, DayDetailSheet link.
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Modal, TextInput, Keyboard } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import AppButton from '../../components/common/AppButton.jsx';
import { ErrorMessage } from '../../components/common/CommonComponents.jsx';
import { submitRegularisation } from '../../services/regularisationService.js';
import { colors }    from '../../theme/colors.js';
import { typography }from '../../theme/typography.js';
import { spacing }   from '../../theme/spacing.js';
import { REGULARISATION_TYPES, REGULARISATION_TYPE_LABELS, EVIDENCE_TYPES, EVIDENCE_TYPE_LABELS, API_ROUTES } from '../../utils/constants.js';

const TypePill = ({ label, selected, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.pill, selected && styles.pillSelected]}
  >
    <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{label}</Text>
  </TouchableOpacity>
);

const FormField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  numberOfLines,
}) => (
  <View style={styles.inputBlock}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      keyboardType={keyboardType}
      autoCapitalize="none"
      autoCorrect={false}
      multiline={multiline}
      numberOfLines={multiline ? numberOfLines : undefined}
      style={[styles.textInput, multiline && styles.textArea]}
      textAlignVertical={multiline ? 'top' : 'center'}
    />
  </View>
);

/**
 * @param {object}  props
 * @param {boolean} props.visible
 * @param {function}props.onClose
 * @param {function}[props.onSubmitted]
 * @param {string}  [props.date] - Pre-filled date string YYYY-MM-DD
 */
const RegularisationModal = ({ visible, onClose, onSubmitted, date }) => {
  const [type,     setType]     = useState(REGULARISATION_TYPES.MISSED_CHECKIN);
  const [checkIn,  setCheckIn]  = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [reason,   setReason]   = useState('');
  const [evidence, setEvidence] = useState(EVIDENCE_TYPES.EMAIL);
  const [photo,    setPhoto]    = useState(null);
  const [isLoading,setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);

  const reset = () => {
    setType(REGULARISATION_TYPES.MISSED_CHECKIN);
    setCheckIn(''); setCheckOut(''); setReason('');
    setEvidence(EVIDENCE_TYPES.EMAIL);
    setPhoto(null); setError(''); setSuccess(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality:    0.7,
      base64:     true,
    });
    if (!result.canceled) setPhoto(result.assets[0]);
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!reason.trim()) { setError('Reason is required.'); return; }
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    const needsCheckIn = type === REGULARISATION_TYPES.MISSED_CHECKIN || type === REGULARISATION_TYPES.WRONG_TIME;
    const needsCheckOut = type === REGULARISATION_TYPES.MISSED_CHECKOUT || type === REGULARISATION_TYPES.WRONG_TIME;

    if (needsCheckIn && !checkIn.trim()) {
      setError('Requested check-in time is required for this request type.');
      return;
    }

    if (needsCheckOut && !checkOut.trim()) {
      setError('Requested check-out time is required for this request type.');
      return;
    }

    if (checkIn && !timePattern.test(checkIn.trim())) {
      setError('Check-in time must be in 24-hour HH:MM format.');
      return;
    }

    if (checkOut && !timePattern.test(checkOut.trim())) {
      setError('Check-out time must be in 24-hour HH:MM format.');
      return;
    }

    if (checkIn && checkOut && checkOut <= checkIn) {
      setError('Check-out time must be after check-in time.');
      return;
    }

    setLoading(true); setError('');
    try {
      await submitRegularisation({
        date:              date || new Date().toISOString().split('T')[0],
        requestedCheckIn:  checkIn  || undefined,
        requestedCheckOut: checkOut || undefined,
        reason:            reason.trim(),
        evidenceType:      evidence,
        evidenceUrl:       photo?.uri || undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        reset();
        if (onSubmitted) {
          onSubmitted();
        } else {
          onClose();
        }
      }, 1800);
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Submit Regularisation</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {success && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>Regularisation submitted successfully.</Text>
            </View>
          )}

          {/* Date (read-only) */}
          {date && (
            <View style={styles.dateRow}>
              <Text style={styles.fieldLabel}>Date</Text>
              <Text style={styles.dateValue}>{date}</Text>
            </View>
          )}

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Regularisation goes through manager/admin approval. Add the exact requested time and a clear reason.
            </Text>
          </View>

          {/* Type selector */}
          <Text style={styles.fieldLabel}>Request Type</Text>
          <View style={styles.pillRow}>
            {Object.entries(REGULARISATION_TYPE_LABELS).map(([k, v]) => (
              <TypePill key={k} label={v} selected={type === k} onPress={() => setType(k)} />
            ))}
          </View>

          {/* Times */}
          <FormField
            label={type === REGULARISATION_TYPES.MISSED_CHECKOUT ? 'Requested Check-in Time (optional)' : 'Requested Check-in Time (HH:MM)'}
            value={checkIn}
            onChangeText={setCheckIn}
            placeholder="09:00"
            keyboardType="numbers-and-punctuation"
          />
          <FormField
            label={type === REGULARISATION_TYPES.MISSED_CHECKIN ? 'Requested Check-out Time (optional)' : 'Requested Check-out Time (HH:MM)'}
            value={checkOut}
            onChangeText={setCheckOut}
            placeholder="18:00"
            keyboardType="numbers-and-punctuation"
          />

          {/* Reason */}
          <FormField
            label="Reason *"
            value={reason}
            onChangeText={setReason}
            placeholder="Explain the reason for this regularisation..."
            multiline
            numberOfLines={4}
          />

          {/* Evidence type */}
          <Text style={styles.fieldLabel}>Evidence Type *</Text>
          <View style={styles.pillRow}>
            {Object.entries(EVIDENCE_TYPE_LABELS).map(([k, v]) => (
              <TypePill key={k} label={v} selected={evidence === k} onPress={() => setEvidence(k)} />
            ))}
          </View>

          {/* Optional photo */}
          <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
            <Text style={styles.photoBtnText}>
              {photo ? 'Photo attached' : 'Attach evidence photo (optional)'}
            </Text>
          </TouchableOpacity>

          {error && <ErrorMessage message={error} />}

          <AppButton
            label="Submit Regularisation"
            onPress={handleSubmit}
            loading={isLoading}
            fullWidth
            style={styles.submitBtn}
          />
          <AppButton
            label="Cancel"
            onPress={handleClose}
            variant="outline"
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bgPrimary },
  header: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical:  spacing.base,
    backgroundColor: colors.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontFamily: typography.fontBold,
    fontSize:   typography.lg,
    color:      colors.textPrimary,
  },
  closeBtn: { padding: spacing.sm },
  closeText: {
    fontFamily: typography.fontBold,
    fontSize:   typography.md,
    color:      colors.textSecondary,
  },

  scroll: { padding: spacing.xl, paddingBottom: spacing['3xl'] },

  successBanner: {
    backgroundColor: colors.successLight,
    borderRadius:    12,
    padding:         spacing.base,
    marginBottom:    spacing.base,
    alignItems:      'center',
  },
  successText: {
    fontFamily: typography.fontSemiBold,
    fontSize:   typography.base,
    color:      colors.success,
  },

  dateRow: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    backgroundColor: colors.bgSubtle,
    borderRadius:    12,
    padding:         spacing.base,
    marginBottom:    spacing.base,
  },
  dateValue: {
    fontFamily: typography.fontMonoMed,
    fontSize:   typography.base,
    color:      colors.textPrimary,
  },
  infoBox: {
    backgroundColor: colors.accentLight,
    borderRadius: 12,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  infoText: {
    fontFamily: typography.fontRegular,
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: typography.sm * typography.normal,
  },

  fieldLabel: {
    fontFamily:   typography.fontMedium,
    fontSize:     typography.sm,
    color:        colors.textSecondary,
    marginBottom: spacing.sm,
    letterSpacing: 0.2,
  },

  inputBlock: {
    marginBottom: spacing.base,
  },
  inputLabel: {
    fontFamily: typography.fontMedium,
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    letterSpacing: 0.2,
  },
  textInput: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgSurface,
    fontFamily: typography.fontRegular,
    fontSize: typography.base,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 112,
    paddingTop: spacing.md,
    lineHeight: typography.base * typography.normal,
  },

  pillRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.sm,
    marginBottom:  spacing.base,
  },
  pill: {
    borderRadius:    20,
    paddingHorizontal: spacing.base,
    paddingVertical:  spacing.sm,
    backgroundColor: colors.bgSubtle,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  pillSelected: {
    backgroundColor: colors.accentLight,
    borderColor:     colors.accent,
  },
  pillText: {
    fontFamily: typography.fontMedium,
    fontSize:   typography.sm,
    color:      colors.textSecondary,
  },
  pillTextSelected: { color: colors.accent },

  photoBtn: {
    borderRadius:    12,
    borderWidth:     1.5,
    borderColor:     colors.border,
    borderStyle:     'dashed',
    padding:         spacing.base,
    alignItems:      'center',
    marginBottom:    spacing.base,
  },
  photoBtnText: {
    fontFamily: typography.fontMedium,
    fontSize:   typography.base,
    color:      colors.textSecondary,
  },

  submitBtn: { marginBottom: spacing.sm },
});

export default RegularisationModal;
