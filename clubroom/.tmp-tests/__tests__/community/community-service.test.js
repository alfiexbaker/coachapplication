"use strict";
/**
 * Community Service Tests
 *
 * Unit tests for the community service functionality including
 * parent groups and group messaging.
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
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = __importStar(require("node:test"));
const community_service_1 = require("../../services/community-service");
const legacyCommunityService = {
    ...community_service_1.communityService,
    async getParentGroups(parentId) {
        const result = await community_service_1.communityService.getParentGroups(parentId);
        return result.success ? result.data : [];
    },
    async getPublicGroups() {
        const result = await community_service_1.communityService.getPublicGroups();
        return result.success ? result.data : [];
    },
    async getGroup(groupId) {
        const result = await community_service_1.communityService.getGroup(groupId);
        return result.success ? result.data : undefined;
    },
    async createGroup(params) {
        const result = await community_service_1.communityService.createGroup(params);
        if (!result.success) {
            throw new Error(result.error.message);
        }
        return result.data;
    },
    async getGroupMessages(groupId) {
        const result = await community_service_1.communityService.getGroupMessages(groupId);
        return result.success ? result.data : [];
    },
    async sendGroupMessage(groupId, senderId, senderName, body) {
        const result = await community_service_1.communityService.sendGroupMessage(groupId, senderId, senderName, body);
        if (!result.success) {
            throw new Error(result.error.message);
        }
        return result.data;
    },
    async markMessagesRead(groupId, parentId) {
        const result = await community_service_1.communityService.markMessagesRead(groupId, parentId);
        if (!result.success) {
            throw new Error(result.error.message);
        }
    },
};
(0, node_test_1.describe)('Community Service', () => {
    (0, node_test_1.describe)('Group Management', () => {
        (0, node_test_1.describe)('getParentGroups', () => {
            (0, node_test_1.default)('should return groups for a specific parent', async () => {
                const groups = await legacyCommunityService.getParentGroups('parent1');
                node_assert_1.default.ok(Array.isArray(groups));
                node_assert_1.default.ok(groups.length > 0);
                groups.forEach((group) => {
                    const isMember = group.members.some((m) => m.parentId === 'parent1');
                    node_assert_1.default.strictEqual(isMember, true, 'Parent should be a member of each returned group');
                });
            });
            (0, node_test_1.default)('should return empty array for parent with no groups', async () => {
                const groups = await legacyCommunityService.getParentGroups('non_existent_parent');
                node_assert_1.default.ok(Array.isArray(groups));
                node_assert_1.default.strictEqual(groups.length, 0);
            });
        });
        (0, node_test_1.describe)('getPublicGroups', () => {
            (0, node_test_1.default)('should return only public groups', async () => {
                const groups = await legacyCommunityService.getPublicGroups();
                node_assert_1.default.ok(Array.isArray(groups));
                groups.forEach((group) => {
                    node_assert_1.default.strictEqual(group.isPublic, true, 'All returned groups should be public');
                });
            });
        });
        (0, node_test_1.describe)('getGroup', () => {
            (0, node_test_1.default)('should return group by ID', async () => {
                const groups = await legacyCommunityService.getParentGroups('parent1');
                const firstGroup = groups[0];
                const group = await legacyCommunityService.getGroup(firstGroup.id);
                node_assert_1.default.ok(group);
                node_assert_1.default.strictEqual(group.id, firstGroup.id);
                node_assert_1.default.strictEqual(group.name, firstGroup.name);
            });
            (0, node_test_1.default)('should return undefined for non-existent group', async () => {
                const group = await legacyCommunityService.getGroup('non_existent');
                node_assert_1.default.strictEqual(group, undefined);
            });
        });
        (0, node_test_1.describe)('createGroup', () => {
            (0, node_test_1.default)('should create a new group with required fields', async () => {
                const params = {
                    name: 'Test Group',
                    type: 'GENERAL',
                    memberIds: [],
                    memberNames: [],
                    creatorId: 'test_parent',
                    creatorName: 'Test Parent',
                };
                const group = await legacyCommunityService.createGroup(params);
                node_assert_1.default.ok(group.id.startsWith('group_'));
                node_assert_1.default.strictEqual(group.name, 'Test Group');
                node_assert_1.default.strictEqual(group.type, 'GENERAL');
                node_assert_1.default.strictEqual(group.createdById, 'test_parent');
                node_assert_1.default.strictEqual(group.isPublic, false);
                node_assert_1.default.ok(group.createdAt);
                node_assert_1.default.ok(group.updatedAt);
                // Creator should be added as owner
                node_assert_1.default.strictEqual(group.members.length, 1);
                node_assert_1.default.strictEqual(group.members[0].parentId, 'test_parent');
                node_assert_1.default.strictEqual(group.members[0].role, 'OWNER');
            });
            (0, node_test_1.default)('should create a group with all optional fields', async () => {
                const params = {
                    name: 'Full Group',
                    description: 'A detailed description',
                    type: 'CLUB',
                    memberIds: ['member1', 'member2'],
                    memberNames: ['Member One', 'Member Two'],
                    creatorId: 'test_parent',
                    creatorName: 'Test Parent',
                    isPublic: true,
                    clubId: 'club_1',
                    maxMembers: 50,
                };
                const group = await legacyCommunityService.createGroup(params);
                node_assert_1.default.strictEqual(group.name, 'Full Group');
                node_assert_1.default.strictEqual(group.description, 'A detailed description');
                node_assert_1.default.strictEqual(group.type, 'CLUB');
                node_assert_1.default.strictEqual(group.isPublic, true);
                node_assert_1.default.strictEqual(group.clubId, 'club_1');
                node_assert_1.default.strictEqual(group.maxMembers, 50);
                // Creator + 2 members = 3 total
                node_assert_1.default.strictEqual(group.members.length, 3);
            });
            (0, node_test_1.default)('should support all group types', async () => {
                const types = ['CLUB', 'SESSION', 'GENERAL'];
                for (const type of types) {
                    const params = {
                        name: `${type} Group`,
                        type,
                        memberIds: [],
                        memberNames: [],
                        creatorId: 'test_parent',
                        creatorName: 'Test Parent',
                    };
                    const group = await legacyCommunityService.createGroup(params);
                    node_assert_1.default.strictEqual(group.type, type);
                }
            });
        });
        (0, node_test_1.describe)('joinGroup', () => {
            (0, node_test_1.default)('should allow joining a public group', async () => {
                // Create a public group first
                const createParams = {
                    name: 'Joinable Group',
                    type: 'GENERAL',
                    memberIds: [],
                    memberNames: [],
                    creatorId: 'creator_parent',
                    creatorName: 'Creator Parent',
                    isPublic: true,
                };
                const createdGroup = await legacyCommunityService.createGroup(createParams);
                const result = await legacyCommunityService.joinGroup(createdGroup.id, 'new_parent', 'New Parent');
                node_assert_1.default.strictEqual(result.success, true);
                if (!result.success)
                    return;
                const updatedGroup = result.data;
                node_assert_1.default.strictEqual(updatedGroup.members.length, 2);
                const newMember = updatedGroup.members.find((m) => m.parentId === 'new_parent');
                node_assert_1.default.ok(newMember);
                node_assert_1.default.strictEqual(newMember.role, 'MEMBER');
                node_assert_1.default.ok(newMember.joinedAt);
            });
            (0, node_test_1.default)('should return error when joining private group', async () => {
                // Create a private group
                const createParams = {
                    name: 'Private Group',
                    type: 'GENERAL',
                    memberIds: [],
                    memberNames: [],
                    creatorId: 'creator_parent',
                    creatorName: 'Creator Parent',
                    isPublic: false,
                };
                const createdGroup = await legacyCommunityService.createGroup(createParams);
                const result = await legacyCommunityService.joinGroup(createdGroup.id, 'new_parent', 'New Parent');
                node_assert_1.default.strictEqual(result.success, false);
                if (result.success)
                    return;
                node_assert_1.default.strictEqual(result.error.message, 'Cannot join private group without invitation');
            });
            (0, node_test_1.default)('should return error when already a member', async () => {
                const groups = await legacyCommunityService.getParentGroups('parent1');
                const group = groups.find((g) => g.isPublic);
                if (group) {
                    const result = await legacyCommunityService.joinGroup(group.id, 'parent1', 'John Henderson');
                    node_assert_1.default.strictEqual(result.success, false);
                    if (result.success)
                        return;
                    node_assert_1.default.strictEqual(result.error.message, 'Already a member of this group');
                }
            });
        });
        (0, node_test_1.describe)('leaveGroup', () => {
            (0, node_test_1.default)('should allow member to leave group', async () => {
                // Create a group with multiple members
                const createParams = {
                    name: 'Leave Test Group',
                    type: 'GENERAL',
                    memberIds: ['member_to_leave'],
                    memberNames: ['Member To Leave'],
                    creatorId: 'admin_parent',
                    creatorName: 'Admin Parent',
                    isPublic: true,
                };
                const createdGroup = await legacyCommunityService.createGroup(createParams);
                node_assert_1.default.strictEqual(createdGroup.members.length, 2);
                const leaveResult = await legacyCommunityService.leaveGroup(createdGroup.id, 'member_to_leave');
                node_assert_1.default.strictEqual(leaveResult.success, true);
                const updatedGroup = await legacyCommunityService.getGroup(createdGroup.id);
                node_assert_1.default.ok(updatedGroup);
                node_assert_1.default.strictEqual(updatedGroup.members.length, 1);
                node_assert_1.default.ok(!updatedGroup.members.find((m) => m.parentId === 'member_to_leave'));
            });
            (0, node_test_1.default)('should return error when only admin tries to leave with other members', async () => {
                // Create a group where creator is only admin
                const createParams = {
                    name: 'Admin Leave Test',
                    type: 'GENERAL',
                    memberIds: ['regular_member'],
                    memberNames: ['Regular Member'],
                    creatorId: 'only_admin',
                    creatorName: 'Only Admin',
                    isPublic: true,
                };
                const createdGroup = await legacyCommunityService.createGroup(createParams);
                const result = await legacyCommunityService.leaveGroup(createdGroup.id, 'only_admin');
                node_assert_1.default.strictEqual(result.success, false);
                if (result.success)
                    return;
                node_assert_1.default.strictEqual(result.error.message, 'Cannot leave group as the only admin. Promote another member first.');
            });
            (0, node_test_1.default)('should return error for non-member', async () => {
                const groups = await legacyCommunityService.getParentGroups('parent1');
                const group = groups[0];
                const result = await legacyCommunityService.leaveGroup(group.id, 'non_member');
                node_assert_1.default.strictEqual(result.success, false);
                if (result.success)
                    return;
                node_assert_1.default.ok(result.error.message);
            });
        });
    });
    (0, node_test_1.describe)('Group Messaging', () => {
        (0, node_test_1.describe)('getGroupMessages', () => {
            (0, node_test_1.default)('should return messages for a group', async () => {
                const groups = await legacyCommunityService.getParentGroups('parent1');
                const group = groups[0];
                const messages = await legacyCommunityService.getGroupMessages(group.id);
                node_assert_1.default.ok(Array.isArray(messages));
            });
            (0, node_test_1.default)('should return messages sorted by time', async () => {
                const groups = await legacyCommunityService.getParentGroups('parent1');
                const group = groups[0];
                const messages = await legacyCommunityService.getGroupMessages(group.id);
                for (let i = 1; i < messages.length; i++) {
                    const prevTime = new Date(messages[i - 1].createdAt).getTime();
                    const currTime = new Date(messages[i].createdAt).getTime();
                    node_assert_1.default.ok(prevTime <= currTime, 'Messages should be sorted chronologically');
                }
            });
        });
        (0, node_test_1.describe)('sendGroupMessage', () => {
            (0, node_test_1.default)('should send a message to a group', async () => {
                const groups = await legacyCommunityService.getParentGroups('parent1');
                const group = groups[0];
                const message = await legacyCommunityService.sendGroupMessage(group.id, 'parent1', 'John Henderson', 'Hello, world!');
                node_assert_1.default.ok(message.id.startsWith('gmsg_'));
                node_assert_1.default.strictEqual(message.groupId, group.id);
                node_assert_1.default.strictEqual(message.senderId, 'parent1');
                node_assert_1.default.strictEqual(message.body, 'Hello, world!');
                node_assert_1.default.strictEqual(message.status, 'sent');
                node_assert_1.default.ok(message.createdAt);
                node_assert_1.default.ok(message.readBy.includes('parent1'));
            });
            (0, node_test_1.default)('should update group last message info', async () => {
                const groups = await legacyCommunityService.getParentGroups('parent1');
                const group = groups[0];
                const messageBody = 'Test message for update';
                await legacyCommunityService.sendGroupMessage(group.id, 'parent1', 'John', messageBody);
                const updatedGroup = await legacyCommunityService.getGroup(group.id);
                node_assert_1.default.ok(updatedGroup);
                node_assert_1.default.ok(updatedGroup.lastMessageAt);
                node_assert_1.default.ok(updatedGroup.lastMessagePreview?.includes('Test message'));
            });
        });
        (0, node_test_1.describe)('markMessagesRead', () => {
            (0, node_test_1.default)('should mark messages as read for a parent', async () => {
                const groups = await legacyCommunityService.getParentGroups('parent1');
                const group = groups[0];
                // Send a message first
                await legacyCommunityService.sendGroupMessage(group.id, 'parent1', 'John', 'Read test message');
                await legacyCommunityService.markMessagesRead(group.id, 'parent2');
                const messages = await legacyCommunityService.getGroupMessages(group.id);
                const latestMessage = messages[messages.length - 1];
                node_assert_1.default.ok(latestMessage.readBy.includes('parent2'));
            });
        });
    });
});
