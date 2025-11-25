import { Platform, View, TouchableOpacity, type ViewStyle } from 'react-native';
import React from 'react';

/**
 * Platform-compatible clickable component that works on both web and native
 * Uses View + onMouseUp for web, TouchableOpacity for native
 */

export interface ClickableProps {
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[] | ((state: { pressed: boolean }) => ViewStyle | ViewStyle[]);
  children: React.ReactNode;
  disabled?: boolean;
  hitSlop?: number;
}

export function Clickable({ onPress, style, children, disabled, hitSlop }: ClickableProps) {
  const handlePress = disabled ? undefined : onPress;
  if (Platform.OS === 'web') {
    const webStyle = typeof style === 'function' ? style({ pressed: false }) : style;

    return (
      <View
        onMouseUp={handlePress ? () => handlePress() : undefined}
        style={[
          webStyle,
          { cursor: disabled ? 'default' : 'pointer' },
          disabled && { opacity: 0.5 },
        ]}>
        {children}
      </View>
    );
  }

  const nativeStyle = typeof style === 'function'
    ? (pressed: boolean) => style({ pressed })
    : style;

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || !onPress}
      hitSlop={hitSlop}
      activeOpacity={0.7}
      style={nativeStyle as any}>
      {children}
    </TouchableOpacity>
  );
}
