import { useEffect, useState, startTransition } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import {
  SettingsFormScreen,
  SettingsRow,
  SettingsSection,
  SettingsToggleRow,
} from '@/components/settings';
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
import { getUsableProfilePhotoUrl } from '@/utils/profile-photo';

const logger = createLogger('SettingsHub');

function getInitials(name: string | undefined) {
  if (!name) return 'U';
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  return initials || 'U';
}

export default function SettingsHubScreen() {
  const { colors } = useTheme();
  const { currentUser, isCoach, isParent, childCount, handleLogout } = useSettingsHub();
  const canManageChildren = Boolean(currentUser && isParent);
  const [allowBookSelf, setAllowBookSelf] = useState(false);
  const profilePhotoUrl = getUsableProfilePhotoUrl(currentUser?.avatar);
  const accountHasChildren = hasAccountChildren({
    contextChildCount: childCount,
    accountChildRefCount: currentUser?.children?.length ?? 0,
  });
  const canConfigureBookSelf = bookingSelfSettingService.isSupported() && accountHasChildren;

  useEffect(() => {
    if (!currentUser?.id || !accountHasChildren) {
      startTransition(() => {
        setAllowBookSelf(false);
      });
      return;
    }
    let cancelled = false;
    void bookingSelfSettingService
      .isEnabled(currentUser.id)
      .then((enabled) => {
        if (!cancelled) {
          setAllowBookSelf(enabled);
        }
      })
      .catch((error) => {
        logger.warn('Failed to load self-booking setting', { error });
        if (!cancelled) {
          setAllowBookSelf(false);
          uiFeedback.showToast('Could not load self-booking setting.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accountHasChildren, currentUser?.id]);

  const handleAllowBookSelfChange = async (nextValue: boolean) => {
    if (!currentUser?.id) return;
    const previousValue = allowBookSelf;
    setAllowBookSelf(nextValue);

    try {
      const success = await bookingSelfSettingService.setEnabled(currentUser.id, nextValue);
      if (success) {
        return;
      }
    } catch (error) {
      logger.warn('Failed to save self-booking setting', { error });
    }
    setAllowBookSelf(previousValue);
    uiFeedback.showToast('Could not save self-booking setting.');
  };

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
          {profilePhotoUrl ? (
            <Image source={{ uri: profilePhotoUrl }} style={styles.profilePhoto} />
          ) : (
            <View style={[styles.profilePhoto, { backgroundColor: colors.border }]}>
              <ThemedText style={[styles.profileInitials, { color: colors.muted }]}>
                {getInitials(currentUser?.fullName || currentUser?.name)}
              </ThemedText>
            </View>
          )}
          <View style={styles.profileInfo}>
            <ThemedText type="subtitle" style={styles.profileName}>
              {currentUser?.fullName || currentUser?.name || 'User'}
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Row>
        <ThemedText
          style={[styles.profileEmail, { color: colors.muted }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          accessibilityLabel={`Email ${currentUser?.email || 'not set'}`}
        >
          {currentUser?.email || 'Not set'}
        </ThemedText>
      </SurfaceCard>

      <SettingsSection title="Account">
        <SettingsRow
          icon="person"
          title="Account"
          subtitle="Email and password"
          onPress={() => {
            logger.press('AccountSettings');
            router.push(Routes.SETTINGS_ACCOUNT);
          }}
        />
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
            subtitle="Schedule and time slots"
            onPress={() => {
              logger.press('Availability');
              router.push(Routes.SCHEDULE_AVAILABILITY);
            }}
          />
        )}
        {canManageChildren && (
          <SettingsRow
            icon="people"
            title="Children"
            subtitle={accountHasChildren ? 'Manage child profiles' : 'Add a child profile'}
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
          subtitle="Push and email preferences"
          onPress={() => {
            logger.press('NotificationSettings');
            router.push(Routes.SETTINGS_NOTIFICATION_PREFERENCES);
          }}
        />
        <SettingsRow
          icon="calendar"
          title="Calendar Export"
          subtitle="Export sessions and events"
          onPress={() => {
            logger.press('CalendarExport');
            router.push(Routes.SETTINGS_CALENDAR_SYNC);
          }}
        />
        {canConfigureBookSelf && (
          <SettingsToggleRow
            icon="person"
            title="Book for yourself"
            subtitle="Choose yourself when booking"
            value={allowBookSelf}
            onValueChange={handleAllowBookSelfChange}
          />
        )}
        <SettingsRow icon="language" title="Language" value="English (UK)" showChevron={false} />
      </SettingsSection>

      <SettingsSection title="Privacy & Security">
        <SettingsRow
          icon="shield-checkmark"
          title="Privacy"
          subtitle="Profile and data sharing"
          onPress={() => {
            logger.press('PrivacySettings');
            router.push(Routes.SETTINGS_PRIVACY);
          }}
        />
        <SettingsRow
          icon="lock-closed"
          title="Security"
          subtitle="Password and account access"
          onPress={() => {
            logger.press('Security');
            router.push(Routes.SETTINGS_ACCOUNT);
          }}
        />
      </SettingsSection>

      {isCoach && (
        <SettingsSection title="Earnings">
          <SettingsRow
            icon="wallet"
            title="Payments"
            subtitle="Outstanding and paid sessions"
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
          subtitle="FAQs and contact"
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
          subtitle="Current build information"
          value="v1.0.0"
          showChevron={false}
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
        <ThemedText style={[styles.versionText, { color: colors.muted }]}>
          Clubroom v1.0.0
        </ThemedText>
      </View>
    </SettingsFormScreen>
  );
}

const styles = StyleSheet.create({
  profileCard: { marginBottom: Spacing.xs, gap: Spacing.xs },
  profilePhoto: {
    width: Components.avatar.md,
    height: Components.avatar.md,
    borderRadius: Components.avatar.md / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: { flex: 1, minWidth: 0, gap: Spacing.micro },
  profileName: { ...Typography.heading },
  profileEmail: { ...Typography.small },
  profileInitials: { ...Typography.heading },
  versionContainer: { alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.md },
  versionText: { ...Typography.small },
});
