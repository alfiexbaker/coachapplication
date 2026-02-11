"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importStar(require("node:test"));
const squad_group_service_1 = require("@/services/squad-group-service");
const community_group_service_1 = require("@/services/community/community-group-service");
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const legacyCommunityGroupService = {
    async createGroup(params) {
        const result = await community_group_service_1.communityGroupService.createGroup(params);
        if (!result.success) {
            throw new Error(result.error.message);
        }
        return result.data;
    },
    async getGroup(groupId) {
        const result = await community_group_service_1.communityGroupService.getGroup(groupId);
        return result.success ? result.data : undefined;
    },
    async addMemberDirect(groupId, parentId, parentName, role) {
        return community_group_service_1.communityGroupService.addMemberDirect(groupId, parentId, parentName, role);
    },
    async removeMemberDirect(groupId, parentId) {
        return community_group_service_1.communityGroupService.removeMemberDirect(groupId, parentId);
    },
    async deleteGroup(groupId) {
        return community_group_service_1.communityGroupService.deleteGroup(groupId);
    },
};
// ============================================================================
// HELPERS
// ============================================================================
/**
 * Clear all storage keys used by the services under test.
 * This ensures test isolation between runs.
 */
async function clearStorage() {
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SQUAD_GROUP_MAP, {});
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.PARENT_GROUPS, []);
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.CLUB_SQUADS, []);
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SQUAD_MEMBERS, []);
}
/**
 * Seed a squad into CLUB_SQUADS storage so squadService.getSquad can find it.
 */
async function seedSquad(squad) {
    const existing = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.CLUB_SQUADS, []);
    existing.push(squad);
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.CLUB_SQUADS, existing);
}
/**
 * Seed squad members into SQUAD_MEMBERS storage so squadService.getSquadParents works.
 */
async function seedSquadMembers(members) {
    const existing = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.SQUAD_MEMBERS, []);
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SQUAD_MEMBERS, [...existing, ...members]);
}
// ============================================================================
// SQUAD GROUP SERVICE TESTS
// ============================================================================
(0, node_test_1.describe)('SquadGroupService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await clearStorage();
    });
    // --------------------------------------------------------------------------
    // getOrCreateSquadGroup
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('getOrCreateSquadGroup', () => {
        (0, node_test_1.default)('creates a new group for a squad that has no mapping', async () => {
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
            const result = await squad_group_service_1.squadGroupService.getOrCreateSquadGroup(squadId, creatorId, creatorName);
            strict_1.default.ok(result.success, 'Result should be success');
            strict_1.default.ok(result.data, 'Result data should exist');
            strict_1.default.ok(result.data.id, 'Group should have an id');
            strict_1.default.equal(result.data.name, 'U14 Stars Parents');
            strict_1.default.equal(result.data.type, 'SQUAD');
            strict_1.default.equal(result.data.isPublic, false);
            strict_1.default.equal(result.data.clubId, 'club_gocsg');
            // Creator should be OWNER
            const owner = result.data.members.find((m) => m.parentId === creatorId);
            strict_1.default.ok(owner, 'Creator should be a member');
            strict_1.default.equal(owner.role, 'OWNER');
            // Mapping should be saved
            const groupId = await squad_group_service_1.squadGroupService.getGroupIdForSquad(squadId);
            strict_1.default.equal(groupId, result.data.id);
        });
        (0, node_test_1.default)('returns existing group on second call for same squad', async () => {
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
            const first = await squad_group_service_1.squadGroupService.getOrCreateSquadGroup(squadId, creatorId, creatorName);
            strict_1.default.ok(first.success);
            const second = await squad_group_service_1.squadGroupService.getOrCreateSquadGroup(squadId, creatorId, creatorName);
            strict_1.default.ok(second.success);
            // Same group returned
            strict_1.default.equal(second.data.id, first.data.id);
        });
        (0, node_test_1.default)('returns NOT_FOUND error if squad does not exist', async () => {
            const result = await squad_group_service_1.squadGroupService.getOrCreateSquadGroup('squad_nonexistent_xyz', 'creator_1', 'Creator');
            strict_1.default.equal(result.success, false);
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
        (0, node_test_1.default)('seeds squad parents as initial group members (excluding creator)', async () => {
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
            const result = await squad_group_service_1.squadGroupService.getOrCreateSquadGroup(squadId, creatorId, creatorName);
            strict_1.default.ok(result.success);
            // Creator is OWNER, other parent is MEMBER
            const members = result.data.members;
            strict_1.default.ok(members.some((m) => m.parentId === creatorId && m.role === 'OWNER'), 'Creator should be OWNER');
            strict_1.default.ok(members.some((m) => m.parentId === 'parent_seed_other' && m.role === 'MEMBER'), 'Other parent should be MEMBER');
        });
        (0, node_test_1.default)('cleans up stale mapping if group was deleted externally', async () => {
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
            const first = await squad_group_service_1.squadGroupService.getOrCreateSquadGroup(squadId, creatorId, creatorName);
            strict_1.default.ok(first.success);
            const firstGroupId = first.data.id;
            // Simulate external deletion of the group via the community service
            // (this clears both in-memory and persisted state, but leaves squad-group mapping intact)
            await legacyCommunityGroupService.deleteGroup(firstGroupId);
            // Re-inject the stale mapping (deleteGroup above only deleted the group itself)
            const map = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.SQUAD_GROUP_MAP, {});
            map[squadId] = firstGroupId;
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SQUAD_GROUP_MAP, map);
            // Second call should detect the stale mapping, clean it up, and create a new group
            const second = await squad_group_service_1.squadGroupService.getOrCreateSquadGroup(squadId, creatorId, creatorName);
            strict_1.default.ok(second.success);
            strict_1.default.notEqual(second.data.id, firstGroupId, 'Should create a new group after stale mapping');
        });
    });
    // --------------------------------------------------------------------------
    // syncMemberToGroup
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('syncMemberToGroup', () => {
        (0, node_test_1.default)('adds a member to the squad group', async () => {
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
            const createResult = await squad_group_service_1.squadGroupService.getOrCreateSquadGroup(squadId, creatorId, 'Creator Sync');
            strict_1.default.ok(createResult.success);
            const groupId = createResult.data.id;
            // Sync a new member
            const syncResult = await squad_group_service_1.squadGroupService.syncMemberToGroup(squadId, 'parent_new_member', 'New Parent');
            strict_1.default.ok(syncResult.success);
            // Verify member was added
            const group = await legacyCommunityGroupService.getGroup(groupId);
            strict_1.default.ok(group, 'Group should exist');
            const newMember = group.members.find((m) => m.parentId === 'parent_new_member');
            strict_1.default.ok(newMember, 'New member should be in group');
            strict_1.default.equal(newMember.role, 'MEMBER');
        });
        (0, node_test_1.default)('no-op if member is already in group', async () => {
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
            const createResult = await squad_group_service_1.squadGroupService.getOrCreateSquadGroup(squadId, creatorId, 'Creator Noop');
            strict_1.default.ok(createResult.success);
            const groupId = createResult.data.id;
            // Sync same member twice
            await squad_group_service_1.squadGroupService.syncMemberToGroup(squadId, 'parent_dup', 'Dup Parent');
            const secondSync = await squad_group_service_1.squadGroupService.syncMemberToGroup(squadId, 'parent_dup', 'Dup Parent');
            strict_1.default.ok(secondSync.success);
            // Should only appear once
            const group = await legacyCommunityGroupService.getGroup(groupId);
            strict_1.default.ok(group);
            const count = group.members.filter((m) => m.parentId === 'parent_dup').length;
            strict_1.default.equal(count, 1, 'Member should appear only once');
        });
        (0, node_test_1.default)('returns ok(undefined) if no group mapping exists for squad', async () => {
            const result = await squad_group_service_1.squadGroupService.syncMemberToGroup('squad_no_mapping_sync', 'parent_orphan', 'Orphan Parent');
            strict_1.default.ok(result.success, 'Should succeed gracefully when no mapping');
        });
    });
    // --------------------------------------------------------------------------
    // syncMemberRemovalFromGroup
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('syncMemberRemovalFromGroup', () => {
        (0, node_test_1.default)('removes a member from the squad group', async () => {
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
            const createResult = await squad_group_service_1.squadGroupService.getOrCreateSquadGroup(squadId, creatorId, 'Creator Removal');
            strict_1.default.ok(createResult.success);
            const groupId = createResult.data.id;
            // Add then remove
            await squad_group_service_1.squadGroupService.syncMemberToGroup(squadId, 'parent_remove_me', 'Remove Me');
            const removeResult = await squad_group_service_1.squadGroupService.syncMemberRemovalFromGroup(squadId, 'parent_remove_me');
            strict_1.default.ok(removeResult.success);
            // Verify member is gone
            const group = await legacyCommunityGroupService.getGroup(groupId);
            strict_1.default.ok(group);
            const removed = group.members.find((m) => m.parentId === 'parent_remove_me');
            strict_1.default.equal(removed, undefined, 'Member should be removed');
        });
        (0, node_test_1.default)('no-op if member is not in the group', async () => {
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
            await squad_group_service_1.squadGroupService.getOrCreateSquadGroup(squadId, creatorId, 'Creator Noop2');
            const result = await squad_group_service_1.squadGroupService.syncMemberRemovalFromGroup(squadId, 'parent_never_added');
            strict_1.default.ok(result.success, 'Should succeed even if member not found');
        });
        (0, node_test_1.default)('returns ok(undefined) if no group mapping exists for squad', async () => {
            const result = await squad_group_service_1.squadGroupService.syncMemberRemovalFromGroup('squad_no_mapping_removal', 'parent_orphan2');
            strict_1.default.ok(result.success, 'Should succeed gracefully when no mapping');
        });
    });
    // --------------------------------------------------------------------------
    // deleteSquadGroup
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('deleteSquadGroup', () => {
        (0, node_test_1.default)('deletes the group and cleans up mapping', async () => {
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
            const createResult = await squad_group_service_1.squadGroupService.getOrCreateSquadGroup(squadId, creatorId, 'Creator Delete');
            strict_1.default.ok(createResult.success);
            const groupId = createResult.data.id;
            // Delete
            const deleteResult = await squad_group_service_1.squadGroupService.deleteSquadGroup(squadId);
            strict_1.default.ok(deleteResult.success);
            // Mapping should be gone
            const mappedId = await squad_group_service_1.squadGroupService.getGroupIdForSquad(squadId);
            strict_1.default.equal(mappedId, null, 'Mapping should be removed');
            // Group should be gone
            const group = await legacyCommunityGroupService.getGroup(groupId);
            strict_1.default.equal(group, undefined, 'Group should be deleted');
        });
        (0, node_test_1.default)('returns ok(undefined) if no group mapping exists', async () => {
            const result = await squad_group_service_1.squadGroupService.deleteSquadGroup('squad_no_mapping_delete');
            strict_1.default.ok(result.success, 'Should succeed gracefully when no mapping');
        });
    });
    // --------------------------------------------------------------------------
    // getGroupIdForSquad
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('getGroupIdForSquad', () => {
        (0, node_test_1.default)('returns group id when mapping exists', async () => {
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
            const createResult = await squad_group_service_1.squadGroupService.getOrCreateSquadGroup(squadId, creatorId, 'Creator GetId');
            strict_1.default.ok(createResult.success);
            const groupId = await squad_group_service_1.squadGroupService.getGroupIdForSquad(squadId);
            strict_1.default.equal(groupId, createResult.data.id);
        });
        (0, node_test_1.default)('returns null when no mapping exists', async () => {
            const groupId = await squad_group_service_1.squadGroupService.getGroupIdForSquad('squad_no_mapping_getid');
            strict_1.default.equal(groupId, null);
        });
    });
});
// ============================================================================
// COMMUNITY GROUP SERVICE — DIRECT MEMBER MANAGEMENT TESTS
// ============================================================================
(0, node_test_1.describe)('CommunityGroupService — Direct Member Management', () => {
    (0, node_test_1.beforeEach)(async () => {
        await clearStorage();
    });
    // --------------------------------------------------------------------------
    // addMemberDirect
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('addMemberDirect', () => {
        (0, node_test_1.default)('adds a member to an existing group', async () => {
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
            const result = await legacyCommunityGroupService.addMemberDirect(group.id, 'parent_direct_add', 'Direct Add Parent');
            strict_1.default.ok(result.success);
            strict_1.default.ok(result.data);
            const added = result.data.members.find((m) => m.parentId === 'parent_direct_add');
            strict_1.default.ok(added, 'Member should be added');
            strict_1.default.equal(added.role, 'MEMBER');
        });
        (0, node_test_1.default)('is a no-op if member is already in the group', async () => {
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
            const result = await legacyCommunityGroupService.addMemberDirect(group.id, 'parent_already_in', 'Already In');
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.members.length, initialCount, 'Member count should not change');
        });
        (0, node_test_1.default)('returns NOT_FOUND for non-existent group', async () => {
            const result = await legacyCommunityGroupService.addMemberDirect('group_nonexistent_direct', 'parent_x', 'Parent X');
            strict_1.default.equal(result.success, false);
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
        (0, node_test_1.default)('respects maxMembers limit', async () => {
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
            const result = await legacyCommunityGroupService.addMemberDirect(group.id, 'parent_overflow', 'Overflow Parent');
            strict_1.default.equal(result.success, false);
            strict_1.default.equal(result.error.code, 'VALIDATION');
        });
    });
    // --------------------------------------------------------------------------
    // removeMemberDirect
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('removeMemberDirect', () => {
        (0, node_test_1.default)('removes a member from an existing group', async () => {
            const group = await legacyCommunityGroupService.createGroup({
                name: 'Direct Remove Test Group',
                type: 'GENERAL',
                memberIds: ['parent_to_remove'],
                memberNames: ['Remove Me'],
                creatorId: 'owner_direct_remove',
                creatorName: 'Owner Remove',
                isPublic: false,
            });
            const result = await legacyCommunityGroupService.removeMemberDirect(group.id, 'parent_to_remove');
            strict_1.default.ok(result.success);
            // Verify member is gone
            const updatedGroup = await legacyCommunityGroupService.getGroup(group.id);
            strict_1.default.ok(updatedGroup);
            const found = updatedGroup.members.find((m) => m.parentId === 'parent_to_remove');
            strict_1.default.equal(found, undefined, 'Member should be removed');
        });
        (0, node_test_1.default)('is a no-op if member is not in the group', async () => {
            const group = await legacyCommunityGroupService.createGroup({
                name: 'Direct Remove Noop Group',
                type: 'GENERAL',
                memberIds: [],
                memberNames: [],
                creatorId: 'owner_direct_remove_noop',
                creatorName: 'Owner Noop Remove',
                isPublic: false,
            });
            const result = await legacyCommunityGroupService.removeMemberDirect(group.id, 'parent_not_in_group');
            strict_1.default.ok(result.success, 'Should succeed even if member not found');
        });
        (0, node_test_1.default)('returns NOT_FOUND for non-existent group', async () => {
            const result = await legacyCommunityGroupService.removeMemberDirect('group_nonexistent_remove', 'parent_y');
            strict_1.default.equal(result.success, false);
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
    });
    // --------------------------------------------------------------------------
    // deleteGroup
    // --------------------------------------------------------------------------
    (0, node_test_1.describe)('deleteGroup', () => {
        (0, node_test_1.default)('deletes an existing group', async () => {
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
            strict_1.default.ok(result.success);
            // Verify group is gone
            const found = await legacyCommunityGroupService.getGroup(group.id);
            strict_1.default.equal(found, undefined, 'Group should be deleted');
        });
        (0, node_test_1.default)('returns NOT_FOUND for non-existent group', async () => {
            const result = await legacyCommunityGroupService.deleteGroup('group_nonexistent_delete');
            strict_1.default.equal(result.success, false);
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
    });
});
