"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const messaging_service_1 = require("@/services/messaging-service");
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
(0, node_test_1.describe)('MessagingService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.MESSAGES);
    });
    (0, node_test_1.describe)('listThreads', () => {
        (0, node_test_1.it)('should return list of chat threads', async () => {
            const threads = await messaging_service_1.messagingService.listThreads();
            strict_1.default.ok(Array.isArray(threads));
        });
    });
    (0, node_test_1.describe)('getThread', () => {
        (0, node_test_1.it)('should return thread when found', async () => {
            const threads = await messaging_service_1.messagingService.listThreads();
            if (threads.length > 0) {
                const thread = await messaging_service_1.messagingService.getThread(threads[0].id);
                strict_1.default.ok(thread);
                strict_1.default.equal(thread?.id, threads[0].id);
            }
        });
        (0, node_test_1.it)('should return undefined for non-existent thread', async () => {
            const thread = await messaging_service_1.messagingService.getThread('non-existent-thread');
            strict_1.default.equal(thread, undefined);
        });
    });
    (0, node_test_1.describe)('listMessages', () => {
        (0, node_test_1.it)('should return empty array for thread with no messages', async () => {
            const threadId = 'test-thread-' + Math.random().toString(36).slice(2);
            const messages = await messaging_service_1.messagingService.listMessages(threadId);
            strict_1.default.ok(Array.isArray(messages));
            strict_1.default.equal(messages.length, 0);
        });
        (0, node_test_1.it)('should return messages sorted by createdAt', async () => {
            const threadId = 'test-thread-' + Math.random().toString(36).slice(2);
            const now = new Date();
            const messages = [
                {
                    id: 'test-msg-2-' + Math.random().toString(36).slice(2),
                    threadId,
                    sender: 'coach',
                    body: 'Second message',
                    createdAt: new Date(now.getTime() + 1000).toISOString(),
                    status: 'sent',
                },
                {
                    id: 'test-msg-1-' + Math.random().toString(36).slice(2),
                    threadId,
                    sender: 'parent',
                    body: 'First message',
                    createdAt: now.toISOString(),
                    status: 'sent',
                },
            ];
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.MESSAGES, { [threadId]: messages });
            const result = await messaging_service_1.messagingService.listMessages(threadId);
            strict_1.default.equal(result.length, 2);
            strict_1.default.ok(new Date(result[0].createdAt) <= new Date(result[1].createdAt));
        });
    });
    (0, node_test_1.describe)('sendMessage', () => {
        (0, node_test_1.it)('should create and persist new message', async () => {
            const threadId = 'test-thread-' + Math.random().toString(36).slice(2);
            const body = 'Test message';
            const message = await messaging_service_1.messagingService.sendMessage(threadId, body, 'parent', 'Test Parent');
            strict_1.default.ok(message.id);
            strict_1.default.equal(message.threadId, threadId);
            strict_1.default.equal(message.body, body);
            strict_1.default.equal(message.sender, 'parent');
            strict_1.default.equal(message.status, 'pending');
        });
        (0, node_test_1.it)('should include optional senderName', async () => {
            const threadId = 'test-thread-' + Math.random().toString(36).slice(2);
            const senderName = 'John Doe';
            const message = await messaging_service_1.messagingService.sendMessage(threadId, 'Test message', 'parent', senderName);
            strict_1.default.equal(message.senderName, senderName);
        });
        (0, node_test_1.it)('should include attachments when provided', async () => {
            const threadId = 'test-thread-' + Math.random().toString(36).slice(2);
            const attachments = [
                {
                    type: 'IMAGE',
                    url: 'https://example.com/image.jpg',
                    filename: 'image.jpg',
                    size: 12345,
                },
            ];
            const message = await messaging_service_1.messagingService.sendMessage(threadId, 'Message with attachment', 'coach', 'Test Coach', attachments);
            strict_1.default.ok(message.attachments);
            strict_1.default.equal(message.attachments.length, 1);
            strict_1.default.equal(message.attachments[0].type, 'IMAGE');
        });
    });
    (0, node_test_1.describe)('simulateIncoming', () => {
        (0, node_test_1.it)('should create incoming message from coach', async () => {
            const threadId = 'test-thread-' + Math.random().toString(36).slice(2);
            const message = await messaging_service_1.messagingService.simulateIncoming(threadId, 'Incoming message', 'Test Coach');
            strict_1.default.ok(message.id);
            strict_1.default.equal(message.sender, 'coach');
            strict_1.default.equal(message.status, 'delivered');
        });
    });
    (0, node_test_1.describe)('markThreadRead', () => {
        (0, node_test_1.it)('should update thread unread count to zero', async () => {
            const threads = await messaging_service_1.messagingService.listThreads();
            if (threads.length > 0) {
                const thread = await messaging_service_1.messagingService.markThreadRead(threads[0].id);
                if (thread) {
                    strict_1.default.equal(thread.unreadCount, 0);
                }
            }
        });
        (0, node_test_1.it)('should return thread after marking as read', async () => {
            const threads = await messaging_service_1.messagingService.listThreads();
            if (threads.length > 0) {
                const result = await messaging_service_1.messagingService.markThreadRead(threads[0].id);
                strict_1.default.ok(result);
            }
        });
    });
    (0, node_test_1.describe)('deleteMessage', () => {
        (0, node_test_1.it)('should remove message from thread', async () => {
            const threadId = 'test-thread-' + Math.random().toString(36).slice(2);
            const message = await messaging_service_1.messagingService.sendMessage(threadId, 'Test message', 'parent');
            await messaging_service_1.messagingService.deleteMessage(threadId, message.id);
            const messages = await messaging_service_1.messagingService.listMessages(threadId);
            const deleted = messages.find((m) => m.id === message.id);
            strict_1.default.equal(deleted, undefined);
        });
        (0, node_test_1.it)('should handle deleting non-existent message gracefully', async () => {
            const threadId = 'test-thread-' + Math.random().toString(36).slice(2);
            await messaging_service_1.messagingService.deleteMessage(threadId, 'non-existent-message');
            // Should not throw
            const messages = await messaging_service_1.messagingService.listMessages(threadId);
            strict_1.default.ok(Array.isArray(messages));
        });
    });
});
