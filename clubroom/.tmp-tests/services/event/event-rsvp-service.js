"use strict";
/**
 * Event RSVP Service
 *
 * Handles RSVP management for club events: submit, update, query RSVPs,
 * and calendar integration for user events.
 *
 * API Integration Notes:
 * - POST /api/events/:id/rsvp - RSVP to event
 * - GET /api/events/:id/rsvps - Get RSVPs
 * - PATCH /api/rsvps/:id - Update RSVP
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventRsvpService = void 0;
exports.loadRSVPs = loadRSVPs;
exports.saveRSVPs = saveRSVPs;
exports.getRsvpsCache = getRsvpsCache;
exports.setRsvpsCache = setRsvpsCache;
const api_client_1 = require("../api-client");
const config_1 = require("@/constants/config");
const storage_keys_1 = require("@/constants/storage-keys");
const notification_trigger_1 = require("../notification-trigger");
const logger_1 = require("@/utils/logger");
const result_1 = require("@/types/result");
const event_crud_service_1 = require("./event-crud-service");
const USE_MOCK = config_1.api.useMock;
const logger = (0, logger_1.createLogger)('EventRsvpService');
// ============================================================================
// MOCK RSVP DATA
// ============================================================================
const MOCK_RSVPS = [
    {
        id: 'rsvp_1',
        eventId: 'event_1',
        userId: 'parent_1',
        userName: 'Sarah Baker',
        userRole: 'PARENT',
        status: 'GOING',
        guestCount: 2,
        respondedAt: '2026-01-05T10:00:00Z',
        note: 'Looking forward to it!',
    },
    {
        id: 'rsvp_2',
        eventId: 'event_1',
        userId: 'parent_2',
        userName: 'Mike Wilson',
        userRole: 'PARENT',
        status: 'GOING',
        guestCount: 1,
        respondedAt: '2026-01-06T14:30:00Z',
    },
    {
        id: 'rsvp_3',
        eventId: 'event_2',
        userId: 'parent_1',
        userName: 'Sarah Baker',
        userRole: 'PARENT',
        status: 'GOING',
        guestCount: 0,
        respondedAt: '2026-01-08T11:00:00Z',
    },
];
let rsvpsCache = [...MOCK_RSVPS];
// ============================================================================
// SHARED PERSISTENCE HELPERS
// ============================================================================
async function loadRSVPs() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.EVENT_RSVPS, null);
        if (stored)
            return stored;
    }
    catch (error) {
        logger.error('Failed to load RSVPs', error);
    }
    return [...MOCK_RSVPS];
}
async function saveRSVPs(rsvps) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.EVENT_RSVPS, rsvps);
        rsvpsCache = rsvps;
    }
    catch (error) {
        logger.error('Failed to save RSVPs', error);
    }
}
function getRsvpsCache() {
    return rsvpsCache;
}
function setRsvpsCache(rsvps) {
    rsvpsCache = rsvps;
}
// ============================================================================
// RSVP SERVICE
// ============================================================================
exports.eventRsvpService = {
    /**
     * RSVP to an event
     */
    async rsvp(eventId, userId, userName, userRole, status, guestCount = 0, userPhotoUrl) {
        const attendee = {
            userId,
            userName,
            userPhotoUrl,
            userRole,
            status,
            guestCount,
            respondedAt: new Date().toISOString(),
        };
        if (USE_MOCK) {
            const eventsCache = await (0, event_crud_service_1.loadEvents)();
            const event = eventsCache.find((e) => e.id === eventId);
            if (!event)
                return (0, result_1.err)((0, result_1.notFound)('Event', eventId));
            // Update or add attendee
            const existingIndex = event.attendees.findIndex((a) => a.userId === userId);
            if (existingIndex >= 0) {
                event.attendees[existingIndex] = attendee;
            }
            else {
                event.attendees.push(attendee);
            }
            await (0, event_crud_service_1.saveEvents)(eventsCache);
            // Trigger RSVP notification to event creator (coach)
            await notification_trigger_1.notificationTriggers.eventRsvp(userName, event.title, status, event.createdBy);
            return (0, result_1.ok)(attendee);
        }
        const response = await fetch(`/api/events/${eventId}/rsvp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(attendee),
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Get attendees for an event
     */
    async getEventAttendees(eventId) {
        if (USE_MOCK) {
            const eventsCache = await (0, event_crud_service_1.loadEvents)();
            const event = eventsCache.find((e) => e.id === eventId);
            return event?.attendees || [];
        }
        const response = await fetch(`/api/events/${eventId}/attendees`);
        return response.json();
    },
    /**
     * Get attendee counts by status
     */
    getAttendeeCounts(attendees) {
        let going = 0;
        let maybe = 0;
        let notGoing = 0;
        let totalGuests = 0;
        for (const a of attendees) {
            if (a.status === 'GOING') {
                going++;
                totalGuests += a.guestCount;
            }
            else if (a.status === 'MAYBE') {
                maybe++;
            }
            else if (a.status === 'NOT_GOING') {
                notGoing++;
            }
        }
        return { going, maybe, notGoing, totalGuests };
    },
    /**
     * Check if user has already RSVP'd
     */
    getUserRSVP(attendees, userId) {
        return attendees.find((a) => a.userId === userId);
    },
    /**
     * Check if RSVP deadline has passed
     */
    isRSVPClosed(event) {
        if (!event.rsvpDeadline)
            return false;
        const now = new Date().toISOString().split('T')[0];
        return event.rsvpDeadline < now;
    },
    /**
     * Check if event is full
     */
    isEventFull(event) {
        if (!event.maxAttendees)
            return false;
        const { going, totalGuests } = this.getAttendeeCounts(event.attendees);
        return going + totalGuests >= event.maxAttendees;
    },
    // ============================================================================
    // ENHANCED RSVP MANAGEMENT
    // ============================================================================
    /**
     * Submit or update an RSVP (enhanced version with full tracking)
     */
    async submitRSVP(input) {
        const rsvp = {
            id: `rsvp_${Date.now()}`,
            eventId: input.eventId,
            userId: input.userId,
            userName: input.userName,
            userPhotoUrl: input.userPhotoUrl,
            userRole: input.userRole,
            status: input.status,
            guestCount: input.guestCount ?? 0,
            respondedAt: new Date().toISOString(),
            note: input.note,
        };
        if (USE_MOCK) {
            rsvpsCache = await loadRSVPs();
            const existingIndex = rsvpsCache.findIndex((r) => r.eventId === input.eventId && r.userId === input.userId);
            if (existingIndex >= 0) {
                // Update existing RSVP
                rsvp.id = rsvpsCache[existingIndex].id;
                rsvp.updatedAt = new Date().toISOString();
                rsvpsCache[existingIndex] = rsvp;
            }
            else {
                // Add new RSVP
                rsvpsCache.push(rsvp);
            }
            await saveRSVPs(rsvpsCache);
            // Also update the event's attendees list for backward compatibility
            const eventsCache = await (0, event_crud_service_1.loadEvents)();
            const event = eventsCache.find((e) => e.id === input.eventId);
            if (event) {
                const attendee = {
                    userId: input.userId,
                    userName: input.userName,
                    userPhotoUrl: input.userPhotoUrl,
                    userRole: input.userRole,
                    status: input.status,
                    guestCount: input.guestCount ?? 0,
                    respondedAt: rsvp.respondedAt,
                };
                const attendeeIndex = event.attendees.findIndex((a) => a.userId === input.userId);
                if (attendeeIndex >= 0) {
                    event.attendees[attendeeIndex] = attendee;
                }
                else {
                    event.attendees.push(attendee);
                }
                await (0, event_crud_service_1.saveEvents)(eventsCache);
            }
            return rsvp;
        }
        const response = await fetch(`/api/events/${input.eventId}/rsvp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rsvp),
        });
        return response.json();
    },
    /**
     * Update an existing RSVP
     */
    async updateRSVP(rsvpId, status, guestCount) {
        if (USE_MOCK) {
            rsvpsCache = await loadRSVPs();
            const rsvp = rsvpsCache.find((r) => r.id === rsvpId);
            if (!rsvp)
                return (0, result_1.err)((0, result_1.notFound)('RSVP', rsvpId));
            rsvp.status = status;
            if (guestCount !== undefined) {
                rsvp.guestCount = guestCount;
            }
            rsvp.updatedAt = new Date().toISOString();
            await saveRSVPs(rsvpsCache);
            // Update event attendees for backward compatibility
            const eventsCache = await (0, event_crud_service_1.loadEvents)();
            const event = eventsCache.find((e) => e.id === rsvp.eventId);
            if (event) {
                const attendee = event.attendees.find((a) => a.userId === rsvp.userId);
                if (attendee) {
                    attendee.status = status;
                    if (guestCount !== undefined) {
                        attendee.guestCount = guestCount;
                    }
                    await (0, event_crud_service_1.saveEvents)(eventsCache);
                }
            }
            return (0, result_1.ok)(rsvp);
        }
        const response = await fetch(`/api/rsvps/${rsvpId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, guestCount }),
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Get all RSVPs for an event
     */
    async getEventRSVPs(eventId) {
        if (USE_MOCK) {
            rsvpsCache = await loadRSVPs();
            return rsvpsCache.filter((r) => r.eventId === eventId);
        }
        const response = await fetch(`/api/events/${eventId}/rsvps`);
        return response.json();
    },
    /**
     * Get all RSVPs by a user
     */
    async getUserRSVPs(userId) {
        if (USE_MOCK) {
            rsvpsCache = await loadRSVPs();
            return rsvpsCache.filter((r) => r.userId === userId);
        }
        const response = await fetch(`/api/users/${userId}/rsvps`);
        return response.json();
    },
    /**
     * Get a specific user's RSVP for an event
     */
    async getUserEventRSVP(eventId, userId) {
        if (USE_MOCK) {
            rsvpsCache = await loadRSVPs();
            return rsvpsCache.find((r) => r.eventId === eventId && r.userId === userId) || null;
        }
        const response = await fetch(`/api/events/${eventId}/rsvps/${userId}`);
        if (!response.ok)
            return null;
        return response.json();
    },
    // ============================================================================
    // CALENDAR INTEGRATION
    // ============================================================================
    /**
     * Get events for calendar display - returns events user has RSVP'd to or public club events
     */
    async getEventsForCalendar(userId, startDate, endDate) {
        if (USE_MOCK) {
            const eventsCache = await (0, event_crud_service_1.loadEvents)();
            rsvpsCache = await loadRSVPs();
            const start = new Date(startDate).getTime();
            const end = new Date(endDate).getTime();
            // Get events in date range
            const eventsInRange = eventsCache.filter((event) => {
                const eventDate = new Date(event.date).getTime();
                return eventDate >= start && eventDate <= end && event.status === 'PUBLISHED';
            });
            // Get user's RSVPs
            const userRSVPs = rsvpsCache.filter((r) => r.userId === userId);
            const rsvpMap = new Map(userRSVPs.map((r) => [r.eventId, r.status]));
            return eventsInRange.map((event) => ({
                id: event.id,
                title: event.title,
                date: event.date,
                startTime: event.startTime,
                endTime: event.endTime ?? event.startTime,
                location: event.venue || event.address || 'TBD',
                type: 'EVENT',
                eventType: event.eventType,
                status: rsvpMap.get(event.id) || null,
            }));
        }
        const response = await fetch(`/api/users/${userId}/calendar-events?start=${startDate}&end=${endDate}`);
        return response.json();
    },
    /**
     * Get upcoming events for a user (events they've RSVP'd to or are invited to)
     */
    async getUpcomingUserEvents(userId, limit = 5) {
        if (USE_MOCK) {
            const eventsCache = await (0, event_crud_service_1.loadEvents)();
            rsvpsCache = await loadRSVPs();
            const now = new Date().getTime();
            const userRSVPs = rsvpsCache
                .filter((r) => r.userId === userId && r.status === 'GOING')
                .map((r) => r.eventId);
            return eventsCache
                .filter((event) => {
                const eventDate = new Date(event.date).getTime();
                return (eventDate > now &&
                    event.status === 'PUBLISHED' &&
                    userRSVPs.includes(event.id));
            })
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, limit);
        }
        const response = await fetch(`/api/users/${userId}/events/upcoming?limit=${limit}`);
        return response.json();
    },
};
