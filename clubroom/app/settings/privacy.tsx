import { View } from 'react-native';
import { router } from 'expo-router';

import { SettingsFormScreen, SettingsRow, SettingsToggleRow, SettingsSection } from '@/components/settings';
import { LoadingState, SubmitProgressState } from '@/components/ui/screen-states';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/useTheme';
import { createLogger } from '@/utils/logger';
import { Routes } from '@/navigation/routes';
import { usePrivacySettings } from '@/hooks/use-privacy-settings';
import { buildMailtoUrl, openExternalUrl } from '@/utils/external-url';

const logger = createLogger('PrivacySettings');
const SUPPORT_EMAIL = 'support@clubroom.app';

export default function PrivacySettingsScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();
  const {
    settings,
    blockedUsersCount,
    isCoach,
    loading,
    error,
    savingKey,
    toggle,
  } = usePrivacySettings();

  if (loading || !settings) {
    return (
      <SettingsFormScreen title="Privacy">
        <LoadingState variant="form" />
      </SettingsFormScreen>
    );
  }

  const handleToggle = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
    logger.debug(`Toggle ${String(key)}`, { newValue: value });
    void toggle(key, value);
  };

  return (
    <SettingsFormScreen
      title="Privacy"
      infoText={error ?? 'Privacy settings are saved to your account and applied across profile and discovery surfaces.'}
    >
      <SettingsSection title="Profile Visibility">
        <SettingsToggleRow
          icon="eye"
          title="Public Profile"
          subtitle="Allow others to find and view your profile"
          value={settings.profileVisible}
          disabled={savingKey === 'profileVisible'}
          onValueChange={(value) => handleToggle('profileVisible', value)}
        />
        <SettingsToggleRow
          icon="location"
          title="Show Location"
          subtitle="Display your city and distance to others"
          value={settings.showLocation}
          disabled={savingKey === 'showLocation'}
          onValueChange={(value) => handleToggle('showLocation', value)}
        />
        <SettingsToggleRow
          icon="ellipse"
          iconColor={palette.success}
          title="Online Status"
          subtitle="Show when you're active in the app"
          value={settings.showOnlineStatus}
          disabled={savingKey === 'showOnlineStatus'}
          onValueChange={(value) => handleToggle('showOnlineStatus', value)}
        />
        <SettingsToggleRow
          icon="pulse"
          title="Activity Status"
          subtitle="Show recent activity on your profile"
          value={settings.showActivityStatus}
          disabled={savingKey === 'showActivityStatus'}
          onValueChange={(value) => handleToggle('showActivityStatus', value)}
        />
      </SettingsSection>

      {isCoach ? (
        <SettingsSection title="Coach Profile">
          <SettingsToggleRow
            icon="wallet"
            title="Show Earnings"
            subtitle="Display your earnings publicly"
            value={settings.showEarnings}
            disabled={savingKey === 'showEarnings'}
            onValueChange={(value) => handleToggle('showEarnings', value)}
          />
          <SettingsToggleRow
            icon="people"
            title="Show Client Count"
            subtitle="Display number of clients you've coached"
            value={settings.showClientList}
            disabled={savingKey === 'showClientList'}
            onValueChange={(value) => handleToggle('showClientList', value)}
          />
        </SettingsSection>
      ) : null}

      <SettingsSection title="Data & Analytics">
        <SettingsToggleRow
          icon="analytics"
          title="Share Analytics"
          subtitle="Help improve the app with usage data"
          value={settings.shareAnalytics}
          disabled={savingKey === 'shareAnalytics'}
          onValueChange={(value) => handleToggle('shareAnalytics', value)}
        />
        <SettingsToggleRow
          icon="megaphone"
          title="Personalized Ads"
          subtitle="Allow personalized advertising"
          value={settings.personalizedAds}
          disabled={savingKey === 'personalizedAds'}
          onValueChange={(value) => handleToggle('personalizedAds', value)}
        />
        <SettingsToggleRow
          icon="share-social"
          title="Share with Partners"
          subtitle="Share data with trusted partners"
          value={settings.shareWithPartners}
          disabled={savingKey === 'shareWithPartners'}
          onValueChange={(value) => handleToggle('shareWithPartners', value)}
        />
      </SettingsSection>

      <SettingsSection title="Your Data">
        <SettingsRow
          icon="download"
          title="Request Data Export"
          subtitle="Support handles exports by email in this build"
          onPress={() => {
            logger.press('DownloadData');
            void openExternalUrl(
              buildMailtoUrl(SUPPORT_EMAIL, {
                subject: 'Clubroom data export request',
                body: [
                  'I would like a copy of my Clubroom account data.',
                  '',
                  `Account: ${currentUser?.id ?? 'unknown'}`,
                  `Email on file: ${currentUser?.email ?? 'not set'}`,
                ].join('\n'),
              }),
              'Could not open your email app right now.',
            );
          }}
        />
        <SettingsRow
          icon="ban"
          title="Blocked Users"
          subtitle="Manage users you've blocked"
          value={blockedUsersCount > 0 ? String(blockedUsersCount) : 'None'}
          onPress={() => {
            logger.press('ManageBlockedUsers');
            router.push(Routes.SETTINGS_BLOCKED_USERS);
          }}
        />
      </SettingsSection>

      <SettingsSection title="Legal">
        <SettingsRow
          icon="document-text"
          title="Privacy Policy"
          onPress={() => router.push(Routes.SETTINGS_PRIVACY_POLICY)}
        />
        <SettingsRow
          icon="document"
          title="Terms of Service"
          onPress={() => router.push(Routes.SETTINGS_TERMS)}
        />
        <SettingsRow
          icon="shield"
          title="Cookie & Tracking"
          subtitle="Covered in the privacy policy for this build"
          onPress={() => router.push(Routes.SETTINGS_PRIVACY_POLICY)}
        />
      </SettingsSection>

      {savingKey ? (
        <View>
          <SubmitProgressState label="Saving privacy setting..." />
        </View>
      ) : null}
    </SettingsFormScreen>
  );
}
