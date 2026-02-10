import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { communityMessagingService } from '@/services/community/community-messaging-service';
import { storageService } from '@/services/storage-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('CommunityMessagingService', () => {
  beforeEach(async () => {
    // Clear storage using storageService
    await storageService.removeItem(STORAGE_KEYS.GROUP_MESSAGES);
  });

  describe('getGroupMessages', () => {
    it('should return empty array for group with no messages', async () => {
      const messages = await communityMessagingService.getGroupMessages('group-' + Math.random().toString(36).slice(2));

      assert.ok(Array.isArray(messages));
      assert.equal(messages.length, 0);
    });

    it('should return messages for group', async () => {
      const groupId = 'group-' + Math.random().toString(36).slice(2);

      await communityMessagingService.sendGroupMessage({
        groupId,
        senderId: 'parent1',
        senderName: 'Test Parent',
        message: 'Hello world',
      });

      const messages = await communityMessagingService.getGroupMessages(groupId);

      assert.ok(Array.isArray(messages));
      assert.ok(messages.length > 0);
      assert.equal(messages[0].groupId, groupId);
    });
  });

  describe('sendGroupMessage', () => {
    it('should create new message', async () => {
      const params = {
        groupId: 'group-' + Math.random().toString(36).slice(2),
        senderId: 'parent-' + Math.random().toString(36).slice(2),
        senderName: 'Test Sender',
        message: 'Test message',
      };

      const message = await communityMessagingService.sendGroupMessage(params);

      assert.ok(message);
      assert.ok(message.id);
      assert.equal(message.groupId, params.groupId);
      assert.equal(message.senderId, params.senderId);
      assert.equal(message.message, params.message);
      assert.ok(Array.isArray(message.readBy));
    });

    it('should set timestamp to current time', async () => {
      const before = new Date();

      const message = await communityMessagingService.sendGroupMessage({
        groupId: 'group1',
        senderId: 'parent1',
        senderName: 'Sender',
        message: 'Test',
      });

      const after = new Date();
      const messageTime = new Date(message.timestamp);

      assert.ok(messageTime >= before);
      assert.ok(messageTime <= after);
    });

    it('should mark sender as having read the message', async () => {
      const senderId = 'parent-' + Math.random().toString(36).slice(2);

      const message = await communityMessagingService.sendGroupMessage({
        groupId: 'group1',
        senderId,
        senderName: 'Sender',
        message: 'Test',
      });

      assert.ok(message.readBy.includes(senderId));
    });

    it('should persist message to storage', async () => {
      const groupId = 'group-' + Math.random().toString(36).slice(2);

      await communityMessagingService.sendGroupMessage({
        groupId,
        senderId: 'parent1',
        senderName: 'Sender',
        message: 'Test message',
      });

      const messages = await communityMessagingService.getGroupMessages(groupId);

      assert.equal(messages.length, 1);
      assert.equal(messages[0].message, 'Test message');
    });
  });

  describe('markMessagesRead', () => {
    it('should add parent to readBy array', async () => {
      const groupId = 'group-' + Math.random().toString(36).slice(2);
      const readerId = 'parent-' + Math.random().toString(36).slice(2);

      await communityMessagingService.sendGroupMessage({
        groupId,
        senderId: 'parent1',
        senderName: 'Sender',
        message: 'Test message',
      });

      await communityMessagingService.markMessagesRead(groupId, readerId);

      const messages = await communityMessagingService.getGroupMessages(groupId);

      assert.ok(messages[0].readBy.includes(readerId));
    });

    it('should mark all messages in group as read', async () => {
      const groupId = 'group-' + Math.random().toString(36).slice(2);
      const readerId = 'parent-' + Math.random().toString(36).slice(2);

      await communityMessagingService.sendGroupMessage({
        groupId,
        senderId: 'parent1',
        senderName: 'Sender',
        message: 'Message 1',
      });

      await communityMessagingService.sendGroupMessage({
        groupId,
        senderId: 'parent2',
        senderName: 'Sender 2',
        message: 'Message 2',
      });

      await communityMessagingService.markMessagesRead(groupId, readerId);

      const messages = await communityMessagingService.getGroupMessages(groupId);

      assert.equal(messages.length, 2);
      assert.ok(messages.every((m) => m.readBy.includes(readerId)));
    });

    it('should not duplicate readBy entries', async () => {
      const groupId = 'group-' + Math.random().toString(36).slice(2);
      const readerId = 'parent-' + Math.random().toString(36).slice(2);

      await communityMessagingService.sendGroupMessage({
        groupId,
        senderId: 'parent1',
        senderName: 'Sender',
        message: 'Test',
      });

      await communityMessagingService.markMessagesRead(groupId, readerId);
      await communityMessagingService.markMessagesRead(groupId, readerId);

      const messages = await communityMessagingService.getGroupMessages(groupId);
      const readCount = messages[0].readBy.filter((id: string) => id === readerId).length;

      assert.equal(readCount, 1);
    });

    it('should handle empty group gracefully', async () => {
      await communityMessagingService.markMessagesRead('group-nonexistent', 'parent1');
      // Test passes if no error thrown
      assert.ok(true);
    });
  });

  describe('message ordering', () => {
    it('should return messages in chronological order', async () => {
      const groupId = 'group-' + Math.random().toString(36).slice(2);

      await communityMessagingService.sendGroupMessage({
        groupId,
        senderId: 'parent1',
        senderName: 'Sender 1',
        message: 'First message',
      });

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      await communityMessagingService.sendGroupMessage({
        groupId,
        senderId: 'parent2',
        senderName: 'Sender 2',
        message: 'Second message',
      });

      const messages = await communityMessagingService.getGroupMessages(groupId);

      assert.equal(messages.length, 2);
      const time1 = new Date(messages[0].timestamp).getTime();
      const time2 = new Date(messages[1].timestamp).getTime();
      assert.ok(time1 <= time2);
    });
  });
});
