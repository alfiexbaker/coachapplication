import { useEffect, useState, startTransition } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { useThemePreferences } from './theme-provider';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const systemScheme = useRNColorScheme();
  const { colorScheme } = useThemePreferences();

  useEffect(() => {
    startTransition(() => {
      setHasHydrated(true);
    });
  }, []);

  if (hasHydrated) {
    return colorScheme;
  }

  return systemScheme ?? 'dark';
}
