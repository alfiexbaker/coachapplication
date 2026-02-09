/**
 * GoalList Component
 *
 * A scrollable list of goals with filtering, empty states, and loading states.
 * Supports different display variants and filtering by status or category.
 */

import { useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ListRenderItem } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { GoalCard } from './GoalCard';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/primitives/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spacing, Radii, withAlpha } from '@/constants/theme';
import type { Goal, GoalStatus, GoalCategory } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';

interface GoalListProps {
  /** Array of goals to display */
  goals: Goal[];
  /** Whether data is loading */
  loading?: boolean;
  /** Whether a refresh is in progress */
  refreshing?: boolean;
  /** Callback for pull-to-refresh */
  onRefresh?: () => void;
  /** Callback when a goal is pressed */
  onGoalPress?: (goal: Goal) => void;
  /** Callback to create a new goal */
  onCreateGoal?: () => void;
  /** Display variant for goal cards */
  cardVariant?: 'default' | 'compact' | 'featured';
  /** Filter by status */
  statusFilter?: GoalStatus;
  /** Filter by category */
  categoryFilter?: GoalCategory;
  /** Whether to show milestones in cards */
  showMilestones?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state title */
  emptyTitle?: string;
  /** Header component */
  ListHeaderComponent?: React.ComponentType | React.ReactElement;
  /** Content container style */
  contentContainerStyle?: object;
}

/**
 * A list of goals with filtering, loading states, and empty states.
 *
 * @example
 * ```tsx
 * <GoalList
 *   goals={goals}
 *   loading={isLoading}
 *   onGoalPress={handleGoalPress}
 *   onCreateGoal={handleCreateGoal}
 *   statusFilter="ACTIVE"
 * />
 * ```
 */
export function GoalList({
  goals,
  loading = false,
  refreshing = false,
  onRefresh,
  onGoalPress,
  onCreateGoal,
  cardVariant = 'default',
  statusFilter,
  categoryFilter,
  showMilestones = false,
  emptyMessage,
  emptyTitle,
  ListHeaderComponent,
  contentContainerStyle,
}: GoalListProps) {
  const { colors: palette } = useTheme();

  // Filter goals
  let filteredGoals = goals;
  if (statusFilter) {
    filteredGoals = filteredGoals.filter((g) => g.status === statusFilter);
  }
  if (categoryFilter) {
    filteredGoals = filteredGoals.filter((g) => g.category === categoryFilter);
  }

  const renderGoal: ListRenderItem<Goal> = useCallback(
    ({ item }) => (
      <GoalCard
        goal={item}
        variant={cardVariant}
        onPress={() => onGoalPress?.(item)}
        showMilestones={showMilestones}
      />
    ),
    [cardVariant, onGoalPress, showMilestones]
  );

  const keyExtractor = useCallback((item: Goal) => item.id, []);

  const getEmptyTitle = () => {
    if (emptyTitle) return emptyTitle;
    if (statusFilter === 'ACTIVE') return 'No Active Goals';
    if (statusFilter === 'COMPLETED') return 'No Completed Goals';
    return 'No Goals Yet';
  };

  const getEmptyMessage = () => {
    if (emptyMessage) return emptyMessage;
    if (statusFilter === 'ACTIVE') {
      return 'Create your first goal to start tracking your progress!';
    }
    if (statusFilter === 'COMPLETED') {
      return 'Complete some goals to see them here.';
    }
    return 'Set goals to track your training progress and achievements.';
  };

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <Animated.View entering={FadeIn.delay(200)} style={styles.emptyState}>
        <View style={[styles.emptyIcon, { backgroundColor: withAlpha(palette.tint, 0.15) }]}>
          <Ionicons name="flag-outline" size={48} color={palette.tint} />
        </View>
        <ThemedText type="subtitle" style={styles.emptyTitle}>
          {getEmptyTitle()}
        </ThemedText>
        <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
          {getEmptyMessage()}
        </ThemedText>
        {onCreateGoal && !statusFilter && (
          <Button onPress={onCreateGoal} style={styles.emptyButton}>
            Create Goal
          </Button>
        )}
      </Animated.View>
    );
  };

  if (loading && goals.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        {ListHeaderComponent && (
          typeof ListHeaderComponent === 'function'
            ? <ListHeaderComponent />
            : ListHeaderComponent
        )}
        <GoalListSkeleton count={3} variant={cardVariant} />
      </View>
    );
  }

  return (
    <FlatList
      data={filteredGoals}
      renderItem={renderGoal}
      keyExtractor={keyExtractor}
      contentContainerStyle={[
        styles.listContent,
        filteredGoals.length === 0 && styles.emptyListContent,
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={renderEmpty}
      initialNumToRender={5}
      maxToRenderPerBatch={10}
      windowSize={5}
    />
  );
}

/**
 * Loading skeleton for the goal list
 */
export function GoalListSkeleton({
  count = 3,
  variant = 'default',
}: {
  count?: number;
  variant?: 'default' | 'compact' | 'featured';
}) {
  const { colors: palette } = useTheme();

  const skeletonHeight = {
    default: 140,
    compact: 72,
    featured: 200,
  };

  return (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.skeletonCard,
            {
              height: skeletonHeight[variant],
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <Skeleton width="30%" height={20} />
          <Skeleton width="80%" height={16} style={{ marginTop: Spacing.xs + Spacing.xxs }} />
          <Skeleton width="60%" height={14} style={{ marginTop: 8 }} />
          {variant === 'featured' && (
            <>
              <Skeleton width="100%" height={12} style={{ marginTop: 16 }} />
              <Skeleton width="90%" height={12} style={{ marginTop: Spacing.xxs }} />
            </>
          )}
        </View>
      ))}
    </View>
  );
}

/**
 * Section header for grouping goals
 */
export function GoalSectionHeader({
  title,
  count,
  icon,
  color,
}: {
  title: string;
  count?: number;
  icon?: string;
  color?: string;
}) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        {icon && (
          <Ionicons
            name={icon as keyof typeof Ionicons.glyphMap}
            size={20}
            color={color ?? palette.tint}
          />
        )}
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          {title}
        </ThemedText>
      </View>
      {count !== undefined && (
        <View style={[styles.countBadge, { backgroundColor: palette.surfaceSecondary }]}>
          <ThemedText style={[styles.countText, { color: palette.muted }]}>
            {count}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: Radii['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: scaleFont(15),
    lineHeight: scaleFont(22),
    maxWidth: 280,
  },
  emptyButton: {
    marginTop: Spacing.sm,
  },
  skeletonContainer: {
    gap: Spacing.md,
    paddingTop: Spacing.md,
  },
  skeletonCard: {
    borderRadius: Radii.lg,
    borderWidth: 0.75,
    padding: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontSize: scaleFont(16),
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  countText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
  },
});
