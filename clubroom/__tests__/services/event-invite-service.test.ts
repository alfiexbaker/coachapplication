/**
 * Event Invite Service Tests
 *
 * Tests for squad invites to events with RSVP tracking.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { eventInviteService } from '../../services/invite/event-invite-service';

describe('eventInviteService', () => {
  describe('getEventInvites', () => {
    test('returns array of squad invites for event', async () => {
      const invites = await eventInviteService.getEventInvites('event_1');
      assert.ok(Array.isArray(invites));
    });
  });

  describe('getOrganizerEventInvites', () => {
    test('returns array of invites by organizer', async () => {
      const invites = await eventInviteService.getOrganizerEventInvites('coach_1');
      assert.ok(Array.isArray(invites));
    });
  });

  describe('getEventRsvpTotals', () => {
    test('returns totals object', async () => {
      const totals = await eventInviteService.getEventRsvpTotals('event_1');
      assert.equal(typeof totals.accepted, 'number');
      assert.equal(typeof totals.declined, 'number');
      assert.equal(typeof totals.pending, 'number');
      assert.equal(typeof totals.total, 'number');
    });
  });
});
