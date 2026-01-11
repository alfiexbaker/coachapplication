/**
 * Club Service
 *
 * Handles club management operations including member management.
 * Provides functionality for removing members and tracking removal history.
 *
 * API Integration Notes:
 * - GET /api/clubs/:id/members - Get club members
 * - DELETE /api/clubs/:id/members/:userId - Remove member
 * - GET /api/clubs/:id/members/removed - Get removal history
 * - POST /api/clubs/:id/members/removed/:recordId/undo - Undo removal
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClubMembership, ClubRole } from '@/constants/types';
import { clubMemberships } from '@/constants/mock-data';

const CLUB_MEMBERS_KEY = 'club_members';
const MEMBER_REMOVAL_KEY = 'club_member_removals';
const USE_MOCK = true;

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
};
