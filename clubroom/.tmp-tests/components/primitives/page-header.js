"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageHeader = PageHeader;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const vector_icons_1 = require("@expo/vector-icons");
const expo_router_1 = require("expo-router");
const clickable_1 = require("@/components/primitives/clickable");
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
action, actionIcon, onActionPress, right, rightAction, centerTitle = false, backIcon = 'chevron-back', containerStyle, }) {
    const { colors: palette } = (0, useTheme_1.useTheme)();
    const router = (0, expo_router_1.useRouter)();
    const [leftSlotWidth, setLeftSlotWidth] = (0, react_1.useState)(0);
    const [rightSlotWidth, setRightSlotWidth] = (0, react_1.useState)(0);
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
            return ((0, jsx_runtime_1.jsx)(clickable_1.Clickable, { onPress: handleBackPress, accessibilityRole: "button", accessibilityLabel: "Go back", style: [styles.backButton, { backgroundColor: palette.surface }], hitSlop: { top: 8, right: 8, bottom: 8, left: 8 }, children: (0, jsx_runtime_1.jsx)(vector_icons_1.Ionicons, { name: backIcon, size: 20, color: palette.foreground }) }));
        }
        return null;
    };
    // Support rightAction as an alias for right
    const rightContent = right ?? rightAction;
    const leftNode = renderLeft();
    const rightNode = rightContent || action || actionIcon ? ((0, jsx_runtime_1.jsx)(row_1.Row, { align: "center", children: rightContent || ((0, jsx_runtime_1.jsx)(clickable_1.Clickable, { style: [
                styles.actionButton,
                {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                },
            ], onPress: onActionPress, accessibilityRole: "button", accessibilityLabel: action ?? 'Header action', children: (0, jsx_runtime_1.jsxs)(row_1.Row, { align: "center", gap: theme_1.Spacing.xs / 2, children: [actionIcon ? (0, jsx_runtime_1.jsx)(vector_icons_1.Ionicons, { name: actionIcon, size: 18, color: palette.foreground }) : null, action ? ((0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: [
                            styles.actionText,
                            { color: palette.foreground },
                            !actionIcon ? styles.actionTextOnly : undefined,
                        ], children: action })) : null] }) })) })) : null;
    const balancedEdgeWidth = Math.max(44, leftSlotWidth, rightSlotWidth);
    const shouldBalanceEdges = leftSlotWidth > 44 || rightSlotWidth > 44;
    if (centerTitle) {
        return ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: [styles.container, containerStyle], children: (0, jsx_runtime_1.jsxs)(row_1.Row, { align: "center", style: styles.centerRow, children: [(0, jsx_runtime_1.jsx)(react_native_1.View, { style: [styles.edgeSlot, shouldBalanceEdges ? { width: balancedEdgeWidth } : undefined], onLayout: (event) => {
                            const nextWidth = Math.ceil(event.nativeEvent.layout.width);
                            setLeftSlotWidth((prev) => (prev === nextWidth ? prev : nextWidth));
                        }, children: leftNode }), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [styles.titleContainer, styles.centerTitleContainer], children: [(0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { type: "title", style: [styles.title, styles.centerTitleText], numberOfLines: 1, children: title }), subtitle ? ((0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: [styles.subtitle, styles.centerSubtitleText, { color: palette.muted }], numberOfLines: 1, children: subtitle })) : null] }), (0, jsx_runtime_1.jsx)(react_native_1.View, { style: [
                            styles.edgeSlot,
                            styles.rightEdgeSlot,
                            shouldBalanceEdges ? { width: balancedEdgeWidth } : undefined,
                        ], onLayout: (event) => {
                            const nextWidth = Math.ceil(event.nativeEvent.layout.width);
                            setRightSlotWidth((prev) => (prev === nextWidth ? prev : nextWidth));
                        }, children: rightNode })] }) }));
    }
    return ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: [styles.container, containerStyle], children: (0, jsx_runtime_1.jsxs)(row_1.Row, { align: "center", gap: "sm", children: [leftNode, (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.titleContainer, children: [(0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { type: "title", style: styles.title, children: title }), subtitle ? ((0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: [styles.subtitle, { color: palette.muted }], children: subtitle })) : null] }), rightNode] }) }));
}
const styles = react_native_1.StyleSheet.create({
    container: {
        paddingHorizontal: theme_1.Spacing.md,
        paddingTop: theme_1.Spacing.sm,
        paddingBottom: theme_1.Spacing.sm,
    },
    centerRow: {
        minHeight: 44,
    },
    edgeSlot: {
        minWidth: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rightEdgeSlot: {
        alignItems: 'flex-end',
    },
    titleContainer: {
        flex: 1,
        gap: theme_1.Spacing.xs / 2,
    },
    centerTitleContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: theme_1.Spacing.xs,
    },
    title: { ...theme_1.Typography.title, letterSpacing: -0.3 },
    centerTitleText: {
        textAlign: 'center',
    },
    subtitle: { ...theme_1.Typography.caption, lineHeight: 18, fontWeight: '400' },
    centerSubtitleText: {
        textAlign: 'center',
    },
    actionButton: {
        paddingHorizontal: theme_1.Spacing.sm,
        borderRadius: theme_1.Components.buttonCompact.borderRadius,
        minHeight: 44,
        borderWidth: 1,
        justifyContent: 'center',
    },
    actionText: { ...theme_1.Typography.smallSemiBold, letterSpacing: -0.05 },
    actionTextOnly: {
        paddingHorizontal: theme_1.Spacing.xs / 2,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: theme_1.Radii.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
