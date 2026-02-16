"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Row = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Row — Horizontal flex layout primitive.
 *
 * Replaces raw `View` + `flexDirection: 'row'` boilerplate.
 * Maps Spacing keys to design tokens automatically.
 *
 * Usage:
 *   <Row gap="sm" align="center" justify="between" padding="md">
 *     <Avatar />
 *     <ThemedText>Name</ThemedText>
 *   </Row>
 */
const react_1 = require("react");
const react_native_1 = require("react-native");
const theme_1 = require("@/constants/theme");
const alignMap = {
    start: 'flex-start',
    end: 'flex-end',
    center: 'center',
    stretch: 'stretch',
    baseline: 'baseline',
    'flex-start': 'flex-start',
    'flex-end': 'flex-end',
};
const justifyMap = {
    start: 'flex-start',
    end: 'flex-end',
    center: 'center',
    between: 'space-between',
    around: 'space-around',
    evenly: 'space-evenly',
    'flex-start': 'flex-start',
    'flex-end': 'flex-end',
    'space-between': 'space-between',
    'space-around': 'space-around',
    'space-evenly': 'space-evenly',
};
function resolveSpacing(value) {
    if (value === undefined)
        return undefined;
    if (typeof value === 'number')
        return value;
    return theme_1.Spacing[value];
}
exports.Row = (0, react_1.memo)(function Row({ gap, align, justify, padding, paddingH, paddingV, wrap, flex, style, children, accessibilityRole, accessibilityLabel, accessibilityState, testID, }) {
    const computed = {
        flexDirection: 'row',
        gap: resolveSpacing(gap),
        alignItems: align ? alignMap[align] : undefined,
        justifyContent: justify ? justifyMap[justify] : undefined,
        padding: resolveSpacing(padding),
        paddingHorizontal: resolveSpacing(paddingH),
        paddingVertical: resolveSpacing(paddingV),
        flexWrap: wrap ? 'wrap' : undefined,
        flex: flex ? 1 : undefined,
    };
    return ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: [computed, style], accessibilityRole: accessibilityRole, accessibilityLabel: accessibilityLabel, accessibilityState: accessibilityState, testID: testID, children: children }));
});
