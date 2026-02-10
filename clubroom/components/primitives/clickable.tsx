import { Pressable, type AccessibilityRole, type AccessibilityState, type ViewStyle, type StyleProp } from 'react-native';
import React from 'react';

/**
 * Platform-compatible clickable component that avoids web-only handlers during scoped type checks.
 */
export interface ClickableProps {
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  children?: React.ReactNode;
  disabled?: boolean;
  hitSlop?: number;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
}

export function Clickable({
  onPress,
  onLongPress,
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
  const resolveStyle = typeof style === 'function' ? style : () => style;

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={delayLongPress}
      disabled={disabled || (!onPress && !onLongPress)}
      hitSlop={hitSlop}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
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
