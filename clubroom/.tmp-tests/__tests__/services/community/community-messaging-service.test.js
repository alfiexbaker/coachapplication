"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const community_messaging_service_1 = require("@/services/community/community-messaging-service");
const storage_service_1 = require("@/services/storage-service");
const storage_keys_1 = require("@/constants/storage-keys");
(0, node_test_1.describe)('CommunityMessagingService', () => {
    (0, node_test_1.beforeEach)(async () => {
        // Clear storage using storageService
        await storage_service_1.storageService.removeItem(storage_keys_1.STORAGE_KEYS.GROUP_MESSAGES);
    });
    (0, node_test_1.describe)('getGroupMessages', () => {
        (0, node_test_1.it)('should return empty array for group with no messages', async () => {
            const messages = await community_messaging_service_1.communityMessagingService.getGroupMessages('group-' + Math.random().toString(36).slice(2));
            strict_1.default.ok(Array.isArray(messages));
            strict_1.default.equal(messages.length, 0);
        });
        (0, node_test_1.it)('should return messages for group', async () => {
            const groupId = 'group-' + Math.random().toString(36).slice(2);
            await community_messaging_service_1.communityMessagingService.sendGroupMessage({
                groupId,
                senderId: 'parent1',
                senderName: 'Test Parent',
                message: 'Hello world',
            });
            const messages = await community_messaging_service_1.communityMessagingService.getGroupMessages(groupId);
            strict_1.default.ok(Array.isArray(messages));
            strict_1.default.ok(messages.length > 0);
            strict_1.default.equal(messages[0].groupId, groupId);
        });
    });
    (0, node_test_1.describe)('sendGroupMessage', () => {
        (0, node_test_1.it)('should create new message', async () => {
            const params = {
                groupId: 'group-' + Math.random().toString(36).slice(2),
                senderId: 'parent-' + Math.random().toString(36).slice(2),
                senderName: 'Test Sender',
                message: 'Test message',
            };
            const message = await community_messaging_service_1.communityMessagingService.sendGroupMessage(params);
            strict_1.default.ok(message);
            strict_1.default.ok(message.id);
            strict_1.default.equal(message.groupId, params.groupId);
            strict_1.default.equal(message.senderId, params.senderId);
            strict_1.default.equal(message.message, params.message);
            strict_1.default.ok(Array.isArray(message.readBy));
        });
        (0, node_test_1.it)('should set timestamp to current time', async () => {
            const before = new Date();
            const message = await community_messaging_service_1.communityMessagingService.sendGroupMessage({
                groupId: 'group1',
                senderId: 'parent1',
                senderName: 'Sender',
                message: 'Test',
            });
            const after = new Date();
            const messageTime = new Date(message.timestamp);
            strict_1.default.ok(messageTime >= before);
            strict_1.default.ok(messageTime <= after);
        });
        (0, node_test_1.it)('should mark sender as having read the message', async () => {
            const senderId = 'parent-' + Math.random().toString(36).slice(2);
            const message = await community_messaging_service_1.communityMessagingService.sendGroupMessage({
                groupId: 'group1',
                senderId,
                senderName: 'Sender',
                message: 'Test',
            });
            strict_1.default.ok(message.readBy.includes(senderId));
        });
        (0, node_test_1.it)('should persist message to storage', async () => {
            const groupId = 'group-' + Math.random().toString(36).slice(2);
            await community_messaging_service_1.communityMessagingService.sendGroupMessage({
                groupId,
                senderId: 'parent1',
                senderName: 'Sender',
                message: 'Test message',
            });
            const messages = await community_messaging_service_1.communityMessagingService.getGroupMessages(groupId);
            strict_1.default.equal(messages.length, 1);
            strict_1.default.equal(messages[0].message, 'Test message');
        });
    });
    (0, node_test_1.describe)('markMessagesRead', () => {
        (0, node_test_1.it)('should add parent to readBy array', async () => {
            const groupId = 'group-' + Math.random().toString(36).slice(2);
            const readerId = 'parent-' + Math.random().toString(36).slice(2);
            await community_messaging_service_1.communityMessagingService.sendGroupMessage({
                groupId,
                senderId: 'parent1',
                senderName: 'Sender',
                message: 'Test message',
            });
            await community_messaging_service_1.communityMessagingService.markMessagesRead(groupId, readerId);
            const messages = await community_messaging_service_1.communityMessagingService.getGroupMessages(groupId);
            strict_1.default.ok(messages[0].readBy.includes(readerId));
        });
        (0, node_test_1.it)('should mark all messages in group as read', async () => {
            const groupId = 'group-' + Math.random().toString(36).slice(2);
            const readerId = 'parent-' + Math.random().toString(36).slice(2);
            await community_messaging_service_1.communityMessagingService.sendGroupMessage({
                groupId,
                senderId: 'parent1',
                senderName: 'Sender',
                message: 'Message 1',
            });
            await community_messaging_service_1.communityMessagingService.sendGroupMessage({
                groupId,
                senderId: 'parent2',
                senderName: 'Sender 2',
                message: 'Message 2',
            });
            await community_messaging_service_1.communityMessagingService.markMessagesRead(groupId, readerId);
            const messages = await community_messaging_service_1.communityMessagingService.getGroupMessages(groupId);
            strict_1.default.equal(messages.length, 2);
            strict_1.default.ok(messages.every((m) => m.readBy.includes(readerId)));
        });
        (0, node_test_1.it)('should not duplicate readBy entries', async () => {
            const groupId = 'group-' + Math.random().toString(36).slice(2);
            const readerId = 'parent-' + Math.random().toString(36).slice(2);
            await community_messaging_service_1.communityMessagingService.sendGroupMessage({
                groupId,
                senderId: 'parent1',
                senderName: 'Sender',
                message: 'Test',
            });
            await community_messaging_service_1.communityMessagingService.markMessagesRead(groupId, readerId);
            await community_messaging_service_1.communityMessagingService.markMessagesRead(groupId, readerId);
            const messages = await community_messaging_service_1.communityMessagingService.getGroupMessages(groupId);
            const readCount = messages[0].readBy.filter((id) => id === readerId).length;
            strict_1.default.equal(readCount, 1);
        });
        (0, node_test_1.it)('should handle empty group gracefully', async () => {
            await community_messaging_service_1.communityMessagingService.markMessagesRead('group-nonexistent', 'parent1');
            // Test passes if no error thrown
            strict_1.default.ok(true);
        });
    });
    (0, node_test_1.describe)('message ordering', () => {
        (0, node_test_1.it)('should return messages in chronological order', async () => {
            const groupId = 'group-' + Math.random().toString(36).slice(2);
            await community_messaging_service_1.communityMessagingService.sendGroupMessage({
                groupId,
                senderId: 'parent1',
                senderName: 'Sender 1',
                message: 'First message',
            });
            // Small delay to ensure different timestamps
            await new Promise((resolve) => setTimeout(resolve, 10));
            await community_messaging_service_1.communityMessagingService.sendGroupMessage({
                groupId,
                senderId: 'parent2',
                senderName: 'Sender 2',
                message: 'Second message',
            });
            const messages = await community_messaging_service_1.communityMessagingService.getGroupMessages(groupId);
            strict_1.default.equal(messages.length, 2);
            const time1 = new Date(messages[0].timestamp).getTime();
            const time2 = new Date(messages[1].timestamp).getTime();
            strict_1.default.ok(time1 <= time2);
        });
    });
});
