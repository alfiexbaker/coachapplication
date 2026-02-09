import React, { memo, useState, useCallback } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { SectionHeader } from '@/components/primitives/section-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Column } from '@/components/primitives/column';
import { SettingsRow, SettingsToggleRow } from '@/components/settings/settings-row';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SettingsPrivacySection');

interface SettingsPrivacySectionProps {
  role: string | undefined;
}

export const SettingsPrivacySection = memo(function SettingsPrivacySection({
  role,
}: SettingsPrivacySectionProps) {
  const [profileVisibility, setProfileVisibility] = useState(true);
  const [showLocation, setShowLocation] = useState(true);

  const handleVisibilityChange = useCallback((value: boolean) => setProfileVisibility(value), []);
  const handleLocationChange = useCallback((value: boolean) => setShowLocation(value), []);

  const handleSocialProfile = useCallback(() => {
    logger.press('SocialProfile');
    router.push(Routes.FEED);
  }, []);

  return (
    <Column gap="sm">
      <SectionHeader title={role === 'USER' ? 'Privacy' : 'Social & privacy'} />
      <SurfaceCard style={{ padding: 0, gap: 0 }}>
        {role !== 'USER' && (
          <SettingsRow
            icon="people"
            title="Social profile"
            subtitle="Manage your social presence and posts"
            onPress={handleSocialProfile}
          />
        )}
        <SettingsToggleRow
          icon="eye"
          title="Profile visibility"
          subtitle="Allow others to find your profile"
          value={profileVisibility}
          onValueChange={handleVisibilityChange}
        />
        <SettingsToggleRow
          icon="location"
          title="Show location"
          subtitle="Display your city and distance"
          value={showLocation}
          onValueChange={handleLocationChange}
        />
      </SurfaceCard>
    </Column>
  );
});
