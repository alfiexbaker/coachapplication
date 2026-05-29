import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import React from 'react';
import { ThemedText } from '@/components/themed-text';
import { Components, Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface ButtonProps {
  onPress: () => void;
  children?: React.ReactNode;
  label?: string;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  accessibilityLabel?: string;
}

export function Button({
  onPress,
  children,
  label,
  disabled = false,
  style,
  variant = 'primary',
  accessibilityLabel,
}: ButtonProps) {
  const { colors: palette } = useTheme();

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
      accessibilityLabel={accessibilityLabel}
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
      {label ? <ThemedText style={[styles.buttonLabel, { color: getTextColor() }]}>{label}</ThemedText> : children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: Components.button.height,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: { ...Typography.subheading },
});
