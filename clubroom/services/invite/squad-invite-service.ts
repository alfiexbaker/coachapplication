/**
 * Squad Invite Service
 *
 * Handles squad-level invitation functionality including:
 * - Squad invite previews
 * - Squad session invites tracking
 * - Squad member selection with metadata
 * - Invite history for squads
 */

import { apiClient } from '../api-client';
import { api } from '@/constants/config';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type {
  SquadMember,
  SquadInvite,
  SquadSessionInvite,
  SquadInvitedMember,
  SquadInviteHistoryEntry,
} from '@/constants/types';
import { squadService } from '../squad-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SquadInviteService');

const USE_MOCK = api.useMock;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SquadInvitePreview {
  squadId: string;
  squadName: string;
  memberCount: number;
  members: {
    athleteId: string;
    athleteName: string;
    athleteAge?: number;
    parentId: string;
    parentName: string;
  }[];
  uniqueParentCount: number;
}

export interface SquadMemberWithSelection extends SquadMember {
  isSelected: boolean;
  hasPendingInvite?: boolean;
  lastInvitedAt?: string;
}

// ============================================================================
// STORAGE & CACHING
// ============================================================================

let squadInvitesCache: SquadInvite[] = [];
let squadSessionInvitesCache: SquadSessionInvite[] = [];
let inviteHistoryCache: SquadInviteHistoryEntry[] = [];

export async function loadSquadInvites(): Promise<SquadInvite[]> {
  try {
    return await apiClient.get<SquadInvite[]>(STORAGE_KEYS.SQUAD_INVITES, []);
  } catch (error) {
    logger.error('Failed to load squad invites', error);
  }
  return [];
}

export async function saveSquadInvites(invites: SquadInvite[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.SQUAD_INVITES, invites);
    squadInvitesCache = invites;
  } catch (error) {
    logger.error('Failed to save squad invites', error);
  }
}

export async function loadSquadSessionInvites(): Promise<SquadSessionInvite[]> {
  try {
    return await apiClient.get<SquadSessionInvite[]>(STORAGE_KEYS.SQUAD_SESSION_INVITES, []);
  } catch (error) {
    logger.error('Failed to load squad session invites', error);
  }
  return [];
}

export async function saveSquadSessionInvites(invites: SquadSessionInvite[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.SQUAD_SESSION_INVITES, invites);
    squadSessionInvitesCache = invites;
  } catch (error) {
    logger.error('Failed to save squad session invites', error);
  }
}

export async function loadInviteHistory(): Promise<SquadInviteHistoryEntry[]> {
  try {
    return await apiClient.get<SquadInviteHistoryEntry[]>(STORAGE_KEYS.SQUAD_INVITE_HISTORY, []);
  } catch (error) {
    logger.error('Failed to load invite history', error);
  }
  return [];
}

export async function saveInviteHistory(history: SquadInviteHistoryEntry[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.SQUAD_INVITE_HISTORY, history);
    inviteHistoryCache = history;
  } catch (error) {
    logger.error('Failed to save invite history', error);
  }
}

// Export cache getters/setters for use by other services
export function getSquadInvitesCache(): SquadInvite[] {
  return squadInvitesCache;
}

export function setSquadInvitesCache(invites: SquadInvite[]): void {
  squadInvitesCache = invites;
}

export function getSquadSessionInvitesCache(): SquadSessionInvite[] {
  return squadSessionInvitesCache;
}

export function setSquadSessionInvitesCache(invites: SquadSessionInvite[]): void {
  squadSessionInvitesCache = invites;
}

export function getInviteHistoryCache(): SquadInviteHistoryEntry[] {
  return inviteHistoryCache;
}

export function setInviteHistoryCache(history: SquadInviteHistoryEntry[]): void {
  inviteHistoryCache = history;
}

// ============================================================================
// SQUAD INVITE SERVICE
// ============================================================================

export const squadInviteService = {
  // ==========================================================================
  // PREVIEW METHODS
  // ==========================================================================

  /**
   * Get squad invite preview - shows how many athletes/parents will be invited
   */
  async getSquadInvitePreview(
    squadId: string,
    excludeMemberIds: string[] = []
  ): Promise<SquadInvitePreview> {
    const squad = await squadService.getSquad(squadId);
    const members = await squadService.getSquadMembers(squadId);

    const eligibleMembers = members.filter(
      (m) => !excludeMemberIds.includes(m.athleteId)
    );

    const uniqueParents = new Set(eligibleMembers.map((m) => m.parentId));

    return {
      squadId,
      squadName: squad?.name || 'Unknown Squad',
      memberCount: eligibleMembers.length,
      members: eligibleMembers.map((m) => ({
        athleteId: m.athleteId,
        athleteName: m.athleteName,
        athleteAge: m.athleteAge,
        parentId: m.parentId,
        parentName: m.parentName,
      })),
      uniqueParentCount: uniqueParents.size,
    };
  },

  /**
   * Get preview for multiple squads
   */
  async getMultipleSquadsPreview(
    squadIds: string[],
    excludeMemberIds: string[] = []
  ): Promise<{
    squads: SquadInvitePreview[];
    totalMembers: number;
    totalParents: number;
  }> {
    const previews = await Promise.all(
      squadIds.map((id) => this.getSquadInvitePreview(id, excludeMemberIds))
    );

    // Count unique parents across all squads
    const allParentIds = new Set<string>();
    previews.forEach((p) => {
      p.members.forEach((m) => allParentIds.add(m.parentId));
    });

    return {
      squads: previews,
      totalMembers: previews.reduce((sum, p) => sum + p.memberCount, 0),
      totalParents: allParentIds.size,
    };
  },

  // ==========================================================================
  // SQUAD INVITE QUERY METHODS
  // ==========================================================================

  /**
   * Get all squad invites for a specific target
   */
  async getSquadInvitesForTarget(
    targetType: 'SESSION' | 'MATCH' | 'EVENT',
    targetId: string
  ): Promise<SquadInvite[]> {
    squadInvitesCache = await loadSquadInvites();
    return squadInvitesCache.filter(
      (si) => si.targetType === targetType && si.targetId === targetId
    );
  },

  /**
   * Get all squad invites by coach
   */
  async getSquadInvitesByCoach(coachId: string): Promise<SquadInvite[]> {
    squadInvitesCache = await loadSquadInvites();
    return squadInvitesCache.filter((si) => si.invitedBy === coachId);
  },

  /**
   * Get all squad members with selection state
   */
  async getSquadMembers(squadId: string): Promise<SquadMember[]> {
    return squadService.getSquadMembers(squadId);
  },

  /**
   * Get squad members with additional metadata for selection UI
   */
  async getSquadMembersWithMetadata(
    squadId: string,
    sessionId?: string
  ): Promise<SquadMemberWithSelection[]> {
    const members = await squadService.getSquadMembers(squadId);

    // Get existing invites to check for pending ones
    let existingInviteMap = new Map<string, { pending: boolean; lastInvited: string }>();

    if (sessionId) {
      squadSessionInvitesCache = await loadSquadSessionInvites();
      const relatedInvites = squadSessionInvitesCache.filter(
        (inv) => inv.squadId === squadId && inv.sessionId === sessionId
      );

      relatedInvites.forEach((inv) => {
        inv.invitedMembers.forEach((m) => {
          if (m.status === 'SENT') {
            existingInviteMap.set(m.athleteId, {
              pending: true,
              lastInvited: inv.sentAt,
            });
          }
        });
      });
    }

    return members.map((member) => ({
      ...member,
      isSelected: false,
      hasPendingInvite: existingInviteMap.get(member.athleteId)?.pending ?? false,
      lastInvitedAt: existingInviteMap.get(member.athleteId)?.lastInvited,
    }));
  },

  /**
   * Get squad members grouped by parent
   */
  async getSquadMembersGroupedByParent(
    squadId: string
  ): Promise<Map<string, { parent: { id: string; name: string; email?: string }; athletes: SquadMember[] }>> {
    const members = await squadService.getSquadMembers(squadId);
    const parentMap = new Map<string, { parent: { id: string; name: string; email?: string }; athletes: SquadMember[] }>();

    members.forEach((member) => {
      const existing = parentMap.get(member.parentId);
      if (existing) {
        existing.athletes.push(member);
      } else {
        parentMap.set(member.parentId, {
          parent: {
            id: member.parentId,
            name: member.parentName,
            email: member.parentEmail,
          },
          athletes: [member],
        });
      }
    });

    return parentMap;
  },

  // ==========================================================================
  // INVITE HISTORY
  // ==========================================================================

  /**
   * Get invite history for a squad
   */
  async getSquadInviteHistory(squadId: string): Promise<SquadInviteHistoryEntry[]> {
    inviteHistoryCache = await loadInviteHistory();
    return inviteHistoryCache
      .filter((entry) => entry.squadId === squadId)
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  },

  /**
   * Get all invite history for a coach
   */
  async getCoachInviteHistory(coachId: string): Promise<SquadInviteHistoryEntry[]> {
    inviteHistoryCache = await loadInviteHistory();
    return inviteHistoryCache
      .filter((entry) => entry.sentBy === coachId)
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  },

  /**
   * Add entry to invite history
   */
  async addToInviteHistory(entry: SquadInviteHistoryEntry): Promise<void> {
    inviteHistoryCache = await loadInviteHistory();
    inviteHistoryCache.push(entry);
    await saveInviteHistory(inviteHistoryCache);
  },

  /**
   * Update invite history entry
   */
  async updateInviteHistoryEntry(
    entryId: string,
    updates: Partial<Pick<SquadInviteHistoryEntry, 'acceptedCount' | 'declinedCount' | 'pendingCount' | 'status'>>
  ): Promise<void> {
    inviteHistoryCache = await loadInviteHistory();
    const index = inviteHistoryCache.findIndex((e) => e.id === entryId);
    if (index !== -1) {
      inviteHistoryCache[index] = { ...inviteHistoryCache[index], ...updates };
      await saveInviteHistory(inviteHistoryCache);
    }
  },

  /**
   * Get squad session invite by ID
   */
  async getSquadSessionInvite(inviteId: string): Promise<SquadSessionInvite | null> {
    squadSessionInvitesCache = await loadSquadSessionInvites();
    return squadSessionInvitesCache.find((inv) => inv.id === inviteId) || null;
  },

  /**
   * Get all squad session invites for a session
   */
  async getInvitesForSession(sessionId: string): Promise<SquadSessionInvite[]> {
    squadSessionInvitesCache = await loadSquadSessionInvites();
    return squadSessionInvitesCache.filter((inv) => inv.sessionId === sessionId);
  },

  /**
   * Get squad session invites by coach
   */
  async getInvitesByCoach(coachId: string): Promise<SquadSessionInvite[]> {
    squadSessionInvitesCache = await loadSquadSessionInvites();
    return squadSessionInvitesCache
      .filter((inv) => inv.sentBy === coachId)
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  },

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Get summary stats for a squad's invite activity
   */
  async getSquadInviteStats(squadId: string): Promise<{
    totalInvitesSent: number;
    totalAccepted: number;
    totalDeclined: number;
    acceptanceRate: number;
    lastInviteSentAt: string | null;
  }> {
    const history = await this.getSquadInviteHistory(squadId);

    if (history.length === 0) {
      return {
        totalInvitesSent: 0,
        totalAccepted: 0,
        totalDeclined: 0,
        acceptanceRate: 0,
        lastInviteSentAt: null,
      };
    }

    const totalInvitesSent = history.reduce((sum, h) => sum + h.inviteCount, 0);
    const totalAccepted = history.reduce((sum, h) => sum + h.acceptedCount, 0);
    const totalDeclined = history.reduce((sum, h) => sum + h.declinedCount, 0);
    const totalResponded = totalAccepted + totalDeclined;
    const acceptanceRate = totalResponded > 0 ? (totalAccepted / totalResponded) * 100 : 0;

    return {
      totalInvitesSent,
      totalAccepted,
      totalDeclined,
      acceptanceRate,
      lastInviteSentAt: history[0]?.sentAt || null,
    };
  },

  /**
   * Check if member has already been invited to a session
   */
  async hasMemberBeenInvited(memberId: string, sessionId: string): Promise<boolean> {
    squadSessionInvitesCache = await loadSquadSessionInvites();
    return squadSessionInvitesCache.some(
      (inv) =>
        inv.sessionId === sessionId &&
        inv.invitedMembers.some((m) => m.memberId === memberId && m.status === 'SENT')
    );
  },

  /**
   * Calculate how many unique notifications will be sent
   */
  async calculateNotificationCount(memberIds: string[], squadId: string): Promise<number> {
    const members = await squadService.getSquadMembers(squadId);
    const selectedMembers = members.filter((m) => memberIds.includes(m.id));
    const uniqueParents = new Set(selectedMembers.map((m) => m.parentId));
    return uniqueParents.size;
  },

  /**
   * Clear all squad invite caches (for testing)
   */
  async clearCache(): Promise<void> {
    squadInvitesCache = [];
    squadSessionInvitesCache = [];
    inviteHistoryCache = [];
    await apiClient.remove(STORAGE_KEYS.SQUAD_INVITES);
    await apiClient.remove(STORAGE_KEYS.SQUAD_SESSION_INVITES);
    await apiClient.remove(STORAGE_KEYS.SQUAD_INVITE_HISTORY);
  },
};
