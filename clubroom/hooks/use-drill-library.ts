/**
 * Hook: useDrillLibrary
 *
 * Manages drill library screen state: load drills, filter by category, search.
 * Used by app/drills/library.tsx
 */

import { useState, useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { drillService } from '@/services/drill-service';
import type { Drill, DrillCategory } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('useDrillLibrary');

export const CATEGORIES: (DrillCategory | null)[] = [
  null,
  'WARMUP',
  'TECHNIQUE',
  'FITNESS',
  'COOLDOWN',
  'TACTICAL',
];

interface DrillLibraryData {
  drills: Drill[];
}

export function useDrillLibrary() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? 'coach1';

  const [categoryFilter, setCategoryFilter] = useState<DrillCategory | null>(null);
  const [searchQuery] = useState('');

  const loadData = useCallback(async () => {
    try {
      const data = await drillService.getDrillLibrary(coachId);
      return ok<DrillLibraryData>({ drills: data });
    } catch (loadError) {
      logger.error('Failed to load drill library', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load drill library.', loadError));
    }
  }, [coachId]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<DrillLibraryData>({
    load: loadData,
    deps: [coachId],
    isEmpty: (value) => value.drills.length === 0,
    refetchOnFocus: true,
  });

  const drills = data?.drills ?? [];

  const filteredDrills = useMemo(() => {
    let filtered = drills;
    if (categoryFilter) filtered = filtered.filter((d) => d.category === categoryFilter);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (d) =>
          d.title.toLowerCase().includes(query) ||
          d.description.toLowerCase().includes(query) ||
          d.tags?.some((t) => t.toLowerCase().includes(query)),
      );
    }
    return filtered;
  }, [drills, categoryFilter, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: drills.length };
    for (const drill of drills) {
      counts[drill.category] = (counts[drill.category] ?? 0) + 1;
    }
    return counts;
  }, [drills]);

  const handleDrillPress = useCallback((drill: Drill) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(Routes.drillsAssignWith(drill.id));
  }, []);

  const handleCreateDrill = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(Routes.DRILLS_CREATE);
  }, []);

  const handleCategoryChange = useCallback((category: DrillCategory | null) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCategoryFilter(category);
  }, []);

  return {
    drills,
    filteredDrills,
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    categoryFilter,
    searchQuery,
    categoryCounts,
    handleRefresh: onRefresh,
    handleDrillPress,
    handleCreateDrill,
    handleCategoryChange,
  } satisfies {
    drills: Drill[];
    filteredDrills: Drill[];
    loading: boolean;
    status: ScreenStatus;
    error: ServiceError | null;
    refreshing: boolean;
    onRefresh: () => void;
    retry: () => void;
    categoryFilter: DrillCategory | null;
    searchQuery: string;
    categoryCounts: Record<string, number>;
    handleRefresh: () => void;
    handleDrillPress: (drill: Drill) => void;
    handleCreateDrill: () => void;
    handleCategoryChange: (category: DrillCategory | null) => void;
  };
}
