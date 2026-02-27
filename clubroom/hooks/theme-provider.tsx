import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, useColorScheme, type ColorSchemeName } from 'react-native';

// Web API types for cross-platform theme detection
declare const window: {
  matchMedia(query: string): {
    matches: boolean;
    addEventListener(type: string, listener: (e: { matches: boolean }) => void): void;
    removeEventListener(type: string, listener: (e: { matches: boolean }) => void): void;
  };
} | undefined;

export type ThemeContextValue = {
  colorScheme: NonNullable<ColorSchemeName>;
  systemScheme: NonNullable<ColorSchemeName>;
  toggleColorScheme: () => void;
  setColorScheme: (scheme: NonNullable<ColorSchemeName>) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function useSystemScheme(): NonNullable<ColorSchemeName> {
  const rnScheme = useColorScheme();

  // On web, also listen to prefers-color-scheme media query
  const [webScheme, setWebScheme] = useState<NonNullable<ColorSchemeName>>(() => {
    if (Platform.OS === 'web' && window) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return rnScheme ?? 'dark';
  });

  useEffect(() => {
    if (Platform.OS !== 'web' || !window) {
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: { matches: boolean }) => {
      setWebScheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (Platform.OS === 'web') {
    return webScheme;
  }
  return rnScheme ?? 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemScheme();
  // Product default: start in dark mode unless the user explicitly switches.
  const [override, setOverride] = useState<NonNullable<ColorSchemeName> | null>('dark');
  const colorScheme = override ?? systemScheme;

  const value = useMemo(
    () => ({
      colorScheme,
      systemScheme,
      toggleColorScheme: () =>
        setOverride((prev) => {
          const current = prev ?? systemScheme;
          return current === 'dark' ? 'light' : 'dark';
        }),
      setColorScheme: (scheme: NonNullable<ColorSchemeName>) => setOverride(scheme),
    }),
    [colorScheme, systemScheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreferences() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemePreferences must be used within a ThemeProvider');
  }
  return context;
}
