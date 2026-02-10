import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { eventInviteService } from '@/services/invite/event-invite-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('EventInviteService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SQUAD_INVITES);
    await apiClient.remove(STORAGE_KEYS.CLUB_EVENTS);
  });

  describe('getEventInvites', () => {
    it('should return empty array for event with no invites', async () => {
      const eventId = 'test-event-' + Math.random().toString(36).slice(2);

      const invites = await eventInviteService.getEventInvites(eventId);

      assert.equal(invites.length, 0);
    });

    it('should filter invites by eventId', async () => {
      const eventId = 'test-event-' + Math.random().toString(36).slice(2);
      const squadInvite = {
        id: 'test-invite-' + Math.random().toString(36).slice(2),
        squadId: 'test-squad-' + Math.random().toString(36).slice(2),
        squadName: 'Test Squad',
        targetType: 'EVENT' as const,
        targetId: eventId,
        targetTitle: 'Test Event',
        invitedBy: 'test-coach-' + Math.random().toString(36).slice(2),
        invitedByName: 'Test Coach',
        invitedAt: new Date().toISOString(),
        memberCount: 5,
        responses: {
          accepted: 0,
          declined: 0,
          pending: 5,
        },
      };

      await apiClient.set(STORAGE_KEYS.SQUAD_INVITES, [squadInvite]);

      const invites = await eventInviteService.getEventInvites(eventId);

      assert.equal(invites.length, 1);
      assert.equal(invites[0].targetId, eventId);
    });
  });

  describe('getOrganizerEventInvites', () => {
    it('should return empty array for organizer with no invites', async () => {
      const organizerId = 'test-organizer-' + Math.random().toString(36).slice(2);

      const invites = await eventInviteService.getOrganizerEventInvites(organizerId);

      assert.equal(invites.length, 0);
    });

    it('should filter invites by organizer ID', async () => {
      const organizerId = 'test-organizer-' + Math.random().toString(36).slice(2);
      const squadInvite = {
        id: 'test-invite-' + Math.random().toString(36).slice(2),
        squadId: 'test-squad-' + Math.random().toString(36).slice(2),
        squadName: 'Test Squad',
        targetType: 'EVENT' as const,
        targetId: 'test-event-' + Math.random().toString(36).slice(2),
        targetTitle: 'Test Event',
        invitedBy: organizerId,
        invitedByName: 'Test Organizer',
        invitedAt: new Date().toISOString(),
        memberCount: 10,
        responses: {
          accepted: 0,
          declined: 0,
          pending: 10,
        },
      };

      await apiClient.set(STORAGE_KEYS.SQUAD_INVITES, [squadInvite]);

      const invites = await eventInviteService.getOrganizerEventInvites(organizerId);

      assert.equal(invites.length, 1);
      assert.equal(invites[0].invitedBy, organizerId);
    });
  });

  describe('updateEventInviteResponse', () => {
    it('should update invite response counts', async () => {
      const eventId = 'test-event-' + Math.random().toString(36).slice(2);
      const squadId = 'test-squad-' + Math.random().toString(36).slice(2);
      const squadInvite = {
        id: 'test-invite-' + Math.random().toString(36).slice(2),
        squadId,
        squadName: 'Test Squad',
        targetType: 'EVENT' as const,
        targetId: eventId,
        targetTitle: 'Test Event',
        invitedBy: 'test-coach-' + Math.random().toString(36).slice(2),
        invitedByName: 'Test Coach',
        invitedAt: new Date().toISOString(),
        memberCount: 10,
        responses: {
          accepted: 0,
          declined: 0,
          pending: 10,
        },
      };

      await apiClient.set(STORAGE_KEYS.SQUAD_INVITES, [squadInvite]);

      await eventInviteService.updateEventInviteResponse(eventId, squadId, 5, 2);

      const invites = await eventInviteService.getEventInvites(eventId);
      assert.equal(invites[0].responses.accepted, 5);
      assert.equal(invites[0].responses.declined, 2);
      assert.equal(invites[0].responses.pending, 3);
    });

    it('should handle non-existent invite gracefully', async () => {
      const eventId = 'non-existent-event';
      const squadId = 'non-existent-squad';

      await eventInviteService.updateEventInviteResponse(eventId, squadId, 1, 1);

      const invites = await eventInviteService.getEventInvites(eventId);
      assert.equal(invites.length, 0);
    });
  });

  describe('getEventRsvpTotals', () => {
    it('should return zero totals for event with no invites', async () => {
      const eventId = 'test-event-' + Math.random().toString(36).slice(2);

      const totals = await eventInviteService.getEventRsvpTotals(eventId);

      assert.equal(totals.accepted, 0);
      assert.equal(totals.declined, 0);
      assert.equal(totals.pending, 0);
      assert.equal(totals.total, 0);
    });

    it('should aggregate totals across multiple squads', async () => {
      const eventId = 'test-event-' + Math.random().toString(36).slice(2);
      const squadInvites = [
        {
          id: 'test-invite-1-' + Math.random().toString(36).slice(2),
          squadId: 'test-squad-1-' + Math.random().toString(36).slice(2),
          squadName: 'Squad 1',
          targetType: 'EVENT' as const,
          targetId: eventId,
          targetTitle: 'Test Event',
          invitedBy: 'test-coach-' + Math.random().toString(36).slice(2),
          invitedByName: 'Test Coach',
          invitedAt: new Date().toISOString(),
          memberCount: 10,
          responses: {
            accepted: 5,
            declined: 2,
            pending: 3,
          },
        },
        {
          id: 'test-invite-2-' + Math.random().toString(36).slice(2),
          squadId: 'test-squad-2-' + Math.random().toString(36).slice(2),
          squadName: 'Squad 2',
          targetType: 'EVENT' as const,
          targetId: eventId,
          targetTitle: 'Test Event',
          invitedBy: 'test-coach-' + Math.random().toString(36).slice(2),
          invitedByName: 'Test Coach',
          invitedAt: new Date().toISOString(),
          memberCount: 8,
          responses: {
            accepted: 4,
            declined: 1,
            pending: 3,
          },
        },
      ];

      await apiClient.set(STORAGE_KEYS.SQUAD_INVITES, squadInvites);

      const totals = await eventInviteService.getEventRsvpTotals(eventId);

      assert.equal(totals.accepted, 9);
      assert.equal(totals.declined, 3);
      assert.equal(totals.pending, 6);
      assert.equal(totals.total, 18);
    });
  });
});
