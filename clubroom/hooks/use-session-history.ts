import { useCallback, useMemo, useState } from 'react';

import { badgeService } from '@/services/badge-service';
import { mediaService } from '@/services/media-service';
import { progressService } from '@/services/progress-service';
import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { createLogger } from '@/utils/logger';
import type { PastSession } from '@/types/progress-types';
import type { ServiceError } from '@/types/result';
import { err, ok, serviceError } from '@/types/result';
import { buildPastSessions } from '@/hooks/use-past-sessions';

const logger = createLogger('UseSessionHistory');

export type SessionHistoryFilter = 'all' | 'with_media' | 'badges';

interface SessionHistoryCoachOption {
  coachName: string;
  count: number;
}

interface SessionHistoryData {
  sessions: PastSession[];
}

export function useSessionHistory(athleteIdParam?: string | null) {
  const { currentUser } = useAuth();
  const { children, activeChildId } = useChildContext();
  const [filter, setFilter] = useState<SessionHistoryFilter>('all');
  const [coachFilter, setCoachFilter] = useState<string>('all');

  const resolvedAthleteId = useMemo(() => {
    if (athleteIdParam) {
      return athleteIdParam;
    }
    if (currentUser?.role === 'PARENT') {
      return activeChildId ?? children[0]?.id ?? null;
    }
    if (currentUser?.role === 'COACH') {
      return null;
    }
    return currentUser?.id ?? null;
  }, [activeChildId, athleteIdParam, children, currentUser?.id, currentUser?.role]);

  const load = useCallback(async () => {
    if (!currentUser?.id) {
      return err(serviceError('VALIDATION', 'Missing user context.'));
    }
    if (!resolvedAthleteId) {
      return ok<SessionHistoryData>({ sessions: [] });
    }

    try {
      const viewerRole = currentUser.role === 'PARENT' ? 'parent' : 'athlete';
      const [feedback, badges, mediaResult] = await Promise.all([
        progressService.getFeedbackForAthlete(resolvedAthleteId, viewerRole),
        badgeService.listAwardsForAthlete(resolvedAthleteId),
        mediaService.listMediaForAthlete(resolvedAthleteId),
      ]);

      const media = mediaResult.success ? mediaResult.data : [];
      if (!mediaResult.success) {
        logger.error('Failed to load media for session history', {
          athleteId: resolvedAthleteId,
          error: mediaResult.error,
        });
      }

      const sessions = buildPastSessions({
        feedback,
        media,
        badges,
      });

      return ok<SessionHistoryData>({ sessions });
    } catch (error) {
      logger.error('Failed to load session history', error);
      return err(serviceError('UNKNOWN', 'Failed to load session history.', error));
    }
  }, [currentUser?.id, currentUser?.role, resolvedAthleteId]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<SessionHistoryData>({
    load,
    deps: [currentUser?.id, resolvedAthleteId],
    isEmpty: (value) => value.sessions.length === 0,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: resolvedAthleteId
      ? `session-history:${currentUser?.id ?? 'missing'}:${resolvedAthleteId}`
      : `session-history:${currentUser?.id ?? 'missing'}:none`,
  });

  const sessions = useMemo(() => data?.sessions ?? [], [data?.sessions]);

  const coachOptions = useMemo<SessionHistoryCoachOption[]>(() => {
    const counts = new Map<string, number>();
    for (const session of sessions) {
      const key = session.coachName || 'Coach';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([coachName, count]) => ({ coachName, count }))
      .sort((left, right) => right.count - left.count);
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const hasMedia = session.photos.length > 0 || Boolean(session.video);
      const hasBadge = Boolean(session.badgeAwarded);
      const matchesFilter =
        filter === 'all' || (filter === 'with_media' ? hasMedia : hasBadge);
      const matchesCoach = coachFilter === 'all' || session.coachName === coachFilter;
      return matchesFilter && matchesCoach;
    });
  }, [coachFilter, filter, sessions]);

  return {
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    loading: status === 'loading',
    refreshing,
    onRefresh,
    retry,
    sessions,
    filteredSessions,
    filter,
    setFilter,
    coachFilter,
    setCoachFilter,
    coachOptions,
    resolvedAthleteId,
  } satisfies {
    status: ScreenStatus;
    error: ServiceError | null;
    loading: boolean;
    refreshing: boolean;
    onRefresh: () => void;
    retry: () => void;
    sessions: PastSession[];
    filteredSessions: PastSession[];
    filter: SessionHistoryFilter;
    setFilter: (filter: SessionHistoryFilter) => void;
    coachFilter: string;
    setCoachFilter: (coach: string) => void;
    coachOptions: SessionHistoryCoachOption[];
    resolvedAthleteId: string | null;
  };
}
