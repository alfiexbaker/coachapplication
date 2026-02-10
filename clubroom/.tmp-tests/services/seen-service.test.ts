import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { seenService } from '@/services/seen-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('SeenService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SEEN_STATUSES);
  });

  describe('markSeen', () => {
    it('should mark entity as seen', async () => {
      const entityId = 'test-msg-' + Math.random().toString(36).slice(2);
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      await seenService.markSeen('message', entityId, userId);

      const status = await seenService.getSeenStatus('message', entityId);

      assert.ok(status);
      assert.equal(status.seenBy, userId);
      assert.ok(status.seenAt);
    });

    it('should not create duplicate entries', async () => {
      const entityId = 'test-msg-' + Math.random().toString(36).slice(2);
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      await seenService.markSeen('message', entityId, userId);
      await seenService.markSeen('message', entityId, userId);

      const entries = await apiClient.get<any[]>(STORAGE_KEYS.SEEN_STATUSES, []);
      const matchingEntries = entries.filter(
        (e) => e.entityType === 'message' && e.entityId === entityId && e.seenBy === userId
      );

      assert.equal(matchingEntries.length, 1);
    });

    it('should handle different entity types', async () => {
      const entityId = 'test-entity-' + Math.random().toString(36).slice(2);
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      await seenService.markSeen('notification', entityId, userId);

      const status = await seenService.getSeenStatus('notification', entityId);

      assert.ok(status);
      assert.equal(status.seenBy, userId);
    });

    it('should allow different users to mark same entity as seen', async () => {
      const entityId = 'test-msg-' + Math.random().toString(36).slice(2);
      const user1 = 'test-user-1-' + Math.random().toString(36).slice(2);
      const user2 = 'test-user-2-' + Math.random().toString(36).slice(2);

      await seenService.markSeen('message', entityId, user1);
      await seenService.markSeen('message', entityId, user2);

      const entries = await apiClient.get<any[]>(STORAGE_KEYS.SEEN_STATUSES, []);
      const matchingEntries = entries.filter(
        (e) => e.entityType === 'message' && e.entityId === entityId
      );

      assert.equal(matchingEntries.length, 2);
    });
  });

  describe('getSeenStatus', () => {
    it('should return null for unseen entity', async () => {
      const status = await seenService.getSeenStatus('message', 'nonexistent-id');

      assert.equal(status, null);
    });

    it('should return status for seen entity', async () => {
      const entityId = 'test-msg-' + Math.random().toString(36).slice(2);
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      await seenService.markSeen('message', entityId, userId);

      const status = await seenService.getSeenStatus('message', entityId);

      assert.ok(status);
      assert.equal(status.seenBy, userId);
    });

    it('should differentiate by entity type', async () => {
      const entityId = 'test-entity-' + Math.random().toString(36).slice(2);
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      await seenService.markSeen('message', entityId, userId);

      const messageStatus = await seenService.getSeenStatus('message', entityId);
      const notificationStatus = await seenService.getSeenStatus('notification', entityId);

      assert.ok(messageStatus);
      assert.equal(notificationStatus, null);
    });
  });

  describe('getSeenStatuses', () => {
    it('should return empty array for no matches', async () => {
      const statuses = await seenService.getSeenStatuses('message', ['id1', 'id2', 'id3']);

      assert.equal(statuses.length, 0);
    });

    it('should return statuses for multiple entities', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const id1 = 'test-msg-1-' + Math.random().toString(36).slice(2);
      const id2 = 'test-msg-2-' + Math.random().toString(36).slice(2);
      const id3 = 'test-msg-3-' + Math.random().toString(36).slice(2);

      await seenService.markSeen('message', id1, userId);
      await seenService.markSeen('message', id2, userId);
      await seenService.markSeen('message', id3, userId);

      const statuses = await seenService.getSeenStatuses('message', [id1, id2, id3]);

      assert.equal(statuses.length, 3);
      assert.ok(statuses.every((s) => s.seenBy === userId));
    });

    it('should return partial results when some entities are unseen', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const id1 = 'test-msg-1-' + Math.random().toString(36).slice(2);
      const id2 = 'test-msg-2-' + Math.random().toString(36).slice(2);

      await seenService.markSeen('message', id1, userId);
      // id2 not marked as seen

      const statuses = await seenService.getSeenStatuses('message', [id1, id2]);

      assert.equal(statuses.length, 1);
      assert.equal(statuses[0].entityId, id1);
    });

    it('should filter by entity type correctly', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const id1 = 'test-entity-' + Math.random().toString(36).slice(2);

      await seenService.markSeen('message', id1, userId);

      const messageStatuses = await seenService.getSeenStatuses('message', [id1]);
      const notificationStatuses = await seenService.getSeenStatuses('notification', [id1]);

      assert.equal(messageStatuses.length, 1);
      assert.equal(notificationStatuses.length, 0);
    });
  });

  describe('hasUserSeen', () => {
    it('should return false for unseen entity', async () => {
      const entityId = 'test-msg-' + Math.random().toString(36).slice(2);
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const hasSeen = await seenService.hasUserSeen('message', entityId, userId);

      assert.equal(hasSeen, false);
    });

    it('should return true when user has seen entity', async () => {
      const entityId = 'test-msg-' + Math.random().toString(36).slice(2);
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      await seenService.markSeen('message', entityId, userId);

      const hasSeen = await seenService.hasUserSeen('message', entityId, userId);

      assert.equal(hasSeen, true);
    });

    it('should return false when different user has seen entity', async () => {
      const entityId = 'test-msg-' + Math.random().toString(36).slice(2);
      const user1 = 'test-user-1-' + Math.random().toString(36).slice(2);
      const user2 = 'test-user-2-' + Math.random().toString(36).slice(2);

      await seenService.markSeen('message', entityId, user1);

      const hasSeen = await seenService.hasUserSeen('message', entityId, user2);

      assert.equal(hasSeen, false);
    });
  });
});
