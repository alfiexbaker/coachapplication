/**
 * Event RSVP Service Tests
 *
 * Tests for RSVP submission, updates, attendee counting, and calendar queries.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { eventRsvpService } from '../../services/event/event-rsvp-service';
import type { ClubEvent, EventAttendee } from '../../constants/types';

describe('eventRsvpService', () => {
  describe('getAttendeeCounts', () => {
    test('counts by status correctly', () => {
      const attendees: EventAttendee[] = [
        { userId: '1', userName: 'A', userRole: 'PARENT', status: 'GOING', guestCount: 2, respondedAt: '' },
        { userId: '2', userName: 'B', userRole: 'PARENT', status: 'GOING', guestCount: 1, respondedAt: '' },
        { userId: '3', userName: 'C', userRole: 'PARENT', status: 'MAYBE', guestCount: 0, respondedAt: '' },
        { userId: '4', userName: 'D', userRole: 'PARENT', status: 'NOT_GOING', guestCount: 0, respondedAt: '' },
      ];

      const counts = eventRsvpService.getAttendeeCounts(attendees);
      assert.equal(counts.going, 2);
      assert.equal(counts.maybe, 1);
      assert.equal(counts.notGoing, 1);
      assert.equal(counts.totalGuests, 3);
    });

    test('returns zeros for empty array', () => {
      const counts = eventRsvpService.getAttendeeCounts([]);
      assert.equal(counts.going, 0);
      assert.equal(counts.maybe, 0);
      assert.equal(counts.notGoing, 0);
      assert.equal(counts.totalGuests, 0);
    });
  });

  describe('getUserRSVP', () => {
    test('finds user RSVP in attendees list', () => {
      const attendees: EventAttendee[] = [
        { userId: 'u1', userName: 'A', userRole: 'PARENT', status: 'GOING', guestCount: 0, respondedAt: '' },
        { userId: 'u2', userName: 'B', userRole: 'PARENT', status: 'MAYBE', guestCount: 0, respondedAt: '' },
      ];

      const rsvp = eventRsvpService.getUserRSVP(attendees, 'u2');
      assert.ok(rsvp);
      assert.equal(rsvp.status, 'MAYBE');
    });

    test('returns undefined when user has no RSVP', () => {
      const result = eventRsvpService.getUserRSVP([], 'nobody');
      assert.equal(result, undefined);
    });
  });

  describe('isRSVPClosed', () => {
    test('returns false when no deadline', () => {
      const event = {} as ClubEvent;
      assert.equal(eventRsvpService.isRSVPClosed(event), false);
    });

    test('returns true when deadline has passed', () => {
      const event = { rsvpDeadline: '2020-01-01' } as ClubEvent;
      assert.equal(eventRsvpService.isRSVPClosed(event), true);
    });

    test('returns false when deadline is in future', () => {
      const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const event = { rsvpDeadline: future } as ClubEvent;
      assert.equal(eventRsvpService.isRSVPClosed(event), false);
    });
  });

  describe('isEventFull', () => {
    test('returns false when no maxAttendees', () => {
      const event = { attendees: [] } as unknown as ClubEvent;
      assert.equal(eventRsvpService.isEventFull(event), false);
    });

    test('returns true when at capacity', () => {
      const event = {
        maxAttendees: 2,
        attendees: [
          { userId: '1', userName: 'A', userRole: 'PARENT', status: 'GOING', guestCount: 0, respondedAt: '' },
          { userId: '2', userName: 'B', userRole: 'PARENT', status: 'GOING', guestCount: 0, respondedAt: '' },
        ],
      } as unknown as ClubEvent;
      assert.equal(eventRsvpService.isEventFull(event), true);
    });
  });

  describe('rsvp', () => {
    test('returns ok for valid event', async () => {
      // First create an event to RSVP to
      const { eventCrudService } = await import('../../services/event/event-crud-service');
      const event = await eventCrudService.createEvent({
        clubId: 'club_1',
        clubName: 'Club',
        createdBy: 'coach_1',
        createdByName: 'Coach',
        title: 'RSVP Test Event',
        description: 'Test',
        eventType: 'SOCIAL',
        date: '2026-08-01',
        startTime: '10:00',
        venue: 'Venue',
        targetAudience: 'ALL',
        price: 0,
        currency: 'GBP',
        rsvpRequired: true,
      });

      const result = await eventRsvpService.rsvp(
        event.id, 'user_rsvp_1', 'Test User', 'PARENT', 'GOING', 1
      );
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.status, 'GOING');
      }
    });

    test('returns err for non-existent event', async () => {
      const result = await eventRsvpService.rsvp(
        'nonexistent_event', 'u1', 'Name', 'PARENT', 'GOING'
      );
      assert.equal(result.success, false);
    });
  });

  describe('updateRSVP', () => {
    test('returns err for non-existent RSVP', async () => {
      const result = await eventRsvpService.updateRSVP('nonexistent_rsvp', 'MAYBE');
      assert.equal(result.success, false);
    });
  });

  describe('getEventRSVPs', () => {
    test('returns array of RSVPs', async () => {
      const rsvps = await eventRsvpService.getEventRSVPs('event_1');
      assert.ok(Array.isArray(rsvps));
    });
  });

  describe('getUserRSVPs', () => {
    test('returns array of RSVPs for user', async () => {
      const rsvps = await eventRsvpService.getUserRSVPs('parent_1');
      assert.ok(Array.isArray(rsvps));
    });
  });

  describe('getEventsForCalendar', () => {
    test('returns array of calendar events', async () => {
      const events = await eventRsvpService.getEventsForCalendar(
        'parent_1', '2026-01-01', '2026-12-31'
      );
      assert.ok(Array.isArray(events));
    });
  });
});
