"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThemedText = ThemedText;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
const theme_1 = require("@/constants/theme");
const use_theme_color_1 = require("@/hooks/use-theme-color");
function ThemedText({ style, lightColor, darkColor, type = 'default', ...rest }) {
    const color = (0, use_theme_color_1.useThemeColor)({ light: lightColor, dark: darkColor }, 'text');
    const typeStyles = {
        default: styles.default,
        title: styles.title,
        defaultSemiBold: styles.defaultSemiBold,
        subtitle: styles.subtitle,
        link: styles.link,
        eyebrow: styles.eyebrow,
        heading: styles.heading,
        subheading: styles.subheading,
        display: styles.display,
    };
    return ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [
            { color, fontFamily: theme_1.Fonts?.sans },
            typeStyles[type],
            style,
        ], ...rest }));
}
const styles = react_native_1.StyleSheet.create({
    default: {
        ...theme_1.Typography.base,
    },
    defaultSemiBold: {
        ...theme_1.Typography.base,
        fontWeight: '600',
    },
    title: {
        ...theme_1.Typography['2xl'],
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    subtitle: {
        ...theme_1.Typography.lg,
        fontWeight: '600',
    },
    heading: {
        ...theme_1.Typography.heading,
    },
    subheading: {
        ...theme_1.Typography.subheading,
    },
    eyebrow: {
        ...theme_1.Typography.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        fontWeight: '700',
        opacity: 0.5,
    },
    link: {
        ...theme_1.Typography.base,
        // Note: link color is overridden at runtime via useThemeColor; this is the light-mode fallback
        color: '#1D4ED8', // Decorative: link blue (matches colors.info)
    },
    display: {
        ...theme_1.Typography.display,
    },
});
