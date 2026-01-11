/**
 * useCoachData Hook
 *
 * Centralized hook for fetching coach information, athletes/roster, and sessions.
 * Provides consistent data shape, loading states, and error handling.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { rosterService, type RosterStats, type AthleteRemovalRecord } from '@/services/roster-service';
import { bookingService } from '@/services/booking-service';
import { groupSessionService, type CreateGroupSessionInput } from '@/services/group-session-service';
import type { RosterEntry, GroupSession } from '@/constants/types';
import type { Booking } from '@/constants/app-types';

// ============================================================================
// TYPES
// ============================================================================

export interface CoachInfo {
  id: string;
  name: string;
  email?: string;
  photoUrl?: string;
  schoolId?: string;
  schoolName?: string;
}

export interface CoachRosterSummary {
  total: number;
  active: number;
  paused: number;
  graduated: number;
  inactive: number;
  athletes: RosterEntry[];
  stats: RosterStats;
  tags: string[];
  recentRemovals: AthleteRemovalRecord[];
}

export interface CoachSessionsSummary {
  upcomingBookings: Booking[];
  groupSessions: GroupSession[];
  trainingSessions: GroupSession[];
  totalBookings: number;
  totalGroupSessions: number;
}

export interface CoachDataResult {
  coach: CoachInfo | null;
  roster: CoachRosterSummary | null;
  sessions: CoachSessionsSummary | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook to fetch comprehensive coach data including roster, sessions, and bookings.
 *
 * @param coachId - The ID of the coach to fetch data for
 * @param options - Optional configuration
 * @returns CoachDataResult with coach data, loading state, and error
 *
 * @example
 * ```tsx
 * const { coach, roster, sessions, loading, error } = useCoachData('coach_1');
 *
 * if (loading) return <LoadingSpinner />;
 * if (error) return <ErrorMessage error={error} />;
 *
 * return <CoachDashboard coach={coach} roster={roster} sessions={sessions} />;
 * ```
 */
export function useCoachData(
  coachId: string | null | undefined,
  options?: {
    includeRoster?: boolean;
    includeSessions?: boolean;
    includeBookings?: boolean;
    includeRemovals?: boolean;
  }
): CoachDataResult {
  const {
    includeRoster = true,
    includeSessions = true,
    includeBookings = true,
    includeRemovals = false,
  } = options ?? {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [coach, setCoach] = useState<CoachInfo | null>(null);
  const [roster, setRoster] = useState<CoachRosterSummary | null>(null);
  const [sessions, setSessions] = useState<CoachSessionsSummary | null>(null);

  const fetchData = useCallback(async () => {
    // Handle null/undefined coachId
    if (!coachId) {
      setCoach(null);
      setRoster(null);
      setSessions(null);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build promises array based on options
      const promises: Promise<any>[] = [];
      const promiseKeys: string[] = [];

      if (includeRoster) {
        promises.push(rosterService.getRoster(coachId));
        promiseKeys.push('roster');

        promises.push(rosterService.getStats(coachId));
        promiseKeys.push('rosterStats');

        promises.push(rosterService.getAllTags(coachId));
        promiseKeys.push('rosterTags');
      }

      if (includeRemovals) {
        promises.push(rosterService.getRemovalHistory(coachId));
        promiseKeys.push('removals');
      }

      if (includeSessions) {
        promises.push(groupSessionService.getCoachSessions(coachId));
        promiseKeys.push('groupSessions');
      }

      if (includeBookings) {
        promises.push(bookingService.getBookingsForUser(coachId, 'coach'));
        promiseKeys.push('bookings');
      }

      // Fetch all data in parallel
      const results = await Promise.all(promises);

      // Map results by key
      const resultMap: Record<string, any> = {};
      promiseKeys.forEach((key, index) => {
        resultMap[key] = results[index];
      });

      // Build coach info
      const coachInfo: CoachInfo = {
        id: coachId,
        name: `Coach ${coachId}`, // Would be populated from actual API
      };
      setCoach(coachInfo);

      // Build roster summary if fetched
      if (resultMap.roster) {
        const athletes = resultMap.roster as RosterEntry[];
        const stats = resultMap.rosterStats as RosterStats;
        const tags = resultMap.rosterTags as string[];
        const removals = (resultMap.removals ?? []) as AthleteRemovalRecord[];

        const rosterSummary: CoachRosterSummary = {
          total: athletes.length,
          active: athletes.filter((a) => a.status === 'ACTIVE').length,
          paused: athletes.filter((a) => a.status === 'PAUSED').length,
          graduated: athletes.filter((a) => a.status === 'GRADUATED').length,
          inactive: athletes.filter((a) => a.status === 'INACTIVE').length,
          athletes,
          stats,
          tags,
          recentRemovals: removals.slice(0, 10),
        };
        setRoster(rosterSummary);
      }

      // Build sessions summary if fetched
      if (resultMap.groupSessions || resultMap.bookings) {
        const groupSessions = (resultMap.groupSessions ?? []) as GroupSession[];
        const bookings = (resultMap.bookings ?? []) as Booking[];
        const now = new Date().toISOString();

        const sessionsSummary: CoachSessionsSummary = {
          upcomingBookings: bookings.filter(
            (b) => b.scheduledAt && b.scheduledAt > now && b.status !== 'CANCELLED'
          ),
          groupSessions,
          trainingSessions: groupSessions.filter((s) => s.sessionType === 'TRAINING'),
          totalBookings: bookings.length,
          totalGroupSessions: groupSessions.length,
        };
        setSessions(sessionsSummary);
      }
    } catch (e) {
      const errorInstance = e instanceof Error ? e : new Error(String(e));
      setError(errorInstance);
      console.error('[useCoachData] Error fetching coach data:', e);
    } finally {
      setLoading(false);
    }
  }, [coachId, includeRoster, includeSessions, includeBookings, includeRemovals]);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Memoize the refetch function
  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Memoize the return value
  return useMemo(
    () => ({
      coach,
      roster,
      sessions,
      loading,
      error,
      refetch,
    }),
    [coach, roster, sessions, loading, error, refetch]
  );
}

// ============================================================================
// HELPER HOOKS
// ============================================================================

/**
 * Lightweight hook for fetching just coach's athlete roster.
 */
export function useCoachRoster(
  coachId: string | null | undefined,
  filters?: {
    status?: 'ACTIVE' | 'PAUSED' | 'GRADUATED' | 'INACTIVE';
    skillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    tags?: string[];
    search?: string;
  }
) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [athletes, setAthletes] = useState<RosterEntry[]>([]);
  const [stats, setStats] = useState<RosterStats | null>(null);

  const fetchRoster = useCallback(async () => {
    if (!coachId) {
      setAthletes([]);
      setStats(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [rosterData, statsData] = await Promise.all([
        rosterService.getRoster(coachId, filters),
        rosterService.getStats(coachId),
      ]);
      setAthletes(rosterData);
      setStats(statsData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [coachId, filters?.status, filters?.skillLevel, filters?.tags?.join(','), filters?.search]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  // Helper to get athlete by ID
  const getAthleteById = useCallback(
    (athleteId: string) => athletes.find((a) => a.athleteId === athleteId),
    [athletes]
  );

  // Helper to get athletes by status
  const getAthletesByStatus = useCallback(
    (status: RosterEntry['status']) => athletes.filter((a) => a.status === status),
    [athletes]
  );

  return useMemo(
    () => ({
      athletes,
      stats,
      loading,
      error,
      refetch: fetchRoster,
      getAthleteById,
      getAthletesByStatus,
      activeAthletes: athletes.filter((a) => a.status === 'ACTIVE'),
      totalRevenue: stats?.totalRevenue ?? 0,
    }),
    [athletes, stats, loading, error, fetchRoster, getAthleteById, getAthletesByStatus]
  );
}

/**
 * Lightweight hook for fetching coach's sessions and bookings.
 */
export function useCoachSessions(coachId: string | null | undefined) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [groupSessions, setGroupSessions] = useState<GroupSession[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const fetchSessions = useCallback(async () => {
    if (!coachId) {
      setGroupSessions([]);
      setBookings([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [sessionsData, bookingsData] = await Promise.all([
        groupSessionService.getCoachSessions(coachId),
        bookingService.getBookingsForUser(coachId, 'coach'),
      ]);
      setGroupSessions(sessionsData);
      setBookings(bookingsData as Booking[]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [coachId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Compute upcoming sessions
  const upcomingSessions = useMemo(() => {
    const now = new Date().toISOString().split('T')[0];
    return groupSessions.filter((s) => {
      const nextDate = s.schedule[0]?.date;
      return nextDate && nextDate >= now && s.status === 'PUBLISHED';
    });
  }, [groupSessions]);

  // Compute upcoming bookings
  const upcomingBookings = useMemo(() => {
    const now = new Date().toISOString();
    return bookings.filter(
      (b) => b.scheduledAt && b.scheduledAt > now && b.status !== 'CANCELLED'
    );
  }, [bookings]);

  return useMemo(
    () => ({
      groupSessions,
      bookings,
      upcomingSessions,
      upcomingBookings,
      loading,
      error,
      refetch: fetchSessions,
    }),
    [groupSessions, bookings, upcomingSessions, upcomingBookings, loading, error, fetchSessions]
  );
}

/**
 * Hook for managing coach roster operations.
 */
export function useCoachRosterManagement(coachId: string | null | undefined) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const addNote = useCallback(
    async (athleteId: string, content: string) => {
      if (!coachId) {
        throw new Error('Coach ID is required');
      }

      try {
        setLoading(true);
        setError(null);
        const note = await rosterService.addNote(coachId, athleteId, content);
        return note;
      } catch (e) {
        const errorInstance = e instanceof Error ? e : new Error(String(e));
        setError(errorInstance);
        throw errorInstance;
      } finally {
        setLoading(false);
      }
    },
    [coachId]
  );

  const updateStatus = useCallback(
    async (athleteId: string, status: RosterEntry['status']) => {
      if (!coachId) {
        throw new Error('Coach ID is required');
      }

      try {
        setLoading(true);
        setError(null);
        const entry = await rosterService.updateStatus(coachId, athleteId, status);
        return entry;
      } catch (e) {
        const errorInstance = e instanceof Error ? e : new Error(String(e));
        setError(errorInstance);
        throw errorInstance;
      } finally {
        setLoading(false);
      }
    },
    [coachId]
  );

  const updateTags = useCallback(
    async (athleteId: string, tags: string[]) => {
      if (!coachId) {
        throw new Error('Coach ID is required');
      }

      try {
        setLoading(true);
        setError(null);
        const entry = await rosterService.updateTags(coachId, athleteId, tags);
        return entry;
      } catch (e) {
        const errorInstance = e instanceof Error ? e : new Error(String(e));
        setError(errorInstance);
        throw errorInstance;
      } finally {
        setLoading(false);
      }
    },
    [coachId]
  );

  const removeAthlete = useCallback(
    async (
      athleteId: string,
      reason: 'GRADUATED' | 'MOVED' | 'INACTIVE' | 'OTHER',
      options?: { customReason?: string; archive?: boolean }
    ) => {
      if (!coachId) {
        throw new Error('Coach ID is required');
      }

      try {
        setLoading(true);
        setError(null);
        const record = await rosterService.removeAthlete(coachId, athleteId, reason, options);
        return record;
      } catch (e) {
        const errorInstance = e instanceof Error ? e : new Error(String(e));
        setError(errorInstance);
        throw errorInstance;
      } finally {
        setLoading(false);
      }
    },
    [coachId]
  );

  const undoRemoval = useCallback(
    async (removalId: string) => {
      if (!coachId) {
        throw new Error('Coach ID is required');
      }

      try {
        setLoading(true);
        setError(null);
        const entry = await rosterService.undoRemoval(coachId, removalId);
        return entry;
      } catch (e) {
        const errorInstance = e instanceof Error ? e : new Error(String(e));
        setError(errorInstance);
        throw errorInstance;
      } finally {
        setLoading(false);
      }
    },
    [coachId]
  );

  return useMemo(
    () => ({
      addNote,
      updateStatus,
      updateTags,
      removeAthlete,
      undoRemoval,
      loading,
      error,
      formatStatus: rosterService.formatStatus,
      getStatusColor: rosterService.getStatusColor,
      formatRevenue: rosterService.formatRevenue,
    }),
    [addNote, updateStatus, updateTags, removeAthlete, undoRemoval, loading, error]
  );
}

/**
 * Hook for managing coach group sessions.
 */
export function useCoachGroupSessionManagement(coachId: string | null | undefined) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createSession = useCallback(
    async (input: Omit<CreateGroupSessionInput, 'coachId'>) => {
      if (!coachId) {
        throw new Error('Coach ID is required');
      }

      try {
        setLoading(true);
        setError(null);
        const session = await groupSessionService.createSession({
          ...input,
          coachId,
        });
        return session;
      } catch (e) {
        const errorInstance = e instanceof Error ? e : new Error(String(e));
        setError(errorInstance);
        throw errorInstance;
      } finally {
        setLoading(false);
      }
    },
    [coachId]
  );

  const publishSession = useCallback(
    async (sessionId: string) => {
      try {
        setLoading(true);
        setError(null);
        const session = await groupSessionService.publishSession(sessionId);
        return session;
      } catch (e) {
        const errorInstance = e instanceof Error ? e : new Error(String(e));
        setError(errorInstance);
        throw errorInstance;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const cancelSession = useCallback(
    async (sessionId: string) => {
      try {
        setLoading(true);
        setError(null);
        const session = await groupSessionService.cancelSession(sessionId);
        return session;
      } catch (e) {
        const errorInstance = e instanceof Error ? e : new Error(String(e));
        setError(errorInstance);
        throw errorInstance;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getSessionRoster = useCallback(
    async (sessionId: string) => {
      try {
        setLoading(true);
        setError(null);
        const roster = await groupSessionService.getSessionRoster(sessionId);
        return roster;
      } catch (e) {
        const errorInstance = e instanceof Error ? e : new Error(String(e));
        setError(errorInstance);
        throw errorInstance;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const markAttendance = useCallback(
    async (registrationId: string, date: string, attended: boolean) => {
      try {
        setLoading(true);
        setError(null);
        const registration = await groupSessionService.markAttendance(
          registrationId,
          date,
          attended
        );
        return registration;
      } catch (e) {
        const errorInstance = e instanceof Error ? e : new Error(String(e));
        setError(errorInstance);
        throw errorInstance;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return useMemo(
    () => ({
      createSession,
      publishSession,
      cancelSession,
      getSessionRoster,
      markAttendance,
      loading,
      error,
      formatPrice: groupSessionService.formatPrice,
      formatSessionType: groupSessionService.formatSessionType,
    }),
    [createSession, publishSession, cancelSession, getSessionRoster, markAttendance, loading, error]
  );
}
