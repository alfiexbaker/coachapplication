import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { communityGroupService, type CreateGroupParams } from '@/services/community/community-group-service';
import { POC_ACCOUNT_IDS } from '@/constants/poc-accounts';
import type { Result, ServiceError } from '@/types/result';

function expectOk<T>(result: Result<T, ServiceError>): T {
  assert.equal(result.success, true);
  return result.data;
}

function expectErr(result: Result<unknown, ServiceError>, code: ServiceError['code']): ServiceError {
  assert.equal(result.success, false);
  return result.error.code === code ? result.error : assert.fail(`Expected error code ${code}`);
}

let seq = 0;

function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}_${seq}`;
}

async function createGroup(overrides: Partial<CreateGroupParams> = {}) {
  const creatorId = overrides.creatorId ?? nextId('parent');
  const creatorName = overrides.creatorName ?? `Parent ${creatorId}`;

  return expectOk(await communityGroupService.createGroup({
    name: overrides.name ?? `Group ${nextId('name')}`,
    description: overrides.description ?? 'Test group',
    type: overrides.type ?? 'GENERAL',
    memberIds: overrides.memberIds ?? [],
    memberNames: overrides.memberNames ?? [],
    creatorId,
    creatorName,
    isPublic: overrides.isPublic ?? true,
    clubId: overrides.clubId,
    sessionId: overrides.sessionId,
    maxMembers: overrides.maxMembers,
  }));
}

describe('CommunityGroupService', () => {
  beforeEach(async () => {
    seq = 0;
    (communityGroupService as unknown as { inMemoryGroups: unknown[] }).inMemoryGroups = [];
    await apiClient.set(STORAGE_KEYS.PARENT_GROUPS, []);
    await apiClient.set(STORAGE_KEYS.GROUP_INVITES, []);
  });

  describe('createGroup', () => {
    it('creates a group with creator as owner', async () => {
      const creatorId = nextId('creator');
      const group = await createGroup({
        creatorId,
        creatorName: 'Creator User',
        name: 'Local Group',
      });

      assert.ok(group.id);
      assert.equal(group.name, 'Local Group');
      assert.equal(group.members.length, 1);
      assert.equal(group.members[0].parentId, creatorId);
      assert.equal(group.members[0].role, 'OWNER');
    });
  });

  describe('querying', () => {
    it('returns all groups and parent-specific groups', async () => {
      const parentA = nextId('parent');
      const parentB = nextId('parent');
      await createGroup({ creatorId: parentA, creatorName: 'A', name: 'A Group' });
      await createGroup({ creatorId: parentB, creatorName: 'B', name: 'B Group' });

      const allGroups = expectOk(await communityGroupService.getAllGroups());
      const parentAGroups = expectOk(await communityGroupService.getParentGroups(parentA));

      assert.ok(allGroups.length >= 2);
      assert.equal(parentAGroups.length, 1);
      assert.equal(parentAGroups[0].name, 'A Group');
    });

    it('returns only public groups', async () => {
      await createGroup({ name: 'Public Group', isPublic: true });
      await createGroup({ name: 'Private Group', isPublic: false });

      const publicGroups = expectOk(await communityGroupService.getPublicGroups());
      assert.ok(publicGroups.some((group) => group.name === 'Public Group'));
      assert.ok(!publicGroups.some((group) => group.name === 'Private Group'));
    });

    it('matches canonical account aliases when listing parent groups', async () => {
      await createGroup({
        creatorId: POC_ACCOUNT_IDS.coachStorage,
        creatorName: 'Coach Alias',
        name: 'Alias Group',
      });

      const aliasGroups = expectOk(await communityGroupService.getParentGroups(POC_ACCOUNT_IDS.coach));
      assert.equal(aliasGroups.length, 1);
      assert.equal(aliasGroups[0].name, 'Alias Group');
    });
  });

  describe('membership', () => {
    it('joins a public group as MEMBER', async () => {
      const group = await createGroup({ name: 'Joinable', isPublic: true });
      const joinerId = nextId('joiner');

      const joined = expectOk(await communityGroupService.joinGroup(group.id, joinerId, 'Joiner Name'));

      assert.ok(joined.members.some((member) => member.parentId === joinerId && member.role === 'MEMBER'));
    });

    it('rejects joining a private group without invitation', async () => {
      const group = await createGroup({ name: 'Private', isPublic: false });
      const result = await communityGroupService.joinGroup(group.id, nextId('joiner'), 'Joiner Name');

      expectErr(result, 'UNAUTHORIZED');
    });

    it('leaves a group and removes the member', async () => {
      const group = await createGroup({ name: 'Leave Group', isPublic: true });
      const memberId = nextId('member');
      expectOk(await communityGroupService.joinGroup(group.id, memberId, 'Member Name'));

      expectOk(await communityGroupService.leaveGroup(group.id, memberId));

      const updated = expectOk(await communityGroupService.getGroup(group.id));
      assert.ok(!updated.members.some((member) => member.parentId === memberId));
    });

    it('accepts alias id for leaveGroup member lookup', async () => {
      const group = await createGroup({ name: 'Alias Leave Group', isPublic: true });
      expectOk(await communityGroupService.joinGroup(group.id, POC_ACCOUNT_IDS.coachStorage, 'Alias Coach'));

      expectOk(await communityGroupService.leaveGroup(group.id, POC_ACCOUNT_IDS.coach));

      const updated = expectOk(await communityGroupService.getGroup(group.id));
      assert.ok(!updated.members.some((member) => member.parentId === POC_ACCOUNT_IDS.coachStorage));
    });
  });

  describe('invites and roles', () => {
    it('invites and accepts into membership', async () => {
      const group = await createGroup({
        name: 'Invite Group',
        creatorId: 'owner_1',
        creatorName: 'Owner',
      });
      const inviteeId = nextId('invitee');

      const invite = expectOk(await communityGroupService.inviteToGroup(
        group.id,
        'owner_1',
        inviteeId,
        'Invitee',
      ));
      expectOk(await communityGroupService.acceptGroupInvite(invite.id));

      const updated = expectOk(await communityGroupService.getGroup(group.id));
      assert.ok(updated.members.some((member) => member.parentId === inviteeId));
    });

    it('changes a member role when requester has permission', async () => {
      const group = await createGroup({
        name: 'Roles Group',
        creatorId: 'owner_2',
        creatorName: 'Owner 2',
      });
      const memberId = nextId('member');
      expectOk(await communityGroupService.joinGroup(group.id, memberId, 'Member'));

      expectOk(await communityGroupService.changeMemberRole({
        groupId: group.id,
        requesterId: 'owner_2',
        memberId,
        newRole: 'MODERATOR',
      }));

      const updated = expectOk(await communityGroupService.getGroup(group.id));
      const member = updated.members.find((item) => item.parentId === memberId);
      assert.equal(member?.role, 'MODERATOR');
    });

    it('rejects role change when requester is not admin', async () => {
      const group = await createGroup({
        name: 'Unauthorized Change',
        creatorId: 'owner_3',
        creatorName: 'Owner 3',
      });
      const memberId = nextId('member');
      expectOk(await communityGroupService.joinGroup(group.id, memberId, 'Member'));

      const result = await communityGroupService.changeMemberRole({
        groupId: group.id,
        requesterId: memberId,
        memberId: 'owner_3',
        newRole: 'MODERATOR',
      });

      expectErr(result, 'UNAUTHORIZED');
    });
  });

  describe('deleteGroup', () => {
    it('deletes a group and subsequent lookup fails', async () => {
      const group = await createGroup({ name: 'Delete Group' });

      expectOk(await communityGroupService.deleteGroup(group.id));

      const groupResult = await communityGroupService.getGroup(group.id);
      expectErr(groupResult, 'NOT_FOUND');
    });
  });
});
