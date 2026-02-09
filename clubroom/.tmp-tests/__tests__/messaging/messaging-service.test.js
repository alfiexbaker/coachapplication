"use strict";
/**
 * Messaging Service Tests
 *
 * Unit tests for the messaging service functionality including
 * thread management, message sending, status updates, and notifications.
 *
 * These tests verify the core messaging functionality:
 * - List and get threads
 * - Send messages with attachments
 * - Message status progression (pending -> sent -> delivered -> seen)
 * - Mark threads as read
 * - Delete messages
 * - Incoming message simulation
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
// Mock storage
let mockThreads = [];
let mockMessages = {};
let mockNotifications = [];
let messageIdCounter = 0; // Counter for unique message IDs
// Mock MessagingService for testing
class MockMessagingService {
    async listThreads() {
        return [...mockThreads];
    }
    async getThread(threadId) {
        return mockThreads.find((t) => t.id === threadId);
    }
    async listMessages(threadId) {
        const messages = mockMessages[threadId] || [];
        return messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    async sendMessage(threadId, body, sender, senderName, attachments = []) {
        const timestamp = new Date().toISOString();
        messageIdCounter++;
        const newMessage = {
            id: `msg_${messageIdCounter}`,
            threadId,
            sender,
            senderName,
            body,
            createdAt: timestamp,
            status: 'pending',
            attachments,
        };
        // Persist message
        if (!mockMessages[threadId]) {
            mockMessages[threadId] = [];
        }
        mockMessages[threadId].push(newMessage);
        // Update thread's last message
        const thread = mockThreads.find((t) => t.id === threadId);
        if (thread) {
            thread.lastMessage = body;
            thread.lastMessageTime = timestamp;
        }
        // Create notification
        if (sender === 'parent') {
            mockNotifications.push({
                type: 'message_to_coach',
                threadId,
                senderName: senderName || 'Parent',
            });
        }
        else {
            mockNotifications.push({
                type: 'message_to_parent',
                threadId,
                senderName: senderName || 'Coach',
            });
        }
        return newMessage;
    }
    async updateMessageStatus(threadId, messageId, status) {
        const messages = mockMessages[threadId];
        if (messages) {
            const message = messages.find((m) => m.id === messageId);
            if (message) {
                message.status = status;
            }
        }
    }
    async simulateIncoming(threadId, body, senderName) {
        const timestamp = new Date().toISOString();
        messageIdCounter++;
        const incoming = {
            id: `msg_${messageIdCounter}_coach`,
            threadId,
            sender: 'coach',
            senderName,
            body,
            createdAt: timestamp,
            status: 'delivered',
        };
        if (!mockMessages[threadId]) {
            mockMessages[threadId] = [];
        }
        mockMessages[threadId].push(incoming);
        // Update thread
        const thread = mockThreads.find((t) => t.id === threadId);
        if (thread) {
            thread.lastMessage = body;
            thread.lastMessageTime = timestamp;
            thread.unreadCount += 1;
        }
        // Notify parent
        mockNotifications.push({
            type: 'incoming_message',
            threadId,
            senderName: senderName || thread?.coachName || 'Coach',
        });
        return incoming;
    }
    async markThreadRead(threadId) {
        const thread = mockThreads.find((t) => t.id === threadId);
        if (thread) {
            thread.unreadCount = 0;
        }
        return thread;
    }
    async deleteMessage(threadId, messageId) {
        const messages = mockMessages[threadId];
        if (messages) {
            mockMessages[threadId] = messages.filter((m) => m.id !== messageId);
        }
    }
    async createThread(coachId, coachName, parentId, serviceName) {
        messageIdCounter++;
        const newThread = {
            id: `thread_${messageIdCounter}`,
            coachName,
            lastMessage: '',
            lastMessageTime: new Date().toISOString(),
            unreadCount: 0,
            serviceName,
        };
        mockThreads.push(newThread);
        mockMessages[newThread.id] = [];
        return newThread;
    }
    getUnreadCount() {
        return mockThreads.reduce((sum, t) => sum + t.unreadCount, 0);
    }
}
// Test data
const MOCK_THREADS = [
    {
        id: 'thread_1',
        coachName: 'Sarah Mitchell',
        lastMessage: 'See you tomorrow at 10am!',
        lastMessageTime: '2026-02-04T15:30:00Z',
        unreadCount: 2,
        serviceName: '1-on-1 Training',
    },
    {
        id: 'thread_2',
        coachName: 'James Rodriguez',
        lastMessage: 'Great session today!',
        lastMessageTime: '2026-02-03T18:00:00Z',
        unreadCount: 0,
        serviceName: 'Group Training',
    },
    {
        id: 'thread_3',
        title: 'Academy Updates',
        coachName: 'City Football Academy',
        lastMessage: 'Training cancelled this Saturday',
        lastMessageTime: '2026-02-02T09:00:00Z',
        unreadCount: 1,
        subtitle: 'Squad: U12 Boys',
    },
];
const MOCK_MESSAGES = {
    thread_1: [
        {
            id: 'msg_1',
            threadId: 'thread_1',
            sender: 'parent',
            senderName: 'John Wilson',
            body: 'Hi Sarah, can we reschedule to 10am?',
            createdAt: '2026-02-04T15:00:00Z',
            status: 'seen',
        },
        {
            id: 'msg_2',
            threadId: 'thread_1',
            sender: 'coach',
            senderName: 'Sarah Mitchell',
            body: 'Sure, 10am works for me!',
            createdAt: '2026-02-04T15:15:00Z',
            status: 'delivered',
        },
        {
            id: 'msg_3',
            threadId: 'thread_1',
            sender: 'coach',
            senderName: 'Sarah Mitchell',
            body: 'See you tomorrow at 10am!',
            createdAt: '2026-02-04T15:30:00Z',
            status: 'delivered',
        },
    ],
    thread_2: [
        {
            id: 'msg_4',
            threadId: 'thread_2',
            sender: 'coach',
            senderName: 'James Rodriguez',
            body: 'Great session today!',
            createdAt: '2026-02-03T18:00:00Z',
            status: 'seen',
        },
    ],
};
let messagingService;
// Reset mocks before each test
(0, node_test_1.beforeEach)(() => {
    mockThreads = JSON.parse(JSON.stringify(MOCK_THREADS));
    mockMessages = JSON.parse(JSON.stringify(MOCK_MESSAGES));
    mockNotifications = [];
    messageIdCounter = 0;
    messagingService = new MockMessagingService();
});
// ============================================================================
// THREAD LISTING TESTS
// ============================================================================
(0, node_test_1.describe)('MessagingService - Thread Operations', () => {
    (0, node_test_1.default)('listThreads() returns all threads', async () => {
        const threads = await messagingService.listThreads();
        node_assert_1.default.strictEqual(threads.length, 3);
    });
    (0, node_test_1.default)('getThread() returns thread by ID', async () => {
        const thread = await messagingService.getThread('thread_1');
        node_assert_1.default.ok(thread);
        node_assert_1.default.strictEqual(thread.coachName, 'Sarah Mitchell');
        node_assert_1.default.strictEqual(thread.unreadCount, 2);
    });
    (0, node_test_1.default)('getThread() returns undefined for non-existent thread', async () => {
        const thread = await messagingService.getThread('non_existent');
        node_assert_1.default.strictEqual(thread, undefined);
    });
    (0, node_test_1.default)('getUnreadCount() returns total unread messages', () => {
        const count = messagingService.getUnreadCount();
        node_assert_1.default.strictEqual(count, 3); // 2 + 0 + 1
    });
});
// ============================================================================
// MESSAGE LISTING TESTS
// ============================================================================
(0, node_test_1.describe)('MessagingService - Message Listing', () => {
    (0, node_test_1.default)('listMessages() returns messages for thread sorted by time', async () => {
        const messages = await messagingService.listMessages('thread_1');
        node_assert_1.default.strictEqual(messages.length, 3);
        // Verify chronological order
        for (let i = 1; i < messages.length; i++) {
            const prev = new Date(messages[i - 1].createdAt).getTime();
            const curr = new Date(messages[i].createdAt).getTime();
            node_assert_1.default.ok(prev <= curr, 'Messages should be in chronological order');
        }
    });
    (0, node_test_1.default)('listMessages() returns empty array for thread with no messages', async () => {
        const messages = await messagingService.listMessages('thread_3');
        node_assert_1.default.strictEqual(messages.length, 0);
    });
    (0, node_test_1.default)('listMessages() returns empty array for non-existent thread', async () => {
        const messages = await messagingService.listMessages('non_existent');
        node_assert_1.default.strictEqual(messages.length, 0);
    });
});
// ============================================================================
// SEND MESSAGE TESTS
// ============================================================================
(0, node_test_1.describe)('MessagingService - Send Message', () => {
    (0, node_test_1.default)('sendMessage() creates new message with correct fields', async () => {
        const message = await messagingService.sendMessage('thread_1', 'Hello coach!', 'parent', 'John Wilson');
        node_assert_1.default.ok(message.id);
        node_assert_1.default.strictEqual(message.threadId, 'thread_1');
        node_assert_1.default.strictEqual(message.body, 'Hello coach!');
        node_assert_1.default.strictEqual(message.sender, 'parent');
        node_assert_1.default.strictEqual(message.senderName, 'John Wilson');
        node_assert_1.default.strictEqual(message.status, 'pending');
        node_assert_1.default.ok(message.createdAt);
    });
    (0, node_test_1.default)('sendMessage() adds message to thread messages', async () => {
        const beforeCount = (await messagingService.listMessages('thread_1')).length;
        await messagingService.sendMessage('thread_1', 'New message', 'parent');
        const afterCount = (await messagingService.listMessages('thread_1')).length;
        node_assert_1.default.strictEqual(afterCount, beforeCount + 1);
    });
    (0, node_test_1.default)('sendMessage() updates thread last message', async () => {
        await messagingService.sendMessage('thread_1', 'Latest update', 'parent');
        const thread = await messagingService.getThread('thread_1');
        node_assert_1.default.strictEqual(thread?.lastMessage, 'Latest update');
    });
    (0, node_test_1.default)('sendMessage() with attachments', async () => {
        const attachments = [
            { type: 'image', url: 'https://example.com/image.jpg' },
            { type: 'video', url: 'https://example.com/video.mp4' },
        ];
        const message = await messagingService.sendMessage('thread_1', 'Check these out', 'parent', 'John Wilson', attachments);
        node_assert_1.default.strictEqual(message.attachments?.length, 2);
        node_assert_1.default.strictEqual(message.attachments?.[0].type, 'image');
    });
    (0, node_test_1.default)('sendMessage() from parent creates notification for coach', async () => {
        await messagingService.sendMessage('thread_1', 'Hi coach', 'parent', 'John');
        const notification = mockNotifications.find((n) => n.type === 'message_to_coach');
        node_assert_1.default.ok(notification);
        node_assert_1.default.strictEqual(notification.threadId, 'thread_1');
        node_assert_1.default.strictEqual(notification.senderName, 'John');
    });
    (0, node_test_1.default)('sendMessage() from coach creates notification for parent', async () => {
        await messagingService.sendMessage('thread_1', 'Hi parent', 'coach', 'Sarah');
        const notification = mockNotifications.find((n) => n.type === 'message_to_parent');
        node_assert_1.default.ok(notification);
        node_assert_1.default.strictEqual(notification.threadId, 'thread_1');
        node_assert_1.default.strictEqual(notification.senderName, 'Sarah');
    });
});
// ============================================================================
// MESSAGE STATUS TESTS
// ============================================================================
(0, node_test_1.describe)('MessagingService - Message Status', () => {
    (0, node_test_1.default)('updateMessageStatus() changes message status', async () => {
        const message = await messagingService.sendMessage('thread_1', 'Test', 'parent');
        node_assert_1.default.strictEqual(message.status, 'pending');
        await messagingService.updateMessageStatus('thread_1', message.id, 'sent');
        const messages = await messagingService.listMessages('thread_1');
        const updated = messages.find((m) => m.id === message.id);
        node_assert_1.default.strictEqual(updated?.status, 'sent');
    });
    (0, node_test_1.default)('message status progresses: pending -> sent -> delivered -> seen', async () => {
        const message = await messagingService.sendMessage('thread_1', 'Test', 'parent');
        // Simulate status progression
        await messagingService.updateMessageStatus('thread_1', message.id, 'sent');
        let messages = await messagingService.listMessages('thread_1');
        let updated = messages.find((m) => m.id === message.id);
        node_assert_1.default.strictEqual(updated?.status, 'sent');
        await messagingService.updateMessageStatus('thread_1', message.id, 'delivered');
        messages = await messagingService.listMessages('thread_1');
        updated = messages.find((m) => m.id === message.id);
        node_assert_1.default.strictEqual(updated?.status, 'delivered');
        await messagingService.updateMessageStatus('thread_1', message.id, 'seen');
        messages = await messagingService.listMessages('thread_1');
        updated = messages.find((m) => m.id === message.id);
        node_assert_1.default.strictEqual(updated?.status, 'seen');
    });
});
// ============================================================================
// INCOMING MESSAGE TESTS
// ============================================================================
(0, node_test_1.describe)('MessagingService - Incoming Messages', () => {
    (0, node_test_1.default)('simulateIncoming() creates coach message', async () => {
        const message = await messagingService.simulateIncoming('thread_1', 'Response from coach', 'Sarah Mitchell');
        node_assert_1.default.ok(message.id);
        node_assert_1.default.strictEqual(message.sender, 'coach');
        node_assert_1.default.strictEqual(message.senderName, 'Sarah Mitchell');
        node_assert_1.default.strictEqual(message.body, 'Response from coach');
        node_assert_1.default.strictEqual(message.status, 'delivered');
    });
    (0, node_test_1.default)('simulateIncoming() increments thread unread count', async () => {
        const beforeThread = await messagingService.getThread('thread_2');
        const beforeCount = beforeThread?.unreadCount || 0;
        await messagingService.simulateIncoming('thread_2', 'New message');
        const afterThread = await messagingService.getThread('thread_2');
        node_assert_1.default.strictEqual(afterThread?.unreadCount, beforeCount + 1);
    });
    (0, node_test_1.default)('simulateIncoming() creates notification for parent', async () => {
        await messagingService.simulateIncoming('thread_1', 'Coach says hi', 'Sarah');
        const notification = mockNotifications.find((n) => n.type === 'incoming_message');
        node_assert_1.default.ok(notification);
        node_assert_1.default.strictEqual(notification.threadId, 'thread_1');
    });
});
// ============================================================================
// MARK READ TESTS
// ============================================================================
(0, node_test_1.describe)('MessagingService - Mark Read', () => {
    (0, node_test_1.default)('markThreadRead() sets unread count to 0', async () => {
        const beforeThread = await messagingService.getThread('thread_1');
        node_assert_1.default.ok(beforeThread);
        node_assert_1.default.ok(beforeThread.unreadCount > 0);
        await messagingService.markThreadRead('thread_1');
        const afterThread = await messagingService.getThread('thread_1');
        node_assert_1.default.strictEqual(afterThread?.unreadCount, 0);
    });
    (0, node_test_1.default)('markThreadRead() returns the updated thread', async () => {
        const thread = await messagingService.markThreadRead('thread_1');
        node_assert_1.default.ok(thread);
        node_assert_1.default.strictEqual(thread.unreadCount, 0);
    });
    (0, node_test_1.default)('markThreadRead() returns undefined for non-existent thread', async () => {
        const thread = await messagingService.markThreadRead('non_existent');
        node_assert_1.default.strictEqual(thread, undefined);
    });
    (0, node_test_1.default)('marking thread read updates total unread count', async () => {
        const beforeTotal = messagingService.getUnreadCount();
        await messagingService.markThreadRead('thread_1');
        const afterTotal = messagingService.getUnreadCount();
        node_assert_1.default.strictEqual(afterTotal, beforeTotal - 2); // thread_1 had 2 unread
    });
});
// ============================================================================
// DELETE MESSAGE TESTS
// ============================================================================
(0, node_test_1.describe)('MessagingService - Delete Message', () => {
    (0, node_test_1.default)('deleteMessage() removes message from thread', async () => {
        const beforeMessages = await messagingService.listMessages('thread_1');
        const messageToDelete = beforeMessages[0];
        await messagingService.deleteMessage('thread_1', messageToDelete.id);
        const afterMessages = await messagingService.listMessages('thread_1');
        node_assert_1.default.strictEqual(afterMessages.length, beforeMessages.length - 1);
        node_assert_1.default.ok(!afterMessages.find((m) => m.id === messageToDelete.id));
    });
    (0, node_test_1.default)('deleteMessage() handles non-existent message gracefully', async () => {
        const beforeMessages = await messagingService.listMessages('thread_1');
        await messagingService.deleteMessage('thread_1', 'non_existent');
        const afterMessages = await messagingService.listMessages('thread_1');
        node_assert_1.default.strictEqual(afterMessages.length, beforeMessages.length);
    });
});
// ============================================================================
// CREATE THREAD TESTS
// ============================================================================
(0, node_test_1.describe)('MessagingService - Create Thread', () => {
    (0, node_test_1.default)('createThread() creates new thread', async () => {
        const thread = await messagingService.createThread('coach_new', 'New Coach', 'parent_1', 'Private Training');
        node_assert_1.default.ok(thread.id);
        node_assert_1.default.strictEqual(thread.coachName, 'New Coach');
        node_assert_1.default.strictEqual(thread.serviceName, 'Private Training');
        node_assert_1.default.strictEqual(thread.unreadCount, 0);
        node_assert_1.default.strictEqual(thread.lastMessage, '');
    });
    (0, node_test_1.default)('createThread() adds thread to list', async () => {
        const beforeCount = (await messagingService.listThreads()).length;
        await messagingService.createThread('coach_new', 'New Coach', 'parent_1');
        const afterCount = (await messagingService.listThreads()).length;
        node_assert_1.default.strictEqual(afterCount, beforeCount + 1);
    });
    (0, node_test_1.default)('createThread() initializes empty message list', async () => {
        const thread = await messagingService.createThread('coach_new', 'New Coach', 'parent_1');
        const messages = await messagingService.listMessages(thread.id);
        node_assert_1.default.strictEqual(messages.length, 0);
    });
});
// ============================================================================
// EDGE CASES
// ============================================================================
(0, node_test_1.describe)('MessagingService - Edge Cases', () => {
    (0, node_test_1.default)('handles empty message body', async () => {
        const message = await messagingService.sendMessage('thread_1', '', 'parent');
        node_assert_1.default.strictEqual(message.body, '');
    });
    (0, node_test_1.default)('handles very long message body', async () => {
        const longBody = 'A'.repeat(10000);
        const message = await messagingService.sendMessage('thread_1', longBody, 'parent');
        node_assert_1.default.strictEqual(message.body.length, 10000);
    });
    (0, node_test_1.default)('handles special characters in message', async () => {
        const specialBody = 'Hello! 👋 How are you? <script>alert("test")</script>';
        const message = await messagingService.sendMessage('thread_1', specialBody, 'parent');
        node_assert_1.default.strictEqual(message.body, specialBody);
    });
    (0, node_test_1.default)('handles multiple sequential messages', async () => {
        // Send messages sequentially to ensure unique IDs
        const msg1 = await messagingService.sendMessage('thread_1', 'Message 1', 'parent');
        const msg2 = await messagingService.sendMessage('thread_1', 'Message 2', 'parent');
        const msg3 = await messagingService.sendMessage('thread_1', 'Message 3', 'parent');
        const messages = [msg1, msg2, msg3];
        node_assert_1.default.strictEqual(messages.length, 3);
        // All should have unique IDs
        const ids = new Set(messages.map((m) => m.id));
        node_assert_1.default.strictEqual(ids.size, 3);
    });
    (0, node_test_1.default)('thread with title uses title for display', async () => {
        const thread = await messagingService.getThread('thread_3');
        node_assert_1.default.ok(thread);
        node_assert_1.default.strictEqual(thread.title, 'Academy Updates');
        node_assert_1.default.strictEqual(thread.subtitle, 'Squad: U12 Boys');
    });
});
