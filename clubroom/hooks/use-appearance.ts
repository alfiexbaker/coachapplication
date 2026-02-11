/**
 * Hook for the Appearance Settings screen.
 * Manages theme selection and accessibility preferences.
 */

import { useState, useCallback } from 'react';
import { useThemePreferences } from '@/hooks/theme-provider';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AppearanceSettings');

export type ThemeOption = 'light' | 'dark' | 'system';

export function useAppearance() {
  const { colorScheme, setColorScheme } = useThemePreferences();

  const [selectedTheme, setSelectedTheme] = useState<ThemeOption>(
    colorScheme === 'dark' ? 'dark' : 'light',
  );
  const [reducedMotion, setReducedMotion] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  const handleThemeSelect = useCallback(
    (theme: ThemeOption) => {
      logger.press('ThemeSelect', { theme });
      setSelectedTheme(theme);
      if (theme === 'dark') setColorScheme('dark');
      else setColorScheme('light');
    },
    [setColorScheme],
  );

  const handleReducedMotion = useCallback((v: boolean) => {
    logger.debug('Toggle reducedMotion', { newValue: v });
    setReducedMotion(v);
  }, []);

  const handleLargeText = useCallback((v: boolean) => {
    logger.debug('Toggle largeText', { newValue: v });
    setLargeText(v);
  }, []);

  const handleHighContrast = useCallback((v: boolean) => {
    logger.debug('Toggle highContrast', { newValue: v });
    setHighContrast(v);
  }, []);

  const handleAppIconPress = useCallback(() => {
    logger.press('AppIcon');
  }, []);

  return {
    selectedTheme,
    reducedMotion,
    largeText,
    highContrast,
    handleThemeSelect,
    handleReducedMotion,
    handleLargeText,
    handleHighContrast,
    handleAppIconPress,
  };
}
