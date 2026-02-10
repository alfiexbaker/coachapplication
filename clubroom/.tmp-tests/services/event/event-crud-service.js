"use strict";
/**
 * Event CRUD Service
 *
 * Handles basic CRUD operations for club events: create, read, update, publish, cancel.
 * Manages event persistence and the shared mock data layer.
 *
 * API Integration Notes:
 * - POST /api/events - Create event
 * - GET /api/events/:id - Get event details
 * - GET /api/events?clubId=X - Get club events
 * - PATCH /api/events/:id/publish - Publish event
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventCrudService = void 0;
exports.loadEvents = loadEvents;
exports.saveEvents = saveEvents;
exports.getEventsCache = getEventsCache;
exports.setEventsCache = setEventsCache;
const api_client_1 = require("../api-client");
const config_1 = require("@/constants/config");
const storage_keys_1 = require("@/constants/storage-keys");
const notification_trigger_1 = require("../notification-trigger");
const logger_1 = require("@/utils/logger");
const format_1 = require("@/utils/format");
const result_1 = require("@/types/result");
const USE_MOCK = config_1.api.useMock;
const logger = (0, logger_1.createLogger)('EventCrudService');
// ============================================================================
// MOCK DATA (shared across event sub-services via load/save helpers)
// ============================================================================
const MOCK_EVENTS = [
    {
        id: 'event_1',
        clubId: 'club_lions',
        clubName: 'Lions FC Academy',
        createdBy: 'coach1',
        createdByName: 'Director Kelly',
        title: 'End of Season Presentation',
        description: 'Join us to celebrate an amazing season! Awards ceremony, refreshments, and a chance to thank our coaches and volunteers. All players will receive participation certificates.',
        eventType: 'PRESENTATION',
        date: '2026-06-15',
        startTime: '14:00',
        endTime: '17:00',
        venue: 'Bradwell Community Centre',
        address: '45 High Street, Bradwell, CM77 8AB',
        isVirtual: false,
        targetAudience: 'ALL',
        price: 0,
        currency: 'GBP',
        rsvpRequired: true,
        rsvpDeadline: '2026-06-10',
        attendees: [
            {
                userId: 'parent_1',
                userName: 'Sarah Baker',
                userRole: 'PARENT',
                status: 'GOING',
                guestCount: 2,
                respondedAt: '2026-01-05T10:00:00Z',
            },
            {
                userId: 'parent_2',
                userName: 'Mike Wilson',
                userRole: 'PARENT',
                status: 'GOING',
                guestCount: 1,
                respondedAt: '2026-01-06T14:30:00Z',
            },
        ],
        status: 'PUBLISHED',
        imageUrl: 'https://picsum.photos/seed/presentation/800/400',
        createdAt: '2026-01-01T09:00:00Z',
    },
    {
        id: 'event_2',
        clubId: 'club_lions',
        clubName: 'Lions FC Academy',
        createdBy: 'coach1',
        createdByName: 'Director Kelly',
        title: 'Summer Tournament',
        description: 'Annual summer 7-a-side tournament with teams from across the region. Entry fee includes lunch, snacks, and a medal for all participants. Limited spots available!',
        eventType: 'TOURNAMENT',
        date: '2026-07-20',
        startTime: '09:00',
        endTime: '16:00',
        venue: 'Bradwell Sports Ground',
        address: 'Recreation Way, Bradwell, CM77 8CD',
        isVirtual: false,
        targetAudience: 'ATHLETES',
        maxAttendees: 80,
        price: 15,
        currency: 'GBP',
        rsvpRequired: true,
        rsvpDeadline: '2026-07-10',
        attendees: [
            {
                userId: 'parent_1',
                userName: 'Sarah Baker',
                userRole: 'PARENT',
                status: 'GOING',
                guestCount: 0,
                respondedAt: '2026-01-08T11:00:00Z',
            },
        ],
        status: 'PUBLISHED',
        imageUrl: 'https://picsum.photos/seed/tournament/800/400',
        createdAt: '2026-01-02T10:00:00Z',
    },
    {
        id: 'event_3',
        clubId: 'club_lions',
        clubName: 'Lions FC Academy',
        createdBy: 'coach1',
        createdByName: 'Director Kelly',
        title: 'Parents Meeting',
        description: 'Monthly parents meeting to discuss upcoming fixtures, training schedules, and club updates. This meeting will be held virtually via Zoom.',
        eventType: 'MEETING',
        date: '2026-02-05',
        startTime: '19:00',
        endTime: '20:00',
        venue: 'Online',
        isVirtual: true,
        meetingLink: 'https://zoom.us/j/123456789',
        targetAudience: 'PARENTS',
        price: 0,
        currency: 'GBP',
        rsvpRequired: true,
        rsvpDeadline: '2026-02-03',
        attendees: [
            {
                userId: 'parent_1',
                userName: 'Sarah Baker',
                userRole: 'PARENT',
                status: 'GOING',
                guestCount: 0,
                respondedAt: '2026-01-10T09:00:00Z',
            },
            {
                userId: 'parent_2',
                userName: 'Mike Wilson',
                userRole: 'PARENT',
                status: 'MAYBE',
                guestCount: 0,
                respondedAt: '2026-01-10T12:00:00Z',
            },
        ],
        status: 'PUBLISHED',
        createdAt: '2026-01-03T08:00:00Z',
    },
    {
        id: 'event_4',
        clubId: 'club_lions',
        clubName: 'Lions FC Academy',
        createdBy: 'coach_2',
        createdByName: 'Sarah Mitchell',
        title: 'Club BBQ Social',
        description: 'End of summer BBQ for all club members and families. Bring a dish to share! Games and activities for the kids.',
        eventType: 'SOCIAL',
        date: '2026-08-25',
        startTime: '12:00',
        endTime: '16:00',
        venue: 'Bradwell Park',
        address: 'Park Lane, Bradwell, CM77 8EF',
        isVirtual: false,
        targetAudience: 'ALL',
        price: 5,
        currency: 'GBP',
        rsvpRequired: true,
        rsvpDeadline: '2026-08-20',
        attendees: [],
        status: 'DRAFT',
        imageUrl: 'https://picsum.photos/seed/bbq/800/400',
        createdAt: '2026-01-05T14:00:00Z',
    },
];
let eventsCache = [...MOCK_EVENTS];
// ============================================================================
// SHARED PERSISTENCE HELPERS (used by other event sub-services)
// ============================================================================
async function loadEvents() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.CLUB_EVENTS, null);
        if (stored)
            return stored;
    }
    catch (error) {
        logger.error('Failed to load events', error);
    }
    return [...MOCK_EVENTS];
}
async function saveEvents(events) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.CLUB_EVENTS, events);
        eventsCache = events;
    }
    catch (error) {
        logger.error('Failed to save events', error);
    }
}
function getEventsCache() {
    return eventsCache;
}
function setEventsCache(events) {
    eventsCache = events;
}
// ============================================================================
// CRUD SERVICE
// ============================================================================
exports.eventCrudService = {
    /**
     * Create a new event
     */
    async createEvent(input) {
        const newEvent = {
            id: `event_${Date.now()}`,
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
            address: input.address,
            isVirtual: input.isVirtual || false,
            meetingLink: input.meetingLink,
            targetAudience: input.targetAudience,
            squadIds: input.squadIds,
            maxAttendees: input.maxAttendees,
            price: input.price ?? 0,
            currency: input.currency || 'GBP',
            rsvpRequired: input.rsvpRequired ?? true,
            rsvpDeadline: input.rsvpDeadline,
            attendees: [],
            status: 'DRAFT',
            imageUrl: input.imageUrl,
            createdAt: new Date().toISOString(),
        };
        if (USE_MOCK) {
            eventsCache = await loadEvents();
            eventsCache.push(newEvent);
            await saveEvents(eventsCache);
            // Trigger notification for event creation
            await notification_trigger_1.notificationTriggers.eventCreated(newEvent.title, newEvent.date);
            return newEvent;
        }
        const response = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newEvent),
        });
        return response.json();
    },
    /**
     * Publish an event (make visible to members)
     */
    async publishEvent(eventId) {
        if (USE_MOCK) {
            eventsCache = await loadEvents();
            const event = eventsCache.find((e) => e.id === eventId);
            if (!event)
                return (0, result_1.err)((0, result_1.notFound)('Event', eventId));
            event.status = 'PUBLISHED';
            await saveEvents(eventsCache);
            return (0, result_1.ok)(event);
        }
        const response = await fetch(`/api/events/${eventId}/publish`, {
            method: 'PATCH',
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Cancel an event
     */
    async cancelEvent(eventId) {
        if (USE_MOCK) {
            eventsCache = await loadEvents();
            const event = eventsCache.find((e) => e.id === eventId);
            if (!event)
                return (0, result_1.err)((0, result_1.notFound)('Event', eventId));
            event.status = 'CANCELLED';
            await saveEvents(eventsCache);
            // Trigger notification for event cancellation
            await notification_trigger_1.notificationTriggers.eventCancelled(event.title);
            return (0, result_1.ok)(event);
        }
        const response = await fetch(`/api/events/${eventId}/cancel`, {
            method: 'PATCH',
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Get an event by ID
     */
    async getEvent(eventId) {
        if (USE_MOCK) {
            eventsCache = await loadEvents();
            return eventsCache.find((e) => e.id === eventId) || null;
        }
        const response = await fetch(`/api/events/${eventId}`);
        if (!response.ok)
            return null;
        return response.json();
    },
    /**
     * Get upcoming events for a club
     */
    async getUpcomingEvents(clubId) {
        if (USE_MOCK) {
            eventsCache = await loadEvents();
            const now = (0, format_1.toDateStr)(new Date());
            return eventsCache
                .filter((e) => e.clubId === clubId && e.status === 'PUBLISHED' && e.date >= now)
                .sort((a, b) => a.date.localeCompare(b.date));
        }
        const response = await fetch(`/api/events?clubId=${clubId}&upcoming=true`);
        return response.json();
    },
    /**
     * Get all events for a club (including past and drafts)
     */
    async getAllClubEvents(clubId) {
        if (USE_MOCK) {
            eventsCache = await loadEvents();
            return eventsCache
                .filter((e) => e.clubId === clubId)
                .sort((a, b) => b.date.localeCompare(a.date));
        }
        const response = await fetch(`/api/events?clubId=${clubId}`);
        return response.json();
    },
    /**
     * Invite all club members to an event
     */
    async inviteClub(eventId) {
        if (USE_MOCK) {
            // In a real app, this would send notifications to all club members
            logger.info('Inviting all club members to event', { eventId });
            return;
        }
        await fetch(`/api/events/${eventId}/invite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scope: 'club' }),
        });
    },
    /**
     * Invite specific squads to an event
     */
    async inviteSquads(eventId, squadIds) {
        if (USE_MOCK) {
            eventsCache = await loadEvents();
            const event = eventsCache.find((e) => e.id === eventId);
            if (event) {
                event.squadIds = squadIds;
                await saveEvents(eventsCache);
            }
            logger.info('Inviting squads to event', { eventId, squadIds });
            return;
        }
        await fetch(`/api/events/${eventId}/invite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scope: 'squads', squadIds }),
        });
    },
};
