import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { rsvpService } from '@/services/rsvp-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('RsvpService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SESSION_RSVPS);
  });

  describe('createForSession', () => {
    it('should create RSVPs for all members', async () => {
      const sessionId = 'test-session-' + Math.random().toString(36).slice(2);
      const members = [
        {
          userId: 'test-user-1-' + Math.random().toString(36).slice(2),
          childId: 'test-child-1',
          childName: 'Child One',
        },
        {
          userId: 'test-user-2-' + Math.random().toString(36).slice(2),
          childId: 'test-child-2',
          childName: 'Child Two',
        },
      ];

      const rsvps = await rsvpService.createForSession(sessionId, members);

      assert.equal(rsvps.length, 2);
      assert.equal(rsvps[0].sessionId, sessionId);
      assert.equal(rsvps[0].status, 'pending');
      assert.equal(rsvps[1].sessionId, sessionId);
      assert.equal(rsvps[1].status, 'pending');
    });

    it('should skip duplicate RSVPs for same user and session', async () => {
      const sessionId = 'test-session-' + Math.random().toString(36).slice(2);
      const members = [
        {
          userId: 'test-user-' + Math.random().toString(36).slice(2),
          childId: 'test-child',
          childName: 'Child',
        },
      ];

      await rsvpService.createForSession(sessionId, members);
      const secondCall = await rsvpService.createForSession(sessionId, members);

      assert.equal(secondCall.length, 0); // No new RSVPs created
    });

    it('should handle members without child details', async () => {
      const sessionId = 'test-session-' + Math.random().toString(36).slice(2);
      const members = [
        {
          userId: 'test-user-' + Math.random().toString(36).slice(2),
        },
      ];

      const rsvps = await rsvpService.createForSession(sessionId, members);

      assert.equal(rsvps.length, 1);
      assert.ok(rsvps[0].id);
      assert.equal(rsvps[0].status, 'pending');
    });
  });

  describe('respond', () => {
    it('should update RSVP status to going', async () => {
      const sessionId = 'test-session-' + Math.random().toString(36).slice(2);
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const rsvps = await rsvpService.createForSession(sessionId, [{ userId }]);
      const rsvpId = rsvps[0].id;

      const result = await rsvpService.respond(rsvpId, 'going');

      assert.ok(result.success);
      assert.equal(result.data.status, 'going');
      assert.ok(result.data.respondedAt);
    });

    it('should update RSVP status to not_going', async () => {
      const sessionId = 'test-session-' + Math.random().toString(36).slice(2);
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const rsvps = await rsvpService.createForSession(sessionId, [{ userId }]);
      const rsvpId = rsvps[0].id;

      const result = await rsvpService.respond(rsvpId, 'not_going');

      assert.ok(result.success);
      assert.equal(result.data.status, 'not_going');
    });

    it('should update RSVP status to maybe', async () => {
      const sessionId = 'test-session-' + Math.random().toString(36).slice(2);
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const rsvps = await rsvpService.createForSession(sessionId, [{ userId }]);
      const rsvpId = rsvps[0].id;

      const result = await rsvpService.respond(rsvpId, 'maybe');

      assert.ok(result.success);
      assert.equal(result.data.status, 'maybe');
    });

    it('should return error for non-existent RSVP', async () => {
      const result = await rsvpService.respond('nonexistent-id', 'going');

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });

  describe('getForSession', () => {
    it('should get all RSVPs for a session', async () => {
      const sessionId = 'test-session-' + Math.random().toString(36).slice(2);
      const members = [
        { userId: 'test-user-1-' + Math.random().toString(36).slice(2) },
        { userId: 'test-user-2-' + Math.random().toString(36).slice(2) },
        { userId: 'test-user-3-' + Math.random().toString(36).slice(2) },
      ];

      await rsvpService.createForSession(sessionId, members);

      const result = await rsvpService.getForSession(sessionId);

      assert.ok(result.success);
      assert.equal(result.data.length, 3);
    });

    it('should return empty array for session with no RSVPs', async () => {
      const result = await rsvpService.getForSession('nonexistent-session');

      assert.ok(result.success);
      assert.equal(result.data.length, 0);
    });
  });

  describe('getForUser', () => {
    it('should get all RSVPs for a user', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const session1 = 'test-session-1-' + Math.random().toString(36).slice(2);
      const session2 = 'test-session-2-' + Math.random().toString(36).slice(2);

      await rsvpService.createForSession(session1, [{ userId }]);
      await rsvpService.createForSession(session2, [{ userId }]);

      const result = await rsvpService.getForUser(userId);

      assert.ok(result.success);
      assert.equal(result.data.length, 2);
    });

    it('should return empty array for user with no RSVPs', async () => {
      const result = await rsvpService.getForUser('nonexistent-user');

      assert.ok(result.success);
      assert.equal(result.data.length, 0);
    });
  });

  describe('getSummary', () => {
    it('should provide accurate RSVP counts', async () => {
      const sessionId = 'test-session-' + Math.random().toString(36).slice(2);
      const members = [
        { userId: 'test-user-1-' + Math.random().toString(36).slice(2) },
        { userId: 'test-user-2-' + Math.random().toString(36).slice(2) },
        { userId: 'test-user-3-' + Math.random().toString(36).slice(2) },
        { userId: 'test-user-4-' + Math.random().toString(36).slice(2) },
      ];

      const rsvps = await rsvpService.createForSession(sessionId, members);

      // Respond with different statuses
      await rsvpService.respond(rsvps[0].id, 'going');
      await rsvpService.respond(rsvps[1].id, 'going');
      await rsvpService.respond(rsvps[2].id, 'not_going');
      // Leave rsvps[3] as pending

      const result = await rsvpService.getSummary(sessionId);

      assert.ok(result.success);
      assert.equal(result.data.going, 2);
      assert.equal(result.data.notGoing, 1);
      assert.equal(result.data.maybe, 0);
      assert.equal(result.data.pending, 1);
      assert.equal(result.data.total, 4);
    });

    it('should return zero counts for session with no RSVPs', async () => {
      const result = await rsvpService.getSummary('nonexistent-session');

      assert.ok(result.success);
      assert.equal(result.data.going, 0);
      assert.equal(result.data.notGoing, 0);
      assert.equal(result.data.maybe, 0);
      assert.equal(result.data.pending, 0);
      assert.equal(result.data.total, 0);
    });
  });
});
