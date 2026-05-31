import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';

import AppButton from '../../components/common/AppButton.jsx';
import { submitFeedback } from '../../services/feedbackService.js';
import useAuthStore from '../../store/authStore.js';
import { parseError } from '../../utils/errorParser.js';
import { colors } from '../../theme/colors.js';
import { typography } from '../../theme/typography.js';
import { spacing } from '../../theme/spacing.js';

const FEEDBACK_TYPES = [
  { value: 'bug', label: 'Bug', icon: 'bug-outline' },
  { value: 'suggestion', label: 'Suggestion', icon: 'bulb-outline' },
  { value: 'confusing', label: 'Confusing', icon: 'help-circle-outline' },
  { value: 'other', label: 'Other', icon: 'chatbubble-ellipses-outline' },
];

export default function FeedbackScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const [rating, setRating] = useState(0);
  const [feedbackType, setFeedbackType] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async () => {
    const trimmedMessage = message.trim();

    if (!rating) {
      setError('Please choose a rating from 1 to 5.');
      return;
    }

    if (!trimmedMessage) {
      setError('Please add your feedback message.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await submitFeedback({
        rating,
        feedbackType,
        message: trimmedMessage,
        appContext: {
          appVersion: Constants.expoConfig?.version || '1.0.0',
          platform: Constants.platform || {},
        },
      });
      setRating(0);
      setFeedbackType('suggestion');
      setMessage('');
      setSuccess('Thanks. Your feedback was submitted.');
    } catch (err) {
      setError(parseError(err) || 'Unable to submit feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.heading}>Share Feedback</Text>
          <Text style={styles.subheading}>
            Your name, email, phone, and organisation will be attached automatically from your login.
          </Text>

          <View style={styles.contactBox}>
            <Text style={styles.contactLabel}>Submitting as</Text>
            <Text style={styles.contactName}>{user?.name || 'Employee'}</Text>
            <Text style={styles.contactMeta}>{user?.email || user?.phone || 'Logged-in user'}</Text>
          </View>

          <Text style={styles.label}>Rating</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((value) => {
              const selected = value <= rating;
              return (
                <TouchableOpacity
                  key={value}
                  onPress={() => {
                    setRating(value);
                    setError('');
                    setSuccess('');
                  }}
                  style={[styles.ratingButton, selected && styles.ratingButtonSelected]}
                >
                  <Ionicons
                    name={selected ? 'star' : 'star-outline'}
                    size={18}
                    color={selected ? colors.textInverse : colors.accent}
                  />
                  <Text style={[styles.ratingText, selected && styles.ratingTextSelected]}>{value}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, styles.spacedLabel]}>Feedback type</Text>
          <View style={styles.typeGrid}>
            {FEEDBACK_TYPES.map((item) => {
              const selected = item.value === feedbackType;
              return (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => {
                    setFeedbackType(item.value);
                    setError('');
                    setSuccess('');
                  }}
                  style={[styles.typeButton, selected && styles.typeButtonSelected]}
                >
                  <Ionicons
                    name={item.icon}
                    size={16}
                    color={selected ? colors.textInverse : colors.textSecondary}
                  />
                  <Text style={[styles.typeText, selected && styles.typeTextSelected]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, styles.spacedLabel]}>Message</Text>
          <TextInput
            value={message}
            onChangeText={(value) => {
              setMessage(value);
              setError('');
              setSuccess('');
            }}
            placeholder="Tell us what happened or what can be improved."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={6}
            maxLength={3000}
            textAlignVertical="top"
            style={styles.messageInput}
          />
          <Text style={styles.counter}>{message.length}/3000</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}

          <AppButton
            label="Submit Feedback"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            fullWidth
            style={styles.submitButton}
          />
          {success ? (
            <AppButton
              label="Back to Profile"
              onPress={() => navigation.goBack()}
              variant="outline"
              fullWidth
              style={styles.backButton}
            />
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: spacing.base, paddingBottom: spacing['4xl'] },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: 16,
    padding: spacing.base,
  },
  heading: {
    fontFamily: typography.fontBold,
    fontSize: typography.xl,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subheading: {
    fontFamily: typography.fontRegular,
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: spacing.base,
  },
  contactBox: {
    backgroundColor: colors.bgSubtle,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  contactLabel: {
    fontFamily: typography.fontMedium,
    fontSize: typography.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  contactName: {
    fontFamily: typography.fontSemiBold,
    fontSize: typography.base,
    color: colors.textPrimary,
  },
  contactMeta: {
    fontFamily: typography.fontRegular,
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  label: {
    fontFamily: typography.fontSemiBold,
    fontSize: typography.sm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  spacedLabel: {
    marginTop: spacing.base,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ratingButton: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: colors.bgSubtle,
  },
  ratingButtonSelected: {
    backgroundColor: colors.accent,
  },
  ratingText: {
    fontFamily: typography.fontBold,
    fontSize: typography.xs,
    color: colors.accent,
  },
  ratingTextSelected: {
    color: colors.textInverse,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeButton: {
    width: '48%',
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.bgSubtle,
  },
  typeButtonSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  typeText: {
    fontFamily: typography.fontSemiBold,
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  typeTextSelected: {
    color: colors.textInverse,
  },
  messageInput: {
    minHeight: 140,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgSubtle,
    fontFamily: typography.fontRegular,
    fontSize: typography.base,
    color: colors.textPrimary,
  },
  counter: {
    alignSelf: 'flex-end',
    fontFamily: typography.fontMono,
    fontSize: typography.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  error: {
    fontFamily: typography.fontRegular,
    fontSize: typography.sm,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  success: {
    fontFamily: typography.fontMedium,
    fontSize: typography.sm,
    color: colors.success,
    marginTop: spacing.sm,
  },
  submitButton: {
    marginTop: spacing.base,
  },
  backButton: {
    marginTop: spacing.sm,
  },
});
