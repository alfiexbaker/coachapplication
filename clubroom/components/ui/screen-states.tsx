/**
 * Screen States
 *
 * Reusable components for common screen states:
 * - LoadingState: Skeleton loading with variants (list, card, detail, form, calendar)
 * - ErrorState: Error display with retry button
 * - EmptyState: Re-exported from empty-state.tsx for convenience
 *
 * Usage:
 *   <LoadingState variant="list" />
 *   <ErrorState message="Failed to load" onRetry={refetch} />
 *   <EmptyState title="No items" message="Add your first item" />
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Spacing, Radii, Typography, Components } from '@/constants/theme';
import { ButtonStyles } from '@/constants/styles';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { useTheme } from '@/hooks/useTheme';

// Re-export EmptyState for convenience (single source of truth)
export { EmptyState } from './empty-state';

// ============================================================================
// TYPES
// ============================================================================

export type LoadingVariant = 'list' | 'card' | 'detail' | 'form' | 'calendar';

export interface LoadingStateProps {
  variant: LoadingVariant;
}

export interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  title?: string;
}

// ============================================================================
// SHIMMER BLOCK (shared animated skeleton element)
// ============================================================================

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
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  const backgroundColor = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [baseColor, highlightColor, baseColor],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as number | `${number}%`,
          height,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
}

// ============================================================================
// SKELETON TYPES
// ============================================================================

interface SkeletonColors {
  baseColor: string;
  highlightColor: string;
}

// ============================================================================
// LIST VARIANT: 5 rows with circle avatar + 2 text lines
// ============================================================================

function ListSkeleton({ baseColor, highlightColor }: SkeletonColors) {
  return (
    <View style={skeletonStyles.listContainer}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={skeletonStyles.listRow}>
          <ShimmerBlock
            width={Components.avatar.sm}
            height={Components.avatar.sm}
            borderRadius={Components.avatar.sm / 2}
            baseColor={baseColor}
            highlightColor={highlightColor}
          />
          <View style={skeletonStyles.listTextGroup}>
            <ShimmerBlock width="70%" height={14} baseColor={baseColor} highlightColor={highlightColor} />
            <ShimmerBlock width="45%" height={12} baseColor={baseColor} highlightColor={highlightColor} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// CARD VARIANT: 3 card rectangles with text placeholders
// ============================================================================

function CardSkeleton({ baseColor, highlightColor }: SkeletonColors) {
  return (
    <View style={skeletonStyles.cardContainer}>
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} style={skeletonStyles.card}>
          <ShimmerBlock width="100%" height={120} borderRadius={Radii.card} baseColor={baseColor} highlightColor={highlightColor} />
          <View style={skeletonStyles.cardTextGroup}>
            <ShimmerBlock width="60%" height={14} baseColor={baseColor} highlightColor={highlightColor} />
            <ShimmerBlock width="80%" height={12} baseColor={baseColor} highlightColor={highlightColor} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// DETAIL VARIANT: hero rect + title line + 4 body lines
// ============================================================================

function DetailSkeleton({ baseColor, highlightColor }: SkeletonColors) {
  return (
    <View style={skeletonStyles.detailContainer}>
      <ShimmerBlock width="100%" height={200} borderRadius={Radii.card} baseColor={baseColor} highlightColor={highlightColor} />
      <ShimmerBlock
        width="50%"
        height={20}
        style={skeletonStyles.detailTitleSpacing}
        baseColor={baseColor}
        highlightColor={highlightColor}
      />
      {Array.from({ length: 4 }).map((_, i) => (
        <ShimmerBlock
          key={i}
          width={i === 3 ? '65%' : '100%'}
          height={14}
          style={skeletonStyles.detailLineSpacing}
          baseColor={baseColor}
          highlightColor={highlightColor}
        />
      ))}
    </View>
  );
}

// ============================================================================
// FORM VARIANT: 4 label + input pairs
// ============================================================================

function FormSkeleton({ baseColor, highlightColor }: SkeletonColors) {
  return (
    <View style={skeletonStyles.formContainer}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={skeletonStyles.formField}>
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

// ============================================================================
// CALENDAR VARIANT: month header + 7x5 grid of small squares
// ============================================================================

function CalendarSkeleton({ baseColor, highlightColor }: SkeletonColors) {
  const cellSize = 36;

  return (
    <View style={skeletonStyles.calendarContainer}>
      <ShimmerBlock width={160} height={18} style={skeletonStyles.calendarHeader} baseColor={baseColor} highlightColor={highlightColor} />
      <View style={skeletonStyles.calendarGrid}>
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

// ============================================================================
// LOADING STATE
// ============================================================================

const VARIANT_MAP: Record<LoadingVariant, React.FC<SkeletonColors>> = {
  list: ListSkeleton,
  card: CardSkeleton,
  detail: DetailSkeleton,
  form: FormSkeleton,
  calendar: CalendarSkeleton,
};

export function LoadingState({ variant }: LoadingStateProps) {
  const { colors } = useTheme();
  const VariantComponent = VARIANT_MAP[variant];
  return (
    <View style={loadingStyles.container}>
      <VariantComponent baseColor={colors.border} highlightColor={colors.background} />
    </View>
  );
}

// ============================================================================
// ERROR STATE
// ============================================================================

export function ErrorState({ message, onRetry, title }: ErrorStateProps) {
  const { colors } = useTheme();

  return (
    <View style={errorStyles.container}>
      <Ionicons
        name="alert-circle-outline"
        size={48}
        color={colors.error}
      />
      <ThemedText style={[errorStyles.title, { color: colors.text }]}>
        {title ?? 'Something went wrong'}
      </ThemedText>
      <ThemedText style={[errorStyles.message, { color: colors.muted }]}>
        {message}
      </ThemedText>
      <Clickable
        onPress={onRetry}
        style={errorStyles.retryButton}
        accessibilityLabel="Try again"
        accessibilityRole="button"
      >
        <ThemedText style={errorStyles.retryButtonText}>Try again</ThemedText>
      </Clickable>
    </View>
  );
}

// ============================================================================
// EMPTY STATE - Use EmptyState from './empty-state' (re-exported above)
// ============================================================================

/**
 * @deprecated Use EmptyState from '@/components/ui/empty-state' instead
 */
export const EmptyStateScreen = null; // Removed - use EmptyState instead

// ============================================================================
// STYLESHEETS
// ============================================================================

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.sm,
  },
});

const skeletonStyles = StyleSheet.create({
  // List
  listContainer: {
    gap: Spacing.sm,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  listTextGroup: {
    flex: 1,
    gap: Spacing.xs,
  },

  // Card
  cardContainer: {
    gap: Spacing.md,
  },
  card: {
    gap: Spacing.xs,
  },
  cardTextGroup: {
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },

  // Detail
  detailContainer: {
    gap: 0,
  },
  detailTitleSpacing: {
    marginTop: Spacing.md,
  },
  detailLineSpacing: {
    marginTop: Spacing.xs,
  },

  // Form
  formContainer: {
    gap: Spacing.md,
  },
  formField: {
    gap: Spacing.xs,
  },

  // Calendar
  calendarContainer: {
    gap: Spacing.sm,
  },
  calendarHeader: {
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
});

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  title: {
    ...Typography.heading,
    textAlign: 'center',
  },
  message: {
    ...Typography.body,
    textAlign: 'center',
  },
  retryButton: {
    ...ButtonStyles.primary,
    marginTop: Spacing.xs,
  },
  retryButtonText: {
    ...ButtonStyles.primaryText,
  },
});

// Empty styles removed - EmptyState is now the single source of truth
