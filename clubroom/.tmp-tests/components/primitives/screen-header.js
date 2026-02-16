"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCREEN_TYPOGRAPHY = void 0;
exports.ScreenHeader = ScreenHeader;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
const row_1 = require("@/components/primitives/row");
const vector_icons_1 = require("@expo/vector-icons");
const clickable_1 = require("@/components/primitives/clickable");
const themed_text_1 = require("@/components/themed-text");
const theme_1 = require("@/constants/theme");
const useTheme_1 = require("@/hooks/useTheme");
/**
 * ScreenHeader - Use this for main tab screens (Schedule, Athletes, Messages, etc.)
 *
 * This provides the large hero-style header that appears at the top of main screens.
 * For interior pages (detail views, modals), use PageHeader instead.
 *
 * @example
 * ```tsx
 * <ScreenHeader
 *   title="Schedule"
 *   subtitle="Your upcoming sessions"
 *   action={{ icon: 'add', onPress: () => {} }}
 * />
 * ```
 */
function ScreenHeader({ title, subtitle, action, rightElement, bordered = false, }) {
    const { colors: palette } = (0, useTheme_1.useTheme)();
    return ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: [
            styles.container,
            bordered ? { borderBottomWidth: 1, borderBottomColor: palette.border } : undefined,
        ], children: (0, jsx_runtime_1.jsxs)(row_1.Row, { align: "center", justify: "between", gap: "sm", children: [(0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.textContainer, children: [(0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: styles.title, numberOfLines: 1, children: title }), subtitle && ((0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: [styles.subtitle, { color: palette.muted }], numberOfLines: 2, children: subtitle }))] }), (rightElement || action) && ((0, jsx_runtime_1.jsx)(row_1.Row, { align: "center", children: rightElement ||
                        (action && ((0, jsx_runtime_1.jsx)(clickable_1.Clickable, { onPress: action.onPress, style: [
                                styles.actionButton,
                                { backgroundColor: palette.surface, borderColor: palette.border },
                            ], accessibilityRole: "button", accessibilityLabel: action.label ?? 'Header action', hitSlop: { top: 8, right: 8, bottom: 8, left: 8 }, children: (0, jsx_runtime_1.jsxs)(row_1.Row, { align: "center", gap: "xxs", children: [action.icon && ((0, jsx_runtime_1.jsx)(vector_icons_1.Ionicons, { name: action.icon, size: 18, color: palette.foreground })), action.label && ((0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: [styles.actionLabel, { color: palette.foreground }], children: action.label }))] }) }))) }))] }) }));
}
// STANDARDIZED STYLES - SAME AS PageHeader
const styles = react_native_1.StyleSheet.create({
    container: {
        paddingHorizontal: theme_1.Spacing.md,
        paddingTop: theme_1.Spacing.sm,
        paddingBottom: theme_1.Spacing.sm,
    },
    textContainer: {
        flex: 1,
        gap: theme_1.Spacing.xs / 2,
    },
    // GLOBAL: Title = 22px, weight 600 (same everywhere)
    title: { ...theme_1.Typography.title, letterSpacing: -0.3 },
    // GLOBAL: Subtitle = 12px, weight 400
    subtitle: { ...theme_1.Typography.caption, lineHeight: 18 },
    actionButton: {
        paddingHorizontal: theme_1.Spacing.sm,
        minHeight: 40,
        paddingVertical: theme_1.Spacing.xxs,
        borderRadius: theme_1.Radii.md,
        borderWidth: 1,
        justifyContent: 'center',
    },
    actionLabel: { ...theme_1.Typography.smallSemiBold },
});
// SIMPLE TYPOGRAPHY - Same everywhere
exports.SCREEN_TYPOGRAPHY = {
    // ALL headers use this - no exceptions
    title: {
        ...theme_1.Typography.title,
        letterSpacing: -0.3,
    },
    subtitle: {
        ...theme_1.Typography.caption,
        lineHeight: 18,
    },
};
