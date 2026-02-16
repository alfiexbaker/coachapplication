"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const community_messaging_service_1 = require("@/services/community/community-messaging-service");
function expectOk(result) {
    strict_1.default.equal(result.success, true);
    return result.data;
}
let seq = 0;
function nextId(prefix) {
    seq += 1;
    return `${prefix}_${seq}`;
}
(0, node_test_1.describe)('CommunityMessagingService', () => {
    (0, node_test_1.beforeEach)(async () => {
        seq = 0;
        community_messaging_service_1.communityMessagingService.inMemoryMessages = {};
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.GROUP_MESSAGES, {});
    });
    (0, node_test_1.describe)('getGroupMessages', () => {
        (0, node_test_1.it)('returns an empty array when group has no messages', async () => {
            const groupId = nextId('group');
            const messages = expectOk(await community_messaging_service_1.communityMessagingService.getGroupMessages(groupId));
            strict_1.default.deepEqual(messages, []);
        });
    });
    (0, node_test_1.describe)('sendGroupMessage', () => {
        (0, node_test_1.it)('creates a message and persists it', async () => {
            const groupId = nextId('group');
            const senderId = nextId('parent');
            const message = expectOk(await community_messaging_service_1.communityMessagingService.sendGroupMessage(groupId, senderId, 'Sender Name', 'Hello world'));
            strict_1.default.ok(message.id);
            strict_1.default.equal(message.groupId, groupId);
            strict_1.default.equal(message.senderId, senderId);
            strict_1.default.equal(message.body, 'Hello world');
            strict_1.default.ok(message.readBy.includes(senderId));
            const stored = expectOk(await community_messaging_service_1.communityMessagingService.getGroupMessages(groupId));
            strict_1.default.equal(stored.length, 1);
            strict_1.default.equal(stored[0].body, 'Hello world');
        });
    });
    (0, node_test_1.describe)('markMessagesRead', () => {
        (0, node_test_1.it)('marks all group messages as read by the reader without duplication', async () => {
            const groupId = nextId('group');
            const readerId = nextId('reader');
            expectOk(await community_messaging_service_1.communityMessagingService.sendGroupMessage(groupId, 'parent_a', 'A', 'Message 1'));
            expectOk(await community_messaging_service_1.communityMessagingService.sendGroupMessage(groupId, 'parent_b', 'B', 'Message 2'));
            expectOk(await community_messaging_service_1.communityMessagingService.markMessagesRead(groupId, readerId));
            expectOk(await community_messaging_service_1.communityMessagingService.markMessagesRead(groupId, readerId));
            const messages = expectOk(await community_messaging_service_1.communityMessagingService.getGroupMessages(groupId));
            strict_1.default.equal(messages.length, 2);
            strict_1.default.ok(messages.every((message) => message.readBy.includes(readerId)));
            strict_1.default.ok(messages.every((message) => message.readBy.filter((id) => id === readerId).length === 1));
        });
    });
    (0, node_test_1.describe)('ordering', () => {
        (0, node_test_1.it)('returns messages in chronological order', async () => {
            const groupId = nextId('group');
            expectOk(await community_messaging_service_1.communityMessagingService.sendGroupMessage(groupId, 'parent_1', 'Parent 1', 'First'));
            await new Promise((resolve) => setTimeout(resolve, 10));
            expectOk(await community_messaging_service_1.communityMessagingService.sendGroupMessage(groupId, 'parent_2', 'Parent 2', 'Second'));
            const messages = expectOk(await community_messaging_service_1.communityMessagingService.getGroupMessages(groupId));
            strict_1.default.equal(messages.length, 2);
            strict_1.default.ok(new Date(messages[0].createdAt).getTime() <= new Date(messages[1].createdAt).getTime());
        });
    });
});
