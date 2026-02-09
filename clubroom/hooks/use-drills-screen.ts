/**
 * Hook: useDrillsScreen
 *
 * Manages drills dashboard (athlete view) state: load assignments, filter, complete.
 * Used by app/drills/index.tsx
 */

import { useState, useCallback, useMemo } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Routes } from '@/navigation/routes';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/hooks/use-auth';
import { drillService } from '@/services/drill-service';
import type { AssignedDrill, DrillAssignmentStats } from '@/constants/types';
import { createLogger } from '@/utils/logger';

export type TabFilter = 'pending' | 'completed' | 'all';

const logger = createLogger('useDrillsScreen');

export function useDrillsScreen() {
  const { currentUser } = useAuth();
  const userId = currentUser?.id ?? 'user1';

  const [assignments, setAssignments] = useState<AssignedDrill[]>([]);
  const [stats, setStats] = useState<DrillAssignmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>('pending');

  const loadData = useCallback(async () => {
    try {
      const [assignmentsData, statsData] = await Promise.all([
        drillService.getAthleteAssignments(userId, true),
        drillService.getAssignmentStats(userId),
      ]);
      setAssignments(assignmentsData);
      setStats(statsData);
    } catch (error) {
      logger.error('Failed to load drills:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const filteredAssignments = useMemo(() => {
    if (activeTab === 'pending') return assignments.filter((a) => !a.isCompleted);
    if (activeTab === 'completed') return assignments.filter((a) => a.isCompleted);
    return assignments;
  }, [assignments, activeTab]);

  const handleAssignmentPress = useCallback((assignment: AssignedDrill) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(Routes.drill(assignment.id));
  }, []);

  const handleComplete = useCallback(async (assignment: AssignedDrill) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (assignment.isCompleted) {
        await drillService.uncompleteDrill(assignment.id);
      } else {
        await drillService.completeDrill(assignment.id);
      }
      loadData();
    } catch (error) {
      logger.error('Failed to toggle completion:', error);
    }
  }, [loadData]);

  const handleTabChange = useCallback((tab: TabFilter) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  }, []);

  return {
    stats, loading, refreshing, activeTab, filteredAssignments,
    handleRefresh, handleAssignmentPress, handleComplete, handleTabChange,
  };
}
