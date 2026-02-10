import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { messagingService } from '@/services/messaging-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('MessagingService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.MESSAGES);
  });

  describe('listThreads', () => {
    it('should return list of chat threads', async () => {
      const threads = await messagingService.listThreads();

      assert.ok(Array.isArray(threads));
    });
  });

  describe('getThread', () => {
    it('should return thread when found', async () => {
      const threads = await messagingService.listThreads();

      if (threads.length > 0) {
        const thread = await messagingService.getThread(threads[0].id);
        assert.ok(thread);
        assert.equal(thread?.id, threads[0].id);
      }
    });

    it('should return undefined for non-existent thread', async () => {
      const thread = await messagingService.getThread('non-existent-thread');

      assert.equal(thread, undefined);
    });
  });

  describe('listMessages', () => {
    it('should return empty array for thread with no messages', async () => {
      const threadId = 'test-thread-' + Math.random().toString(36).slice(2);

      const messages = await messagingService.listMessages(threadId);

      assert.ok(Array.isArray(messages));
      assert.equal(messages.length, 0);
    });

    it('should return messages sorted by createdAt', async () => {
      const threadId = 'test-thread-' + Math.random().toString(36).slice(2);
      const now = new Date();
      const messages = [
        {
          id: 'test-msg-2-' + Math.random().toString(36).slice(2),
          threadId,
          sender: 'coach' as const,
          body: 'Second message',
          createdAt: new Date(now.getTime() + 1000).toISOString(),
          status: 'sent' as const,
        },
        {
          id: 'test-msg-1-' + Math.random().toString(36).slice(2),
          threadId,
          sender: 'parent' as const,
          body: 'First message',
          createdAt: now.toISOString(),
          status: 'sent' as const,
        },
      ];

      await apiClient.set(STORAGE_KEYS.MESSAGES, { [threadId]: messages });

      const result = await messagingService.listMessages(threadId);

      assert.equal(result.length, 2);
      assert.ok(new Date(result[0].createdAt) <= new Date(result[1].createdAt));
    });
  });

  describe('sendMessage', () => {
    it('should create and persist new message', async () => {
      const threadId = 'test-thread-' + Math.random().toString(36).slice(2);
      const body = 'Test message';

      const message = await messagingService.sendMessage(threadId, body, 'parent', 'Test Parent');

      assert.ok(message.id);
      assert.equal(message.threadId, threadId);
      assert.equal(message.body, body);
      assert.equal(message.sender, 'parent');
      assert.equal(message.status, 'pending');
    });

    it('should include optional senderName', async () => {
      const threadId = 'test-thread-' + Math.random().toString(36).slice(2);
      const senderName = 'John Doe';

      const message = await messagingService.sendMessage(
        threadId,
        'Test message',
        'parent',
        senderName
      );

      assert.equal(message.senderName, senderName);
    });

    it('should include attachments when provided', async () => {
      const threadId = 'test-thread-' + Math.random().toString(36).slice(2);
      const attachments = [
        {
          type: 'IMAGE' as const,
          url: 'https://example.com/image.jpg',
          filename: 'image.jpg',
          size: 12345,
        },
      ];

      const message = await messagingService.sendMessage(
        threadId,
        'Message with attachment',
        'coach',
        'Test Coach',
        attachments
      );

      assert.ok(message.attachments);
      assert.equal(message.attachments.length, 1);
      assert.equal(message.attachments[0].type, 'IMAGE');
    });
  });

  describe('simulateIncoming', () => {
    it('should create incoming message from coach', async () => {
      const threadId = 'test-thread-' + Math.random().toString(36).slice(2);

      const message = await messagingService.simulateIncoming(
        threadId,
        'Incoming message',
        'Test Coach'
      );

      assert.ok(message.id);
      assert.equal(message.sender, 'coach');
      assert.equal(message.status, 'delivered');
    });
  });

  describe('markThreadRead', () => {
    it('should update thread unread count to zero', async () => {
      const threads = await messagingService.listThreads();

      if (threads.length > 0) {
        const thread = await messagingService.markThreadRead(threads[0].id);

        if (thread) {
          assert.equal(thread.unreadCount, 0);
        }
      }
    });

    it('should return thread after marking as read', async () => {
      const threads = await messagingService.listThreads();

      if (threads.length > 0) {
        const result = await messagingService.markThreadRead(threads[0].id);
        assert.ok(result);
      }
    });
  });

  describe('deleteMessage', () => {
    it('should remove message from thread', async () => {
      const threadId = 'test-thread-' + Math.random().toString(36).slice(2);

      const message = await messagingService.sendMessage(threadId, 'Test message', 'parent');

      await messagingService.deleteMessage(threadId, message.id);

      const messages = await messagingService.listMessages(threadId);
      const deleted = messages.find((m) => m.id === message.id);

      assert.equal(deleted, undefined);
    });

    it('should handle deleting non-existent message gracefully', async () => {
      const threadId = 'test-thread-' + Math.random().toString(36).slice(2);

      await messagingService.deleteMessage(threadId, 'non-existent-message');

      // Should not throw
      const messages = await messagingService.listMessages(threadId);
      assert.ok(Array.isArray(messages));
    });
  });
});
