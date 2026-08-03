/**
 * useCoachDevelopment — Data loading and computed values for the coach development screen.
 */
import { useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { apiClient } from '@/services/api-client';
import { bookingService } from '@/services/booking-service';
import { ensureCoachSessionsSeeded } from '@/services/coach-session-seed-service';
import { rosterService } from '@/services/roster-service';
import {
  progressFeedbackService,
  type SessionFeedback,
} from '@/services/progress/progress-feedback-service';
import type { Session, Booking } from '@/constants/app-types';
import { createLogger } from '@/utils/logger';
import { getSessionAthleteName } from '@/utils/session-display';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('CoachDevelopmentScreen');

function formatAthleteName(name: string | undefined): string {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : 'Athlete';
}

function clampRating(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(1, Math.min(5, Math.round(value ?? 0)));
}

function mapFeedbackToDevelopmentSession(feedback: SessionFeedback): Session {
  const sessionId = feedback.sessionId || feedback.bookingId || feedback.id;
  const skillsWorkedOn =
    feedback.skillsWorkedOn.length > 0
      ? feedback.skillsWorkedOn
      : feedback.skillRatings.map((rating) => rating.skill);
  const nextFocusAreas = [feedback.improvements, feedback.homework]
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return {
    id: sessionId,
    bookingId: feedback.bookingId ?? sessionId,
    coachId: feedback.coachId,
    athleteId: feedback.athleteId,
    athleteName: feedback.athleteName,
    completedAt: feedback.createdAt,
    attendance: 'ATTENDED',
    notes: feedback.publicSummary || feedback.improvements || feedback.privateNotes || '',
    skillsWorkedOn,
    performanceRating: clampRating(feedback.overallPerformance || feedback.effortRating),
    nextFocusAreas,
    videoUrls: feedback.videoClipUrls,
    coachName: feedback.coachName,
  };
}

async function loadCoachDevelopmentSessions(coachUserId: string): Promise<Session[]> {
  if (apiClient.isMockMode) {
    const allSessions = await ensureCoachSessionsSeeded();
    return allSessions.filter((session) => session.coachId === coachUserId);
  }

  const feedback = await progressFeedbackService.getFeedbackForCoach(coachUserId);
  return feedback.map(mapFeedbackToDevelopmentSession);
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
  athleteDirectory: Record<string, AthleteSummary>;
  awaitingCompletion: Booking[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCoachDevelopment() {
  const { currentUser } = useAuth();
  const [nowMs] = useState(() => Date.now());

  const loadDevelopment = async () => {
    if (!currentUser?.id) {
      return ok<CoachDevelopmentData>({
        sessions: [],
        athleteDirectory: {},
        awaitingCompletion: [],
      });
    }

    try {
      const [storedSessions, awaitingCompletion, roster] = await Promise.all([
        loadCoachDevelopmentSessions(currentUser.id),
        bookingService.getAwaitingCompletion(currentUser.id),
        rosterService.getRoster(currentUser.id),
      ]);
      const coachSessions = storedSessions;
      const athleteDirectory: Record<string, AthleteSummary> = {};
      for (const entry of roster) {
        const athleteName = entry.athleteName?.trim();
        if (!athleteName) {
          continue;
        }
        athleteDirectory[entry.athleteId] = {
          id: entry.athleteId,
          name: athleteName,
          avatar: athleteName.charAt(0).toUpperCase(),
        };
      }
      for (const session of coachSessions) {
        if (!session.athleteId || athleteDirectory[session.athleteId]) {
          continue;
        }
        const athleteName = formatAthleteName(session.athleteName);
        athleteDirectory[session.athleteId] = {
          id: session.athleteId,
          name: athleteName,
          avatar: athleteName.charAt(0).toUpperCase(),
        };
      }

      logger.debug('Coach development data loaded', {
        coachId: currentUser.id,
        sessionCount: coachSessions.length,
        athleteCount: Object.keys(athleteDirectory).length,
        awaitingCompletionCount: awaitingCompletion.length,
      });

      const resolvedAwaitingCompletion = awaitingCompletion.map((booking) => {
        const athleteIds =
          booking.athleteIds?.length && booking.athleteIds.length > 0
            ? booking.athleteIds
            : booking.athleteId
              ? [booking.athleteId]
              : [];
        const athleteNames = athleteIds.flatMap((athleteId) => {
          const athleteName = athleteDirectory[athleteId]?.name;
          return athleteName ? [athleteName] : [];
        });

        return athleteNames.length > 0 ? { ...booking, athleteNames } : booking;
      });

      return ok<CoachDevelopmentData>({
        sessions: coachSessions,
        athleteDirectory,
        awaitingCompletion: resolvedAwaitingCompletion,
      });
    } catch (error) {
      logger.error('Failed to load coach development', error);
      return err(serviceError('UNKNOWN', 'Failed to load coach development.', error));
    }
  };

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

  const athletesWithSessions = (() => {
    if (!currentUser || allSessions.length === 0) return [];

    const athleteMap = new Map<string, Session[]>();
    allSessions.forEach((session) => {
      const existing = athleteMap.get(session.athleteId) || [];
      athleteMap.set(session.athleteId, [...existing, session]);
    });

    const athletes: AthleteWithSessions[] = [];
    athleteMap.forEach((athleteSessions, athleteId) => {
      const sortedSessions = Array.from(athleteSessions).toSorted(
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
  })();

  const rosterEntries: AthleteRosterEntry[] = (() => {
    return athletesWithSessions.map((entry) => {
      const athleteSessions = allSessions.filter((s) => s.athleteId === entry.athlete.id);
      const sortedAthleteSessions = Array.from(athleteSessions).toSorted(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      );
      const needsNotes = athleteSessions.some((s) => !s.notes || s.notes.trim() === '');
      const sessionNeedingNotes =
        sortedAthleteSessions.find((s) => !s.notes || s.notes.trim() === '') ?? null;
      const daysSinceLast = Math.max(
        0,
        Math.round((nowMs - new Date(entry.lastSession).getTime()) / (1000 * 60 * 60 * 24)),
      );
      return {
        ...entry,
        needsNotes,
        daysSinceLast,
        prioritySessionId: (sessionNeedingNotes ?? sortedAthleteSessions[0])?.id ?? null,
      };
    });
  })();

  const attentionAthletes = rosterEntries.filter(
    (e) => e.needsNotes || e.averageRating < 4 || e.daysSinceLast >= 10,
  );

  const recentSessions = Array.from(allSessions)
    .toSorted((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 5);

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
