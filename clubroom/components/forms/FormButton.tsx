/**
 * Unified FormButton component.
 * Single source of truth for all form submission buttons across the app.
 */

import React from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  View,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing, Radii, Borders, Components, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface FormButtonProps {
  /** Button label */
  label: string;
  /** Press handler */
  onPress: () => void;
  /** Loading state - shows spinner and disables */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Visual variant */
  variant?: ButtonVariant;
  /** Size variant */
  size?: ButtonSize;
  /** Left icon name */
  leftIcon?: string;
  /** Right icon name */
  rightIcon?: string;
  /** Full width button */
  fullWidth?: boolean;
  /** Custom styles */
  style?: ViewStyle;
  /** Accessibility label */
  accessibilityLabel?: string;
}

export function FormButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  fullWidth = true,
  style,
  accessibilityLabel,
}: FormButtonProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const isDisabled = disabled || loading;

  // Get variant styles
  const getVariantStyles = (): { container: ViewStyle; text: TextStyle; iconColor: string } => {
    const base = {
      container: {} as ViewStyle,
      text: {} as TextStyle,
      iconColor: '#FFFFFF',
    };

    switch (variant) {
      case 'primary':
        return {
          container: {
            backgroundColor: isDisabled ? palette.border : palette.tint,
          },
          text: { color: '#FFFFFF' },
          iconColor: '#FFFFFF',
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: palette.surfaceSecondary,
            borderWidth: Borders.width.thin,
            borderColor: palette.border,
          },
          text: { color: palette.text },
          iconColor: palette.text,
        };
      case 'destructive':
        return {
          container: {
            backgroundColor: isDisabled ? palette.border : palette.error,
          },
          text: { color: '#FFFFFF' },
          iconColor: '#FFFFFF',
        };
      case 'ghost':
        return {
          container: {
            backgroundColor: 'transparent',
          },
          text: { color: palette.tint },
          iconColor: palette.tint,
        };
      case 'outline':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: Borders.width.thin,
            borderColor: isDisabled ? palette.border : palette.tint,
          },
          text: { color: isDisabled ? palette.muted : palette.tint },
          iconColor: isDisabled ? palette.muted : palette.tint,
        };
      default:
        return base;
    }
  };

  // Get size styles
  const getSizeStyles = (): { container: ViewStyle; text: TextStyle; iconSize: number } => {
    switch (size) {
      case 'sm':
        return {
          container: {
            height: Components.buttonCompact.height,
            paddingHorizontal: Spacing.sm,
            borderRadius: Components.buttonCompact.borderRadius,
          },
          text: Typography.small,
          iconSize: 16,
        };
      case 'lg':
        return {
          container: {
            height: 52,
            paddingHorizontal: Spacing.lg,
            borderRadius: Radii.lg,
          },
          text: Typography.bodySemiBold,
          iconSize: 24,
        };
      case 'md':
      default:
        return {
          container: {
            height: Components.button.height,
            paddingHorizontal: Spacing.md,
            borderRadius: Components.button.borderRadius,
          },
          text: Typography.bodySemiBold,
          iconSize: 20,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.container,
        sizeStyles.container,
        variantStyles.container,
        fullWidth ? styles.fullWidth : undefined,
        isDisabled ? styles.disabled : undefined,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantStyles.iconColor}
        />
      ) : (
        <View style={styles.content}>
          {leftIcon && (
            <IconSymbol
              name={leftIcon as any}
              size={sizeStyles.iconSize}
              color={variantStyles.iconColor}
              style={styles.leftIcon}
            />
          )}
          <ThemedText
            style={[
              styles.label,
              sizeStyles.text,
              variantStyles.text,
              isDisabled ? styles.disabledText : undefined,
            ]}
          >
            {label}
          </ThemedText>
          {rightIcon && (
            <IconSymbol
              name={rightIcon as any}
              size={sizeStyles.iconSize}
              color={variantStyles.iconColor}
              style={styles.rightIcon}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
  leftIcon: {
    marginRight: Spacing.xs,
  },
  rightIcon: {
    marginLeft: Spacing.xs,
  },
  disabled: {
    opacity: 0.6,
  },
  disabledText: {
    opacity: 0.8,
  },
});

export default FormButton;
