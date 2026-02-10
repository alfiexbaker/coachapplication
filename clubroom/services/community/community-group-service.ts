/**
 * Community Group Service
 *
 * Handles parent group management: CRUD operations, membership,
 * invitations, and role management with full role hierarchy.
 *
 * Role hierarchy: OWNER > ADMIN > MODERATOR > MEMBER
 *
 * API Integration Notes:
 * - Groups are persisted via storageService (AsyncStorage in dev, API in prod)
 * - Notifications are triggered on invite/join/role-change actions
 * - Role changes emit typed events via event bus
 */

import {
  ParentGroup,
  GroupType,
  GroupMember,
  GroupMemberRole,
} from '@/constants/types';
import { storageService } from '../storage-service';
import { notificationService } from '../notification-service';
import { type Result, type ServiceError, ok, err, notFound, validationError, conflictError, unauthorized } from '@/types/result';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';
import { emitTyped, ServiceEvents } from '../event-bus';

const logger = createLogger('CommunityGroupService');

// ============================================================================
// ROLE HIERARCHY
// ============================================================================

/**
 * Numeric weight for each role. Higher = more authority.
 */
const ROLE_WEIGHT: Record<GroupMemberRole, number> = {
  OWNER: 40,
  ADMIN: 30,
  MODERATOR: 20,
  MEMBER: 10,
};

/**
 * Roles that have admin-level privileges (can manage members).
 */
const ADMIN_ROLES: GroupMemberRole[] = ['OWNER', 'ADMIN'];

/**
 * Returns true when `a` outranks `b` in the hierarchy.
 */
function outranks(a: GroupMemberRole, b: GroupMemberRole): boolean {
  return ROLE_WEIGHT[a] > ROLE_WEIGHT[b];
}

/**
 * Returns true when the role has admin-level privileges.
 */
function isAdminRole(role: GroupMemberRole): boolean {
  return ADMIN_ROLES.includes(role);
}

// ============================================================================
// TYPES
// ============================================================================

// Group invite type
export interface GroupInvite {
  id: string;
  groupId: string;
  groupName: string;
  inviterId: string;
  inviterName: string;
  inviteeId: string;
  inviteeName: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
  respondedAt?: string;
}

export interface CreateGroupParams {
  name: string;
  description?: string;
  type: GroupType;
  memberIds: string[];
  memberNames: string[];
  creatorId: string;
  creatorName: string;
  isPublic?: boolean;
  clubId?: string;
  sessionId?: string;
  maxMembers?: number;
}

export interface ChangeMemberRoleParams {
  groupId: string;
  requesterId: string;
  memberId: string;
  newRole: GroupMemberRole;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockGroups: ParentGroup[] = [
  {
    id: 'group_1',
    name: 'U12 Parents',
    description: 'Group for parents of U12 squad members',
    type: 'CLUB',
    members: [
      { parentId: 'parent1', parentName: 'John Henderson', role: 'OWNER', joinedAt: '2024-01-15' },
      { parentId: 'parent2', parentName: 'Lisa Wilson', role: 'MEMBER', joinedAt: '2024-01-16' },
    ],
    createdById: 'parent1',
    createdByName: 'John Henderson',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-20',
    lastMessageAt: '2024-01-20T14:30:00Z',
    lastMessagePreview: 'See you all at training!',
    unreadCount: 2,
    clubId: 'club_1',
    isPublic: false,
  },
  {
    id: 'group_2',
    name: 'Saturday Sessions Carpool',
    description: 'Coordinate rides to Saturday training sessions',
    type: 'CARPOOL',
    members: [
      { parentId: 'parent1', parentName: 'John Henderson', role: 'OWNER', joinedAt: '2024-01-10' },
      { parentId: 'parent2', parentName: 'Lisa Wilson', role: 'MEMBER', joinedAt: '2024-01-10' },
    ],
    createdById: 'parent1',
    createdByName: 'John Henderson',
    createdAt: '2024-01-10',
    updatedAt: '2024-01-18',
    lastMessageAt: '2024-01-18T09:00:00Z',
    lastMessagePreview: 'I can take 3 kids this Saturday',
    unreadCount: 0,
    isPublic: true,
  },
  {
    id: 'group_3',
    name: 'Football Parents Chat',
    description: 'General chat for all football parents',
    type: 'GENERAL',
    members: [
      { parentId: 'parent1', parentName: 'John Henderson', role: 'MEMBER', joinedAt: '2024-01-05' },
      { parentId: 'parent2', parentName: 'Lisa Wilson', role: 'OWNER', joinedAt: '2024-01-05' },
    ],
    createdById: 'parent2',
    createdByName: 'Lisa Wilson',
    createdAt: '2024-01-05',
    updatedAt: '2024-01-19',
    lastMessageAt: '2024-01-19T16:45:00Z',
    lastMessagePreview: 'Anyone know a good supplier for boots?',
    unreadCount: 5,
    isPublic: true,
  },
];

// ============================================================================
// SERVICE
// ============================================================================

class CommunityGroupService {
  private inMemoryGroups: ParentGroup[] = [...mockGroups];

  /**
   * Get all groups (internal helper for cross-service access)
   */
  async getAllGroups(): Promise<Result<ParentGroup[], ServiceError>> {
    try {
      const persisted = await storageService.getItem<ParentGroup[]>(STORAGE_KEYS.PARENT_GROUPS, []);
      if (persisted.length > 0) {
        this.inMemoryGroups = persisted;
      }
      logger.info('all_groups_retrieved', { count: this.inMemoryGroups.length });
      return ok(this.inMemoryGroups);
    } catch (error) {
      logger.error('Failed to get all groups', error);
      return err({ code: 'STORAGE_ERROR', message: `Failed to get all groups: ${String(error)}` });
    }
  }

  /**
   * Get all groups that a user is a member of
   */
  async getParentGroups(parentId: string): Promise<Result<ParentGroup[], ServiceError>> {
    try {
      const allGroupsResult = await this.getAllGroups();
      if (!allGroupsResult.success) return allGroupsResult;

      const filtered = allGroupsResult.data.filter((group) =>
        group.members.some((member) => member.parentId === parentId)
      );

      logger.info('parent_groups_retrieved', { parentId, count: filtered.length });
      return ok(filtered);
    } catch (error) {
      logger.error('Failed to get parent groups', error);
      return err({ code: 'STORAGE_ERROR', message: `Failed to get parent groups: ${String(error)}` });
    }
  }

  /**
   * Get all available public groups
   */
  async getPublicGroups(): Promise<Result<ParentGroup[], ServiceError>> {
    try {
      const allGroupsResult = await this.getAllGroups();
      if (!allGroupsResult.success) return allGroupsResult;

      const filtered = allGroupsResult.data.filter((group) => group.isPublic);

      logger.info('public_groups_retrieved', { count: filtered.length });
      return ok(filtered);
    } catch (error) {
      logger.error('Failed to get public groups', error);
      return err({ code: 'STORAGE_ERROR', message: `Failed to get public groups: ${String(error)}` });
    }
  }

  /**
   * Get a single group by ID
   */
  async getGroup(groupId: string): Promise<Result<ParentGroup, ServiceError>> {
    try {
      const allGroupsResult = await this.getAllGroups();
      if (!allGroupsResult.success) return allGroupsResult;

      const group = allGroupsResult.data.find((group) => group.id === groupId);

      if (!group) {
        return err(notFound('Group', groupId));
      }

      logger.info('group_retrieved', { groupId });
      return ok(group);
    } catch (error) {
      logger.error('Failed to get group', error);
      return err({ code: 'STORAGE_ERROR', message: `Failed to get group: ${String(error)}` });
    }
  }

  /**
   * Create a new parent group.
   * The creator is assigned OWNER role.
   */
  async createGroup(params: CreateGroupParams): Promise<Result<ParentGroup, ServiceError>> {
    try {
      // Validation
      if (!params.name) {
        return err(validationError('Group name is required'));
      }
      if (!params.creatorId) {
        return err(validationError('Creator ID is required'));
      }

      const timestamp = new Date().toISOString();

      const members: GroupMember[] = [
        {
          parentId: params.creatorId,
          parentName: params.creatorName,
          role: 'OWNER',
          joinedAt: timestamp,
        },
        ...params.memberIds.map((id, index) => ({
          parentId: id,
          parentName: params.memberNames[index] || 'Unknown',
          role: 'MEMBER' as const,
          joinedAt: timestamp,
        })),
      ];

      const newGroup: ParentGroup = {
        id: `group_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        name: params.name,
        description: params.description,
        type: params.type,
        members,
        createdById: params.creatorId,
        createdByName: params.creatorName,
        createdAt: timestamp,
        updatedAt: timestamp,
        isPublic: params.isPublic ?? false,
        clubId: params.clubId,
        sessionId: params.sessionId,
        maxMembers: params.maxMembers,
      };

      this.inMemoryGroups.push(newGroup);
      await this.persistGroups();

      logger.info('group_created', { groupId: newGroup.id, type: params.type });
      return ok(newGroup);
    } catch (error) {
      logger.error('Failed to create group', error);
      return err({ code: 'STORAGE_ERROR', message: `Failed to create group: ${String(error)}` });
    }
  }

  /**
   * Join an existing group.
   *
   * When `isCoach` is true the member is always assigned the MEMBER role,
   * regardless of any other logic, so coaches start at the bottom of the
   * hierarchy and must be explicitly promoted.
   */
  async joinGroup(
    groupId: string,
    parentId: string,
    parentName: string,
    options?: { isCoach?: boolean },
  ): Promise<Result<ParentGroup, ServiceError>> {
    const allGroupsResult = await this.getAllGroups();
    if (!allGroupsResult.success) return allGroupsResult;

    const allGroups = allGroupsResult.data;
    const groupIndex = allGroups.findIndex((g) => g.id === groupId);
    if (groupIndex === -1) {
      return err(notFound('Group', groupId));
    }

    const group = allGroups[groupIndex];

    // Check if already a member
    if (group.members.some((m) => m.parentId === parentId)) {
      return err(conflictError('Already a member of this group'));
    }

    // Check max members limit
    if (group.maxMembers && group.members.length >= group.maxMembers) {
      return err(validationError('Group is full'));
    }

    // Check if group is public
    if (!group.isPublic) {
      return err(unauthorized('Cannot join private group without invitation'));
    }

    // Coaches always join as MEMBER
    const assignedRole: GroupMemberRole = 'MEMBER';
    const isCoach = options?.isCoach ?? false;

    const newMember: GroupMember = {
      parentId,
      parentName,
      role: assignedRole,
      joinedAt: new Date().toISOString(),
    };

    group.members.push(newMember);
    group.updatedAt = new Date().toISOString();

    this.inMemoryGroups = allGroups;
    await this.persistGroups();

    // Emit typed event
    emitTyped(ServiceEvents.GROUP_MEMBER_JOINED, {
      groupId,
      groupName: group.name,
      memberId: parentId,
      memberName: parentName,
      role: assignedRole,
      isCoach,
    });

    logger.info('member_joined_group', { groupId, parentId, isCoach, role: assignedRole });

    return ok(group);
  }

  /**
   * Leave a group
   */
  async leaveGroup(groupId: string, parentId: string): Promise<Result<void, ServiceError>> {
    const allGroupsResult = await this.getAllGroups();
    if (!allGroupsResult.success) return allGroupsResult;

    const allGroups = allGroupsResult.data;
    const groupIndex = allGroups.findIndex((g) => g.id === groupId);
    if (groupIndex === -1) {
      return err(notFound('Group', groupId));
    }

    const group = allGroups[groupIndex];
    const memberIndex = group.members.findIndex((m) => m.parentId === parentId);

    if (memberIndex === -1) {
      return err(notFound('Member', parentId));
    }

    // Check if this is the only admin/owner
    const memberRole = group.members[memberIndex].role;
    const isPrivileged = isAdminRole(memberRole) || memberRole === 'OWNER';
    const privilegedCount = group.members.filter(
      (m) => isAdminRole(m.role) || m.role === 'OWNER'
    ).length;

    if (isPrivileged && privilegedCount === 1 && group.members.length > 1) {
      return err(validationError('Cannot leave group as the only admin. Promote another member first.'));
    }

    group.members.splice(memberIndex, 1);
    group.updatedAt = new Date().toISOString();

    // If group is empty, remove it
    if (group.members.length === 0) {
      allGroups.splice(groupIndex, 1);
    }

    this.inMemoryGroups = allGroups;
    await this.persistGroups();
    return ok(undefined);
  }

  /**
   * Invite a parent to join a group
   */
  async inviteToGroup(
    groupId: string,
    inviterId: string,
    inviteeId: string,
    inviteeName: string
  ): Promise<Result<GroupInvite, ServiceError>> {
    const groupResult = await this.getGroup(groupId);
    if (!groupResult.success) return groupResult;

    const group = groupResult.data;

    // Check if inviter has admin privileges
    const inviter = group.members.find((m) => m.parentId === inviterId);
    if (!inviter || !isAdminRole(inviter.role)) {
      return err(unauthorized('Only group admins can invite members'));
    }

    // Check if already a member
    if (group.members.some((m) => m.parentId === inviteeId)) {
      return err(conflictError('User is already a member'));
    }

    // Check for existing pending invite
    const existingInvitesResult = await this.getGroupInvites(inviteeId);
    if (!existingInvitesResult.success) return existingInvitesResult;

    if (existingInvitesResult.data.some((i) => i.groupId === groupId && i.status === 'PENDING')) {
      return err(conflictError('Invite already sent'));
    }

    // Create the invite
    const invite: GroupInvite = {
      id: `group_invite_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      groupId,
      groupName: group.name,
      inviterId,
      inviterName: inviter.parentName,
      inviteeId,
      inviteeName,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    // Save invite
    const allInvites = await storageService.getItem<GroupInvite[]>(STORAGE_KEYS.GROUP_INVITES, []);
    allInvites.push(invite);
    await storageService.setItem(STORAGE_KEYS.GROUP_INVITES, allInvites);

    // Send notification to invitee
    await notificationService.create({
      id: `notif_group_invite_${Date.now()}`,
      type: 'community',
      title: 'Group Invite',
      body: `${inviter.parentName} invited you to join ${group.name}`,
      timeLabel: 'Just now',
      read: false,
      actionLabel: 'View Invite',
    });

    return ok(invite);
  }

  /**
   * Get pending group invites for a user
   */
  async getGroupInvites(userId: string): Promise<Result<GroupInvite[], ServiceError>> {
    try {
      const allInvites = await storageService.getItem<GroupInvite[]>(STORAGE_KEYS.GROUP_INVITES, []);
      const filtered = allInvites.filter((i) => i.inviteeId === userId);

      logger.info('group_invites_retrieved', { userId, count: filtered.length });
      return ok(filtered);
    } catch (error) {
      logger.error('Failed to get group invites', error);
      return err({ code: 'STORAGE_ERROR', message: `Failed to get group invites: ${String(error)}` });
    }
  }

  /**
   * Get pending invites for a user
   */
  async getPendingInvites(userId: string): Promise<Result<GroupInvite[], ServiceError>> {
    try {
      const invitesResult = await this.getGroupInvites(userId);
      if (!invitesResult.success) return invitesResult;

      const filtered = invitesResult.data.filter((i) => i.status === 'PENDING');

      logger.info('pending_invites_retrieved', { userId, count: filtered.length });
      return ok(filtered);
    } catch (error) {
      logger.error('Failed to get pending invites', error);
      return err({ code: 'STORAGE_ERROR', message: `Failed to get pending invites: ${String(error)}` });
    }
  }

  /**
   * Accept a group invite
   */
  async acceptGroupInvite(inviteId: string): Promise<Result<void, ServiceError>> {
    const allInvites = await storageService.getItem<GroupInvite[]>(STORAGE_KEYS.GROUP_INVITES, []);
    const inviteIndex = allInvites.findIndex((i) => i.id === inviteId);

    if (inviteIndex === -1) {
      return err(notFound('Invite', inviteId));
    }

    const invite = allInvites[inviteIndex];
    if (invite.status !== 'PENDING') {
      return err(conflictError('Invite already responded to'));
    }

    // Update invite status
    allInvites[inviteIndex].status = 'ACCEPTED';
    allInvites[inviteIndex].respondedAt = new Date().toISOString();
    await storageService.setItem(STORAGE_KEYS.GROUP_INVITES, allInvites);

    // Add member to group
    const groupResult = await this.getGroup(invite.groupId);
    if (groupResult.success) {
      const group = groupResult.data;
      const newMember: GroupMember = {
        parentId: invite.inviteeId,
        parentName: invite.inviteeName,
        role: 'MEMBER',
        joinedAt: new Date().toISOString(),
      };
      group.members.push(newMember);
      group.updatedAt = new Date().toISOString();
      await this.persistGroups();

      // Notify inviter
      await notificationService.create({
        id: `notif_invite_accepted_${Date.now()}`,
        type: 'community',
        title: 'Invite Accepted',
        body: `${invite.inviteeName} joined ${group.name}`,
        timeLabel: 'Just now',
        read: false,
      });
    }
    return ok(undefined);
  }

  /**
   * Decline a group invite
   */
  async declineGroupInvite(inviteId: string): Promise<Result<void, ServiceError>> {
    const allInvites = await storageService.getItem<GroupInvite[]>(STORAGE_KEYS.GROUP_INVITES, []);
    const inviteIndex = allInvites.findIndex((i) => i.id === inviteId);

    if (inviteIndex === -1) {
      return err(notFound('Invite', inviteId));
    }

    const invite = allInvites[inviteIndex];
    if (invite.status !== 'PENDING') {
      return err(conflictError('Invite already responded to'));
    }

    allInvites[inviteIndex].status = 'DECLINED';
    allInvites[inviteIndex].respondedAt = new Date().toISOString();
    await storageService.setItem(STORAGE_KEYS.GROUP_INVITES, allInvites);
    return ok(undefined);
  }

  // ============================================================================
  // ROLE MANAGEMENT (PROMOTION / DEMOTION)
  // ============================================================================

  /**
   * Legacy promote helper - promotes a member to ADMIN.
   * Kept for backward compatibility; prefer `changeMemberRole` for granular control.
   */
  async promoteMember(groupId: string, requesterId: string, memberId: string): Promise<Result<void, ServiceError>> {
    return this.changeMemberRole({ groupId, requesterId, memberId, newRole: 'ADMIN' });
  }

  /**
   * Change a member's role within a group.
   *
   * Rules enforced:
   * 1. Requester must have OWNER or ADMIN role.
   * 2. Cannot change your own role.
   * 3. Cannot assign a role higher than (or equal to) your own.
   * 4. Cannot change the role of someone who outranks you.
   * 5. OWNER role cannot be assigned via this method.
   *
   * A notification is sent to the member and a typed event is emitted.
   */
  async changeMemberRole(params: ChangeMemberRoleParams): Promise<Result<void, ServiceError>> {
    const { groupId, requesterId, memberId, newRole } = params;

    const groupResult = await this.getGroup(groupId);
    if (!groupResult.success) return groupResult;

    const group = groupResult.data;

    const requester = group.members.find((m) => m.parentId === requesterId);
    if (!requester || !isAdminRole(requester.role)) {
      return err(unauthorized('Only group owners and admins can change member roles'));
    }

    if (requesterId === memberId) {
      return err(validationError('Cannot change your own role'));
    }

    const member = group.members.find((m) => m.parentId === memberId);
    if (!member) {
      return err(notFound('Member', memberId));
    }

    // Cannot touch someone who outranks you
    if (!outranks(requester.role, member.role) && requester.role !== member.role) {
      return err(unauthorized('Cannot change role of a higher-ranked member'));
    }

    // Cannot promote to OWNER via this method
    if (newRole === 'OWNER') {
      return err(validationError('OWNER role cannot be assigned. Transfer ownership instead.'));
    }

    // Cannot promote to a role equal to or higher than your own (unless you are OWNER)
    if (requester.role !== 'OWNER' && ROLE_WEIGHT[newRole] >= ROLE_WEIGHT[requester.role]) {
      return err(unauthorized('Cannot promote someone to a role equal to or higher than your own'));
    }

    // Same role – no-op
    if (member.role === newRole) {
      return ok(undefined);
    }

    const previousRole = member.role;
    member.role = newRole;
    group.updatedAt = new Date().toISOString();

    await this.persistGroups();

    // Determine notification text
    const isPromotion = ROLE_WEIGHT[newRole] > ROLE_WEIGHT[previousRole];
    const notificationBody = isPromotion
      ? `You've been promoted to ${newRole} in ${group.name}`
      : `Your role has been changed to ${newRole} in ${group.name}`;

    // Send notification
    await notificationService.create({
      id: `notif_role_change_${Date.now()}`,
      type: 'community',
      title: isPromotion ? 'Role Promotion' : 'Role Changed',
      body: notificationBody,
      recipientId: memberId,
      timeLabel: 'Just now',
      read: false,
      deepLink: `/community/${groupId}`,
    });

    // Emit typed event
    emitTyped(ServiceEvents.GROUP_MEMBER_ROLE_CHANGED, {
      groupId,
      groupName: group.name,
      memberId,
      memberName: member.parentName,
      previousRole,
      newRole,
      changedById: requesterId,
    });

    logger.info('member_role_changed', {
      groupId,
      memberId,
      previousRole,
      newRole,
      changedBy: requesterId,
    });

    return ok(undefined);
  }

  /**
   * Get the role hierarchy weight for display/sorting purposes.
   */
  getRoleWeight(role: GroupMemberRole): number {
    return ROLE_WEIGHT[role];
  }

  /**
   * Get assignable roles for a given requester role.
   * OWNER can assign: ADMIN, MODERATOR, MEMBER
   * ADMIN can assign: MODERATOR, MEMBER
   * Others cannot assign.
   */
  getAssignableRoles(requesterRole: GroupMemberRole): GroupMemberRole[] {
    if (requesterRole === 'OWNER') {
      return ['ADMIN', 'MODERATOR', 'MEMBER'];
    }
    if (requesterRole === 'ADMIN') {
      return ['MODERATOR', 'MEMBER'];
    }
    return [];
  }

  /**
   * Get a role breakdown for a group (counts per role).
   */
  getRoleBreakdown(members: GroupMember[]): Record<GroupMemberRole, number> {
    const breakdown: Record<GroupMemberRole, number> = {
      OWNER: 0,
      ADMIN: 0,
      MODERATOR: 0,
      MEMBER: 0,
    };

    for (const member of members) {
      breakdown[member.role] = (breakdown[member.role] || 0) + 1;
    }

    return breakdown;
  }

  /**
   * Add a member directly to a group without invitation flow.
   * Used by automated processes (e.g. squad group auto-sync).
   */
  async addMemberDirect(
    groupId: string,
    parentId: string,
    parentName: string,
    role: GroupMemberRole = 'MEMBER',
  ): Promise<Result<ParentGroup, ServiceError>> {
    const allGroupsResult = await this.getAllGroups();
    if (!allGroupsResult.success) return allGroupsResult;

    const allGroups = allGroupsResult.data;
    const group = allGroups.find((g) => g.id === groupId);

    if (!group) {
      return err(notFound('Group', groupId));
    }

    // Already a member — no-op success
    if (group.members.some((m) => m.parentId === parentId)) {
      return ok(group);
    }

    // Check max members limit
    if (group.maxMembers && group.members.length >= group.maxMembers) {
      return err(validationError('Group is full'));
    }

    const newMember: GroupMember = {
      parentId,
      parentName,
      role,
      joinedAt: new Date().toISOString(),
    };

    group.members.push(newMember);
    group.updatedAt = new Date().toISOString();

    this.inMemoryGroups = allGroups;
    await this.persistGroups();

    logger.info('member_added_direct', { groupId, parentId, role });

    return ok(group);
  }

  /**
   * Remove a member directly from a group (no permission checks).
   * Used by automated processes (e.g. squad group auto-sync).
   */
  async removeMemberDirect(
    groupId: string,
    parentId: string,
  ): Promise<Result<void, ServiceError>> {
    const allGroupsResult = await this.getAllGroups();
    if (!allGroupsResult.success) return allGroupsResult;

    const allGroups = allGroupsResult.data;
    const group = allGroups.find((g) => g.id === groupId);

    if (!group) {
      return err(notFound('Group', groupId));
    }

    const memberIndex = group.members.findIndex((m) => m.parentId === parentId);
    if (memberIndex === -1) {
      // Not a member — no-op success
      return ok(undefined);
    }

    group.members.splice(memberIndex, 1);
    group.updatedAt = new Date().toISOString();

    this.inMemoryGroups = allGroups;
    await this.persistGroups();

    logger.info('member_removed_direct', { groupId, parentId });

    return ok(undefined);
  }

  /**
   * Delete a group entirely.
   * Used when a squad is deleted — removes its associated group.
   */
  async deleteGroup(groupId: string): Promise<Result<void, ServiceError>> {
    const allGroupsResult = await this.getAllGroups();
    if (!allGroupsResult.success) return allGroupsResult;

    const allGroups = allGroupsResult.data;
    const groupIndex = allGroups.findIndex((g) => g.id === groupId);

    if (groupIndex === -1) {
      return err(notFound('Group', groupId));
    }

    allGroups.splice(groupIndex, 1);
    this.inMemoryGroups = allGroups;
    await this.persistGroups();

    logger.info('group_deleted', { groupId });

    return ok(undefined);
  }

  /**
   * Persist groups to storage
   */
  async persistGroups(): Promise<void> {
    await storageService.setItem(STORAGE_KEYS.PARENT_GROUPS, this.inMemoryGroups);
  }
}

export const communityGroupService = new CommunityGroupService();
