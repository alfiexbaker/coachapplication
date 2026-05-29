import { useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { groupSessionService } from '@/services/group-session-service';
import { sessionRegistrationService } from '@/services/group-session/session-registration-service';
import { useSessionRegistrationBadges } from '@/hooks/use-session-registration-badges';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import { createLogger } from '@/utils/logger';
import type { GroupSession, GroupRegistration } from '@/constants/types';
import type { SessionBadgeData } from '@/types/session-child-status';

const logger = createLogger('GroupSessionsScreen');

export const SESSION_TYPE_COLORS = {
  CAMP: '#FF6B35',
  CLINIC: '#7B68EE',
  TEAM_TRAINING: '#2E8B57',
  TRAINING: '#2E8B57',
  OPEN_SESSION: '#4169E1',
  TRIAL: '#20B2AA',
} as const;

export type FilterType = 'ALL' | GroupSession['sessionType'];

export const SESSION_FILTERS: { key: FilterType; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'CAMP', label: 'Camps' },
  { key: 'CLINIC', label: 'Clinics' },
  { key: 'OPEN_SESSION', label: 'Open' },
  { key: 'TRIAL', label: 'Trials' },
];

interface GroupSessionsData {
  sessions: GroupSession[];
  familyRegistrations: GroupRegistration[];
}

export interface UseGroupSessionsResult {
  sessions: GroupSession[];
  loading: boolean;
  status: ScreenStatus;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  filter: FilterType;
  setFilter: (value: FilterType) => void;
  isCoach: boolean;
  badgeMap: Map<string, SessionBadgeData>;
  isSingleChild: boolean;
}

export function useGroupSessions() {
  const { currentUser } = useAuth();
  const { children, familyAthleteIds, isParent } = useChildContext();
  const [filter, setFilter] = useState<FilterType>('ALL');

  const isCoach = currentUser?.role === 'COACH';

  const loadSessions = async () => {
    try {
      const [sessionsData, familyRegs] = await Promise.all([
        groupSessionService.discoverSessions(),
        isParent && familyAthleteIds.size > 0
          ? sessionRegistrationService.getRegistrationsForAthletes(familyAthleteIds)
          : Promise.resolve([] as GroupRegistration[]),
      ]);
      return ok<GroupSessionsData>({ sessions: sessionsData, familyRegistrations: familyRegs });
    } catch (loadError) {
      logger.error('Failed to load sessions:', loadError);
      return err(
        serviceError('UNKNOWN', 'Failed to load group sessions. Pull down to refresh.', loadError),
      );
    }
  };

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<GroupSessionsData>({
    load: loadSessions,
    isEmpty: (value) => value.sessions.length === 0,
    refetchOnFocus: true,
    loadingStrategy: 'warm-first',
    dataKey: isParent ? 'group-sessions:parent' : 'group-sessions:default',
  });

  const sessions = data?.sessions ?? [];
  const familyRegistrations = data?.familyRegistrations ?? [];
  const loading = status === 'loading';

  const filteredSessions = (filter === 'ALL' ? sessions : sessions.filter((s) => s.sessionType === filter));

  const badgeMap = useSessionRegistrationBadges(filteredSessions, children, familyRegistrations);

  return {
    sessions: filteredSessions,
    loading,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    filter,
    setFilter,
    isCoach,
    badgeMap,
    isSingleChild: children.length === 1,
  } satisfies UseGroupSessionsResult;
}
