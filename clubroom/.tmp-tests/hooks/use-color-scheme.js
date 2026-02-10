"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useColorScheme = useColorScheme;
const theme_provider_1 = require("./theme-provider");
function useColorScheme() {
    const { colorScheme } = (0, theme_provider_1.useThemePreferences)();
    return colorScheme;
}
