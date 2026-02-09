import { useState, useEffect, useMemo, useCallback } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { groupSessionService } from '@/services/group-session-service';
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

export function useGroupSessions() {
  const { currentUser } = useAuth();

  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('ALL');

  const isCoach = currentUser?.role === 'COACH';

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await groupSessionService.discoverSessions();
      setSessions(data);
    } catch (error) {
      logger.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredSessions = useMemo(
    () => (filter === 'ALL' ? sessions : sessions.filter((s) => s.sessionType === filter)),
    [sessions, filter]
  );

  return { sessions: filteredSessions, loading, filter, setFilter, isCoach };
}
