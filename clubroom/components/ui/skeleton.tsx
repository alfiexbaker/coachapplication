import React from 'react';
import {
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Radii, Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type SkeletonProps = {
  height?: number;
  width?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * Lightweight skeleton shimmer that can wrap lists or individual rows.
 * Keeps implementation minimal so it can be swapped for a fancier shimmer later.
 */
export function Skeleton({
  height = 16,
  width = '100%',
  radius = Radii.md,
  style,
  accessibilityLabel = 'Loading content',
}: SkeletonProps) {
  const { colors: palette, scheme } = useTheme();

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      layout={LinearTransition}
      accessibilityRole="none"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.base,
        {
          height,
          width,
          borderRadius: radius,
          backgroundColor:
            scheme === 'dark' ? withAlpha(palette.border, 0.33) : withAlpha(palette.border, 0.5),
        },
        style,
      ]}
    />
  );
}

export function SkeletonRow({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.rowContainer} accessibilityRole="none" accessibilityLabel="Loading content">
      {Array.from({ length: count }).map((_, idx) => (
        <Skeleton
          key={idx}
          width={`${Math.max(50, 100 - idx * 10)}%`}
          accessibilityLabel={`Loading row ${idx + 1}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  rowContainer: {
    gap: Spacing.xs,
  },
});
