import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { sessionCrudService } from '@/services/group-session/session-crud-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { GroupSession } from '@/constants/types';

describe('SessionCrudService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.GROUP_SESSIONS);
  });

  describe('createSession', () => {
    it('should create group session successfully', async () => {
      const input = {
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        title: 'Test Session',
        description: 'A test group session',
        sessionType: 'CLINIC' as const,
        schedule: [
          { date: '2026-06-01', startTime: '10:00', endTime: '12:00' },
        ],
        maxParticipants: 10,
        pricePerParticipant: 45,
        currency: 'GBP',
        ageMin: 8,
        ageMax: 12,
        skillLevel: 'ALL' as const,
        location: 'Test Park',
        isVirtual: false,
      };

      const result = await sessionCrudService.createSession(input);

      assert.ok(result);
      assert.ok(result.id);
      assert.equal(result.coachId, input.coachId);
      assert.equal(result.title, input.title);
      assert.equal(result.sessionType, 'CLINIC');
      assert.equal(result.status, 'DRAFT');
      assert.equal(result.maxParticipants, 10);
      assert.equal(result.currentParticipants, 0);
      assert.ok(result.createdAt);
    });

    it('should set default values for optional fields', async () => {
      const input = {
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        title: 'Simple Session',
        description: 'Test',
        sessionType: 'TRAINING' as const,
        schedule: [
          { date: '2026-07-01', startTime: '14:00', endTime: '16:00' },
        ],
        maxParticipants: 8,
        pricePerParticipant: 30,
        location: 'Test Field',
        isVirtual: false,
      };

      const result = await sessionCrudService.createSession(input);

      assert.equal(result.currency, 'GBP');
      assert.equal(result.currentParticipants, 0);
      assert.equal(result.waitlistEnabled, false);
      assert.equal(result.waitlistCount, 0);
    });
  });

  describe('getSession', () => {
    it('should retrieve session by id', async () => {
      const input = {
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        title: 'Find Me',
        description: 'Test',
        sessionType: 'CAMP' as const,
        schedule: [
          { date: '2026-08-01', startTime: '09:00', endTime: '15:00' },
        ],
        maxParticipants: 16,
        pricePerParticipant: 150,
        location: 'Test Camp',
        isVirtual: false,
      };

      const created = await sessionCrudService.createSession(input);
      const found = await sessionCrudService.getSession(created.id);

      assert.ok(found);
      assert.equal(found.id, created.id);
      assert.equal(found.title, 'Find Me');
    });

    it('should return null when session not found', async () => {
      const found = await sessionCrudService.getSession('non-existent-id');
      assert.equal(found, null);
    });
  });

  describe('publishSession', () => {
    it('should publish draft session successfully', async () => {
      const input = {
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        title: 'To Publish',
        description: 'Will be published',
        sessionType: 'CLINIC' as const,
        schedule: [
          { date: '2026-06-15', startTime: '10:00', endTime: '12:00' },
        ],
        maxParticipants: 12,
        pricePerParticipant: 40,
        location: 'Test Stadium',
        isVirtual: false,
      };

      const session = await sessionCrudService.createSession(input);
      const result = await sessionCrudService.publishSession(session.id);

      assert.ok(result.success);
      assert.equal(result.data.status, 'PUBLISHED');
      assert.equal(result.data.id, session.id);
    });

    it('should return err when session not found', async () => {
      const result = await sessionCrudService.publishSession('non-existent-id');

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });

  describe('cancelSession', () => {
    it('should cancel published session successfully', async () => {
      const input = {
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        title: 'To Cancel',
        description: 'Will be cancelled',
        sessionType: 'TEAM_TRAINING' as const,
        schedule: [
          { date: '2026-07-20', startTime: '18:00', endTime: '20:00' },
        ],
        maxParticipants: 20,
        pricePerParticipant: 15,
        location: 'Test Ground',
        isVirtual: false,
      };

      const session = await sessionCrudService.createSession(input);
      await sessionCrudService.publishSession(session.id);
      const result = await sessionCrudService.cancelSession(session.id);

      assert.ok(result.success);
      assert.equal(result.data.status, 'CANCELLED');
      assert.equal(result.data.id, session.id);
    });

    it('should return err when cancelling non-existent session', async () => {
      const result = await sessionCrudService.cancelSession('non-existent-id');

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });

  describe('getCoachSessions', () => {
    it('should return sessions for coach', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      await sessionCrudService.createSession({
        coachId,
        coachName: 'Test Coach',
        title: 'Session 1',
        description: 'Test',
        sessionType: 'CLINIC',
        schedule: [{ date: '2026-06-01', startTime: '10:00', endTime: '12:00' }],
        maxParticipants: 10,
        pricePerParticipant: 40,
        location: 'Park A',
        isVirtual: false,
      });

      await sessionCrudService.createSession({
        coachId,
        coachName: 'Test Coach',
        title: 'Session 2',
        description: 'Test',
        sessionType: 'CAMP',
        schedule: [{ date: '2026-07-01', startTime: '09:00', endTime: '15:00' }],
        maxParticipants: 16,
        pricePerParticipant: 150,
        location: 'Park B',
        isVirtual: false,
      });

      const sessions = await sessionCrudService.getCoachSessions(coachId);

      assert.ok(sessions.length >= 2);
      assert.ok(sessions.every(s => s.coachId === coachId));
    });

    it('should return empty array for coach with no sessions', async () => {
      const coachId = 'test-coach-empty-' + Math.random().toString(36).slice(2);
      const sessions = await sessionCrudService.getCoachSessions(coachId);

      assert.ok(Array.isArray(sessions));
      assert.equal(sessions.length, 0);
    });
  });

  describe('discoverSessions', () => {
    it('should return published sessions', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      const session = await sessionCrudService.createSession({
        coachId,
        coachName: 'Test Coach',
        title: 'Discoverable Session',
        description: 'Test',
        sessionType: 'OPEN_SESSION',
        schedule: [{ date: '2026-09-01', startTime: '10:00', endTime: '12:00' }],
        maxParticipants: 20,
        pricePerParticipant: 25,
        location: 'Public Park',
        isVirtual: false,
      });

      await sessionCrudService.publishSession(session.id);

      const sessions = await sessionCrudService.discoverSessions();

      assert.ok(Array.isArray(sessions));
      assert.ok(sessions.some(s => s.id === session.id));
    });

    it('should filter by location when provided', async () => {
      const sessions = await sessionCrudService.discoverSessions({
        location: 'London',
      });

      assert.ok(Array.isArray(sessions));
    });

    it('should filter by session type when provided', async () => {
      const sessions = await sessionCrudService.discoverSessions({
        sessionType: 'CLINIC',
      });

      assert.ok(Array.isArray(sessions));
      assert.ok(sessions.every(s => s.sessionType === 'CLINIC' || sessions.length === 0));
    });
  });
});
