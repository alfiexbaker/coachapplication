import { Platform } from 'react-native';

// Uber-inspired minimal palette + Football identity
const brandPrimary = '#000000'; // Primary Black
const softBlack = '#1A1A1A'; // Soft Black
const offWhite = '#F5F5F5'; // Off-White Background

// Accent Colours - Use SPARINGLY (max 1 per screen)
const warmCoral = '#FF6A6A'; // Brand Accent (Airbnb-inspired)
const mintGreen = '#4CE1A0'; // Success
const neonGreen = '#A1FF4B'; // Football Identity

export const Colors = {
  light: {
    text: '#000000', // Primary Black - strong hierarchy
    foreground: '#000000', // Primary text/icon color
    muted: '#6B7280', // Dark grey for secondary text
    background: '#F5F5F5', // Off-white for screen backgrounds
    surface: '#FFFFFF', // Pure white for cards/surfaces
    card: '#FFFFFF',
    border: '#E5E5E5', // Subtle borders
    tint: brandPrimary,
    tintPressed: softBlack,
    icon: '#6B7280',
    success: mintGreen, // Mint Green
    warning: '#F59E0B',
    error: warmCoral, // Warm Coral for errors
    secondary: neonGreen, // Football Identity
    accent: warmCoral, // Primary accent - USE SPARINGLY
    tabIconDefault: '#9CA3AF',
    tabIconSelected: brandPrimary,
    overlay: 'rgba(0, 0, 0, 0.12)', // Warm subtle overlay
    premium: warmCoral,
    surfaceSecondary: offWhite, // Off-white for sections
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

// Typography system - clean hierarchy
export const Typography = {
  caption: { fontSize: 13, lineHeight: 18, letterSpacing: 0 },      // Captions, small labels
  body: { fontSize: 16, lineHeight: 24, letterSpacing: -0.1 },      // Body text (1.5 line height)
  heading: { fontSize: 22, lineHeight: 30, letterSpacing: -0.3 },   // Section headers
  display: { fontSize: 32, lineHeight: 44, letterSpacing: -0.5 },   // Display titles
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
