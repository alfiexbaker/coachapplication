/**
 * Button Primitive
 *
 * Production-grade pressable button with variant, size, loading, and icon support.
 * Uses Animated scale on press for tactile feedback.
 *
 * Variants: primary, secondary, outline, ghost, destructive
 * Sizes: sm, md, lg
 *
 * Usage:
 *   <Button title="Continue" onPress={handleContinue} />
 *   <Button title="Delete" variant="destructive" size="sm" />
 *   <Button title="Save" loading icon="checkmark" iconPosition="left" />
 */

import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Components, Fonts, Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme, type ThemeColors } from '@/hooks/useTheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  /** Button label text */
  title: string;
  /** Press handler */
  onPress: () => void;
  /** Visual variant */
  variant?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /** Disable interactions */
  disabled?: boolean;
  /** Show loading spinner and disable interactions */
  loading?: boolean;
  /** Ionicons icon name */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Icon placement relative to title */
  iconPosition?: 'left' | 'right';
  /** Full width button */
  fullWidth?: boolean;
  /** Additional container styles */
  style?: StyleProp<ViewStyle>;
  /** Accessibility label override */
  accessibilityLabel?: string;
}

// ---------------------------------------------------------------------------
// Size configuration
// ---------------------------------------------------------------------------

interface SizeConfig {
  height: number;
  paddingHorizontal: number;
  borderRadius: number;
  fontSize: number;
  lineHeight: number;
  iconSize: number;
  gap: number;
}

const SIZE_MAP: Record<ButtonSize, SizeConfig> = {
  sm: {
    height: Components.buttonCompact.height,
    paddingHorizontal: Spacing.sm,
    borderRadius: Components.buttonCompact.borderRadius,
    fontSize: Typography.small.fontSize,
    lineHeight: Typography.small.lineHeight,
    iconSize: Components.icon.sm,
    gap: Spacing.xxs,
  },
  md: {
    height: Components.button.height,
    paddingHorizontal: Spacing.md,
    borderRadius: Components.button.borderRadius,
    fontSize: Typography.body.fontSize,
    lineHeight: Typography.body.lineHeight,
    iconSize: Components.icon.md,
    gap: Spacing.xs,
  },
  lg: {
    height: 52,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.lg,
    fontSize: Typography.subheading.fontSize,
    lineHeight: Typography.subheading.lineHeight,
    iconSize: Components.icon.lg,
    gap: Spacing.xs,
  },
};

// ---------------------------------------------------------------------------
// Variant color resolver
// ---------------------------------------------------------------------------

interface VariantColors {
  background: string;
  backgroundPressed: string;
  text: string;
  border: string;
  borderWidth: number;
}

function getVariantColors(variant: ButtonVariant, disabled: boolean, palette: ThemeColors): VariantColors {
  if (disabled) {
    return {
      background: palette.border,
      backgroundPressed: palette.border,
      text: palette.muted,
      border: palette.border,
      borderWidth: 0,
    };
  }

  switch (variant) {
    case 'primary':
      return {
        background: palette.tint,
        backgroundPressed: palette.tintPressed,
        text: palette.onPrimary,
        border: 'transparent',
        borderWidth: 0,
      };
    case 'secondary':
      return {
        background: palette.surfaceSecondary,
        backgroundPressed: palette.border,
        text: palette.foreground,
        border: palette.border,
        borderWidth: 1,
      };
    case 'outline':
      return {
        background: 'transparent',
        backgroundPressed: palette.overlay,
        text: palette.foreground,
        border: palette.borderMedium,
        borderWidth: 1.5,
      };
    case 'ghost':
      return {
        background: 'transparent',
        backgroundPressed: palette.overlay,
        text: palette.tint,
        border: 'transparent',
        borderWidth: 0,
      };
    case 'destructive':
      return {
        background: palette.destructive,
        backgroundPressed: palette.error,
        text: palette.onDestructive,
        border: 'transparent',
        borderWidth: 0,
      };
  }
}

// ---------------------------------------------------------------------------
// Animation constants
// ---------------------------------------------------------------------------

const PRESS_SCALE = 0.97;
const SPRING_CONFIG = { damping: 18, stiffness: 320 };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ButtonInner({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const sizeConfig = SIZE_MAP[size];
  const variantColors = useMemo(() => getVariantColors(variant, isDisabled, colors), [variant, isDisabled, colors]);
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(PRESS_SCALE, SPRING_CONFIG);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_CONFIG);
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconElement = icon && !loading ? (
    <Ionicons name={icon} size={sizeConfig.iconSize} color={variantColors.text} />
  ) : null;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.base,
        {
          height: sizeConfig.height,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          borderRadius: sizeConfig.borderRadius,
          backgroundColor: variantColors.background,
          borderColor: variantColors.border,
          borderWidth: variantColors.borderWidth,
          gap: sizeConfig.gap,
        },
        fullWidth && styles.fullWidth,
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variantColors.text} />
      ) : (
        <Row align="center" justify="center" gap={sizeConfig.gap}>
          {iconPosition === 'left' && iconElement}
          <Text
            style={[
              styles.label,
              {
                color: variantColors.text,
                fontSize: sizeConfig.fontSize,
                lineHeight: sizeConfig.lineHeight,
                fontFamily: Fonts?.sans,
              },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {iconPosition === 'right' && iconElement}
        </Row>
      )}
    </AnimatedPressable>
  );
}

export const Button = React.memo(ButtonInner);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: Components.button.minWidth,
  },
  label: {
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  fullWidth: {
    width: '100%',
  },
});
