"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageHeader = PageHeader;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
const vector_icons_1 = require("@expo/vector-icons");
const expo_router_1 = require("expo-router");
const row_1 = require("@/components/primitives/row");
const themed_text_1 = require("@/components/themed-text");
const theme_1 = require("@/constants/theme");
const useTheme_1 = require("@/hooks/useTheme");
/**
 * PageHeader provides a consistent header layout with title, subtitle,
 * and optional action buttons.
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Development"
 *   subtitle="Track your athletes' progress"
 *   action="Add Session"
 *   actionIcon="add"
 *   onActionPress={() => router.push('/session/new')}
 * />
 * ```
 */
function PageHeader({ title, subtitle, left, showBack, onBackPress, onBack, // Alias for onBackPress
action, actionIcon, onActionPress, right, rightAction, }) {
    const { colors: palette } = (0, useTheme_1.useTheme)();
    const router = (0, expo_router_1.useRouter)();
    const handleBackPress = () => {
        const backHandler = onBackPress ?? onBack;
        if (backHandler) {
            backHandler();
        }
        else {
            router.back();
        }
    };
    const renderLeft = () => {
        if (left)
            return left;
        if (showBack) {
            return ((0, jsx_runtime_1.jsx)(react_native_1.Pressable, { onPress: handleBackPress, style: [styles.backButton, { backgroundColor: palette.surface }], hitSlop: { top: 8, right: 8, bottom: 8, left: 8 }, children: (0, jsx_runtime_1.jsx)(vector_icons_1.Ionicons, { name: "chevron-back", size: 20, color: palette.foreground }) }));
        }
        return null;
    };
    // Support rightAction as an alias for right
    const rightContent = right ?? rightAction;
    return ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: styles.container, children: (0, jsx_runtime_1.jsxs)(row_1.Row, { align: "center", gap: "sm", children: [renderLeft(), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.titleContainer, children: [(0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { type: "title", style: styles.title, children: title }), subtitle ? ((0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: [styles.subtitle, { color: palette.muted }], children: subtitle })) : null] }), rightContent || (action || actionIcon) ? ((0, jsx_runtime_1.jsx)(row_1.Row, { align: "center", children: rightContent || ((0, jsx_runtime_1.jsx)(react_native_1.Pressable, { style: [
                            styles.actionButton,
                            {
                                backgroundColor: palette.surface,
                                borderColor: palette.border,
                            },
                        ], onPress: onActionPress, children: (0, jsx_runtime_1.jsxs)(row_1.Row, { align: "center", gap: theme_1.Spacing.xs / 2, children: [actionIcon ? ((0, jsx_runtime_1.jsx)(vector_icons_1.Ionicons, { name: actionIcon, size: 18, color: palette.foreground })) : null, action ? ((0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: [
                                        styles.actionText,
                                        { color: palette.foreground },
                                        !actionIcon ? styles.actionTextOnly : undefined,
                                    ], children: action })) : null] }) })) })) : null] }) }));
}
const styles = react_native_1.StyleSheet.create({
    container: {
        paddingHorizontal: theme_1.Spacing.md,
        paddingTop: theme_1.Spacing.sm,
        paddingBottom: theme_1.Spacing.sm,
    },
    titleContainer: {
        flex: 1,
        gap: theme_1.Spacing.xs / 2,
    },
    title: { ...theme_1.Typography.title, letterSpacing: -0.3 },
    subtitle: { ...theme_1.Typography.caption, lineHeight: 18,
        fontWeight: '400' },
    actionButton: {
        paddingHorizontal: theme_1.Spacing.sm,
        borderRadius: theme_1.Components.buttonCompact.borderRadius,
        height: theme_1.Components.buttonCompact.height,
        borderWidth: 1,
    },
    actionText: { ...theme_1.Typography.smallSemiBold, letterSpacing: -0.05 },
    actionTextOnly: {
        paddingHorizontal: theme_1.Spacing.xs / 2,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: theme_1.Radii.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
