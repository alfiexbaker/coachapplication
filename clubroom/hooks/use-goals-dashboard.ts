import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/hooks/use-auth';
import { progressService } from '@/services/progress-service';
import { createLogger } from '@/utils/logger';
import type { Goal, GoalCategory } from '@/constants/types';

const logger = createLogger('GoalsDashboardScreen');

export type TabFilter = 'active' | 'completed' | 'all';

export const GOAL_CATEGORIES: GoalCategory[] = ['SPEED', 'TECHNIQUE', 'FITNESS', 'TACTICAL', 'MENTAL', 'OTHER'];

export function useGoalsDashboard() {
  const { currentUser } = useAuth();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>('active');
  const [categoryFilter, setCategoryFilter] = useState<GoalCategory | null>(null);

  const userId = currentUser?.id ?? 'user1';

  const loadGoals = useCallback(async () => {
    try {
      const userGoals = await progressService.getUserGoals(userId);
      setGoals(userGoals);
    } catch (error) {
      logger.error('Failed to load goals', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [loadGoals])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadGoals();
  }, [loadGoals]);

  const filteredGoals = useMemo(() => {
    let filtered = goals;
    if (activeTab === 'active') filtered = filtered.filter((g) => g.status === 'ACTIVE' || g.status === 'PAUSED');
    else if (activeTab === 'completed') filtered = filtered.filter((g) => g.status === 'COMPLETED');
    if (categoryFilter) filtered = filtered.filter((g) => g.category === categoryFilter);
    return filtered;
  }, [goals, activeTab, categoryFilter]);

  const stats = useMemo(() => {
    const active = goals.filter((g) => g.status === 'ACTIVE').length;
    const completed = goals.filter((g) => g.status === 'COMPLETED').length;
    const activeGoals = goals.filter((g) => g.status === 'ACTIVE');
    const avgProgress = activeGoals.length > 0
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
    goals: filteredGoals, loading, refreshing, activeTab, categoryFilter, stats,
    handleRefresh, handleTabChange, handleCategoryToggle,
  };
}
