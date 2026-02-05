import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Spacing, Radii, Typography, Components } from '@/constants/theme';
import {
  ButtonStyles,
  EmptyStateStyles,
} from '@/constants/styles';

// ============================================================================
// TYPES
// ============================================================================

type LoadingVariant = 'list' | 'card' | 'detail' | 'form' | 'calendar';

interface LoadingStateProps {
  variant: LoadingVariant;
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  title?: string;
}

interface EmptyStateComponentProps {
  icon: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
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
      <Text style={errorStyles.title}>
        {title ?? 'Something went wrong'}
      </Text>
      <Text style={errorStyles.message}>{message}</Text>
      <TouchableOpacity
        style={errorStyles.retryButton}
        onPress={onRetry}
        activeOpacity={0.8}
      >
        <Text style={errorStyles.retryButtonText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

export function EmptyStateScreen({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateComponentProps) {
  return (
    <View style={EmptyStateStyles.container}>
      <View style={EmptyStateStyles.icon}>
        <Ionicons
          name={icon as any}
          size={28}
          color={Colors.light.muted}
        />
      </View>
      <Text style={EmptyStateStyles.title}>{title}</Text>
      <Text style={EmptyStateStyles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={emptyStyles.actionButton}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Text style={emptyStyles.actionButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

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

const emptyStyles = StyleSheet.create({
  actionButton: {
    ...ButtonStyles.primary,
    marginTop: Spacing.xs,
  },
  actionButtonText: {
    ...ButtonStyles.primaryText,
  },
});
