import { useCallback, useMemo } from 'react';

import { router } from 'expo-router';

import type { Injury } from '@/constants/types';
import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { injuryService } from '@/services/injury-service';
import { rosterService } from '@/services/roster-service';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import { getRosterAthleteName } from '@/utils/roster-display';

interface CoachAthleteHealthData {
  athleteName: string;
  parentName: string | null;
  injuries: Injury[];
}

export function useCoachAthleteHealth(athleteId: string) {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? '';

  const load = useCallback(async () => {
    if (!coachId || !athleteId) {
      return err(serviceError('UNAUTHORIZED', 'Missing coach or athlete context.'));
    }

    try {
      const rosterEntry = await rosterService.getRosterEntry(coachId, athleteId);
      if (!rosterEntry) {
        return err(serviceError('NOT_FOUND', 'Athlete is not available in your roster.'));
      }

      const injuries = await injuryService.getUserInjuriesForActor(coachId, athleteId, true);
      return ok<CoachAthleteHealthData>({
        athleteName: getRosterAthleteName(rosterEntry),
        parentName: rosterEntry.parentName ?? null,
        injuries,
      });
    } catch (error) {
      return err(serviceError('UNKNOWN', 'Failed to load athlete health.', error));
    }
  }, [athleteId, coachId]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen({
    load,
    deps: [coachId, athleteId],
    isEmpty: (value) => !value.athleteName,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: coachId && athleteId ? `coach-athlete-health:${coachId}:${athleteId}` : 'coach-athlete-health:missing',
  });

  const injuries = data?.injuries ?? [];
  const activeCount = useMemo(
    () => injuries.filter((injury) => injury.status === 'ACTIVE' || injury.status === 'RECOVERING').length,
    [injuries],
  );
  const averageRecovery = useMemo(() => {
    const active = injuries.filter((injury) => injury.status !== 'HEALED');
    if (active.length === 0) return 100;
    return Math.round(active.reduce((sum, injury) => sum + injury.recoveryPercent, 0) / active.length);
  }, [injuries]);
  const timelineInjuries = useMemo(
    () =>
      [...injuries].sort(
        (a, b) => new Date(b.updatedAt || b.createdAt || b.occurredAt).getTime() - new Date(a.updatedAt || a.createdAt || a.occurredAt).getTime(),
      ),
    [injuries],
  );

  const handleOpenInjury = useCallback((injury: Injury) => {
    router.push({ pathname: '/health/[id]', params: { id: injury.id } });
  }, []);

  const handleOpenEmergency = useCallback(() => {
    router.push({ pathname: '/roster/[athleteId]/emergency', params: { athleteId } });
  }, [athleteId]);

  return {
    athleteName: data?.athleteName ?? '',
    parentName: data?.parentName ?? null,
    injuries,
    activeCount,
    averageRecovery,
    timelineInjuries,
    loading: status === 'loading' && !data,
    status: status as ScreenStatus,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    handleOpenInjury,
    handleOpenEmergency,
  };
}
