import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import AppButton from '../../components/common/AppButton.jsx';
import PermissionToast from '../../components/permissions/PermissionToast.jsx';
import PermissionToggleRow from '../../components/permissions/PermissionToggleRow.jsx';
import {
  PERMISSION_ITEMS,
  areRequiredPermissionsGranted,
  getAllPermissionStatuses,
  openPermissionSettings,
  requestAppPermission,
} from '../../services/permissionService.js';
import { colors } from '../../theme/colors.js';
import { spacing } from '../../theme/spacing.js';
import { typography } from '../../theme/typography.js';

const SETTINGS_MESSAGE = 'To turn off this permission, please manage it from your phone settings.';

const PermissionSetupScreen = ({ onContinue }) => {
  const [statuses, setStatuses] = useState({});
  const [loadingStatuses, setLoadingStatuses] = useState(true);
  const [requestingKey, setRequestingKey] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  const requiredReady = useMemo(
    () => areRequiredPermissionsGranted(statuses),
    [statuses]
  );

  const showToast = useCallback((message, type = 'info', options = {}) => {
    clearTimeout(toastTimeoutRef.current);
    setToast({ message, type, ...options });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 4200);
  }, []);

  const refreshStatuses = useCallback(async () => {
    setLoadingStatuses(true);
    const nextStatuses = await getAllPermissionStatuses();
    setStatuses(nextStatuses);
    setLoadingStatuses(false);
    return nextStatuses;
  }, []);

  useEffect(() => {
    refreshStatuses();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshStatuses();
      }
    });

    return () => {
      clearTimeout(toastTimeoutRef.current);
      subscription.remove();
    };
  }, [refreshStatuses]);

  const handleOpenSettings = useCallback(async () => {
    try {
      await openPermissionSettings();
    } catch {
      showToast('Could not open settings. Please open app settings manually.', 'danger');
    }
  }, [showToast]);

  const handleToggle = async (item, nextValue) => {
    if (!nextValue && statuses[item.key]?.granted) {
      showToast(SETTINGS_MESSAGE, 'info', {
        actionLabel: 'Open Settings',
        onAction: handleOpenSettings,
      });
      return;
    }

    setRequestingKey(item.key);
    const result = await requestAppPermission(item.key);
    const nextStatuses = {
      ...statuses,
      [item.key]: result,
    };
    setStatuses(nextStatuses);
    setRequestingKey(null);

    if (result.granted) {
      showToast(item.grantedMessage, 'success');
    } else if (result.state === 'failed') {
      showToast(item.failedMessage, 'danger');
    } else {
      showToast(item.deniedMessage, item.required ? 'danger' : 'warning', {
        actionLabel: result.canAskAgain ? undefined : 'Open Settings',
        onAction: result.canAskAgain ? undefined : handleOpenSettings,
      });
    }

    if (areRequiredPermissionsGranted(nextStatuses)) {
      setTimeout(() => {
        showToast(
          'All required permissions are ready. Continue to face enrollment.',
          'success'
        );
      }, 350);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.header}>
          <View style={styles.iconBadge}>
            <Ionicons name="shield-checkmark-outline" size={28} color={colors.accent} />
          </View>
          <Text style={styles.title}>Complete App Setup</Text>
          <Text style={styles.subtitle}>
            Your password is set. Now let's complete your app setup. AttendEase needs camera and location permissions so you can enroll your face and mark attendance securely. Notifications help you receive reminders and important updates.
          </Text>
        </View>

        <View style={styles.permissionList}>
          {PERMISSION_ITEMS.map((item) => (
            <PermissionToggleRow
              key={item.key}
              item={item}
              status={statuses[item.key]}
              busy={requestingKey === item.key || loadingStatuses}
              onToggle={(value) => handleToggle(item, value)}
              onOpenSettings={handleOpenSettings}
            />
          ))}
        </View>

        <View style={styles.privacyNote}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.privacyText}>
            These permissions are used only for attendance-related features.
          </Text>
        </View>

        {requiredReady ? (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.successText}>
              All required permissions are ready. Continue to face enrollment.
            </Text>
          </View>
        ) : (
          <View style={styles.missingBox}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
            <Text style={styles.missingText}>
              Camera and location are required before face enrollment.
            </Text>
          </View>
        )}

        <AppButton
          label="Continue to Face Enrollment"
          onPress={onContinue}
          disabled={!requiredReady}
          icon={<Ionicons name="arrow-forward" size={20} color={colors.textInverse} />}
          fullWidth
          style={styles.continueBtn}
        />
      </ScrollView>

      <PermissionToast toast={toast} onClose={() => setToast(null)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing['2xl'],
    paddingBottom: spacing['5xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconBadge: {
    width: 58,
    height: 58,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentLight,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.base,
  },
  title: {
    fontFamily: typography.fontBold,
    fontSize: typography['2xl'],
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    maxWidth: 370,
    fontFamily: typography.fontRegular,
    fontSize: typography.base,
    lineHeight: typography.base * typography.normal,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  permissionList: {
    marginTop: spacing.sm,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  privacyText: {
    flex: 1,
    fontFamily: typography.fontMedium,
    fontSize: typography.sm,
    lineHeight: typography.sm * typography.normal,
    color: colors.textSecondary,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.successLight,
    borderRadius: 8,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  successText: {
    flex: 1,
    fontFamily: typography.fontSemiBold,
    fontSize: typography.sm,
    lineHeight: typography.sm * typography.normal,
    color: colors.success,
  },
  missingBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.warningLight,
    borderRadius: 8,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  missingText: {
    flex: 1,
    fontFamily: typography.fontSemiBold,
    fontSize: typography.sm,
    lineHeight: typography.sm * typography.normal,
    color: colors.warning,
  },
  continueBtn: {
    borderRadius: 8,
  },
});

export default PermissionSetupScreen;
