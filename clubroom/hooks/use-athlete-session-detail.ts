import { useCallback, useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { apiClient } from '@/services/api-client';
import type { Session } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('AthleteSessionDetailScreen');

const RATING_LABELS = ['Keep Practicing', 'Needs Work', 'Average', 'Good', 'Excellent'] as const;

interface AthleteSessionDetailData {
  session: Session | null;
}

export function formatDate(date: Date | string): string {
  const parsed = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown date';
  }
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function useAthleteSessionDetail() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const resolvedSessionId = Array.isArray(sessionId) ? sessionId[0] : sessionId;

  const loadSession = useCallback(async () => {
    if (!resolvedSessionId) {
      return err(serviceError('VALIDATION', 'Missing session id.'));
    }

    try {
      const sessions = await apiClient.get<Session[]>('coach_sessions', []);
      const foundSession = sessions.find((candidate) => candidate.id === resolvedSessionId) ?? null;

      if (!foundSession) {
        logger.warn('Athlete session detail not found', { sessionId: resolvedSessionId });
      }

      return ok<AthleteSessionDetailData>({ session: foundSession });
    } catch (error) {
      logger.error('Failed to load athlete session detail', { sessionId: resolvedSessionId, error });
      return err(serviceError('UNKNOWN', 'Failed to load session details.', error));
    }
  }, [resolvedSessionId]);

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<AthleteSessionDetailData>({
    load: loadSession,
    deps: [resolvedSessionId],
    isEmpty: (value) => value.session === null,
    refetchOnFocus: true,
  });

  const session = data?.session ?? null;

  const hasNotes = !!(session?.notes && session.notes.trim() !== '');
  const hasVideos = !!(session?.videoUrls && session.videoUrls.length > 0);
  const hasSkills = !!(session?.skillsWorkedOn && session.skillsWorkedOn.length > 0);
  const hasNextFocus = !!(session?.nextFocusAreas && session.nextFocusAreas.length > 0);

  const ratingLabel = useMemo(() => {
    if (!session) {
      return '';
    }
    const ratingIndex = Math.max(1, Math.min(5, session.performanceRating)) - 1;
    return RATING_LABELS[ratingIndex] ?? RATING_LABELS[0];
  }, [session]);

  return {
    session,
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    hasNotes,
    hasVideos,
    hasSkills,
    hasNextFocus,
    ratingLabel,
    formatDate,
  } satisfies {
    session: Session | null;
    loading: boolean;
    status: ScreenStatus;
    error: ServiceError | null;
    refreshing: boolean;
    onRefresh: () => void;
    retry: () => void;
    hasNotes: boolean;
    hasVideos: boolean;
    hasSkills: boolean;
    hasNextFocus: boolean;
    ratingLabel: string;
    formatDate: typeof formatDate;
  };
}
