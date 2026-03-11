/**
 * FavouriteButton Component
 *
 * A heart icon toggle button for favouriting coaches.
 * Features:
 * - Animated heart scale on toggle
 * - Optimistic UI updates
 * - Haptic feedback
 * - Accessible labeling
 */

import React, { useCallback, useEffect } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

const AnimatedClickable = Animated.createAnimatedComponent(Clickable);

export interface FavouriteButtonProps {
  /** Whether the coach is currently favourited */
  isFavourite: boolean;
  /** Callback when favourite status changes */
  onToggle: () => void;
  /** Optional loading state */
  loading?: boolean;
  /** Optional disabled state */
  disabled?: boolean;
  /** Size of the heart icon (default: 24) */
  size?: number;
  /** Optional custom style */
  style?: ViewStyle;
  /** Optional active color (default: red) */
  activeColor?: string;
  /** Optional inactive color (default: muted) */
  inactiveColor?: string;
  /** Optional accessibility label prefix */
  coachName?: string;
}

export function FavouriteButton({
  isFavourite,
  onToggle,
  loading = false,
  disabled = false,
  size = 24,
  style,
  activeColor,
  inactiveColor,
  coachName,
}: FavouriteButtonProps) {
  const { colors: palette } = useTheme();

  const heartColor = activeColor ?? palette.error;
  const emptyColor = inactiveColor ?? palette.muted;

  // Animation values
  const scale = useSharedValue(1);
  const fillProgress = useSharedValue(isFavourite ? 1 : 0);

  // Sync fillProgress with isFavourite prop
  useEffect(() => {
    fillProgress.value = withTiming(isFavourite ? 1 : 0, { duration: 200 });
  }, [isFavourite, fillProgress]);

  const triggerHaptic = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handlePress = useCallback(() => {
    if (loading || disabled) return;

    // Trigger haptic feedback
    triggerHaptic();

    // Animate scale with a bounce effect
    scale.value = withSequence(
      withTiming(0.7, { duration: 100 }),
      withSpring(1.2, { damping: 8, stiffness: 400 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );

    // Call the toggle handler
    onToggle();
  }, [loading, disabled, onToggle, scale, triggerHaptic]);

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const animatedColorStyle = useAnimatedStyle(() => {
    const color = interpolateColor(fillProgress.value, [0, 1], [emptyColor, heartColor]);
    return {
      color,
    };
  });

  const accessibilityLabel = coachName
    ? isFavourite
      ? `Remove ${coachName} from saved coaches`
      : `Save ${coachName}`
    : isFavourite
      ? 'Remove from saved coaches'
      : 'Save coach';

  return (
    <AnimatedClickable
      onPress={handlePress}
      disabled={loading || disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: isFavourite, disabled: loading || disabled }}
      hitSlop={12}
      style={[styles.button, { opacity: loading || disabled ? 0.5 : 1 }, style]}
    >
      <Animated.View style={animatedIconStyle}>
        <Animated.Text style={animatedColorStyle}>
          <Ionicons name={isFavourite ? 'heart' : 'heart-outline'} size={size} />
        </Animated.Text>
      </Animated.View>
    </AnimatedClickable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: Spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
