import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { communityGroupService } from '@/services/community/community-group-service';
import { storageService } from '@/services/storage-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('CommunityGroupService', () => {
  beforeEach(async () => {
    // Clear storage using storageService since groups use storageService
    await storageService.removeItem(STORAGE_KEYS.PARENT_GROUPS);
    await storageService.removeItem(STORAGE_KEYS.GROUP_INVITES);
  });

  describe('createGroup', () => {
    it('should create new group with admin role for creator', async () => {
      const group = await communityGroupService.createGroup({
        name: 'Test Group',
        description: 'A test group',
        creatorId: 'parent-' + Math.random().toString(36).slice(2),
        creatorName: 'Test Creator',
        isPublic: true,
      });

      assert.ok(group);
      assert.ok(group.id);
      assert.equal(group.name, 'Test Group');
      assert.equal(group.members.length, 1);
      assert.equal(group.members[0].role, 'ADMIN');
    });

    it('should initialize empty arrays for posts and pending members', async () => {
      const group = await communityGroupService.createGroup({
        name: 'Test Group',
        description: 'Test',
        creatorId: 'parent1',
        creatorName: 'Creator',
        isPublic: false,
      });

      assert.ok(Array.isArray(group.posts));
      assert.ok(Array.isArray(group.pendingMembers));
      assert.equal(group.posts.length, 0);
      assert.equal(group.pendingMembers.length, 0);
    });
  });

  describe('getAllGroups', () => {
    it('should return all groups', async () => {
      await communityGroupService.createGroup({
        name: 'Group 1',
        description: 'Test 1',
        creatorId: 'parent1',
        creatorName: 'Creator 1',
        isPublic: true,
      });

      await communityGroupService.createGroup({
        name: 'Group 2',
        description: 'Test 2',
        creatorId: 'parent2',
        creatorName: 'Creator 2',
        isPublic: true,
      });

      const groups = await communityGroupService.getAllGroups();

      assert.ok(Array.isArray(groups));
      assert.ok(groups.length >= 2);
    });
  });

  describe('getParentGroups', () => {
    it('should return groups for specific parent', async () => {
      const parentId = 'parent-' + Math.random().toString(36).slice(2);

      await communityGroupService.createGroup({
        name: 'My Group',
        description: 'Test',
        creatorId: parentId,
        creatorName: 'Test Parent',
        isPublic: true,
      });

      const groups = await communityGroupService.getParentGroups(parentId);

      assert.ok(Array.isArray(groups));
      assert.ok(groups.length > 0);
      assert.ok(groups[0].members.some((m) => m.id === parentId));
    });

    it('should return empty array for parent with no groups', async () => {
      const groups = await communityGroupService.getParentGroups('parent-nonexistent-' + Math.random().toString(36).slice(2));

      assert.ok(Array.isArray(groups));
      assert.equal(groups.length, 0);
    });
  });

  describe('getPublicGroups', () => {
    it('should return only public groups', async () => {
      await communityGroupService.createGroup({
        name: 'Public Group',
        description: 'Test',
        creatorId: 'parent1',
        creatorName: 'Creator',
        isPublic: true,
      });

      await communityGroupService.createGroup({
        name: 'Private Group',
        description: 'Test',
        creatorId: 'parent2',
        creatorName: 'Creator',
        isPublic: false,
      });

      const groups = await communityGroupService.getPublicGroups();

      assert.ok(Array.isArray(groups));
      assert.ok(groups.every((g) => g.isPublic));
    });
  });

  describe('joinGroup', () => {
    it('should return ok() for public group and add member', async () => {
      const group = await communityGroupService.createGroup({
        name: 'Public Group',
        description: 'Test',
        creatorId: 'parent1',
        creatorName: 'Creator',
        isPublic: true,
      });

      const joinerId = 'parent-' + Math.random().toString(36).slice(2);
      const result = await communityGroupService.joinGroup(
        group.id,
        joinerId,
        'Test Joiner',
        'MEMBER'
      );

      assert.ok(result.success);

      const updated = await communityGroupService.getGroup(group.id);
      assert.ok(updated);
      assert.ok(updated.members.some((m) => m.id === joinerId));
    });

    it('should return err() for non-existent group', async () => {
      const result = await communityGroupService.joinGroup(
        'group-fake-' + Math.random().toString(36).slice(2),
        'parent1',
        'Test',
        'MEMBER'
      );

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });

    it('should add to pending members for private group', async () => {
      const group = await communityGroupService.createGroup({
        name: 'Private Group',
        description: 'Test',
        creatorId: 'parent1',
        creatorName: 'Creator',
        isPublic: false,
      });

      const joinerId = 'parent-' + Math.random().toString(36).slice(2);
      const result = await communityGroupService.joinGroup(
        group.id,
        joinerId,
        'Test Joiner',
        'MEMBER'
      );

      assert.ok(result.success);

      const updated = await communityGroupService.getGroup(group.id);
      assert.ok(updated);
      assert.ok(updated.pendingMembers?.some((m) => m.id === joinerId));
    });
  });

  describe('leaveGroup', () => {
    it('should return ok() and remove member', async () => {
      const group = await communityGroupService.createGroup({
        name: 'Test Group',
        description: 'Test',
        creatorId: 'parent1',
        creatorName: 'Creator',
        isPublic: true,
      });

      const joinerId = 'parent-' + Math.random().toString(36).slice(2);
      await communityGroupService.joinGroup(group.id, joinerId, 'Test Joiner', 'MEMBER');

      const result = await communityGroupService.leaveGroup(group.id, joinerId);

      assert.ok(result.success);

      const updated = await communityGroupService.getGroup(group.id);
      assert.ok(updated);
      assert.ok(!updated.members.some((m) => m.id === joinerId));
    });

    it('should return err() for non-existent group', async () => {
      const result = await communityGroupService.leaveGroup('group-fake-' + Math.random().toString(36).slice(2), 'parent1');

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });

  describe('changeMemberRole', () => {
    it('should return ok() and update member role', async () => {
      const group = await communityGroupService.createGroup({
        name: 'Test Group',
        description: 'Test',
        creatorId: 'parent1',
        creatorName: 'Creator',
        isPublic: true,
      });

      const joinerId = 'parent-' + Math.random().toString(36).slice(2);
      await communityGroupService.joinGroup(group.id, joinerId, 'Test Joiner', 'MEMBER');

      const result = await communityGroupService.changeMemberRole({
        groupId: group.id,
        requesterId: group.members[0].id,
        memberId: joinerId,
        newRole: 'MODERATOR',
      });

      assert.ok(result.success);

      const updated = await communityGroupService.getGroup(group.id);
      const member = updated?.members.find((m) => m.id === joinerId);
      assert.equal(member?.role, 'MODERATOR');
    });

    it('should return err() when requester lacks permission', async () => {
      const group = await communityGroupService.createGroup({
        name: 'Test Group',
        description: 'Test',
        creatorId: 'parent1',
        creatorName: 'Creator',
        isPublic: true,
      });

      const result = await communityGroupService.changeMemberRole({
        groupId: group.id,
        requesterId: 'fake-requester',
        memberId: 'parent1',
        newRole: 'MODERATOR',
      });

      assert.ok(!result.success);
      assert.equal(result.error.code, 'UNAUTHORIZED');
    });
  });

  describe('inviteToGroup', () => {
    it('should return ok() and create invite', async () => {
      const group = await communityGroupService.createGroup({
        name: 'Test Group',
        description: 'Test',
        creatorId: 'parent1',
        creatorName: 'Creator',
        isPublic: true,
      });

      const result = await communityGroupService.inviteToGroup(
        group.id,
        'parent1',
        'parent-' + Math.random().toString(36).slice(2),
        'Test Invitee'
      );

      assert.ok(result.success);
      assert.ok(result.data.id);
      assert.equal(result.data.status, 'PENDING');
    });
  });

  describe('acceptGroupInvite', () => {
    it('should return ok() and add member to group', async () => {
      const group = await communityGroupService.createGroup({
        name: 'Test Group',
        description: 'Test',
        creatorId: 'parent1',
        creatorName: 'Creator',
        isPublic: true,
      });

      const inviteeId = 'parent-' + Math.random().toString(36).slice(2);
      const inviteResult = await communityGroupService.inviteToGroup(
        group.id,
        'parent1',
        inviteeId,
        'Test Invitee'
      );

      assert.ok(inviteResult.success);

      const acceptResult = await communityGroupService.acceptGroupInvite(inviteResult.data.id);

      assert.ok(acceptResult.success);

      const updated = await communityGroupService.getGroup(group.id);
      assert.ok(updated?.members.some((m) => m.id === inviteeId));
    });
  });

  describe('deleteGroup', () => {
    it('should return ok() and remove group', async () => {
      const group = await communityGroupService.createGroup({
        name: 'Test Group',
        description: 'Test',
        creatorId: 'parent1',
        creatorName: 'Creator',
        isPublic: true,
      });

      const result = await communityGroupService.deleteGroup(group.id);

      assert.ok(result.success);

      const retrieved = await communityGroupService.getGroup(group.id);
      assert.equal(retrieved, undefined);
    });
  });
});
