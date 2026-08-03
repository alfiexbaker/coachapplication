/**
 * Event Invite Service
 *
 * Handles event-specific invitation functionality including:
 * - Inviting squads to events
 * - Event RSVP tracking
 * - Multi-squad event invitations
 */

import type {
  ClubEvent,
  SquadMember,
  SquadInvite,
  BulkInviteResult,
  BulkInviteError,
} from '@/constants/types';
import { apiClient, apiFetch } from '../api-client';
import { notificationService } from '../notification-service';
import { squadService } from '../squad-service';
import { eventCrudService } from '../event/event-crud-service';
import { eventRsvpService } from '../event/event-rsvp-service';
import { createLogger } from '@/utils/logger';
import { userService } from '../user-service';

import { loadSquadInvites, saveSquadInvites } from './squad-invite-service';

const logger = createLogger('EventInviteService');
const API_MODE_EVENT_INVITE_RESPONSE_UNSUPPORTED =
  'Aggregate event invite response updates are unsupported in API mode; use per-user /v1 event RSVP routes.';

interface EventSquadInvitesResponse {
  invites: SquadInvite[];
}

async function resolveAthleteName(athleteId: string, fallback: string): Promise<string> {
  const athleteResult = await userService.getUserById(athleteId);
  if (!athleteResult.success) return fallback;
  return athleteResult.data.name || fallback;
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface InviteSquadsToEventInput {
  clubId: string;
  clubName: string;
  title: string;
  description: string;
  eventType:
    | 'TOURNAMENT'
    | 'SOCIAL'
    | 'MEETING'
    | 'PRESENTATION'
    | 'FUNDRAISER'
    | 'TRIAL_DAY'
    | 'TRAINING_CAMP'
    | 'OTHER';
  date: string;
  startTime: string;
  endTime?: string;
  venue: string;
  isVirtual?: boolean;
  squadIds: string[];
  createdBy: string;
  createdByName: string;
  price?: number;
  maxAttendees?: number;
  excludeMemberIds?: string[];
}

// ============================================================================
// EVENT INVITE SERVICE
// ============================================================================

export const eventInviteService = {
  /**
   * Invite multiple squads to an event
   */
  async inviteSquadsToEvent(input: InviteSquadsToEventInput): Promise<{
    event: ClubEvent;
    inviteResult: BulkInviteResult;
  }> {
    if (!apiClient.isMockMode) {
      const event = await eventCrudService.createEvent({
        clubId: input.clubId,
        clubName: input.clubName,
        createdBy: input.createdBy,
        createdByName: input.createdByName,
        title: input.title,
        description: input.description,
        eventType: input.eventType,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        venue: input.venue,
        isVirtual: input.isVirtual || false,
        targetAudience: 'SQUAD',
        squadIds: input.squadIds,
        maxAttendees: input.maxAttendees,
        price: input.price || 0,
        currency: 'GBP',
        rsvpRequired: true,
      });
      const inviteResponse = await eventCrudService.inviteSquads(event.id, input.squadIds, {
        excludeAthleteIds: input.excludeMemberIds,
      });
      const sent = inviteResponse?.inviteCount ?? 0;
      return {
        event,
        inviteResult: {
          sent,
          successful: sent,
          failed: 0,
          skipped: 0,
          totalAttempted: inviteResponse?.targetAthleteCount ?? sent,
          errors: [],
          groupId: `squad_event_${event.id}`,
        },
      };
    }

    // Get all members from all squads
    const allMembers = await squadService.getMembersForSquads(input.squadIds);

    // Filter out excluded members
    const eligibleMembers = input.excludeMemberIds
      ? allMembers.filter((m) => !input.excludeMemberIds!.includes(m.athleteId))
      : allMembers;

    // Create event using event service
    const event = await eventCrudService.createEvent({
      clubId: input.clubId,
      clubName: input.clubName,
      createdBy: input.createdBy,
      createdByName: input.createdByName,
      title: input.title,
      description: input.description,
      eventType: input.eventType,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      venue: input.venue,
      isVirtual: input.isVirtual || false,
      targetAudience: 'SQUAD',
      squadIds: input.squadIds,
      maxAttendees: input.maxAttendees,
      price: input.price || 0,
      currency: 'GBP',
      rsvpRequired: true,
    });

    // Track squad invite for each squad
    const groupId = `squad_event_${event.id}`;
    let squadInvitesCache = await loadSquadInvites();

    for (const squadId of input.squadIds) {
      const squadMembers = eligibleMembers.filter((m) => m.squadId === squadId);

      const squadInvite: SquadInvite = {
        id: `${groupId}_${squadId}`,
        squadId,
        targetType: 'EVENT',
        targetId: event.id,
        invitedBy: input.createdBy,
        invitedAt: new Date().toISOString(),
        memberCount: squadMembers.length,
        excludedMemberIds: input.excludeMemberIds,
        responses: {
          accepted: 0,
          declined: 0,
          pending: squadMembers.length,
        },
      };

      squadInvitesCache.push(squadInvite);
    }
    await saveSquadInvites(squadInvitesCache);

    // Send notifications to all unique parents
    const parentMap = new Map<string, SquadMember[]>();
    eligibleMembers.forEach((m) => {
      const existing = parentMap.get(m.parentId) || [];
      parentMap.set(m.parentId, [...existing, m]);
    });

    const notificationResults = await Promise.all(
      Array.from(parentMap.entries()).map(async ([parentId, athletes]) => {
        try {
          const athleteNames = (
            await Promise.all(
              athletes.map((athlete, index) =>
                resolveAthleteName(athlete.athleteId, `Athlete ${index + 1}`),
              ),
            )
          ).join(', ');
          await notificationService.create({
            id: `notif_event_${Date.now()}_${parentId}`,
            type: 'booking',
            title: 'Event Invitation',
            body: `${athleteNames} invited to ${input.title} on ${input.date}`,
            recipientId: parentId,
            recipientRole: 'parent',
            deepLink: `/events/${event.id}`,
            data: {
              eventId: event.id,
              eventTitle: input.title,
            },
            timeLabel: 'Just now',
          });
          return { sent: 1, error: null };
        } catch (error) {
          return {
            sent: 0,
            error: {
              memberId: athletes[0].athleteId,
              error: error instanceof Error ? error.message : 'Unknown error',
            } satisfies BulkInviteError,
          };
        }
      }),
    );

    const sent = notificationResults.reduce((count, result) => count + result.sent, 0);
    const errors = notificationResults.flatMap((result) => (result.error ? [result.error] : []));
    const failed = errors.length;

    return {
      event,
      inviteResult: {
        sent,
        successful: sent,
        failed,
        skipped: 0,
        totalAttempted: eligibleMembers.length,
        errors,
        groupId,
      },
    };
  },

  /**
   * Get event invites for a specific event
   */
  async getEventInvites(eventId: string): Promise<SquadInvite[]> {
    if (!apiClient.isMockMode) {
      const result = await apiFetch<EventSquadInvitesResponse>(
        `/v1/events/${encodeURIComponent(eventId)}/invites/squads`,
      );
      if (!result.success) {
        logger.warn('Failed to load event squad invites through API', {
          eventId,
          error: result.error,
        });
        throw new Error(result.error.message);
      }
      return result.data.invites;
    }

    const squadInvitesCache = await loadSquadInvites();
    return squadInvitesCache.filter((si) => si.targetType === 'EVENT' && si.targetId === eventId);
  },

  /**
   * Get all event invites by organizer
   */
  async getOrganizerEventInvites(organizerId: string): Promise<SquadInvite[]> {
    if (!apiClient.isMockMode) {
      const result = await apiFetch<EventSquadInvitesResponse>(
        `/v1/organizers/${encodeURIComponent(organizerId)}/event-invites`,
      );
      if (!result.success) {
        logger.warn('Failed to load organizer event squad invites through API', {
          organizerId,
          error: result.error,
        });
        throw new Error(result.error.message);
      }
      return result.data.invites;
    }

    const squadInvitesCache = await loadSquadInvites();
    return squadInvitesCache.filter(
      (si) => si.targetType === 'EVENT' && si.invitedBy === organizerId,
    );
  },

  /**
   * Update event invite responses
   */
  async updateEventInviteResponse(
    eventId: string,
    squadId: string,
    accepted: number,
    declined: number,
  ): Promise<void> {
    if (!apiClient.isMockMode) {
      logger.warn(API_MODE_EVENT_INVITE_RESPONSE_UNSUPPORTED, {
        eventId,
        squadId,
        accepted,
        declined,
      });
      throw new Error(API_MODE_EVENT_INVITE_RESPONSE_UNSUPPORTED);
    }

    let squadInvitesCache = await loadSquadInvites();
    const index = squadInvitesCache.findIndex(
      (si) => si.targetType === 'EVENT' && si.targetId === eventId && si.squadId === squadId,
    );

    if (index !== -1) {
      const invite = squadInvitesCache[index];
      squadInvitesCache[index] = {
        ...invite,
        responses: {
          accepted,
          declined,
          pending: invite.memberCount - accepted - declined,
        },
      };
      await saveSquadInvites(squadInvitesCache);
    }
  },

  /**
   * Get total RSVP counts for an event across all squads
   */
  async getEventRsvpTotals(eventId: string): Promise<{
    accepted: number;
    declined: number;
    pending: number;
    total: number;
  }> {
    if (!apiClient.isMockMode) {
      const rsvps = await eventRsvpService.getEventRSVPs(eventId);
      return rsvps.reduce(
        (acc, rsvp) => ({
          accepted: acc.accepted + (rsvp.status === 'GOING' ? 1 : 0),
          declined: acc.declined + (rsvp.status === 'NOT_GOING' ? 1 : 0),
          pending: acc.pending,
          total: acc.total + 1,
        }),
        { accepted: 0, declined: 0, pending: 0, total: 0 },
      );
    }

    const invites = await this.getEventInvites(eventId);

    const totals = invites.reduce(
      (acc, invite) => ({
        accepted: acc.accepted + invite.responses.accepted,
        declined: acc.declined + invite.responses.declined,
        pending: acc.pending + invite.responses.pending,
        total: acc.total + invite.memberCount,
      }),
      { accepted: 0, declined: 0, pending: 0, total: 0 },
    );

    return totals;
  },
};
