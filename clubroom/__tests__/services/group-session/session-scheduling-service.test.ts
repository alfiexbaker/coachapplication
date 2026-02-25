/**
 * Session Scheduling Service Tests
 *
 * Tests for training session queries and recurring pattern utilities.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { sessionSchedulingService } from '@/services/group-session/session-scheduling-service';
import type { GroupSession } from '@/constants/types';

describe('sessionSchedulingService', () => {
  describe('getClubTrainingSessions', () => {
    test('returns array of training sessions', async () => {
      const sessions = await sessionSchedulingService.getClubTrainingSessions('club_1');
      assert.ok(Array.isArray(sessions));
    });
  });

  describe('getSquadTrainingSessions', () => {
    test('returns array of training sessions', async () => {
      const sessions = await sessionSchedulingService.getSquadTrainingSessions('squad_1');
      assert.ok(Array.isArray(sessions));
    });
  });

  describe('getChildTrainingSessions', () => {
    test('returns array for a registered child', async () => {
      const sessions = await sessionSchedulingService.getChildTrainingSessions('user1');
      assert.ok(Array.isArray(sessions));
    });
  });

  describe('formatDayOfWeek', () => {
    test('formats known days', () => {
      assert.equal(sessionSchedulingService.formatDayOfWeek(0), 'Sunday');
      assert.equal(sessionSchedulingService.formatDayOfWeek(1), 'Monday');
      assert.equal(sessionSchedulingService.formatDayOfWeek(6), 'Saturday');
    });

    test('returns fallback for invalid day', () => {
      const result = sessionSchedulingService.formatDayOfWeek(99);
      assert.ok(result.includes('99'));
    });
  });

  describe('formatRecurringPattern', () => {
    test('formats a pattern', () => {
      const result = sessionSchedulingService.formatRecurringPattern({
        dayOfWeek: 2,
        startTime: '09:00',
        endTime: '10:00',
      });
      assert.ok(result.includes('Tuesday'));
      assert.ok(result.includes('09:00'));
      assert.ok(result.includes('10:00'));
    });
  });

  describe('getNextTrainingDate', () => {
    test('returns null for session with no future dates', () => {
      const session = {
        schedule: [{ date: '2020-01-01', startTime: '09:00', endTime: '10:00' }],
      } as unknown as GroupSession;
      assert.equal(sessionSchedulingService.getNextTrainingDate(session), null);
    });

    test('returns next date for session with future dates', () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const session = {
        schedule: [
          { date: '2020-01-01', startTime: '09:00', endTime: '10:00' },
          { date: futureDate, startTime: '09:00', endTime: '10:00' },
        ],
      } as unknown as GroupSession;
      const next = sessionSchedulingService.getNextTrainingDate(session);
      assert.ok(next);
      assert.equal(next!.date, futureDate);
    });
  });
});
