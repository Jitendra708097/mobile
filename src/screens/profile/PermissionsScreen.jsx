import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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

const SETTINGS_MESSAGE =
  'To turn off this permission, please manage it from your phone settings.';

const PermissionsScreen = () => {
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

  useFocusEffect(
    useCallback(() => {
      refreshStatuses();
    }, [refreshStatuses])
  );

  useEffect(() => {
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
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.header}>
          <View style={styles.iconBadge}>
            <Ionicons name="shield-checkmark-outline" size={25} color={colors.accent} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>App Permissions</Text>
            <Text style={styles.subtitle}>
              View and manage the permissions AttendEase uses for attendance, face verification, and reminders.
            </Text>
          </View>
        </View>

        <View style={styles.summary}>
          <Ionicons
            name={requiredReady ? 'checkmark-circle' : 'alert-circle-outline'}
            size={20}
            color={requiredReady ? colors.success : colors.warning}
          />
          <Text style={[
            styles.summaryText,
            { color: requiredReady ? colors.success : colors.warning },
          ]}>
            {requiredReady
              ? 'All required permissions are enabled.'
              : 'Camera and location are required for attendance setup.'}
          </Text>
        </View>

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

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.noteText}>
            If a permission is denied permanently, use Open Settings to enable it from your phone.
          </Text>
        </View>

        <AppButton
          label="Refresh Status"
          onPress={refreshStatuses}
          variant="outline"
          loading={loadingStatuses}
          icon={<Ionicons name="refresh" size={19} color={colors.accent} />}
          fullWidth
          style={styles.refreshBtn}
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
    padding: spacing.base,
    paddingBottom: spacing['5xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentLight,
    marginRight: spacing.md,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontFamily: typography.fontBold,
    fontSize: typography.xl,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: typography.fontRegular,
    fontSize: typography.base,
    lineHeight: typography.base * typography.normal,
    color: colors.textSecondary,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  summaryText: {
    flex: 1,
    fontFamily: typography.fontSemiBold,
    fontSize: typography.sm,
    lineHeight: typography.sm * typography.normal,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.base,
    marginTop: spacing.xs,
    marginBottom: spacing.base,
  },
  noteText: {
    flex: 1,
    fontFamily: typography.fontMedium,
    fontSize: typography.sm,
    lineHeight: typography.sm * typography.normal,
    color: colors.textSecondary,
  },
  refreshBtn: {
    borderRadius: 8,
  },
});

export default PermissionsScreen;
