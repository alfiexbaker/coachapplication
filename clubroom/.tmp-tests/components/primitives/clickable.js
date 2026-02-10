"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Clickable = Clickable;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
function Clickable({ onPress, onLongPress, delayLongPress, style, children, disabled, hitSlop, accessibilityLabel, accessibilityHint, accessibilityRole, accessibilityState, }) {
    const handlePress = disabled ? undefined : onPress;
    const handleLongPress = disabled ? undefined : onLongPress;
    const resolveStyle = typeof style === 'function' ? style : () => style;
    return ((0, jsx_runtime_1.jsx)(react_native_1.Pressable, { onPress: handlePress, onLongPress: handleLongPress, delayLongPress: delayLongPress, disabled: disabled || (!onPress && !onLongPress), hitSlop: hitSlop, accessibilityLabel: accessibilityLabel, accessibilityHint: accessibilityHint, accessibilityRole: accessibilityRole, accessibilityState: accessibilityState, style: (state) => [
            resolveStyle({ pressed: state.pressed }),
            disabled ? { opacity: 0.5 } : undefined,
        ], children: children }));
}
