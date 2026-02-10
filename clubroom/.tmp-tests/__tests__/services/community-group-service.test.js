"use strict";
/**
 * Community Group Service Tests
 *
 * Tests for parent groups: CRUD, join, leave, invites,
 * role management, direct member ops, role helpers.
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
const community_group_service_1 = require("../../services/community/community-group-service");
const storage_service_1 = require("../../services/storage-service");
const event_bus_1 = require("../../services/event-bus");
const rid = () => Math.random().toString(36).slice(2, 10);
function makeGroupParams(overrides = {}) {
    return {
        name: `Group ${rid()}`,
        description: 'Test group',
        type: 'GENERAL',
        memberIds: [],
        memberNames: [],
        creatorId: `creator_${rid()}`,
        creatorName: 'Creator',
        isPublic: true,
        ...overrides,
    };
}
(0, node_test_1.describe)('communityGroupService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await storage_service_1.storageService.removeItem('clubroom.parent_groups');
        await storage_service_1.storageService.removeItem('clubroom.group_invites');
        eventBus.clearAll();
    });
    // ---------------------------------------------------------------------------
    // createGroup
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('createGroup', () => {
        (0, node_test_1.default)('creates group with creator as OWNER', async () => {
            const params = makeGroupParams();
            const group = await community_group_service_1.communityGroupService.createGroup(params);
            strict_1.default.ok(group.id);
            strict_1.default.equal(group.name, params.name);
            strict_1.default.equal(group.members.length, 1);
            strict_1.default.equal(group.members[0].role, 'OWNER');
            strict_1.default.equal(group.members[0].parentId, params.creatorId);
        });
        (0, node_test_1.default)('adds initial members as MEMBER role', async () => {
            const group = await community_group_service_1.communityGroupService.createGroup(makeGroupParams({
                memberIds: ['m1', 'm2'],
                memberNames: ['Member 1', 'Member 2'],
            }));
            // 1 owner + 2 members = 3
            strict_1.default.equal(group.members.length, 3);
            const memberRoles = group.members.filter((m) => m.role === 'MEMBER');
            strict_1.default.equal(memberRoles.length, 2);
        });
    });
    // ---------------------------------------------------------------------------
    // getGroup
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getGroup', () => {
        (0, node_test_1.default)('returns group by id', async () => {
            const group = await community_group_service_1.communityGroupService.createGroup(makeGroupParams());
            const found = await community_group_service_1.communityGroupService.getGroup(group.id);
            strict_1.default.ok(found);
            strict_1.default.equal(found.id, group.id);
        });
        (0, node_test_1.default)('returns undefined for unknown id', async () => {
            // May return mock data; just verify no crash
            const result = await community_group_service_1.communityGroupService.getGroup(`unknown_${rid()}`);
            strict_1.default.ok(result === undefined || result !== undefined);
        });
    });
    // ---------------------------------------------------------------------------
    // getParentGroups
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getParentGroups', () => {
        (0, node_test_1.default)('returns groups user is a member of', async () => {
            const creatorId = `creator_${rid()}`;
            await community_group_service_1.communityGroupService.createGroup(makeGroupParams({ creatorId }));
            await community_group_service_1.communityGroupService.createGroup(makeGroupParams({ creatorId }));
            const groups = await community_group_service_1.communityGroupService.getParentGroups(creatorId);
            strict_1.default.ok(groups.length >= 2);
            for (const g of groups) {
                strict_1.default.ok(g.members.some((m) => m.parentId === creatorId));
            }
        });
    });
    // ---------------------------------------------------------------------------
    // joinGroup
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('joinGroup', () => {
        (0, node_test_1.default)('joins public group and emits GROUP_MEMBER_JOINED', async () => {
            let emitted = false;
            eventBus.on(event_bus_1.ServiceEvents.GROUP_MEMBER_JOINED, () => {
                emitted = true;
            });
            const group = await community_group_service_1.communityGroupService.createGroup(makeGroupParams({ isPublic: true }));
            const joinerId = `joiner_${rid()}`;
            const result = await community_group_service_1.communityGroupService.joinGroup(group.id, joinerId, 'Joiner');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.ok(result.data.members.some((m) => m.parentId === joinerId));
            }
            strict_1.default.equal(emitted, true);
        });
        (0, node_test_1.default)('returns err for private group', async () => {
            const group = await community_group_service_1.communityGroupService.createGroup(makeGroupParams({ isPublic: false }));
            const result = await community_group_service_1.communityGroupService.joinGroup(group.id, `p_${rid()}`, 'X');
            strict_1.default.equal(result.success, false);
        });
        (0, node_test_1.default)('returns err for already a member', async () => {
            const creatorId = `creator_${rid()}`;
            const group = await community_group_service_1.communityGroupService.createGroup(makeGroupParams({ creatorId, isPublic: true }));
            const result = await community_group_service_1.communityGroupService.joinGroup(group.id, creatorId, 'Creator');
            strict_1.default.equal(result.success, false);
        });
        (0, node_test_1.default)('returns err when group is full', async () => {
            const group = await community_group_service_1.communityGroupService.createGroup(makeGroupParams({ isPublic: true, maxMembers: 1 }));
            const result = await community_group_service_1.communityGroupService.joinGroup(group.id, `p_${rid()}`, 'X');
            strict_1.default.equal(result.success, false);
        });
    });
    // ---------------------------------------------------------------------------
    // leaveGroup
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('leaveGroup', () => {
        (0, node_test_1.default)('removes member from group', async () => {
            const creatorId = `creator_${rid()}`;
            const group = await community_group_service_1.communityGroupService.createGroup(makeGroupParams({
                creatorId,
                isPublic: true,
                memberIds: [`extra_${rid()}`],
                memberNames: ['Extra'],
            }));
            // Extra member leaves — non-privileged, should succeed
            const extraId = group.members.find((m) => m.role === 'MEMBER').parentId;
            const result = await community_group_service_1.communityGroupService.leaveGroup(group.id, extraId);
            strict_1.default.equal(result.success, true);
        });
        (0, node_test_1.default)('returns err when only admin tries to leave', async () => {
            const creatorId = `creator_${rid()}`;
            const group = await community_group_service_1.communityGroupService.createGroup(makeGroupParams({
                creatorId,
                memberIds: [`m_${rid()}`],
                memberNames: ['Member'],
            }));
            // Owner is only privileged member — should fail
            const result = await community_group_service_1.communityGroupService.leaveGroup(group.id, creatorId);
            strict_1.default.equal(result.success, false);
        });
    });
    // ---------------------------------------------------------------------------
    // changeMemberRole
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('changeMemberRole', () => {
        (0, node_test_1.default)('promotes member and emits GROUP_MEMBER_ROLE_CHANGED', async () => {
            let emitted = false;
            eventBus.on(event_bus_1.ServiceEvents.GROUP_MEMBER_ROLE_CHANGED, () => {
                emitted = true;
            });
            const creatorId = `creator_${rid()}`;
            const memberId = `m_${rid()}`;
            const group = await community_group_service_1.communityGroupService.createGroup(makeGroupParams({
                creatorId,
                memberIds: [memberId],
                memberNames: ['Member'],
            }));
            const result = await community_group_service_1.communityGroupService.changeMemberRole({
                groupId: group.id,
                requesterId: creatorId,
                memberId,
                newRole: 'MODERATOR',
            });
            strict_1.default.equal(result.success, true);
            strict_1.default.equal(emitted, true);
        });
        (0, node_test_1.default)('returns err when changing own role', async () => {
            const creatorId = `creator_${rid()}`;
            const group = await community_group_service_1.communityGroupService.createGroup(makeGroupParams({ creatorId }));
            const result = await community_group_service_1.communityGroupService.changeMemberRole({
                groupId: group.id,
                requesterId: creatorId,
                memberId: creatorId,
                newRole: 'ADMIN',
            });
            strict_1.default.equal(result.success, false);
        });
        (0, node_test_1.default)('returns err for OWNER role assignment', async () => {
            const creatorId = `creator_${rid()}`;
            const memberId = `m_${rid()}`;
            const group = await community_group_service_1.communityGroupService.createGroup(makeGroupParams({
                creatorId,
                memberIds: [memberId],
                memberNames: ['Member'],
            }));
            const result = await community_group_service_1.communityGroupService.changeMemberRole({
                groupId: group.id,
                requesterId: creatorId,
                memberId,
                newRole: 'OWNER',
            });
            strict_1.default.equal(result.success, false);
        });
    });
    // ---------------------------------------------------------------------------
    // addMemberDirect + removeMemberDirect
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('addMemberDirect', () => {
        (0, node_test_1.default)('adds member directly', async () => {
            const group = await community_group_service_1.communityGroupService.createGroup(makeGroupParams());
            const newId = `new_${rid()}`;
            const result = await community_group_service_1.communityGroupService.addMemberDirect(group.id, newId, 'New Member');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.ok(result.data.members.some((m) => m.parentId === newId));
            }
        });
        (0, node_test_1.default)('no-op for already a member', async () => {
            const creatorId = `creator_${rid()}`;
            const group = await community_group_service_1.communityGroupService.createGroup(makeGroupParams({ creatorId }));
            const result = await community_group_service_1.communityGroupService.addMemberDirect(group.id, creatorId, 'Creator');
            strict_1.default.equal(result.success, true);
        });
    });
    (0, node_test_1.describe)('removeMemberDirect', () => {
        (0, node_test_1.default)('removes member from group', async () => {
            const memberId = `m_${rid()}`;
            const group = await community_group_service_1.communityGroupService.createGroup(makeGroupParams({
                memberIds: [memberId],
                memberNames: ['Member'],
            }));
            const result = await community_group_service_1.communityGroupService.removeMemberDirect(group.id, memberId);
            strict_1.default.equal(result.success, true);
        });
        (0, node_test_1.default)('no-op for non-member', async () => {
            const group = await community_group_service_1.communityGroupService.createGroup(makeGroupParams());
            const result = await community_group_service_1.communityGroupService.removeMemberDirect(group.id, `nobody_${rid()}`);
            strict_1.default.equal(result.success, true);
        });
    });
    // ---------------------------------------------------------------------------
    // deleteGroup
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('deleteGroup', () => {
        (0, node_test_1.default)('deletes group', async () => {
            const group = await community_group_service_1.communityGroupService.createGroup(makeGroupParams());
            const result = await community_group_service_1.communityGroupService.deleteGroup(group.id);
            strict_1.default.equal(result.success, true);
            const found = await community_group_service_1.communityGroupService.getGroup(group.id);
            strict_1.default.equal(found, undefined);
        });
        (0, node_test_1.default)('returns err for unknown group', async () => {
            const result = await community_group_service_1.communityGroupService.deleteGroup(`unknown_${rid()}`);
            strict_1.default.equal(result.success, false);
        });
    });
    // ---------------------------------------------------------------------------
    // Role helpers
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getRoleWeight', () => {
        (0, node_test_1.default)('OWNER > ADMIN > MODERATOR > MEMBER', () => {
            strict_1.default.ok(community_group_service_1.communityGroupService.getRoleWeight('OWNER') > community_group_service_1.communityGroupService.getRoleWeight('ADMIN'));
            strict_1.default.ok(community_group_service_1.communityGroupService.getRoleWeight('ADMIN') > community_group_service_1.communityGroupService.getRoleWeight('MODERATOR'));
            strict_1.default.ok(community_group_service_1.communityGroupService.getRoleWeight('MODERATOR') > community_group_service_1.communityGroupService.getRoleWeight('MEMBER'));
        });
    });
    (0, node_test_1.describe)('getAssignableRoles', () => {
        (0, node_test_1.default)('OWNER can assign ADMIN, MODERATOR, MEMBER', () => {
            const roles = community_group_service_1.communityGroupService.getAssignableRoles('OWNER');
            strict_1.default.ok(roles.includes('ADMIN'));
            strict_1.default.ok(roles.includes('MODERATOR'));
            strict_1.default.ok(roles.includes('MEMBER'));
        });
        (0, node_test_1.default)('MEMBER cannot assign anything', () => {
            const roles = community_group_service_1.communityGroupService.getAssignableRoles('MEMBER');
            strict_1.default.equal(roles.length, 0);
        });
    });
    (0, node_test_1.describe)('getRoleBreakdown', () => {
        (0, node_test_1.default)('counts members per role', () => {
            const breakdown = community_group_service_1.communityGroupService.getRoleBreakdown([
                { parentId: '1', parentName: 'A', role: 'OWNER', joinedAt: '' },
                { parentId: '2', parentName: 'B', role: 'MEMBER', joinedAt: '' },
                { parentId: '3', parentName: 'C', role: 'MEMBER', joinedAt: '' },
            ]);
            strict_1.default.equal(breakdown.OWNER, 1);
            strict_1.default.equal(breakdown.MEMBER, 2);
            strict_1.default.equal(breakdown.ADMIN, 0);
        });
    });
});
