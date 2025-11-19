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
  xl: baseSpacing * 5,
  '2xl': baseSpacing * 6,
  '3xl': baseSpacing * 8,
} as const;

export const Radii = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const Typography = {
  xs: { fontSize: 11, lineHeight: 14 },
  sm: { fontSize: 13, lineHeight: 18 },
  base: { fontSize: 15, lineHeight: 20 },
  lg: { fontSize: 17, lineHeight: 22 },
  xl: { fontSize: 20, lineHeight: 24 },
  '2xl': { fontSize: 24, lineHeight: 28 },
  '3xl': { fontSize: 28, lineHeight: 32 },
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
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 2,
    },
  },
  dark: {
    card: {
      shadowColor: '#000000',
      shadowOpacity: 0.4,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 2,
    },
  },
} as const;
