import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, useColorScheme, type ColorSchemeName } from 'react-native';

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
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return rnScheme ?? 'light';
  });

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setWebScheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (Platform.OS === 'web') {
    return webScheme;
  }
  return rnScheme ?? 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemScheme();
  const [override, setOverride] = useState<NonNullable<ColorSchemeName> | null>(null);
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
