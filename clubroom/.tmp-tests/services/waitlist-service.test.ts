import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { waitlistService } from '@/services/waitlist-service';
import { storageService } from '@/services/storage-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('WaitlistService', () => {
  beforeEach(async () => {
    await storageService.removeItem(STORAGE_KEYS.WAITLIST);
  });

  describe('joinWaitlist', () => {
    it('should add user to waitlist', async () => {
      const params = {
        userId: 'test-user-' + Math.random().toString(36).slice(2),
        userName: 'Test User',
        sessionId: 'test-session-' + Math.random().toString(36).slice(2),
        sessionTitle: 'Full Session',
        sessionScheduledAt: new Date().toISOString(),
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
      };

      const entry = await waitlistService.joinWaitlist(params);

      assert.ok(entry.id);
      assert.equal(entry.userId, params.userId);
      assert.equal(entry.sessionId, params.sessionId);
      assert.equal(entry.status, 'WAITING');
      assert.equal(entry.position, 1);
      assert.equal(entry.autoBook, false);
    });

    it('should assign correct position in queue', async () => {
      const sessionId = 'test-session-' + Math.random().toString(36).slice(2);

      const entry1 = await waitlistService.joinWaitlist({
        userId: 'user1',
        userName: 'User One',
        sessionId,
        sessionTitle: 'Session',
        sessionScheduledAt: new Date().toISOString(),
        coachId: 'coach1',
        coachName: 'Coach',
      });

      const entry2 = await waitlistService.joinWaitlist({
        userId: 'user2',
        userName: 'User Two',
        sessionId,
        sessionTitle: 'Session',
        sessionScheduledAt: new Date().toISOString(),
        coachId: 'coach1',
        coachName: 'Coach',
      });

      assert.equal(entry1.position, 1);
      assert.equal(entry2.position, 2);
    });

    it('should return existing entry if user already on waitlist', async () => {
      const params = {
        userId: 'test-user-' + Math.random().toString(36).slice(2),
        userName: 'Test User',
        sessionId: 'test-session-' + Math.random().toString(36).slice(2),
        sessionTitle: 'Session',
        sessionScheduledAt: new Date().toISOString(),
        coachId: 'coach1',
        coachName: 'Coach',
      };

      const entry1 = await waitlistService.joinWaitlist(params);
      const entry2 = await waitlistService.joinWaitlist(params);

      assert.equal(entry1.id, entry2.id);
    });

    it('should handle autoBook option', async () => {
      const params = {
        userId: 'test-user-' + Math.random().toString(36).slice(2),
        userName: 'Test User',
        sessionId: 'test-session-' + Math.random().toString(36).slice(2),
        sessionTitle: 'Session',
        sessionScheduledAt: new Date().toISOString(),
        coachId: 'coach1',
        coachName: 'Coach',
        autoBook: true,
      };

      const entry = await waitlistService.joinWaitlist(params);

      assert.equal(entry.autoBook, true);
    });

    it('should handle optional notes', async () => {
      const params = {
        userId: 'test-user-' + Math.random().toString(36).slice(2),
        userName: 'Test User',
        sessionId: 'test-session-' + Math.random().toString(36).slice(2),
        sessionTitle: 'Session',
        sessionScheduledAt: new Date().toISOString(),
        coachId: 'coach1',
        coachName: 'Coach',
        notes: 'Prefer morning slot',
      };

      const entry = await waitlistService.joinWaitlist(params);

      assert.equal(entry.notes, 'Prefer morning slot');
    });
  });

  describe('leaveWaitlist', () => {
    it('should remove user from waitlist', async () => {
      const params = {
        userId: 'test-user-' + Math.random().toString(36).slice(2),
        userName: 'Test User',
        sessionId: 'test-session-' + Math.random().toString(36).slice(2),
        sessionTitle: 'Session',
        sessionScheduledAt: new Date().toISOString(),
        coachId: 'coach1',
        coachName: 'Coach',
      };

      const entry = await waitlistService.joinWaitlist(params);
      await waitlistService.leaveWaitlist(entry.id);

      const updated = await waitlistService.getEntryById(entry.id);

      assert.ok(updated);
      assert.equal(updated.status, 'CANCELLED');
    });

    it('should return false for non-existent entry', async () => {
      const result = await waitlistService.leaveWaitlist('nonexistent-id');

      assert.equal(result, false);
    });
  });

  describe('getWaitlistForSession', () => {
    it('should return all waiting entries for session', async () => {
      const sessionId = 'test-session-' + Math.random().toString(36).slice(2);

      await waitlistService.joinWaitlist({
        userId: 'user1',
        userName: 'User One',
        sessionId,
        sessionTitle: 'Session',
        sessionScheduledAt: new Date().toISOString(),
        coachId: 'coach1',
        coachName: 'Coach',
      });

      await waitlistService.joinWaitlist({
        userId: 'user2',
        userName: 'User Two',
        sessionId,
        sessionTitle: 'Session',
        sessionScheduledAt: new Date().toISOString(),
        coachId: 'coach1',
        coachName: 'Coach',
      });

      const waitlist = await waitlistService.getWaitlistForSession(sessionId);

      assert.equal(waitlist.length, 2);
    });

    it('should return empty array for session with no waitlist', async () => {
      const waitlist = await waitlistService.getWaitlistForSession('nonexistent-session');

      assert.equal(waitlist.length, 0);
    });
  });

  describe('getWaitlistForUser', () => {
    it('should return all waiting entries for user', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      await waitlistService.joinWaitlist({
        userId,
        userName: 'Test User',
        sessionId: 'session1',
        sessionTitle: 'Session One',
        sessionScheduledAt: new Date().toISOString(),
        coachId: 'coach1',
        coachName: 'Coach',
      });

      await waitlistService.joinWaitlist({
        userId,
        userName: 'Test User',
        sessionId: 'session2',
        sessionTitle: 'Session Two',
        sessionScheduledAt: new Date().toISOString(),
        coachId: 'coach1',
        coachName: 'Coach',
      });

      const waitlist = await waitlistService.getWaitlistForUser(userId);

      assert.equal(waitlist.length, 2);
    });
  });

  describe('getWaitlistSummary', () => {
    it('should return summary with correct counts', async () => {
      const sessionId = 'test-session-' + Math.random().toString(36).slice(2);

      await waitlistService.joinWaitlist({
        userId: 'user1',
        userName: 'User One',
        sessionId,
        sessionTitle: 'Session',
        sessionScheduledAt: new Date().toISOString(),
        coachId: 'coach1',
        coachName: 'Coach',
        autoBook: true,
      });

      await waitlistService.joinWaitlist({
        userId: 'user2',
        userName: 'User Two',
        sessionId,
        sessionTitle: 'Session',
        sessionScheduledAt: new Date().toISOString(),
        coachId: 'coach1',
        coachName: 'Coach',
      });

      const summary = await waitlistService.getWaitlistSummary(sessionId);

      assert.equal(summary.totalWaiting, 2);
      assert.equal(summary.autoBookCount, 1);
      assert.equal(summary.nextInLine?.userName, 'User One');
    });

    it('should return zero counts for empty waitlist', async () => {
      const summary = await waitlistService.getWaitlistSummary('nonexistent-session');

      assert.equal(summary.totalWaiting, 0);
      assert.equal(summary.autoBookCount, 0);
      assert.equal(summary.nextInLine, undefined);
    });
  });

  describe('notifyNextInLine', () => {
    it('should notify user when spot opens', async () => {
      const sessionId = 'test-session-' + Math.random().toString(36).slice(2);

      const entry = await waitlistService.joinWaitlist({
        userId: 'user1',
        userName: 'User One',
        sessionId,
        sessionTitle: 'Session',
        sessionScheduledAt: new Date().toISOString(),
        coachId: 'coach1',
        coachName: 'Coach',
      });

      const result = await waitlistService.notifyNextInLine(sessionId);

      assert.ok(result);
      assert.equal(result.id, entry.id);
      assert.equal(result.status, 'NOTIFIED');
      assert.ok(result.notifiedAt);
    });

    it('should return null when waitlist is empty', async () => {
      const result = await waitlistService.notifyNextInLine('nonexistent-session');

      assert.equal(result, null);
    });
  });

  describe('markAsBooked', () => {
    it('should mark entry as booked', async () => {
      const params = {
        userId: 'test-user-' + Math.random().toString(36).slice(2),
        userName: 'Test User',
        sessionId: 'test-session-' + Math.random().toString(36).slice(2),
        sessionTitle: 'Session',
        sessionScheduledAt: new Date().toISOString(),
        coachId: 'coach1',
        coachName: 'Coach',
      };

      const entry = await waitlistService.joinWaitlist(params);
      const bookingId = 'test-booking-' + Math.random().toString(36).slice(2);

      await waitlistService.markAsBooked(entry.id, bookingId);

      const updated = await waitlistService.getEntryById(entry.id);

      assert.ok(updated);
      assert.equal(updated.status, 'BOOKED');
      assert.equal(updated.bookingId, bookingId);
    });

    it('should return false for non-existent entry', async () => {
      const result = await waitlistService.markAsBooked('nonexistent-id', 'booking1');

      assert.equal(result, false);
    });
  });
});
