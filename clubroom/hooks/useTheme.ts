/**
 * useTheme Hook
 *
 * Returns the current color palette based on the active color scheme.
 * All UI primitives should use this hook instead of hardcoding `Colors.light`.
 *
 * When dark-mode colors are defined in `constants/theme.ts`, every component
 * using this hook will automatically respond to the system color scheme.
 *
 * Usage:
 *   const { colors, scheme, isDark } = useTheme();
 */

import { Colors, type ThemeName } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme: ThemeName = useColorScheme() ?? 'dark';
  return {
    colors: Colors[scheme],
    scheme,
    isDark: scheme === 'dark',
  } as const;
}

export type ThemeColors = typeof Colors.light | typeof Colors.dark;
