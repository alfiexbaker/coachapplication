"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Column = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Column — Vertical flex layout primitive.
 *
 * Provides gap/padding props mapped to Spacing tokens.
 * Default flexDirection is column (React Native default), so this mainly
 * adds convenient token-based spacing.
 *
 * Usage:
 *   <Column gap="md" padding="sm">
 *     <Section title="Teams" />
 *     <TeamList />
 *   </Column>
 */
const react_1 = require("react");
const react_native_1 = require("react-native");
const theme_1 = require("@/constants/theme");
function resolveSpacing(value) {
    if (value === undefined)
        return undefined;
    if (typeof value === 'number')
        return value;
    return theme_1.Spacing[value];
}
exports.Column = (0, react_1.memo)(function Column({ gap, align, justify, padding, paddingH, paddingV, flex, style, children, }) {
    const computed = {
        gap: resolveSpacing(gap),
        alignItems: align,
        justifyContent: justify,
        padding: resolveSpacing(padding),
        paddingHorizontal: resolveSpacing(paddingH),
        paddingVertical: resolveSpacing(paddingV),
        flex: flex ? 1 : undefined,
    };
    return (0, jsx_runtime_1.jsx)(react_native_1.View, { style: [computed, style], children: children });
});
