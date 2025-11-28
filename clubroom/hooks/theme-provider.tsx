import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName, useColorScheme as useRNColorScheme } from 'react-native';

export type ThemeContextValue = {
  colorScheme: NonNullable<ColorSchemeName>;
  systemScheme: NonNullable<ColorSchemeName>;
  toggleColorScheme: () => void;
  setColorScheme: (scheme: NonNullable<ColorSchemeName>) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorScheme, setColorScheme] = useState<NonNullable<ColorSchemeName>>('light');
  const systemScheme: NonNullable<ColorSchemeName> = 'light';

  const value = useMemo(
    () => ({
      colorScheme,
      systemScheme,
      toggleColorScheme: () => setColorScheme('light'),
      setColorScheme: (scheme: NonNullable<ColorSchemeName>) => setColorScheme(scheme === 'dark' ? 'light' : scheme),
    }),
    [colorScheme, systemScheme]
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
