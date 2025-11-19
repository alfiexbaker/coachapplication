import { Platform } from 'react-native';

const brandPrimary = '#1D4ED8';
const brandPrimaryDark = '#153EAE';
const brandSecondary = '#F97316';

export const Colors = {
  light: {
    text: '#0F172A',
    muted: '#475569',
    background: '#FFFFFF',
    surface: '#F4F6FB',
    card: '#FFFFFF',
    border: '#E2E8F0',
    tint: brandPrimary,
    tintPressed: brandPrimaryDark,
    icon: '#64748B',
    success: '#10B981',
    warning: '#FACC15',
    error: '#EF4444',
    secondary: brandSecondary,
    tabIconDefault: '#94A3B8',
    tabIconSelected: brandPrimary,
  },
  dark: {
    text: '#E2E8F0',
    muted: '#94A3B8',
    background: '#06080F',
    surface: '#111828',
    card: '#111828',
    border: '#1F2937',
    tint: '#7EA6FF',
    tintPressed: '#5479CA',
    icon: '#9BA1A6',
    success: '#34D399',
    warning: '#FDE047',
    error: '#F87171',
    secondary: '#FB923C',
    tabIconDefault: '#64748B',
    tabIconSelected: '#7EA6FF',
  },
} as const;

export type ThemeName = keyof typeof Colors;

const baseSpacing = 4;

export const Spacing = {
  xs: baseSpacing,
  sm: baseSpacing * 2,
  md: baseSpacing * 3,
  lg: baseSpacing * 4,
  xl: baseSpacing * 6,
  '2xl': baseSpacing * 8,
  '3xl': baseSpacing * 10,
} as const;

export const Radii = {
  sm: 8,
  md: 10,
  lg: 12,
  pill: 999,
} as const;

export const Typography = {
  xs: { fontSize: 12, lineHeight: 16 },
  sm: { fontSize: 14, lineHeight: 20 },
  base: { fontSize: 16, lineHeight: 24 },
  lg: { fontSize: 18, lineHeight: 26 },
  xl: { fontSize: 20, lineHeight: 26 },
  '2xl': { fontSize: 24, lineHeight: 30 },
  '3xl': { fontSize: 30, lineHeight: 36 },
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
      shadowColor: '#0F172A',
      shadowOpacity: 0.025,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
  },
  dark: {
    card: {
      shadowColor: '#000000',
      shadowOpacity: 0.25,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
  },
} as const;
