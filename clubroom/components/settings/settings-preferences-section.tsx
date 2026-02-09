import React, { memo, useCallback } from 'react';
import { Alert } from 'react-native';

import { SectionHeader } from '@/components/primitives/section-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Column } from '@/components/primitives/column';
import { SettingsRow, SettingsToggleRow } from '@/components/settings/settings-row';
import { useThemePreferences } from '@/hooks/theme-provider';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SettingsPreferencesSection');

export const SettingsPreferencesSection = memo(function SettingsPreferencesSection() {
  const { colorScheme, setColorScheme } = useThemePreferences();

  const handleLanguage = useCallback(() => {
    logger.press('Language');
    Alert.alert('Language', 'Additional languages not available');
  }, []);

  const handleDarkModeChange = useCallback(
    (value: boolean) => setColorScheme(value ? 'dark' : 'light'),
    [setColorScheme],
  );

  return (
    <Column gap="sm">
      <SectionHeader title="Preferences" />
      <SurfaceCard style={{ padding: 0, gap: 0 }}>
        <SettingsRow
          icon="language"
          title="Language"
          subtitle="English (UK)"
          onPress={handleLanguage}
        />
        <SettingsToggleRow
          icon="moon"
          title="Dark mode"
          subtitle={colorScheme === 'dark' ? 'On' : 'Off'}
          value={colorScheme === 'dark'}
          onValueChange={handleDarkModeChange}
        />
      </SurfaceCard>
    </Column>
  );
});
