// @ts-nocheck
/**
 * Squad Group Service Tests
 *
 * Tests for the squad-group-service that auto-provisions and syncs
 * parent community groups for club squads.
 *
 * Also tests addMemberDirect, removeMemberDirect, and deleteGroup
 * on community-group-service.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach, afterEach } from 'node:test';

import { squadGroupService } from '@/services/squad-group-service';
import { communityGroupService as communityGroupServiceResult } from '@/services/community/community-group-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

const legacyCommunityGroupService = {
  async createGroup(params: Parameters<typeof communityGroupServiceResult.createGroup>[0]) {
    const result = await communityGroupServiceResult.createGroup(params);
    if (!result.success) {
      throw new Error(result.error.message);
    }
    return result.data;
  },
  async getGroup(groupId: string) {
    const result = await communityGroupServiceResult.getGroup(groupId);
    return result.success ? result.data : undefined;
  },
  async addMemberDirect(groupId: string, parentId: string, parentName: string, role?: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER') {
    return communityGroupServiceResult.addMemberDirect(groupId, parentId, parentName, role);
  },
  async removeMemberDirect(groupId: string, parentId: string) {
    return communityGroupServiceResult.removeMemberDirect(groupId, parentId);
  },
  async deleteGroup(groupId: string) {
    return communityGroupServiceResult.deleteGroup(groupId);
  },
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Clear all storage keys used by the services under test.
 * This ensures test isolation between runs.
 */
async function clearStorage(): Promise<void> {
  await apiClient.set(STORAGE_KEYS.SQUAD_GROUP_MAP, {});
  await apiClient.set(STORAGE_KEYS.PARENT_GROUPS, []);
  await apiClient.set(STORAGE_KEYS.CLUB_SQUADS, []);
  await apiClient.set(STORAGE_KEYS.SQUAD_MEMBERS, []);
}

/**
 * Seed a squad into CLUB_SQUADS storage so squadService.getSquad can find it.
 */
async function seedSquad(squad: {
  id: string;
  clubId: string;
  name: string;
  level: string;
  memberCount: number;
  primaryCoach: string;
  meetLocation: string;
}): Promise<void> {
  const existing = await apiClient.get<unknown[]>(STORAGE_KEYS.CLUB_SQUADS, []);
  existing.push(squad);
  await apiClient.set(STORAGE_KEYS.CLUB_SQUADS, existing);
}

/**
 * Seed squad members into SQUAD_MEMBERS storage so squadService.getSquadParents works.
 */
async function seedSquadMembers(
  members: Array<{
    id: string;
    squadId: string;
    athleteId: string;
    athleteName: string;
    athleteAge: number;
    parentId: string;
    parentName: string;
    parentEmail: string;
    status: string;
    joinedAt: string;
    position: string;
    jerseyNumber: number;
  }>,
): Promise<void> {
  const existing = await apiClient.get<unknown[]>(STORAGE_KEYS.SQUAD_MEMBERS, []);
  await apiClient.set(STORAGE_KEYS.SQUAD_MEMBERS, [...existing, ...members]);
}

// ============================================================================
// SQUAD GROUP SERVICE TESTS
// ============================================================================

describe('SquadGroupService', () => {
  beforeEach(async () => {
    await clearStorage();
  });

  // --------------------------------------------------------------------------
  // getOrCreateSquadGroup
  // --------------------------------------------------------------------------

  describe('getOrCreateSquadGroup', () => {
    test('creates a new group for a squad that has no mapping', async () => {
      const squadId = 'squad_gocsg_new';
      const creatorId = 'creator_gocsg_new';
      const creatorName = 'Alice Test';

      await seedSquad({
        id: squadId,
        clubId: 'club_gocsg',
        name: 'U14 Stars',
        level: 'U14',
        memberCount: 3,
        primaryCoach: 'coach_1',
        meetLocation: 'Main Pitch',
      });

      const result = await squadGroupService.getOrCreateSquadGroup(
        squadId,
        creatorId,
        creatorName,
      );

      assert.ok(result.success, 'Result should be success');
      assert.ok(result.data, 'Result data should exist');
      assert.ok(result.data.id, 'Group should have an id');
      assert.equal(result.data.name, 'U14 Stars Parents');
      assert.equal(result.data.type, 'SQUAD');
      assert.equal(result.data.isPublic, false);
      assert.equal(result.data.clubId, 'club_gocsg');

      // Creator should be OWNER
      const owner = result.data.members.find(
        (m: { parentId: string }) => m.parentId === creatorId,
      );
      assert.ok(owner, 'Creator should be a member');
      assert.equal(owner.role, 'OWNER');

      // Mapping should be saved
      const groupId = await squadGroupService.getGroupIdForSquad(squadId);
      assert.equal(groupId, result.data.id);
    });

    test('returns existing group on second call for same squad', async () => {
      const squadId = 'squad_gocsg_existing';
      const creatorId = 'creator_gocsg_existing';
      const creatorName = 'Bob Test';

      await seedSquad({
        id: squadId,
        clubId: 'club_gocsg2',
        name: 'U12 Hawks',
        level: 'U12',
        memberCount: 2,
        primaryCoach: 'coach_2',
        meetLocation: 'Field B',
      });

      const first = await squadGroupService.getOrCreateSquadGroup(
        squadId,
        creatorId,
        creatorName,
      );
      assert.ok(first.success);

      const second = await squadGroupService.getOrCreateSquadGroup(
        squadId,
        creatorId,
        creatorName,
      );
      assert.ok(second.success);

      // Same group returned
      assert.equal(second.data.id, first.data.id);
    });

    test('returns NOT_FOUND error if squad does not exist', async () => {
      const result = await squadGroupService.getOrCreateSquadGroup(
        'squad_nonexistent_xyz',
        'creator_1',
        'Creator',
      );

      assert.equal(result.success, false);
      assert.equal(result.error.code, 'NOT_FOUND');
    });

    test('seeds squad parents as initial group members (excluding creator)', async () => {
      const squadId = 'squad_gocsg_seed';
      const creatorId = 'parent_seed_creator';
      const creatorName = 'Seed Creator';

      await seedSquad({
        id: squadId,
        clubId: 'club_seed',
        name: 'U10 Eagles',
        level: 'U10',
        memberCount: 3,
        primaryCoach: 'coach_3',
        meetLocation: 'Indoor Hall',
      });

      // Seed two squad members: one whose parent is the creator, one is not
      await seedSquadMembers([
        {
          id: 'sm_seed_1',
          squadId,
          athleteId: 'ath_seed_1',
          athleteName: 'Kid A',
          athleteAge: 10,
          parentId: creatorId,
          parentName: creatorName,
          parentEmail: 'creator@test.com',
          status: 'ACTIVE',
          joinedAt: '2024-01-01',
          position: 'Forward',
          jerseyNumber: 9,
        },
        {
          id: 'sm_seed_2',
          squadId,
          athleteId: 'ath_seed_2',
          athleteName: 'Kid B',
          athleteAge: 10,
          parentId: 'parent_seed_other',
          parentName: 'Other Parent',
          parentEmail: 'other@test.com',
          status: 'ACTIVE',
          joinedAt: '2024-01-01',
          position: 'Defender',
          jerseyNumber: 4,
        },
      ]);

      const result = await squadGroupService.getOrCreateSquadGroup(
        squadId,
        creatorId,
        creatorName,
      );

      assert.ok(result.success);
      // Creator is OWNER, other parent is MEMBER
      const members = result.data.members;
      assert.ok(
        members.some((m: { parentId: string; role: string }) => m.parentId === creatorId && m.role === 'OWNER'),
        'Creator should be OWNER',
      );
      assert.ok(
        members.some((m: { parentId: string; role: string }) => m.parentId === 'parent_seed_other' && m.role === 'MEMBER'),
        'Other parent should be MEMBER',
      );
    });

    test('cleans up stale mapping if group was deleted externally', async () => {
      const squadId = 'squad_gocsg_stale';
      const creatorId = 'creator_stale';
      const creatorName = 'Stale Creator';

      await seedSquad({
        id: squadId,
        clubId: 'club_stale',
        name: 'U16 Panthers',
        level: 'U16',
        memberCount: 1,
        primaryCoach: 'coach_4',
        meetLocation: 'Astro',
      });

      // Create initial group
      const first = await squadGroupService.getOrCreateSquadGroup(
        squadId,
        creatorId,
        creatorName,
      );
      assert.ok(first.success);
      const firstGroupId = first.data.id;

      // Simulate external deletion of the group via the community service
      // (this clears both in-memory and persisted state, but leaves squad-group mapping intact)
      await legacyCommunityGroupService.deleteGroup(firstGroupId);

      // Re-inject the stale mapping (deleteGroup above only deleted the group itself)
      const map = await apiClient.get<Record<string, string>>(STORAGE_KEYS.SQUAD_GROUP_MAP, {});
      map[squadId] = firstGroupId;
      await apiClient.set(STORAGE_KEYS.SQUAD_GROUP_MAP, map);

      // Second call should detect the stale mapping, clean it up, and create a new group
      const second = await squadGroupService.getOrCreateSquadGroup(
        squadId,
        creatorId,
        creatorName,
      );
      assert.ok(second.success);
      assert.notEqual(second.data.id, firstGroupId, 'Should create a new group after stale mapping');
    });
  });

  // --------------------------------------------------------------------------
  // syncMemberToGroup
  // --------------------------------------------------------------------------

  describe('syncMemberToGroup', () => {
    test('adds a member to the squad group', async () => {
      const squadId = 'squad_sync_add';
      const creatorId = 'creator_sync_add';

      await seedSquad({
        id: squadId,
        clubId: 'club_sync',
        name: 'U13 Wolves',
        level: 'U13',
        memberCount: 1,
        primaryCoach: 'coach_5',
        meetLocation: 'Grass Pitch',
      });

      // Create group first
      const createResult = await squadGroupService.getOrCreateSquadGroup(
        squadId,
        creatorId,
        'Creator Sync',
      );
      assert.ok(createResult.success);
      const groupId = createResult.data.id;

      // Sync a new member
      const syncResult = await squadGroupService.syncMemberToGroup(
        squadId,
        'parent_new_member',
        'New Parent',
      );
      assert.ok(syncResult.success);

      // Verify member was added
      const group = await legacyCommunityGroupService.getGroup(groupId);
      assert.ok(group, 'Group should exist');
      const newMember = group.members.find(
        (m: { parentId: string }) => m.parentId === 'parent_new_member',
      );
      assert.ok(newMember, 'New member should be in group');
      assert.equal(newMember.parentName, 'New Parent');
    });

    test('no-op if member is already in group', async () => {
      const squadId = 'squad_sync_noop';
      const creatorId = 'creator_sync_noop';

      await seedSquad({
        id: squadId,
        clubId: 'club_sync2',
        name: 'U11 Foxes',
        level: 'U11',
        memberCount: 1,
        primaryCoach: 'coach_6',
        meetLocation: 'Side Pitch',
      });

      const createResult = await squadGroupService.getOrCreateSquadGroup(
        squadId,
        creatorId,
        'Creator Noop',
      );
      assert.ok(createResult.success);
      const groupId = createResult.data.id;

      // Sync same member twice
      await squadGroupService.syncMemberToGroup(squadId, 'parent_dup', 'Dup Parent');
      const secondSync = await squadGroupService.syncMemberToGroup(
        squadId,
        'parent_dup',
        'Dup Parent',
      );
      assert.ok(secondSync.success);

      // Should only appear once
      const group = await legacyCommunityGroupService.getGroup(groupId);
      assert.ok(group);
      const count = group.members.filter(
        (m: { parentId: string }) => m.parentId === 'parent_dup',
      ).length;
      assert.equal(count, 1, 'Member should appear only once');
    });

    test('returns ok(undefined) if no group mapping exists for squad', async () => {
      const result = await squadGroupService.syncMemberToGroup(
        'squad_no_mapping_sync',
        'parent_orphan',
        'Orphan Parent',
      );

      assert.ok(result.success, 'Should succeed gracefully when no mapping');
    });
  });

  // --------------------------------------------------------------------------
  // syncMemberRemovalFromGroup
  // --------------------------------------------------------------------------

  describe('syncMemberRemovalFromGroup', () => {
    test('removes a member from the squad group', async () => {
      const squadId = 'squad_removal';
      const creatorId = 'creator_removal';

      await seedSquad({
        id: squadId,
        clubId: 'club_removal',
        name: 'U15 Bears',
        level: 'U15',
        memberCount: 2,
        primaryCoach: 'coach_7',
        meetLocation: 'Track',
      });

      const createResult = await squadGroupService.getOrCreateSquadGroup(
        squadId,
        creatorId,
        'Creator Removal',
      );
      assert.ok(createResult.success);
      const groupId = createResult.data.id;

      // Add then remove
      await squadGroupService.syncMemberToGroup(squadId, 'parent_remove_me', 'Remove Me');
      const removeResult = await squadGroupService.syncMemberRemovalFromGroup(
        squadId,
        'parent_remove_me',
      );
      assert.ok(removeResult.success);

      // Verify member is gone
      const group = await legacyCommunityGroupService.getGroup(groupId);
      assert.ok(group);
      const removed = group.members.find(
        (m: { parentId: string }) => m.parentId === 'parent_remove_me',
      );
      assert.equal(removed, undefined, 'Member should be removed');
    });

    test('no-op if member is not in the group', async () => {
      const squadId = 'squad_removal_noop';
      const creatorId = 'creator_removal_noop';

      await seedSquad({
        id: squadId,
        clubId: 'club_removal2',
        name: 'U9 Kittens',
        level: 'U9',
        memberCount: 1,
        primaryCoach: 'coach_8',
        meetLocation: 'Mini Pitch',
      });

      await squadGroupService.getOrCreateSquadGroup(squadId, creatorId, 'Creator Noop2');

      const result = await squadGroupService.syncMemberRemovalFromGroup(
        squadId,
        'parent_never_added',
      );
      assert.ok(result.success, 'Should succeed even if member not found');
    });

    test('returns ok(undefined) if no group mapping exists for squad', async () => {
      const result = await squadGroupService.syncMemberRemovalFromGroup(
        'squad_no_mapping_removal',
        'parent_orphan2',
      );

      assert.ok(result.success, 'Should succeed gracefully when no mapping');
    });
  });

  // --------------------------------------------------------------------------
  // deleteSquadGroup
  // --------------------------------------------------------------------------

  describe('deleteSquadGroup', () => {
    test('deletes the group and cleans up mapping', async () => {
      const squadId = 'squad_delete';
      const creatorId = 'creator_delete';

      await seedSquad({
        id: squadId,
        clubId: 'club_delete',
        name: 'U17 Lions',
        level: 'U17',
        memberCount: 1,
        primaryCoach: 'coach_9',
        meetLocation: 'Stadium',
      });

      const createResult = await squadGroupService.getOrCreateSquadGroup(
        squadId,
        creatorId,
        'Creator Delete',
      );
      assert.ok(createResult.success);
      const groupId = createResult.data.id;

      // Delete
      const deleteResult = await squadGroupService.deleteSquadGroup(squadId);
      assert.ok(deleteResult.success);

      // Mapping should be gone
      const mappedId = await squadGroupService.getGroupIdForSquad(squadId);
      assert.equal(mappedId, null, 'Mapping should be removed');

      // Group should be gone
      const group = await legacyCommunityGroupService.getGroup(groupId);
      assert.equal(group, undefined, 'Group should be deleted');
    });

    test('returns ok(undefined) if no group mapping exists', async () => {
      const result = await squadGroupService.deleteSquadGroup('squad_no_mapping_delete');

      assert.ok(result.success, 'Should succeed gracefully when no mapping');
    });
  });

  // --------------------------------------------------------------------------
  // getGroupIdForSquad
  // --------------------------------------------------------------------------

  describe('getGroupIdForSquad', () => {
    test('returns group id when mapping exists', async () => {
      const squadId = 'squad_getid';
      const creatorId = 'creator_getid';

      await seedSquad({
        id: squadId,
        clubId: 'club_getid',
        name: 'U8 Ducks',
        level: 'U8',
        memberCount: 1,
        primaryCoach: 'coach_10',
        meetLocation: 'School Hall',
      });

      const createResult = await squadGroupService.getOrCreateSquadGroup(
        squadId,
        creatorId,
        'Creator GetId',
      );
      assert.ok(createResult.success);

      const groupId = await squadGroupService.getGroupIdForSquad(squadId);
      assert.equal(groupId, createResult.data.id);
    });

    test('returns null when no mapping exists', async () => {
      const groupId = await squadGroupService.getGroupIdForSquad('squad_no_mapping_getid');
      assert.equal(groupId, null);
    });
  });
});

// ============================================================================
// COMMUNITY GROUP SERVICE — DIRECT MEMBER MANAGEMENT TESTS
// ============================================================================

describe('CommunityGroupService — Direct Member Management', () => {
  beforeEach(async () => {
    await clearStorage();
  });

  // --------------------------------------------------------------------------
  // addMemberDirect
  // --------------------------------------------------------------------------

  describe('addMemberDirect', () => {
    test('adds a member to an existing group', async () => {
      // Create a group first
      const group = await legacyCommunityGroupService.createGroup({
        name: 'Direct Add Test Group',
        type: 'GENERAL',
        memberIds: [],
        memberNames: [],
        creatorId: 'owner_direct_add',
        creatorName: 'Owner Direct',
        isPublic: false,
      });

      const result = await legacyCommunityGroupService.addMemberDirect(
        group.id,
        'parent_direct_add',
        'Direct Add Parent',
      );

      assert.ok(result.success);
      assert.ok(result.data);
      const added = result.data.members.find(
        (m: { parentId: string }) => m.parentId === 'parent_direct_add',
      );
      assert.ok(added, 'Member should be added');
      assert.equal(added.role, 'MEMBER');
      assert.equal(added.parentName, 'Direct Add Parent');
    });

    test('is a no-op if member is already in the group', async () => {
      const group = await legacyCommunityGroupService.createGroup({
        name: 'Direct Add Noop Group',
        type: 'GENERAL',
        memberIds: ['parent_already_in'],
        memberNames: ['Already In'],
        creatorId: 'owner_direct_noop',
        creatorName: 'Owner Noop',
        isPublic: false,
      });

      const initialCount = group.members.length;

      const result = await legacyCommunityGroupService.addMemberDirect(
        group.id,
        'parent_already_in',
        'Already In',
      );

      assert.ok(result.success);
      assert.equal(result.data.members.length, initialCount, 'Member count should not change');
    });

    test('returns NOT_FOUND for non-existent group', async () => {
      const result = await legacyCommunityGroupService.addMemberDirect(
        'group_nonexistent_direct',
        'parent_x',
        'Parent X',
      );

      assert.equal(result.success, false);
      assert.equal(result.error.code, 'NOT_FOUND');
    });

    test('respects maxMembers limit', async () => {
      const group = await legacyCommunityGroupService.createGroup({
        name: 'Max Members Group',
        type: 'GENERAL',
        memberIds: [],
        memberNames: [],
        creatorId: 'owner_max',
        creatorName: 'Owner Max',
        isPublic: false,
        maxMembers: 1, // Owner takes the only slot
      });

      const result = await legacyCommunityGroupService.addMemberDirect(
        group.id,
        'parent_overflow',
        'Overflow Parent',
      );

      assert.equal(result.success, false);
      assert.equal(result.error.code, 'VALIDATION');
    });
  });

  // --------------------------------------------------------------------------
  // removeMemberDirect
  // --------------------------------------------------------------------------

  describe('removeMemberDirect', () => {
    test('removes a member from an existing group', async () => {
      const group = await legacyCommunityGroupService.createGroup({
        name: 'Direct Remove Test Group',
        type: 'GENERAL',
        memberIds: ['parent_to_remove'],
        memberNames: ['Remove Me'],
        creatorId: 'owner_direct_remove',
        creatorName: 'Owner Remove',
        isPublic: false,
      });

      const result = await legacyCommunityGroupService.removeMemberDirect(
        group.id,
        'parent_to_remove',
      );

      assert.ok(result.success);

      // Verify member is gone
      const updatedGroup = await legacyCommunityGroupService.getGroup(group.id);
      assert.ok(updatedGroup);
      const found = updatedGroup.members.find(
        (m: { parentId: string }) => m.parentId === 'parent_to_remove',
      );
      assert.equal(found, undefined, 'Member should be removed');
    });

    test('is a no-op if member is not in the group', async () => {
      const group = await legacyCommunityGroupService.createGroup({
        name: 'Direct Remove Noop Group',
        type: 'GENERAL',
        memberIds: [],
        memberNames: [],
        creatorId: 'owner_direct_remove_noop',
        creatorName: 'Owner Noop Remove',
        isPublic: false,
      });

      const result = await legacyCommunityGroupService.removeMemberDirect(
        group.id,
        'parent_not_in_group',
      );

      assert.ok(result.success, 'Should succeed even if member not found');
    });

    test('returns NOT_FOUND for non-existent group', async () => {
      const result = await legacyCommunityGroupService.removeMemberDirect(
        'group_nonexistent_remove',
        'parent_y',
      );

      assert.equal(result.success, false);
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });

  // --------------------------------------------------------------------------
  // deleteGroup
  // --------------------------------------------------------------------------

  describe('deleteGroup', () => {
    test('deletes an existing group', async () => {
      const group = await legacyCommunityGroupService.createGroup({
        name: 'Delete Me Group',
        type: 'GENERAL',
        memberIds: [],
        memberNames: [],
        creatorId: 'owner_delete_group',
        creatorName: 'Owner Delete',
        isPublic: false,
      });

      const result = await legacyCommunityGroupService.deleteGroup(group.id);

      assert.ok(result.success);

      // Verify group is gone
      const found = await legacyCommunityGroupService.getGroup(group.id);
      assert.equal(found, undefined, 'Group should be deleted');
    });

    test('returns NOT_FOUND for non-existent group', async () => {
      const result = await legacyCommunityGroupService.deleteGroup('group_nonexistent_delete');

      assert.equal(result.success, false);
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });
});
