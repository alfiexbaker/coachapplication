/**
 * Club Service
 *
 * Handles club management operations including member management.
 * Provides functionality for removing members, leaving clubs, joining clubs,
 * and invite code validation with proper persistence.
 *
 * API Integration Notes:
 * - GET /api/clubs/:id/members - Get club members
 * - DELETE /api/clubs/:id/members/:userId - Remove member
 * - GET /api/clubs/:id/members/removed - Get removal history
 * - POST /api/clubs/:id/members/removed/:recordId/undo - Undo removal
 * - POST /api/clubs/:id/join - Join club with invite code
 * - POST /api/clubs/:id/leave - Leave club
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClubMembership, ClubRole, Club, ClubInvite } from '@/constants/types';
import { clubMemberships, clubInvites, clubs, getClubById } from '@/constants/mock-data';
import { createLogger } from '@/utils/logger';

const CLUB_MEMBERS_KEY = 'club_members';
const MEMBER_REMOVAL_KEY = 'club_member_removals';
const USER_MEMBERSHIPS_KEY = '@user_memberships';
const INVITE_CODES_KEY = '@invite_codes';
const CLUB_GROUP_CHATS_KEY = '@club_group_chats';
const USE_MOCK = true;

const logger = createLogger('ClubService');

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
    const stored = await AsyncStorage.getItem(`${CLUB_MEMBERS_KEY}_${clubId}`);
    if (stored) return JSON.parse(stored);
  } catch (error) {
    console.error('[ClubService] Failed to load members:', error);
  }
  return [...MOCK_MEMBERS];
}

async function saveMembers(clubId: string, members: ClubMember[]): Promise<void> {
  try {
    await AsyncStorage.setItem(`${CLUB_MEMBERS_KEY}_${clubId}`, JSON.stringify(members));
    membersCache.set(clubId, members);
  } catch (error) {
    console.error('[ClubService] Failed to save members:', error);
  }
}

async function loadRemovalHistory(): Promise<ClubMemberRemovalRecord[]> {
  try {
    const stored = await AsyncStorage.getItem(MEMBER_REMOVAL_KEY);
    if (stored) return JSON.parse(stored);
  } catch (error) {
    console.error('[ClubService] Failed to load removal history:', error);
  }
  return [];
}

async function saveRemovalHistory(history: ClubMemberRemovalRecord[]): Promise<void> {
  try {
    await AsyncStorage.setItem(MEMBER_REMOVAL_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('[ClubService] Failed to save removal history:', error);
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
  ): Promise<ClubMemberRemovalRecord> {
    if (USE_MOCK) {
      const members = await loadMembers(clubId);
      const memberIndex = members.findIndex((m) => m.userId === userId);

      if (memberIndex === -1) {
        throw new Error('Member not found in club');
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

      return removalRecord;
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
    return response.json();
  },

  /**
   * Undo member removal (restore membership)
   */
  async undoRemoval(clubId: string, removalId: string): Promise<ClubMember | null> {
    if (USE_MOCK) {
      removalHistoryCache = await loadRemovalHistory();
      const recordIndex = removalHistoryCache.findIndex(
        (r) => r.id === removalId && r.clubId === clubId
      );

      if (recordIndex === -1) {
        throw new Error('Removal record not found');
      }

      const record = removalHistoryCache[recordIndex];

      if (!record.originalMembership) {
        throw new Error('Cannot restore - membership data not available');
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

      return restoredMember;
    }

    const response = await fetch(`/api/clubs/${clubId}/members/removed/${removalId}/undo`, {
      method: 'POST',
    });
    if (!response.ok) return null;
    return response.json();
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
  // INVITE CODE VALIDATION & CLUB JOIN
  // ============================================================================

  /**
   * Validate an invite code and return the associated club
   */
  async validateInviteCode(code: string): Promise<{
    valid: boolean;
    club?: Club;
    invite?: ClubInvite;
    error?: string;
  }> {
    const trimmedCode = code.trim().toUpperCase();

    if (!trimmedCode) {
      return { valid: false, error: 'Please enter an invite code' };
    }

    // Check mock invite codes first
    const invite = clubInvites.find((item) => item.code.toUpperCase() === trimmedCode);

    if (!invite) {
      // Check stored custom invite codes
      try {
        const storedCodes = await AsyncStorage.getItem(INVITE_CODES_KEY);
        if (storedCodes) {
          const codeMap: Record<string, string> = JSON.parse(storedCodes);
          const clubId = codeMap[trimmedCode];
          if (clubId) {
            const club = getClubById(clubId);
            if (club) {
              return {
                valid: true,
                club,
                invite: {
                  code: trimmedCode,
                  clubId,
                  clubName: club.name,
                  createdBy: 'system',
                  createdByName: 'System',
                  role: 'MEMBER',
                  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                  remainingUses: 99,
                },
              };
            }
          }
        }
      } catch (error) {
        logger.error('validate_invite_code_storage_error', { error });
      }

      return { valid: false, error: 'Invalid invite code. Please check and try again.' };
    }

    // Check if invite has expired
    if (new Date(invite.expiresAt) < new Date()) {
      return { valid: false, error: 'This invite code has expired' };
    }

    // Check remaining uses
    if (invite.remainingUses <= 0) {
      return { valid: false, error: 'This invite code has reached its usage limit' };
    }

    // Get the club
    const club = getClubById(invite.clubId);
    if (!club) {
      return { valid: false, error: 'Club not found' };
    }

    logger.info('invite_code_validated', { code: trimmedCode, clubId: invite.clubId });

    return { valid: true, club, invite };
  },

  /**
   * Join a club using an invite code
   */
  async joinClub(
    userId: string,
    clubId: string,
    code: string,
    userName?: string
  ): Promise<{
    success: boolean;
    membership?: ClubMembership;
    club?: Club;
    error?: string;
  }> {
    // First validate the code
    const validation = await this.validateInviteCode(code);
    if (!validation.valid || !validation.invite || !validation.club) {
      return { success: false, error: validation.error || 'Invalid invite code' };
    }

    // Ensure the code matches the requested club
    if (validation.invite.clubId !== clubId) {
      return { success: false, error: 'Invite code does not match this club' };
    }

    // Check if user is already a member
    const existingMemberships = await this.getUserMemberships(userId);
    if (existingMemberships.some((m) => m.clubId === clubId && m.status === 'active')) {
      return { success: false, error: 'You are already a member of this club' };
    }

    // Create new membership
    const newMembership: ClubMembership = {
      clubId,
      userId,
      role: validation.invite.role,
      status: 'active',
      joinSource: 'invite',
      inviteCode: validation.invite.code,
      canPostAsClub: validation.invite.role === 'OWNER' || validation.invite.role === 'ADMIN',
    };

    // Save to user memberships
    existingMemberships.push(newMembership);
    await this.saveUserMemberships(userId, existingMemberships);

    // Add user to club members list
    const members = await loadMembers(clubId);
    members.push({
      userId,
      userName: userName || 'New Member',
      role: validation.invite.role,
      status: 'active',
      joinedAt: new Date().toISOString(),
    });
    await saveMembers(clubId, members);

    logger.info('user_joined_club', {
      userId,
      clubId,
      role: validation.invite.role,
      inviteCode: code,
    });

    return {
      success: true,
      membership: newMembership,
      club: validation.club,
    };
  },

  /**
   * Get all memberships for a user
   */
  async getUserMemberships(userId: string): Promise<ClubMembership[]> {
    try {
      const stored = await AsyncStorage.getItem(`${USER_MEMBERSHIPS_KEY}_${userId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      logger.error('get_user_memberships_failed', { userId, error });
    }

    // Fall back to mock data
    return clubMemberships.filter((m) => m.userId === userId && m.status === 'active');
  },

  /**
   * Save user memberships
   */
  async saveUserMemberships(userId: string, memberships: ClubMembership[]): Promise<void> {
    try {
      await AsyncStorage.setItem(`${USER_MEMBERSHIPS_KEY}_${userId}`, JSON.stringify(memberships));
    } catch (error) {
      logger.error('save_user_memberships_failed', { userId, error });
    }
  },

  // ============================================================================
  // LEAVE CLUB
  // ============================================================================

  /**
   * Leave a club - removes all user data and associations
   */
  async leaveClub(
    userId: string,
    clubId: string
  ): Promise<{
    success: boolean;
    clubName?: string;
    error?: string;
  }> {
    try {
      const club = getClubById(clubId);
      const clubName = club?.name || 'the club';

      // Check if user is the owner
      const memberships = await this.getUserMemberships(userId);
      const membership = memberships.find((m) => m.clubId === clubId);

      if (membership?.role === 'OWNER') {
        return {
          success: false,
          error: 'Club owners cannot leave. Transfer ownership first or delete the club.',
        };
      }

      // 1. Remove from user's memberships
      const updatedMemberships = memberships.filter((m) => m.clubId !== clubId);
      await this.saveUserMemberships(userId, updatedMemberships);

      // 2. Remove from club's member list
      const members = await loadMembers(clubId);
      const updatedMembers = members.filter((m) => m.userId !== userId);
      await saveMembers(clubId, updatedMembers);

      // 3. Remove user from club group chats
      await this.removeUserFromClubChats(userId, clubId);

      // 4. Clear related notifications (mark as handled)
      await this.clearClubNotifications(userId, clubId);

      logger.info('user_left_club', { userId, clubId, clubName });

      return { success: true, clubName };
    } catch (error) {
      logger.error('leave_club_failed', { userId, clubId, error });
      return { success: false, error: 'Failed to leave club. Please try again.' };
    }
  },

  /**
   * Remove user from club group chats
   */
  async removeUserFromClubChats(userId: string, clubId: string): Promise<void> {
    try {
      const key = `${CLUB_GROUP_CHATS_KEY}_${clubId}`;
      const stored = await AsyncStorage.getItem(key);

      if (stored) {
        const chatMembers: string[] = JSON.parse(stored);
        const updated = chatMembers.filter((id) => id !== userId);
        await AsyncStorage.setItem(key, JSON.stringify(updated));
      }

      logger.info('user_removed_from_club_chats', { userId, clubId });
    } catch (error) {
      logger.error('remove_from_club_chats_failed', { userId, clubId, error });
    }
  },

  /**
   * Clear club-related notifications for a user
   */
  async clearClubNotifications(userId: string, clubId: string): Promise<void> {
    try {
      const notifKey = 'clubroom.notifications';
      const stored = await AsyncStorage.getItem(notifKey);

      if (stored) {
        const notifications = JSON.parse(stored);
        const updated = notifications.filter(
          (n: { recipientId?: string; data?: { clubId?: string } }) =>
            !(n.recipientId === userId && n.data?.clubId === clubId)
        );
        await AsyncStorage.setItem(notifKey, JSON.stringify(updated));
      }

      logger.info('club_notifications_cleared', { userId, clubId });
    } catch (error) {
      logger.error('clear_club_notifications_failed', { userId, clubId, error });
    }
  },

  // ============================================================================
  // INVITE CODE MANAGEMENT
  // ============================================================================

  /**
   * Generate a new invite code for a club
   */
  async generateInviteCode(
    clubId: string,
    clubName: string,
    role: ClubRole = 'MEMBER'
  ): Promise<string> {
    // Generate random code: CLUBNAME-XXXX
    const prefix = clubName.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase();
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const code = `${prefix}-${suffix}`;

    // Store the code
    try {
      const stored = await AsyncStorage.getItem(INVITE_CODES_KEY);
      const codeMap: Record<string, string> = stored ? JSON.parse(stored) : {};
      codeMap[code] = clubId;
      await AsyncStorage.setItem(INVITE_CODES_KEY, JSON.stringify(codeMap));

      logger.info('invite_code_generated', { clubId, code, role });
    } catch (error) {
      logger.error('generate_invite_code_failed', { clubId, error });
    }

    return code;
  },

  /**
   * Regenerate invite code for a club (invalidates old code)
   */
  async regenerateInviteCode(
    clubId: string,
    clubName: string,
    oldCode: string
  ): Promise<string> {
    // Remove old code
    try {
      const stored = await AsyncStorage.getItem(INVITE_CODES_KEY);
      if (stored) {
        const codeMap: Record<string, string> = JSON.parse(stored);
        delete codeMap[oldCode.toUpperCase()];
        await AsyncStorage.setItem(INVITE_CODES_KEY, JSON.stringify(codeMap));
      }
    } catch (error) {
      logger.error('remove_old_invite_code_failed', { clubId, oldCode, error });
    }

    // Generate new code
    return this.generateInviteCode(clubId, clubName);
  },
};
