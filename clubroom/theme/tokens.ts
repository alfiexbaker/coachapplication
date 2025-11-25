export type ThemeMode = 'dark' | 'light';

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

const typography = {
  title: { fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.3 },
  section: { fontSize: 16, fontWeight: '600' as const, letterSpacing: -0.2 },
  body: { fontSize: 14, fontWeight: '400' as const, letterSpacing: -0.1 },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
} as const;

const palettes = {
  dark: {
    background: '#05070B',
    surface: '#0A0D14',
    card: '#0F141F',
    overlay: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.08)',
    borderMuted: 'rgba(255,255,255,0.06)',
    text: '#F6F8FB',
    muted: '#9BA3B4',
    primary: '#5C7CFA',
    secondary: '#22D3EE',
    success: '#2BD17E',
    warning: '#FFB545',
    danger: '#FF6B8A',
  },
  light: {
    background: '#F7F8FB',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    overlay: 'rgba(0,0,0,0.04)',
    border: 'rgba(0,0,0,0.08)',
    borderMuted: 'rgba(0,0,0,0.05)',
    text: '#0A0D14',
    muted: '#6B7280',
    primary: '#3B82F6',
    secondary: '#0EA5E9',
    success: '#16A34A',
    warning: '#F59E0B',
    danger: '#EF4444',
  },
} as const;

const shadows = {
  dark: {
    card: {
      shadowColor: '#000000',
      shadowOpacity: 0.45,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
    subtle: {
      shadowColor: '#000000',
      shadowOpacity: 0.25,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
  },
  light: {
    card: {
      shadowColor: '#000000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    subtle: {
      shadowColor: '#000000',
      shadowOpacity: 0.04,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
  },
} as const;

export const designTokens = {
  spacing,
  radius,
  typography,
  palettes,
  shadows,
};

export const getTheme = (mode: ThemeMode = 'light') => ({
  colors: palettes[mode],
  spacing,
  radius,
  typography,
  shadows: shadows[mode],
});
