/**
 * useCoachDevelopment — Data loading and computed values for the coach development screen.
 */
import { useMemo, useCallback } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { bookingService } from '@/services/booking-service';
import { ensureCoachSessionsSeeded } from '@/services/coach-session-seed-service';
import { userService } from '@/services/user-service';
import type { Session, Booking } from '@/constants/app-types';
import type { User } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { getSessionAthleteName } from '@/utils/session-display';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('CoachDevelopmentScreen');

function formatAthleteName(name: string | undefined): string {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : 'Athlete';
}

export function formatDate(date: Date | string): string {
  const parsed = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown date';
  }
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AthleteSummary {
  id: string;
  name: string;
  avatar?: string;
}

export interface AthleteWithSessions {
  athlete: AthleteSummary;
  sessionCount: number;
  lastSession: string;
  averageRating: number;
}

export interface AthleteRosterEntry extends AthleteWithSessions {
  needsNotes: boolean;
  daysSinceLast: number;
  prioritySessionId: string | null;
}

interface CoachDevelopmentData {
  sessions: Session[];
  athleteDirectory: Record<string, User>;
  awaitingCompletion: Booking[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCoachDevelopment() {
  const { currentUser } = useAuth();

  const loadDevelopment = useCallback(async () => {
    if (!currentUser?.id) {
      return ok<CoachDevelopmentData>({
        sessions: [],
        athleteDirectory: {},
        awaitingCompletion: [],
      });
    }

    try {
      const [storedSessions, awaitingCompletion] = await Promise.all([
        ensureCoachSessionsSeeded(),
        bookingService.getAwaitingCompletion(currentUser.id),
      ]);
      const coachSessions = storedSessions.filter((session) => session.coachId === currentUser.id);
      const athleteIds = [
        ...new Set(coachSessions.map((session) => session.athleteId).filter(Boolean)),
      ];
      const athleteResult = await userService.getUsersByIds(athleteIds);
      const athleteDirectory: Record<string, User> = {};

      if (athleteResult.success) {
        athleteResult.data.forEach((athlete) => {
          athleteDirectory[athlete.id] = athlete;
        });
      } else {
        logger.error('Failed to resolve athlete profiles for sessions', {
          coachId: currentUser.id,
          error: athleteResult.error,
        });
      }

      logger.debug('Coach development data loaded', {
        coachId: currentUser.id,
        sessionCount: coachSessions.length,
        athleteCount: athleteIds.length,
        awaitingCompletionCount: awaitingCompletion.length,
      });

      return ok<CoachDevelopmentData>({
        sessions: coachSessions,
        athleteDirectory,
        awaitingCompletion,
      });
    } catch (error) {
      logger.error('Failed to load coach development', error);
      return err(serviceError('UNKNOWN', 'Failed to load coach development.', error));
    }
  }, [currentUser?.id]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<CoachDevelopmentData>({
    load: loadDevelopment,
    deps: [currentUser?.id],
    isEmpty: () => false,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: currentUser?.id ? `coach-development:${currentUser.id}` : 'coach-development:guest',
  });

  const allSessions = data?.sessions ?? [];
  const athleteDirectory = data?.athleteDirectory ?? {};
  const awaitingCompletion = data?.awaitingCompletion ?? [];

  const athletesWithSessions = useMemo(() => {
    if (!currentUser || allSessions.length === 0) return [];

    const athleteMap = new Map<string, Session[]>();
    allSessions.forEach((session) => {
      const existing = athleteMap.get(session.athleteId) || [];
      athleteMap.set(session.athleteId, [...existing, session]);
    });

    const athletes: AthleteWithSessions[] = [];
    athleteMap.forEach((athleteSessions, athleteId) => {
      const sortedSessions = [...athleteSessions].sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      );
      const latestSession = sortedSessions[0];
      const fallbackAthleteName = latestSession ? getSessionAthleteName(latestSession) : 'Athlete';
      const storedAthlete = athleteDirectory[athleteId];
      const athlete: AthleteSummary = storedAthlete
        ? {
            id: storedAthlete.id,
            name: formatAthleteName(storedAthlete.name),
            avatar: storedAthlete.avatar,
          }
        : {
            id: athleteId,
            name: formatAthleteName(fallbackAthleteName),
            avatar: formatAthleteName(fallbackAthleteName).charAt(0),
          };

      const avgRating =
        athleteSessions.reduce((sum, session) => sum + session.performanceRating, 0) /
        athleteSessions.length;
      athletes.push({
        athlete,
        sessionCount: athleteSessions.length,
        lastSession: latestSession.completedAt,
        averageRating: avgRating,
      });
    });

    return athletes.sort(
      (a, b) => new Date(b.lastSession).getTime() - new Date(a.lastSession).getTime(),
    );
  }, [currentUser, allSessions, athleteDirectory]);

  const rosterEntries: AthleteRosterEntry[] = useMemo(() => {
    const now = Date.now();
    return athletesWithSessions.map((entry) => {
      const athleteSessions = allSessions.filter((s) => s.athleteId === entry.athlete.id);
      const sortedAthleteSessions = [...athleteSessions].sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      );
      const needsNotes = athleteSessions.some((s) => !s.notes || s.notes.trim() === '');
      const sessionNeedingNotes =
        sortedAthleteSessions.find((s) => !s.notes || s.notes.trim() === '') ?? null;
      const daysSinceLast = Math.max(
        0,
        Math.round((now - new Date(entry.lastSession).getTime()) / (1000 * 60 * 60 * 24)),
      );
      return {
        ...entry,
        needsNotes,
        daysSinceLast,
        prioritySessionId: (sessionNeedingNotes ?? sortedAthleteSessions[0])?.id ?? null,
      };
    });
  }, [allSessions, athletesWithSessions]);

  const attentionAthletes = rosterEntries.filter(
    (e) => e.needsNotes || e.averageRating < 4 || e.daysSinceLast >= 10,
  );

  const recentSessions = useMemo(
    () =>
      [...allSessions]
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
        .slice(0, 5),
    [allSessions],
  );

  return {
    currentUser,
    loading: status === 'loading',
    status: status as ScreenStatus,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    awaitingCompletion,
    attentionAthletes,
    recentSessions,
    athleteDirectory,
    logger,
  };
}
