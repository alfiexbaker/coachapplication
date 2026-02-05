"use strict";
/**
 * Event Invite Service
 *
 * Handles event-specific invitation functionality including:
 * - Inviting squads to events
 * - Event RSVP tracking
 * - Multi-squad event invitations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventInviteService = void 0;
const notification_service_1 = require("../notification-service");
const squad_service_1 = require("../squad-service");
const event_service_1 = require("../event-service");
const logger_1 = require("@/utils/logger");
const squad_invite_service_1 = require("./squad-invite-service");
const logger = (0, logger_1.createLogger)('EventInviteService');
// ============================================================================
// EVENT INVITE SERVICE
// ============================================================================
exports.eventInviteService = {
    /**
     * Invite multiple squads to an event
     */
    async inviteSquadsToEvent(input) {
        // Get all members from all squads
        const allMembers = await squad_service_1.squadService.getMembersForSquads(input.squadIds);
        // Filter out excluded members
        const eligibleMembers = input.excludeMemberIds
            ? allMembers.filter((m) => !input.excludeMemberIds.includes(m.athleteId))
            : allMembers;
        // Create event using event service
        const event = await event_service_1.eventService.createEvent({
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
        let squadInvitesCache = await (0, squad_invite_service_1.loadSquadInvites)();
        for (const squadId of input.squadIds) {
            const squad = await squad_service_1.squadService.getSquad(squadId);
            const squadMembers = eligibleMembers.filter((m) => m.squadId === squadId);
            const squadInvite = {
                id: `${groupId}_${squadId}`,
                squadId,
                squadName: squad?.name || 'Unknown Squad',
                targetType: 'EVENT',
                targetId: event.id,
                targetTitle: input.title,
                invitedBy: input.createdBy,
                invitedByName: input.createdByName,
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
        await (0, squad_invite_service_1.saveSquadInvites)(squadInvitesCache);
        // Send notifications to all unique parents
        const parentMap = new Map();
        eligibleMembers.forEach((m) => {
            const existing = parentMap.get(m.parentId) || [];
            parentMap.set(m.parentId, [...existing, m]);
        });
        let sent = 0;
        let failed = 0;
        const errors = [];
        for (const [parentId, athletes] of parentMap.entries()) {
            try {
                const athleteNames = athletes.map((a) => a.athleteName).join(', ');
                await notification_service_1.notificationService.create({
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
            }
            catch (error) {
                failed++;
                errors.push({
                    memberId: athletes[0].athleteId,
                    athleteName: athletes[0].athleteName,
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
    async getEventInvites(eventId) {
        const squadInvitesCache = await (0, squad_invite_service_1.loadSquadInvites)();
        return squadInvitesCache.filter((si) => si.targetType === 'EVENT' && si.targetId === eventId);
    },
    /**
     * Get all event invites by organizer
     */
    async getOrganizerEventInvites(organizerId) {
        const squadInvitesCache = await (0, squad_invite_service_1.loadSquadInvites)();
        return squadInvitesCache.filter((si) => si.targetType === 'EVENT' && si.invitedBy === organizerId);
    },
    /**
     * Update event invite responses
     */
    async updateEventInviteResponse(eventId, squadId, accepted, declined) {
        let squadInvitesCache = await (0, squad_invite_service_1.loadSquadInvites)();
        const index = squadInvitesCache.findIndex((si) => si.targetType === 'EVENT' && si.targetId === eventId && si.squadId === squadId);
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
            await (0, squad_invite_service_1.saveSquadInvites)(squadInvitesCache);
        }
    },
    /**
     * Get total RSVP counts for an event across all squads
     */
    async getEventRsvpTotals(eventId) {
        const invites = await this.getEventInvites(eventId);
        const totals = invites.reduce((acc, invite) => ({
            accepted: acc.accepted + invite.responses.accepted,
            declined: acc.declined + invite.responses.declined,
            pending: acc.pending + invite.responses.pending,
            total: acc.total + invite.memberCount,
        }), { accepted: 0, declined: 0, pending: 0, total: 0 });
        return totals;
    },
};
