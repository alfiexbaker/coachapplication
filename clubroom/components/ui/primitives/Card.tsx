/**
 * Card Primitive
 *
 * Container with elevation/border variants. Optionally pressable when onPress is provided.
 *
 * Variants: elevated, bordered, flat
 *
 * Usage:
 *   <Card><Text>Content</Text></Card>
 *   <Card variant="bordered" onPress={handlePress}>...</Card>
 *   <Card variant="flat" padding={false}>...</Card>
 */

import React, { useCallback, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Components, Radii, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CardVariant = 'elevated' | 'bordered' | 'flat';

export interface CardProps {
  /** Card content */
  children: React.ReactNode;
  /** Visual variant */
  variant?: CardVariant;
  /** Whether to include inner padding (default: true) */
  padding?: boolean;
  /** Makes the card pressable with scale animation */
  onPress?: () => void;
  /** Additional container styles */
  style?: StyleProp<ViewStyle>;
  /** Accessibility label for pressable cards */
  accessibilityLabel?: string;
}

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------

const PRESS_SCALE = 0.98;
const SPRING_CONFIG = { damping: 18, stiffness: 320 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function CardInner({
  children,
  variant = 'elevated',
  padding = true,
  onPress,
  style,
  accessibilityLabel,
}: CardProps) {
  const { colors, scheme } = useTheme();
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

  const themedBase = useMemo(
    () => ({ backgroundColor: colors.surface }),
    [colors],
  );

  const variantStyle = useMemo(() => {
    switch (variant) {
      case 'elevated':
        return Shadows[scheme].card;
      case 'bordered':
        return { borderWidth: 1, borderColor: colors.border };
      case 'flat':
      default:
        return undefined;
    }
  }, [variant, colors, scheme]);

  const paddingStyle = padding ? styles.padded : undefined;

  if (onPress) {
    return (
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.base, themedBase, variantStyle, paddingStyle, animatedStyle, style]}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <View style={[styles.base, themedBase, variantStyle, paddingStyle, style]}>
      {children}
    </View>
  );
}

export const Card = React.memo(CardInner);

// ---------------------------------------------------------------------------
// Styles (color-independent)
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  base: {
    borderRadius: Components.card.borderRadius,
    overflow: 'hidden',
  },
  padded: {
    padding: Components.card.padding,
  },
});
