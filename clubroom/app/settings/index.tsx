import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { SettingsFormScreen, SettingsRow, SettingsSection, SettingsToggleRow } from '@/components/settings';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Components, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useSettingsHub } from '@/hooks/use-settings-hub';
import { bookingSelfSettingService } from '@/services/booking-self-setting-service';
import { createLogger } from '@/utils/logger';
import { hasAccountChildren } from '@/utils/booking-self-capability';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('SettingsHub');

export default function SettingsHubScreen() {
  const { colors } = useTheme();
  const { currentUser, isCoach, childCount, handleLogout } = useSettingsHub();
  const canManageChildren = Boolean(currentUser && !isCoach && currentUser.role !== 'ADMIN');
  const [allowBookSelf, setAllowBookSelf] = useState(false);
  const accountHasChildren = hasAccountChildren({
    contextChildCount: childCount,
    accountChildRefCount: currentUser?.children?.length ?? 0,
  });

  useEffect(() => {
    if (!currentUser?.id || !accountHasChildren) {
      setAllowBookSelf(false);
      return;
    }
    let cancelled = false;
    void bookingSelfSettingService.isEnabled(currentUser.id).then((enabled) => {
      if (!cancelled) {
        setAllowBookSelf(enabled);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [accountHasChildren, currentUser?.id]);

  const handleAllowBookSelfChange = useCallback(
    async (nextValue: boolean) => {
      if (!currentUser?.id) return;
      const previousValue = allowBookSelf;
      setAllowBookSelf(nextValue);

      const success = await bookingSelfSettingService.setEnabled(currentUser.id, nextValue);
      if (!success) {
        setAllowBookSelf(previousValue);
        uiFeedback.showToast('Please try again.');
      }
    },
    [allowBookSelf, currentUser?.id],
  );

  return (
    <SettingsFormScreen title="Settings">
      <SurfaceCard
        style={styles.profileCard}
        onPress={() => {
          logger.press('ProfileCard');
          router.push(Routes.EDIT_PROFILE);
        }}
      >
        <Row align="center" gap="md">
          {currentUser?.avatar ? (
            <Image source={{ uri: currentUser.avatar }} style={styles.profilePhoto} />
          ) : (
            <View style={[styles.profilePhoto, { backgroundColor: colors.border }]}>
              <Ionicons name="person" size={32} color={colors.muted} />
            </View>
          )}
          <View style={styles.profileInfo}>
            <ThemedText type="subtitle" style={styles.profileName}>
              {currentUser?.fullName || currentUser?.name || 'User'}
            </ThemedText>
            <ThemedText style={[styles.profileEmail, { color: colors.muted }]}>
              {currentUser?.email || 'Not set'}
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Row>
      </SurfaceCard>

      <SettingsSection title="Account">
        <SettingsRow
          icon="person"
          title="Account"
          subtitle="Email, password, delete account"
          onPress={() => {
            logger.press('AccountSettings');
            router.push(Routes.SETTINGS_ACCOUNT);
          }}
        />
        {isCoach && (
          <SettingsRow
            icon="briefcase"
            title="Coach Profile"
            subtitle="Services, rates, verification"
            onPress={() => {
              logger.press('CoachProfile');
              router.push(Routes.COACH_PROFILE);
            }}
          />
        )}
        {isCoach && (
          <SettingsRow
            icon="shield-checkmark"
            title="Verification"
            subtitle="Background checks and credentials"
            onPress={() => {
              logger.press('Verification');
              router.push(Routes.VERIFICATION);
            }}
          />
        )}
        {isCoach && (
          <SettingsRow
            icon="calendar"
            title="Availability"
            subtitle="Set your schedule and time slots"
            onPress={() => {
              logger.press('Availability');
              router.push(Routes.AVAILABILITY);
            }}
          />
        )}
        {canManageChildren && (
          <SettingsRow
            icon="people"
            title="Children"
            subtitle={
              accountHasChildren
                ? "Manage your children's profiles"
                : 'Add and manage child profiles'
            }
            onPress={() => {
              logger.press('ChildrenManagement');
              router.push(Routes.CHILDREN);
            }}
          />
        )}
      </SettingsSection>

      <SettingsSection title="Preferences">
        <SettingsRow
          icon="notifications"
          title="Notifications"
          subtitle="Push, email, and session reminders"
          onPress={() => {
            logger.press('NotificationSettings');
            router.push(Routes.SETTINGS_NOTIFICATION_PREFERENCES);
          }}
        />
        <SettingsRow
          icon="calendar"
          title="Calendar Sync"
          subtitle="Export sessions to Google/Apple Calendar"
          onPress={() => {
            logger.press('CalendarSync');
            router.push(Routes.SETTINGS_CALENDAR_SYNC);
          }}
        />
        <SettingsRow
          icon="moon"
          title="Appearance"
          subtitle="Dark mode and display settings"
          onPress={() => {
            logger.press('AppearanceSettings');
            router.push(Routes.SETTINGS_APPEARANCE);
          }}
        />
        {accountHasChildren && (
          <SettingsToggleRow
            icon="person"
            title="Allow Booking for Self"
            subtitle="When enabled, you can choose yourself in booking target selection."
            value={allowBookSelf}
            onValueChange={handleAllowBookSelfChange}
          />
        )}
        <SettingsRow
          icon="language"
          title="Language"
          value="English (UK)"
          onPress={() => {
            logger.press('Language');
            uiFeedback.showToast('Additional languages not available');
          }}
        />
      </SettingsSection>

      <SettingsSection title="Privacy & Security">
        <SettingsRow
          icon="shield-checkmark"
          title="Privacy"
          subtitle="Profile visibility and data sharing"
          onPress={() => {
            logger.press('PrivacySettings');
            router.push(Routes.SETTINGS_PRIVACY);
          }}
        />
        <SettingsRow
          icon="lock-closed"
          title="Security"
          subtitle="Password and account protection"
          onPress={() => {
            logger.press('Security');
            uiFeedback.showToast('Security settings coming in Sprint 2');
          }}
        />
      </SettingsSection>

      {isCoach && (
        <SettingsSection title="Earnings">
          <SettingsRow
            icon="wallet"
            title="Earnings Reconciler"
            subtitle="Track owed, paid, and written-off session payments"
            onPress={() => {
              logger.press('EarningsReconciler');
              router.push(Routes.EARNINGS);
            }}
          />
        </SettingsSection>
      )}

      <SettingsSection title="Support">
        <SettingsRow
          icon="help-circle"
          title="Help & Support"
          subtitle="FAQ, contact us, report a problem"
          onPress={() => {
            logger.press('HelpSupport');
            router.push(Routes.SETTINGS_HELP);
          }}
        />
        <SettingsRow
          icon="document-text"
          title="Terms of Service"
          onPress={() => {
            logger.press('TermsOfService');
            router.push(Routes.SETTINGS_TERMS);
          }}
        />
        <SettingsRow
          icon="lock-closed"
          title="Privacy Policy"
          onPress={() => {
            logger.press('PrivacyPolicy');
            router.push(Routes.SETTINGS_PRIVACY_POLICY);
          }}
        />
        <SettingsRow
          icon="information-circle"
          title="About"
          subtitle="Version information"
          onPress={() => {
            logger.press('About');
            uiFeedback.showToast('Version 1.0.0\n\nBuilt with care for athletes, coaches, and parents.');
          }}
        />
      </SettingsSection>

      <SettingsSection>
        <SettingsRow
          icon="log-out"
          title="Sign Out"
          onPress={handleLogout}
          showChevron={false}
          destructive
        />
      </SettingsSection>

      <View style={styles.versionContainer}>
        <ThemedText style={[styles.versionText, { color: colors.muted }]}>Clubroom v1.0.0</ThemedText>
        <ThemedText style={[styles.versionText, { color: colors.muted }]}>
          {currentUser?.role ?? 'GUEST'} account
        </ThemedText>
      </View>
    </SettingsFormScreen>
  );
}

const styles = StyleSheet.create({
  profileCard: { marginBottom: Spacing.xs },
  profilePhoto: {
    width: Components.avatar.lg,
    height: Components.avatar.lg,
    borderRadius: Components.avatar.lg / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: { flex: 1, gap: Spacing.micro },
  profileName: { ...Typography.heading },
  profileEmail: { ...Typography.bodySmall },
  versionContainer: { alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.md },
  versionText: { ...Typography.small },
});
