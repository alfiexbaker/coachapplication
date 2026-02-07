"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Components = exports.Shadows = exports.Fonts = exports.Typography = exports.Borders = exports.Radii = exports.Spacing = exports.Colors = void 0;
exports.withAlpha = withAlpha;
const react_native_1 = require("react-native");
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
exports.Colors = {
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
};
// Uber-discipline spacing system: 8/16/24/32 rhythm
exports.Spacing = {
    micro: 2, // Hairline gaps between tightly coupled elements
    xxs: 4, // Tight internal gaps (icon-to-text, badge internals)
    xs: 8, // Micro spacing between text and small UI elements
    sm: 16, // Inside cards, buttons, list items
    md: 24, // Between components
    lg: 32, // Major sections, top of screen, hero blocks
    xl: 40, // Extra large spacing
    '2xl': 48, // Massive spacing
    '3xl': 64, // Hero sections
};
// Border radius system - Uber minimalism
exports.Radii = {
    xs: 4, // Tiny elements, inline badges
    button: 16, // All buttons: 16px
    card: 16, // All cards: 16px
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
    pill: 999,
    rounded: 999, // Alias for pill - circular elements
    full: 999, // Alias for fully rounded elements
};
// Border width tokens - standardized across all components
exports.Borders = {
    width: {
        none: 0,
        hairline: react_native_1.StyleSheet.hairlineWidth,
        thin: 1,
        medium: 2,
        thick: 3,
    },
};
// Typography system - refined, light, modern
// Inspired by premium apps: lighter weights, generous spacing, smooth hierarchy
exports.Typography = {
    // Semantic type scale - lighter weights for elegance
    display: { fontSize: 30, lineHeight: 40, letterSpacing: -0.4, fontWeight: '600' }, // H1 - Page titles
    title: { fontSize: 22, lineHeight: 30, letterSpacing: -0.3, fontWeight: '600' }, // H2 - Section titles
    heading: { fontSize: 18, lineHeight: 26, letterSpacing: -0.2, fontWeight: '600' }, // H3 - Card headers
    subheading: { fontSize: 16, lineHeight: 24, letterSpacing: -0.1, fontWeight: '500' }, // H4 - Sub-sections
    body: { fontSize: 15, lineHeight: 22, letterSpacing: -0.05, fontWeight: '400' }, // Body text - 150% line height
    bodySemiBold: { fontSize: 15, lineHeight: 22, letterSpacing: -0.05, fontWeight: '600' }, // Medium, not semi-bold
    bodySmall: { fontSize: 14, lineHeight: 20, letterSpacing: 0, fontWeight: '400' }, // Secondary body text
    bodySmallSemiBold: { fontSize: 14, lineHeight: 20, letterSpacing: 0, fontWeight: '600' }, // Secondary body text bold
    small: { fontSize: 13, lineHeight: 20, letterSpacing: 0, fontWeight: '400' }, // Small text
    smallSemiBold: { fontSize: 13, lineHeight: 20, letterSpacing: 0, fontWeight: '600' }, // Small text bold
    caption: { fontSize: 12, lineHeight: 18, letterSpacing: 0, fontWeight: '500' }, // Captions, metadata
    micro: { fontSize: 10, lineHeight: 16, letterSpacing: 0.6, fontWeight: '600', textTransform: 'uppercase' },
    // Pills, tags - lighter
    // Legacy sizes for compatibility
    xs: { fontSize: 12, lineHeight: 18, letterSpacing: 0 },
    sm: { fontSize: 13, lineHeight: 20, letterSpacing: 0 },
    base: { fontSize: 15, lineHeight: 22, letterSpacing: -0.05 },
    lg: { fontSize: 17, lineHeight: 24, letterSpacing: -0.1 },
    xl: { fontSize: 20, lineHeight: 28, letterSpacing: -0.2 },
    '2xl': { fontSize: 26, lineHeight: 36, letterSpacing: -0.3 },
    '3xl': { fontSize: 30, lineHeight: 40, letterSpacing: -0.4 },
};
exports.Fonts = react_native_1.Platform.select({
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
exports.Shadows = {
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
};
// Color utility — use instead of hardcoded rgba() or hex+opacity hacks
function withAlpha(hexColor, opacity) {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
// Component-specific design tokens - Uber-minimal sizing
exports.Components = {
    button: {
        height: 44, // Reduced from 52 - more minimal
        borderRadius: exports.Radii.md,
        minWidth: 100,
    },
    buttonCompact: {
        height: 32, // Reduced from 40 - sleeker
        borderRadius: exports.Radii.sm,
        minWidth: 64,
    },
    card: {
        borderRadius: exports.Radii.card,
        padding: exports.Spacing.sm, // Reduced from md - compact
        gap: exports.Spacing.xs, // Reduced from sm - tight
    },
    input: {
        height: 44, // Reduced from 52
        borderRadius: exports.Radii.md,
        paddingHorizontal: exports.Spacing.md,
    },
    pill: {
        borderRadius: exports.Radii.pill,
        paddingHorizontal: exports.Spacing.sm, // Reduced from md
        paddingVertical: exports.Spacing.xs / 2,
    },
    chip: {
        borderRadius: exports.Radii.sm,
        paddingHorizontal: exports.Spacing.sm,
        paddingVertical: exports.Spacing.xs / 2,
    },
    icon: {
        sm: 16,
        md: 20,
        lg: 24,
        xl: 32,
    },
    avatar: {
        sm: 32, // List items, compact views
        md: 44, // Standard avatar size
        lg: 64, // Profile headers, featured
        xl: 80, // Hero sections
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
};
