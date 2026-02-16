"use strict";
/**
 * RSVP Service
 *
 * Manages session RSVPs for group training sessions, events, and squad sessions.
 * Parents respond going/not_going/maybe; coaches see aggregated attendance.
 *
 * USER STORY:
 * "As a parent, I want to quickly confirm my child's attendance so the
 * coach knows who is coming."
 *
 * "As a coach, I want to see RSVP counts and send reminders to parents
 * who haven't responded yet."
 *
 * API Integration Notes:
 * - POST /api/session-rsvps - Create RSVPs for a session
 * - PATCH /api/session-rsvps/:id - Respond to RSVP
 * - GET /api/session-rsvps?sessionId=X - Get RSVPs for session
 * - GET /api/session-rsvps?userId=X - Get RSVPs for user
 * - POST /api/session-rsvps/:sessionId/reminder - Send reminder
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rsvpService = void 0;
const api_client_1 = require("./api-client");
const notification_trigger_1 = require("./notification-trigger");
const logger_1 = require("@/utils/logger");
const result_1 = require("@/types/result");
const user_service_1 = require("./user-service");
const storage_keys_1 = require("@/constants/storage-keys");
const event_bus_1 = require("./event-bus");
const logger = (0, logger_1.createLogger)('RsvpService');
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function loadRsvps() {
    return api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.SESSION_RSVPS, []);
}
async function saveRsvps(rsvps) {
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SESSION_RSVPS, rsvps);
}
async function resolveRsvpDisplayName(rsvp) {
    const preferredUserId = rsvp.childId || rsvp.userId;
    const userResult = await user_service_1.userService.getUserById(preferredUserId);
    if (!userResult.success)
        return 'A parent';
    const displayName = userResult.data.name?.trim();
    return displayName || 'A parent';
}
// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
exports.rsvpService = {
    /**
     * Create pending RSVPs for each member invited to a session.
     * Called by the coach or system when a group session is scheduled.
     */
    async createForSession(sessionId, members) {
        const rsvps = await loadRsvps();
        const now = new Date().toISOString();
        const newRsvps = [];
        for (const member of members) {
            // Skip if RSVP already exists for this user + session
            const exists = rsvps.some((r) => r.sessionId === sessionId && r.userId === member.userId);
            if (exists)
                continue;
            const rsvp = {
                id: api_client_1.apiClient.generateId('rsvp'),
                sessionId,
                userId: member.userId,
                childId: member.childId,
                status: 'pending',
                createdAt: now,
            };
            newRsvps.push(rsvp);
            rsvps.push(rsvp);
        }
        if (newRsvps.length > 0) {
            await saveRsvps(rsvps);
            logger.info('RSVPs created', {
                sessionId,
                count: newRsvps.length,
            });
        }
        return newRsvps;
    },
    /**
     * Respond to an RSVP (parent action).
     * Updates the RSVP status and triggers a notification to the coach.
     */
    async respond(rsvpId, status) {
        const rsvps = await loadRsvps();
        const index = rsvps.findIndex((r) => r.id === rsvpId);
        if (index === -1) {
            return (0, result_1.err)((0, result_1.notFound)('RSVP', rsvpId));
        }
        const previousStatus = rsvps[index].status;
        rsvps[index] = {
            ...rsvps[index],
            status,
            respondedAt: new Date().toISOString(),
        };
        await saveRsvps(rsvps);
        const rsvp = rsvps[index];
        const displayName = await resolveRsvpDisplayName(rsvp);
        const statusLabel = status === 'going' ? 'going' : status === 'not_going' ? 'not going' : 'maybe';
        // Notify coach of response
        await notification_trigger_1.notificationTriggers.eventRsvp(displayName, rsvp.sessionId, statusLabel);
        logger.info('RSVP responded', {
            rsvpId,
            sessionId: rsvp.sessionId,
            previousStatus,
            newStatus: status,
        });
        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.RSVP_RESPONDED, {
            rsvpId,
            sessionId: rsvp.sessionId,
            userId: rsvp.userId,
            childId: rsvp.childId,
            previousStatus,
            newStatus: status,
        });
        return (0, result_1.ok)(rsvps[index]);
    },
    /**
     * Get all RSVPs for a specific session.
     * Used by coach to see attendance overview.
     */
    async getForSession(sessionId) {
        const rsvps = await loadRsvps();
        return rsvps.filter((r) => r.sessionId === sessionId);
    },
    /**
     * Get all RSVPs for a specific user.
     * Used to show pending RSVP requests to a parent.
     */
    async getForUser(userId) {
        const rsvps = await loadRsvps();
        return rsvps.filter((r) => r.userId === userId);
    },
    /**
     * Get only pending RSVPs for a user (needs response).
     */
    async getPendingForUser(userId) {
        const rsvps = await loadRsvps();
        return rsvps.filter((r) => r.userId === userId && r.status === 'pending');
    },
    /**
     * Send reminder notification to all non-responders for a session.
     * Coach action.
     */
    async sendReminder(sessionId) {
        const rsvps = await loadRsvps();
        const pending = rsvps.filter((r) => r.sessionId === sessionId && r.status === 'pending');
        if (pending.length === 0) {
            logger.info('No pending RSVPs to remind', { sessionId });
            return;
        }
        // Send a reminder notification to each non-responder
        for (const rsvp of pending) {
            await notification_trigger_1.notificationTriggers.groupSessionCreated('RSVP Reminder', 'Please confirm your attendance', rsvp.userId);
        }
        logger.info('RSVP reminders sent', {
            sessionId,
            count: pending.length,
        });
    },
    /**
     * Get aggregated RSVP counts for a session.
     * Used by coach dashboard and RSVP summary component.
     */
    async getSessionCounts(sessionId) {
        const rsvps = await loadRsvps();
        const sessionRsvps = rsvps.filter((r) => r.sessionId === sessionId);
        return {
            going: sessionRsvps.filter((r) => r.status === 'going').length,
            notGoing: sessionRsvps.filter((r) => r.status === 'not_going').length,
            maybe: sessionRsvps.filter((r) => r.status === 'maybe').length,
            pending: sessionRsvps.filter((r) => r.status === 'pending').length,
        };
    },
    /**
     * Get aggregated RSVP counts for multiple sessions in one call.
     * Avoids N+1 queries when displaying session lists with attendance bars.
     */
    async getBatchCounts(sessionIds) {
        const rsvps = await loadRsvps();
        const result = new Map();
        // Initialize all requested sessions
        for (const sid of sessionIds) {
            result.set(sid, { going: 0, notGoing: 0, maybe: 0, pending: 0 });
        }
        // Single pass through all RSVPs
        const sessionSet = new Set(sessionIds);
        for (const r of rsvps) {
            if (!sessionSet.has(r.sessionId))
                continue;
            const counts = result.get(r.sessionId);
            if (r.status === 'going')
                counts.going++;
            else if (r.status === 'not_going')
                counts.notGoing++;
            else if (r.status === 'maybe')
                counts.maybe++;
            else
                counts.pending++;
        }
        return result;
    },
    /**
     * Delete all RSVPs for a session (e.g. when session is cancelled).
     */
    async deleteForSession(sessionId) {
        const rsvps = await loadRsvps();
        const filtered = rsvps.filter((r) => r.sessionId !== sessionId);
        await saveRsvps(filtered);
        logger.info('RSVPs deleted for session', { sessionId });
    },
    /**
     * Get a single RSVP by ID.
     */
    async getById(rsvpId) {
        const rsvps = await loadRsvps();
        return rsvps.find((r) => r.id === rsvpId) ?? null;
    },
};
