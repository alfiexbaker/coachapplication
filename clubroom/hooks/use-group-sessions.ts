import { useMemo, useState, useCallback } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { groupSessionService } from '@/services/group-session-service';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import { createLogger } from '@/utils/logger';
import type { GroupSession } from '@/constants/types';

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
}

export function useGroupSessions() {
  const { currentUser } = useAuth();
  const [filter, setFilter] = useState<FilterType>('ALL');

  const isCoach = currentUser?.role === 'COACH';

  const loadSessions = useCallback(async () => {
    try {
      const data = await groupSessionService.discoverSessions();
      return ok<GroupSessionsData>({ sessions: data });
    } catch (loadError) {
      logger.error('Failed to load sessions:', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load group sessions. Pull down to refresh.', loadError));
    }
  }, []);

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<GroupSessionsData>({
    load: loadSessions,
    isEmpty: (value) => value.sessions.length === 0,
    refetchOnFocus: true,
  });

  const sessions = data?.sessions ?? [];
  const loading = status === 'loading';

  const filteredSessions = useMemo(
    () => (filter === 'ALL' ? sessions : sessions.filter((s) => s.sessionType === filter)),
    [sessions, filter]
  );

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
  } satisfies UseGroupSessionsResult;
}
