"use strict";
/**
 * useTheme Hook
 *
 * Returns the current color palette based on the active color scheme.
 * All UI primitives should use this hook instead of hardcoding `Colors.light`.
 *
 * When dark-mode colors are defined in `constants/theme.ts`, every component
 * using this hook will automatically respond to the system color scheme.
 *
 * Usage:
 *   const { colors, scheme, isDark } = useTheme();
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTheme = useTheme;
const theme_1 = require("@/constants/theme");
const use_color_scheme_1 = require("@/hooks/use-color-scheme");
function useTheme() {
    const scheme = (0, use_color_scheme_1.useColorScheme)() ?? 'light';
    return {
        colors: theme_1.Colors[scheme],
        scheme,
        isDark: scheme === 'dark',
    };
}
