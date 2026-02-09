/**
 * Hook: useDrillLibrary
 *
 * Manages drill library screen state: load drills, filter by category, search.
 * Used by app/drills/library.tsx
 */

import { useState, useCallback, useMemo } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Routes } from '@/navigation/routes';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/hooks/use-auth';
import { drillService } from '@/services/drill-service';
import type { Drill, DrillCategory } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useDrillLibrary');

export const CATEGORIES: (DrillCategory | null)[] = [null, 'WARMUP', 'TECHNIQUE', 'FITNESS', 'COOLDOWN', 'TACTICAL'];

export function useDrillLibrary() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? 'coach1';

  const [drills, setDrills] = useState<Drill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<DrillCategory | null>(null);
  const [searchQuery] = useState('');

  const loadData = useCallback(async () => {
    try {
      const data = await drillService.getDrillLibrary(coachId);
      setDrills(data);
    } catch (error) {
      logger.error('Failed to load drill library:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [coachId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const filteredDrills = useMemo(() => {
    let filtered = drills;
    if (categoryFilter) filtered = filtered.filter((d) => d.category === categoryFilter);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((d) =>
        d.title.toLowerCase().includes(query) || d.description.toLowerCase().includes(query) || d.tags?.some((t) => t.toLowerCase().includes(query))
      );
    }
    return filtered;
  }, [drills, categoryFilter, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: drills.length };
    for (const drill of drills) { counts[drill.category] = (counts[drill.category] ?? 0) + 1; }
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
    drills, filteredDrills, loading, refreshing, categoryFilter, searchQuery, categoryCounts,
    handleRefresh, handleDrillPress, handleCreateDrill, handleCategoryChange,
  };
}
