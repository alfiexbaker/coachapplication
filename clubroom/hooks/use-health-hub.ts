/**
 * Hook: useHealthHub
 *
 * Manages health dashboard screen state: load injuries + stats, navigation handlers.
 * Used by app/health/index.tsx
 */

import { useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { injuryService } from '@/services/injury-service';
import type { Injury, InjuryStats } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('useHealthHub');

export function useHealthHub() {
  const { currentUser } = useAuth();
  const userId = currentUser?.id ?? 'user1';

  const loadData = useCallback(async () => {
    try {
      const [userInjuries, injuryStats] = await Promise.all([
        injuryService.getUserInjuries(userId, false),
        injuryService.getInjuryStats(userId),
      ]);
      return ok<{ injuries: Injury[]; stats: InjuryStats | null }>({
        injuries: userInjuries,
        stats: injuryStats,
      });
    } catch (error) {
      logger.error('Failed to load health data:', error);
      return err(serviceError('UNKNOWN', 'Failed to load health dashboard data.', error));
    }
  }, [userId]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<{
    injuries: Injury[];
    stats: InjuryStats | null;
  }>({
    load: loadData,
    deps: [userId],
    isEmpty: () => false,
    refetchOnFocus: true,
  });

  const injuries = data?.injuries ?? [];
  const stats = data?.stats ?? null;
  const handleRefresh = onRefresh;

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
    [injuries],
  );

  const avgRecovery = useMemo(() => {
    const recovering = injuries.filter((i) => i.status === 'RECOVERING');
    if (recovering.length === 0) return 0;
    return Math.round(
      recovering.reduce((sum, i) => sum + i.recoveryPercent, 0) / recovering.length,
    );
  }, [injuries]);

  return {
    injuries,
    stats,
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    activeCount,
    avgRecovery,
    handleRefresh,
    retry,
    handleLogInjury,
    handleViewHistory,
    handleInjuryPress,
  } satisfies {
    injuries: Injury[];
    stats: InjuryStats | null;
    loading: boolean;
    status: ScreenStatus;
    error: ServiceError | null;
    refreshing: boolean;
    activeCount: number;
    avgRecovery: number;
    handleRefresh: () => void;
    retry: () => void;
    handleLogInjury: () => void;
    handleViewHistory: () => void;
    handleInjuryPress: (injury: Injury) => void;
  };
}
