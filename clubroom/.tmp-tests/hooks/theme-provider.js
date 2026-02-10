"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThemeProvider = ThemeProvider;
exports.useThemePreferences = useThemePreferences;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const ThemeContext = (0, react_1.createContext)(undefined);
function ThemeProvider({ children }) {
    const [colorScheme, setColorScheme] = (0, react_1.useState)('light');
    const systemScheme = 'light';
    const value = (0, react_1.useMemo)(() => ({
        colorScheme,
        systemScheme,
        toggleColorScheme: () => setColorScheme('light'),
        setColorScheme: (scheme) => setColorScheme(scheme === 'dark' ? 'light' : scheme),
    }), [colorScheme, systemScheme]);
    return (0, jsx_runtime_1.jsx)(ThemeContext.Provider, { value: value, children: children });
}
function useThemePreferences() {
    const context = (0, react_1.useContext)(ThemeContext);
    if (!context) {
        throw new Error('useThemePreferences must be used within a ThemeProvider');
    }
    return context;
}
