import { router } from 'expo-router';

import type { Injury } from '@/constants/types';
import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { Routes } from '@/navigation/routes';
import { injuryService } from '@/services/injury-service';
import { rosterService } from '@/services/roster-service';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import { getRosterAthleteName } from '@/utils/roster-display';

interface CoachAthleteHealthData {
  athleteName: string;
  parentName: string | null;
  injuries: Injury[];
}

const serviceErrorCodes = new Set<ServiceError['code']>([
  'NOT_FOUND',
  'VALIDATION',
  'NETWORK',
  'STORAGE',
  'UNAUTHORIZED',
  'CONFLICT',
  'RATE_LIMITED',
  'UNSUPPORTED',
  'UNKNOWN',
]);

function toHealthLoadError(error: unknown): ServiceError {
  if (error && typeof error === 'object') {
    const candidate = error as {
      code?: unknown;
      message?: unknown;
      serviceErrorCode?: unknown;
    };
    const message =
      typeof candidate.message === 'string' ? candidate.message : 'Failed to load athlete health.';
    if (
      typeof candidate.code === 'string' &&
      serviceErrorCodes.has(candidate.code as ServiceError['code'])
    ) {
      return serviceError(candidate.code as ServiceError['code'], message, error);
    }
    if (
      typeof candidate.serviceErrorCode === 'string' &&
      serviceErrorCodes.has(candidate.serviceErrorCode as ServiceError['code'])
    ) {
      return serviceError(candidate.serviceErrorCode as ServiceError['code'], message, error);
    }
  }
  return serviceError('UNKNOWN', 'Failed to load athlete health.', error);
}

export function useCoachAthleteHealth(athleteId: string) {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? '';
  const hasCoachHealthAccess =
    Boolean(coachId) && currentUser?.role === 'COACH' && currentUser.isVerified;

  const load = async () => {
    if (!hasCoachHealthAccess || !athleteId) {
      return err(serviceError('UNAUTHORIZED', 'A verified coach account is required to review athlete health.'));
    }

    try {
      const rosterEntry = await rosterService.getRosterEntry(coachId, athleteId);
      if (!rosterEntry) {
        return err(serviceError('NOT_FOUND', 'Athlete is not available in your roster.'));
      }

      const injuries = await injuryService.getAthleteInjuries(athleteId);
      return ok<CoachAthleteHealthData>({
        athleteName: getRosterAthleteName(rosterEntry),
        parentName: rosterEntry.parentName ?? null,
        injuries,
      });
    } catch (error) {
      return err(toHealthLoadError(error));
    }
  };

  const { data, status, error, refreshing, onRefresh, retry } = useScreen({
    load,
    deps: [coachId, currentUser?.role, currentUser?.isVerified, athleteId],
    isEmpty: (value) => !value.athleteName,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey:
      hasCoachHealthAccess && athleteId
        ? `coach-athlete-health:${coachId}:verified:${athleteId}`
        : 'coach-athlete-health:unavailable',
  });

  const injuries = data?.injuries ?? [];
  const activeCount = injuries.filter((injury) => injury.status === 'ACTIVE' || injury.status === 'RECOVERING').length;
  const averageRecovery = (() => {
    const active = injuries.filter((injury) => injury.status !== 'HEALED');
    if (active.length === 0) return 100;
    return Math.round(active.reduce((sum, injury) => sum + injury.recoveryPercent, 0) / active.length);
  })();
  const timelineInjuries = Array.from(injuries).toSorted(
    (a, b) => new Date(b.updatedAt || b.createdAt || b.occurredAt).getTime() - new Date(a.updatedAt || a.createdAt || a.occurredAt).getTime(),
  );

  const handleOpenInjury = (injury: Injury) => {
    router.push(Routes.healthEntry(injury.id));
  };

  const handleOpenEmergency = () => {
    router.push(Routes.rosterAthleteEmergency(athleteId));
  };

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
