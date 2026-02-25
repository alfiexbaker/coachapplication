import { Platform, StyleSheet } from 'react-native';

// Minimal light palette focused on clarity and whitespace
const ink = '#0F172A';
const mutedInk = '#475467';
const surface = '#FFFFFF';
const canvas = '#F7F8FB';

// Quiet accent colors
const accent = '#0F172A';
const success = '#1C8C5E';
const warning = '#C78000';
const error = '#C03E47';

// Border and divider colors
const subtleBorder = '#E5E7EB';
const mediumBorder = '#D1D5DB';

export const Colors = {
  light: {
    text: ink,
    foreground: ink,
    muted: mutedInk,
    background: canvas,
    surface,
    card: surface,
    border: subtleBorder,
    borderMedium: mediumBorder,
    tint: accent,
    tintPressed: '#0B1220',
    icon: '#111827',
    success,
    warning,
    error,
    rating: '#D4A017',
    secondary: success,
    accent,
    tabIconDefault: '#9CA3AF',
    tabIconSelected: accent,
    overlay: 'rgba(15, 23, 42, 0.08)',
    premium: accent,
    surfaceSecondary: canvas,
    // Additional semantic colors
    info: '#2563EB',
    destructive: error,
    // Text on colored backgrounds
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onSuccess: '#FFFFFF',
    onError: '#FFFFFF',
    onInfo: '#FFFFFF',
    onDestructive: '#FFFFFF',
  },
  dark: {
    text: '#E2E8F0',
    foreground: '#E2E8F0',
    muted: '#94A3B8',
    background: '#0F172A',
    surface: '#1E293B',
    card: '#1E293B',
    border: '#334155',
    borderMedium: '#475569',
    tint: '#E2E8F0',
    tintPressed: '#CBD5E1',
    icon: '#CBD5E1',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    rating: '#FBBF24',
    secondary: '#34D399',
    accent: '#E2E8F0',
    tabIconDefault: '#64748B',
    tabIconSelected: '#E2E8F0',
    overlay: 'rgba(0, 0, 0, 0.4)',
    premium: '#E2E8F0',
    surfaceSecondary: '#1E293B',
    info: '#60A5FA',
    destructive: '#F87171',
    onPrimary: '#0F172A',
    onSecondary: '#0F172A',
    onSuccess: '#0F172A',
    onError: '#0F172A',
    onInfo: '#0F172A',
    onDestructive: '#0F172A',
  },
} as const;

export type ThemeName = keyof typeof Colors;

// Uber-discipline spacing system: 8/16/24/32 rhythm

export const Spacing = {
  micro: 2, // Hairline gaps between tightly coupled elements
  xxs: 4,   // Tight internal gaps (icon-to-text, badge internals)
  xs: 8,    // Micro spacing between text and small UI elements
  sm: 16,   // Inside cards, buttons, list items
  md: 24,   // Between components
  lg: 32,   // Major sections, top of screen, hero blocks
  xl: 40,   // Extra large spacing
  '2xl': 48, // Massive spacing
  '3xl': 64, // Hero sections
} as const;

// Border radius system - Uber minimalism
export const Radii = {
  xs: 4,      // Tiny elements, inline badges
  button: 16, // All buttons: 16px
  card: 16,   // All cards: 16px
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  pill: 999,
  rounded: 999, // Alias for pill - circular elements
  full: 999,    // Alias for fully rounded elements
} as const;

// Border width tokens - standardized across all components
export const Borders = {
  width: {
    none: 0,
    hairline: StyleSheet.hairlineWidth,
    thin: 1,
    medium: 2,
    thick: 3,
  },
} as const;

// Typography system - refined, light, modern
// Inspired by premium apps: lighter weights, generous spacing, smooth hierarchy
export const Typography = {
  // Semantic type scale - lighter weights for elegance
  displayLarge: { fontSize: 34, lineHeight: 44, letterSpacing: -0.5, fontWeight: '700' as const },
  heroLarge: { fontSize: 32, lineHeight: 42, letterSpacing: -0.5, fontWeight: '700' as const },
  hero: { fontSize: 28, lineHeight: 38, letterSpacing: -0.4, fontWeight: '600' as const },
  display: { fontSize: 30, lineHeight: 40, letterSpacing: -0.4, fontWeight: '600' as const },   // H1 - Page titles
  title: { fontSize: 22, lineHeight: 30, letterSpacing: -0.3, fontWeight: '600' as const },     // H2 - Section titles
  heading: { fontSize: 18, lineHeight: 26, letterSpacing: -0.2, fontWeight: '600' as const },   // H3 - Card headers
  subheading: { fontSize: 16, lineHeight: 24, letterSpacing: -0.1, fontWeight: '500' as const }, // H4 - Sub-sections
  body: { fontSize: 15, lineHeight: 22, letterSpacing: -0.05, fontWeight: '400' as const },      // Body text - 150% line height
  bodySemiBold: { fontSize: 15, lineHeight: 22, letterSpacing: -0.05, fontWeight: '600' as const }, // Medium, not semi-bold
  bodySmall: { fontSize: 14, lineHeight: 20, letterSpacing: 0, fontWeight: '400' as const },    // Secondary body text
  bodySmallSemiBold: { fontSize: 14, lineHeight: 20, letterSpacing: 0, fontWeight: '600' as const }, // Secondary body text bold
  small: { fontSize: 13, lineHeight: 20, letterSpacing: 0, fontWeight: '400' as const },        // Small text
  smallSemiBold: { fontSize: 13, lineHeight: 20, letterSpacing: 0, fontWeight: '600' as const }, // Small text bold
  caption: { fontSize: 12, lineHeight: 18, letterSpacing: 0, fontWeight: '500' as const },      // Captions, metadata
  micro: { fontSize: 10, lineHeight: 16, letterSpacing: 0.6, fontWeight: '600' as const, textTransform: 'uppercase' as const },
// Pills, tags - lighter

  // Legacy sizes for compatibility
  xs: { fontSize: 12, lineHeight: 18, letterSpacing: 0 },
  sm: { fontSize: 13, lineHeight: 20, letterSpacing: 0 },
  base: { fontSize: 15, lineHeight: 22, letterSpacing: -0.05 },
  lg: { fontSize: 17, lineHeight: 24, letterSpacing: -0.1 },
  xl: { fontSize: 20, lineHeight: 28, letterSpacing: -0.2 },
  '2xl': { fontSize: 26, lineHeight: 36, letterSpacing: -0.3 },
  '3xl': { fontSize: 30, lineHeight: 40, letterSpacing: -0.4 },
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'Inter',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'Inter',
    serif: 'Georgia',
    rounded: 'Inter',
    mono: 'SFMono-Regular',
  },
  web: {
    sans: "'Inter', 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "'Charter', 'Times New Roman', serif",
    rounded: "'Inter', 'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Elevation system with soft shadows for depth hierarchy
export const Shadows = {
  light: {
    card: {
      shadowColor: '#111827',
      shadowOpacity: 0.1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    cardHover: {
      shadowColor: '#111827',
      shadowOpacity: 0.14,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
    },
    subtle: {
      shadowColor: '#111827',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
  },
  dark: {
    card: {
      shadowColor: '#111827',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    cardHover: {
      shadowColor: '#111827',
      shadowOpacity: 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    subtle: {
      shadowColor: '#111827',
      shadowOpacity: 0.04,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
  },
} as const;

// Color utility — use instead of hardcoded rgba() or hex+opacity hacks
export function withAlpha(hexColor: string, opacity: number): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// Component-specific design tokens - Uber-minimal sizing
export const Components = {
  button: {
    height: 44,  // Reduced from 52 - more minimal
    borderRadius: Radii.md,
    minWidth: 100,
  },
  buttonCompact: {
    height: 32,  // Reduced from 40 - sleeker
    borderRadius: Radii.sm,
    minWidth: 64,
  },
  card: {
    borderRadius: Radii.card,
    padding: Spacing.sm,  // Reduced from md - compact
    gap: Spacing.xs,      // Reduced from sm - tight
  },
  input: {
    height: 44,  // Reduced from 52
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
  },
  pill: {
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,  // Reduced from md
    paddingVertical: Spacing.xs / 2,
  },
  chip: {
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
  },
  icon: {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  },
  avatar: {
    sm: 32,   // List items, compact views
    md: 44,   // Standard avatar size
    lg: 64,   // Profile headers, featured
    xl: 80,   // Hero sections
  },
  listItem: {
    compact: 48,
    standard: 56,
    large: 72,
  },
  modal: {
    maxWidth: 400,
    borderRadius: 16,
    padding: 16,
  },
} as const;
