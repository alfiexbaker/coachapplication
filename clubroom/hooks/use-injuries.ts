/**
 * Hook for the Injury History screen.
 * Manages injury loading, status filtering, and navigation.
 */

import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/use-auth';
import { injuryService } from '@/services/injury-service';
import { createLogger } from '@/utils/logger';
import type { Injury, InjuryStatus } from '@/constants/types';

const logger = createLogger('InjuryHistoryScreen');

export type StatusFilter = InjuryStatus | 'ALL';

export function useInjuries() {
  const { currentUser } = useAuth();

  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const userId = currentUser?.id ?? 'user1';

  const loadInjuries = useCallback(async () => {
    try {
      const userInjuries = await injuryService.getUserInjuries(userId, true);
      setInjuries(userInjuries);
    } catch (error) {
      logger.error('Failed to load injuries:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { loadInjuries(); }, [loadInjuries]));

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadInjuries();
  }, [loadInjuries]);

  const filteredInjuries = useMemo(() => {
    if (statusFilter === 'ALL') return injuries;
    return injuries.filter((i) => i.status === statusFilter);
  }, [injuries, statusFilter]);

  const counts = useMemo(() => ({
    ALL: injuries.length,
    ACTIVE: injuries.filter((i) => i.status === 'ACTIVE').length,
    RECOVERING: injuries.filter((i) => i.status === 'RECOVERING').length,
    HEALED: injuries.filter((i) => i.status === 'HEALED').length,
  }), [injuries]);

  const handleInjuryPress = useCallback((injury: Injury) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(Routes.healthEntry(injury.id));
  }, []);

  const handleFilterChange = useCallback((filter: StatusFilter) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStatusFilter(filter);
  }, []);

  const handleLogInjury = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(Routes.HEALTH_LOG);
  }, []);

  return {
    injuries, loading, refreshing, statusFilter, filteredInjuries, counts,
    handleRefresh, handleInjuryPress, handleFilterChange, handleLogInjury,
  };
}
