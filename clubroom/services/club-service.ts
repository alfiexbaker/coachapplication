/**
 * Club Service
 *
 * Handles club management operations including member management,
 * club branding, dashboard stats, and calendar data aggregation.
 *
 * API Integration Notes:
 * - GET /v1/clubs/:id/members - Get club members
 * - DELETE /v1/clubs/:id/members/:userId - Remove member
 * - PATCH /v1/clubs/:id/members/:userId/role - Change member role
 * - PUT /v1/clubs/:id/squads/:squadId/members/:userId - Add member to squad
 * - DELETE /v1/clubs/:id/squads/:squadId/members/:userId - Remove member from squad
 * - GET /v1/clubs/:id/squads - Get club squads
 * - GET /v1/clubs/:id/schedule - Get club calendar and dashboard activity truth
 * - GET /v1/clubs/:id/branding - Get club branding
 * - PUT /v1/clubs/:id/branding - Update club branding
 */

import { apiClient, apiFetch } from './api-client';
import { clubScheduleService } from './club-schedule-service';
import { matchService } from './match-service';
import type { ClubActivity, ClubRole, ClubMembership, ClubSquad } from '@/constants/types';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  notFound,
  validationError,
  storageError,
} from '@/types/result';
import { createLogger } from '@/utils/logger';
import { emitTyped, ServiceEvents } from './event-bus';
import { api } from '@/constants/config';
import { normalizeLegacyMockDates } from '@/utils/mock-date-normalizer';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import {
  ORGANIZATION_ROLE_LABELS,
  canManageClubMembers,
  canManageClubRole,
  getAssignableClubRoles,
} from '@/contracts/club-governance';

const logger = createLogger('ClubService');

const USE_MOCK = api.useMock;

const ROLE_COLORS: Record<ClubRole, string> = {
  OWNER: '#7C3AED',
  ADMIN: '#2563EB',
  HEAD_COACH: '#16A34A',
  COACH: '#0891B2',
  ASSISTANT: '#D97706',
  MEMBER: '#6B7280',
};

function unwrapApiResult<T>(result: Result<T, ServiceError>): T {
  if (!result.success) {
    throw new Error(result.error.message);
  }
  return result.data;
}

// ============================================================================
// BRANDING TYPES
// ============================================================================

export interface ClubBranding {
  clubId: string;
  name: string;
  tagline: string;
  badgeUrl: string;
  coverPhotoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  updatedAt: string;
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface DashboardStats {
  sessionsThisWeek: number;
  matchesThisWeek: number;
  upcomingEvents: number;
  memberCount: number;
}

export interface MatchResult {
  id: string;
  opponent: string;
  date: string;
  scoreHome: number;
  scoreAway: number;
  outcome: 'W' | 'D' | 'L';
  squad: string;
}

// ============================================================================
// CALENDAR TYPES
// ============================================================================

export type CalendarEventType = 'session' | 'match' | 'event';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  type: CalendarEventType;
  squadId?: string;
  squadName?: string;
  location?: string;
}

interface ApiClubMembersResponse {
  members: ClubMember[];
}

interface ApiClubMemberResponse {
  member: ClubMember;
}

interface ApiClubMemberRemovalResponse {
  removal: ClubMemberRemovalRecord;
}

interface ApiClubSquadsResponse {
  squads: ClubSquad[];
}

interface ApiClubBrandingResponse {
  branding: ClubBranding;
}

function mapActivityToCalendarEvent(activity: ClubActivity): CalendarEvent {
  return {
    id: activity.id,
    title: activity.title,
    date: activity.startsAt.slice(0, 10),
    startTime: activity.startsAt.slice(11, 16),
    endTime: activity.endsAt?.slice(11, 16) ?? activity.startsAt.slice(11, 16),
    type: activity.kind === 'training' ? 'session' : activity.kind === 'match' ? 'match' : 'event',
    squadId:
      activity.squadId ?? (activity.squadIds.length === 1 ? activity.squadIds[0] : undefined),
    location: activity.locationLabel,
  };
}

// ============================================================================
// MOCK BRANDING DATA
// ============================================================================

const MOCK_BRANDING: Record<string, ClubBranding> = {
  default: {
    clubId: 'default',
    name: 'Riverside FC',
    tagline: 'Development through football',
    badgeUrl: '',
    coverPhotoUrl: '',
    primaryColor: '#0F172A',
    secondaryColor: '#1C8C5E',
    updatedAt: new Date().toISOString(),
  },
};

// ============================================================================
// MOCK DASHBOARD DATA
// ============================================================================

const MOCK_MATCH_RESULTS: MatchResult[] = [
  {
    id: 'm1',
    opponent: 'Valley United',
    date: '2026-02-01',
    scoreHome: 3,
    scoreAway: 1,
    outcome: 'W',
    squad: 'U15',
  },
  {
    id: 'm2',
    opponent: 'City Rangers',
    date: '2026-01-25',
    scoreHome: 1,
    scoreAway: 1,
    outcome: 'D',
    squad: 'U15',
  },
  {
    id: 'm3',
    opponent: 'Park Athletic',
    date: '2026-01-18',
    scoreHome: 0,
    scoreAway: 2,
    outcome: 'L',
    squad: 'Juniors',
  },
];

// ============================================================================
// MOCK CALENDAR DATA
// ============================================================================

const MOCK_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: 'ce1',
    title: 'U15 Training',
    date: '2026-02-05',
    startTime: '17:00',
    endTime: '18:30',
    type: 'session',
    squadId: 'squad_u15',
    squadName: 'U15',
    location: 'Main Pitch',
  },
  {
    id: 'ce2',
    title: 'U15 vs Valley United',
    date: '2026-02-08',
    startTime: '10:00',
    endTime: '12:00',
    type: 'match',
    squadId: 'squad_u15',
    squadName: 'U15',
    location: 'Away Ground',
  },
  {
    id: 'ce3',
    title: 'Juniors Training',
    date: '2026-02-05',
    startTime: '16:00',
    endTime: '17:00',
    type: 'session',
    squadId: 'squad_juniors',
    squadName: 'Juniors',
    location: 'Main Pitch',
  },
  {
    id: 'ce4',
    title: 'Club Social Evening',
    date: '2026-02-14',
    startTime: '18:00',
    endTime: '21:00',
    type: 'event',
    location: 'Clubhouse',
  },
  {
    id: 'ce5',
    title: 'U15 Training',
    date: '2026-02-07',
    startTime: '17:00',
    endTime: '18:30',
    type: 'session',
    squadId: 'squad_u15',
    squadName: 'U15',
    location: 'Main Pitch',
  },
  {
    id: 'ce6',
    title: 'Juniors vs Park Athletic',
    date: '2026-02-15',
    startTime: '09:00',
    endTime: '10:30',
    type: 'match',
    squadId: 'squad_juniors',
    squadName: 'Juniors',
    location: 'Home Ground',
  },
  {
    id: 'ce7',
    title: 'U15 Training',
    date: '2026-02-12',
    startTime: '17:00',
    endTime: '18:30',
    type: 'session',
    squadId: 'squad_u15',
    squadName: 'U15',
    location: 'Main Pitch',
  },
  {
    id: 'ce8',
    title: 'Juniors Training',
    date: '2026-02-12',
    startTime: '16:00',
    endTime: '17:00',
    type: 'session',
    squadId: 'squad_juniors',
    squadName: 'Juniors',
    location: 'Main Pitch',
  },
  {
    id: 'ce9',
    title: 'Coaches Meeting',
    date: '2026-02-10',
    startTime: '19:00',
    endTime: '20:00',
    type: 'event',
    location: 'Clubhouse',
  },
  {
    id: 'ce10',
    title: 'U15 Cup Match',
    date: '2026-02-22',
    startTime: '14:00',
    endTime: '16:00',
    type: 'match',
    squadId: 'squad_u15',
    squadName: 'U15',
    location: 'Neutral Venue',
  },
  {
    id: 'ce11',
    title: 'End of Term Awards',
    date: '2026-02-28',
    startTime: '17:00',
    endTime: '19:00',
    type: 'event',
    location: 'Clubhouse',
  },
  {
    id: 'ce12',
    title: 'U15 Training',
    date: '2026-02-19',
    startTime: '17:00',
    endTime: '18:30',
    type: 'session',
    squadId: 'squad_u15',
    squadName: 'U15',
    location: 'Main Pitch',
  },
  {
    id: 'ce13',
    title: 'Juniors Training',
    date: '2026-02-19',
    startTime: '16:00',
    endTime: '17:00',
    type: 'session',
    squadId: 'squad_juniors',
    squadName: 'Juniors',
    location: 'Main Pitch',
  },
  {
    id: 'ce14',
    title: 'Juniors Training',
    date: '2026-02-26',
    startTime: '16:00',
    endTime: '17:00',
    type: 'session',
    squadId: 'squad_juniors',
    squadName: 'Juniors',
    location: 'Main Pitch',
  },
  {
    id: 'ce15',
    title: 'U15 Training',
    date: '2026-02-26',
    startTime: '17:00',
    endTime: '18:30',
    type: 'session',
    squadId: 'squad_u15',
    squadName: 'U15',
    location: 'Main Pitch',
  },
];

export type MemberRemovalReason = 'LEFT_CLUB' | 'INACTIVE' | 'CONDUCT' | 'SEASON_END' | 'OTHER';

export interface ClubMemberRemovalRecord {
  id: string;
  clubId: string;
  userId: string;
  userName: string;
  userRole: ClubRole;
  reason: MemberRemovalReason;
  customReason?: string;
  removedBy: string;
  removedByName: string;
  removedAt: string;
  originalMembership?: ClubMembership;
}

export interface ClubMember {
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  role: ClubRole;
  status: 'active' | 'pending' | 'banned';
  joinedAt: string;
  squadIds?: string[];
  bannedAt?: string;
  bannedBy?: string;
  banReason?: string;
}

// Mock members data
const MOCK_MEMBERS: ClubMember[] = normalizeLegacyMockDates([
  {
    userId: 'coach1',
    userName: 'Director Kelly',
    role: 'OWNER',
    status: 'active',
    joinedAt: '2024-01-15',
    squadIds: ['squad_u15', 'squad_juniors'],
  },
  {
    userId: 'coach2',
    userName: 'Jess Okafor',
    role: 'COACH',
    status: 'active',
    joinedAt: '2024-03-20',
    squadIds: ['squad_u15'],
  },
  {
    userId: 'coach3',
    userName: 'Reuben Carr',
    role: 'COACH',
    status: 'pending',
    joinedAt: '2024-11-10',
    squadIds: ['squad_juniors'],
  },
  {
    userId: 'parent1',
    userName: 'Sarah Baker',
    role: 'MEMBER',
    status: 'active',
    joinedAt: '2024-06-01',
  },
  {
    userId: 'parent2',
    userName: 'Dan Mensah',
    role: 'MEMBER',
    status: 'active',
    joinedAt: '2024-07-15',
  },
]);

let membersCache: Map<string, ClubMember[]> = new Map();
let removalHistoryCache: ClubMemberRemovalRecord[] = [];

function cloneMember(member: ClubMember): ClubMember {
  return {
    ...member,
    squadIds: member.squadIds ? [...member.squadIds] : undefined,
  };
}

function cloneMembers(members: ClubMember[]): ClubMember[] {
  return members.map(cloneMember);
}

function cloneRemovalRecord(record: ClubMemberRemovalRecord): ClubMemberRemovalRecord {
  return {
    ...record,
    originalMembership: record.originalMembership
      ? {
          ...record.originalMembership,
          squadIds: record.originalMembership.squadIds
            ? [...record.originalMembership.squadIds]
            : undefined,
        }
      : undefined,
  };
}

function cloneRemovalHistory(history: ClubMemberRemovalRecord[]): ClubMemberRemovalRecord[] {
  return history.map(cloneRemovalRecord);
}

async function loadMembers(clubId: string): Promise<ClubMember[]> {
  const cached = membersCache.get(clubId);
  if (cached) {
    return cloneMembers(cached);
  }

  const seededMembers = cloneMembers(MOCK_MEMBERS);
  membersCache.set(clubId, seededMembers);
  return cloneMembers(seededMembers);
}

async function saveMembers(clubId: string, members: ClubMember[]): Promise<void> {
  membersCache.set(clubId, cloneMembers(members));
}

async function loadRemovalHistory(): Promise<ClubMemberRemovalRecord[]> {
  return cloneRemovalHistory(removalHistoryCache);
}

async function saveRemovalHistory(history: ClubMemberRemovalRecord[]): Promise<void> {
  removalHistoryCache = cloneRemovalHistory(history);
}

export const clubService = {
  /**
   * Get all members of a club
   */
  async getMembers(clubId: string): Promise<ClubMember[]> {
    if (USE_MOCK) {
      return loadMembers(clubId);
    }

    return unwrapApiResult(
      await apiFetch<ApiClubMembersResponse>(`/v1/clubs/${encodeURIComponent(clubId)}/members`, {
        method: 'GET',
      }),
    ).members;
  },

  /**
   * Remove a member from the club
   */
  async removeMember(
    clubId: string,
    userId: string,
    reason: MemberRemovalReason,
    removedBy: { id: string; name: string },
    options?: {
      customReason?: string;
    },
  ): Promise<Result<ClubMemberRemovalRecord, ServiceError>> {
    if (USE_MOCK) {
      const members = await loadMembers(clubId);
      const memberIndex = members.findIndex((m) => m.userId === userId);

      if (memberIndex === -1) {
        return err(notFound('Member', userId));
      }

      const member = members[memberIndex];

      // Create removal record
      const removalRecord: ClubMemberRemovalRecord = {
        id: `member_removal_${Date.now()}`,
        clubId,
        userId,
        userName: member.userName,
        userRole: member.role,
        reason,
        customReason: options?.customReason,
        removedBy: removedBy.id,
        removedByName: removedBy.name,
        removedAt: new Date().toISOString(),
        originalMembership: {
          clubId,
          userId: member.userId,
          role: member.role,
          status: member.status === 'banned' ? 'active' : member.status,
          joinSource: 'invite',
          squadIds: member.squadIds,
        },
      };

      // Remove from members
      members.splice(memberIndex, 1);
      await saveMembers(clubId, members);

      // Save to removal history
      removalHistoryCache = await loadRemovalHistory();
      removalHistoryCache.unshift(removalRecord);
      await saveRemovalHistory(removalHistoryCache);

      emitTyped(ServiceEvents.CLUB_MEMBER_LEFT, { clubId, userId });
      return ok(removalRecord);
    }

    const response = await apiFetch<ApiClubMemberRemovalResponse>(
      `/v1/clubs/${encodeURIComponent(clubId)}/members/${encodeURIComponent(userId)}`,
      {
        method: 'DELETE',
        body: JSON.stringify({
          reason,
          customReason: options?.customReason,
        }),
      },
    );
    if (!response.success) {
      return err(response.error);
    }
    emitTyped(ServiceEvents.CLUB_MEMBER_LEFT, { clubId, userId });
    return ok({
      ...response.data.removal,
      removedByName: response.data.removal.removedByName || removedBy.name,
    });
  },

  /**
   * Undo member removal (restore membership)
   */
  async undoRemoval(clubId: string, removalId: string): Promise<Result<ClubMember, ServiceError>> {
    if (USE_MOCK) {
      removalHistoryCache = await loadRemovalHistory();
      const recordIndex = removalHistoryCache.findIndex(
        (r) => r.id === removalId && r.clubId === clubId,
      );

      if (recordIndex === -1) {
        return err(notFound('Removal record', removalId));
      }

      const record = removalHistoryCache[recordIndex];

      if (!record.originalMembership) {
        return err(validationError('Cannot restore - membership data not available'));
      }

      // Restore member
      const members = await loadMembers(clubId);
      const restoredMember: ClubMember = {
        userId: record.userId,
        userName: record.userName,
        role: record.userRole,
        status: 'active',
        joinedAt: new Date().toISOString(),
        squadIds: record.originalMembership.squadIds,
      };
      members.push(restoredMember);
      await saveMembers(clubId, members);

      // Remove from removal history
      removalHistoryCache.splice(recordIndex, 1);
      await saveRemovalHistory(removalHistoryCache);

      return ok(restoredMember);
    }

    const response = await apiFetch<ApiClubMemberResponse>(
      `/v1/clubs/${encodeURIComponent(clubId)}/members/removals/${encodeURIComponent(removalId)}/restore`,
      {
        method: 'POST',
      },
    );
    if (!response.success) {
      return err(response.error);
    }
    return ok(response.data.member);
  },

  /**
   * Get removal history for a club
   */
  async getRemovalHistory(clubId: string): Promise<ClubMemberRemovalRecord[]> {
    if (USE_MOCK) {
      removalHistoryCache = await loadRemovalHistory();
      return removalHistoryCache.filter((r) => r.clubId === clubId);
    }

    logger.warn('Club member removal history is not backend-authoritative yet', { clubId });
    return [];
  },

  /**
   * Check if user can remove members (must be OWNER, ADMIN, or HEAD_COACH)
   */
  canRemoveMembers(userRole: ClubRole): boolean {
    return canManageClubMembers(userRole);
  },

  /**
   * Check if user can be removed (OWNER cannot be removed)
   */
  canBeRemoved(memberRole: ClubRole): boolean {
    return memberRole !== 'OWNER';
  },

  /**
   * Change a member's role
   */
  async changeMemberRole(
    clubId: string,
    userId: string,
    newRole: ClubRole,
    changedBy: { id: string; name: string },
  ): Promise<Result<ClubMember, ServiceError>> {
    if (USE_MOCK) {
      const members = await loadMembers(clubId);
      const memberIndex = members.findIndex((m) => m.userId === userId);

      if (memberIndex === -1) {
        return err(notFound('Member', userId));
      }

      if (members[memberIndex].role === 'OWNER') {
        return err(validationError('Cannot change the role of the club owner'));
      }

      members[memberIndex].role = newRole;
      await saveMembers(clubId, members);

      logger.info('MemberRoleChanged', { clubId, userId, newRole, changedBy: changedBy.id });
      return ok(members[memberIndex]);
    }

    const response = await apiFetch<ApiClubMemberResponse>(
      `/v1/clubs/${encodeURIComponent(clubId)}/members/${encodeURIComponent(userId)}/role`,
      {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      },
    );
    if (!response.success) {
      return err(response.error);
    }
    logger.info('MemberRoleChanged', { clubId, userId, newRole, changedBy: changedBy.id });
    return ok(response.data.member);
  },

  /**
   * Ban a member from the club
   */
  async banMember(
    clubId: string,
    userId: string,
    reason: string,
    bannedBy: { id: string; name: string },
  ): Promise<Result<ClubMemberRemovalRecord, ServiceError>> {
    if (USE_MOCK) {
      const members = await loadMembers(clubId);
      const memberIndex = members.findIndex((m) => m.userId === userId);

      if (memberIndex === -1) {
        return err(notFound('Member', userId));
      }

      const member = members[memberIndex];

      if (member.role === 'OWNER') {
        return err(validationError('Cannot ban the club owner'));
      }

      const removalRecord: ClubMemberRemovalRecord = {
        id: `member_ban_${Date.now()}`,
        clubId,
        userId,
        userName: member.userName,
        userRole: member.role,
        reason: 'CONDUCT',
        customReason: reason,
        removedBy: bannedBy.id,
        removedByName: bannedBy.name,
        removedAt: new Date().toISOString(),
        originalMembership: {
          clubId,
          userId: member.userId,
          role: member.role,
          status: member.status === 'banned' ? 'active' : member.status,
          joinSource: 'invite',
          squadIds: member.squadIds,
        },
      };

      members.splice(memberIndex, 1);
      await saveMembers(clubId, members);

      removalHistoryCache = await loadRemovalHistory();
      removalHistoryCache.unshift(removalRecord);
      await saveRemovalHistory(removalHistoryCache);

      emitTyped(ServiceEvents.CLUB_MEMBER_LEFT, { clubId, userId });
      logger.info('MemberBanned', { clubId, userId, reason, bannedBy: bannedBy.id });
      return ok(removalRecord);
    }

    const response = await apiFetch<ApiClubMemberRemovalResponse>(
      `/v1/clubs/${encodeURIComponent(clubId)}/members/${encodeURIComponent(userId)}/ban`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      },
    );
    if (!response.success) {
      return err(response.error);
    }
    emitTyped(ServiceEvents.CLUB_MEMBER_LEFT, { clubId, userId });
    logger.info('MemberBanned', { clubId, userId, reason, bannedBy: bannedBy.id });
    return ok({
      ...response.data.removal,
      removedByName: response.data.removal.removedByName || bannedBy.name,
    });
  },

  /**
   * Get a single member by userId
   */
  async getMember(clubId: string, userId: string): Promise<ClubMember | null> {
    const members = await this.getMembers(clubId);
    return members.find((m) => m.userId === userId) || null;
  },

  /**
   * Add a member to a squad
   */
  async addMemberToSquad(
    clubId: string,
    userId: string,
    squadId: string,
  ): Promise<Result<ClubMember, ServiceError>> {
    if (USE_MOCK) {
      const members = await loadMembers(clubId);
      const memberIndex = members.findIndex((m) => m.userId === userId);

      if (memberIndex === -1) {
        return err(notFound('Member', userId));
      }

      const squadIds = members[memberIndex].squadIds || [];
      if (!squadIds.includes(squadId)) {
        squadIds.push(squadId);
        members[memberIndex].squadIds = squadIds;
        await saveMembers(clubId, members);
      }

      emitTyped(ServiceEvents.SQUAD_MEMBER_ADDED, {
        squadId,
        clubId,
        userId,
        userName: members[memberIndex].userName,
      });

      return ok(members[memberIndex]);
    }

    const response = await apiFetch<ApiClubMemberResponse>(
      `/v1/clubs/${encodeURIComponent(clubId)}/squads/${encodeURIComponent(squadId)}/members/${encodeURIComponent(userId)}`,
      {
        method: 'PUT',
      },
    );
    if (!response.success) {
      return err(response.error);
    }
    emitTyped(ServiceEvents.SQUAD_MEMBER_ADDED, {
      squadId,
      clubId,
      userId,
      userName: response.data.member.userName,
    });
    return ok(response.data.member);
  },

  /**
   * Remove a member from a squad
   */
  async removeMemberFromSquad(
    clubId: string,
    userId: string,
    squadId: string,
  ): Promise<Result<ClubMember, ServiceError>> {
    if (USE_MOCK) {
      const members = await loadMembers(clubId);
      const memberIndex = members.findIndex((m) => m.userId === userId);

      if (memberIndex === -1) {
        return err(notFound('Member', userId));
      }

      const squadIds = members[memberIndex].squadIds || [];
      members[memberIndex].squadIds = squadIds.filter((id) => id !== squadId);
      await saveMembers(clubId, members);

      emitTyped(ServiceEvents.SQUAD_MEMBER_REMOVED, {
        squadId,
        clubId,
        userId,
        userName: members[memberIndex].userName,
      });

      return ok(members[memberIndex]);
    }

    const response = await apiFetch<ApiClubMemberResponse>(
      `/v1/clubs/${encodeURIComponent(clubId)}/squads/${encodeURIComponent(squadId)}/members/${encodeURIComponent(userId)}`,
      {
        method: 'DELETE',
      },
    );
    if (!response.success) {
      return err(response.error);
    }
    emitTyped(ServiceEvents.SQUAD_MEMBER_REMOVED, {
      squadId,
      clubId,
      userId,
      userName: response.data.member.userName,
    });
    return ok(response.data.member);
  },

  /**
   * Check if a role can manage another role (hierarchy check)
   */
  canManageRole(managerRole: ClubRole, targetRole: ClubRole): boolean {
    return canManageClubRole(managerRole, targetRole);
  },

  /**
   * Get the list of roles a manager can assign to a target
   */
  getAssignableRoles(managerRole: ClubRole): ClubRole[] {
    return getAssignableClubRoles(managerRole);
  },

  /**
   * Format removal reason for display
   */
  formatRemovalReason(reason: MemberRemovalReason): string {
    const labels: Record<MemberRemovalReason, string> = {
      LEFT_CLUB: 'Left club',
      INACTIVE: 'Inactive',
      CONDUCT: 'Conduct issue',
      SEASON_END: 'Season ended',
      OTHER: 'Other',
    };
    return labels[reason] || reason;
  },

  /**
   * Format role for display
   */
  formatRole(role: ClubRole): string {
    return ORGANIZATION_ROLE_LABELS[role] || role;
  },

  /**
   * Get role color
   */
  getRoleColor(role: ClubRole): string {
    return ROLE_COLORS[role] || '#6B7280';
  },

  // ============================================================================
  // BRANDING
  // ============================================================================

  /**
   * Get club branding data
   */
  async getBranding(clubId: string): Promise<ClubBranding> {
    if (USE_MOCK) {
      try {
        const stored = await apiClient.get<ClubBranding | null>(
          `${STORAGE_KEYS.CLUB_BRANDING}_${clubId}`,
          null,
        );
        if (stored) return stored;
      } catch (error) {
        logger.error('Failed to load branding', error);
      }
      return { ...MOCK_BRANDING.default, clubId };
    }
    return unwrapApiResult(
      await apiFetch<ApiClubBrandingResponse>(`/v1/clubs/${encodeURIComponent(clubId)}/branding`, {
        method: 'GET',
      }),
    ).branding;
  },

  /**
   * Update club branding
   */
  async updateBranding(
    clubId: string,
    branding: Partial<ClubBranding>,
  ): Promise<Result<ClubBranding, ServiceError>> {
    const current = await this.getBranding(clubId);
    const updated: ClubBranding = {
      ...current,
      ...branding,
      clubId,
      updatedAt: new Date().toISOString(),
    };

    if (USE_MOCK) {
      try {
        await apiClient.set(`${STORAGE_KEYS.CLUB_BRANDING}_${clubId}`, updated);
        logger.info('Branding updated', { clubId });
      } catch (error) {
        logger.error('Failed to save branding', error);
        return err(storageError('Failed to save branding'));
      }
      return ok(updated);
    }

    const response = await apiFetch<ApiClubBrandingResponse>(
      `/v1/clubs/${encodeURIComponent(clubId)}/branding`,
      {
        method: 'PUT',
        body: JSON.stringify({
          name: updated.name,
          tagline: updated.tagline,
          badgeUrl: updated.badgeUrl,
          coverPhotoUrl: updated.coverPhotoUrl,
          primaryColor: updated.primaryColor,
          secondaryColor: updated.secondaryColor,
        }),
      },
    );
    return response.success ? ok(response.data.branding) : err(response.error);
  },

  // ============================================================================
  // DASHBOARD
  // ============================================================================

  /**
   * Get dashboard statistics for a club
   */
  async getDashboardStats(clubId: string): Promise<DashboardStats> {
    if (USE_MOCK) {
      const members = await this.getMembers(clubId);
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      const weekEvents = MOCK_CALENDAR_EVENTS.filter((e) => {
        const d = new Date(e.date);
        return d >= startOfWeek && d < endOfWeek;
      });

      return {
        sessionsThisWeek: weekEvents.filter((e) => e.type === 'session').length,
        matchesThisWeek: weekEvents.filter((e) => e.type === 'match').length,
        upcomingEvents: MOCK_CALENDAR_EVENTS.filter((e) => {
          return e.type === 'event' && new Date(e.date) >= now;
        }).length,
        memberCount: members.length,
      };
    }

    const [members, activities] = await Promise.all([
      this.getMembers(clubId),
      clubScheduleService.getClubSchedule(clubId).then(unwrapApiResult),
    ]);
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    const weekActivities = activities.filter((activity) => {
      const startsAt = new Date(activity.startsAt);
      return startsAt >= startOfWeek && startsAt < endOfWeek && activity.status !== 'cancelled';
    });

    return {
      sessionsThisWeek: weekActivities.filter((activity) => activity.kind === 'training').length,
      matchesThisWeek: weekActivities.filter((activity) => activity.kind === 'match').length,
      upcomingEvents: activities.filter(
        (activity) =>
          activity.kind === 'informational' &&
          activity.status !== 'cancelled' &&
          new Date(activity.startsAt) >= now,
      ).length,
      memberCount: members.length,
    };
  },

  /**
   * Get recent match results
   */
  async getRecentResults(clubId: string, limit = 3): Promise<MatchResult[]> {
    if (USE_MOCK) {
      return MOCK_MATCH_RESULTS.slice(0, limit);
    }
    const matches = await matchService.getPastMatches(clubId);
    return matches.slice(0, limit).flatMap((match) => {
      if (!match.result) {
        return [];
      }
      const scoreHome = match.result.home;
      const scoreAway = match.result.away;
      const goalsFor = match.isHome ? scoreHome : scoreAway;
      const goalsAgainst = match.isHome ? scoreAway : scoreHome;
      const outcome = goalsFor > goalsAgainst ? 'W' : goalsFor < goalsAgainst ? 'L' : 'D';
      return [
        {
          id: match.id,
          opponent: match.opponent,
          date: match.date,
          scoreHome,
          scoreAway,
          outcome,
          squad: match.squadId ?? 'Club',
        },
      ];
    });
  },

  // ============================================================================
  // CALENDAR
  // ============================================================================

  /**
   * Get calendar events for a club, optionally filtered by month and squad
   */
  async getCalendarEvents(
    clubId: string,
    options?: { year?: number; month?: number; squadId?: string },
  ): Promise<CalendarEvent[]> {
    if (USE_MOCK) {
      let events = [...MOCK_CALENDAR_EVENTS];

      if (options?.year !== undefined && options?.month !== undefined) {
        events = events.filter((e) => {
          const d = new Date(e.date);
          return d.getFullYear() === options.year && d.getMonth() === options.month;
        });
      }

      if (options?.squadId) {
        events = events.filter((e) => e.squadId === options.squadId || !e.squadId);
      }

      return events.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      });
    }

    let activities = unwrapApiResult(await clubScheduleService.getClubSchedule(clubId));
    const squadId = options?.squadId;
    if (squadId) {
      activities = activities.filter(
        (activity) =>
          activity.squadId === squadId ||
          activity.squadIds.length === 0 ||
          activity.squadIds.includes(squadId),
      );
    }
    let events = activities.map(mapActivityToCalendarEvent);
    if (options?.year !== undefined && options?.month !== undefined) {
      events = events.filter((event) => {
        const [year, month] = event.date.split('-').map(Number);
        return year === options.year && month - 1 === options.month;
      });
    }
    return events.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });
  },

  /**
   * Get unique squads from calendar events (for filter)
   */
  async getCalendarSquads(clubId: string): Promise<{ id: string; name: string }[]> {
    if (USE_MOCK) {
      const seen = new Map<string, string>();
      for (const event of MOCK_CALENDAR_EVENTS) {
        if (event.squadId && event.squadName && !seen.has(event.squadId)) {
          seen.set(event.squadId, event.squadName);
        }
      }
      return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
    }
    const response = await apiFetch<ApiClubSquadsResponse>(
      `/v1/clubs/${encodeURIComponent(clubId)}/squads`,
    );
    if (!response.success) {
      logger.error('Failed to load calendar squads', response.error);
      return [];
    }
    return response.data.squads.map((squad) => ({
      id: squad.id,
      name: squad.name,
    }));
  },

  __seedMockMembers(clubId: string, members: ClubMember[]): void {
    membersCache.set(clubId, cloneMembers(members));
  },

  __resetMockMembers(clubId?: string): void {
    if (clubId) {
      membersCache.delete(clubId);
    } else {
      membersCache = new Map();
    }
    removalHistoryCache = [];
  },
};
