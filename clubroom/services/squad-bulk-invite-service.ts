/**
 * Squad Bulk Invite Service
 *
 * Handles bulk session invites to squad members with enhanced tracking,
 * member selection, and invite history.
 *
 * API Integration Notes:
 * - POST /api/squads/:squadId/bulk-invite - Send bulk invites
 * - GET /api/squads/:squadId/members - Get squad members
 * - GET /api/squads/:squadId/invite-history - Get invite history
 * - POST /api/squads/invite-selected - Invite selected members
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  SquadMember,
  SquadSessionInvite,
  SquadInvitedMember,
  BulkInviteResult,
  BulkInviteError,
  SquadInviteHistoryEntry,
  TimeSlot,
} from '@/constants/types';
import { squadService } from './squad-service';
import { sessionInviteService } from './session-invite-service';
import { notificationService } from './notification-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SquadBulkInviteService');

const SQUAD_SESSION_INVITES_KEY = 'squad_session_invites';
const SQUAD_INVITE_HISTORY_KEY = 'squad_invite_history';
const USE_MOCK = true;

// Cache
let squadSessionInvitesCache: SquadSessionInvite[] = [];
let inviteHistoryCache: SquadInviteHistoryEntry[] = [];

// Storage helpers
async function loadSquadSessionInvites(): Promise<SquadSessionInvite[]> {
  try {
    const stored = await AsyncStorage.getItem(SQUAD_SESSION_INVITES_KEY);
    if (stored) return JSON.parse(stored);
  } catch (error) {
    logger.error('Failed to load squad session invites', error);
  }
  return [];
}

async function saveSquadSessionInvites(invites: SquadSessionInvite[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SQUAD_SESSION_INVITES_KEY, JSON.stringify(invites));
    squadSessionInvitesCache = invites;
  } catch (error) {
    logger.error('Failed to save squad session invites', error);
  }
}

async function loadInviteHistory(): Promise<SquadInviteHistoryEntry[]> {
  try {
    const stored = await AsyncStorage.getItem(SQUAD_INVITE_HISTORY_KEY);
    if (stored) return JSON.parse(stored);
  } catch (error) {
    console.error('[SquadBulkInviteService] Failed to load invite history:', error);
  }
  return [];
}

async function saveInviteHistory(history: SquadInviteHistoryEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SQUAD_INVITE_HISTORY_KEY, JSON.stringify(history));
    inviteHistoryCache = history;
  } catch (error) {
    console.error('[SquadBulkInviteService] Failed to save invite history:', error);
  }
}

// Input interfaces
export interface CreateBulkInviteInput {
  squadId: string;
  sessionId: string;
  sessionTitle: string;
  coachId: string;
  coachName: string;
  coachPhotoUrl?: string;
  clubName?: string;
  proposedSlots: TimeSlot[];
  sessionType: string;
  focus: string;
  notes?: string;
  priceUsd?: number;
  expiresInDays?: number;
}

export interface InviteSelectedMembersInput {
  memberIds: string[];
  sessionId: string;
  sessionTitle: string;
  coachId: string;
  coachName: string;
  coachPhotoUrl?: string;
  clubName?: string;
  proposedSlots: TimeSlot[];
  sessionType: string;
  focus: string;
  notes?: string;
  priceUsd?: number;
  expiresInDays?: number;
}

export interface SquadMemberWithSelection extends SquadMember {
  isSelected: boolean;
  hasPendingInvite?: boolean;
  lastInvitedAt?: string;
}

export const squadBulkInviteService = {
  // ============================================================================
  // SQUAD MEMBER QUERIES
  // ============================================================================

  /**
   * Get all members of a squad with selection state
   * @param squadId - The squad ID
   * @returns Array of squad members with selection metadata
   */
  async getSquadMembers(squadId: string): Promise<SquadMember[]> {
    return squadService.getSquadMembers(squadId);
  },

  /**
   * Get squad members with additional metadata for selection UI
   * Includes info about pending invites and last invite time
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
   * Useful for displaying how many notifications will be sent
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

  // ============================================================================
  // BULK INVITE OPERATIONS
  // ============================================================================

  /**
   * Create bulk invite to entire squad
   * Sends session invites to all active squad members
   */
  async createBulkInvite(input: CreateBulkInviteInput): Promise<{
    squadInvite: SquadSessionInvite;
    result: BulkInviteResult;
  }> {
    const squad = await squadService.getSquad(input.squadId);
    const members = await squadService.getSquadMembers(input.squadId);

    if (!squad) {
      throw new Error('Squad not found');
    }

    if (members.length === 0) {
      throw new Error('Squad has no active members');
    }

    const groupId = `squad_bulk_${input.squadId}_${Date.now()}`;
    const invitedMembers: SquadInvitedMember[] = [];
    const errors: BulkInviteError[] = [];
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    // Group members by parent to avoid duplicate notifications
    const parentMap = new Map<string, SquadMember[]>();
    members.forEach((m) => {
      const existing = parentMap.get(m.parentId) || [];
      parentMap.set(m.parentId, [...existing, m]);
    });

    if (USE_MOCK) {
      // Create invites for each parent
      for (const [parentId, athletes] of parentMap.entries()) {
        try {
          const invite = await sessionInviteService.createInvite({
            coachId: input.coachId,
            coachName: input.coachName,
            coachPhotoUrl: input.coachPhotoUrl,
            clubName: input.clubName || squad.name,
            athleteIds: athletes.map((a) => a.athleteId),
            athleteNames: athletes.map((a) => a.athleteName),
            parentId,
            parentName: athletes[0].parentName,
            proposedSlots: input.proposedSlots,
            sessionType: input.sessionType,
            focus: input.focus,
            notes: input.notes
              ? `[${squad.name}] ${input.notes}`
              : `Squad Training: ${squad.name}`,
            priceUsd: input.priceUsd,
            expiresInDays: input.expiresInDays ?? 7,
            groupId,
          });

          // Mark all athletes for this parent as sent
          athletes.forEach((athlete) => {
            invitedMembers.push({
              memberId: athlete.id,
              athleteId: athlete.athleteId,
              athleteName: athlete.athleteName,
              parentId: athlete.parentId,
              parentName: athlete.parentName,
              inviteId: invite.id,
              status: 'SENT',
            });
            sent++;
          });
        } catch (error) {
          // Mark all athletes for this parent as failed
          athletes.forEach((athlete) => {
            invitedMembers.push({
              memberId: athlete.id,
              athleteId: athlete.athleteId,
              athleteName: athlete.athleteName,
              parentId: athlete.parentId,
              parentName: athlete.parentName,
              status: 'FAILED',
              failureReason: error instanceof Error ? error.message : 'Unknown error',
            });
            errors.push({
              memberId: athlete.id,
              athleteName: athlete.athleteName,
              error: error instanceof Error ? error.message : 'Unknown error',
              code: 'UNKNOWN',
            });
            failed++;
          });
        }
      }
    }

    const result: BulkInviteResult = {
      sent,
      failed,
      skipped,
      totalAttempted: members.length,
      errors,
      groupId,
    };

    const squadInvite: SquadSessionInvite = {
      id: groupId,
      squadId: input.squadId,
      squadName: squad.name,
      sessionId: input.sessionId,
      sessionTitle: input.sessionTitle,
      invitedMembers,
      sentAt: new Date().toISOString(),
      sentBy: input.coachId,
      sentByName: input.coachName,
      status: failed === 0 ? 'SENT' : failed === members.length ? 'FAILED' : 'PARTIAL',
      result,
    };

    // Save to storage
    squadSessionInvitesCache = await loadSquadSessionInvites();
    squadSessionInvitesCache.push(squadInvite);
    await saveSquadSessionInvites(squadSessionInvitesCache);

    // Create history entry
    await this.addToInviteHistory({
      id: groupId,
      squadId: input.squadId,
      squadName: squad.name,
      sessionId: input.sessionId,
      sessionTitle: input.sessionTitle,
      sessionType: input.sessionType,
      focus: input.focus,
      sentAt: new Date().toISOString(),
      sentBy: input.coachId,
      sentByName: input.coachName,
      inviteCount: sent,
      acceptedCount: 0,
      declinedCount: 0,
      pendingCount: sent,
      status: 'ACTIVE',
    });

    // Send summary notification to coach
    await notificationService.create({
      id: `notif_bulk_${Date.now()}`,
      type: 'booking',
      title: 'Squad Invites Sent',
      body: `${sent} invite${sent !== 1 ? 's' : ''} sent to ${squad.name}${failed > 0 ? ` (${failed} failed)` : ''}`,
      timeLabel: 'Just now',
    });

    return { squadInvite, result };
  },

  /**
   * Invite selected members (subset of squad)
   * Allows coach to pick specific members to invite
   */
  async inviteSelectedMembers(input: InviteSelectedMembersInput): Promise<{
    result: BulkInviteResult;
    invitedMembers: SquadInvitedMember[];
  }> {
    if (input.memberIds.length === 0) {
      throw new Error('No members selected');
    }

    // Get member details for the selected IDs
    const allMembers = await squadService.getSquadMembers(input.memberIds[0]); // Get from first member's squad
    const selectedMembers: SquadMember[] = [];

    // We need to get all members across potentially multiple squads
    const uniqueSquadIds = new Set<string>();
    for (const memberId of input.memberIds) {
      // Load all squads and find the member
      squadSessionInvitesCache = await loadSquadSessionInvites();
    }

    // For simplicity, gather all members from all known squads
    const clubSquads = await squadService.getSquads('club_lions');
    for (const squad of clubSquads) {
      const members = await squadService.getSquadMembers(squad.id);
      members.forEach((m) => {
        if (input.memberIds.includes(m.id)) {
          selectedMembers.push(m);
        }
      });
    }

    if (selectedMembers.length === 0) {
      throw new Error('No valid members found for the provided IDs');
    }

    const groupId = `selected_${Date.now()}`;
    const invitedMembers: SquadInvitedMember[] = [];
    const errors: BulkInviteError[] = [];
    let sent = 0;
    let failed = 0;
    const skipped = 0;

    // Group by parent
    const parentMap = new Map<string, SquadMember[]>();
    selectedMembers.forEach((m) => {
      const existing = parentMap.get(m.parentId) || [];
      parentMap.set(m.parentId, [...existing, m]);
    });

    if (USE_MOCK) {
      for (const [parentId, athletes] of parentMap.entries()) {
        try {
          const invite = await sessionInviteService.createInvite({
            coachId: input.coachId,
            coachName: input.coachName,
            coachPhotoUrl: input.coachPhotoUrl,
            clubName: input.clubName,
            athleteIds: athletes.map((a) => a.athleteId),
            athleteNames: athletes.map((a) => a.athleteName),
            parentId,
            parentName: athletes[0].parentName,
            proposedSlots: input.proposedSlots,
            sessionType: input.sessionType,
            focus: input.focus,
            notes: input.notes,
            priceUsd: input.priceUsd,
            expiresInDays: input.expiresInDays ?? 7,
            groupId,
          });

          athletes.forEach((athlete) => {
            invitedMembers.push({
              memberId: athlete.id,
              athleteId: athlete.athleteId,
              athleteName: athlete.athleteName,
              parentId: athlete.parentId,
              parentName: athlete.parentName,
              inviteId: invite.id,
              status: 'SENT',
            });
            sent++;
          });
        } catch (error) {
          athletes.forEach((athlete) => {
            invitedMembers.push({
              memberId: athlete.id,
              athleteId: athlete.athleteId,
              athleteName: athlete.athleteName,
              parentId: athlete.parentId,
              parentName: athlete.parentName,
              status: 'FAILED',
              failureReason: error instanceof Error ? error.message : 'Unknown error',
            });
            errors.push({
              memberId: athlete.id,
              athleteName: athlete.athleteName,
              error: error instanceof Error ? error.message : 'Unknown error',
              code: 'UNKNOWN',
            });
            failed++;
          });
        }
      }
    }

    const result: BulkInviteResult = {
      sent,
      failed,
      skipped,
      totalAttempted: selectedMembers.length,
      errors,
      groupId,
    };

    return { result, invitedMembers };
  },

  // ============================================================================
  // INVITE HISTORY
  // ============================================================================

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
   * Update invite history entry (e.g., when responses come in)
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

  // ============================================================================
  // SQUAD SESSION INVITE QUERIES
  // ============================================================================

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

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Calculate how many unique notifications will be sent
   * (accounts for siblings with same parent)
   */
  async calculateNotificationCount(memberIds: string[], squadId: string): Promise<number> {
    const members = await squadService.getSquadMembers(squadId);
    const selectedMembers = members.filter((m) => memberIds.includes(m.id));
    const uniqueParents = new Set(selectedMembers.map((m) => m.parentId));
    return uniqueParents.size;
  },

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
   * Clear all cached data (for testing)
   */
  async clearCache(): Promise<void> {
    squadSessionInvitesCache = [];
    inviteHistoryCache = [];
    await AsyncStorage.removeItem(SQUAD_SESSION_INVITES_KEY);
    await AsyncStorage.removeItem(SQUAD_INVITE_HISTORY_KEY);
  },
};
