import React, { useEffect } from 'react';
import {
  AccessibilityInfo,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Radii, Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type SkeletonProps = {
  height?: number;
  width?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

interface SkeletonCircleProps extends Omit<SkeletonProps, 'height' | 'width' | 'radius'> {
  size?: number;
}

interface SkeletonTextProps {
  lines?: number;
  widths?: DimensionValue[];
  lineHeight?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

interface SkeletonClusterProps {
  children: React.ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Lightweight pulse skeleton for route and section placeholders.
 * Avoids mount/layout transitions so heavy skeleton views do not add their own jank.
 */
export function Skeleton({
  height = 16,
  width = '100%',
  radius = Radii.md,
  style,
  accessibilityLabel = 'Loading content',
}: SkeletonProps) {
  const { colors: palette, scheme } = useTheme();
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    let isMounted = true;
    const applyMotionPreference = (enabled: boolean) => {
      cancelAnimation(pulseOpacity);
      if (enabled) {
        pulseOpacity.set(1);
        return;
      }
      pulseOpacity.set(withRepeat(withTiming(0.6, { duration: 1000 }), -1, true));
    };

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (isMounted) applyMotionPreference(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      applyMotionPreference,
    );
    return () => {
      isMounted = false;
      cancelAnimation(pulseOpacity);
      subscription.remove();
    };
  }, [pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
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
        pulseStyle,
        style,
      ]}
    />
  );
}

export function SkeletonCircle({ size = 40, style, accessibilityLabel }: SkeletonCircleProps) {
  return (
    <Skeleton
      height={size}
      width={size}
      radius={size / 2}
      style={style}
      accessibilityLabel={accessibilityLabel ?? 'Loading avatar'}
    />
  );
}

export function SkeletonPill({
  width = 88,
  height = 28,
  radius = Radii.rounded,
  style,
  accessibilityLabel = 'Loading chip',
}: SkeletonProps) {
  return (
    <Skeleton
      height={height}
      width={width}
      radius={radius}
      style={style}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

export function SkeletonText({
  lines = 3,
  widths,
  lineHeight = 12,
  gap = Spacing.xs,
  style,
  accessibilityLabel = 'Loading text',
}: SkeletonTextProps) {
  const resolvedWidths =
    widths && widths.length > 0
      ? widths
      : Array.from({ length: lines }).map((_, index) => {
          if (index === 0) return '100%';
          if (index === lines - 1) return '62%';
          return `${Math.max(72, 92 - index * 8)}%` as DimensionValue;
        });

  return (
    <View
      style={[styles.stack, { gap }, style]}
      accessibilityRole="none"
      accessibilityLabel={accessibilityLabel}
    >
      {resolvedWidths.map((lineWidth, index) => (
        <Skeleton
          key={`${lineWidth}-${index}`}
          width={lineWidth}
          height={lineHeight}
          radius={Radii.sm}
          accessibilityLabel={`${accessibilityLabel} line ${index + 1}`}
        />
      ))}
    </View>
  );
}

export function SkeletonCluster({
  children,
  gap = Spacing.sm,
  style,
  accessibilityLabel = 'Loading section',
}: SkeletonClusterProps) {
  return (
    <View
      style={[styles.stack, { gap }, style]}
      pointerEvents="none"
      accessibilityRole="none"
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </View>
  );
}

export function SkeletonRow({ count = 3, widths }: { count?: number; widths?: DimensionValue[] }) {
  const rowWidths =
    widths && widths.length > 0
      ? widths
      : Array.from({ length: count }).map(
          (_, idx) => `${Math.max(50, 100 - idx * 10)}%` as DimensionValue,
        );

  return (
    <View style={styles.rowContainer} accessibilityRole="none" accessibilityLabel="Loading content">
      {rowWidths.map((width, idx) => (
        <Skeleton
          key={`${width}-${idx}`}
          width={width}
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
  stack: {
    gap: Spacing.xs,
  },
  rowContainer: {
    gap: Spacing.xs,
  },
});
