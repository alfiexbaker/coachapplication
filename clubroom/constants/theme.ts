import { Platform } from 'react-native';

// Premium dark palette inspired by modern fintech/lifestyle apps
// Off-black backgrounds with purple-tinted surfaces for depth
const offBlack = '#0E0E10'; // Main background
const darkSurface = '#17171B'; // Elevated surface layer
const cardSurface = '#1F2025'; // Card/interactive layer

// Brand colors - restrained, sophisticated accent palette
const primaryBlue = '#5C7CFA'; // Primary CTA - vibrant but not harsh
const successGreen = '#2BD17E'; // Positive trends/actions
const warningOrange = '#FFB545'; // Warnings/notifications
const errorPink = '#FF5C8A'; // Errors/destructive actions

// Text hierarchy - high contrast with subtle warmth
const primaryText = '#F6F7FB'; // Almost white, slightly warm
const secondaryText = '#AEB3C7'; // Muted purple-gray for secondary info

// Border with transparency for layering
const subtleBorder = 'rgba(255, 255, 255, 0.06)'; // Barely visible separation
const mediumBorder = 'rgba(255, 255, 255, 0.1)'; // Visible but soft

export const Colors = {
  light: {
    text: '#0E0E10', // Dark text for light mode
    foreground: '#0E0E10',
    muted: '#6B7280',
    background: '#F6F7FB', // Light background
    surface: '#FFFFFF',
    card: '#FFFFFF',
    border: '#E5E7EB',
    tint: primaryBlue,
    tintPressed: '#4C6AE8',
    icon: '#6B7280',
    success: successGreen,
    warning: warningOrange,
    error: errorPink,
    secondary: successGreen,
    accent: primaryBlue,
    tabIconDefault: '#9CA3AF',
    tabIconSelected: primaryBlue,
    overlay: 'rgba(0, 0, 0, 0.12)',
    premium: primaryBlue,
    surfaceSecondary: '#F6F7FB',
  },
  dark: {
    text: primaryText, // #F6F7FB - high contrast, slightly warm
    foreground: primaryText,
    muted: secondaryText, // #AEB3C7 - muted purple-gray
    background: offBlack, // #0E0E10 - deepest layer
    surface: darkSurface, // #17171B - elevated section backgrounds
    card: cardSurface, // #1F2025 - interactive cards/components
    border: subtleBorder, // rgba(255,255,255,0.06) - subtle separation
    borderMedium: mediumBorder, // rgba(255,255,255,0.1) - more visible
    tint: primaryBlue, // #5C7CFA - primary actions
    tintPressed: '#4C6AE8', // Slightly darker on press
    icon: secondaryText,
    success: successGreen, // #2BD17E - positive states
    warning: warningOrange, // #FFB545 - warning states
    error: errorPink, // #FF5C8A - error/destructive
    secondary: successGreen,
    accent: primaryBlue,
    tabIconDefault: secondaryText,
    tabIconSelected: primaryBlue,
    overlay: 'rgba(0, 0, 0, 0.7)',
    premium: primaryBlue,
    surfaceSecondary: darkSurface,
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

// Typography system - 1.25 modular scale with generous line-height
// Using tabular numbers for stats and consistent letter-spacing
export const Typography = {
  // Semantic type scale
  display: { fontSize: 32, lineHeight: 44, letterSpacing: -0.8, fontWeight: '700' as const },   // H1 - Page titles
  title: { fontSize: 24, lineHeight: 32, letterSpacing: -0.5, fontWeight: '700' as const },     // H2 - Section titles
  heading: { fontSize: 20, lineHeight: 28, letterSpacing: -0.4, fontWeight: '600' as const },   // H3 - Card headers
  subheading: { fontSize: 18, lineHeight: 26, letterSpacing: -0.3, fontWeight: '600' as const }, // H4 - Sub-sections
  body: { fontSize: 16, lineHeight: 24, letterSpacing: -0.1, fontWeight: '400' as const },      // Body text - 150% line height
  bodySemiBold: { fontSize: 16, lineHeight: 24, letterSpacing: -0.1, fontWeight: '600' as const },
  small: { fontSize: 14, lineHeight: 20, letterSpacing: 0, fontWeight: '400' as const },        // Small text
  caption: { fontSize: 13, lineHeight: 18, letterSpacing: 0, fontWeight: '400' as const },      // Captions, metadata
  micro: { fontSize: 11, lineHeight: 16, letterSpacing: 0.4, fontWeight: '600' as const, textTransform: 'uppercase' as const }, // Pills, tags

  // Legacy sizes for compatibility
  xs: { fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  sm: { fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  base: { fontSize: 16, lineHeight: 24, letterSpacing: -0.1 },
  lg: { fontSize: 18, lineHeight: 26, letterSpacing: -0.2 },
  xl: { fontSize: 22, lineHeight: 30, letterSpacing: -0.3 },
  '2xl': { fontSize: 28, lineHeight: 38, letterSpacing: -0.4 },
  '3xl': { fontSize: 32, lineHeight: 44, letterSpacing: -0.5 },
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

// Elevation system with soft shadows for depth hierarchy
export const Shadows = {
  light: {
    card: {
      shadowColor: '#000000',
      shadowOpacity: 0.04,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    cardHover: {
      shadowColor: '#000000',
      shadowOpacity: 0.08,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    subtle: {
      shadowColor: '#000000',
      shadowOpacity: 0.02,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
  },
  dark: {
    // Soft, diffused shadows for dark surfaces - creates depth without harshness
    card: {
      shadowColor: '#000000',
      shadowOpacity: 0.3,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    cardHover: {
      shadowColor: '#000000',
      shadowOpacity: 0.5,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    subtle: {
      shadowColor: '#000000',
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
  },
} as const;

// Component-specific design tokens
export const Components = {
  button: {
    height: 52,
    borderRadius: Radii.card,
    minWidth: 120,
  },
  buttonCompact: {
    height: 40,
    borderRadius: Radii.md,
    minWidth: 80,
  },
  card: {
    borderRadius: Radii.card,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  input: {
    height: 52,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
  },
  pill: {
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
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
