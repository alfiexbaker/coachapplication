import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { eventRsvpService } from '@/services/event/event-rsvp-service';
import { eventCrudService, type CreateEventInput } from '@/services/event/event-crud-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { SubmitRSVPInput, ClubEvent } from '@/constants/types';

describe('EventRsvpService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.EVENT_RSVPS);
    await apiClient.remove(STORAGE_KEYS.CLUB_EVENTS);
  });

  describe('rsvp', () => {
    it('should create RSVP successfully', async () => {
      const eventInput: CreateEventInput = {
        clubId: 'test-club-' + Math.random().toString(36).slice(2),
        clubName: 'Test Club',
        createdBy: 'coach1',
        createdByName: 'Coach',
        title: 'Test Event',
        description: 'Test',
        eventType: 'SOCIAL',
        date: '2026-06-01',
        startTime: '14:00',
        venue: 'Park',
        targetAudience: 'ALL',
      };

      const event = await eventCrudService.createEvent(eventInput);
      await eventCrudService.publishEvent(event.id);

      const result = await eventRsvpService.rsvp(
        event.id,
        'test-user-' + Math.random().toString(36).slice(2),
        'Test User',
        'PARENT',
        'GOING',
        2
      );

      assert.ok(result.success);
      assert.equal(result.data.status, 'GOING');
      assert.equal(result.data.guestCount, 2);
      assert.ok(result.data.respondedAt);
    });

    it('should return err when event not found', async () => {
      const result = await eventRsvpService.rsvp(
        'non-existent-event',
        'user1',
        'User Name',
        'PARENT',
        'GOING'
      );

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });

    it('should update existing RSVP', async () => {
      const eventInput: CreateEventInput = {
        clubId: 'test-club-' + Math.random().toString(36).slice(2),
        clubName: 'Test Club',
        createdBy: 'coach1',
        createdByName: 'Coach',
        title: 'Test Event',
        description: 'Test',
        eventType: 'TOURNAMENT',
        date: '2026-07-01',
        startTime: '09:00',
        venue: 'Stadium',
        targetAudience: 'ATHLETES',
      };

      const event = await eventCrudService.createEvent(eventInput);
      await eventCrudService.publishEvent(event.id);
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      await eventRsvpService.rsvp(event.id, userId, 'User', 'PARENT', 'GOING', 1);
      const result2 = await eventRsvpService.rsvp(event.id, userId, 'User', 'PARENT', 'MAYBE', 0);

      assert.ok(result2.success);
      assert.equal(result2.data.status, 'MAYBE');
      assert.equal(result2.data.guestCount, 0);
    });
  });

  describe('getEventAttendees', () => {
    it('should return attendees for event', async () => {
      const eventInput: CreateEventInput = {
        clubId: 'test-club-' + Math.random().toString(36).slice(2),
        clubName: 'Test Club',
        createdBy: 'coach1',
        createdByName: 'Coach',
        title: 'Test Event',
        description: 'Test',
        eventType: 'MEETING',
        date: '2026-05-01',
        startTime: '19:00',
        venue: 'Online',
        targetAudience: 'PARENTS',
      };

      const event = await eventCrudService.createEvent(eventInput);
      await eventCrudService.publishEvent(event.id);

      await eventRsvpService.rsvp(event.id, 'user1-' + Math.random().toString(36).slice(2), 'User 1', 'PARENT', 'GOING');
      await eventRsvpService.rsvp(event.id, 'user2-' + Math.random().toString(36).slice(2), 'User 2', 'PARENT', 'MAYBE');

      const attendees = await eventRsvpService.getEventAttendees(event.id);

      assert.ok(attendees.length >= 2);
      assert.ok(attendees.some(a => a.status === 'GOING'));
      assert.ok(attendees.some(a => a.status === 'MAYBE'));
    });

    it('should return empty array for event with no attendees', async () => {
      const eventInput: CreateEventInput = {
        clubId: 'test-club-' + Math.random().toString(36).slice(2),
        clubName: 'Test Club',
        createdBy: 'coach1',
        createdByName: 'Coach',
        title: 'Empty Event',
        description: 'No RSVPs',
        eventType: 'SOCIAL',
        date: '2026-08-01',
        startTime: '12:00',
        venue: 'Park',
        targetAudience: 'ALL',
      };

      const event = await eventCrudService.createEvent(eventInput);
      const attendees = await eventRsvpService.getEventAttendees(event.id);

      assert.deepEqual(attendees, []);
    });
  });

  describe('getAttendeeCounts', () => {
    it('should count attendees by status', () => {
      const attendees = [
        { userId: '1', userName: 'User 1', userRole: 'PARENT' as const, status: 'GOING' as const, guestCount: 2, respondedAt: '2026-01-01' },
        { userId: '2', userName: 'User 2', userRole: 'PARENT' as const, status: 'GOING' as const, guestCount: 1, respondedAt: '2026-01-02' },
        { userId: '3', userName: 'User 3', userRole: 'PARENT' as const, status: 'MAYBE' as const, guestCount: 0, respondedAt: '2026-01-03' },
        { userId: '4', userName: 'User 4', userRole: 'PARENT' as const, status: 'NOT_GOING' as const, guestCount: 0, respondedAt: '2026-01-04' },
      ];

      const counts = eventRsvpService.getAttendeeCounts(attendees);

      assert.equal(counts.going, 2);
      assert.equal(counts.maybe, 1);
      assert.equal(counts.notGoing, 1);
      assert.equal(counts.totalGuests, 3);
    });

    it('should return zeros for empty attendee list', () => {
      const counts = eventRsvpService.getAttendeeCounts([]);

      assert.equal(counts.going, 0);
      assert.equal(counts.maybe, 0);
      assert.equal(counts.notGoing, 0);
      assert.equal(counts.totalGuests, 0);
    });
  });

  describe('getUserRSVP', () => {
    it('should find user RSVP', () => {
      const attendees = [
        { userId: 'user1', userName: 'User 1', userRole: 'PARENT' as const, status: 'GOING' as const, guestCount: 1, respondedAt: '2026-01-01' },
        { userId: 'user2', userName: 'User 2', userRole: 'PARENT' as const, status: 'MAYBE' as const, guestCount: 0, respondedAt: '2026-01-02' },
      ];

      const rsvp = eventRsvpService.getUserRSVP(attendees, 'user1');

      assert.ok(rsvp);
      assert.equal(rsvp.userId, 'user1');
      assert.equal(rsvp.status, 'GOING');
    });

    it('should return undefined when user has not RSVP\'d', () => {
      const attendees = [
        { userId: 'user1', userName: 'User 1', userRole: 'PARENT' as const, status: 'GOING' as const, guestCount: 1, respondedAt: '2026-01-01' },
      ];

      const rsvp = eventRsvpService.getUserRSVP(attendees, 'user999');
      assert.equal(rsvp, undefined);
    });
  });

  describe('isRSVPClosed', () => {
    it('should return true when deadline has passed', () => {
      const event: ClubEvent = {
        id: 'test',
        clubId: 'club1',
        clubName: 'Club',
        createdBy: 'coach1',
        createdByName: 'Coach',
        title: 'Test Event',
        description: 'Test',
        eventType: 'TOURNAMENT',
        date: '2026-12-31',
        startTime: '10:00',
        venue: 'Stadium',
        isVirtual: false,
        targetAudience: 'ALL',
        price: 0,
        currency: 'GBP',
        rsvpRequired: true,
        rsvpDeadline: '2020-01-01', // Past date
        attendees: [],
        status: 'PUBLISHED',
        createdAt: '2026-01-01',
      };

      const result = eventRsvpService.isRSVPClosed(event);
      assert.equal(result, true);
    });

    it('should return false when no deadline set', () => {
      const event: ClubEvent = {
        id: 'test',
        clubId: 'club1',
        clubName: 'Club',
        createdBy: 'coach1',
        createdByName: 'Coach',
        title: 'Test Event',
        description: 'Test',
        eventType: 'SOCIAL',
        date: '2026-12-31',
        startTime: '14:00',
        venue: 'Park',
        isVirtual: false,
        targetAudience: 'ALL',
        price: 0,
        currency: 'GBP',
        rsvpRequired: false,
        attendees: [],
        status: 'PUBLISHED',
        createdAt: '2026-01-01',
      };

      const result = eventRsvpService.isRSVPClosed(event);
      assert.equal(result, false);
    });
  });

  describe('isEventFull', () => {
    it('should return true when max attendees reached', () => {
      const event: ClubEvent = {
        id: 'test',
        clubId: 'club1',
        clubName: 'Club',
        createdBy: 'coach1',
        createdByName: 'Coach',
        title: 'Test Event',
        description: 'Test',
        eventType: 'TOURNAMENT',
        date: '2026-07-01',
        startTime: '09:00',
        venue: 'Stadium',
        isVirtual: false,
        targetAudience: 'ALL',
        maxAttendees: 5,
        price: 0,
        currency: 'GBP',
        rsvpRequired: true,
        attendees: [
          { userId: '1', userName: 'User 1', userRole: 'PARENT', status: 'GOING', guestCount: 2, respondedAt: '2026-01-01' },
          { userId: '2', userName: 'User 2', userRole: 'PARENT', status: 'GOING', guestCount: 2, respondedAt: '2026-01-02' },
        ],
        status: 'PUBLISHED',
        createdAt: '2026-01-01',
      };

      const result = eventRsvpService.isEventFull(event);
      assert.equal(result, true);
    });

    it('should return false when no max attendees set', () => {
      const event: ClubEvent = {
        id: 'test',
        clubId: 'club1',
        clubName: 'Club',
        createdBy: 'coach1',
        createdByName: 'Coach',
        title: 'Test Event',
        description: 'Test',
        eventType: 'SOCIAL',
        date: '2026-08-01',
        startTime: '12:00',
        venue: 'Park',
        isVirtual: false,
        targetAudience: 'ALL',
        price: 0,
        currency: 'GBP',
        rsvpRequired: false,
        attendees: [
          { userId: '1', userName: 'User 1', userRole: 'PARENT', status: 'GOING', guestCount: 100, respondedAt: '2026-01-01' },
        ],
        status: 'PUBLISHED',
        createdAt: '2026-01-01',
      };

      const result = eventRsvpService.isEventFull(event);
      assert.equal(result, false);
    });
  });

  describe('submitRSVP', () => {
    it('should submit RSVP with full tracking', async () => {
      const input: SubmitRSVPInput = {
        eventId: 'test-event-' + Math.random().toString(36).slice(2),
        userId: 'test-user-' + Math.random().toString(36).slice(2),
        userName: 'Test User',
        userRole: 'PARENT',
        status: 'GOING',
        guestCount: 1,
        note: 'Looking forward to it!',
      };

      const result = await eventRsvpService.submitRSVP(input);

      assert.ok(result.id);
      assert.equal(result.eventId, input.eventId);
      assert.equal(result.userId, input.userId);
      assert.equal(result.status, 'GOING');
      assert.equal(result.guestCount, 1);
      assert.equal(result.note, 'Looking forward to it!');
      assert.ok(result.respondedAt);
    });

    it('should update existing RSVP with updatedAt', async () => {
      const input: SubmitRSVPInput = {
        eventId: 'test-event-' + Math.random().toString(36).slice(2),
        userId: 'test-user-' + Math.random().toString(36).slice(2),
        userName: 'Test User',
        userRole: 'PARENT',
        status: 'GOING',
        guestCount: 1,
      };

      const rsvp1 = await eventRsvpService.submitRSVP(input);
      const updatedInput = { ...input, status: 'MAYBE' as const, guestCount: 0 };
      const rsvp2 = await eventRsvpService.submitRSVP(updatedInput);

      assert.equal(rsvp1.id, rsvp2.id);
      assert.equal(rsvp2.status, 'MAYBE');
      assert.ok(rsvp2.updatedAt);
    });
  });

  describe('updateRSVP', () => {
    it('should update existing RSVP status', async () => {
      const input: SubmitRSVPInput = {
        eventId: 'test-event-' + Math.random().toString(36).slice(2),
        userId: 'test-user-' + Math.random().toString(36).slice(2),
        userName: 'Test User',
        userRole: 'PARENT',
        status: 'GOING',
        guestCount: 1,
      };

      const rsvp = await eventRsvpService.submitRSVP(input);
      const result = await eventRsvpService.updateRSVP(rsvp.id, 'NOT_GOING', 0);

      assert.ok(result.success);
      assert.equal(result.data.status, 'NOT_GOING');
      assert.equal(result.data.guestCount, 0);
      assert.ok(result.data.updatedAt);
    });

    it('should return err when RSVP not found', async () => {
      const result = await eventRsvpService.updateRSVP('non-existent-rsvp', 'GOING');

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });

  describe('getEventRSVPs', () => {
    it('should return RSVPs for specific event', async () => {
      const eventId = 'test-event-' + Math.random().toString(36).slice(2);

      await eventRsvpService.submitRSVP({
        eventId,
        userId: 'user1-' + Math.random().toString(36).slice(2),
        userName: 'User 1',
        userRole: 'PARENT',
        status: 'GOING',
        guestCount: 1,
      });

      await eventRsvpService.submitRSVP({
        eventId,
        userId: 'user2-' + Math.random().toString(36).slice(2),
        userName: 'User 2',
        userRole: 'PARENT',
        status: 'MAYBE',
        guestCount: 0,
      });

      const rsvps = await eventRsvpService.getEventRSVPs(eventId);

      assert.ok(rsvps.length >= 2);
      assert.ok(rsvps.every(r => r.eventId === eventId));
    });
  });

  describe('getUserRSVPs', () => {
    it('should return all RSVPs by user', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      await eventRsvpService.submitRSVP({
        eventId: 'event1-' + Math.random().toString(36).slice(2),
        userId,
        userName: 'Test User',
        userRole: 'PARENT',
        status: 'GOING',
      });

      await eventRsvpService.submitRSVP({
        eventId: 'event2-' + Math.random().toString(36).slice(2),
        userId,
        userName: 'Test User',
        userRole: 'PARENT',
        status: 'MAYBE',
      });

      const rsvps = await eventRsvpService.getUserRSVPs(userId);

      assert.ok(rsvps.length >= 2);
      assert.ok(rsvps.every(r => r.userId === userId));
    });
  });

  describe('getUserEventRSVP', () => {
    it('should return specific user RSVP for event', async () => {
      const eventId = 'test-event-' + Math.random().toString(36).slice(2);
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      await eventRsvpService.submitRSVP({
        eventId,
        userId,
        userName: 'Test User',
        userRole: 'PARENT',
        status: 'GOING',
        guestCount: 2,
      });

      const rsvp = await eventRsvpService.getUserEventRSVP(eventId, userId);

      assert.ok(rsvp);
      assert.equal(rsvp.eventId, eventId);
      assert.equal(rsvp.userId, userId);
      assert.equal(rsvp.guestCount, 2);
    });

    it('should return null when no RSVP exists', async () => {
      const rsvp = await eventRsvpService.getUserEventRSVP('non-existent-event', 'non-existent-user');
      assert.equal(rsvp, null);
    });
  });
});
