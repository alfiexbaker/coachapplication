import { useState, useCallback, useMemo } from 'react';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { progressService } from '@/services/progress-service';
import { createLogger } from '@/utils/logger';
import type { Goal, GoalCategory } from '@/constants/types';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('GoalsDashboardScreen');

export type TabFilter = 'active' | 'completed' | 'all';

export const GOAL_CATEGORIES: GoalCategory[] = [
  'BALL_SKILLS',
  'ATTACKING',
  'DEFENDING',
  'GAME_SENSE',
  'CHARACTER',
  'OTHER',
];

export function useGoalsDashboard() {
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<TabFilter>('active');
  const [categoryFilter, setCategoryFilter] = useState<GoalCategory | null>(null);

  const userId = currentUser?.id ?? 'user1';

  const loadGoals = useCallback(async () => {
    try {
      const userGoals = await progressService.getUserGoals(userId);
      return ok<{ goals: Goal[] }>({ goals: userGoals });
    } catch (error) {
      logger.error('Failed to load goals', error);
      return err(serviceError('UNKNOWN', 'Failed to load goals.', error));
    }
  }, [userId]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<{ goals: Goal[] }>({
    load: loadGoals,
    deps: [userId],
    isEmpty: (value) => value.goals.length === 0,
    refetchOnFocus: true,
  });

  const goals = data?.goals ?? [];

  const handleRefresh = onRefresh;

  const filteredGoals = useMemo(() => {
    let filtered = goals;
    if (activeTab === 'active')
      filtered = filtered.filter((g) => g.status === 'ACTIVE' || g.status === 'PAUSED');
    else if (activeTab === 'completed') filtered = filtered.filter((g) => g.status === 'COMPLETED');
    if (categoryFilter) filtered = filtered.filter((g) => g.category === categoryFilter);
    return filtered;
  }, [goals, activeTab, categoryFilter]);

  const stats = useMemo(() => {
    const active = goals.filter((g) => g.status === 'ACTIVE').length;
    const completed = goals.filter((g) => g.status === 'COMPLETED').length;
    const activeGoals = goals.filter((g) => g.status === 'ACTIVE');
    const avgProgress =
      activeGoals.length > 0
        ? Math.round(activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length)
        : 0;
    return { active, completed, total: goals.length, avgProgress };
  }, [goals]);

  const handleTabChange = useCallback((tab: TabFilter) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  }, []);

  const handleCategoryToggle = useCallback((cat: GoalCategory) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCategoryFilter((prev) => (prev === cat ? null : cat));
  }, []);

  return {
    goals: filteredGoals,
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    activeTab,
    categoryFilter,
    stats,
    handleRefresh,
    retry,
    handleTabChange,
    handleCategoryToggle,
  } satisfies {
    goals: Goal[];
    loading: boolean;
    status: ScreenStatus;
    error: ServiceError | null;
    refreshing: boolean;
    activeTab: TabFilter;
    categoryFilter: GoalCategory | null;
    stats: { active: number; completed: number; total: number; avgProgress: number };
    handleRefresh: () => void;
    retry: () => void;
    handleTabChange: (tab: TabFilter) => void;
    handleCategoryToggle: (cat: GoalCategory) => void;
  };
}
