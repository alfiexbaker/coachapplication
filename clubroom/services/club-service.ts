/**
 * Club Service
 *
 * Handles club management operations including member management,
 * club branding, dashboard stats, and calendar data aggregation.
 *
 * API Integration Notes:
 * - GET /api/clubs/:id/members - Get club members
 * - DELETE /api/clubs/:id/members/:userId - Remove member
 * - GET /api/clubs/:id/members/removed - Get removal history
 * - POST /api/clubs/:id/members/removed/:recordId/undo - Undo removal
 * - GET /api/clubs/:id/branding - Get club branding
 * - PUT /api/clubs/:id/branding - Update club branding
 * - GET /api/clubs/:id/dashboard-stats - Get dashboard stats
 * - GET /api/clubs/:id/calendar - Get calendar events
 */

import { apiClient } from './api-client';
import type { ClubRole, ClubMembership } from '@/constants/types';
import { type Result, type ServiceError, ok, err, notFound, validationError, storageError } from '@/types/result';
import { createLogger } from '@/utils/logger';
import { api } from '@/constants/config';

import { STORAGE_KEYS } from '@/constants/storage-keys';

const logger = createLogger('ClubService');

const USE_MOCK = api.useMock;

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
  { id: 'm1', opponent: 'Valley United', date: '2026-02-01', scoreHome: 3, scoreAway: 1, outcome: 'W', squad: 'U15' },
  { id: 'm2', opponent: 'City Rangers', date: '2026-01-25', scoreHome: 1, scoreAway: 1, outcome: 'D', squad: 'U15' },
  { id: 'm3', opponent: 'Park Athletic', date: '2026-01-18', scoreHome: 0, scoreAway: 2, outcome: 'L', squad: 'Juniors' },
];

// ============================================================================
// MOCK CALENDAR DATA
// ============================================================================

const MOCK_CALENDAR_EVENTS: CalendarEvent[] = [
  { id: 'ce1', title: 'U15 Training', date: '2026-02-05', startTime: '17:00', endTime: '18:30', type: 'session', squadId: 'squad_u15', squadName: 'U15', location: 'Main Pitch' },
  { id: 'ce2', title: 'U15 vs Valley United', date: '2026-02-08', startTime: '10:00', endTime: '12:00', type: 'match', squadId: 'squad_u15', squadName: 'U15', location: 'Away Ground' },
  { id: 'ce3', title: 'Juniors Training', date: '2026-02-05', startTime: '16:00', endTime: '17:00', type: 'session', squadId: 'squad_juniors', squadName: 'Juniors', location: 'Main Pitch' },
  { id: 'ce4', title: 'Club Social Evening', date: '2026-02-14', startTime: '18:00', endTime: '21:00', type: 'event', location: 'Clubhouse' },
  { id: 'ce5', title: 'U15 Training', date: '2026-02-07', startTime: '17:00', endTime: '18:30', type: 'session', squadId: 'squad_u15', squadName: 'U15', location: 'Main Pitch' },
  { id: 'ce6', title: 'Juniors vs Park Athletic', date: '2026-02-15', startTime: '09:00', endTime: '10:30', type: 'match', squadId: 'squad_juniors', squadName: 'Juniors', location: 'Home Ground' },
  { id: 'ce7', title: 'U15 Training', date: '2026-02-12', startTime: '17:00', endTime: '18:30', type: 'session', squadId: 'squad_u15', squadName: 'U15', location: 'Main Pitch' },
  { id: 'ce8', title: 'Juniors Training', date: '2026-02-12', startTime: '16:00', endTime: '17:00', type: 'session', squadId: 'squad_juniors', squadName: 'Juniors', location: 'Main Pitch' },
  { id: 'ce9', title: 'Coaches Meeting', date: '2026-02-10', startTime: '19:00', endTime: '20:00', type: 'event', location: 'Clubhouse' },
  { id: 'ce10', title: 'U15 Cup Match', date: '2026-02-22', startTime: '14:00', endTime: '16:00', type: 'match', squadId: 'squad_u15', squadName: 'U15', location: 'Neutral Venue' },
  { id: 'ce11', title: 'End of Term Awards', date: '2026-02-28', startTime: '17:00', endTime: '19:00', type: 'event', location: 'Clubhouse' },
  { id: 'ce12', title: 'U15 Training', date: '2026-02-19', startTime: '17:00', endTime: '18:30', type: 'session', squadId: 'squad_u15', squadName: 'U15', location: 'Main Pitch' },
  { id: 'ce13', title: 'Juniors Training', date: '2026-02-19', startTime: '16:00', endTime: '17:00', type: 'session', squadId: 'squad_juniors', squadName: 'Juniors', location: 'Main Pitch' },
  { id: 'ce14', title: 'Juniors Training', date: '2026-02-26', startTime: '16:00', endTime: '17:00', type: 'session', squadId: 'squad_juniors', squadName: 'Juniors', location: 'Main Pitch' },
  { id: 'ce15', title: 'U15 Training', date: '2026-02-26', startTime: '17:00', endTime: '18:30', type: 'session', squadId: 'squad_u15', squadName: 'U15', location: 'Main Pitch' },
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
  status: 'active' | 'pending';
  joinedAt: string;
  squadIds?: string[];
}

// Mock members data
const MOCK_MEMBERS: ClubMember[] = [
  {
    userId: 'coach1',
    userName: 'Director Kelly',
    role: 'HEAD_COACH',
    status: 'active',
    joinedAt: '2024-01-15',
    squadIds: ['squad_u15', 'squad_juniors'],
  },
  {
    userId: 'coach2',
    userName: 'Sarah Mitchell',
    role: 'COACH',
    status: 'active',
    joinedAt: '2024-03-20',
    squadIds: ['squad_u15'],
  },
  {
    userId: 'coach3',
    userName: 'Mike Thompson',
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
    userName: 'Mike Wilson',
    role: 'MEMBER',
    status: 'active',
    joinedAt: '2024-07-15',
  },
];

let membersCache: Map<string, ClubMember[]> = new Map();
let removalHistoryCache: ClubMemberRemovalRecord[] = [];

async function loadMembers(clubId: string): Promise<ClubMember[]> {
  try {
    const stored = await apiClient.get<ClubMember[] | null>(`${STORAGE_KEYS.CLUB_MEMBERS}_${clubId}`, null);
    if (stored) return stored;
  } catch (error) {
    logger.error('Failed to load members', error);
  }
  return [...MOCK_MEMBERS];
}

async function saveMembers(clubId: string, members: ClubMember[]): Promise<void> {
  try {
    await apiClient.set(`${STORAGE_KEYS.CLUB_MEMBERS}_${clubId}`, members);
    membersCache.set(clubId, members);
  } catch (error) {
    logger.error('Failed to save members', error);
  }
}

async function loadRemovalHistory(): Promise<ClubMemberRemovalRecord[]> {
  try {
    const stored = await apiClient.get<ClubMemberRemovalRecord[] | null>(STORAGE_KEYS.CLUB_MEMBER_REMOVALS, null);
    if (stored) return stored;
  } catch (error) {
    logger.error('Failed to load removal history', error);
  }
  return [];
}

async function saveRemovalHistory(history: ClubMemberRemovalRecord[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.CLUB_MEMBER_REMOVALS, history);
  } catch (error) {
    logger.error('Failed to save removal history', error);
  }
}

export const clubService = {
  /**
   * Get all members of a club
   */
  async getMembers(clubId: string): Promise<ClubMember[]> {
    if (USE_MOCK) {
      if (!membersCache.has(clubId)) {
        const members = await loadMembers(clubId);
        membersCache.set(clubId, members);
      }
      return membersCache.get(clubId) || [];
    }

    const response = await fetch(`/api/clubs/${clubId}/members`);
    return response.json();
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
    }
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
          status: member.status,
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

      return ok(removalRecord);
    }

    const response = await fetch(`/api/clubs/${clubId}/members/${userId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason,
        customReason: options?.customReason,
        removedBy: removedBy.id,
      }),
    });
    return ok(await response.json());
  },

  /**
   * Undo member removal (restore membership)
   */
  async undoRemoval(clubId: string, removalId: string): Promise<Result<ClubMember, ServiceError>> {
    if (USE_MOCK) {
      removalHistoryCache = await loadRemovalHistory();
      const recordIndex = removalHistoryCache.findIndex(
        (r) => r.id === removalId && r.clubId === clubId
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

    const response = await fetch(`/api/clubs/${clubId}/members/removed/${removalId}/undo`, {
      method: 'POST',
    });
    if (!response.ok) return err(notFound('Removal record', removalId));
    return ok(await response.json());
  },

  /**
   * Get removal history for a club
   */
  async getRemovalHistory(clubId: string): Promise<ClubMemberRemovalRecord[]> {
    if (USE_MOCK) {
      removalHistoryCache = await loadRemovalHistory();
      return removalHistoryCache.filter((r) => r.clubId === clubId);
    }

    const response = await fetch(`/api/clubs/${clubId}/members/removed`);
    return response.json();
  },

  /**
   * Check if user can remove members (must be OWNER, ADMIN, or HEAD_COACH)
   */
  canRemoveMembers(userRole: ClubRole): boolean {
    return ['OWNER', 'ADMIN', 'HEAD_COACH'].includes(userRole);
  },

  /**
   * Check if user can be removed (OWNER cannot be removed)
   */
  canBeRemoved(memberRole: ClubRole): boolean {
    return memberRole !== 'OWNER';
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
    const labels: Record<ClubRole, string> = {
      OWNER: 'Owner',
      ADMIN: 'Admin',
      HEAD_COACH: 'Head Coach',
      COACH: 'Coach',
      MEMBER: 'Member',
    };
    return labels[role] || role;
  },

  /**
   * Get role color
   */
  getRoleColor(role: ClubRole): string {
    const colors: Record<ClubRole, string> = {
      OWNER: '#7C3AED',
      ADMIN: '#2563EB',
      HEAD_COACH: '#16A34A',
      COACH: '#0891B2',
      MEMBER: '#6B7280',
    };
    return colors[role] || '#6B7280';
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
        const stored = await apiClient.get<ClubBranding | null>(`${STORAGE_KEYS.CLUB_BRANDING}_${clubId}`, null);
        if (stored) return stored;
      } catch (error) {
        logger.error('Failed to load branding', error);
      }
      return { ...MOCK_BRANDING.default, clubId };
    }
    const response = await fetch(`/api/clubs/${clubId}/branding`);
    return response.json();
  },

  /**
   * Update club branding
   */
  async updateBranding(clubId: string, branding: Partial<ClubBranding>): Promise<Result<ClubBranding, ServiceError>> {
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

    const response = await fetch(`/api/clubs/${clubId}/branding`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    return ok(await response.json());
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

    const response = await fetch(`/api/clubs/${clubId}/dashboard-stats`);
    return response.json();
  },

  /**
   * Get recent match results
   */
  async getRecentResults(clubId: string, limit = 3): Promise<MatchResult[]> {
    if (USE_MOCK) {
      return MOCK_MATCH_RESULTS.slice(0, limit);
    }
    const response = await fetch(`/api/clubs/${clubId}/results?limit=${limit}`);
    return response.json();
  },

  // ============================================================================
  // CALENDAR
  // ============================================================================

  /**
   * Get calendar events for a club, optionally filtered by month and squad
   */
  async getCalendarEvents(
    clubId: string,
    options?: { year?: number; month?: number; squadId?: string }
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
        events = events.filter(
          (e) => e.squadId === options.squadId || !e.squadId
        );
      }

      return events.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      });
    }

    const params = new URLSearchParams();
    if (options?.year !== undefined) params.set('year', String(options.year));
    if (options?.month !== undefined) params.set('month', String(options.month));
    if (options?.squadId) params.set('squadId', options.squadId);

    const response = await fetch(`/api/clubs/${clubId}/calendar?${params.toString()}`);
    return response.json();
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
    const response = await fetch(`/api/clubs/${clubId}/squads`);
    return response.json();
  },
};
