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
  SessionInvite,
  SquadMember,
  SquadInvite,
  SquadSessionInvite,
  SquadInvitedMember,
  SquadInviteHistoryEntry,
} from '@/constants/types';
import { squadService } from '../squad-service';
import { userService } from '../user-service';
import { createLogger } from '@/utils/logger';
import { sessionInviteAuthorityService } from './session-invite-authority-service';

const logger = createLogger('SquadInviteService');

const USE_MOCK = api.useMock;
const API_MODE_SQUAD_INVITE_MESSAGE =
  'Squad invite local mirrors are unavailable in API mode; use /v1/invites for squad invite authority.';

function assertMockMirror(action: string, storageKey: string): void {
  if (USE_MOCK) return;

  logger.error(API_MODE_SQUAD_INVITE_MESSAGE, { action, storageKey });
  throw new Error(API_MODE_SQUAD_INVITE_MESSAGE);
}

async function resolveUserName(userId: string, fallback: string): Promise<string> {
  const userResult = await userService.getUserById(userId);
  if (!userResult.success) return fallback;
  return userResult.data.name || fallback;
}

async function resolveUserEmail(userId: string): Promise<string | undefined> {
  const userResult = await userService.getUserById(userId);
  if (!userResult.success) return undefined;
  return userResult.data.email || undefined;
}

type SessionInviteListResult = Awaited<
  ReturnType<typeof sessionInviteAuthorityService.getInviteHistory>
>;

function unwrapSessionInviteList(
  result: SessionInviteListResult,
  context: string,
): SessionInvite[] {
  if (!result.success) {
    logger.error('Failed to load squad invite data from API', {
      context,
      error: result.error,
    });
    throw result.error;
  }

  return result.data;
}

function getInviteSquadIds(invite: SessionInvite, squadId?: string): string[] {
  if (invite.inviteType !== 'SQUAD_ONLY') {
    return [];
  }

  const squadIds = invite.squadIds ?? [];
  return squadId ? squadIds.filter((id) => id === squadId) : squadIds;
}

function getInviteSentAt(invite: SessionInvite): string {
  return invite.createdAt || invite.respondedAt || invite.expiresAt;
}

function getInviteSessionId(invite: SessionInvite): string {
  return invite.existingSessionId || invite.groupId || invite.id;
}

function getInviteGroupKey(invite: SessionInvite): string {
  return invite.groupId || invite.existingSessionId || invite.id;
}

function inviteMatchesSession(invite: SessionInvite, sessionId: string): boolean {
  return (
    invite.id === sessionId ||
    invite.groupId === sessionId ||
    invite.existingSessionId === sessionId
  );
}

function getInviteMemberCount(invite: SessionInvite): number {
  return Math.max(invite.athleteIds.length, 1);
}

function isInviteExpired(invite: SessionInvite): boolean {
  if (invite.status === 'EXPIRED') return true;
  const expiresAt = Date.parse(invite.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt < Date.now();
}

function getInviteResponseCounts(invite: SessionInvite): {
  inviteCount: number;
  acceptedCount: number;
  declinedCount: number;
  pendingCount: number;
} {
  const inviteCount = getInviteMemberCount(invite);
  if (invite.status === 'ACCEPTED') {
    return { inviteCount, acceptedCount: inviteCount, declinedCount: 0, pendingCount: 0 };
  }

  if (invite.status === 'DECLINED') {
    return { inviteCount, acceptedCount: 0, declinedCount: inviteCount, pendingCount: 0 };
  }

  if (isInviteExpired(invite)) {
    return { inviteCount, acceptedCount: 0, declinedCount: 0, pendingCount: 0 };
  }

  return { inviteCount, acceptedCount: 0, declinedCount: 0, pendingCount: inviteCount };
}

function deriveHistoryStatus(entry: SquadInviteHistoryEntry): SquadInviteHistoryEntry['status'] {
  if (entry.pendingCount > 0) return 'ACTIVE';
  if (entry.acceptedCount > 0 || entry.declinedCount > 0) return 'COMPLETED';
  return 'EXPIRED';
}

function mapSessionInvitesToSquadHistory(
  invites: SessionInvite[],
  squadId?: string,
): SquadInviteHistoryEntry[] {
  const entries = new Map<string, SquadInviteHistoryEntry>();

  for (const invite of invites) {
    for (const currentSquadId of getInviteSquadIds(invite, squadId)) {
      const groupKey = getInviteGroupKey(invite);
      const key = `${currentSquadId}:${groupKey}`;
      const counts = getInviteResponseCounts(invite);
      const sentAt = getInviteSentAt(invite);
      const existing = entries.get(key);

      if (!existing) {
        entries.set(key, {
          id: `squad_history_${groupKey}_${currentSquadId}`,
          squadId: currentSquadId,
          sessionId: getInviteSessionId(invite),
          sessionType: invite.sessionType,
          focus: invite.focus,
          sentAt,
          sentBy: invite.coachId,
          inviteCount: counts.inviteCount,
          acceptedCount: counts.acceptedCount,
          declinedCount: counts.declinedCount,
          pendingCount: counts.pendingCount,
          status: 'ACTIVE',
        });
        continue;
      }

      existing.inviteCount += counts.inviteCount;
      existing.acceptedCount += counts.acceptedCount;
      existing.declinedCount += counts.declinedCount;
      existing.pendingCount += counts.pendingCount;
      if (new Date(sentAt).getTime() < new Date(existing.sentAt).getTime()) {
        existing.sentAt = sentAt;
      }
    }
  }

  return Array.from(entries.values())
    .map((entry) => ({ ...entry, status: deriveHistoryStatus(entry) }))
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
}

function mapSessionInvitesToSquadSessionInvites(
  invites: SessionInvite[],
  squadId?: string,
): SquadSessionInvite[] {
  const entries = new Map<string, SquadSessionInvite>();

  for (const invite of invites) {
    for (const currentSquadId of getInviteSquadIds(invite, squadId)) {
      const groupKey = getInviteGroupKey(invite);
      const key = `${currentSquadId}:${groupKey}`;
      const sentAt = getInviteSentAt(invite);
      const existing =
        entries.get(key) ??
        ({
          id: groupKey,
          squadId: currentSquadId,
          sessionId: getInviteSessionId(invite),
          invitedMembers: [],
          sentAt,
          sentBy: invite.coachId,
          status: 'SENT',
          result: {
            sent: 0,
            successful: 0,
            failed: 0,
            skipped: 0,
            totalAttempted: 0,
            errors: [],
            ...(invite.groupId ? { groupId: invite.groupId } : {}),
          },
        } satisfies SquadSessionInvite);

      for (const athleteId of invite.athleteIds) {
        existing.invitedMembers.push({
          memberId: athleteId,
          athleteId,
          parentId: invite.parentId,
          inviteId: invite.id,
          status: 'SENT',
        });
      }

      const memberCount = getInviteMemberCount(invite);
      existing.result.sent += memberCount;
      existing.result.successful += memberCount;
      existing.result.totalAttempted += memberCount;
      if (new Date(sentAt).getTime() < new Date(existing.sentAt).getTime()) {
        existing.sentAt = sentAt;
      }
      entries.set(key, existing);
    }
  }

  return Array.from(entries.values()).sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
  );
}

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
  assertMockMirror('loadSquadInvites', STORAGE_KEYS.SQUAD_INVITES);

  try {
    return await apiClient.get<SquadInvite[]>(STORAGE_KEYS.SQUAD_INVITES, []);
  } catch (error) {
    logger.error('Failed to load squad invites', error);
  }
  return [];
}

export async function saveSquadInvites(invites: SquadInvite[]): Promise<void> {
  assertMockMirror('saveSquadInvites', STORAGE_KEYS.SQUAD_INVITES);

  try {
    await apiClient.set(STORAGE_KEYS.SQUAD_INVITES, invites);
    squadInvitesCache = invites;
  } catch (error) {
    logger.error('Failed to save squad invites', error);
  }
}

export async function loadSquadSessionInvites(): Promise<SquadSessionInvite[]> {
  assertMockMirror('loadSquadSessionInvites', STORAGE_KEYS.SQUAD_SESSION_INVITES);

  try {
    return await apiClient.get<SquadSessionInvite[]>(STORAGE_KEYS.SQUAD_SESSION_INVITES, []);
  } catch (error) {
    logger.error('Failed to load squad session invites', error);
  }
  return [];
}

export async function saveSquadSessionInvites(invites: SquadSessionInvite[]): Promise<void> {
  assertMockMirror('saveSquadSessionInvites', STORAGE_KEYS.SQUAD_SESSION_INVITES);

  try {
    await apiClient.set(STORAGE_KEYS.SQUAD_SESSION_INVITES, invites);
    squadSessionInvitesCache = invites;
  } catch (error) {
    logger.error('Failed to save squad session invites', error);
  }
}

export async function loadInviteHistory(): Promise<SquadInviteHistoryEntry[]> {
  assertMockMirror('loadInviteHistory', STORAGE_KEYS.SQUAD_INVITE_HISTORY);

  try {
    return await apiClient.get<SquadInviteHistoryEntry[]>(STORAGE_KEYS.SQUAD_INVITE_HISTORY, []);
  } catch (error) {
    logger.error('Failed to load invite history', error);
  }
  return [];
}

export async function saveInviteHistory(history: SquadInviteHistoryEntry[]): Promise<void> {
  assertMockMirror('saveInviteHistory', STORAGE_KEYS.SQUAD_INVITE_HISTORY);

  try {
    await apiClient.set(STORAGE_KEYS.SQUAD_INVITE_HISTORY, history);
    inviteHistoryCache = history;
  } catch (error) {
    logger.error('Failed to save invite history', error);
  }
}

// Export cache getters/setters for use by other services
export function getSquadInvitesCache(): SquadInvite[] {
  assertMockMirror('getSquadInvitesCache', STORAGE_KEYS.SQUAD_INVITES);

  return squadInvitesCache;
}

export function setSquadInvitesCache(invites: SquadInvite[]): void {
  assertMockMirror('setSquadInvitesCache', STORAGE_KEYS.SQUAD_INVITES);

  squadInvitesCache = invites;
}

export function getSquadSessionInvitesCache(): SquadSessionInvite[] {
  assertMockMirror('getSquadSessionInvitesCache', STORAGE_KEYS.SQUAD_SESSION_INVITES);

  return squadSessionInvitesCache;
}

export function setSquadSessionInvitesCache(invites: SquadSessionInvite[]): void {
  assertMockMirror('setSquadSessionInvitesCache', STORAGE_KEYS.SQUAD_SESSION_INVITES);

  squadSessionInvitesCache = invites;
}

export function getInviteHistoryCache(): SquadInviteHistoryEntry[] {
  assertMockMirror('getInviteHistoryCache', STORAGE_KEYS.SQUAD_INVITE_HISTORY);

  return inviteHistoryCache;
}

export function setInviteHistoryCache(history: SquadInviteHistoryEntry[]): void {
  assertMockMirror('setInviteHistoryCache', STORAGE_KEYS.SQUAD_INVITE_HISTORY);

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
    excludeMemberIds: string[] = [],
  ): Promise<SquadInvitePreview> {
    const [squad, members] = await Promise.all([
      squadService.getSquad(squadId),
      squadService.getSquadMembers(squadId),
    ]);

    const eligibleMembers = members.filter((m) => !excludeMemberIds.includes(m.athleteId));

    const uniqueParents = new Set(eligibleMembers.map((m) => m.parentId));

    const previewMembers = await Promise.all(
      eligibleMembers.map(async (member, index) => {
        const [athleteName, parentName] = await Promise.all([
          resolveUserName(member.athleteId, `Athlete ${index + 1}`),
          resolveUserName(member.parentId, 'Parent'),
        ]);
        return {
          athleteId: member.athleteId,
          athleteName,
          parentId: member.parentId,
          parentName,
        };
      }),
    );

    return {
      squadId,
      squadName: squad?.name || 'Unknown Squad',
      memberCount: eligibleMembers.length,
      members: previewMembers,
      uniqueParentCount: uniqueParents.size,
    };
  },

  /**
   * Get preview for multiple squads
   */
  async getMultipleSquadsPreview(
    squadIds: string[],
    excludeMemberIds: string[] = [],
  ): Promise<{
    squads: SquadInvitePreview[];
    totalMembers: number;
    totalParents: number;
  }> {
    const previews = await Promise.all(
      squadIds.map((id) => this.getSquadInvitePreview(id, excludeMemberIds)),
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
    targetId: string,
  ): Promise<SquadInvite[]> {
    squadInvitesCache = await loadSquadInvites();
    return squadInvitesCache.filter(
      (si) => si.targetType === targetType && si.targetId === targetId,
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
    sessionId?: string,
  ): Promise<SquadMemberWithSelection[]> {
    const members = await squadService.getSquadMembers(squadId);

    // Get existing invites to check for pending ones
    let existingInviteMap = new Map<string, { pending: boolean; lastInvited: string }>();

    if (sessionId) {
      const relatedInvites = !USE_MOCK
        ? mapSessionInvitesToSquadSessionInvites(
            unwrapSessionInviteList(
              await sessionInviteAuthorityService.getInviteHistory(),
              'getSquadMembersWithMetadata',
            ).filter((invite) => inviteMatchesSession(invite, sessionId)),
            squadId,
          )
        : await loadSquadSessionInvites().then((invites) => {
            squadSessionInvitesCache = invites;
            return squadSessionInvitesCache.filter(
              (inv) => inv.squadId === squadId && inv.sessionId === sessionId,
            );
          });

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
    squadId: string,
  ): Promise<
    Map<string, { parent: { id: string; name: string; email?: string }; athletes: SquadMember[] }>
  > {
    const members = await squadService.getSquadMembers(squadId);
    const parentMap = new Map<
      string,
      { parent: { id: string; name: string; email?: string }; athletes: SquadMember[] }
    >();

    const parentProfiles = new Map(
      await Promise.all(
        Array.from(new Set(members.map((member) => member.parentId))).map(async (parentId) => {
          const [name, email] = await Promise.all([
            resolveUserName(parentId, 'Parent'),
            resolveUserEmail(parentId),
          ]);
          return [parentId, { id: parentId, name, email }] as const;
        }),
      ),
    );

    for (const member of members) {
      const existing = parentMap.get(member.parentId);
      if (existing) {
        existing.athletes.push(member);
      } else {
        const parent = parentProfiles.get(member.parentId) ?? {
          id: member.parentId,
          name: 'Parent',
          email: undefined,
        };

        parentMap.set(member.parentId, {
          parent,
          athletes: [member],
        });
      }
    }

    return parentMap;
  },

  // ==========================================================================
  // INVITE HISTORY
  // ==========================================================================

  /**
   * Get invite history for a squad
   */
  async getSquadInviteHistory(squadId: string): Promise<SquadInviteHistoryEntry[]> {
    if (!USE_MOCK) {
      return mapSessionInvitesToSquadHistory(
        unwrapSessionInviteList(
          await sessionInviteAuthorityService.getInviteHistory(),
          'getSquadInviteHistory',
        ),
        squadId,
      );
    }

    inviteHistoryCache = await loadInviteHistory();
    return inviteHistoryCache
      .filter((entry) => entry.squadId === squadId)
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  },

  /**
   * Get all invite history for a coach
   */
  async getCoachInviteHistory(coachId: string): Promise<SquadInviteHistoryEntry[]> {
    if (!USE_MOCK) {
      return mapSessionInvitesToSquadHistory(
        unwrapSessionInviteList(
          await sessionInviteAuthorityService.getCoachInvites(coachId),
          'getCoachInviteHistory',
        ),
      );
    }

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
    updates: Partial<
      Pick<SquadInviteHistoryEntry, 'acceptedCount' | 'declinedCount' | 'pendingCount' | 'status'>
    >,
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
    if (!USE_MOCK) {
      const invites = unwrapSessionInviteList(
        await sessionInviteAuthorityService.getInviteHistory(),
        'getSquadSessionInvite',
      ).filter((invite) => inviteMatchesSession(invite, inviteId));
      return mapSessionInvitesToSquadSessionInvites(invites)[0] ?? null;
    }

    squadSessionInvitesCache = await loadSquadSessionInvites();
    return squadSessionInvitesCache.find((inv) => inv.id === inviteId) || null;
  },

  /**
   * Get all squad session invites for a session
   */
  async getInvitesForSession(sessionId: string): Promise<SquadSessionInvite[]> {
    if (!USE_MOCK) {
      return mapSessionInvitesToSquadSessionInvites(
        unwrapSessionInviteList(
          await sessionInviteAuthorityService.getInviteHistory(),
          'getInvitesForSession',
        ).filter((invite) => inviteMatchesSession(invite, sessionId)),
      );
    }

    squadSessionInvitesCache = await loadSquadSessionInvites();
    return squadSessionInvitesCache.filter((inv) => inv.sessionId === sessionId);
  },

  /**
   * Get squad session invites by coach
   */
  async getInvitesByCoach(coachId: string): Promise<SquadSessionInvite[]> {
    if (!USE_MOCK) {
      return mapSessionInvitesToSquadSessionInvites(
        unwrapSessionInviteList(
          await sessionInviteAuthorityService.getCoachInvites(coachId),
          'getInvitesByCoach',
        ),
      );
    }

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
    if (!USE_MOCK) {
      const sessionInvites = await this.getInvitesForSession(sessionId);
      return sessionInvites.some((inv) =>
        inv.invitedMembers.some(
          (member) =>
            member.status === 'SENT' &&
            (member.memberId === memberId || member.athleteId === memberId),
        ),
      );
    }

    squadSessionInvitesCache = await loadSquadSessionInvites();
    return squadSessionInvitesCache.some(
      (inv) =>
        inv.sessionId === sessionId &&
        inv.invitedMembers.some((m) => m.memberId === memberId && m.status === 'SENT'),
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
    if (!USE_MOCK) {
      logger.warn(API_MODE_SQUAD_INVITE_MESSAGE, { action: 'clearCache' });
      return;
    }

    await Promise.all([
      apiClient.remove(STORAGE_KEYS.SQUAD_INVITES),
      apiClient.remove(STORAGE_KEYS.SQUAD_SESSION_INVITES),
      apiClient.remove(STORAGE_KEYS.SQUAD_INVITE_HISTORY),
    ]);
  },
};
