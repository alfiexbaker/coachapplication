import { useThemePreferences } from './theme-provider';

export function useColorScheme() {
  const { colorScheme } = useThemePreferences();
  return colorScheme;
}
