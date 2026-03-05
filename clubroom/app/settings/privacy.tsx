import { useState } from 'react';

import { router } from 'expo-router';

import { SettingsFormScreen, SettingsRow, SettingsToggleRow, SettingsSection } from '@/components/settings';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import { Routes } from '@/navigation/routes';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('PrivacySettings');

export default function PrivacySettingsScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  // Visibility settings
  const [profileVisible, setProfileVisible] = useState(true);
  const [showLocation, setShowLocation] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showActivityStatus, setShowActivityStatus] = useState(false);

  // Data sharing settings
  const [shareAnalytics, setShareAnalytics] = useState(true);
  const [personalizedAds, setPersonalizedAds] = useState(false);
  const [shareWithPartners, setShareWithPartners] = useState(false);

  // Coach-specific
  const [showEarnings, setShowEarnings] = useState(false);
  const [showClientList, setShowClientList] = useState(false);

  const isCoach = currentUser?.role === 'COACH';

  const handleToggle = (name: string, value: boolean, setter: (v: boolean) => void) => {
    logger.debug(`Toggle ${name}`, { newValue: value });
    setter(value);
  };

  const handleDownloadData = () => {
    logger.press('DownloadData');
    uiFeedback.alert(
      'Download Your Data',
      "We'll prepare a copy of your data and email it to you within 48 hours.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Download',
          onPress: () => {
            uiFeedback.alert('Request Sent', "You'll receive an email when your data is ready.");
          },
        },
      ],
    );
  };

  const handleManageBlockedUsers = () => {
    logger.press('ManageBlockedUsers');
    uiFeedback.alert('Blocked Users', "You haven't blocked any users yet.");
  };

  return (
    <SettingsFormScreen
      title="Privacy"
      infoText="Your privacy is important to us. We only collect data necessary to provide and improve our services."
    >
      {/* Profile Visibility */}
      <SettingsSection title="Profile Visibility">
        <SettingsToggleRow
          icon="eye"
          title="Public Profile"
          subtitle="Allow others to find and view your profile"
          value={profileVisible}
          onValueChange={(v) => handleToggle('profileVisible', v, setProfileVisible)}
        />
        <SettingsToggleRow
          icon="location"
          title="Show Location"
          subtitle="Display your city and distance to others"
          value={showLocation}
          onValueChange={(v) => handleToggle('showLocation', v, setShowLocation)}
        />
        <SettingsToggleRow
          icon="ellipse"
          iconColor={palette.success}
          title="Online Status"
          subtitle="Show when you're active in the app"
          value={showOnlineStatus}
          onValueChange={(v) => handleToggle('showOnlineStatus', v, setShowOnlineStatus)}
        />
        <SettingsToggleRow
          icon="pulse"
          title="Activity Status"
          subtitle="Show recent activity on your profile"
          value={showActivityStatus}
          onValueChange={(v) => handleToggle('showActivityStatus', v, setShowActivityStatus)}
        />
      </SettingsSection>

      {/* Coach-specific visibility */}
      {isCoach && (
        <SettingsSection title="Coach Profile">
          <SettingsToggleRow
            icon="wallet"
            title="Show Earnings"
            subtitle="Display your earnings publicly"
            value={showEarnings}
            onValueChange={(v) => handleToggle('showEarnings', v, setShowEarnings)}
          />
          <SettingsToggleRow
            icon="people"
            title="Show Client Count"
            subtitle="Display number of clients you've coached"
            value={showClientList}
            onValueChange={(v) => handleToggle('showClientList', v, setShowClientList)}
          />
        </SettingsSection>
      )}

      {/* Data & Analytics */}
      <SettingsSection title="Data & Analytics">
        <SettingsToggleRow
          icon="analytics"
          title="Share Analytics"
          subtitle="Help improve the app with usage data"
          value={shareAnalytics}
          onValueChange={(v) => handleToggle('shareAnalytics', v, setShareAnalytics)}
        />
        <SettingsToggleRow
          icon="megaphone"
          title="Personalized Ads"
          subtitle="Allow personalized advertising"
          value={personalizedAds}
          onValueChange={(v) => handleToggle('personalizedAds', v, setPersonalizedAds)}
        />
        <SettingsToggleRow
          icon="share-social"
          title="Share with Partners"
          subtitle="Share data with trusted partners"
          value={shareWithPartners}
          onValueChange={(v) => handleToggle('shareWithPartners', v, setShareWithPartners)}
        />
      </SettingsSection>

      {/* Your Data */}
      <SettingsSection title="Your Data">
        <SettingsRow
          icon="download"
          title="Download Your Data"
          subtitle="Get a copy of your information"
          onPress={handleDownloadData}
        />
        <SettingsRow
          icon="ban"
          title="Blocked Users"
          subtitle="Manage users you've blocked"
          onPress={handleManageBlockedUsers}
        />
      </SettingsSection>

      {/* Legal */}
      <SettingsSection title="Legal">
        <SettingsRow
          icon="document-text"
          title="Privacy Policy"
          onPress={() => {
            logger.press('PrivacyPolicy');
            router.push(Routes.SETTINGS_PRIVACY_POLICY);
          }}
        />
        <SettingsRow
          icon="document"
          title="Terms of Service"
          onPress={() => {
            logger.press('TermsOfService');
            router.push(Routes.SETTINGS_TERMS);
          }}
        />
        <SettingsRow
          icon="shield"
          title="Cookie Policy"
          onPress={() => {
            logger.press('CookiePolicy');
            uiFeedback.alert('Cookie Policy', 'View our cookie policy at clubroom.app/cookies');
          }}
        />
      </SettingsSection>
    </SettingsFormScreen>
  );
}
