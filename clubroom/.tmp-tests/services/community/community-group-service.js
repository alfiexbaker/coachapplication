"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.communityGroupService = void 0;
const storage_service_1 = require("../storage-service");
const notification_service_1 = require("../notification-service");
const result_1 = require("@/types/result");
const storage_keys_1 = require("@/constants/storage-keys");
const logger_1 = require("@/utils/logger");
const event_bus_1 = require("../event-bus");
const logger = (0, logger_1.createLogger)('CommunityGroupService');
// ============================================================================
// ROLE HIERARCHY
// ============================================================================
/**
 * Numeric weight for each role. Higher = more authority.
 */
const ROLE_WEIGHT = {
    OWNER: 40,
    ADMIN: 30,
    MODERATOR: 20,
    MEMBER: 10,
};
/**
 * Roles that have admin-level privileges (can manage members).
 */
const ADMIN_ROLES = ['OWNER', 'ADMIN'];
/**
 * Returns true when `a` outranks `b` in the hierarchy.
 */
function outranks(a, b) {
    return ROLE_WEIGHT[a] > ROLE_WEIGHT[b];
}
/**
 * Returns true when the role has admin-level privileges.
 */
function isAdminRole(role) {
    return ADMIN_ROLES.includes(role);
}
// ============================================================================
// MOCK DATA
// ============================================================================
const mockGroups = [
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
    constructor() {
        this.inMemoryGroups = [...mockGroups];
    }
    /**
     * Get all groups (internal helper for cross-service access)
     */
    async getAllGroups() {
        const persisted = await storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.PARENT_GROUPS, []);
        if (persisted.length > 0) {
            this.inMemoryGroups = persisted;
        }
        return this.inMemoryGroups;
    }
    /**
     * Get all groups that a user is a member of
     */
    async getParentGroups(parentId) {
        const allGroups = await this.getAllGroups();
        return allGroups.filter((group) => group.members.some((member) => member.parentId === parentId));
    }
    /**
     * Get all available public groups
     */
    async getPublicGroups() {
        const allGroups = await this.getAllGroups();
        return allGroups.filter((group) => group.isPublic);
    }
    /**
     * Get a single group by ID
     */
    async getGroup(groupId) {
        const allGroups = await this.getAllGroups();
        return allGroups.find((group) => group.id === groupId);
    }
    /**
     * Create a new parent group.
     * The creator is assigned OWNER role.
     */
    async createGroup(params) {
        const timestamp = new Date().toISOString();
        const members = [
            {
                parentId: params.creatorId,
                parentName: params.creatorName,
                role: 'OWNER',
                joinedAt: timestamp,
            },
            ...params.memberIds.map((id, index) => ({
                parentId: id,
                parentName: params.memberNames[index] || 'Unknown',
                role: 'MEMBER',
                joinedAt: timestamp,
            })),
        ];
        const newGroup = {
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
        return newGroup;
    }
    /**
     * Join an existing group.
     *
     * When `isCoach` is true the member is always assigned the MEMBER role,
     * regardless of any other logic, so coaches start at the bottom of the
     * hierarchy and must be explicitly promoted.
     */
    async joinGroup(groupId, parentId, parentName, options) {
        const allGroups = await this.getAllGroups();
        const groupIndex = allGroups.findIndex((g) => g.id === groupId);
        if (groupIndex === -1) {
            return (0, result_1.err)((0, result_1.notFound)('Group', groupId));
        }
        const group = allGroups[groupIndex];
        // Check if already a member
        if (group.members.some((m) => m.parentId === parentId)) {
            return (0, result_1.err)((0, result_1.conflictError)('Already a member of this group'));
        }
        // Check max members limit
        if (group.maxMembers && group.members.length >= group.maxMembers) {
            return (0, result_1.err)((0, result_1.validationError)('Group is full'));
        }
        // Check if group is public
        if (!group.isPublic) {
            return (0, result_1.err)((0, result_1.unauthorized)('Cannot join private group without invitation'));
        }
        // Coaches always join as MEMBER
        const assignedRole = 'MEMBER';
        const isCoach = options?.isCoach ?? false;
        const newMember = {
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
        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.GROUP_MEMBER_JOINED, {
            groupId,
            groupName: group.name,
            memberId: parentId,
            memberName: parentName,
            role: assignedRole,
            isCoach,
        });
        logger.info('member_joined_group', { groupId, parentId, isCoach, role: assignedRole });
        return (0, result_1.ok)(group);
    }
    /**
     * Leave a group
     */
    async leaveGroup(groupId, parentId) {
        const allGroups = await this.getAllGroups();
        const groupIndex = allGroups.findIndex((g) => g.id === groupId);
        if (groupIndex === -1) {
            return (0, result_1.err)((0, result_1.notFound)('Group', groupId));
        }
        const group = allGroups[groupIndex];
        const memberIndex = group.members.findIndex((m) => m.parentId === parentId);
        if (memberIndex === -1) {
            return (0, result_1.err)((0, result_1.notFound)('Member', parentId));
        }
        // Check if this is the only admin/owner
        const memberRole = group.members[memberIndex].role;
        const isPrivileged = isAdminRole(memberRole) || memberRole === 'OWNER';
        const privilegedCount = group.members.filter((m) => isAdminRole(m.role) || m.role === 'OWNER').length;
        if (isPrivileged && privilegedCount === 1 && group.members.length > 1) {
            return (0, result_1.err)((0, result_1.validationError)('Cannot leave group as the only admin. Promote another member first.'));
        }
        group.members.splice(memberIndex, 1);
        group.updatedAt = new Date().toISOString();
        // If group is empty, remove it
        if (group.members.length === 0) {
            allGroups.splice(groupIndex, 1);
        }
        this.inMemoryGroups = allGroups;
        await this.persistGroups();
        return (0, result_1.ok)(undefined);
    }
    /**
     * Invite a parent to join a group
     */
    async inviteToGroup(groupId, inviterId, inviteeId, inviteeName) {
        const group = await this.getGroup(groupId);
        if (!group) {
            return (0, result_1.err)((0, result_1.notFound)('Group', groupId));
        }
        // Check if inviter has admin privileges
        const inviter = group.members.find((m) => m.parentId === inviterId);
        if (!inviter || !isAdminRole(inviter.role)) {
            return (0, result_1.err)((0, result_1.unauthorized)('Only group admins can invite members'));
        }
        // Check if already a member
        if (group.members.some((m) => m.parentId === inviteeId)) {
            return (0, result_1.err)((0, result_1.conflictError)('User is already a member'));
        }
        // Check for existing pending invite
        const existingInvites = await this.getGroupInvites(inviteeId);
        if (existingInvites.some((i) => i.groupId === groupId && i.status === 'PENDING')) {
            return (0, result_1.err)((0, result_1.conflictError)('Invite already sent'));
        }
        // Create the invite
        const invite = {
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
        const allInvites = await storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.GROUP_INVITES, []);
        allInvites.push(invite);
        await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.GROUP_INVITES, allInvites);
        // Send notification to invitee
        await notification_service_1.notificationService.create({
            id: `notif_group_invite_${Date.now()}`,
            type: 'community',
            title: 'Group Invite',
            body: `${inviter.parentName} invited you to join ${group.name}`,
            timeLabel: 'Just now',
            read: false,
            actionLabel: 'View Invite',
        });
        return (0, result_1.ok)(invite);
    }
    /**
     * Get pending group invites for a user
     */
    async getGroupInvites(userId) {
        const allInvites = await storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.GROUP_INVITES, []);
        return allInvites.filter((i) => i.inviteeId === userId);
    }
    /**
     * Get pending invites for a user
     */
    async getPendingInvites(userId) {
        const invites = await this.getGroupInvites(userId);
        return invites.filter((i) => i.status === 'PENDING');
    }
    /**
     * Accept a group invite
     */
    async acceptGroupInvite(inviteId) {
        const allInvites = await storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.GROUP_INVITES, []);
        const inviteIndex = allInvites.findIndex((i) => i.id === inviteId);
        if (inviteIndex === -1) {
            return (0, result_1.err)((0, result_1.notFound)('Invite', inviteId));
        }
        const invite = allInvites[inviteIndex];
        if (invite.status !== 'PENDING') {
            return (0, result_1.err)((0, result_1.conflictError)('Invite already responded to'));
        }
        // Update invite status
        allInvites[inviteIndex].status = 'ACCEPTED';
        allInvites[inviteIndex].respondedAt = new Date().toISOString();
        await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.GROUP_INVITES, allInvites);
        // Add member to group
        const group = await this.getGroup(invite.groupId);
        if (group) {
            const newMember = {
                parentId: invite.inviteeId,
                parentName: invite.inviteeName,
                role: 'MEMBER',
                joinedAt: new Date().toISOString(),
            };
            group.members.push(newMember);
            group.updatedAt = new Date().toISOString();
            await this.persistGroups();
            // Notify inviter
            await notification_service_1.notificationService.create({
                id: `notif_invite_accepted_${Date.now()}`,
                type: 'community',
                title: 'Invite Accepted',
                body: `${invite.inviteeName} joined ${group.name}`,
                timeLabel: 'Just now',
                read: false,
            });
        }
        return (0, result_1.ok)(undefined);
    }
    /**
     * Decline a group invite
     */
    async declineGroupInvite(inviteId) {
        const allInvites = await storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.GROUP_INVITES, []);
        const inviteIndex = allInvites.findIndex((i) => i.id === inviteId);
        if (inviteIndex === -1) {
            return (0, result_1.err)((0, result_1.notFound)('Invite', inviteId));
        }
        const invite = allInvites[inviteIndex];
        if (invite.status !== 'PENDING') {
            return (0, result_1.err)((0, result_1.conflictError)('Invite already responded to'));
        }
        allInvites[inviteIndex].status = 'DECLINED';
        allInvites[inviteIndex].respondedAt = new Date().toISOString();
        await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.GROUP_INVITES, allInvites);
        return (0, result_1.ok)(undefined);
    }
    // ============================================================================
    // ROLE MANAGEMENT (PROMOTION / DEMOTION)
    // ============================================================================
    /**
     * Legacy promote helper - promotes a member to ADMIN.
     * Kept for backward compatibility; prefer `changeMemberRole` for granular control.
     */
    async promoteMember(groupId, requesterId, memberId) {
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
    async changeMemberRole(params) {
        const { groupId, requesterId, memberId, newRole } = params;
        const group = await this.getGroup(groupId);
        if (!group) {
            return (0, result_1.err)((0, result_1.notFound)('Group', groupId));
        }
        const requester = group.members.find((m) => m.parentId === requesterId);
        if (!requester || !isAdminRole(requester.role)) {
            return (0, result_1.err)((0, result_1.unauthorized)('Only group owners and admins can change member roles'));
        }
        if (requesterId === memberId) {
            return (0, result_1.err)((0, result_1.validationError)('Cannot change your own role'));
        }
        const member = group.members.find((m) => m.parentId === memberId);
        if (!member) {
            return (0, result_1.err)((0, result_1.notFound)('Member', memberId));
        }
        // Cannot touch someone who outranks you
        if (!outranks(requester.role, member.role) && requester.role !== member.role) {
            return (0, result_1.err)((0, result_1.unauthorized)('Cannot change role of a higher-ranked member'));
        }
        // Cannot promote to OWNER via this method
        if (newRole === 'OWNER') {
            return (0, result_1.err)((0, result_1.validationError)('OWNER role cannot be assigned. Transfer ownership instead.'));
        }
        // Cannot promote to a role equal to or higher than your own (unless you are OWNER)
        if (requester.role !== 'OWNER' && ROLE_WEIGHT[newRole] >= ROLE_WEIGHT[requester.role]) {
            return (0, result_1.err)((0, result_1.unauthorized)('Cannot promote someone to a role equal to or higher than your own'));
        }
        // Same role – no-op
        if (member.role === newRole) {
            return (0, result_1.ok)(undefined);
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
        await notification_service_1.notificationService.create({
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
        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.GROUP_MEMBER_ROLE_CHANGED, {
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
        return (0, result_1.ok)(undefined);
    }
    /**
     * Get the role hierarchy weight for display/sorting purposes.
     */
    getRoleWeight(role) {
        return ROLE_WEIGHT[role];
    }
    /**
     * Get assignable roles for a given requester role.
     * OWNER can assign: ADMIN, MODERATOR, MEMBER
     * ADMIN can assign: MODERATOR, MEMBER
     * Others cannot assign.
     */
    getAssignableRoles(requesterRole) {
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
    getRoleBreakdown(members) {
        const breakdown = {
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
    async addMemberDirect(groupId, parentId, parentName, role = 'MEMBER') {
        const allGroups = await this.getAllGroups();
        const group = allGroups.find((g) => g.id === groupId);
        if (!group) {
            return (0, result_1.err)((0, result_1.notFound)('Group', groupId));
        }
        // Already a member — no-op success
        if (group.members.some((m) => m.parentId === parentId)) {
            return (0, result_1.ok)(group);
        }
        // Check max members limit
        if (group.maxMembers && group.members.length >= group.maxMembers) {
            return (0, result_1.err)((0, result_1.validationError)('Group is full'));
        }
        const newMember = {
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
        return (0, result_1.ok)(group);
    }
    /**
     * Remove a member directly from a group (no permission checks).
     * Used by automated processes (e.g. squad group auto-sync).
     */
    async removeMemberDirect(groupId, parentId) {
        const allGroups = await this.getAllGroups();
        const group = allGroups.find((g) => g.id === groupId);
        if (!group) {
            return (0, result_1.err)((0, result_1.notFound)('Group', groupId));
        }
        const memberIndex = group.members.findIndex((m) => m.parentId === parentId);
        if (memberIndex === -1) {
            // Not a member — no-op success
            return (0, result_1.ok)(undefined);
        }
        group.members.splice(memberIndex, 1);
        group.updatedAt = new Date().toISOString();
        this.inMemoryGroups = allGroups;
        await this.persistGroups();
        logger.info('member_removed_direct', { groupId, parentId });
        return (0, result_1.ok)(undefined);
    }
    /**
     * Delete a group entirely.
     * Used when a squad is deleted — removes its associated group.
     */
    async deleteGroup(groupId) {
        const allGroups = await this.getAllGroups();
        const groupIndex = allGroups.findIndex((g) => g.id === groupId);
        if (groupIndex === -1) {
            return (0, result_1.err)((0, result_1.notFound)('Group', groupId));
        }
        allGroups.splice(groupIndex, 1);
        this.inMemoryGroups = allGroups;
        await this.persistGroups();
        logger.info('group_deleted', { groupId });
        return (0, result_1.ok)(undefined);
    }
    /**
     * Persist groups to storage
     */
    async persistGroups() {
        await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.PARENT_GROUPS, this.inMemoryGroups);
    }
}
exports.communityGroupService = new CommunityGroupService();
