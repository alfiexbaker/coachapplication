"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Clickable = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
const react_1 = __importDefault(require("react"));
exports.Clickable = react_1.default.forwardRef(function Clickable({ onPress, onLongPress, onPressIn, onPressOut, delayLongPress, style, children, disabled, hitSlop, accessibilityLabel, accessibilityHint, accessibilityRole, accessibilityState, }, ref) {
    const handlePress = disabled ? undefined : onPress;
    const handleLongPress = disabled ? undefined : onLongPress;
    const handlePressIn = disabled ? undefined : onPressIn;
    const handlePressOut = disabled ? undefined : onPressOut;
    const resolveStyle = typeof style === 'function' ? style : () => style;
    const resolvedRole = accessibilityRole ?? (handlePress || handleLongPress ? 'button' : undefined);
    const resolvedHitSlop = hitSlop ?? 8;
    return ((0, jsx_runtime_1.jsx)(react_native_1.Pressable, { ref: ref, onPress: handlePress, onLongPress: handleLongPress, onPressIn: handlePressIn, onPressOut: handlePressOut, delayLongPress: delayLongPress, disabled: disabled || (!onPress && !onLongPress), hitSlop: resolvedHitSlop, accessibilityLabel: accessibilityLabel, accessibilityHint: accessibilityHint, accessibilityRole: resolvedRole, accessibilityState: accessibilityState, style: (state) => [
            resolveStyle({ pressed: state.pressed }),
            disabled ? { opacity: 0.5 } : undefined,
        ], children: children }));
});
exports.Clickable.displayName = 'Clickable';
