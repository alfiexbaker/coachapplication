"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatCard = StatCard;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
const row_1 = require("@/components/primitives/row");
const themed_text_1 = require("@/components/themed-text");
const theme_1 = require("@/constants/theme");
const useTheme_1 = require("@/hooks/useTheme");
/**
 * StatCard displays a single metric with label, value, and optional trend.
 * Use in horizontal rows for key metrics or standalone for emphasis.
 *
 * @example
 * ```tsx
 * <View style={{ flexDirection: 'row', gap: Spacing.md }}>
 *   <StatCard value="24" label="Sessions" trend="+4" />
 *   <StatCard value="4.8" label="Avg Rating" icon={<Star />} />
 * </View>
 * ```
 */
function StatCard({ value, label, icon, trend, trendColor, variant = 'default', }) {
    const { colors: palette } = (0, useTheme_1.useTheme)();
    const isCompact = variant === 'compact';
    // Auto-detect trend color based on +/-
    const autoTrendColor = trend
        ? trend.startsWith('+') || trend.includes('↑')
            ? palette.success
            : trend.startsWith('-') || trend.includes('↓')
                ? palette.error
                : palette.muted
        : palette.muted;
    const finalTrendColor = trendColor || autoTrendColor;
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [styles.container, isCompact ? styles.containerCompact : undefined], children: [(0, jsx_runtime_1.jsxs)(row_1.Row, { align: "center", gap: theme_1.Spacing.xs / 2, children: [(0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: [
                            styles.value,
                            isCompact ? styles.valueCompact : undefined,
                            { fontVariant: ['tabular-nums'] },
                        ], children: value }), icon, trend ? ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: [styles.trendBadge, { backgroundColor: (0, theme_1.withAlpha)(finalTrendColor, 0.12) }], children: (0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: [styles.trendText, { color: finalTrendColor }], children: trend }) })) : null] }), (0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: [styles.label, isCompact ? styles.labelCompact : undefined, { color: palette.muted }], children: label })] }));
}
const styles = react_native_1.StyleSheet.create({
    container: {
        alignItems: 'center',
        gap: theme_1.Spacing.xs,
    },
    containerCompact: {
        alignItems: 'flex-start',
    },
    value: { ...theme_1.Typography.display, letterSpacing: -0.4 },
    valueCompact: { ...theme_1.Typography.title },
    label: { ...theme_1.Typography.caption, textTransform: 'uppercase',
        letterSpacing: 0.6 },
    labelCompact: { ...theme_1.Typography.small, textTransform: 'none',
        letterSpacing: 0,
        fontWeight: '400' },
    trendBadge: {
        paddingHorizontal: theme_1.Spacing.xs,
        paddingVertical: theme_1.Spacing.micro,
        borderRadius: theme_1.Radii.xs,
    },
    trendText: { ...theme_1.Typography.caption, letterSpacing: 0 },
});
