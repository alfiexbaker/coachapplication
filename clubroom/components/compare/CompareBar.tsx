/**
 * CompareBar Component
 *
 * A floating bar that shows the number of coaches selected for comparison.
 * Provides quick access to the comparison view and ability to clear selection.
 */

import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Shadows, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { comparisonService } from '@/services/comparison-service';

interface CompareBarProps {
  /** Whether to show the bar */
  visible?: boolean;
  /** Callback when comparison count changes */
  onCountChange?: (count: number) => void;
  /** Position from bottom of screen */
  bottomOffset?: number;
}

export function CompareBar({
  visible = true,
  onCountChange,
  bottomOffset = 100,
}: CompareBarProps) {
  const { colors: palette, scheme } = useTheme();
  const shadows = Shadows[scheme];

  const [count, setCount] = useState(0);
  const [maxCount] = useState(comparisonService.getMaxCoaches());
  const translateY = useSharedValue(100);

  const refreshCount = useCallback(async () => {
    const newCount = await comparisonService.getComparisonCount();
    setCount(newCount);
    onCountChange?.(newCount);
  }, [onCountChange]);

  useEffect(() => {
    void refreshCount();
    // Set up an interval to check for changes
    const interval = setInterval(refreshCount, 1000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  useEffect(() => {
    const shouldShow = visible && count > 0;
    translateY.value = withSpring(shouldShow ? 0 : 100, { damping: 15, stiffness: 150 });
  }, [visible, count, translateY]);

  const handleCompare = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(Routes.COMPARE);
  }, []);

  const handleClear = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await comparisonService.clearComparison();
    setCount(0);
    onCountChange?.(0);
  }, [onCountChange]);

  if (count === 0) {
    return null;
  }

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom: bottomOffset },
        containerStyle,
      ]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: palette.tint,
            ...shadows.card,
          },
        ]}
      >
        {/* Info section */}
        <View style={styles.info}>
          <View style={[styles.countBadge, { backgroundColor: withAlpha(palette.onPrimary, 0.2) }]}>
            <ThemedText style={[styles.countText, { color: palette.onPrimary }]}>{count}</ThemedText>
          </View>
          <View style={styles.textContainer}>
            <ThemedText style={[styles.title, { color: palette.onPrimary }]}>
              {count === 1 ? '1 Coach' : `${count} Coaches`}
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: withAlpha(palette.onPrimary, 0.7) }]}>
              {count < maxCount ? `Add ${maxCount - count} more to compare` : 'Ready to compare'}
            </ThemedText>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear comparison"
            onPress={handleClear}
            style={({ pressed }) => [
              styles.clearButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="close-circle" size={20} color={withAlpha(palette.onPrimary, 0.8)} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View comparison"
            onPress={handleCompare}
            style={({ pressed }) => [
              styles.compareButton,
              {
                backgroundColor: pressed ? withAlpha(palette.onPrimary, 0.9) : palette.surface,
              },
            ]}
          >
            <Ionicons name="git-compare" size={18} color={palette.tint} />
            <ThemedText style={[styles.compareButtonText, { color: palette.tint }]}>
              Compare
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.sm,
    right: Spacing.sm,
    zIndex: 1000,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.lg,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  countBadge: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { ...Typography.subheading },
  textContainer: {
    flex: 1,
  },
  title: { ...Typography.bodySemiBold },
  subtitle: { ...Typography.caption,
    marginTop: 1 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  clearButton: {
    padding: Spacing.xs,
  },
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.button,
  },
  compareButtonText: { ...Typography.bodySmallSemiBold },
});
