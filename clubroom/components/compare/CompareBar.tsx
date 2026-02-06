/**
 * CompareBar Component
 *
 * A floating bar that shows the number of coaches selected for comparison.
 * Provides quick access to the comparison view and ability to clear selection.
 */

import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Shadows , Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const shadows = Shadows[scheme];

  const [count, setCount] = useState(0);
  const [maxCount] = useState(comparisonService.getMaxCoaches());
  const [translateY] = useState(new Animated.Value(100));

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
    Animated.spring(translateY, {
      toValue: shouldShow ? 0 : 100,
      useNativeDriver: true,
      damping: 15,
      stiffness: 150,
    }).start();
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

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: bottomOffset,
          transform: [{ translateY }],
        },
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
          <View style={styles.countBadge}>
            <ThemedText style={styles.countText}>{count}</ThemedText>
          </View>
          <View style={styles.textContainer}>
            <ThemedText style={styles.title}>
              {count === 1 ? '1 Coach' : `${count} Coaches`}
            </ThemedText>
            <ThemedText style={styles.subtitle}>
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
            <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.8)" />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View comparison"
            onPress={handleCompare}
            style={({ pressed }) => [
              styles.compareButton,
              {
                backgroundColor: pressed ? 'rgba(255,255,255,0.9)' : palette.surface,
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { ...Typography.subheading, color: Colors.light.onPrimary },
  textContainer: {
    flex: 1,
  },
  title: { ...Typography.bodySemiBold, color: Colors.light.onPrimary },
  subtitle: { ...Typography.caption, color: 'rgba(255,255,255,0.7)',
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
