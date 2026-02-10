"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SectionHeader = SectionHeader;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
const theme_1 = require("@/constants/theme");
const themed_text_1 = require("@/components/themed-text");
const useTheme_1 = require("@/hooks/useTheme");
function SectionHeader({ title, subtitle, eyebrow }) {
    const { colors: palette } = (0, useTheme_1.useTheme)();
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.container, children: [eyebrow ? (0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { type: "eyebrow", style: [styles.eyebrow, { color: palette.muted }], children: eyebrow }) : null, (0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { type: "title", style: styles.title, children: title }), subtitle ? (0, jsx_runtime_1.jsx)(themed_text_1.ThemedText, { style: [styles.subtitle, { color: palette.muted }], children: subtitle }) : null] }));
}
const styles = react_native_1.StyleSheet.create({
    container: {
        marginBottom: theme_1.Spacing.xl,
        gap: theme_1.Spacing.sm,
    },
    eyebrow: { ...theme_1.Typography.caption, textTransform: 'uppercase',
        letterSpacing: 1.2 },
    title: {
        ...theme_1.Typography.display,
        fontSize: 34,
        fontWeight: '800',
        letterSpacing: -1,
    },
    subtitle: { ...theme_1.Typography.subheading, lineHeight: 24,
        fontWeight: '500' },
});
