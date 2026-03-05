/**
 * Hook for the Injury History screen.
 * Manages injury loading, status filtering, and navigation.
 */

import { useState, useCallback, useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { injuryService } from '@/services/injury-service';
import { createLogger } from '@/utils/logger';
import type { Injury, InjuryStatus } from '@/constants/types';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('InjuryHistoryScreen');

export type StatusFilter = InjuryStatus | 'ALL';

type SubjectOption = {
  id: string;
  name: string;
  initials: string;
  colorCode?: string;
  kind: 'self' | 'child';
};

export function useInjuries() {
  const { currentUser } = useAuth();
  const { children, profileMode, profileSubjectId } = useChildContext();
  const { subjectId: subjectIdParam, childId: childIdParam } = useLocalSearchParams<{
    subjectId?: string | string[];
    childId?: string | string[];
  }>();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const selfOption = useMemo<SubjectOption | null>(() => {
    if (!currentUser?.id) return null;
    const displayName = currentUser.fullName || currentUser.name || 'Myself';
    return {
      id: currentUser.id,
      name: displayName,
      initials: 'ME',
      kind: 'self',
    };
  }, [currentUser?.fullName, currentUser?.id, currentUser?.name]);

  const subjectOptions = useMemo<SubjectOption[]>(() => {
    const childOptions: SubjectOption[] = children.map((child) => ({
      id: child.id,
      name: child.name,
      initials: child.initials,
      colorCode: child.colorCode,
      kind: 'child',
    }));

    if (!selfOption) {
      return childOptions;
    }
    return [selfOption, ...childOptions];
  }, [children, selfOption]);

  const explicitSubjectId = useMemo(() => {
    const raw = subjectIdParam ?? childIdParam;
    if (!raw) return null;
    return Array.isArray(raw) ? raw[0] ?? null : raw;
  }, [childIdParam, subjectIdParam]);

  const selectedSubjectId = useMemo(() => {
    const isValid = (value: string | null | undefined): value is string => {
      if (!value) return false;
      return subjectOptions.some((option) => option.id === value);
    };

    if (isValid(explicitSubjectId)) {
      return explicitSubjectId;
    }
    if (profileMode === 'self' && currentUser?.id && isValid(currentUser.id)) {
      return currentUser.id;
    }
    if (isValid(profileSubjectId)) {
      return profileSubjectId;
    }
    return subjectOptions[0]?.id ?? null;
  }, [currentUser?.id, explicitSubjectId, profileMode, profileSubjectId, subjectOptions]);

  const selectedSubject = useMemo(
    () => subjectOptions.find((option) => option.id === selectedSubjectId) ?? null,
    [selectedSubjectId, subjectOptions],
  );

  const selectedChildId = selectedSubject?.kind === 'child' ? selectedSubject.id : null;
  const subjectId = selectedSubject?.id ?? null;

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

  const handleSelectSubject = useCallback(
    (_nextSubjectId: string) => {
      // Subject is inherited from Home profile scope for this subflow.
    },
    [],
  );

  const handleSelectNextSubject = useCallback(() => {
    // Subject is inherited from Home profile scope for this subflow.
  }, []);

  const handleEditSelectedSubject = useCallback(() => {
    if (!selectedSubject) return;
    if (selectedSubject.kind === 'child') {
      router.push(Routes.modalEditChildProfile(selectedSubject.id));
      return;
    }
    router.push(Routes.EDIT_PROFILE);
  }, [selectedSubject]);

  const handleQuickHeal = useCallback(
    (injury: Injury) => {
      if (injury.status === 'HEALED') return;
      uiFeedback.alert('Mark as recovered?', 'This injury will move to healed records.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark recovered',
          onPress: () => {
            void (async () => {
              try {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                const updated = await injuryService.markAsHealed(injury.id);
                if (updated) {
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  onRefresh();
                  return;
                }
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              } catch (markError) {
                logger.error('Failed to mark injury as recovered', { injuryId: injury.id, error: markError });
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              }
            })();
          },
        },
      ]);
    },
    [onRefresh],
  );

  const openInjuries = useMemo(
    () => injuries.filter((injury) => injury.status === 'ACTIVE' || injury.status === 'RECOVERING'),
    [injuries],
  );
  const healedInjuries = useMemo(
    () => injuries.filter((injury) => injury.status === 'HEALED'),
    [injuries],
  );

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
    handleQuickHeal,
    handleFilterChange,
    handleLogInjury,
    openInjuries,
    healedInjuries,
    subjectOptions,
    selectedSubjectId: selectedSubject?.id ?? undefined,
    selectedSubjectName: selectedSubject?.name ?? null,
    selectedSubjectKind: selectedSubject?.kind ?? null,
    handleSelectSubject,
    handleSelectNextSubject,
    handleEditSelectedSubject,
    // Backward-compatible aliases for older screens using child-oriented naming.
    kidOptions: subjectOptions,
    selectedChildId: selectedChildId ?? undefined,
    selectedChildName: selectedSubject?.name ?? null,
    showKidSelector: subjectOptions.length > 1,
    canEditSelectedChild: Boolean(selectedSubject),
    handleSelectChild: handleSelectSubject,
    handleSelectNextChild: handleSelectNextSubject,
    handleEditSelectedChild: handleEditSelectedSubject,
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
    handleQuickHeal: (injury: Injury) => void;
    handleFilterChange: (filter: StatusFilter) => void;
    handleLogInjury: () => void;
    openInjuries: Injury[];
    healedInjuries: Injury[];
    subjectOptions: SubjectOption[];
    selectedSubjectId: string | undefined;
    selectedSubjectName: string | null;
    selectedSubjectKind: 'self' | 'child' | null;
    handleSelectSubject: (subjectId: string) => void;
    handleSelectNextSubject: () => void;
    handleEditSelectedSubject: () => void;
    kidOptions: SubjectOption[];
    selectedChildId: string | undefined;
    selectedChildName: string | null;
    showKidSelector: boolean;
    canEditSelectedChild: boolean;
    handleSelectChild: (childId: string) => void;
    handleSelectNextChild: () => void;
    handleEditSelectedChild: () => void;
  };
}
