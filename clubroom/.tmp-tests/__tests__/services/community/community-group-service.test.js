"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const community_group_service_1 = require("@/services/community/community-group-service");
const poc_accounts_1 = require("@/constants/poc-accounts");
function expectOk(result) {
    strict_1.default.equal(result.success, true);
    return result.data;
}
function expectErr(result, code) {
    strict_1.default.equal(result.success, false);
    return result.error.code === code ? result.error : strict_1.default.fail(`Expected error code ${code}`);
}
let seq = 0;
function nextId(prefix) {
    seq += 1;
    return `${prefix}_${seq}`;
}
async function createGroup(overrides = {}) {
    const creatorId = overrides.creatorId ?? nextId('parent');
    const creatorName = overrides.creatorName ?? `Parent ${creatorId}`;
    return expectOk(await community_group_service_1.communityGroupService.createGroup({
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
(0, node_test_1.describe)('CommunityGroupService', () => {
    (0, node_test_1.beforeEach)(async () => {
        seq = 0;
        community_group_service_1.communityGroupService.inMemoryGroups = [];
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.PARENT_GROUPS, []);
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.GROUP_INVITES, []);
    });
    (0, node_test_1.describe)('createGroup', () => {
        (0, node_test_1.it)('creates a group with creator as owner', async () => {
            const creatorId = nextId('creator');
            const group = await createGroup({
                creatorId,
                creatorName: 'Creator User',
                name: 'Local Group',
            });
            strict_1.default.ok(group.id);
            strict_1.default.equal(group.name, 'Local Group');
            strict_1.default.equal(group.members.length, 1);
            strict_1.default.equal(group.members[0].parentId, creatorId);
            strict_1.default.equal(group.members[0].role, 'OWNER');
        });
    });
    (0, node_test_1.describe)('querying', () => {
        (0, node_test_1.it)('returns all groups and parent-specific groups', async () => {
            const parentA = nextId('parent');
            const parentB = nextId('parent');
            await createGroup({ creatorId: parentA, creatorName: 'A', name: 'A Group' });
            await createGroup({ creatorId: parentB, creatorName: 'B', name: 'B Group' });
            const allGroups = expectOk(await community_group_service_1.communityGroupService.getAllGroups());
            const parentAGroups = expectOk(await community_group_service_1.communityGroupService.getParentGroups(parentA));
            strict_1.default.ok(allGroups.length >= 2);
            strict_1.default.equal(parentAGroups.length, 1);
            strict_1.default.equal(parentAGroups[0].name, 'A Group');
        });
        (0, node_test_1.it)('returns only public groups', async () => {
            await createGroup({ name: 'Public Group', isPublic: true });
            await createGroup({ name: 'Private Group', isPublic: false });
            const publicGroups = expectOk(await community_group_service_1.communityGroupService.getPublicGroups());
            strict_1.default.ok(publicGroups.some((group) => group.name === 'Public Group'));
            strict_1.default.ok(!publicGroups.some((group) => group.name === 'Private Group'));
        });
        (0, node_test_1.it)('matches canonical account aliases when listing parent groups', async () => {
            await createGroup({
                creatorId: poc_accounts_1.POC_ACCOUNT_IDS.coachStorage,
                creatorName: 'Coach Alias',
                name: 'Alias Group',
            });
            const aliasGroups = expectOk(await community_group_service_1.communityGroupService.getParentGroups(poc_accounts_1.POC_ACCOUNT_IDS.coach));
            strict_1.default.equal(aliasGroups.length, 1);
            strict_1.default.equal(aliasGroups[0].name, 'Alias Group');
        });
    });
    (0, node_test_1.describe)('membership', () => {
        (0, node_test_1.it)('joins a public group as MEMBER', async () => {
            const group = await createGroup({ name: 'Joinable', isPublic: true });
            const joinerId = nextId('joiner');
            const joined = expectOk(await community_group_service_1.communityGroupService.joinGroup(group.id, joinerId, 'Joiner Name'));
            strict_1.default.ok(joined.members.some((member) => member.parentId === joinerId && member.role === 'MEMBER'));
        });
        (0, node_test_1.it)('rejects joining a private group without invitation', async () => {
            const group = await createGroup({ name: 'Private', isPublic: false });
            const result = await community_group_service_1.communityGroupService.joinGroup(group.id, nextId('joiner'), 'Joiner Name');
            expectErr(result, 'UNAUTHORIZED');
        });
        (0, node_test_1.it)('leaves a group and removes the member', async () => {
            const group = await createGroup({ name: 'Leave Group', isPublic: true });
            const memberId = nextId('member');
            expectOk(await community_group_service_1.communityGroupService.joinGroup(group.id, memberId, 'Member Name'));
            expectOk(await community_group_service_1.communityGroupService.leaveGroup(group.id, memberId));
            const updated = expectOk(await community_group_service_1.communityGroupService.getGroup(group.id));
            strict_1.default.ok(!updated.members.some((member) => member.parentId === memberId));
        });
        (0, node_test_1.it)('accepts alias id for leaveGroup member lookup', async () => {
            const group = await createGroup({ name: 'Alias Leave Group', isPublic: true });
            expectOk(await community_group_service_1.communityGroupService.joinGroup(group.id, poc_accounts_1.POC_ACCOUNT_IDS.coachStorage, 'Alias Coach'));
            expectOk(await community_group_service_1.communityGroupService.leaveGroup(group.id, poc_accounts_1.POC_ACCOUNT_IDS.coach));
            const updated = expectOk(await community_group_service_1.communityGroupService.getGroup(group.id));
            strict_1.default.ok(!updated.members.some((member) => member.parentId === poc_accounts_1.POC_ACCOUNT_IDS.coachStorage));
        });
    });
    (0, node_test_1.describe)('invites and roles', () => {
        (0, node_test_1.it)('invites and accepts into membership', async () => {
            const group = await createGroup({
                name: 'Invite Group',
                creatorId: 'owner_1',
                creatorName: 'Owner',
            });
            const inviteeId = nextId('invitee');
            const invite = expectOk(await community_group_service_1.communityGroupService.inviteToGroup(group.id, 'owner_1', inviteeId, 'Invitee'));
            expectOk(await community_group_service_1.communityGroupService.acceptGroupInvite(invite.id));
            const updated = expectOk(await community_group_service_1.communityGroupService.getGroup(group.id));
            strict_1.default.ok(updated.members.some((member) => member.parentId === inviteeId));
        });
        (0, node_test_1.it)('changes a member role when requester has permission', async () => {
            const group = await createGroup({
                name: 'Roles Group',
                creatorId: 'owner_2',
                creatorName: 'Owner 2',
            });
            const memberId = nextId('member');
            expectOk(await community_group_service_1.communityGroupService.joinGroup(group.id, memberId, 'Member'));
            expectOk(await community_group_service_1.communityGroupService.changeMemberRole({
                groupId: group.id,
                requesterId: 'owner_2',
                memberId,
                newRole: 'MODERATOR',
            }));
            const updated = expectOk(await community_group_service_1.communityGroupService.getGroup(group.id));
            const member = updated.members.find((item) => item.parentId === memberId);
            strict_1.default.equal(member?.role, 'MODERATOR');
        });
        (0, node_test_1.it)('rejects role change when requester is not admin', async () => {
            const group = await createGroup({
                name: 'Unauthorized Change',
                creatorId: 'owner_3',
                creatorName: 'Owner 3',
            });
            const memberId = nextId('member');
            expectOk(await community_group_service_1.communityGroupService.joinGroup(group.id, memberId, 'Member'));
            const result = await community_group_service_1.communityGroupService.changeMemberRole({
                groupId: group.id,
                requesterId: memberId,
                memberId: 'owner_3',
                newRole: 'MODERATOR',
            });
            expectErr(result, 'UNAUTHORIZED');
        });
    });
    (0, node_test_1.describe)('deleteGroup', () => {
        (0, node_test_1.it)('deletes a group and subsequent lookup fails', async () => {
            const group = await createGroup({ name: 'Delete Group' });
            expectOk(await community_group_service_1.communityGroupService.deleteGroup(group.id));
            const groupResult = await community_group_service_1.communityGroupService.getGroup(group.id);
            expectErr(groupResult, 'NOT_FOUND');
        });
    });
});
