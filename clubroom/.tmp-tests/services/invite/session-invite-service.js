"use strict";
/**
 * Session Invite Service
 *
 * Handles individual session invites between coaches and parents.
 * Core CRUD operations for session invitations.
 *
 * FLOW:
 * 1. COACH: Selects athlete(s) -> Picks time slots -> Sends invite
 * 2. PARENT: Gets notification -> Opens invites -> Sees invite card
 * 3. PARENT: Accepts (picks slot) / Declines / Counter-proposes
 * 4. COACH: Gets notification of response -> Booking created if accepted
 *
 * API Integration Notes:
 * - POST /api/session-invites - Create invite
 * - GET /api/session-invites?coachId=X - Coach's sent invites
 * - GET /api/session-invites?parentId=X - Parent's received invites
 * - PATCH /api/session-invites/:id/respond - Accept/decline/counter
 * - WebSocket event: session_invite_received
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionInviteService = void 0;
exports.loadFromStorage = loadFromStorage;
exports.saveToStorage = saveToStorage;
exports.getInvitesCache = getInvitesCache;
exports.setInvitesCache = setInvitesCache;
exports.getMockInvites = getMockInvites;
const api_client_1 = require("../api-client");
const config_1 = require("@/constants/config");
const storage_keys_1 = require("@/constants/storage-keys");
const notification_service_1 = require("../notification-service");
const booking_service_1 = require("../booking-service");
const invite_hold_service_1 = require("../invite-hold-service");
const availability_service_1 = require("../availability-service");
const multi_week_booking_service_1 = require("../multi-week-booking-service");
const logger_1 = require("@/utils/logger");
const format_1 = require("@/utils/format");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('SessionInviteService');
const USE_MOCK = config_1.api.useMock;
// ============================================================================
// MOCK DATA
// ============================================================================
const MOCK_INVITES = [
    {
        id: 'inv_1',
        coachId: 'coach1',
        coachName: 'Marcus Thompson',
        coachPhotoUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
        clubName: 'Bradwell Boys Academy',
        athleteIds: ['athlete_1'],
        athleteNames: ['Tom Baker'],
        parentId: 'parent_1',
        parentName: 'Sarah Baker',
        proposedSlots: [
            { date: '2026-01-15', startTime: '16:00', endTime: '17:00', location: 'Hackney Marshes' },
            { date: '2026-01-17', startTime: '16:00', endTime: '17:00', location: 'Hackney Marshes' },
        ],
        sessionType: '1:1 Coaching',
        focus: 'Finishing',
        notes: 'Great progress last session! Ready to work on weak foot finishing.',
        priceUsd: 60,
        status: 'PENDING',
        expiresAt: '2026-01-14T23:59:59Z',
        createdAt: '2026-01-10T10:00:00Z',
    },
    {
        id: 'inv_2',
        coachId: 'coach_2',
        coachName: 'Emma Williams',
        coachPhotoUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
        clubName: 'Victoria Park FC',
        athleteIds: ['athlete_2'],
        athleteNames: ['Lucy Baker'],
        parentId: 'parent_1',
        parentName: 'Sarah Baker',
        proposedSlots: [
            { date: '2026-01-20', startTime: '10:00', endTime: '11:00', location: 'Victoria Park' },
        ],
        sessionType: '1:1 Coaching',
        focus: 'Goalkeeping',
        notes: 'Trial session to assess current level.',
        priceUsd: 50,
        status: 'PENDING',
        expiresAt: '2026-01-18T23:59:59Z',
        createdAt: '2026-01-10T14:30:00Z',
    },
    {
        id: 'inv_3',
        coachId: 'coach1',
        coachName: 'Marcus Thompson',
        clubName: 'Bradwell Boys Academy',
        athleteIds: ['athlete_3'],
        athleteNames: ['James Wilson'],
        parentId: 'parent_2',
        parentName: 'Mike Wilson',
        proposedSlots: [
            { date: '2026-01-12', startTime: '15:00', endTime: '16:00', location: 'Hackney Marshes' },
        ],
        sessionType: '1:1 Coaching',
        focus: 'Dribbling',
        priceUsd: 60,
        status: 'ACCEPTED',
        expiresAt: '2026-01-11T23:59:59Z',
        createdAt: '2026-01-08T09:00:00Z',
        respondedAt: '2026-01-08T12:00:00Z',
    },
];
// ============================================================================
// STORAGE & CACHING
// ============================================================================
let invitesCache = [...MOCK_INVITES];
async function loadFromStorage() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.SESSION_INVITES, null);
        if (stored)
            return stored;
    }
    catch (error) {
        logger.error('Failed to load from storage', error);
    }
    return [...MOCK_INVITES];
}
async function saveToStorage(invites) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SESSION_INVITES, invites);
    }
    catch (error) {
        logger.error('Failed to save to storage', error);
    }
}
function getInvitesCache() {
    return invitesCache;
}
function setInvitesCache(invites) {
    invitesCache = invites;
}
function getMockInvites() {
    return [...MOCK_INVITES];
}
// ============================================================================
// SESSION INVITE SERVICE
// ============================================================================
exports.sessionInviteService = {
    // ==========================================================================
    // CORE INVITE OPERATIONS (Individual & Multiple Athletes)
    // ==========================================================================
    /**
     * Create invite for single or multiple athletes
     * Unified method that handles both single and bulk athlete invites
     */
    async createInvite(athletes, sessionDetails) {
        const athleteIds = Array.isArray(athletes) ? athletes : [athletes];
        const athleteNames = Array.isArray(sessionDetails.athleteNames)
            ? sessionDetails.athleteNames
            : sessionDetails.athleteNames
                ? [sessionDetails.athleteNames]
                : athleteIds.map((_, i) => `Athlete ${i + 1}`);
        let input = {
            ...sessionDetails,
            athleteIds,
            athleteNames,
        };
        // Validate proposed slots are still available before creating
        if (input.proposedSlots.length > 0) {
            const validationResults = await this._validateSlots(input.coachId, input.proposedSlots, input.sessionTemplateId);
            if (validationResults.takenSlots.length > 0) {
                const takenDesc = validationResults.takenSlots
                    .map((s) => `${s.date} ${s.startTime}`)
                    .join(', ');
                logger.warn('Some proposed slots are no longer available', { takenDesc });
                if (validationResults.validSlots.length === 0) {
                    throw new Error('All proposed time slots are no longer available. Please select new times.');
                }
                // Proceed with only valid slots
                input = {
                    ...input,
                    proposedSlots: validationResults.validSlots,
                };
            }
        }
        return this._createSingleInvite(input);
    },
    /**
     * Validate proposed slots against current availability
     */
    async _validateSlots(coachId, slots, sessionTemplateId) {
        const validSlots = [];
        const takenSlots = [];
        // Get date range from proposed slots
        const dates = slots.map((s) => s.date).sort();
        const startDate = dates[0];
        const endDate = dates[dates.length - 1];
        const invitableSlots = await availability_service_1.availabilityService.getInvitableSlots(coachId, startDate, endDate, sessionTemplateId);
        const invitableKeys = new Set(invitableSlots.map((s) => `${s.date}_${s.startTime}`));
        for (const slot of slots) {
            const key = `${slot.date}_${slot.startTime}`;
            if (invitableKeys.has(key)) {
                validSlots.push(slot);
            }
            else {
                takenSlots.push(slot);
            }
        }
        return { validSlots, takenSlots };
    },
    /**
     * Internal method to create a single invite
     */
    async _createSingleInvite(input) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays || 7));
        const newInvite = {
            id: `inv_${Date.now()}`,
            coachId: input.coachId,
            coachName: input.coachName,
            coachPhotoUrl: input.coachPhotoUrl,
            clubName: input.clubName,
            inviteType: input.inviteType || 'OPEN',
            squadIds: input.squadIds,
            athleteIds: input.athleteIds,
            athleteNames: input.athleteNames,
            parentId: input.parentId,
            parentName: input.parentName,
            proposedSlots: input.proposedSlots,
            sessionType: input.sessionType,
            sessionTemplateId: input.sessionTemplateId,
            focus: input.focus,
            notes: input.notes,
            priceUsd: input.priceUsd,
            duration: input.duration,
            status: 'PENDING',
            expiresAt: expiresAt.toISOString(),
            createdAt: new Date().toISOString(),
            groupId: input.groupId,
            isRecurring: input.isRecurring,
            recurrenceWeeks: input.recurrenceWeeks,
        };
        // Generate weekSlots for recurring invites
        if (input.isRecurring && input.recurrenceWeeks && input.proposedSlots.length > 0) {
            const startDate = input.proposedSlots[0].date;
            newInvite.weekSlots = this.generateWeekSlots(input.proposedSlots, input.recurrenceWeeks, startDate);
        }
        // Populate location from availability slots if not already set on proposed slots
        for (const slot of newInvite.proposedSlots) {
            if (!slot.location) {
                try {
                    const availSlots = await availability_service_1.availabilityService.getAvailableSlots(input.coachId, slot.date, slot.date, input.duration ?? 60);
                    const match = availSlots.find((s) => s.date === slot.date && s.startTime === slot.startTime);
                    if (match?.location) {
                        slot.location = match.location;
                    }
                }
                catch {
                    // Non-critical: location enrichment is best-effort
                }
            }
        }
        if (USE_MOCK) {
            invitesCache = await loadFromStorage();
            invitesCache.push(newInvite);
            await saveToStorage(invitesCache);
            // Create soft-holds for proposed slots
            await invite_hold_service_1.inviteHoldService.createHolds(input.coachId, newInvite.id, input.proposedSlots.map((s) => ({ date: s.date, startTime: s.startTime, endTime: s.endTime })), newInvite.expiresAt);
            // Create notification for parent
            const coachFirstName = input.coachName.split(' ')[0];
            const athleteDisplay = input.athleteNames.length === 1
                ? input.athleteNames[0]
                : `${input.athleteNames.length} athletes`;
            const clubDisplay = input.clubName ? ` to ${input.clubName}` : '';
            const notification = {
                id: `notif_${Date.now()}`,
                type: 'booking',
                title: 'New Session Invite',
                body: `Coach ${coachFirstName} has invited ${athleteDisplay}${clubDisplay} - ${input.sessionType}`,
                timeLabel: 'Just now',
                read: false,
                actionLabel: 'View Invite',
            };
            await notification_service_1.notificationService.create(notification);
            return newInvite;
        }
        const response = await fetch('/api/session-invites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newInvite),
        });
        return response.json();
    },
    /**
     * Accept an invite - CRITICAL: Routes through bookingService.createBooking()
     */
    async acceptInvite(inviteId, selectedSlot) {
        return this.respondToInvite({
            inviteId,
            response: 'ACCEPTED',
            selectedSlot,
        });
    },
    /**
     * Decline an invite
     */
    async declineInvite(inviteId) {
        return this.respondToInvite({
            inviteId,
            response: 'DECLINED',
        });
    },
    /**
     * Respond to an invite (parent action)
     * - ACCEPTED: Creates a booking automatically via bookingService and notifies coach
     * - DECLINED: Notifies coach
     * - COUNTERED: Sends alternative times back to coach
     */
    async respondToInvite(input) {
        if (USE_MOCK) {
            invitesCache = await loadFromStorage();
            const index = invitesCache.findIndex((inv) => inv.id === input.inviteId);
            if (index === -1) {
                return (0, result_1.err)((0, result_1.serviceError)('NOT_FOUND', `Invite not found: ${input.inviteId}`));
            }
            const invite = invitesCache[index];
            invitesCache[index] = {
                ...invite,
                status: input.response,
                respondedAt: new Date().toISOString(),
                selectedSlot: input.selectedSlot,
                counterProposal: input.counterProposal,
                counterNote: input.counterNote,
            };
            await saveToStorage(invitesCache);
            // Create notification for coach based on response
            const athleteNames = invite.athleteNames.join(', ');
            const notification = {
                id: `notif_${Date.now()}`,
                type: 'booking',
                title: '',
                body: '',
                timeLabel: 'Just now',
                read: false,
            };
            if (input.response === 'ACCEPTED') {
                // CRITICAL: Validate slot is still available before creating booking
                if (input.selectedSlot) {
                    const slotDate = input.selectedSlot.date;
                    const slotStart = input.selectedSlot.startTime;
                    const slots = await availability_service_1.availabilityService.getAvailableSlots(invite.coachId, slotDate, slotDate, invite.duration || 60);
                    const matchingSlot = slots.find((s) => s.date === slotDate && s.startTime === slotStart);
                    if (matchingSlot && !matchingSlot.isAvailable) {
                        // Slot is taken — revert invite status back to PENDING
                        invitesCache[index] = { ...invite, status: 'PENDING' };
                        await saveToStorage(invitesCache);
                        // Release holds since we're reverting
                        // Return remaining available proposed slots
                        const remainingSlots = invite.proposedSlots.filter((ps) => !(ps.date === slotDate && ps.startTime === slotStart));
                        return (0, result_1.err)((0, result_1.serviceError)('CONFLICT', `This time slot is no longer available.${remainingSlots.length > 0 ? ' Please pick another time.' : ' All proposed times have been taken.'}`));
                    }
                }
                notification.title = 'Invite Accepted!';
                notification.body = `${invite.parentName} accepted your invite for ${athleteNames}. Session confirmed for ${input.selectedSlot
                    ? new Date(input.selectedSlot.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
                        ` at ${input.selectedSlot.startTime}`
                    : 'the selected time'}.`;
                // CRITICAL: Create the actual booking via bookingService
                if (input.selectedSlot) {
                    const scheduledAt = `${input.selectedSlot.date}T${input.selectedSlot.startTime}:00`;
                    const endTime = input.selectedSlot.endTime;
                    const startTime = input.selectedSlot.startTime;
                    // Calculate duration in minutes from start and end time
                    const [startHour, startMin] = startTime.split(':').map(Number);
                    const [endHour, endMin] = endTime.split(':').map(Number);
                    const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
                    const bookingResult = await booking_service_1.bookingService.createBooking({
                        coachId: invite.coachId,
                        coachName: invite.coachName,
                        athleteIds: [invite.athleteIds[0]], // Primary athlete
                        athleteNames: [invite.athleteNames[0]],
                        bookedById: invite.parentId,
                        bookedByName: invite.parentName,
                        scheduledAt,
                        duration: durationMinutes > 0 ? durationMinutes : 60,
                        location: input.selectedSlot.location || 'Coach preferred location',
                        service: invite.sessionType,
                        serviceType: invite.sessionType,
                        objectives: invite.focus ? [invite.focus] : [],
                        price: invite.priceUsd,
                        notes: invite.notes,
                        sessionInviteId: invite.id, // Link booking to invite
                    });
                    if (bookingResult.success && bookingResult.data) {
                        // Link booking back to invite (bidirectional)
                        invitesCache[index].bookingId = bookingResult.data.id;
                        await saveToStorage(invitesCache);
                        logger.info('Booking created successfully', { bookingId: bookingResult.data.id });
                    }
                    else if (!bookingResult.success) {
                        logger.error('Failed to create booking', { error: bookingResult.error?.message });
                    }
                }
                // Release all holds for this invite (accepted slot becomes a booking, others freed)
                await invite_hold_service_1.inviteHoldService.releaseHoldsForInvite(invite.id);
            }
            else if (input.response === 'DECLINED') {
                notification.title = 'Invite Declined';
                notification.body = `${invite.parentName} declined your session invite for ${athleteNames}.`;
                // Release all holds
                await invite_hold_service_1.inviteHoldService.releaseHoldsForInvite(invite.id);
            }
            else if (input.response === 'COUNTERED') {
                notification.title = 'Counter Proposal Received';
                notification.body = `${invite.parentName} proposed alternative times for ${athleteNames}. ${input.counterNote || ''}`;
                // Release original holds (counter slots aren't held until coach accepts)
                await invite_hold_service_1.inviteHoldService.releaseHoldsForInvite(invite.id);
            }
            await notification_service_1.notificationService.create(notification);
            return (0, result_1.ok)(invitesCache[index]);
        }
        const response = await fetch(`/api/session-invites/${input.inviteId}/respond`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Cancel an invite (coach action)
     */
    async cancelInvite(inviteId) {
        if (USE_MOCK) {
            invitesCache = await loadFromStorage();
            const index = invitesCache.findIndex((inv) => inv.id === inviteId);
            if (index !== -1) {
                invitesCache[index].status = 'EXPIRED';
                await saveToStorage(invitesCache);
            }
            // Release all holds
            await invite_hold_service_1.inviteHoldService.releaseHoldsForInvite(inviteId);
            return;
        }
        await fetch(`/api/session-invites/${inviteId}`, {
            method: 'DELETE',
        });
    },
    /**
     * Dismiss/remove an invite from parent's view (parent action)
     * This doesn't delete the invite, just hides it from the parent's list
     */
    async dismissInvite(inviteId) {
        if (USE_MOCK) {
            invitesCache = await loadFromStorage();
            const index = invitesCache.findIndex((inv) => inv.id === inviteId);
            if (index !== -1) {
                // Mark as dismissed by setting a flag
                invitesCache[index].dismissed = true;
                await saveToStorage(invitesCache);
            }
            return;
        }
        await fetch(`/api/session-invites/${inviteId}/dismiss`, {
            method: 'POST',
        });
    },
    // ==========================================================================
    // QUERY METHODS - Individual Invites
    // ==========================================================================
    /**
     * Get all invites for a coach (sent invites)
     */
    async getCoachInvites(coachId) {
        if (USE_MOCK) {
            invitesCache = await loadFromStorage();
            return invitesCache.filter((inv) => inv.coachId === coachId);
        }
        const response = await fetch(`/api/session-invites?coachId=${coachId}`);
        return response.json();
    },
    /**
     * Get all invites for a parent (received invites)
     * Filters out dismissed invites
     */
    async getParentInvites(parentId) {
        if (USE_MOCK) {
            invitesCache = await loadFromStorage();
            return invitesCache.filter((inv) => inv.parentId === parentId && !inv.dismissed);
        }
        const response = await fetch(`/api/session-invites?parentId=${parentId}`);
        return response.json();
    },
    /**
     * Get pending invites for a parent
     */
    async getPendingInvites(parentId) {
        if (!parentId) {
            // Return all pending invites if no parentId provided
            invitesCache = await loadFromStorage();
            return invitesCache.filter((inv) => inv.status === 'PENDING' && new Date(inv.expiresAt) > new Date());
        }
        const invites = await this.getParentInvites(parentId);
        return invites.filter((inv) => inv.status === 'PENDING' && new Date(inv.expiresAt) > new Date());
    },
    /**
     * Get invite history - all invites
     */
    async getInviteHistory() {
        if (USE_MOCK) {
            invitesCache = await loadFromStorage();
            return invitesCache;
        }
        const response = await fetch('/api/session-invites');
        return response.json();
    },
    /**
     * Get a single invite by ID
     */
    async getInvite(inviteId) {
        if (USE_MOCK) {
            invitesCache = await loadFromStorage();
            return invitesCache.find((inv) => inv.id === inviteId) || null;
        }
        const response = await fetch(`/api/session-invites/${inviteId}`);
        if (!response.ok)
            return null;
        return response.json();
    },
    /**
     * Get countered invites that need coach attention
     */
    async getCounteredInvites(coachId) {
        const invites = await this.getCoachInvites(coachId);
        return invites.filter((inv) => inv.status === 'COUNTERED');
    },
    /**
     * Accept a counter proposal (coach action)
     */
    async acceptCounterProposal(inviteId, selectedSlot) {
        if (USE_MOCK) {
            invitesCache = await loadFromStorage();
            const index = invitesCache.findIndex((inv) => inv.id === inviteId);
            if (index === -1) {
                return (0, result_1.err)((0, result_1.serviceError)('NOT_FOUND', `Invite not found: ${inviteId}`));
            }
            invitesCache[index] = {
                ...invitesCache[index],
                status: 'ACCEPTED',
                selectedSlot,
                respondedAt: new Date().toISOString(),
            };
            await saveToStorage(invitesCache);
            // Create notification for parent
            const invite = invitesCache[index];
            const notification = {
                id: `notif_${Date.now()}`,
                type: 'booking',
                title: 'Counter Proposal Accepted!',
                body: `Coach ${invite.coachName.split(' ')[0]} accepted your proposed time. Session confirmed!`,
                timeLabel: 'Just now',
                read: false,
            };
            await notification_service_1.notificationService.create(notification);
            // CRITICAL: Create the actual booking when counter-proposal is accepted
            const scheduledAt = `${selectedSlot.date}T${selectedSlot.startTime}:00`;
            const endTime = selectedSlot.endTime;
            const startTime = selectedSlot.startTime;
            // Calculate duration in minutes from start and end time
            const [startHour, startMin] = startTime.split(':').map(Number);
            const [endHour, endMin] = endTime.split(':').map(Number);
            const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
            const bookingResult = await booking_service_1.bookingService.createBooking({
                coachId: invite.coachId,
                coachName: invite.coachName,
                athleteIds: [invite.athleteIds[0]], // Primary athlete
                athleteNames: [invite.athleteNames[0]],
                bookedById: invite.parentId,
                bookedByName: invite.parentName,
                scheduledAt,
                duration: durationMinutes > 0 ? durationMinutes : 60,
                location: selectedSlot.location || 'Coach preferred location',
                service: invite.sessionType,
                serviceType: invite.sessionType,
                objectives: invite.focus ? [invite.focus] : [],
                price: invite.priceUsd,
                notes: invite.notes,
                sessionInviteId: invite.id, // Link booking to invite
            });
            if (bookingResult.success && bookingResult.data) {
                // Link booking back to invite (bidirectional)
                invitesCache[index].bookingId = bookingResult.data.id;
                await saveToStorage(invitesCache);
                logger.info('Booking created from counter-proposal', { bookingId: bookingResult.data.id });
            }
            else if (!bookingResult.success) {
                logger.error('Failed to create booking from counter-proposal', { error: bookingResult.error?.message });
            }
            return (0, result_1.ok)(invitesCache[index]);
        }
        const response = await fetch(`/api/session-invites/${inviteId}/accept-counter`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ selectedSlot }),
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Alias for getParentInvites - clearer naming
     */
    async getInvitesForParent(parentId) {
        return this.getParentInvites(parentId);
    },
    // ==========================================================================
    // INVITE TYPE FILTERING
    // ==========================================================================
    /**
     * Get open invites visible to any parent browsing sessions
     */
    async getOpenInvites() {
        if (USE_MOCK) {
            invitesCache = await loadFromStorage();
            return invitesCache.filter((inv) => (!inv.inviteType || inv.inviteType === 'OPEN') && !inv.dismissed);
        }
        const response = await fetch('/api/session-invites?inviteType=OPEN');
        return response.json();
    },
    /**
     * Get closed invites for a specific parent (invite-only sessions)
     */
    async getClosedInvitesForParent(parentId) {
        if (USE_MOCK) {
            invitesCache = await loadFromStorage();
            return invitesCache.filter((inv) => inv.inviteType === 'CLOSED' && inv.parentId === parentId && !inv.dismissed);
        }
        const response = await fetch(`/api/session-invites?inviteType=CLOSED&parentId=${parentId}`);
        return response.json();
    },
    /**
     * Get squad-only invites for a parent who belongs to the relevant squads
     */
    async getSquadOnlyInvitesForParent(parentId, memberSquadIds) {
        if (USE_MOCK) {
            invitesCache = await loadFromStorage();
            return invitesCache.filter((inv) => {
                if (inv.inviteType !== 'SQUAD_ONLY')
                    return false;
                if (inv.dismissed)
                    return false;
                // The parent must be the target OR their squad must match
                if (inv.parentId === parentId)
                    return true;
                if (inv.squadIds && inv.squadIds.some((sid) => memberSquadIds.includes(sid)))
                    return true;
                return false;
            });
        }
        const response = await fetch(`/api/session-invites?inviteType=SQUAD_ONLY&parentId=${parentId}&squadIds=${memberSquadIds.join(',')}`);
        return response.json();
    },
    /**
     * Get all available invites for a parent, filtered by invite type rules.
     * OPEN: visible to all
     * CLOSED: only if explicitly invited
     * SQUAD_ONLY: only if parent's squad matches
     */
    async getAvailableInvitesForParent(parentId, memberSquadIds = []) {
        if (USE_MOCK) {
            invitesCache = await loadFromStorage();
            return invitesCache.filter((inv) => {
                if (inv.dismissed)
                    return false;
                const type = inv.inviteType || 'OPEN';
                if (type === 'OPEN')
                    return true;
                if (type === 'CLOSED')
                    return inv.parentId === parentId;
                if (type === 'SQUAD_ONLY') {
                    if (inv.parentId === parentId)
                        return true;
                    if (inv.squadIds && inv.squadIds.some((sid) => memberSquadIds.includes(sid)))
                        return true;
                    return false;
                }
                return false;
            });
        }
        const response = await fetch(`/api/session-invites/available?parentId=${parentId}&squadIds=${memberSquadIds.join(',')}`);
        return response.json();
    },
    /**
     * Clear invite cache (for testing)
     */
    async clearCache() {
        invitesCache = [...MOCK_INVITES];
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SESSION_INVITES);
    },
    // ==========================================================================
    // MULTI-WEEK / RECURRING INVITE METHODS
    // ==========================================================================
    /**
     * Generate weekSlots from a recurring invite's proposed slots and recurrence config.
     * Used to populate the per-week acceptance UI.
     */
    generateWeekSlots(proposedSlots, recurrenceWeeks, startDate) {
        const weekSlots = [];
        const baseSlot = proposedSlots[0];
        if (!baseSlot)
            return weekSlots;
        const start = new Date(startDate + 'T00:00:00');
        for (let i = 0; i < recurrenceWeeks; i++) {
            const weekDate = new Date(start);
            weekDate.setDate(start.getDate() + i * 7);
            const dateStr = (0, format_1.toDateStr)(weekDate);
            weekSlots.push({
                weekDate: dateStr,
                startTime: baseSlot.startTime,
                endTime: baseSlot.endTime,
                location: baseSlot.location,
                accepted: true, // Default all to accepted
            });
        }
        return weekSlots;
    },
    /**
     * Respond to a recurring invite with per-week acceptance.
     * Creates a BookingSeries for the accepted weeks only.
     */
    async respondToRecurringInvite(inviteId, weekAcceptances) {
        invitesCache = await loadFromStorage();
        const index = invitesCache.findIndex((inv) => inv.id === inviteId);
        if (index === -1) {
            return (0, result_1.err)((0, result_1.serviceError)('NOT_FOUND', `Invite not found: ${inviteId}`));
        }
        const invite = invitesCache[index];
        const acceptedWeeks = weekAcceptances.filter((w) => w.accepted);
        const declinedWeeks = weekAcceptances.filter((w) => !w.accepted);
        if (acceptedWeeks.length === 0) {
            // Decline the entire invite
            return this.respondToInvite({
                inviteId,
                response: 'DECLINED',
            });
        }
        // Create a multi-week booking series for accepted weeks
        const seriesResult = await multi_week_booking_service_1.multiWeekBookingService.createSeries({
            createdById: invite.parentId,
            createdByName: invite.parentName,
            coachId: invite.coachId,
            coachName: invite.coachName,
            athleteIds: invite.athleteIds,
            athleteNames: invite.athleteNames,
            sessionType: invite.sessionType,
            focus: invite.focus,
            pricePerSession: invite.priceUsd,
            selectedWeeks: acceptedWeeks.map((w) => w.weekDate),
            startTime: acceptedWeeks[0].startTime,
            duration: invite.duration ?? 60,
            location: acceptedWeeks[0].location ?? 'Coach preferred location',
            patternLabel: `${acceptedWeeks.length} of ${weekAcceptances.length} weeks`,
            sessionInviteId: invite.id,
            notes: invite.notes,
        });
        if (!seriesResult.success) {
            logger.error('Failed to create series from recurring invite', { error: seriesResult.error });
            return (0, result_1.err)(seriesResult.error);
        }
        // Update the invite with acceptance data
        const status = declinedWeeks.length > 0 ? 'ACCEPTED' : 'ACCEPTED';
        invitesCache[index] = {
            ...invite,
            status,
            respondedAt: new Date().toISOString(),
            weekSlots: weekAcceptances,
            acceptedWeeks: acceptedWeeks.map((w) => w.weekDate),
            declinedWeeks: declinedWeeks.map((w) => w.weekDate),
            bookingId: seriesResult.data.bookingIds[0], // Link to first booking
        };
        await saveToStorage(invitesCache);
        // Notify coach
        const athleteNames = invite.athleteNames.join(', ');
        const notification = {
            id: `notif_${Date.now()}`,
            type: 'booking',
            title: 'Recurring Invite Accepted!',
            body: `${invite.parentName} accepted ${acceptedWeeks.length} of ${weekAcceptances.length} weeks for ${athleteNames}.`,
            timeLabel: 'Just now',
            read: false,
        };
        await notification_service_1.notificationService.create(notification);
        // Release holds
        await invite_hold_service_1.inviteHoldService.releaseHoldsForInvite(invite.id);
        logger.info('Recurring invite responded', {
            inviteId,
            acceptedCount: acceptedWeeks.length,
            declinedCount: declinedWeeks.length,
            seriesId: seriesResult.data.id,
        });
        return (0, result_1.ok)(invitesCache[index]);
    },
};
