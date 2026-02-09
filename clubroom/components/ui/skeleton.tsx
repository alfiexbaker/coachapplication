import React from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Radii, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type SkeletonProps = {
  height?: number;
  width?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Lightweight skeleton shimmer that can wrap lists or individual rows.
 * Keeps implementation minimal so it can be swapped for a fancier shimmer later.
 */
export function Skeleton({ height = 16, width = '100%', radius = Radii.md, style }: SkeletonProps) {
  const { colors: palette, scheme } = useTheme();

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      layout={LinearTransition}
      style={[
        styles.base,
        {
          height,
          width,
          borderRadius: radius,
          backgroundColor: scheme === 'dark' ? withAlpha(palette.border, 0.33) : withAlpha(palette.border, 0.5),
        },
        style,
      ]}
    />
  );
}

export function SkeletonRow({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.rowContainer}>
      {Array.from({ length: count }).map((_, idx) => (
        <Skeleton key={idx} width={`${Math.max(50, 100 - idx * 10)}%`} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  rowContainer: {
    gap: 10,
  },
});
