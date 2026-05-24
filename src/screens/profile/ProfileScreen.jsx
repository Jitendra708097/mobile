/**
 * @module ProfileScreen
 * @description Employee profile screen with personal info, device details,
 *              change password, notification toggle, and logout.
 *              Logout confirmation uses bottom sheet (never Alert.alert).
 *              Called by: MainNavigator (Tab 4 — Profile).
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Switch, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';

import useAuthStore        from '../../store/authStore.js';
import AppButton           from '../../components/common/AppButton.jsx';
import { Avatar, Divider, ErrorMessage } from '../../components/common/CommonComponents.jsx';
import ChangePasswordSheet from './ChangePasswordSheet.jsx';
import DeviceInfoCard      from './DeviceInfoCard.jsx';
import { fetchNotificationPreferences, updateNotificationPreferences } from '../../services/notificationService.js';
import { colors }          from '../../theme/colors.js';
import { typography }      from '../../theme/typography.js';
import { spacing }         from '../../theme/spacing.js';
import { formatDate }      from '../../utils/formatters.js';

// ── Main ProfileScreen ───────────────────────────────────────────────────────
const ProfileScreen = ({ navigation }) => {
  const user          = useAuthStore((s) => s.user);
  const logout        = useAuthStore((s) => s.logout);
  const isLoggingOut  = useAuthStore((s) => s.isLoggingOut);
  const storeError    = useAuthStore((s) => s.error);
  const clearError    = useAuthStore((s) => s.clearError);

  const [notifEnabled, setNotifEnabled] = useState(true);
  const [savingNotif, setSavingNotif] = useState(false);

  useEffect(() => {
    const loadNotificationPreference = async () => {
      try {
        const data = await fetchNotificationPreferences();
        const preferences = data.preferences || {};
        setNotifEnabled(preferences.enabled !== false && preferences.push !== false);
      } catch (error) {
        console.log('Failed to load notification preference:', error);
      }
    };

    loadNotificationPreference();
  }, []);

  const handleNotificationToggle = async (enabled) => {
    setNotifEnabled(enabled);
    setSavingNotif(true);
    try {
      await updateNotificationPreferences({ enabled, push: enabled });
    } catch (error) {
      setNotifEnabled(!enabled);
      console.log('Failed to update notification preference:', error);
    } finally {
      setSavingNotif(false);
    }
  };

  const openLogoutSheet = () => {
    clearError();
    logoutRef.current?.expand();
  };

  const handleLogout = async () => {
    await logout();
  };

  const changePassRef = useRef(null);
  const logoutRef     = useRef(null);
  const profilePhotoUri =
    user?.profilePhotoUrl ||
    user?.profileImageUrl ||
    user?.avatarUrl ||
    user?.photoUrl ||
    user?.imageUrl ||
    user?.selfieUrl ||
    user?.profile_photo_url ||
    user?.profile_image_url ||
    user?.avatar_url ||
    user?.photo_url ||
    user?.image_url ||
    user?.selfie_url ||
    null;

  const InfoRow = ({ label, value, mono = false }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={mono ? styles.infoValueMono : styles.infoValue}>{value || 'Not available'}</Text>
    </View>
  );

  const joinedDate = user?.joinedAt ? formatDate(user.joinedAt) : 'Not available';

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Avatar + Name */}
        <View style={styles.avatarBlock}>
          <Avatar name={user?.name} uri={profilePhotoUri} size={76} style={styles.avatar} />
          <Text style={styles.name}>{user?.name || user?.email?.split('@')?.[0] || 'Employee'}</Text>
          <Text style={styles.empCode}>{user?.employeeCode}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{user?.role || 'Employee'}</Text>
            </View>
          </View>
        </View>

        {/* Info */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Personal Info</Text>
          <InfoRow label="Email"      value={user?.email} />
          <Divider />
          <InfoRow label="Phone"      value={user?.phone} />
          <Divider />
          <InfoRow label="Department" value={user?.department} />
          <Divider />
          <InfoRow label="Shift"      value={user?.shiftName} />
          <Divider />
          <InfoRow label="Joined"     value={joinedDate === '—' ? 'Not available' : joinedDate} mono />
        </View>

        {/* Device */}
        <Text style={[styles.sectionHeading, { marginHorizontal: spacing.base }]}>Device</Text>
        <View style={{ paddingHorizontal: spacing.base }}>
          <DeviceInfoCard />
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Settings</Text>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => changePassRef.current?.expand()}
          >
            <Text style={styles.actionLabel}>Change Password</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <Divider />

          <View style={styles.actionRow}>
            <Text style={styles.actionLabel}>Push Notifications</Text>
            <Switch
              value={notifEnabled}
              onValueChange={handleNotificationToggle}
              disabled={savingNotif}
              trackColor={{ false: colors.border, true: colors.accentLight }}
              thumbColor={notifEnabled ? colors.accent : colors.bgSubtle}
            />
          </View>

          <Divider />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate('DeviceException')}
          >
            <Text style={styles.actionLabel}>Request Device Exception</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <Divider />

          <View style={styles.actionRow}>
            <Text style={styles.actionLabel}>App Version</Text>
            <Text style={styles.versionText}>v1.0.0</Text>
          </View>

          <Divider />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={openLogoutSheet}
            disabled={isLoggingOut}
          >
            <Text style={[styles.actionLabel, styles.logoutLabel]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Change Password Sheet */}
      <ChangePasswordSheet
        sheetRef={changePassRef}
        onClose={() => changePassRef.current?.close()}
      />

      {/* Logout Confirmation Sheet */}
      <BottomSheet
        ref={logoutRef}
        index={-1}
        snapPoints={['40%']}
        enablePanDownToClose={!isLoggingOut}
        backgroundStyle={{ backgroundColor: colors.bgSurface }}
        handleIndicatorStyle={{ backgroundColor: colors.border, width: 40 }}
      >
        <BottomSheetView style={styles.logoutSheet}>
          <Text style={styles.logoutTitle}>Sign out?</Text>
          <Text style={styles.logoutSub}>You'll need to sign in again to mark attendance.</Text>
          {storeError ? <ErrorMessage message={storeError} style={styles.logoutError} /> : null}
          <View style={styles.logoutBtns}>
            <AppButton
              label="Cancel"
              onPress={() => logoutRef.current?.close()}
              variant="outline"
              disabled={isLoggingOut}
              style={{ flex: 1 }}
            />
            <AppButton
              label="Sign Out"
              onPress={handleLogout}
              variant="danger"
              loading={isLoggingOut}
              style={{ flex: 1 }}
            />
          </View>
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bgPrimary },
  scroll: { paddingBottom: spacing['4xl'] },

  avatarBlock: {
    alignItems:    'center',
    paddingVertical: spacing['2xl'],
    backgroundColor: colors.bgSurface,
    marginBottom:   spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    borderWidth: 3,
    borderColor: colors.bgSurface,
    boxShadow: '0px 4px 12px rgba(13, 115, 119, 0.18)',
    elevation: 3,
  },
  name: {
    fontFamily:   typography.fontBold,
    fontSize:     typography.xl,
    color:        colors.textPrimary,
    marginTop:    spacing.sm,
  },
  empCode: {
    fontFamily: typography.fontMono,
    fontSize:   typography.sm,
    color:      colors.textMuted,
    marginTop:  spacing.xs,
  },
  badgeRow: { flexDirection: 'row', marginTop: spacing.sm },
  roleBadge: {
    backgroundColor: colors.accentLight,
    borderRadius:    20,
    paddingHorizontal: spacing.md,
    paddingVertical:  spacing.xs,
  },
  roleBadgeText: {
    fontFamily: typography.fontSemiBold,
    fontSize:   typography.xs,
    color:      colors.accent,
  },

  section: {
    backgroundColor: colors.bgSurface,
    marginHorizontal: spacing.base,
    borderRadius:    16,
    padding:         spacing.base,
    marginBottom:    spacing.base,
    boxShadow:       '0px 1px 8px rgba(0, 0, 0, 0.05)',
    elevation:       1,
  },
  sectionHeading: {
    fontFamily:   typography.fontSemiBold,
    fontSize:     typography.sm,
    color:        colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom:  spacing.base,
  },

  infoRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    fontFamily: typography.fontRegular,
    fontSize:   typography.base,
    color:      colors.textSecondary,
  },
  infoValue: {
    fontFamily: typography.fontMedium,
    fontSize:   typography.base,
    color:      colors.textPrimary,
    maxWidth:   '55%',
    textAlign:  'right',
  },
  infoValueMono: {
    fontFamily: typography.fontMono,
    fontSize:   typography.base,
    color:      colors.textPrimary,
  },

  actionRow: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingVertical: spacing.sm,
    minHeight:       48,
  },
  actionLabel: {
    fontFamily: typography.fontMedium,
    fontSize:   typography.base,
    color:      colors.textPrimary,
  },
  versionText: {
    fontFamily: typography.fontMono,
    fontSize:   typography.sm,
    color:      colors.textMuted,
  },
  logoutLabel: { color: colors.danger },

  logoutSheet: { padding: spacing.xl },
  logoutTitle: {
    fontFamily:   typography.fontBold,
    fontSize:     typography.lg,
    color:        colors.textPrimary,
    marginBottom: spacing.xs,
  },
  logoutSub: {
    fontFamily:   typography.fontRegular,
    fontSize:     typography.base,
    color:        colors.textSecondary,
    marginBottom: spacing.xl,
  },
  logoutError: { marginBottom: spacing.base },
  logoutBtns: { flexDirection: 'row', gap: spacing.sm },
});

export default ProfileScreen;
