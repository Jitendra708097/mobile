import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getDeviceId } from '../services/deviceService.js';
import { getMyDeviceExceptions, requestDeviceException } from '../services/deviceExceptionService.js';
import useAttendanceStore from '../store/attendanceStore.js';
import AppButton from '../components/common/AppButton.jsx';
import { colors } from '../theme/colors.js';
import { typography } from '../theme/typography.js';
import { spacing } from '../theme/spacing.js';

export default function DeviceExceptionScreen() {
  const [deviceId, setDeviceId] = useState('');
  const [exceptions, setExceptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const selectedException = useAttendanceStore((state) => state.selectedDeviceException);
  const setSelectedDeviceException = useAttendanceStore((state) => state.setSelectedDeviceException);

  const load = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const [id, data] = await Promise.all([getDeviceId(), getMyDeviceExceptions()]);
      setDeviceId(id);
      setExceptions(data.exceptions || []);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Unable to load device exceptions.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!deviceId || selectedException) {
      return;
    }

    const now = Date.now();
    const approvedException = exceptions.find(
      (item) =>
        item.status === 'approved' &&
        item.tempDeviceId === deviceId &&
        (!item.expiresAt || new Date(item.expiresAt).getTime() > now)
    );

    if (approvedException) {
      setSelectedDeviceException(approvedException);
    }
  }, [deviceId, exceptions, selectedException, setSelectedDeviceException]);

  const handleSubmitRequest = async () => {
    const trimmedReason = reason.trim();

    if (!deviceId) {
      setError('Device ID is still loading. Please try again in a moment.');
      return;
    }

    if (!trimmedReason) {
      setError('Please add a reason for this device exception request.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await requestDeviceException({
        tempDeviceId: deviceId,
        reason: trimmedReason,
      });
      setReason('');
      setSuccess('Request sent to admin for approval.');
      await load(true);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Unable to send device exception request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => load(true)} />}
      >
        <View style={styles.card}>
          <Text style={styles.heading}>Request Device Exception</Text>
          <Text style={styles.subheading}>
            Send this temporary device id to admin for approval. Once approved, choose the approved exception below before marking attendance.
          </Text>
          <Text style={styles.label}>Temporary Device ID</Text>
          <Text style={styles.deviceId}>{deviceId || 'Loading...'}</Text>
          <Text style={[styles.label, styles.reasonLabel]}>Reason</Text>
          <TextInput
            value={reason}
            onChangeText={(value) => {
              setReason(value);
              setError('');
              setSuccess('');
            }}
            placeholder="Example: My registered phone is unavailable today."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={styles.reasonInput}
          />
          {success ? <Text style={styles.success}>{success}</Text> : null}
          <AppButton
            label="Send Request"
            onPress={handleSubmitRequest}
            loading={isSubmitting}
            disabled={!deviceId || isSubmitting}
            fullWidth
            style={styles.submitButton}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Available Exceptions</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!isLoading && exceptions.length === 0 ? (
            <Text style={styles.empty}>No device exceptions found yet.</Text>
          ) : null}
          {exceptions.map((item) => {
            const isSelected = selectedException?.id === item.id;
            const isApproved = item.status === 'approved';

            return (
              <View key={item.id} style={styles.exceptionRow}>
                <View style={styles.exceptionMeta}>
                  <Text style={styles.exceptionStatus}>{item.status.toUpperCase()}</Text>
                  <Text style={styles.exceptionReason}>{item.reason || 'No reason added'}</Text>
                  {item.expiresAt ? (
                    <Text style={styles.exceptionExpiry}>
                      Expires {new Date(item.expiresAt).toLocaleString()}
                    </Text>
                  ) : null}
                </View>
                {isApproved ? (
                  <TouchableOpacity
                    onPress={() => setSelectedDeviceException(isSelected ? null : item)}
                    style={[styles.useButton, isSelected && styles.useButtonSelected]}
                  >
                    <Text style={[styles.useButtonText, isSelected && styles.useButtonTextSelected]}>
                      {isSelected ? 'Selected' : 'Use for Check-in'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: spacing.base, gap: spacing.base },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: 16,
    padding: spacing.base,
  },
  heading: {
    fontFamily: typography.fontSemiBold,
    fontSize: typography.lg,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subheading: {
    fontFamily: typography.fontRegular,
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: spacing.base,
  },
  label: {
    fontFamily: typography.fontMedium,
    fontSize: typography.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  deviceId: {
    fontFamily: typography.fontMono,
    fontSize: typography.base,
    color: colors.accent,
  },
  reasonLabel: {
    marginTop: spacing.base,
  },
  reasonInput: {
    minHeight: 92,
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
  submitButton: {
    marginTop: spacing.base,
  },
  success: {
    fontFamily: typography.fontMedium,
    fontSize: typography.sm,
    color: colors.success,
    marginTop: spacing.sm,
  },
  error: {
    fontFamily: typography.fontRegular,
    fontSize: typography.sm,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  empty: {
    fontFamily: typography.fontRegular,
    fontSize: typography.sm,
    color: colors.textMuted,
  },
  exceptionRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.base,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.base,
  },
  exceptionMeta: { flex: 1 },
  exceptionStatus: {
    fontFamily: typography.fontBold,
    fontSize: typography.xs,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  exceptionReason: {
    fontFamily: typography.fontMedium,
    fontSize: typography.base,
    color: colors.textPrimary,
  },
  exceptionExpiry: {
    fontFamily: typography.fontRegular,
    fontSize: typography.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  useButton: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  useButtonSelected: {
    backgroundColor: colors.accent,
  },
  useButtonText: {
    fontFamily: typography.fontSemiBold,
    fontSize: typography.xs,
    color: colors.accent,
  },
  useButtonTextSelected: {
    color: colors.textInverse,
  },
});
