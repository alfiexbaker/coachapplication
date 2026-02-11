/**
 * Hook for the Injury History screen.
 * Manages injury loading, status filtering, and navigation.
 */

import { useState, useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { injuryService } from '@/services/injury-service';
import { createLogger } from '@/utils/logger';
import type { Injury, InjuryStatus } from '@/constants/types';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('InjuryHistoryScreen');

export type StatusFilter = InjuryStatus | 'ALL';

export function useInjuries() {
  const { currentUser } = useAuth();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const userId = currentUser?.id ?? 'user1';

  const loadInjuries = useCallback(async () => {
    try {
      const userInjuries = await injuryService.getUserInjuries(userId, true);
      return ok<{ injuries: Injury[] }>({ injuries: userInjuries });
    } catch (error) {
      logger.error('Failed to load injuries:', error);
      return err(serviceError('UNKNOWN', 'Failed to load injuries.', error));
    }
  }, [userId]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<{ injuries: Injury[] }>({
    load: loadInjuries,
    deps: [userId],
    isEmpty: (value) => value.injuries.length === 0,
    refetchOnFocus: true,
  });

  const injuries = data?.injuries ?? [];
  const handleRefresh = onRefresh;

  const filteredInjuries = useMemo(() => {
    if (statusFilter === 'ALL') return injuries;
    return injuries.filter((i) => i.status === statusFilter);
  }, [injuries, statusFilter]);

  const counts = useMemo(
    () => ({
      ALL: injuries.length,
      ACTIVE: injuries.filter((i) => i.status === 'ACTIVE').length,
      RECOVERING: injuries.filter((i) => i.status === 'RECOVERING').length,
      HEALED: injuries.filter((i) => i.status === 'HEALED').length,
    }),
    [injuries],
  );

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
    injuries,
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    statusFilter,
    filteredInjuries,
    counts,
    handleRefresh,
    retry,
    handleInjuryPress,
    handleFilterChange,
    handleLogInjury,
  } satisfies {
    injuries: Injury[];
    loading: boolean;
    status: ScreenStatus;
    error: ServiceError | null;
    refreshing: boolean;
    statusFilter: StatusFilter;
    filteredInjuries: Injury[];
    counts: { ALL: number; ACTIVE: number; RECOVERING: number; HEALED: number };
    handleRefresh: () => void;
    retry: () => void;
    handleInjuryPress: (injury: Injury) => void;
    handleFilterChange: (filter: StatusFilter) => void;
    handleLogInjury: () => void;
  };
}
