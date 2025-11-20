import { Platform } from 'react-native';

// Premium Uber x Whoop inspired palette
const brandPrimary = '#000000';
const brandAccent = '#00D9A3'; // Premium teal/green
const brandAccentDark = '#00B589';

export const Colors = {
  light: {
    text: '#0A0A0A',
    foreground: '#0A0A0A', // Primary text/icon color (same as text for consistency)
    muted: '#6B7280',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    border: '#EFEFEF',
    tint: brandPrimary,
    tintPressed: '#1F2937',
    icon: '#9CA3AF',
    success: '#00D9A3',
    warning: '#F59E0B',
    error: '#EF4444',
    secondary: brandAccent,
    tabIconDefault: '#9CA3AF',
    tabIconSelected: brandPrimary,
    overlay: 'rgba(0, 0, 0, 0.5)',
    premium: brandAccent,
    surfaceSecondary: '#F5F5F5',
  },
  dark: {
    text: '#FFFFFF',
    foreground: '#FFFFFF', // Primary text/icon color (same as text for consistency)
    muted: '#9CA3AF',
    background: '#0A0A0A',
    surface: '#1A1A1A',
    card: '#1F1F1F',
    border: '#2A2A2A',
    tint: '#FFFFFF',
    tintPressed: '#E5E7EB',
    icon: '#6B7280',
    success: '#00D9A3',
    warning: '#F59E0B',
    error: '#EF4444',
    secondary: brandAccent,
    tabIconDefault: '#6B7280',
    tabIconSelected: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.7)',
    premium: brandAccent,
    surfaceSecondary: '#141414',
  },
} as const;

export type ThemeName = keyof typeof Colors;

const baseSpacing = 4;

export const Spacing = {
  xs: baseSpacing,
  sm: baseSpacing * 2,
  md: baseSpacing * 4,
  lg: baseSpacing * 5,
  xl: baseSpacing * 6,
  '2xl': baseSpacing * 8,
  '3xl': baseSpacing * 12,
} as const;

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const Typography = {
  xs: { fontSize: 11, lineHeight: 16, letterSpacing: 0.1 },
  sm: { fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  base: { fontSize: 15, lineHeight: 22, letterSpacing: -0.1 },
  lg: { fontSize: 17, lineHeight: 24, letterSpacing: -0.2 },
  xl: { fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  '2xl': { fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  '3xl': { fontSize: 34, lineHeight: 40, letterSpacing: -0.5 },
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'Inter',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const Shadows = {
  light: {
    card: {
      shadowColor: '#000000',
      shadowOpacity: 0.03,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    cardHover: {
      shadowColor: '#000000',
      shadowOpacity: 0.06,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    subtle: {
      shadowColor: '#000000',
      shadowOpacity: 0.015,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 1 },
      elevation: 0,
    },
  },
  dark: {
    card: {
      shadowColor: '#000000',
      shadowOpacity: 0.5,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    cardHover: {
      shadowColor: '#000000',
      shadowOpacity: 0.7,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    subtle: {
      shadowColor: '#000000',
      shadowOpacity: 0.3,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 1 },
      elevation: 0,
    },
  },
} as const;
