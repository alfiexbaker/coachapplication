/**
 * Hook: useDrillsScreen
 *
 * Manages drills dashboard (athlete view) state: load assignments, filter, complete.
 * Used by app/drills/index.tsx
 */

import { useState, useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { drillService } from '@/services/drill-service';
import type { AssignedDrill, DrillAssignmentStats } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

export type TabFilter = 'pending' | 'completed' | 'all';

const logger = createLogger('useDrillsScreen');

interface DrillsDashboardData {
  assignments: AssignedDrill[];
  stats: DrillAssignmentStats | null;
}

export function useDrillsScreen() {
  const { currentUser } = useAuth();
  const userId = currentUser?.id ?? 'user1';

  const [activeTab, setActiveTab] = useState<TabFilter>('pending');

  const loadData = useCallback(async () => {
    try {
      const [assignmentsData, statsData] = await Promise.all([
        drillService.getAthleteAssignments(userId, true),
        drillService.getAssignmentStats(userId),
      ]);

      return ok<DrillsDashboardData>({
        assignments: assignmentsData,
        stats: statsData,
      });
    } catch (loadError) {
      logger.error('Failed to load drills', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load drills.', loadError));
    }
  }, [userId]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<DrillsDashboardData>({
    load: loadData,
    deps: [userId],
    isEmpty: (value) => value.assignments.length === 0,
    refetchOnFocus: true,
  });

  const assignments = data?.assignments ?? [];
  const stats = data?.stats ?? null;

  const filteredAssignments = useMemo(() => {
    if (activeTab === 'pending') return assignments.filter((a) => !a.isCompleted);
    if (activeTab === 'completed') return assignments.filter((a) => a.isCompleted);
    return assignments;
  }, [assignments, activeTab]);

  const handleAssignmentPress = useCallback((assignment: AssignedDrill) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(Routes.drill(assignment.id));
  }, []);

  const handleComplete = useCallback(
    async (
      assignment: AssignedDrill,
      completion?: { evidenceVideoUri?: string; notes?: string },
    ) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        if (assignment.isCompleted) {
          await drillService.uncompleteDrill(assignment.id);
        } else {
          await drillService.completeDrill(assignment.id, {
            evidenceVideoUri: completion?.evidenceVideoUri,
            evidenceNotes: completion?.notes,
          });
        }
        retry();
      } catch (error) {
        logger.error('Failed to toggle completion:', error);
      }
    },
    [retry],
  );

  const handleTabChange = useCallback((tab: TabFilter) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  }, []);

  return {
    stats,
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    activeTab,
    filteredAssignments,
    handleRefresh: onRefresh,
    handleAssignmentPress,
    handleComplete,
    handleTabChange,
  } satisfies {
    stats: DrillAssignmentStats | null;
    loading: boolean;
    status: ScreenStatus;
    error: ServiceError | null;
    refreshing: boolean;
    onRefresh: () => void;
    retry: () => void;
    activeTab: TabFilter;
    filteredAssignments: AssignedDrill[];
    handleRefresh: () => void;
    handleAssignmentPress: (assignment: AssignedDrill) => void;
    handleComplete: (
      assignment: AssignedDrill,
      completion?: { evidenceVideoUri?: string; notes?: string },
    ) => Promise<void>;
    handleTabChange: (tab: TabFilter) => void;
  };
}
