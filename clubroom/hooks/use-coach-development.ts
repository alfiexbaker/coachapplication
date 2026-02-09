/**
 * useCoachDevelopment — Data loading and computed values for the coach development screen.
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/services/api-client';
import { bookingService } from '@/services/booking-service';
import { getSessionsForCoach, getUserById, formatDate } from '@/constants/mock-data';
import type { Session, User, Booking } from '@/constants/app-types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CoachDevelopmentScreen');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AthleteWithSessions {
  athlete: User;
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
    const loadSessions = async () => {
      if (!currentUser) return;
      try {
        const mockSessions = getSessionsForCoach(currentUser.id);
        const asyncSessions = await apiClient.get<Session[]>('coach_sessions', []);
        const coachAsyncSessions = asyncSessions.filter((s) => s.coachId === currentUser.id);
        const combined = [...mockSessions, ...coachAsyncSessions];
        setAllSessions(combined);
        logger.debug('Sessions loaded', { mockCount: mockSessions.length, asyncCount: coachAsyncSessions.length, total: combined.length });
      } catch (error) {
        logger.error('Failed to load sessions', error);
        const mockSessions = getSessionsForCoach(currentUser.id);
        setAllSessions(mockSessions);
      } finally {
        setLoading(false);
      }
    };
    loadSessions();
  }, [currentUser]);

  const athletesWithSessions = useMemo(() => {
    if (!currentUser || allSessions.length === 0) return [];
    const athleteMap = new Map<string, Session[]>();
    allSessions.forEach((session) => {
      const existing = athleteMap.get(session.athleteId) || [];
      athleteMap.set(session.athleteId, [...existing, session]);
    });
    const athletes: AthleteWithSessions[] = [];
    athleteMap.forEach((athleteSessions, athleteId) => {
      const athlete = getUserById(athleteId);
      if (!athlete) return;
      const sortedSessions = [...athleteSessions].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      const avgRating = athleteSessions.reduce((sum, s) => sum + s.performanceRating, 0) / athleteSessions.length;
      athletes.push({ athlete, sessionCount: athleteSessions.length, lastSession: sortedSessions[0].completedAt, averageRating: avgRating });
    });
    return athletes.sort((a, b) => new Date(b.lastSession).getTime() - new Date(a.lastSession).getTime());
  }, [currentUser, allSessions]);

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

  return { currentUser, loading, awaitingCompletion, attentionAthletes, recentSessions, logger };
}

export { formatDate, getUserById } from '@/constants/mock-data';
