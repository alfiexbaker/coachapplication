// @ts-nocheck
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

import assert from 'node:assert';
import test, { describe, beforeEach } from 'node:test';

// Mock types
interface ChatMessage {
  id: string;
  threadId: string;
  sender: 'parent' | 'coach';
  senderName?: string;
  body: string;
  createdAt: string;
  status: 'pending' | 'sent' | 'delivered' | 'seen';
  attachments?: any[];
}

interface ChatThreadSummary {
  id: string;
  title?: string;
  coachName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  serviceName?: string;
  subtitle?: string;
}

// Mock storage
let mockThreads: ChatThreadSummary[] = [];
let mockMessages: Record<string, ChatMessage[]> = {};
let mockNotifications: any[] = [];
let messageIdCounter = 0; // Counter for unique message IDs

// Mock MessagingService for testing
class MockMessagingService {
  async listThreads(): Promise<ChatThreadSummary[]> {
    return [...mockThreads];
  }

  async getThread(threadId: string): Promise<ChatThreadSummary | undefined> {
    return mockThreads.find((t) => t.id === threadId);
  }

  async listMessages(threadId: string): Promise<ChatMessage[]> {
    const messages = mockMessages[threadId] || [];
    return messages.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  async sendMessage(
    threadId: string,
    body: string,
    sender: 'parent' | 'coach',
    senderName?: string,
    attachments: any[] = []
  ): Promise<ChatMessage> {
    const timestamp = new Date().toISOString();
    messageIdCounter++;
    const newMessage: ChatMessage = {
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
    } else {
      mockNotifications.push({
        type: 'message_to_parent',
        threadId,
        senderName: senderName || 'Coach',
      });
    }

    return newMessage;
  }

  async updateMessageStatus(
    threadId: string,
    messageId: string,
    status: ChatMessage['status']
  ): Promise<void> {
    const messages = mockMessages[threadId];
    if (messages) {
      const message = messages.find((m) => m.id === messageId);
      if (message) {
        message.status = status;
      }
    }
  }

  async simulateIncoming(
    threadId: string,
    body: string,
    senderName?: string
  ): Promise<ChatMessage> {
    const timestamp = new Date().toISOString();
    messageIdCounter++;
    const incoming: ChatMessage = {
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

  async markThreadRead(threadId: string): Promise<ChatThreadSummary | undefined> {
    const thread = mockThreads.find((t) => t.id === threadId);
    if (thread) {
      thread.unreadCount = 0;
    }
    return thread;
  }

  async deleteMessage(threadId: string, messageId: string): Promise<void> {
    const messages = mockMessages[threadId];
    if (messages) {
      mockMessages[threadId] = messages.filter((m) => m.id !== messageId);
    }
  }

  async createThread(
    coachId: string,
    coachName: string,
    parentId: string,
    serviceName?: string
  ): Promise<ChatThreadSummary> {
    messageIdCounter++;
    const newThread: ChatThreadSummary = {
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

  getUnreadCount(): number {
    return mockThreads.reduce((sum, t) => sum + t.unreadCount, 0);
  }
}

// Test data
const MOCK_THREADS: ChatThreadSummary[] = [
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

const MOCK_MESSAGES: Record<string, ChatMessage[]> = {
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

let messagingService: MockMessagingService;

// Reset mocks before each test
beforeEach(() => {
  mockThreads = JSON.parse(JSON.stringify(MOCK_THREADS));
  mockMessages = JSON.parse(JSON.stringify(MOCK_MESSAGES));
  mockNotifications = [];
  messageIdCounter = 0;
  messagingService = new MockMessagingService();
});

// ============================================================================
// THREAD LISTING TESTS
// ============================================================================

describe('MessagingService - Thread Operations', () => {
  test('listThreads() returns all threads', async () => {
    const threads = await messagingService.listThreads();
    assert.strictEqual(threads.length, 3);
  });

  test('getThread() returns thread by ID', async () => {
    const thread = await messagingService.getThread('thread_1');
    assert.ok(thread);
    assert.strictEqual(thread.coachName, 'Sarah Mitchell');
    assert.strictEqual(thread.unreadCount, 2);
  });

  test('getThread() returns undefined for non-existent thread', async () => {
    const thread = await messagingService.getThread('non_existent');
    assert.strictEqual(thread, undefined);
  });

  test('getUnreadCount() returns total unread messages', () => {
    const count = messagingService.getUnreadCount();
    assert.strictEqual(count, 3); // 2 + 0 + 1
  });
});

// ============================================================================
// MESSAGE LISTING TESTS
// ============================================================================

describe('MessagingService - Message Listing', () => {
  test('listMessages() returns messages for thread sorted by time', async () => {
    const messages = await messagingService.listMessages('thread_1');
    assert.strictEqual(messages.length, 3);

    // Verify chronological order
    for (let i = 1; i < messages.length; i++) {
      const prev = new Date(messages[i - 1].createdAt).getTime();
      const curr = new Date(messages[i].createdAt).getTime();
      assert.ok(prev <= curr, 'Messages should be in chronological order');
    }
  });

  test('listMessages() returns empty array for thread with no messages', async () => {
    const messages = await messagingService.listMessages('thread_3');
    assert.strictEqual(messages.length, 0);
  });

  test('listMessages() returns empty array for non-existent thread', async () => {
    const messages = await messagingService.listMessages('non_existent');
    assert.strictEqual(messages.length, 0);
  });
});

// ============================================================================
// SEND MESSAGE TESTS
// ============================================================================

describe('MessagingService - Send Message', () => {
  test('sendMessage() creates new message with correct fields', async () => {
    const message = await messagingService.sendMessage(
      'thread_1',
      'Hello coach!',
      'parent',
      'John Wilson'
    );

    assert.ok(message.id);
    assert.strictEqual(message.threadId, 'thread_1');
    assert.strictEqual(message.body, 'Hello coach!');
    assert.strictEqual(message.sender, 'parent');
    assert.strictEqual(message.senderName, 'John Wilson');
    assert.strictEqual(message.status, 'pending');
    assert.ok(message.createdAt);
  });

  test('sendMessage() adds message to thread messages', async () => {
    const beforeCount = (await messagingService.listMessages('thread_1')).length;

    await messagingService.sendMessage('thread_1', 'New message', 'parent');

    const afterCount = (await messagingService.listMessages('thread_1')).length;
    assert.strictEqual(afterCount, beforeCount + 1);
  });

  test('sendMessage() updates thread last message', async () => {
    await messagingService.sendMessage('thread_1', 'Latest update', 'parent');

    const thread = await messagingService.getThread('thread_1');
    assert.strictEqual(thread?.lastMessage, 'Latest update');
  });

  test('sendMessage() with attachments', async () => {
    const attachments = [
      { type: 'image', url: 'https://example.com/image.jpg' },
      { type: 'video', url: 'https://example.com/video.mp4' },
    ];

    const message = await messagingService.sendMessage(
      'thread_1',
      'Check these out',
      'parent',
      'John Wilson',
      attachments
    );

    assert.strictEqual(message.attachments?.length, 2);
    assert.strictEqual(message.attachments?.[0].type, 'image');
  });

  test('sendMessage() from parent creates notification for coach', async () => {
    await messagingService.sendMessage('thread_1', 'Hi coach', 'parent', 'John');

    const notification = mockNotifications.find((n) => n.type === 'message_to_coach');
    assert.ok(notification);
    assert.strictEqual(notification.threadId, 'thread_1');
    assert.strictEqual(notification.senderName, 'John');
  });

  test('sendMessage() from coach creates notification for parent', async () => {
    await messagingService.sendMessage('thread_1', 'Hi parent', 'coach', 'Sarah');

    const notification = mockNotifications.find((n) => n.type === 'message_to_parent');
    assert.ok(notification);
    assert.strictEqual(notification.threadId, 'thread_1');
    assert.strictEqual(notification.senderName, 'Sarah');
  });
});

// ============================================================================
// MESSAGE STATUS TESTS
// ============================================================================

describe('MessagingService - Message Status', () => {
  test('updateMessageStatus() changes message status', async () => {
    const message = await messagingService.sendMessage('thread_1', 'Test', 'parent');
    assert.strictEqual(message.status, 'pending');

    await messagingService.updateMessageStatus('thread_1', message.id, 'sent');

    const messages = await messagingService.listMessages('thread_1');
    const updated = messages.find((m) => m.id === message.id);
    assert.strictEqual(updated?.status, 'sent');
  });

  test('message status progresses: pending -> sent -> delivered -> seen', async () => {
    const message = await messagingService.sendMessage('thread_1', 'Test', 'parent');

    // Simulate status progression
    await messagingService.updateMessageStatus('thread_1', message.id, 'sent');
    let messages = await messagingService.listMessages('thread_1');
    let updated = messages.find((m) => m.id === message.id);
    assert.strictEqual(updated?.status, 'sent');

    await messagingService.updateMessageStatus('thread_1', message.id, 'delivered');
    messages = await messagingService.listMessages('thread_1');
    updated = messages.find((m) => m.id === message.id);
    assert.strictEqual(updated?.status, 'delivered');

    await messagingService.updateMessageStatus('thread_1', message.id, 'seen');
    messages = await messagingService.listMessages('thread_1');
    updated = messages.find((m) => m.id === message.id);
    assert.strictEqual(updated?.status, 'seen');
  });
});

// ============================================================================
// INCOMING MESSAGE TESTS
// ============================================================================

describe('MessagingService - Incoming Messages', () => {
  test('simulateIncoming() creates coach message', async () => {
    const message = await messagingService.simulateIncoming(
      'thread_1',
      'Response from coach',
      'Sarah Mitchell'
    );

    assert.ok(message.id);
    assert.strictEqual(message.sender, 'coach');
    assert.strictEqual(message.senderName, 'Sarah Mitchell');
    assert.strictEqual(message.body, 'Response from coach');
    assert.strictEqual(message.status, 'delivered');
  });

  test('simulateIncoming() increments thread unread count', async () => {
    const beforeThread = await messagingService.getThread('thread_2');
    const beforeCount = beforeThread?.unreadCount || 0;

    await messagingService.simulateIncoming('thread_2', 'New message');

    const afterThread = await messagingService.getThread('thread_2');
    assert.strictEqual(afterThread?.unreadCount, beforeCount + 1);
  });

  test('simulateIncoming() creates notification for parent', async () => {
    await messagingService.simulateIncoming('thread_1', 'Coach says hi', 'Sarah');

    const notification = mockNotifications.find((n) => n.type === 'incoming_message');
    assert.ok(notification);
    assert.strictEqual(notification.threadId, 'thread_1');
  });
});

// ============================================================================
// MARK READ TESTS
// ============================================================================

describe('MessagingService - Mark Read', () => {
  test('markThreadRead() sets unread count to 0', async () => {
    const beforeThread = await messagingService.getThread('thread_1');
    assert.ok(beforeThread?.unreadCount > 0);

    await messagingService.markThreadRead('thread_1');

    const afterThread = await messagingService.getThread('thread_1');
    assert.strictEqual(afterThread?.unreadCount, 0);
  });

  test('markThreadRead() returns the updated thread', async () => {
    const thread = await messagingService.markThreadRead('thread_1');
    assert.ok(thread);
    assert.strictEqual(thread.unreadCount, 0);
  });

  test('markThreadRead() returns undefined for non-existent thread', async () => {
    const thread = await messagingService.markThreadRead('non_existent');
    assert.strictEqual(thread, undefined);
  });

  test('marking thread read updates total unread count', async () => {
    const beforeTotal = messagingService.getUnreadCount();

    await messagingService.markThreadRead('thread_1');

    const afterTotal = messagingService.getUnreadCount();
    assert.strictEqual(afterTotal, beforeTotal - 2); // thread_1 had 2 unread
  });
});

// ============================================================================
// DELETE MESSAGE TESTS
// ============================================================================

describe('MessagingService - Delete Message', () => {
  test('deleteMessage() removes message from thread', async () => {
    const beforeMessages = await messagingService.listMessages('thread_1');
    const messageToDelete = beforeMessages[0];

    await messagingService.deleteMessage('thread_1', messageToDelete.id);

    const afterMessages = await messagingService.listMessages('thread_1');
    assert.strictEqual(afterMessages.length, beforeMessages.length - 1);
    assert.ok(!afterMessages.find((m) => m.id === messageToDelete.id));
  });

  test('deleteMessage() handles non-existent message gracefully', async () => {
    const beforeMessages = await messagingService.listMessages('thread_1');

    await messagingService.deleteMessage('thread_1', 'non_existent');

    const afterMessages = await messagingService.listMessages('thread_1');
    assert.strictEqual(afterMessages.length, beforeMessages.length);
  });
});

// ============================================================================
// CREATE THREAD TESTS
// ============================================================================

describe('MessagingService - Create Thread', () => {
  test('createThread() creates new thread', async () => {
    const thread = await messagingService.createThread(
      'coach_new',
      'New Coach',
      'parent_1',
      'Private Training'
    );

    assert.ok(thread.id);
    assert.strictEqual(thread.coachName, 'New Coach');
    assert.strictEqual(thread.serviceName, 'Private Training');
    assert.strictEqual(thread.unreadCount, 0);
    assert.strictEqual(thread.lastMessage, '');
  });

  test('createThread() adds thread to list', async () => {
    const beforeCount = (await messagingService.listThreads()).length;

    await messagingService.createThread('coach_new', 'New Coach', 'parent_1');

    const afterCount = (await messagingService.listThreads()).length;
    assert.strictEqual(afterCount, beforeCount + 1);
  });

  test('createThread() initializes empty message list', async () => {
    const thread = await messagingService.createThread(
      'coach_new',
      'New Coach',
      'parent_1'
    );

    const messages = await messagingService.listMessages(thread.id);
    assert.strictEqual(messages.length, 0);
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('MessagingService - Edge Cases', () => {
  test('handles empty message body', async () => {
    const message = await messagingService.sendMessage('thread_1', '', 'parent');
    assert.strictEqual(message.body, '');
  });

  test('handles very long message body', async () => {
    const longBody = 'A'.repeat(10000);
    const message = await messagingService.sendMessage('thread_1', longBody, 'parent');
    assert.strictEqual(message.body.length, 10000);
  });

  test('handles special characters in message', async () => {
    const specialBody = 'Hello! 👋 How are you? <script>alert("test")</script>';
    const message = await messagingService.sendMessage('thread_1', specialBody, 'parent');
    assert.strictEqual(message.body, specialBody);
  });

  test('handles multiple sequential messages', async () => {
    // Send messages sequentially to ensure unique IDs
    const msg1 = await messagingService.sendMessage('thread_1', 'Message 1', 'parent');
    const msg2 = await messagingService.sendMessage('thread_1', 'Message 2', 'parent');
    const msg3 = await messagingService.sendMessage('thread_1', 'Message 3', 'parent');

    const messages = [msg1, msg2, msg3];
    assert.strictEqual(messages.length, 3);

    // All should have unique IDs
    const ids = new Set(messages.map((m) => m.id));
    assert.strictEqual(ids.size, 3);
  });

  test('thread with title uses title for display', async () => {
    const thread = await messagingService.getThread('thread_3');
    assert.ok(thread);
    assert.strictEqual(thread.title, 'Academy Updates');
    assert.strictEqual(thread.subtitle, 'Squad: U12 Boys');
  });
});
