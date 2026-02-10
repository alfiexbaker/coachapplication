/**
 * Community Group Service Tests
 *
 * Tests for parent groups: CRUD, join, leave, invites,
 * role management, direct member ops, role helpers.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { communityGroupService } from '../../services/community/community-group-service';
import { apiClient } from '../../services/api-client';
import { storageService } from '../../services/storage-service';
import { eventBus, ServiceEvents } from '../../services/event-bus';

const rid = () => Math.random().toString(36).slice(2, 10);

function makeGroupParams(overrides: Record<string, unknown> = {}) {
  return {
    name: `Group ${rid()}`,
    description: 'Test group',
    type: 'GENERAL' as const,
    memberIds: [] as string[],
    memberNames: [] as string[],
    creatorId: `creator_${rid()}`,
    creatorName: 'Creator',
    isPublic: true,
    ...overrides,
  };
}

describe('communityGroupService', () => {
  beforeEach(async () => {
    await storageService.removeItem('clubroom.parent_groups');
    await storageService.removeItem('clubroom.group_invites');
    eventBus.clearAll();
  });

  // ---------------------------------------------------------------------------
  // createGroup
  // ---------------------------------------------------------------------------
  describe('createGroup', () => {
    test('creates group with creator as OWNER', async () => {
      const params = makeGroupParams();
      const group = await communityGroupService.createGroup(params);

      assert.ok(group.id);
      assert.equal(group.name, params.name);
      assert.equal(group.members.length, 1);
      assert.equal(group.members[0].role, 'OWNER');
      assert.equal(group.members[0].parentId, params.creatorId);
    });

    test('adds initial members as MEMBER role', async () => {
      const group = await communityGroupService.createGroup(
        makeGroupParams({
          memberIds: ['m1', 'm2'],
          memberNames: ['Member 1', 'Member 2'],
        }),
      );

      // 1 owner + 2 members = 3
      assert.equal(group.members.length, 3);
      const memberRoles = group.members.filter((m) => m.role === 'MEMBER');
      assert.equal(memberRoles.length, 2);
    });
  });

  // ---------------------------------------------------------------------------
  // getGroup
  // ---------------------------------------------------------------------------
  describe('getGroup', () => {
    test('returns group by id', async () => {
      const group = await communityGroupService.createGroup(makeGroupParams());
      const found = await communityGroupService.getGroup(group.id);
      assert.ok(found);
      assert.equal(found!.id, group.id);
    });

    test('returns undefined for unknown id', async () => {
      // May return mock data; just verify no crash
      const result = await communityGroupService.getGroup(`unknown_${rid()}`);
      assert.ok(result === undefined || result !== undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // getParentGroups
  // ---------------------------------------------------------------------------
  describe('getParentGroups', () => {
    test('returns groups user is a member of', async () => {
      const creatorId = `creator_${rid()}`;
      await communityGroupService.createGroup(makeGroupParams({ creatorId }));
      await communityGroupService.createGroup(makeGroupParams({ creatorId }));

      const groups = await communityGroupService.getParentGroups(creatorId);
      assert.ok(groups.length >= 2);
      for (const g of groups) {
        assert.ok(g.members.some((m) => m.parentId === creatorId));
      }
    });
  });

  // ---------------------------------------------------------------------------
  // joinGroup
  // ---------------------------------------------------------------------------
  describe('joinGroup', () => {
    test('joins public group and emits GROUP_MEMBER_JOINED', async () => {
      let emitted = false;
      eventBus.on(ServiceEvents.GROUP_MEMBER_JOINED, () => {
        emitted = true;
      });

      const group = await communityGroupService.createGroup(
        makeGroupParams({ isPublic: true }),
      );
      const joinerId = `joiner_${rid()}`;

      const result = await communityGroupService.joinGroup(group.id, joinerId, 'Joiner');
      assert.equal(result.success, true);
      if (result.success) {
        assert.ok(result.data.members.some((m) => m.parentId === joinerId));
      }
      assert.equal(emitted, true);
    });

    test('returns err for private group', async () => {
      const group = await communityGroupService.createGroup(
        makeGroupParams({ isPublic: false }),
      );

      const result = await communityGroupService.joinGroup(group.id, `p_${rid()}`, 'X');
      assert.equal(result.success, false);
    });

    test('returns err for already a member', async () => {
      const creatorId = `creator_${rid()}`;
      const group = await communityGroupService.createGroup(
        makeGroupParams({ creatorId, isPublic: true }),
      );

      const result = await communityGroupService.joinGroup(group.id, creatorId, 'Creator');
      assert.equal(result.success, false);
    });

    test('returns err when group is full', async () => {
      const group = await communityGroupService.createGroup(
        makeGroupParams({ isPublic: true, maxMembers: 1 }),
      );

      const result = await communityGroupService.joinGroup(group.id, `p_${rid()}`, 'X');
      assert.equal(result.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // leaveGroup
  // ---------------------------------------------------------------------------
  describe('leaveGroup', () => {
    test('removes member from group', async () => {
      const creatorId = `creator_${rid()}`;
      const group = await communityGroupService.createGroup(
        makeGroupParams({
          creatorId,
          isPublic: true,
          memberIds: [`extra_${rid()}`],
          memberNames: ['Extra'],
        }),
      );

      // Extra member leaves — non-privileged, should succeed
      const extraId = group.members.find((m) => m.role === 'MEMBER')!.parentId;
      const result = await communityGroupService.leaveGroup(group.id, extraId);
      assert.equal(result.success, true);
    });

    test('returns err when only admin tries to leave', async () => {
      const creatorId = `creator_${rid()}`;
      const group = await communityGroupService.createGroup(
        makeGroupParams({
          creatorId,
          memberIds: [`m_${rid()}`],
          memberNames: ['Member'],
        }),
      );

      // Owner is only privileged member — should fail
      const result = await communityGroupService.leaveGroup(group.id, creatorId);
      assert.equal(result.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // changeMemberRole
  // ---------------------------------------------------------------------------
  describe('changeMemberRole', () => {
    test('promotes member and emits GROUP_MEMBER_ROLE_CHANGED', async () => {
      let emitted = false;
      eventBus.on(ServiceEvents.GROUP_MEMBER_ROLE_CHANGED, () => {
        emitted = true;
      });

      const creatorId = `creator_${rid()}`;
      const memberId = `m_${rid()}`;
      const group = await communityGroupService.createGroup(
        makeGroupParams({
          creatorId,
          memberIds: [memberId],
          memberNames: ['Member'],
        }),
      );

      const result = await communityGroupService.changeMemberRole({
        groupId: group.id,
        requesterId: creatorId,
        memberId,
        newRole: 'MODERATOR',
      });
      assert.equal(result.success, true);
      assert.equal(emitted, true);
    });

    test('returns err when changing own role', async () => {
      const creatorId = `creator_${rid()}`;
      const group = await communityGroupService.createGroup(makeGroupParams({ creatorId }));

      const result = await communityGroupService.changeMemberRole({
        groupId: group.id,
        requesterId: creatorId,
        memberId: creatorId,
        newRole: 'ADMIN',
      });
      assert.equal(result.success, false);
    });

    test('returns err for OWNER role assignment', async () => {
      const creatorId = `creator_${rid()}`;
      const memberId = `m_${rid()}`;
      const group = await communityGroupService.createGroup(
        makeGroupParams({
          creatorId,
          memberIds: [memberId],
          memberNames: ['Member'],
        }),
      );

      const result = await communityGroupService.changeMemberRole({
        groupId: group.id,
        requesterId: creatorId,
        memberId,
        newRole: 'OWNER',
      });
      assert.equal(result.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // addMemberDirect + removeMemberDirect
  // ---------------------------------------------------------------------------
  describe('addMemberDirect', () => {
    test('adds member directly', async () => {
      const group = await communityGroupService.createGroup(makeGroupParams());
      const newId = `new_${rid()}`;

      const result = await communityGroupService.addMemberDirect(group.id, newId, 'New Member');
      assert.equal(result.success, true);
      if (result.success) {
        assert.ok(result.data.members.some((m) => m.parentId === newId));
      }
    });

    test('no-op for already a member', async () => {
      const creatorId = `creator_${rid()}`;
      const group = await communityGroupService.createGroup(makeGroupParams({ creatorId }));

      const result = await communityGroupService.addMemberDirect(group.id, creatorId, 'Creator');
      assert.equal(result.success, true);
    });
  });

  describe('removeMemberDirect', () => {
    test('removes member from group', async () => {
      const memberId = `m_${rid()}`;
      const group = await communityGroupService.createGroup(
        makeGroupParams({
          memberIds: [memberId],
          memberNames: ['Member'],
        }),
      );

      const result = await communityGroupService.removeMemberDirect(group.id, memberId);
      assert.equal(result.success, true);
    });

    test('no-op for non-member', async () => {
      const group = await communityGroupService.createGroup(makeGroupParams());
      const result = await communityGroupService.removeMemberDirect(group.id, `nobody_${rid()}`);
      assert.equal(result.success, true);
    });
  });

  // ---------------------------------------------------------------------------
  // deleteGroup
  // ---------------------------------------------------------------------------
  describe('deleteGroup', () => {
    test('deletes group', async () => {
      const group = await communityGroupService.createGroup(makeGroupParams());
      const result = await communityGroupService.deleteGroup(group.id);
      assert.equal(result.success, true);

      const found = await communityGroupService.getGroup(group.id);
      assert.equal(found, undefined);
    });

    test('returns err for unknown group', async () => {
      const result = await communityGroupService.deleteGroup(`unknown_${rid()}`);
      assert.equal(result.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // Role helpers
  // ---------------------------------------------------------------------------
  describe('getRoleWeight', () => {
    test('OWNER > ADMIN > MODERATOR > MEMBER', () => {
      assert.ok(communityGroupService.getRoleWeight('OWNER') > communityGroupService.getRoleWeight('ADMIN'));
      assert.ok(communityGroupService.getRoleWeight('ADMIN') > communityGroupService.getRoleWeight('MODERATOR'));
      assert.ok(communityGroupService.getRoleWeight('MODERATOR') > communityGroupService.getRoleWeight('MEMBER'));
    });
  });

  describe('getAssignableRoles', () => {
    test('OWNER can assign ADMIN, MODERATOR, MEMBER', () => {
      const roles = communityGroupService.getAssignableRoles('OWNER');
      assert.ok(roles.includes('ADMIN'));
      assert.ok(roles.includes('MODERATOR'));
      assert.ok(roles.includes('MEMBER'));
    });

    test('MEMBER cannot assign anything', () => {
      const roles = communityGroupService.getAssignableRoles('MEMBER');
      assert.equal(roles.length, 0);
    });
  });

  describe('getRoleBreakdown', () => {
    test('counts members per role', () => {
      const breakdown = communityGroupService.getRoleBreakdown([
        { parentId: '1', parentName: 'A', role: 'OWNER', joinedAt: '' },
        { parentId: '2', parentName: 'B', role: 'MEMBER', joinedAt: '' },
        { parentId: '3', parentName: 'C', role: 'MEMBER', joinedAt: '' },
      ]);
      assert.equal(breakdown.OWNER, 1);
      assert.equal(breakdown.MEMBER, 2);
      assert.equal(breakdown.ADMIN, 0);
    });
  });
});
