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
import { notificationService } from '../notification-service';
import { squadService } from '../squad-service';
import { eventService } from '../event-service';
import { createLogger } from '@/utils/logger';
import { userService } from '../user-service';

import {
  loadSquadInvites,
  saveSquadInvites,
} from './squad-invite-service';

const logger = createLogger('EventInviteService');

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
  eventType: 'TOURNAMENT' | 'SOCIAL' | 'MEETING' | 'PRESENTATION' | 'FUNDRAISER' | 'TRIAL_DAY' | 'TRAINING_CAMP' | 'OTHER';
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
    // Get all members from all squads
    const allMembers = await squadService.getMembersForSquads(input.squadIds);

    // Filter out excluded members
    const eligibleMembers = input.excludeMemberIds
      ? allMembers.filter((m) => !input.excludeMemberIds!.includes(m.athleteId))
      : allMembers;

    // Create event using event service
    const event = await eventService.createEvent({
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

    let sent = 0;
    let failed = 0;
    const errors: BulkInviteError[] = [];

    for (const [parentId, athletes] of parentMap.entries()) {
      try {
        const athleteNames = (
          await Promise.all(
            athletes.map((athlete, index) =>
              resolveAthleteName(athlete.athleteId, `Athlete ${index + 1}`)
            )
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
        sent++;
      } catch (error) {
        failed++;
        errors.push({
          memberId: athletes[0].athleteId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      event,
      inviteResult: { sent, successful: sent, failed, skipped: 0, totalAttempted: eligibleMembers.length, errors, groupId },
    };
  },

  /**
   * Get event invites for a specific event
   */
  async getEventInvites(eventId: string): Promise<SquadInvite[]> {
    const squadInvitesCache = await loadSquadInvites();
    return squadInvitesCache.filter(
      (si) => si.targetType === 'EVENT' && si.targetId === eventId
    );
  },

  /**
   * Get all event invites by organizer
   */
  async getOrganizerEventInvites(organizerId: string): Promise<SquadInvite[]> {
    const squadInvitesCache = await loadSquadInvites();
    return squadInvitesCache.filter(
      (si) => si.targetType === 'EVENT' && si.invitedBy === organizerId
    );
  },

  /**
   * Update event invite responses
   */
  async updateEventInviteResponse(
    eventId: string,
    squadId: string,
    accepted: number,
    declined: number
  ): Promise<void> {
    let squadInvitesCache = await loadSquadInvites();
    const index = squadInvitesCache.findIndex(
      (si) => si.targetType === 'EVENT' && si.targetId === eventId && si.squadId === squadId
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
    const invites = await this.getEventInvites(eventId);

    const totals = invites.reduce(
      (acc, invite) => ({
        accepted: acc.accepted + invite.responses.accepted,
        declined: acc.declined + invite.responses.declined,
        pending: acc.pending + invite.responses.pending,
        total: acc.total + invite.memberCount,
      }),
      { accepted: 0, declined: 0, pending: 0, total: 0 }
    );

    return totals;
  },
};
