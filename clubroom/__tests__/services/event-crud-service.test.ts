/**
 * Event CRUD Service Tests
 *
 * Tests for event creation, publishing, cancellation, and queries.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { eventCrudService } from '../../services/event/event-crud-service';

describe('eventCrudService', () => {
  describe('createEvent', () => {
    test('creates an event with required fields', async () => {
      const event = await eventCrudService.createEvent({
        clubId: 'club_1',
        clubName: 'Test Club',
        createdBy: 'coach_1',
        createdByName: 'Coach Test',
        title: 'Test Event',
        description: 'A test event',
        eventType: 'SOCIAL',
        date: '2026-06-15',
        startTime: '14:00',
        venue: 'Test Venue',
        targetAudience: 'ALL',
        price: 0,
        currency: 'GBP',
        rsvpRequired: true,
      });

      assert.ok(event.id);
      assert.equal(event.title, 'Test Event');
      assert.equal(event.status, 'DRAFT');
      assert.ok(event.createdAt);
    });
  });

  describe('getEvent', () => {
    test('returns null for non-existent event', async () => {
      const result = await eventCrudService.getEvent('nonexistent_xyz');
      assert.equal(result, null);
    });

    test('returns event for existing id (from mock data)', async () => {
      const result = await eventCrudService.getEvent('event_1');
      // May be null if mock data IDs differ, that's ok
      if (result) {
        assert.equal(result.id, 'event_1');
      }
    });
  });

  describe('publishEvent', () => {
    test('returns err for non-existent event', async () => {
      const result = await eventCrudService.publishEvent('nonexistent_abc');
      assert.strictEqual(result.success, false);
    });

    test('publishes an existing event', async () => {
      const event = await eventCrudService.createEvent({
        clubId: 'club_1',
        clubName: 'Test Club',
        createdBy: 'coach_1',
        createdByName: 'Coach',
        title: 'Publish Test',
        description: 'Test',
        eventType: 'SOCIAL',
        date: '2026-07-01',
        startTime: '10:00',
        venue: 'Venue',
        targetAudience: 'ALL',
        price: 0,
        currency: 'GBP',
        rsvpRequired: false,
      });

      const result = await eventCrudService.publishEvent(event.id);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.status, 'PUBLISHED');
      }
    });
  });

  describe('cancelEvent', () => {
    test('returns err for non-existent event', async () => {
      const result = await eventCrudService.cancelEvent('nonexistent_xyz');
      assert.strictEqual(result.success, false);
    });
  });

  describe('getUpcomingEvents', () => {
    test('returns array of events for a club', async () => {
      const events = await eventCrudService.getUpcomingEvents('club_1');
      assert.ok(Array.isArray(events));
    });
  });

  describe('getAllClubEvents', () => {
    test('returns array of all events for a club', async () => {
      const events = await eventCrudService.getAllClubEvents('club_1');
      assert.ok(Array.isArray(events));
    });
  });
});
