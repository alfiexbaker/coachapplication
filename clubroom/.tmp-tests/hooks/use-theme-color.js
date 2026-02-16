"use strict";
/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useThemeColor = useThemeColor;
const theme_1 = require("@/constants/theme");
const use_color_scheme_1 = require("@/hooks/use-color-scheme");
function useThemeColor(props, colorName) {
    const theme = (0, use_color_scheme_1.useColorScheme)() ?? 'light';
    const colorFromProps = props[theme];
    if (colorFromProps) {
        return colorFromProps;
    }
    else {
        return theme_1.Colors[theme][colorName];
    }
}
