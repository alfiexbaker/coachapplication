/**
 * useCoachDevelopment — Data loading and computed values for the coach development screen.
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/services/api-client';
import { bookingService } from '@/services/booking-service';
import { userService } from '@/services/user-service';
import type { Session, Booking } from '@/constants/app-types';
import type { User } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { getSessionAthleteName } from '@/utils/session-display';

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
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCoachDevelopment() {
  const { currentUser } = useAuth();
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [athleteDirectory, setAthleteDirectory] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [awaitingCompletion, setAwaitingCompletion] = useState<Booking[]>([]);

  const loadAwaitingCompletion = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const bookings = await bookingService.getAwaitingCompletion(currentUser.id);
      setAwaitingCompletion(bookings);
    } catch (error) {
      logger.error('Failed to load awaiting completion', error);
    }
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      if (currentUser?.id) loadAwaitingCompletion();
    }, [currentUser?.id, loadAwaitingCompletion]),
  );

  useEffect(() => {
    let isMounted = true;

    const loadSessions = async () => {
      if (!currentUser?.id) {
        if (isMounted) {
          setAllSessions([]);
          setAthleteDirectory({});
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        const storedSessions = await apiClient.get<Session[]>('coach_sessions', []);
        const coachSessions = storedSessions.filter((session) => session.coachId === currentUser.id);

        const athleteIds = [...new Set(coachSessions.map((session) => session.athleteId).filter(Boolean))];
        const athleteResult = await userService.getUsersByIds(athleteIds);
        const nextAthleteDirectory: Record<string, User> = {};

        if (athleteResult.success) {
          athleteResult.data.forEach((athlete) => {
            nextAthleteDirectory[athlete.id] = athlete;
          });
        } else {
          logger.error('Failed to resolve athlete profiles for sessions', {
            coachId: currentUser.id,
            error: athleteResult.error,
          });
        }

        if (!isMounted) {
          return;
        }

        setAthleteDirectory(nextAthleteDirectory);
        setAllSessions(coachSessions);
        logger.debug('Sessions loaded', {
          coachId: currentUser.id,
          sessionCount: coachSessions.length,
          athleteCount: athleteIds.length,
        });
      } catch (error) {
        logger.error('Failed to load sessions', error);
        if (!isMounted) {
          return;
        }
        setAllSessions([]);
        setAthleteDirectory({});
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSessions();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  const athletesWithSessions = useMemo(() => {
    if (!currentUser || allSessions.length === 0) return [];

    const athleteMap = new Map<string, Session[]>();
    allSessions.forEach((session) => {
      const existing = athleteMap.get(session.athleteId) || [];
      athleteMap.set(session.athleteId, [...existing, session]);
    });

    const athletes: AthleteWithSessions[] = [];
    athleteMap.forEach((athleteSessions, athleteId) => {
      const sortedSessions = [...athleteSessions].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
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

      const avgRating = athleteSessions.reduce((sum, session) => sum + session.performanceRating, 0) / athleteSessions.length;
      athletes.push({
        athlete,
        sessionCount: athleteSessions.length,
        lastSession: latestSession.completedAt,
        averageRating: avgRating,
      });
    });

    return athletes.sort((a, b) => new Date(b.lastSession).getTime() - new Date(a.lastSession).getTime());
  }, [currentUser, allSessions, athleteDirectory]);

  const rosterEntries: AthleteRosterEntry[] = useMemo(() => {
    const now = Date.now();
    return athletesWithSessions.map((entry) => {
      const athleteSessions = allSessions.filter((s) => s.athleteId === entry.athlete.id);
      const needsNotes = athleteSessions.some((s) => !s.notes || s.notes.trim() === '');
      const daysSinceLast = Math.max(0, Math.round((now - new Date(entry.lastSession).getTime()) / (1000 * 60 * 60 * 24)));
      return { ...entry, needsNotes, daysSinceLast };
    });
  }, [allSessions, athletesWithSessions]);

  const attentionAthletes = rosterEntries.filter((e) => e.needsNotes || e.averageRating < 4 || e.daysSinceLast >= 10);

  const recentSessions = useMemo(
    () => [...allSessions].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()).slice(0, 5),
    [allSessions],
  );

  return {
    currentUser,
    loading,
    awaitingCompletion,
    attentionAthletes,
    recentSessions,
    athleteDirectory,
    logger,
  };
}
