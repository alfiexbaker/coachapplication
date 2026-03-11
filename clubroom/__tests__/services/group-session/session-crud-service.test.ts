/**
 * Session CRUD Service Tests
 *
 * Tests for group session creation, publishing, cancellation, and queries.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { sessionCrudService } from '@/services/group-session/session-crud-service';

describe('sessionCrudService', () => {
  describe('createSession', () => {
    test('creates a group session', async () => {
      const session = await sessionCrudService.createSession({
        coachId: 'coach_1',
        coachName: 'Coach Test',
        title: 'Test Training',
        description: 'A test session',
        sessionType: 'TRAINING',
        maxParticipants: 16,
        pricePerParticipant: 15,
        currency: 'GBP',
        location: 'Training Ground',
        schedule: [{ date: '2026-06-15', startTime: '09:00', endTime: '10:00' }],
      });

      assert.ok(session.id);
      assert.equal(session.title, 'Test Training');
      assert.equal(session.status, 'DRAFT');
    });

    test('preserves org ownership context on club-created group sessions', async () => {
      const session = await sessionCrudService.createSession({
        coachId: 'coach_1',
        coachName: 'Coach Test',
        clubId: 'club_1',
        actingAs: 'club',
        commercialMode: 'ORG_OWNED',
        ownerCoachId: 'coach_owner_1',
        assigneeCoachId: 'coach_assigned_1',
        title: 'Club Program',
        description: 'A club-owned recurring block',
        sessionType: 'TRAINING',
        maxParticipants: 18,
        pricePerParticipant: 15,
        currency: 'GBP',
        location: 'Training Ground',
        schedule: [{ date: '2026-06-22', startTime: '18:00', endTime: '19:00' }],
      });

      assert.equal(session.actingAs, 'club');
      assert.equal(session.commercialMode, 'ORG_OWNED');
      assert.equal(session.clubId, 'club_1');
      assert.equal(session.ownerCoachId, 'coach_owner_1');
      assert.equal(session.assigneeCoachId, 'coach_assigned_1');
    });
  });

  describe('getSession', () => {
    test('returns null for non-existent session', async () => {
      const result = await sessionCrudService.getSession('nonexistent_gs');
      assert.equal(result, null);
    });
  });

  describe('getCoachSessions', () => {
    test('returns array of sessions', async () => {
      const sessions = await sessionCrudService.getCoachSessions('coach_1');
      assert.ok(Array.isArray(sessions));
    });
  });

  describe('discoverSessions', () => {
    test('returns array of published sessions', async () => {
      const sessions = await sessionCrudService.discoverSessions();
      assert.ok(Array.isArray(sessions));
    });
  });

  describe('publishSession (Result pattern)', () => {
    test('returns err for non-existent session', async () => {
      const result = await sessionCrudService.publishSession('nonexistent_pub');
      assert.strictEqual(result.success, false);
    });

    test('publishes an existing session', async () => {
      const session = await sessionCrudService.createSession({
        coachId: 'coach_pub',
        coachName: 'Coach',
        title: 'Publish Test',
        description: 'Test',
        sessionType: 'TRAINING',
        maxParticipants: 12,
        pricePerParticipant: 10,
        currency: 'GBP',
        location: 'Field',
        schedule: [{ date: '2026-07-01', startTime: '10:00', endTime: '11:00' }],
      });

      const result = await sessionCrudService.publishSession(session.id);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.status, 'PUBLISHED');
      }
    });
  });

  describe('cancelSession (Result pattern)', () => {
    test('returns err for non-existent session', async () => {
      const result = await sessionCrudService.cancelSession('nonexistent_cancel');
      assert.strictEqual(result.success, false);
    });
  });
});
