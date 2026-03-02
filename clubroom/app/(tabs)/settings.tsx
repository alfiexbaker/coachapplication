import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SettingsTabRedirect');

export default function SettingsTabRedirect() {
  useEffect(() => {
    logger.warn('Redirecting /(tabs)/settings to /settings', {
      source: Routes.SETTINGS_TAB,
      target: Routes.SETTINGS_INDEX,
    });
  }, []);

  return <Redirect href={Routes.SETTINGS_INDEX} />;
}
