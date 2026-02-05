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
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Spacing, Radii, Typography, Components } from '@/constants/theme';
import { ButtonStyles } from '@/constants/styles';
import { ThemedText } from '@/components/themed-text';

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
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
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
    outputRange: [
      Colors.light.border,   // #E5E7EB base
      Colors.light.background, // #F7F8FB highlight (canvas)
      Colors.light.border,   // #E5E7EB base
    ],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
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
// LIST VARIANT: 5 rows with circle avatar + 2 text lines
// ============================================================================

function ListSkeleton() {
  return (
    <View style={skeletonStyles.listContainer}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={skeletonStyles.listRow}>
          <ShimmerBlock
            width={Components.avatar.sm}
            height={Components.avatar.sm}
            borderRadius={Components.avatar.sm / 2}
          />
          <View style={skeletonStyles.listTextGroup}>
            <ShimmerBlock width="70%" height={14} />
            <ShimmerBlock width="45%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// CARD VARIANT: 3 card rectangles with text placeholders
// ============================================================================

function CardSkeleton() {
  return (
    <View style={skeletonStyles.cardContainer}>
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} style={skeletonStyles.card}>
          <ShimmerBlock width="100%" height={120} borderRadius={Radii.card} />
          <View style={skeletonStyles.cardTextGroup}>
            <ShimmerBlock width="60%" height={14} />
            <ShimmerBlock width="80%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// DETAIL VARIANT: hero rect + title line + 4 body lines
// ============================================================================

function DetailSkeleton() {
  return (
    <View style={skeletonStyles.detailContainer}>
      <ShimmerBlock width="100%" height={200} borderRadius={Radii.card} />
      <ShimmerBlock
        width="50%"
        height={20}
        style={skeletonStyles.detailTitleSpacing}
      />
      {Array.from({ length: 4 }).map((_, i) => (
        <ShimmerBlock
          key={i}
          width={i === 3 ? '65%' : '100%'}
          height={14}
          style={skeletonStyles.detailLineSpacing}
        />
      ))}
    </View>
  );
}

// ============================================================================
// FORM VARIANT: 4 label + input pairs
// ============================================================================

function FormSkeleton() {
  return (
    <View style={skeletonStyles.formContainer}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={skeletonStyles.formField}>
          <ShimmerBlock width={100} height={12} />
          <ShimmerBlock
            width="100%"
            height={Components.input.height}
            borderRadius={Radii.md}
          />
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// CALENDAR VARIANT: month header + 7x5 grid of small squares
// ============================================================================

function CalendarSkeleton() {
  const cellSize = 36;

  return (
    <View style={skeletonStyles.calendarContainer}>
      <ShimmerBlock width={160} height={18} style={skeletonStyles.calendarHeader} />
      <View style={skeletonStyles.calendarGrid}>
        {Array.from({ length: 7 }).map((_, dayIndex) => (
          <ShimmerBlock key={`header-${dayIndex}`} width={cellSize} height={14} />
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <ShimmerBlock
            key={i}
            width={cellSize}
            height={cellSize}
            borderRadius={Radii.sm}
          />
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// LOADING STATE
// ============================================================================

const VARIANT_MAP: Record<LoadingVariant, React.FC> = {
  list: ListSkeleton,
  card: CardSkeleton,
  detail: DetailSkeleton,
  form: FormSkeleton,
  calendar: CalendarSkeleton,
};

export function LoadingState({ variant }: LoadingStateProps) {
  const VariantComponent = VARIANT_MAP[variant];
  return (
    <View style={loadingStyles.container}>
      <VariantComponent />
    </View>
  );
}

// ============================================================================
// ERROR STATE
// ============================================================================

export function ErrorState({ message, onRetry, title }: ErrorStateProps) {
  return (
    <View style={errorStyles.container}>
      <Ionicons
        name="alert-circle-outline"
        size={48}
        color={Colors.light.error}
      />
      <ThemedText style={errorStyles.title}>
        {title ?? 'Something went wrong'}
      </ThemedText>
      <ThemedText style={errorStyles.message}>{message}</ThemedText>
      <TouchableOpacity
        style={errorStyles.retryButton}
        onPress={onRetry}
        activeOpacity={0.8}
      >
        <ThemedText style={errorStyles.retryButtonText}>Try again</ThemedText>
      </TouchableOpacity>
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
    color: Colors.light.text,
    textAlign: 'center',
  },
  message: {
    ...Typography.body,
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: 22,
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
