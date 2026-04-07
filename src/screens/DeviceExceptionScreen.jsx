import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getDeviceId } from '../services/deviceService.js';
import { getMyDeviceExceptions } from '../services/deviceExceptionService.js';
import useAttendanceStore from '../store/attendanceStore.js';
import { colors } from '../theme/colors.js';
import { typography } from '../theme/typography.js';
import { spacing } from '../theme/spacing.js';

export default function DeviceExceptionScreen() {
  const [deviceId, setDeviceId] = useState('');
  const [exceptions, setExceptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => load(true)} />}
      >
        <View style={styles.card}>
          <Text style={styles.heading}>Forgot your phone?</Text>
          <Text style={styles.subheading}>
            Show this temporary device id to your admin. Once approved, choose the approved exception below before check-in.
          </Text>
          <Text style={styles.label}>Temporary Device ID</Text>
          <Text style={styles.deviceId}>{deviceId || 'Loading...'}</Text>
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
