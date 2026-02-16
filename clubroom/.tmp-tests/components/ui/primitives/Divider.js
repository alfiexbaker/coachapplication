"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Divider = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Divider Primitive
 *
 * Simple visual separator — horizontal by default, optionally vertical.
 *
 * Usage:
 *   <Divider />
 *   <Divider spacing={24} />
 *   <Divider vertical />
 */
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const useTheme_1 = require("@/hooks/useTheme");
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function DividerInner({ vertical = false, spacing = 0, style }) {
    const { colors } = (0, useTheme_1.useTheme)();
    return ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: [
            vertical ? styles.vertical : styles.horizontal,
            { backgroundColor: colors.border },
            vertical ? { marginHorizontal: spacing } : { marginVertical: spacing },
            style,
        ] }));
}
exports.Divider = react_1.default.memo(DividerInner);
// ---------------------------------------------------------------------------
// Styles (color-independent)
// ---------------------------------------------------------------------------
const styles = react_native_1.StyleSheet.create({
    horizontal: {
        height: react_native_1.StyleSheet.hairlineWidth,
        width: '100%',
    },
    vertical: {
        width: react_native_1.StyleSheet.hairlineWidth,
        alignSelf: 'stretch',
    },
});
