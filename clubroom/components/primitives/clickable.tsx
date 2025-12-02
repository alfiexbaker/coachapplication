import { Pressable, type AccessibilityRole, type ViewStyle } from 'react-native';
import React from 'react';

/**
 * Platform-compatible clickable component that avoids web-only handlers during scoped type checks.
 */
export interface ClickableProps {
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[] | ((state: { pressed: boolean }) => ViewStyle | ViewStyle[]);
  children: React.ReactNode;
  disabled?: boolean;
  hitSlop?: number;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
}

export function Clickable({
  onPress,
  style,
  children,
  disabled,
  hitSlop,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
}: ClickableProps) {
  const handlePress = disabled ? undefined : onPress;
  const resolveStyle = typeof style === 'function' ? style : () => style;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || !onPress}
      hitSlop={hitSlop}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
      style={(state) => [
        resolveStyle({ pressed: state.pressed }) as ViewStyle | ViewStyle[],
        disabled && { opacity: 0.5 },
      ]}
    >
      {children}
    </Pressable>
  );
}
