import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { sessionSchedulingService } from '@/services/group-session/session-scheduling-service';
import { sessionCrudService } from '@/services/group-session/session-crud-service';
import { sessionRegistrationService } from '@/services/group-session/session-registration-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { GroupSession, RecurringPattern } from '@/constants/types';

describe('SessionSchedulingService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.GROUP_SESSIONS);
    await apiClient.remove(STORAGE_KEYS.GROUP_REGISTRATIONS);
  });

  describe('getClubTrainingSessions', () => {
    it('should return published training sessions for club', async () => {
      const clubId = 'test-club-' + Math.random().toString(36).slice(2);

      const session = await sessionCrudService.createSession({
        coachId: 'test-coach',
        coachName: 'Test Coach',
        clubId,
        clubName: 'Test Club',
        title: 'Club Training',
        description: 'Training session for club',
        sessionType: 'TRAINING',
        schedule: [{ date: '2026-06-01', startTime: '18:00', endTime: '20:00' }],
        maxParticipants: 20,
        pricePerParticipant: 15,
        location: 'Club Ground',
        isVirtual: false,
      });

      await sessionCrudService.publishSession(session.id);

      const sessions = await sessionSchedulingService.getClubTrainingSessions(clubId);

      assert.ok(Array.isArray(sessions));
      assert.ok(sessions.some(s => s.id === session.id));
      assert.ok(sessions.every(s => s.clubId === clubId));
      assert.ok(sessions.every(s => s.sessionType === 'TRAINING'));
      assert.ok(sessions.every(s => s.status === 'PUBLISHED'));
    });

    it('should return empty array for club with no training sessions', async () => {
      const clubId = 'test-club-empty-' + Math.random().toString(36).slice(2);
      const sessions = await sessionSchedulingService.getClubTrainingSessions(clubId);

      assert.ok(Array.isArray(sessions));
      assert.equal(sessions.length, 0);
    });
  });

  describe('getSquadTrainingSessions', () => {
    it('should return published training sessions for squad', async () => {
      const squadId = 'test-squad-' + Math.random().toString(36).slice(2);

      const session = await sessionCrudService.createSession({
        coachId: 'test-coach',
        coachName: 'Test Coach',
        squadId,
        title: 'Squad Training',
        description: 'Training session for squad',
        sessionType: 'TRAINING',
        schedule: [{ date: '2026-07-01', startTime: '17:00', endTime: '19:00' }],
        maxParticipants: 15,
        pricePerParticipant: 10,
        location: 'Training Ground',
        isVirtual: false,
      });

      await sessionCrudService.publishSession(session.id);

      const sessions = await sessionSchedulingService.getSquadTrainingSessions(squadId);

      assert.ok(Array.isArray(sessions));
      assert.ok(sessions.some(s => s.id === session.id));
      assert.ok(sessions.every(s => s.squadId === squadId));
      assert.ok(sessions.every(s => s.sessionType === 'TRAINING'));
    });

    it('should return empty array for squad with no training sessions', async () => {
      const squadId = 'test-squad-empty-' + Math.random().toString(36).slice(2);
      const sessions = await sessionSchedulingService.getSquadTrainingSessions(squadId);

      assert.ok(Array.isArray(sessions));
      assert.equal(sessions.length, 0);
    });
  });

  describe('getChildTrainingSessions', () => {
    it('should return training sessions child is registered for', async () => {
      const childId = 'test-child-' + Math.random().toString(36).slice(2);

      const session = await sessionCrudService.createSession({
        coachId: 'test-coach',
        coachName: 'Test Coach',
        title: 'Child Training',
        description: 'Training session',
        sessionType: 'TRAINING',
        schedule: [{ date: '2026-08-01', startTime: '16:00', endTime: '18:00' }],
        maxParticipants: 12,
        pricePerParticipant: 12,
        location: 'Field',
        isVirtual: false,
      });

      await sessionCrudService.publishSession(session.id);

      await sessionRegistrationService.register({
        sessionId: session.id,
        athleteId: childId,
        athleteName: 'Test Child',
        parentId: 'parent1',
        parentName: 'Parent 1',
      });

      const sessions = await sessionSchedulingService.getChildTrainingSessions(childId);

      assert.ok(Array.isArray(sessions));
      assert.ok(sessions.some(s => s.id === session.id));
      assert.ok(sessions.every(s => s.sessionType === 'TRAINING'));
    });

    it('should return empty array for child with no training sessions', async () => {
      const childId = 'test-child-empty-' + Math.random().toString(36).slice(2);
      const sessions = await sessionSchedulingService.getChildTrainingSessions(childId);

      assert.ok(Array.isArray(sessions));
      assert.equal(sessions.length, 0);
    });
  });

  describe('formatDayOfWeek', () => {
    it('should format day 0 as Sunday', () => {
      const result = sessionSchedulingService.formatDayOfWeek(0);
      assert.equal(result, 'Sunday');
    });

    it('should format day 1 as Monday', () => {
      const result = sessionSchedulingService.formatDayOfWeek(1);
      assert.equal(result, 'Monday');
    });

    it('should format day 6 as Saturday', () => {
      const result = sessionSchedulingService.formatDayOfWeek(6);
      assert.equal(result, 'Saturday');
    });

    it('should handle invalid day numbers', () => {
      const result = sessionSchedulingService.formatDayOfWeek(7);
      assert.ok(result.includes('7'));
    });
  });

  describe('formatRecurringPattern', () => {
    it('should format recurring pattern correctly', () => {
      const pattern: RecurringPattern = {
        type: 'WEEKLY',
        dayOfWeek: 2,
        startTime: '18:00',
        endTime: '20:00',
      };

      const result = sessionSchedulingService.formatRecurringPattern(pattern);

      assert.ok(result.includes('Tuesday'));
      assert.ok(result.includes('18:00'));
      assert.ok(result.includes('20:00'));
    });

    it('should format Friday pattern', () => {
      const pattern: RecurringPattern = {
        type: 'WEEKLY',
        dayOfWeek: 5,
        startTime: '17:00',
        endTime: '19:00',
      };

      const result = sessionSchedulingService.formatRecurringPattern(pattern);

      assert.ok(result.includes('Friday'));
      assert.ok(result.includes('17:00'));
      assert.ok(result.includes('19:00'));
    });
  });

  describe('getNextTrainingDate', () => {
    it('should return next upcoming schedule', () => {
      const futureDate1 = new Date();
      futureDate1.setDate(futureDate1.getDate() + 10);
      const futureDate2 = new Date();
      futureDate2.setDate(futureDate2.getDate() + 20);

      const session: GroupSession = {
        id: 'test',
        coachId: 'coach1',
        coachName: 'Coach',
        title: 'Test',
        description: 'Test',
        sessionType: 'TRAINING',
        schedule: [
          { date: futureDate1.toISOString().split('T')[0], startTime: '18:00', endTime: '20:00' },
          { date: futureDate2.toISOString().split('T')[0], startTime: '18:00', endTime: '20:00' },
        ],
        maxParticipants: 20,
        currentParticipants: 0,
        pricePerParticipant: 15,
        currency: 'GBP',
        location: 'Test',
        isVirtual: false,
        status: 'PUBLISHED',
        createdAt: new Date().toISOString(),
        waitlistEnabled: false,
        waitlistCount: 0,
      };

      const next = sessionSchedulingService.getNextTrainingDate(session);

      assert.ok(next);
      assert.equal(next.date, futureDate1.toISOString().split('T')[0]);
    });

    it('should return null when all dates are past', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const session: GroupSession = {
        id: 'test',
        coachId: 'coach1',
        coachName: 'Coach',
        title: 'Test',
        description: 'Test',
        sessionType: 'TRAINING',
        schedule: [
          { date: pastDate.toISOString().split('T')[0], startTime: '18:00', endTime: '20:00' },
        ],
        maxParticipants: 20,
        currentParticipants: 0,
        pricePerParticipant: 15,
        currency: 'GBP',
        location: 'Test',
        isVirtual: false,
        status: 'PUBLISHED',
        createdAt: new Date().toISOString(),
        waitlistEnabled: false,
        waitlistCount: 0,
      };

      const next = sessionSchedulingService.getNextTrainingDate(session);

      assert.equal(next, null);
    });
  });
});
