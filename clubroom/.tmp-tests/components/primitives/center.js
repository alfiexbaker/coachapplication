"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Center = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Center — Centers children both horizontally and vertically.
 *
 * Usage:
 *   <Center flex>
 *     <LoadingScreen />
 *   </Center>
 *
 *   <Center padding="md">
 *     <EmptyState ... />
 *   </Center>
 */
const react_1 = require("react");
const react_native_1 = require("react-native");
const theme_1 = require("@/constants/theme");
exports.Center = (0, react_1.memo)(function Center({ flex, padding, style, children }) {
    const px = padding === undefined ? undefined : typeof padding === 'number' ? padding : theme_1.Spacing[padding];
    const computed = {
        alignItems: 'center',
        justifyContent: 'center',
        flex: flex ? 1 : undefined,
        padding: px,
    };
    return (0, jsx_runtime_1.jsx)(react_native_1.View, { style: [computed, style], children: children });
});
