import { Platform } from 'react-native';

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
    secondary: success,
    accent,
    tabIconDefault: '#9CA3AF',
    tabIconSelected: accent,
    overlay: 'rgba(15, 23, 42, 0.08)',
    premium: accent,
    surfaceSecondary: canvas,
  },
  dark: {
    // Keep dark mode aligned with the minimalist light palette
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
    secondary: success,
    accent,
    tabIconDefault: '#9CA3AF',
    tabIconSelected: accent,
    overlay: 'rgba(15, 23, 42, 0.08)',
    premium: accent,
    surfaceSecondary: canvas,
  },
} as const;

export type ThemeName = keyof typeof Colors;

// Uber-discipline spacing system: 8/16/24/32 rhythm
const baseSpacing = 8;

export const Spacing = {
  xs: 8,   // Micro spacing between text and small UI elements
  sm: 16,  // Inside cards, buttons, list items
  md: 24,  // Between components
  lg: 32,  // Major sections, top of screen, hero blocks
  xl: 40,  // Extra large spacing
  '2xl': 48, // Massive spacing
  '3xl': 64, // Hero sections
} as const;

// Border radius system - Uber minimalism
export const Radii = {
  button: 16, // All buttons: 16px
  card: 16,   // All cards: 16px
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

// Typography system - refined, light, modern
// Inspired by premium apps: lighter weights, generous spacing, smooth hierarchy
export const Typography = {
  // Semantic type scale - lighter weights for elegance
  display: { fontSize: 30, lineHeight: 40, letterSpacing: -0.4, fontWeight: '600' as const },   // H1 - Page titles
  title: { fontSize: 22, lineHeight: 30, letterSpacing: -0.3, fontWeight: '600' as const },     // H2 - Section titles
  heading: { fontSize: 18, lineHeight: 26, letterSpacing: -0.2, fontWeight: '600' as const },   // H3 - Card headers
  subheading: { fontSize: 16, lineHeight: 24, letterSpacing: -0.1, fontWeight: '500' as const }, // H4 - Sub-sections
  body: { fontSize: 15, lineHeight: 22, letterSpacing: -0.05, fontWeight: '400' as const },      // Body text - 150% line height
  bodySemiBold: { fontSize: 15, lineHeight: 22, letterSpacing: -0.05, fontWeight: '600' as const }, // Medium, not semi-bold
  small: { fontSize: 13, lineHeight: 20, letterSpacing: 0, fontWeight: '400' as const },        // Small text
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
    padding: Spacing.md,  // Reduced from lg - tighter
    gap: Spacing.sm,      // Reduced from md - more compact
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
} as const;
