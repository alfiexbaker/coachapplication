import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import React from 'react';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface ButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
}

export function Button({
  onPress,
  children,
  disabled = false,
  style,
  variant = 'primary',
}: ButtonProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const getBackgroundColor = (pressed: boolean) => {
    if (disabled) {
      return palette.border;
    }

    if (variant === 'outline') {
      return pressed ? palette.surface : 'transparent';
    }

    if (variant === 'secondary') {
      return pressed ? palette.surface : palette.card;
    }

    // primary variant
    return pressed ? palette.tintPressed : palette.tint;
  };

  const getBorderColor = () => {
    if (variant === 'outline') {
      return palette.border;
    }
    return 'transparent';
  };

  const getTextColor = () => {
    if (disabled) {
      return palette.muted;
    }

    if (variant === 'primary') {
      return palette.onPrimary;
    }

    return palette.foreground;
  };

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: getBackgroundColor(pressed),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 1 : 0,
          opacity: pressed || disabled ? 0.9 : 1,
        },
        style,
      ]}
      disabled={disabled}
      onPress={onPress}
    >
      {typeof children === 'string' ? (
        <ThemedText
          style={[styles.buttonLabel, { color: getTextColor() }]}
        >
          {children}
        </ThemedText>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontWeight: '600',
    fontSize: 16,
  },
});
