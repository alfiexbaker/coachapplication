/**
 * useClubData Hook
 *
 * Centralized hook for fetching club information, members, sessions, and events.
 * Provides consistent data shape, loading states, and error handling.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  clubService,
  type ClubMember,
  type ClubMemberRemovalRecord,
} from '@/services/club-service';
import { groupSessionService } from '@/services/group-session-service';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';
import type { ClubSquad, GroupSession, ClubRole } from '@/constants/types';

const logger = createLogger('useClubData');

// ============================================================================
// TYPES
// ============================================================================

export interface ClubInfo {
  id: string;
  name: string;
  city: string;
  country?: string;
  badge?: string;
  photoUrl?: string;
  tagline?: string;
  memberCount: number;
  coachCount: number;
  squadCount: number;
  ownerId: string;
  ownerName: string;
  inviteCode: string;
}

export interface ClubMembersSummary {
  total: number;
  byRole: {
    owners: ClubMember[];
    admins: ClubMember[];
    headCoaches: ClubMember[];
    coaches: ClubMember[];
    members: ClubMember[];
  };
  pending: ClubMember[];
  active: ClubMember[];
  recentRemovals: ClubMemberRemovalRecord[];
}

export interface ClubSessionsSummary {
  upcomingSessions: GroupSession[];
  trainingSessions: GroupSession[];
  totalSessions: number;
}

export interface ClubDataResult {
  club: ClubInfo | null;
  members: ClubMembersSummary | null;
  sessions: ClubSessionsSummary | null;
  squads: ClubSquad[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook to fetch comprehensive club data including members, sessions, and squads.
 *
 * @param clubId - The ID of the club to fetch data for
 * @param options - Optional configuration
 * @returns ClubDataResult with club data, loading state, and error
 *
 * @example
 * ```tsx
 * const { club, members, sessions, loading, error } = useClubData('club_1');
 *
 * if (loading) return <LoadingSpinner />;
 * if (error) return <ErrorMessage error={error} />;
 *
 * return <ClubDashboard club={club} members={members} sessions={sessions} />;
 * ```
 */
export function useClubData(
  clubId: string | null | undefined,
  options?: {
    includeMembers?: boolean;
    includeSessions?: boolean;
    includeSquads?: boolean;
    includeRemovals?: boolean;
  },
): ClubDataResult {
  const {
    includeMembers = true,
    includeSessions = true,
    // Note: includeSquads option is available in API but squads are always fetched
    includeRemovals = false,
  } = options ?? {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [club, setClub] = useState<ClubInfo | null>(null);
  const [members, setMembers] = useState<ClubMembersSummary | null>(null);
  const [sessions, setSessions] = useState<ClubSessionsSummary | null>(null);
  const [squads, setSquads] = useState<ClubSquad[]>([]);

  const fetchData = useCallback(async () => {
    // Handle null/undefined clubId
    if (!clubId) {
      setClub(null);
      setMembers(null);
      setSessions(null);
      setSquads([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build promises array based on options
      const promises: Promise<unknown>[] = [];
      const promiseKeys: string[] = [];

      // Always fetch members for basic club info
      if (includeMembers) {
        promises.push(clubService.getMembers(clubId));
        promiseKeys.push('members');
      }

      if (includeSessions) {
        promises.push(groupSessionService.getClubTrainingSessions(clubId));
        promiseKeys.push('trainingSessions');
      }

      if (includeRemovals) {
        promises.push(clubService.getRemovalHistory(clubId));
        promiseKeys.push('removals');
      }

      // Fetch all data in parallel
      const results = await Promise.all(promises);

      // Map results by key
      const resultMap: Record<string, unknown> = {};
      promiseKeys.forEach((key, index) => {
        resultMap[key] = results[index];
      });

      // Build members summary if fetched
      if (resultMap.members) {
        const allMembers = resultMap.members as ClubMember[];
        const membersSummary: ClubMembersSummary = {
          total: allMembers.length,
          byRole: {
            owners: allMembers.filter((m) => m.role === 'OWNER'),
            admins: allMembers.filter((m) => m.role === 'ADMIN'),
            headCoaches: allMembers.filter((m) => m.role === 'HEAD_COACH'),
            coaches: allMembers.filter((m) => m.role === 'COACH'),
            members: allMembers.filter((m) => m.role === 'MEMBER'),
          },
          pending: allMembers.filter((m) => m.status === 'pending'),
          active: allMembers.filter((m) => m.status === 'active'),
          recentRemovals: (resultMap.removals as ClubMemberRemovalRecord[] | undefined) ?? [],
        };
        setMembers(membersSummary);

        // Build basic club info from members data
        // Note: In a real app, this would come from a dedicated club endpoint
        const clubInfo: ClubInfo = {
          id: clubId,
          name: `Club ${clubId}`, // Would be populated from actual API
          city: '',
          memberCount: allMembers.length,
          coachCount: allMembers.filter((m) =>
            ['OWNER', 'ADMIN', 'HEAD_COACH', 'COACH'].includes(m.role),
          ).length,
          squadCount: 0,
          ownerId: membersSummary.byRole.owners[0]?.userId ?? '',
          ownerName: membersSummary.byRole.owners[0]?.userName ?? '',
          inviteCode: '',
        };
        setClub(clubInfo);
      }

      // Build sessions summary if fetched
      if (resultMap.trainingSessions) {
        const trainingSessions = resultMap.trainingSessions as GroupSession[];
        const now = toDateStr(new Date());

        const sessionsSummary: ClubSessionsSummary = {
          upcomingSessions: trainingSessions.filter((s) => {
            const nextDate = s.schedule[0]?.date;
            return nextDate && nextDate >= now;
          }),
          trainingSessions,
          totalSessions: trainingSessions.length,
        };
        setSessions(sessionsSummary);
      }
    } catch (e) {
      const errorInstance = e instanceof Error ? e : new Error(String(e));
      setError(errorInstance);
      logger.error('Error fetching club data', e);
    } finally {
      setLoading(false);
    }
  }, [clubId, includeMembers, includeSessions, includeRemovals]);

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
      club,
      members,
      sessions,
      squads,
      loading,
      error,
      refetch,
    }),
    [club, members, sessions, squads, loading, error, refetch],
  );
}

// ============================================================================
// HELPER HOOKS
// ============================================================================

/**
 * Lightweight hook for fetching just club members.
 */
export function useClubMembers(clubId: string | null | undefined) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);

  const fetchMembers = useCallback(async () => {
    if (!clubId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const membersList = await clubService.getMembers(clubId);
      setMembers(membersList);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Helper to filter members by role
  const getMembersByRole = useCallback(
    (role: ClubRole) => members.filter((m) => m.role === role),
    [members],
  );

  return useMemo(
    () => ({
      members,
      loading,
      error,
      refetch: fetchMembers,
      getMembersByRole,
      coaches: members.filter((m) => ['OWNER', 'ADMIN', 'HEAD_COACH', 'COACH'].includes(m.role)),
      athletes: members.filter((m) => m.role === 'MEMBER'),
    }),
    [members, loading, error, fetchMembers, getMembersByRole],
  );
}

/**
 * Lightweight hook for fetching club training sessions.
 */
export function useClubSessions(clubId: string | null | undefined) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [sessions, setSessions] = useState<GroupSession[]>([]);

  const fetchSessions = useCallback(async () => {
    if (!clubId) {
      setSessions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const sessionsList = await groupSessionService.getClubTrainingSessions(clubId);
      setSessions(sessionsList);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Compute upcoming sessions
  const upcomingSessions = useMemo(() => {
    const now = toDateStr(new Date());
    return sessions.filter((s) => {
      const nextDate = s.schedule[0]?.date;
      return nextDate && nextDate >= now;
    });
  }, [sessions]);

  return useMemo(
    () => ({
      sessions,
      upcomingSessions,
      loading,
      error,
      refetch: fetchSessions,
    }),
    [sessions, upcomingSessions, loading, error, fetchSessions],
  );
}

/**
 * Hook for managing club member removal operations.
 */
export function useClubMemberManagement(clubId: string | null | undefined) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const removeMember = useCallback(
    async (
      userId: string,
      reason: 'LEFT_CLUB' | 'INACTIVE' | 'CONDUCT' | 'SEASON_END' | 'OTHER',
      removedBy: { id: string; name: string },
      customReason?: string,
    ) => {
      if (!clubId) {
        throw new Error('Club ID is required');
      }

      try {
        setLoading(true);
        setError(null);
        const record = await clubService.removeMember(clubId, userId, reason, removedBy, {
          customReason,
        });
        return record;
      } catch (e) {
        const errorInstance = e instanceof Error ? e : new Error(String(e));
        setError(errorInstance);
        throw errorInstance;
      } finally {
        setLoading(false);
      }
    },
    [clubId],
  );

  const undoRemoval = useCallback(
    async (removalId: string) => {
      if (!clubId) {
        throw new Error('Club ID is required');
      }

      try {
        setLoading(true);
        setError(null);
        const member = await clubService.undoRemoval(clubId, removalId);
        return member;
      } catch (e) {
        const errorInstance = e instanceof Error ? e : new Error(String(e));
        setError(errorInstance);
        throw errorInstance;
      } finally {
        setLoading(false);
      }
    },
    [clubId],
  );

  return useMemo(
    () => ({
      removeMember,
      undoRemoval,
      loading,
      error,
      canRemoveMembers: clubService.canRemoveMembers,
      canBeRemoved: clubService.canBeRemoved,
      formatRemovalReason: clubService.formatRemovalReason,
    }),
    [removeMember, undoRemoval, loading, error],
  );
}
