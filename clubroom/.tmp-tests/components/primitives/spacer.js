"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spacer = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Spacer — Fixed-size space between elements.
 *
 * Usage:
 *   <Spacer size="lg" />              // vertical 32px
 *   <Spacer size="sm" horizontal />   // horizontal 16px
 *   <Spacer size={12} />              // raw number escape hatch
 */
const react_1 = require("react");
const react_native_1 = require("react-native");
const theme_1 = require("@/constants/theme");
exports.Spacer = (0, react_1.memo)(function Spacer({ size, horizontal }) {
    const px = typeof size === 'number' ? size : theme_1.Spacing[size];
    return (0, jsx_runtime_1.jsx)(react_native_1.View, { style: horizontal ? { width: px } : { height: px } });
});
