/**
 * Community Messaging Service Tests
 *
 * Tests for group messaging: getGroupMessages, sendGroupMessage,
 * markMessagesRead.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { communityMessagingService } from '../../services/community/community-messaging-service';
import { storageService } from '../../services/storage-service';

const rid = () => Math.random().toString(36).slice(2, 10);

describe('communityMessagingService', () => {
  // ---------------------------------------------------------------------------
  // getGroupMessages
  // ---------------------------------------------------------------------------
  describe('getGroupMessages', () => {
    test('returns messages for a group with mock data', async () => {
      const messages = await communityMessagingService.getGroupMessages('group_1');
      assert.ok(Array.isArray(messages));
      assert.ok(messages.length > 0);
    });

    test('returns empty array for unknown group', async () => {
      const messages = await communityMessagingService.getGroupMessages(`unknown_${rid()}`);
      assert.ok(Array.isArray(messages));
    });

    test('messages are sorted by createdAt ascending', async () => {
      const messages = await communityMessagingService.getGroupMessages('group_1');
      for (let i = 1; i < messages.length; i++) {
        assert.ok(
          new Date(messages[i].createdAt).getTime() >= new Date(messages[i - 1].createdAt).getTime()
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // sendGroupMessage
  // ---------------------------------------------------------------------------
  describe('sendGroupMessage', () => {
    test('creates a new message in the group', async () => {
      const groupId = `grp_${rid()}`;
      const msg = await communityMessagingService.sendGroupMessage(
        groupId, `parent_${rid()}`, 'Test Parent', 'Hello group!'
      );

      assert.ok(msg.id);
      assert.equal(msg.groupId, groupId);
      assert.equal(msg.body, 'Hello group!');
      assert.equal(msg.status, 'sent');
    });

    test('message is retrievable after sending', async () => {
      const groupId = `grp_${rid()}`;
      await communityMessagingService.sendGroupMessage(
        groupId, `p_${rid()}`, 'P', 'Persist test'
      );

      const messages = await communityMessagingService.getGroupMessages(groupId);
      assert.ok(messages.some((m) => m.body === 'Persist test'));
    });

    test('sender is included in readBy', async () => {
      const senderId = `parent_${rid()}`;
      const msg = await communityMessagingService.sendGroupMessage(
        `grp_${rid()}`, senderId, 'S', 'Read test'
      );

      assert.ok(msg.readBy.includes(senderId));
    });
  });

  // ---------------------------------------------------------------------------
  // markMessagesRead
  // ---------------------------------------------------------------------------
  describe('markMessagesRead', () => {
    test('adds parentId to readBy of all messages', async () => {
      const groupId = `grp_${rid()}`;
      const sender = `p_${rid()}`;
      const reader = `p_${rid()}`;

      await communityMessagingService.sendGroupMessage(groupId, sender, 'S', 'Msg 1');
      await communityMessagingService.sendGroupMessage(groupId, sender, 'S', 'Msg 2');

      await communityMessagingService.markMessagesRead(groupId, reader);

      const messages = await communityMessagingService.getGroupMessages(groupId);
      for (const msg of messages) {
        assert.ok(msg.readBy.includes(reader), `Message ${msg.id} should be marked as read`);
      }
    });

    test('does not duplicate readBy entries', async () => {
      const groupId = `grp_${rid()}`;
      const sender = `p_${rid()}`;

      await communityMessagingService.sendGroupMessage(groupId, sender, 'S', 'M');
      await communityMessagingService.markMessagesRead(groupId, sender);
      await communityMessagingService.markMessagesRead(groupId, sender);

      const messages = await communityMessagingService.getGroupMessages(groupId);
      for (const msg of messages) {
        const count = msg.readBy.filter((id: string) => id === sender).length;
        assert.equal(count, 1);
      }
    });
  });
});
