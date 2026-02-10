import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { eventCrudService, type CreateEventInput } from '@/services/event/event-crud-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('EventCrudService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.CLUB_EVENTS);
  });

  describe('createEvent', () => {
    it('should create event successfully', async () => {
      const input: CreateEventInput = {
        clubId: 'test-club-' + Math.random().toString(36).slice(2),
        clubName: 'Test Club',
        createdBy: 'test-coach-' + Math.random().toString(36).slice(2),
        createdByName: 'Coach Name',
        title: 'Test Tournament',
        description: 'A test tournament event',
        eventType: 'TOURNAMENT',
        date: '2026-06-15',
        startTime: '10:00',
        endTime: '16:00',
        venue: 'Test Stadium',
        address: '123 Test St',
        isVirtual: false,
        targetAudience: 'ALL',
        price: 15,
        currency: 'GBP',
        rsvpRequired: true,
        rsvpDeadline: '2026-06-10',
      };

      const result = await eventCrudService.createEvent(input);

      assert.ok(result);
      assert.ok(result.id);
      assert.equal(result.clubId, input.clubId);
      assert.equal(result.title, input.title);
      assert.equal(result.eventType, input.eventType);
      assert.equal(result.status, 'DRAFT');
      assert.equal(result.price, 15);
      assert.deepEqual(result.attendees, []);
    });

    it('should set default values for optional fields', async () => {
      const input: CreateEventInput = {
        clubId: 'test-club-' + Math.random().toString(36).slice(2),
        clubName: 'Test Club',
        createdBy: 'test-coach-' + Math.random().toString(36).slice(2),
        createdByName: 'Coach Name',
        title: 'Simple Event',
        description: 'Simple event with minimal fields',
        eventType: 'MEETING',
        date: '2026-03-01',
        startTime: '19:00',
        venue: 'Online',
        targetAudience: 'PARENTS',
      };

      const result = await eventCrudService.createEvent(input);

      assert.equal(result.price, 0);
      assert.equal(result.currency, 'GBP');
      assert.equal(result.rsvpRequired, true);
      assert.equal(result.isVirtual, false);
    });
  });

  describe('publishEvent', () => {
    it('should publish draft event successfully', async () => {
      const input: CreateEventInput = {
        clubId: 'test-club-' + Math.random().toString(36).slice(2),
        clubName: 'Test Club',
        createdBy: 'test-coach-' + Math.random().toString(36).slice(2),
        createdByName: 'Coach Name',
        title: 'Test Event',
        description: 'Test event',
        eventType: 'SOCIAL',
        date: '2026-06-01',
        startTime: '12:00',
        venue: 'Park',
        targetAudience: 'ALL',
      };

      const event = await eventCrudService.createEvent(input);
      const result = await eventCrudService.publishEvent(event.id);

      assert.ok(result.success);
      assert.equal(result.data.status, 'PUBLISHED');
      assert.equal(result.data.id, event.id);
    });

    it('should return err when event not found', async () => {
      const result = await eventCrudService.publishEvent('non-existent-id');

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });

  describe('cancelEvent', () => {
    it('should cancel published event successfully', async () => {
      const input: CreateEventInput = {
        clubId: 'test-club-' + Math.random().toString(36).slice(2),
        clubName: 'Test Club',
        createdBy: 'test-coach-' + Math.random().toString(36).slice(2),
        createdByName: 'Coach Name',
        title: 'Event to Cancel',
        description: 'This will be cancelled',
        eventType: 'TOURNAMENT',
        date: '2026-07-01',
        startTime: '09:00',
        venue: 'Stadium',
        targetAudience: 'ATHLETES',
      };

      const event = await eventCrudService.createEvent(input);
      await eventCrudService.publishEvent(event.id);
      const result = await eventCrudService.cancelEvent(event.id);

      assert.ok(result.success);
      assert.equal(result.data.status, 'CANCELLED');
      assert.equal(result.data.id, event.id);
    });

    it('should return err when cancelling non-existent event', async () => {
      const result = await eventCrudService.cancelEvent('non-existent-id');

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });

  describe('getEvent', () => {
    it('should retrieve event by id', async () => {
      const input: CreateEventInput = {
        clubId: 'test-club-' + Math.random().toString(36).slice(2),
        clubName: 'Test Club',
        createdBy: 'test-coach-' + Math.random().toString(36).slice(2),
        createdByName: 'Coach Name',
        title: 'Find Me',
        description: 'Test event retrieval',
        eventType: 'MEETING',
        date: '2026-05-01',
        startTime: '18:00',
        venue: 'Club House',
        targetAudience: 'COACHES',
      };

      const created = await eventCrudService.createEvent(input);
      const found = await eventCrudService.getEvent(created.id);

      assert.ok(found);
      assert.equal(found.id, created.id);
      assert.equal(found.title, input.title);
    });

    it('should return null when event not found', async () => {
      const found = await eventCrudService.getEvent('non-existent-id');
      assert.equal(found, null);
    });
  });

  describe('getUpcomingEvents', () => {
    it('should return only published future events for club', async () => {
      const clubId = 'test-club-' + Math.random().toString(36).slice(2);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const input1: CreateEventInput = {
        clubId,
        clubName: 'Test Club',
        createdBy: 'coach1',
        createdByName: 'Coach',
        title: 'Future Event 1',
        description: 'Test',
        eventType: 'SOCIAL',
        date: futureDateStr,
        startTime: '14:00',
        venue: 'Park',
        targetAudience: 'ALL',
      };

      const event1 = await eventCrudService.createEvent(input1);
      await eventCrudService.publishEvent(event1.id);

      const input2: CreateEventInput = {
        clubId,
        clubName: 'Test Club',
        createdBy: 'coach1',
        createdByName: 'Coach',
        title: 'Draft Event',
        description: 'This is draft',
        eventType: 'MEETING',
        date: futureDateStr,
        startTime: '19:00',
        venue: 'Online',
        targetAudience: 'PARENTS',
      };

      await eventCrudService.createEvent(input2);

      const upcoming = await eventCrudService.getUpcomingEvents(clubId);

      assert.ok(upcoming.length >= 1);
      assert.ok(upcoming.every(e => e.status === 'PUBLISHED'));
      assert.ok(upcoming.every(e => e.clubId === clubId));
    });

    it('should return empty array for club with no events', async () => {
      const clubId = 'test-club-empty-' + Math.random().toString(36).slice(2);
      const upcoming = await eventCrudService.getUpcomingEvents(clubId);

      assert.ok(Array.isArray(upcoming));
      assert.equal(upcoming.length, 0);
    });
  });

  describe('getAllClubEvents', () => {
    it('should return all events for a club including drafts', async () => {
      const clubId = 'test-club-' + Math.random().toString(36).slice(2);

      const input1: CreateEventInput = {
        clubId,
        clubName: 'Test Club',
        createdBy: 'coach1',
        createdByName: 'Coach',
        title: 'Published Event',
        description: 'Test',
        eventType: 'TOURNAMENT',
        date: '2026-06-01',
        startTime: '10:00',
        venue: 'Stadium',
        targetAudience: 'ATHLETES',
      };

      const event1 = await eventCrudService.createEvent(input1);
      await eventCrudService.publishEvent(event1.id);

      const input2: CreateEventInput = {
        clubId,
        clubName: 'Test Club',
        createdBy: 'coach1',
        createdByName: 'Coach',
        title: 'Draft Event',
        description: 'Draft',
        eventType: 'SOCIAL',
        date: '2026-07-01',
        startTime: '12:00',
        venue: 'Park',
        targetAudience: 'ALL',
      };

      await eventCrudService.createEvent(input2);

      const allEvents = await eventCrudService.getAllClubEvents(clubId);

      assert.ok(allEvents.length >= 2);
      assert.ok(allEvents.some(e => e.status === 'PUBLISHED'));
      assert.ok(allEvents.some(e => e.status === 'DRAFT'));
    });
  });

  describe('inviteSquads', () => {
    it('should update event with squad IDs', async () => {
      const input: CreateEventInput = {
        clubId: 'test-club-' + Math.random().toString(36).slice(2),
        clubName: 'Test Club',
        createdBy: 'coach1',
        createdByName: 'Coach',
        title: 'Squad Event',
        description: 'For specific squads',
        eventType: 'TRAINING_CAMP',
        date: '2026-08-01',
        startTime: '09:00',
        venue: 'Training Ground',
        targetAudience: 'SQUAD',
      };

      const event = await eventCrudService.createEvent(input);
      const squadIds = ['squad1', 'squad2', 'squad3'];

      await eventCrudService.inviteSquads(event.id, squadIds);

      const updated = await eventCrudService.getEvent(event.id);
      assert.ok(updated);
      assert.deepEqual(updated.squadIds, squadIds);
    });
  });
});
