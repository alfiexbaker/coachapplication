"use strict";
/**
 * Community Group Service
 *
 * Handles parent group management: CRUD operations, membership,
 * invitations, and role management.
 *
 * API Integration Notes:
 * - Groups are persisted via storageService (AsyncStorage in dev, API in prod)
 * - Notifications are triggered on invite/join actions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.communityGroupService = void 0;
const storage_service_1 = require("../storage-service");
const notification_service_1 = require("../notification-service");
const result_1 = require("@/types/result");
const storage_keys_1 = require("@/constants/storage-keys");
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('CommunityGroupService');
// Mock data for initial state
const mockGroups = [
    {
        id: 'group_1',
        name: 'U12 Parents',
        description: 'Group for parents of U12 squad members',
        type: 'CLUB',
        members: [
            { parentId: 'parent1', parentName: 'John Henderson', role: 'ADMIN', joinedAt: '2024-01-15' },
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
            { parentId: 'parent1', parentName: 'John Henderson', role: 'ADMIN', joinedAt: '2024-01-10' },
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
            { parentId: 'parent2', parentName: 'Lisa Wilson', role: 'ADMIN', joinedAt: '2024-01-05' },
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
class CommunityGroupService {
    constructor() {
        this.inMemoryGroups = [...mockGroups];
    }
    /**
     * Get all groups (internal helper for cross-service access)
     */
    async getAllGroups() {
        const persisted = await storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.PARENT_GROUPS, []);
        return persisted.length > 0 ? persisted : this.inMemoryGroups;
    }
    /**
     * Get all groups that a parent is a member of
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
     * Create a new parent group
     */
    async createGroup(params) {
        const timestamp = new Date().toISOString();
        const members = [
            {
                parentId: params.creatorId,
                parentName: params.creatorName,
                role: 'ADMIN',
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
            id: `group_${Date.now()}`,
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
     * Join an existing group
     */
    async joinGroup(groupId, parentId, parentName) {
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
        const newMember = {
            parentId,
            parentName,
            role: 'MEMBER',
            joinedAt: new Date().toISOString(),
        };
        group.members.push(newMember);
        group.updatedAt = new Date().toISOString();
        this.inMemoryGroups = allGroups;
        await this.persistGroups();
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
        // Check if this is the only admin
        const isAdmin = group.members[memberIndex].role === 'ADMIN';
        const adminCount = group.members.filter((m) => m.role === 'ADMIN').length;
        if (isAdmin && adminCount === 1 && group.members.length > 1) {
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
        // Check if inviter is an admin
        const inviter = group.members.find((m) => m.parentId === inviterId);
        if (!inviter || inviter.role !== 'ADMIN') {
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
            id: `group_invite_${Date.now()}`,
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
    /**
     * Promote a member to admin
     */
    async promoteMember(groupId, requesterId, memberId) {
        const group = await this.getGroup(groupId);
        if (!group) {
            return (0, result_1.err)((0, result_1.notFound)('Group', groupId));
        }
        const requester = group.members.find((m) => m.parentId === requesterId);
        if (!requester || requester.role !== 'ADMIN') {
            return (0, result_1.err)((0, result_1.unauthorized)('Only group admins can promote members'));
        }
        const member = group.members.find((m) => m.parentId === memberId);
        if (!member) {
            return (0, result_1.err)((0, result_1.notFound)('Member', memberId));
        }
        member.role = 'ADMIN';
        group.updatedAt = new Date().toISOString();
        await this.persistGroups();
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
