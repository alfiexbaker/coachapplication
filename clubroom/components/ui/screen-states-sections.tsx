/**
 * Extracted skeleton variants for LoadingState.
 *
 * ShimmerBlock — animated shimmer placeholder element.
 * ListSkeleton, CardSkeleton, DetailSkeleton, FormSkeleton, CalendarSkeleton.
 * VARIANT_MAP — maps LoadingVariant to skeleton component.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolateColor } from 'react-native-reanimated';

import { Spacing, Radii, Components } from '@/constants/theme';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SkeletonColors {
  baseColor: string;
  highlightColor: string;
}

export type LoadingVariant = 'list' | 'card' | 'detail' | 'form' | 'calendar';

// ─── ShimmerBlock ────────────────────────────────────────────────────────────

function ShimmerBlock({
  width,
  height,
  borderRadius = Radii.sm,
  style,
  baseColor,
  highlightColor,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
  baseColor: string;
  highlightColor: string;
}) {
  const shimmerAnim = useSharedValue(0);

  useEffect(() => {
    shimmerAnim.value = withRepeat(withTiming(1, { duration: 1200 }), -1, false);
  }, [shimmerAnim]);

  const animStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      shimmerAnim.value,
      [0, 0.5, 1],
      [baseColor, highlightColor, baseColor],
    ),
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as number | `${number}%`,
          height,
          borderRadius,
        },
        animStyle,
        style,
      ]}
    />
  );
}

// ─── ListSkeleton ────────────────────────────────────────────────────────────

function ListSkeleton({ baseColor, highlightColor }: SkeletonColors) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={styles.listRow}>
          <ShimmerBlock
            width={Components.avatar.sm}
            height={Components.avatar.sm}
            borderRadius={Components.avatar.sm / 2}
            baseColor={baseColor}
            highlightColor={highlightColor}
          />
          <View style={styles.listTextGroup}>
            <ShimmerBlock width="70%" height={14} baseColor={baseColor} highlightColor={highlightColor} />
            <ShimmerBlock width="45%" height={12} baseColor={baseColor} highlightColor={highlightColor} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── CardSkeleton ────────────────────────────────────────────────────────────

function CardSkeleton({ baseColor, highlightColor }: SkeletonColors) {
  return (
    <View style={styles.cardContainer}>
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} style={styles.card}>
          <ShimmerBlock width="100%" height={120} borderRadius={Radii.card} baseColor={baseColor} highlightColor={highlightColor} />
          <View style={styles.cardTextGroup}>
            <ShimmerBlock width="60%" height={14} baseColor={baseColor} highlightColor={highlightColor} />
            <ShimmerBlock width="80%" height={12} baseColor={baseColor} highlightColor={highlightColor} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── DetailSkeleton ──────────────────────────────────────────────────────────

function DetailSkeleton({ baseColor, highlightColor }: SkeletonColors) {
  return (
    <View style={styles.detailContainer}>
      <ShimmerBlock width="100%" height={200} borderRadius={Radii.card} baseColor={baseColor} highlightColor={highlightColor} />
      <ShimmerBlock
        width="50%"
        height={20}
        style={styles.detailTitleSpacing}
        baseColor={baseColor}
        highlightColor={highlightColor}
      />
      {Array.from({ length: 4 }).map((_, i) => (
        <ShimmerBlock
          key={i}
          width={i === 3 ? '65%' : '100%'}
          height={14}
          style={styles.detailLineSpacing}
          baseColor={baseColor}
          highlightColor={highlightColor}
        />
      ))}
    </View>
  );
}

// ─── FormSkeleton ────────────────────────────────────────────────────────────

function FormSkeleton({ baseColor, highlightColor }: SkeletonColors) {
  return (
    <View style={styles.formContainer}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={styles.formField}>
          <ShimmerBlock width={100} height={12} baseColor={baseColor} highlightColor={highlightColor} />
          <ShimmerBlock
            width="100%"
            height={Components.input.height}
            borderRadius={Radii.md}
            baseColor={baseColor}
            highlightColor={highlightColor}
          />
        </View>
      ))}
    </View>
  );
}

// ─── CalendarSkeleton ────────────────────────────────────────────────────────

function CalendarSkeleton({ baseColor, highlightColor }: SkeletonColors) {
  const cellSize = 36;

  return (
    <View style={styles.calendarContainer}>
      <ShimmerBlock width={160} height={18} style={styles.calendarHeader} baseColor={baseColor} highlightColor={highlightColor} />
      <View style={styles.calendarGrid}>
        {Array.from({ length: 7 }).map((_, dayIndex) => (
          <ShimmerBlock key={`header-${dayIndex}`} width={cellSize} height={14} baseColor={baseColor} highlightColor={highlightColor} />
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <ShimmerBlock
            key={i}
            width={cellSize}
            height={cellSize}
            borderRadius={Radii.sm}
            baseColor={baseColor}
            highlightColor={highlightColor}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Variant Map ─────────────────────────────────────────────────────────────

export const VARIANT_MAP: Record<LoadingVariant, React.FC<SkeletonColors>> = {
  list: ListSkeleton,
  card: CardSkeleton,
  detail: DetailSkeleton,
  form: FormSkeleton,
  calendar: CalendarSkeleton,
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  listContainer: { gap: Spacing.sm },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  listTextGroup: { flex: 1, gap: Spacing.xs },
  cardContainer: { gap: Spacing.md },
  card: { gap: Spacing.xs },
  cardTextGroup: { gap: Spacing.xs, paddingHorizontal: Spacing.xs },
  detailContainer: { gap: 0 },
  detailTitleSpacing: { marginTop: Spacing.md },
  detailLineSpacing: { marginTop: Spacing.xs },
  formContainer: { gap: Spacing.md },
  formField: { gap: Spacing.xs },
  calendarContainer: { gap: Spacing.sm },
  calendarHeader: { alignSelf: 'center', marginBottom: Spacing.xs },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
});
