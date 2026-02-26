/**
 * GoalList Component
 *
 * A scrollable list of goals with filtering, empty states, and loading states.
 * Supports different display variants and filtering by status or category.
 */

import { useCallback } from 'react';
import { View, FlatList, RefreshControl, type ListRenderItem } from 'react-native';

import { GoalCard } from './GoalCard';
import type { Goal, GoalStatus, GoalCategory } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import {
  GoalListSkeletonInner,
  GoalSectionHeaderInner,
  GoalListEmptyState,
  styles,
} from './goal-list-sections';

interface GoalListProps {
  goals: Goal[];
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onGoalPress?: (goal: Goal) => void;
  onCreateGoal?: () => void;
  cardVariant?: 'default' | 'compact' | 'featured';
  statusFilter?: GoalStatus;
  categoryFilter?: GoalCategory;
  showMilestones?: boolean;
  emptyMessage?: string;
  emptyTitle?: string;
  ListHeaderComponent?: React.ComponentType | React.ReactElement;
  contentContainerStyle?: object;
}

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
    [cardVariant, onGoalPress, showMilestones],
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
    if (statusFilter === 'ACTIVE') return 'Create your first goal to start tracking your progress!';
    if (statusFilter === 'COMPLETED') return 'Complete some goals to see them here.';
    return 'Set goals to track your training progress and achievements.';
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <GoalListEmptyState
        title={getEmptyTitle()}
        message={getEmptyMessage()}
        showCreateButton={!!onCreateGoal && !statusFilter}
        onCreateGoal={onCreateGoal}
        palette={palette}
      />
    );
  };

  if (loading && goals.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        {ListHeaderComponent &&
          (typeof ListHeaderComponent === 'function' ? (
            <ListHeaderComponent />
          ) : (
            ListHeaderComponent
          ))}
        <GoalListSkeleton count={3} variant={cardVariant} />
      </View>
    );
  }

  return (
    <FlatList
        accessibilityRole="list"
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
        onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined
      }
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={renderEmpty}
      initialNumToRender={5}
      maxToRenderPerBatch={10}
      windowSize={5}
    />
  );
}

/** Backward-compatible wrapper — delegates to inner section component */
export function GoalListSkeleton({
  count = 3,
  variant = 'default',
}: {
  count?: number;
  variant?: 'default' | 'compact' | 'featured';
}) {
  const { colors: palette } = useTheme();
  return <GoalListSkeletonInner count={count} variant={variant} palette={palette} />;
}

/** Backward-compatible wrapper — delegates to inner section component */
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
    <GoalSectionHeaderInner
      title={title}
      count={count}
      icon={icon}
      color={color}
      palette={palette}
    />
  );
}
