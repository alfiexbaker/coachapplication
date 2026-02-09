/**
 * Hook: useHealthHub
 *
 * Manages health dashboard screen state: load injuries + stats, navigation handlers.
 * Used by app/health/index.tsx
 */

import { useState, useCallback, useMemo } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Routes } from '@/navigation/routes';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/hooks/use-auth';
import { injuryService } from '@/services/injury-service';
import type { Injury, InjuryStats } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useHealthHub');

export function useHealthHub() {
  const { currentUser } = useAuth();
  const userId = currentUser?.id ?? 'user1';

  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [stats, setStats] = useState<InjuryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [userInjuries, injuryStats] = await Promise.all([
        injuryService.getUserInjuries(userId, false),
        injuryService.getInjuryStats(userId),
      ]);
      setInjuries(userInjuries);
      setStats(injuryStats);
    } catch (error) {
      logger.error('Failed to load health data:', error);
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

  const handleLogInjury = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(Routes.HEALTH_LOG);
  }, []);

  const handleViewHistory = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(Routes.HEALTH_INJURIES);
  }, []);

  const handleInjuryPress = useCallback((injury: Injury) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(Routes.healthEntry(injury.id));
  }, []);

  const activeCount = useMemo(
    () => injuries.filter((i) => i.status === 'ACTIVE' || i.status === 'RECOVERING').length,
    [injuries]
  );

  const avgRecovery = useMemo(() => {
    const recovering = injuries.filter((i) => i.status === 'RECOVERING');
    if (recovering.length === 0) return 0;
    return Math.round(recovering.reduce((sum, i) => sum + i.recoveryPercent, 0) / recovering.length);
  }, [injuries]);

  return {
    injuries, stats, loading, refreshing, activeCount, avgRecovery,
    handleRefresh, handleLogInjury, handleViewHistory, handleInjuryPress,
  };
}
