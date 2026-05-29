import {
  Pressable,
  type AccessibilityRole,
  type AccessibilityState,
  type GestureResponderEvent,
  type Insets,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import React from 'react';

/**
 * Platform-compatible clickable component that avoids web-only handlers during scoped type checks.
 */
export interface ClickableProps {
  ref?: React.Ref<React.ComponentRef<typeof Pressable>>;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  onPressIn?: (event: GestureResponderEvent) => void;
  onPressOut?: (event: GestureResponderEvent) => void;
  delayLongPress?: number;
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  children?: React.ReactNode;
  disabled?: boolean;
  hitSlop?: number | Insets;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
}

export function Clickable({
  ref,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  delayLongPress,
  style,
  children,
  disabled,
  hitSlop,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  accessibilityState,
}: ClickableProps) {
    const handlePress = disabled ? undefined : onPress;
    const handleLongPress = disabled ? undefined : onLongPress;
    const handlePressIn = disabled ? undefined : onPressIn;
    const handlePressOut = disabled ? undefined : onPressOut;
    const resolveStyle = typeof style === 'function' ? style : () => style;
    const resolvedRole =
      accessibilityRole ?? (handlePress || handleLongPress ? 'button' : undefined);
    const resolvedHitSlop = hitSlop ?? 8;

    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        delayLongPress={delayLongPress}
        disabled={disabled || (!onPress && !onLongPress)}
        hitSlop={resolvedHitSlop}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole={resolvedRole}
        accessibilityState={accessibilityState}
        style={(state) => [
          resolveStyle({ pressed: state.pressed }) as ViewStyle | ViewStyle[],
          disabled ? { opacity: 0.5 } : undefined,
        ]}
      >
        {children}
      </Pressable>
    );
}

Clickable.displayName = 'Clickable';
