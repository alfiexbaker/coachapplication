import React, { memo, useCallback } from 'react';
import { Alert } from 'react-native';

import { SectionHeader } from '@/components/primitives/section-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Column } from '@/components/primitives/column';
import { SettingsRow } from '@/components/settings/settings-row';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SettingsSupportSection');

export const SettingsSupportSection = memo(function SettingsSupportSection() {
  const handleHelp = useCallback(() => {
    logger.press('HelpSupport');
    Alert.alert('Support', 'Email: support@clubroom.app');
  }, []);

  const handleTerms = useCallback(() => {
    logger.press('Terms');
    Alert.alert('Terms', 'View our Terms of Service');
  }, []);

  const handlePrivacy = useCallback(() => {
    logger.press('Privacy');
    Alert.alert('Privacy', 'View our Privacy Policy');
  }, []);

  return (
    <Column gap="sm">
      <SectionHeader title="Support & legal" />
      <SurfaceCard style={{ padding: 0, gap: 0 }}>
        <SettingsRow
          icon="help-circle"
          title="Help & support"
          subtitle="Get help and contact us"
          onPress={handleHelp}
        />
        <SettingsRow icon="document-text" title="Terms of service" onPress={handleTerms} />
        <SettingsRow icon="lock-closed" title="Privacy policy" onPress={handlePrivacy} />
      </SurfaceCard>
    </Column>
  );
});
