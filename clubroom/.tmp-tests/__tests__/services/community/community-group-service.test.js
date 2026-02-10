"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const community_group_service_1 = require("@/services/community/community-group-service");
const storage_service_1 = require("@/services/storage-service");
const storage_keys_1 = require("@/constants/storage-keys");
(0, node_test_1.describe)('CommunityGroupService', () => {
    (0, node_test_1.beforeEach)(async () => {
        // Clear storage using storageService since groups use storageService
        await storage_service_1.storageService.removeItem(storage_keys_1.STORAGE_KEYS.PARENT_GROUPS);
        await storage_service_1.storageService.removeItem(storage_keys_1.STORAGE_KEYS.GROUP_INVITES);
    });
    (0, node_test_1.describe)('createGroup', () => {
        (0, node_test_1.it)('should create new group with admin role for creator', async () => {
            const group = await community_group_service_1.communityGroupService.createGroup({
                name: 'Test Group',
                description: 'A test group',
                creatorId: 'parent-' + Math.random().toString(36).slice(2),
                creatorName: 'Test Creator',
                isPublic: true,
            });
            strict_1.default.ok(group);
            strict_1.default.ok(group.id);
            strict_1.default.equal(group.name, 'Test Group');
            strict_1.default.equal(group.members.length, 1);
            strict_1.default.equal(group.members[0].role, 'ADMIN');
        });
        (0, node_test_1.it)('should initialize empty arrays for posts and pending members', async () => {
            const group = await community_group_service_1.communityGroupService.createGroup({
                name: 'Test Group',
                description: 'Test',
                creatorId: 'parent1',
                creatorName: 'Creator',
                isPublic: false,
            });
            strict_1.default.ok(Array.isArray(group.posts));
            strict_1.default.ok(Array.isArray(group.pendingMembers));
            strict_1.default.equal(group.posts.length, 0);
            strict_1.default.equal(group.pendingMembers.length, 0);
        });
    });
    (0, node_test_1.describe)('getAllGroups', () => {
        (0, node_test_1.it)('should return all groups', async () => {
            await community_group_service_1.communityGroupService.createGroup({
                name: 'Group 1',
                description: 'Test 1',
                creatorId: 'parent1',
                creatorName: 'Creator 1',
                isPublic: true,
            });
            await community_group_service_1.communityGroupService.createGroup({
                name: 'Group 2',
                description: 'Test 2',
                creatorId: 'parent2',
                creatorName: 'Creator 2',
                isPublic: true,
            });
            const groups = await community_group_service_1.communityGroupService.getAllGroups();
            strict_1.default.ok(Array.isArray(groups));
            strict_1.default.ok(groups.length >= 2);
        });
    });
    (0, node_test_1.describe)('getParentGroups', () => {
        (0, node_test_1.it)('should return groups for specific parent', async () => {
            const parentId = 'parent-' + Math.random().toString(36).slice(2);
            await community_group_service_1.communityGroupService.createGroup({
                name: 'My Group',
                description: 'Test',
                creatorId: parentId,
                creatorName: 'Test Parent',
                isPublic: true,
            });
            const groups = await community_group_service_1.communityGroupService.getParentGroups(parentId);
            strict_1.default.ok(Array.isArray(groups));
            strict_1.default.ok(groups.length > 0);
            strict_1.default.ok(groups[0].members.some((m) => m.id === parentId));
        });
        (0, node_test_1.it)('should return empty array for parent with no groups', async () => {
            const groups = await community_group_service_1.communityGroupService.getParentGroups('parent-nonexistent-' + Math.random().toString(36).slice(2));
            strict_1.default.ok(Array.isArray(groups));
            strict_1.default.equal(groups.length, 0);
        });
    });
    (0, node_test_1.describe)('getPublicGroups', () => {
        (0, node_test_1.it)('should return only public groups', async () => {
            await community_group_service_1.communityGroupService.createGroup({
                name: 'Public Group',
                description: 'Test',
                creatorId: 'parent1',
                creatorName: 'Creator',
                isPublic: true,
            });
            await community_group_service_1.communityGroupService.createGroup({
                name: 'Private Group',
                description: 'Test',
                creatorId: 'parent2',
                creatorName: 'Creator',
                isPublic: false,
            });
            const groups = await community_group_service_1.communityGroupService.getPublicGroups();
            strict_1.default.ok(Array.isArray(groups));
            strict_1.default.ok(groups.every((g) => g.isPublic));
        });
    });
    (0, node_test_1.describe)('joinGroup', () => {
        (0, node_test_1.it)('should return ok() for public group and add member', async () => {
            const group = await community_group_service_1.communityGroupService.createGroup({
                name: 'Public Group',
                description: 'Test',
                creatorId: 'parent1',
                creatorName: 'Creator',
                isPublic: true,
            });
            const joinerId = 'parent-' + Math.random().toString(36).slice(2);
            const result = await community_group_service_1.communityGroupService.joinGroup(group.id, joinerId, 'Test Joiner', 'MEMBER');
            strict_1.default.ok(result.success);
            const updated = await community_group_service_1.communityGroupService.getGroup(group.id);
            strict_1.default.ok(updated);
            strict_1.default.ok(updated.members.some((m) => m.id === joinerId));
        });
        (0, node_test_1.it)('should return err() for non-existent group', async () => {
            const result = await community_group_service_1.communityGroupService.joinGroup('group-fake-' + Math.random().toString(36).slice(2), 'parent1', 'Test', 'MEMBER');
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
        (0, node_test_1.it)('should add to pending members for private group', async () => {
            const group = await community_group_service_1.communityGroupService.createGroup({
                name: 'Private Group',
                description: 'Test',
                creatorId: 'parent1',
                creatorName: 'Creator',
                isPublic: false,
            });
            const joinerId = 'parent-' + Math.random().toString(36).slice(2);
            const result = await community_group_service_1.communityGroupService.joinGroup(group.id, joinerId, 'Test Joiner', 'MEMBER');
            strict_1.default.ok(result.success);
            const updated = await community_group_service_1.communityGroupService.getGroup(group.id);
            strict_1.default.ok(updated);
            strict_1.default.ok(updated.pendingMembers?.some((m) => m.id === joinerId));
        });
    });
    (0, node_test_1.describe)('leaveGroup', () => {
        (0, node_test_1.it)('should return ok() and remove member', async () => {
            const group = await community_group_service_1.communityGroupService.createGroup({
                name: 'Test Group',
                description: 'Test',
                creatorId: 'parent1',
                creatorName: 'Creator',
                isPublic: true,
            });
            const joinerId = 'parent-' + Math.random().toString(36).slice(2);
            await community_group_service_1.communityGroupService.joinGroup(group.id, joinerId, 'Test Joiner', 'MEMBER');
            const result = await community_group_service_1.communityGroupService.leaveGroup(group.id, joinerId);
            strict_1.default.ok(result.success);
            const updated = await community_group_service_1.communityGroupService.getGroup(group.id);
            strict_1.default.ok(updated);
            strict_1.default.ok(!updated.members.some((m) => m.id === joinerId));
        });
        (0, node_test_1.it)('should return err() for non-existent group', async () => {
            const result = await community_group_service_1.communityGroupService.leaveGroup('group-fake-' + Math.random().toString(36).slice(2), 'parent1');
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
    });
    (0, node_test_1.describe)('changeMemberRole', () => {
        (0, node_test_1.it)('should return ok() and update member role', async () => {
            const group = await community_group_service_1.communityGroupService.createGroup({
                name: 'Test Group',
                description: 'Test',
                creatorId: 'parent1',
                creatorName: 'Creator',
                isPublic: true,
            });
            const joinerId = 'parent-' + Math.random().toString(36).slice(2);
            await community_group_service_1.communityGroupService.joinGroup(group.id, joinerId, 'Test Joiner', 'MEMBER');
            const result = await community_group_service_1.communityGroupService.changeMemberRole({
                groupId: group.id,
                requesterId: group.members[0].id,
                memberId: joinerId,
                newRole: 'MODERATOR',
            });
            strict_1.default.ok(result.success);
            const updated = await community_group_service_1.communityGroupService.getGroup(group.id);
            const member = updated?.members.find((m) => m.id === joinerId);
            strict_1.default.equal(member?.role, 'MODERATOR');
        });
        (0, node_test_1.it)('should return err() when requester lacks permission', async () => {
            const group = await community_group_service_1.communityGroupService.createGroup({
                name: 'Test Group',
                description: 'Test',
                creatorId: 'parent1',
                creatorName: 'Creator',
                isPublic: true,
            });
            const result = await community_group_service_1.communityGroupService.changeMemberRole({
                groupId: group.id,
                requesterId: 'fake-requester',
                memberId: 'parent1',
                newRole: 'MODERATOR',
            });
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'UNAUTHORIZED');
        });
    });
    (0, node_test_1.describe)('inviteToGroup', () => {
        (0, node_test_1.it)('should return ok() and create invite', async () => {
            const group = await community_group_service_1.communityGroupService.createGroup({
                name: 'Test Group',
                description: 'Test',
                creatorId: 'parent1',
                creatorName: 'Creator',
                isPublic: true,
            });
            const result = await community_group_service_1.communityGroupService.inviteToGroup(group.id, 'parent1', 'parent-' + Math.random().toString(36).slice(2), 'Test Invitee');
            strict_1.default.ok(result.success);
            strict_1.default.ok(result.data.id);
            strict_1.default.equal(result.data.status, 'PENDING');
        });
    });
    (0, node_test_1.describe)('acceptGroupInvite', () => {
        (0, node_test_1.it)('should return ok() and add member to group', async () => {
            const group = await community_group_service_1.communityGroupService.createGroup({
                name: 'Test Group',
                description: 'Test',
                creatorId: 'parent1',
                creatorName: 'Creator',
                isPublic: true,
            });
            const inviteeId = 'parent-' + Math.random().toString(36).slice(2);
            const inviteResult = await community_group_service_1.communityGroupService.inviteToGroup(group.id, 'parent1', inviteeId, 'Test Invitee');
            strict_1.default.ok(inviteResult.success);
            const acceptResult = await community_group_service_1.communityGroupService.acceptGroupInvite(inviteResult.data.id);
            strict_1.default.ok(acceptResult.success);
            const updated = await community_group_service_1.communityGroupService.getGroup(group.id);
            strict_1.default.ok(updated?.members.some((m) => m.id === inviteeId));
        });
    });
    (0, node_test_1.describe)('deleteGroup', () => {
        (0, node_test_1.it)('should return ok() and remove group', async () => {
            const group = await community_group_service_1.communityGroupService.createGroup({
                name: 'Test Group',
                description: 'Test',
                creatorId: 'parent1',
                creatorName: 'Creator',
                isPublic: true,
            });
            const result = await community_group_service_1.communityGroupService.deleteGroup(group.id);
            strict_1.default.ok(result.success);
            const retrieved = await community_group_service_1.communityGroupService.getGroup(group.id);
            strict_1.default.equal(retrieved, undefined);
        });
    });
});
