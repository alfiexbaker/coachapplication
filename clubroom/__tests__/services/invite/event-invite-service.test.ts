import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { eventInviteService } from '@/services/invite/event-invite-service';
import { eventCrudService } from '@/services/event/event-crud-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

function restoreMockMode(original?: PropertyDescriptor): void {
  if (original) {
    Object.defineProperty(apiClient, 'isMockMode', original);
  } else {
    delete (apiClient as unknown as { isMockMode?: boolean }).isMockMode;
  }
}

describe('EventInviteService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SQUAD_INVITES);
    await apiClient.remove(STORAGE_KEYS.CLUB_EVENTS);
  });

  describe('inviteSquadsToEvent', () => {
    it('uses API authority in API mode without creating legacy local invite fan-out', async () => {
      const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
      const originalCreateEvent = eventCrudService.createEvent;
      const originalInviteSquads = eventCrudService.inviteSquads;
      let createEventCalls = 0;
      const inviteCalls: Array<{
        eventId: string;
        squadIds: string[];
        excludeAthleteIds?: string[];
      }> = [];

      Object.defineProperty(apiClient, 'isMockMode', {
        configurable: true,
        get: () => false,
      });
      eventCrudService.createEvent = (async (input) => {
        createEventCalls += 1;
        return {
          id: 'event-api-squad',
          clubId: input.clubId,
          createdBy: input.createdBy,
          title: input.title,
          description: input.description,
          eventType: input.eventType,
          date: input.date,
          startTime: input.startTime,
          endTime: input.endTime,
          venue: input.venue,
          isVirtual: input.isVirtual ?? false,
          targetAudience: input.targetAudience,
          squadIds: input.squadIds,
          maxAttendees: input.maxAttendees,
          price: input.price ?? 0,
          currency: input.currency ?? 'GBP',
          rsvpRequired: input.rsvpRequired ?? true,
          attendees: [],
          status: 'DRAFT',
          createdAt: '2026-07-10T18:00:00.000Z',
        };
      }) as typeof eventCrudService.createEvent;
      eventCrudService.inviteSquads = (async (eventId, squadIds, options) => {
        inviteCalls.push({
          eventId,
          squadIds,
          excludeAthleteIds: options?.excludeAthleteIds,
        });
        return {
          eventId,
          squadIds,
          inviteCount: 2,
          targetAthleteCount: 3,
        };
      }) as typeof eventCrudService.inviteSquads;

      try {
        const result = await eventInviteService.inviteSquadsToEvent({
          clubId: 'club-api-event-invite',
          clubName: 'API Club',
          title: 'API Squad Event',
          description: 'Should use backend squad invites in API mode',
          eventType: 'TRAINING_CAMP',
          date: '2026-07-10',
          startTime: '18:00',
          venue: 'API Field',
          squadIds: ['squad-api-event'],
          excludeMemberIds: ['athlete-excluded'],
          createdBy: 'coach-api-event',
          createdByName: 'Coach API',
        });

        assert.equal(createEventCalls, 1);
        assert.deepEqual(inviteCalls, [
          {
            eventId: 'event-api-squad',
            squadIds: ['squad-api-event'],
            excludeAthleteIds: ['athlete-excluded'],
          },
        ]);
        assert.equal(result.event.id, 'event-api-squad');
        assert.deepEqual(result.inviteResult, {
          sent: 2,
          successful: 2,
          failed: 0,
          skipped: 0,
          totalAttempted: 3,
          errors: [],
          groupId: 'squad_event_event-api-squad',
        });
        assert.deepEqual(await apiClient.get(STORAGE_KEYS.SQUAD_INVITES, []), []);
      } finally {
        eventCrudService.createEvent = originalCreateEvent;
        eventCrudService.inviteSquads = originalInviteSquads;
        restoreMockMode(originalIsMockMode);
      }
    });
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
