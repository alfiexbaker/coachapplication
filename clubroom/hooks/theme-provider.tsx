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
  const systemScheme = useRNColorScheme() ?? 'light';
  const [colorScheme, setColorScheme] = useState<NonNullable<ColorSchemeName>>(systemScheme);

  useEffect(() => {
    const listener = ({ colorScheme: nextScheme }: Appearance.AppearancePreferences) => {
      setColorScheme((current) => (current === 'light' || current === 'dark' ? current : nextScheme ?? 'light'));
    };
    const subscription = Appearance.addChangeListener(listener);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (systemScheme && (colorScheme !== 'light' && colorScheme !== 'dark')) {
      setColorScheme(systemScheme);
    }
  }, [colorScheme, systemScheme]);

  const value = useMemo(
    () => ({
      colorScheme,
      systemScheme,
      toggleColorScheme: () => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark'),
      setColorScheme,
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
