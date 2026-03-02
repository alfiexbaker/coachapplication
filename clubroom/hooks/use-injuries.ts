/**
 * Hook for the Injury History screen.
 * Manages injury loading, status filtering, and navigation.
 */

import { useState, useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { injuryService } from '@/services/injury-service';
import { createLogger } from '@/utils/logger';
import type { Injury, InjuryStatus } from '@/constants/types';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('InjuryHistoryScreen');

export type StatusFilter = InjuryStatus | 'ALL';

export function useInjuries() {
  const { currentUser } = useAuth();
  const { children, activeChildId, setActiveChildId, isParent } = useChildContext();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const selectedChildId = useMemo(() => {
    if (!isParent || children.length === 0) return null;
    if (activeChildId && children.some((child) => child.id === activeChildId)) {
      return activeChildId;
    }
    return children[0]?.id ?? null;
  }, [activeChildId, children, isParent]);

  const selectedChild = useMemo(
    () => children.find((child) => child.id === selectedChildId) ?? null,
    [children, selectedChildId],
  );

  const subjectId = selectedChildId ?? currentUser?.id ?? null;
  const kidOptions = useMemo(
    () =>
      children.map((child) => ({
        id: child.id,
        name: child.name,
        initials: child.initials,
        colorCode: child.colorCode,
      })),
    [children],
  );

  const loadInjuries = useCallback(async () => {
    if (!subjectId) {
      return ok<{ injuries: Injury[] }>({ injuries: [] });
    }

    try {
      const userInjuries = await injuryService.getUserInjuries(subjectId, true);
      return ok<{ injuries: Injury[] }>({ injuries: userInjuries });
    } catch (error) {
      logger.error('Failed to load injuries:', error);
      return err(serviceError('UNKNOWN', 'Failed to load injuries.', error));
    }
  }, [subjectId]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<{ injuries: Injury[] }>({
    load: loadInjuries,
    deps: [subjectId],
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
    if (selectedChildId) {
      router.push({ pathname: '/health/log', params: { childId: selectedChildId } });
      return;
    }
    router.push(Routes.HEALTH_LOG);
  }, [selectedChildId]);

  const handleSelectChild = useCallback(
    (childId: string) => {
      void setActiveChildId(childId);
    },
    [setActiveChildId],
  );

  const handleSelectNextChild = useCallback(() => {
    if (kidOptions.length <= 1) return;
    const currentIndex = kidOptions.findIndex((child) => child.id === selectedChildId);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % kidOptions.length : 0;
    const nextChildId = kidOptions[nextIndex]?.id ?? kidOptions[0]?.id;
    if (!nextChildId) return;
    void setActiveChildId(nextChildId);
  }, [kidOptions, selectedChildId, setActiveChildId]);

  const handleEditSelectedChild = useCallback(() => {
    if (!selectedChildId) return;
    router.push(Routes.modalEditChildProfile(selectedChildId));
  }, [selectedChildId]);

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
    kidOptions,
    selectedChildId: selectedChildId ?? undefined,
    selectedChildName: selectedChild?.name ?? null,
    showKidSelector: kidOptions.length > 1,
    canEditSelectedChild: Boolean(selectedChildId),
    handleSelectChild,
    handleSelectNextChild,
    handleEditSelectedChild,
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
    kidOptions: Array<{ id: string; name: string; initials: string; colorCode?: string }>;
    selectedChildId: string | undefined;
    selectedChildName: string | null;
    showKidSelector: boolean;
    canEditSelectedChild: boolean;
    handleSelectChild: (childId: string) => void;
    handleSelectNextChild: () => void;
    handleEditSelectedChild: () => void;
  };
}
