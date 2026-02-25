import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { communityMessagingService } from '@/services/community/community-messaging-service';
import { communityGroupService } from '@/services/community/community-group-service';
import type { Result, ServiceError } from '@/types/result';

function expectOk<T>(result: Result<T, ServiceError>): T {
  assert.equal(result.success, true);
  return result.data;
}

let seq = 0;

function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}_${seq}`;
}

describe('CommunityMessagingService', () => {
  beforeEach(async () => {
    seq = 0;
    (communityMessagingService as unknown as { inMemoryMessages: Record<string, unknown[]> }).inMemoryMessages = {};
    // Clear group mock data so member checks don't block test senders
    (communityGroupService as unknown as { inMemoryGroups: unknown[] }).inMemoryGroups = [];
    await apiClient.set(STORAGE_KEYS.PARENT_GROUPS, []);
    await apiClient.set(STORAGE_KEYS.GROUP_MESSAGES, {});
  });

  describe('getGroupMessages', () => {
    it('returns an empty array when group has no messages', async () => {
      const groupId = nextId('group');
      const messages = expectOk(await communityMessagingService.getGroupMessages(groupId));

      assert.deepEqual(messages, []);
    });
  });

  describe('sendGroupMessage', () => {
    it('creates a message and persists it', async () => {
      const groupId = nextId('group');
      const senderId = nextId('parent');

      const message = expectOk(await communityMessagingService.sendGroupMessage(
        groupId,
        senderId,
        'Sender Name',
        'Hello world',
      ));

      assert.ok(message.id);
      assert.equal(message.groupId, groupId);
      assert.equal(message.senderId, senderId);
      assert.equal(message.body, 'Hello world');
      assert.ok(message.readBy.includes(senderId));

      const stored = expectOk(await communityMessagingService.getGroupMessages(groupId));
      assert.equal(stored.length, 1);
      assert.equal(stored[0].body, 'Hello world');
    });
  });

  describe('markMessagesRead', () => {
    it('marks all group messages as read by the reader without duplication', async () => {
      const groupId = nextId('group');
      const readerId = nextId('reader');

      expectOk(await communityMessagingService.sendGroupMessage(groupId, 'parent_a', 'A', 'Message 1'));
      expectOk(await communityMessagingService.sendGroupMessage(groupId, 'parent_b', 'B', 'Message 2'));

      expectOk(await communityMessagingService.markMessagesRead(groupId, readerId));
      expectOk(await communityMessagingService.markMessagesRead(groupId, readerId));

      const messages = expectOk(await communityMessagingService.getGroupMessages(groupId));
      assert.equal(messages.length, 2);
      assert.ok(messages.every((message) => message.readBy.includes(readerId)));
      assert.ok(messages.every((message) => message.readBy.filter((id) => id === readerId).length === 1));
    });
  });

  describe('ordering', () => {
    it('returns messages in chronological order', async () => {
      const groupId = nextId('group');

      expectOk(await communityMessagingService.sendGroupMessage(groupId, 'parent_1', 'Parent 1', 'First'));
      await new Promise((resolve) => setTimeout(resolve, 10));
      expectOk(await communityMessagingService.sendGroupMessage(groupId, 'parent_2', 'Parent 2', 'Second'));

      const messages = expectOk(await communityMessagingService.getGroupMessages(groupId));
      assert.equal(messages.length, 2);
      assert.ok(new Date(messages[0].createdAt).getTime() <= new Date(messages[1].createdAt).getTime());
    });
  });
});
