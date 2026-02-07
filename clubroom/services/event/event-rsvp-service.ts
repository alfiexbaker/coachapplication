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

import { apiClient } from '../api-client';
import { api } from '@/constants/config';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { notificationTriggers } from '../notification-trigger';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';
import { type Result, type ServiceError, ok, err, notFound } from '@/types/result';
import type {
  ClubEvent,
  ClubEventType,
  EventAttendee,
  EventRSVP,
  RSVPStatus,
  SubmitRSVPInput,
} from '@/constants/types';
import { loadEvents, saveEvents } from './event-crud-service';

const USE_MOCK = api.useMock;
const logger = createLogger('EventRsvpService');

// ============================================================================
// MOCK RSVP DATA
// ============================================================================

const MOCK_RSVPS: EventRSVP[] = [
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

let rsvpsCache: EventRSVP[] = [...MOCK_RSVPS];

// ============================================================================
// SHARED PERSISTENCE HELPERS
// ============================================================================

export async function loadRSVPs(): Promise<EventRSVP[]> {
  try {
    const stored = await apiClient.get<EventRSVP[] | null>(STORAGE_KEYS.EVENT_RSVPS, null);
    if (stored) return stored;
  } catch (error) {
    logger.error('Failed to load RSVPs', error);
  }
  return [...MOCK_RSVPS];
}

export async function saveRSVPs(rsvps: EventRSVP[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.EVENT_RSVPS, rsvps);
    rsvpsCache = rsvps;
  } catch (error) {
    logger.error('Failed to save RSVPs', error);
  }
}

export function getRsvpsCache(): EventRSVP[] {
  return rsvpsCache;
}

export function setRsvpsCache(rsvps: EventRSVP[]): void {
  rsvpsCache = rsvps;
}

// ============================================================================
// RSVP SERVICE
// ============================================================================

export const eventRsvpService = {
  /**
   * RSVP to an event
   */
  async rsvp(
    eventId: string,
    userId: string,
    userName: string,
    userRole: EventAttendee['userRole'],
    status: RSVPStatus,
    guestCount: number = 0,
    userPhotoUrl?: string
  ): Promise<Result<EventAttendee, ServiceError>> {
    const attendee: EventAttendee = {
      userId,
      userName,
      userPhotoUrl,
      userRole,
      status,
      guestCount,
      respondedAt: new Date().toISOString(),
    };

    if (USE_MOCK) {
      const eventsCache = await loadEvents();
      const event = eventsCache.find((e) => e.id === eventId);
      if (!event) return err(notFound('Event', eventId));

      // Update or add attendee
      const existingIndex = event.attendees.findIndex((a) => a.userId === userId);
      if (existingIndex >= 0) {
        event.attendees[existingIndex] = attendee;
      } else {
        event.attendees.push(attendee);
      }

      await saveEvents(eventsCache);

      // Trigger RSVP notification to event creator (coach)
      await notificationTriggers.eventRsvp(userName, event.title, status, event.createdBy);

      return ok(attendee);
    }

    const response = await fetch(`/api/events/${eventId}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attendee),
    });
    return ok(await response.json());
  },

  /**
   * Get attendees for an event
   */
  async getEventAttendees(eventId: string): Promise<EventAttendee[]> {
    if (USE_MOCK) {
      const eventsCache = await loadEvents();
      const event = eventsCache.find((e) => e.id === eventId);
      return event?.attendees || [];
    }

    const response = await fetch(`/api/events/${eventId}/attendees`);
    return response.json();
  },

  /**
   * Get attendee counts by status
   */
  getAttendeeCounts(attendees: EventAttendee[]): {
    going: number;
    maybe: number;
    notGoing: number;
    totalGuests: number;
  } {
    let going = 0;
    let maybe = 0;
    let notGoing = 0;
    let totalGuests = 0;

    for (const a of attendees) {
      if (a.status === 'GOING') {
        going++;
        totalGuests += a.guestCount;
      } else if (a.status === 'MAYBE') {
        maybe++;
      } else if (a.status === 'NOT_GOING') {
        notGoing++;
      }
    }

    return { going, maybe, notGoing, totalGuests };
  },

  /**
   * Check if user has already RSVP'd
   */
  getUserRSVP(attendees: EventAttendee[], userId: string): EventAttendee | undefined {
    return attendees.find((a) => a.userId === userId);
  },

  /**
   * Check if RSVP deadline has passed
   */
  isRSVPClosed(event: ClubEvent): boolean {
    if (!event.rsvpDeadline) return false;
    const now = toDateStr(new Date());
    return event.rsvpDeadline < now;
  },

  /**
   * Check if event is full
   */
  isEventFull(event: ClubEvent): boolean {
    if (!event.maxAttendees) return false;
    const { going, totalGuests } = this.getAttendeeCounts(event.attendees);
    return going + totalGuests >= event.maxAttendees;
  },

  // ============================================================================
  // ENHANCED RSVP MANAGEMENT
  // ============================================================================

  /**
   * Submit or update an RSVP (enhanced version with full tracking)
   */
  async submitRSVP(input: SubmitRSVPInput): Promise<EventRSVP> {
    const rsvp: EventRSVP = {
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
      const existingIndex = rsvpsCache.findIndex(
        (r) => r.eventId === input.eventId && r.userId === input.userId
      );

      if (existingIndex >= 0) {
        // Update existing RSVP
        rsvp.id = rsvpsCache[existingIndex].id;
        rsvp.updatedAt = new Date().toISOString();
        rsvpsCache[existingIndex] = rsvp;
      } else {
        // Add new RSVP
        rsvpsCache.push(rsvp);
      }

      await saveRSVPs(rsvpsCache);

      // Also update the event's attendees list for backward compatibility
      const eventsCache = await loadEvents();
      const event = eventsCache.find((e) => e.id === input.eventId);
      if (event) {
        const attendee: EventAttendee = {
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
        } else {
          event.attendees.push(attendee);
        }
        await saveEvents(eventsCache);
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
  async updateRSVP(rsvpId: string, status: RSVPStatus, guestCount?: number): Promise<Result<EventRSVP, ServiceError>> {
    if (USE_MOCK) {
      rsvpsCache = await loadRSVPs();
      const rsvp = rsvpsCache.find((r) => r.id === rsvpId);
      if (!rsvp) return err(notFound('RSVP', rsvpId));

      rsvp.status = status;
      if (guestCount !== undefined) {
        rsvp.guestCount = guestCount;
      }
      rsvp.updatedAt = new Date().toISOString();

      await saveRSVPs(rsvpsCache);

      // Update event attendees for backward compatibility
      const eventsCache = await loadEvents();
      const event = eventsCache.find((e) => e.id === rsvp.eventId);
      if (event) {
        const attendee = event.attendees.find((a) => a.userId === rsvp.userId);
        if (attendee) {
          attendee.status = status;
          if (guestCount !== undefined) {
            attendee.guestCount = guestCount;
          }
          await saveEvents(eventsCache);
        }
      }

      return ok(rsvp);
    }

    const response = await fetch(`/api/rsvps/${rsvpId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, guestCount }),
    });
    return ok(await response.json());
  },

  /**
   * Get all RSVPs for an event
   */
  async getEventRSVPs(eventId: string): Promise<EventRSVP[]> {
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
  async getUserRSVPs(userId: string): Promise<EventRSVP[]> {
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
  async getUserEventRSVP(eventId: string, userId: string): Promise<EventRSVP | null> {
    if (USE_MOCK) {
      rsvpsCache = await loadRSVPs();
      return rsvpsCache.find((r) => r.eventId === eventId && r.userId === userId) || null;
    }

    const response = await fetch(`/api/events/${eventId}/rsvps/${userId}`);
    if (!response.ok) return null;
    return response.json();
  },

  // ============================================================================
  // CALENDAR INTEGRATION
  // ============================================================================

  /**
   * Get events for calendar display - returns events user has RSVP'd to or public club events
   */
  async getEventsForCalendar(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    id: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    type: 'EVENT';
    eventType: ClubEventType;
    status: RSVPStatus | null;
  }[]> {
    if (USE_MOCK) {
      const eventsCache = await loadEvents();
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
        type: 'EVENT' as const,
        eventType: event.eventType,
        status: rsvpMap.get(event.id) || null,
      }));
    }

    const response = await fetch(
      `/api/users/${userId}/calendar-events?start=${startDate}&end=${endDate}`
    );
    return response.json();
  },

  /**
   * Get upcoming events for a user (events they've RSVP'd to or are invited to)
   */
  async getUpcomingUserEvents(userId: string, limit: number = 5): Promise<ClubEvent[]> {
    if (USE_MOCK) {
      const eventsCache = await loadEvents();
      rsvpsCache = await loadRSVPs();

      const now = new Date().getTime();
      const userRSVPs = rsvpsCache
        .filter((r) => r.userId === userId && r.status === 'GOING')
        .map((r) => r.eventId);

      return eventsCache
        .filter((event) => {
          const eventDate = new Date(event.date).getTime();
          return (
            eventDate > now &&
            event.status === 'PUBLISHED' &&
            userRSVPs.includes(event.id)
          );
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, limit);
    }

    const response = await fetch(`/api/users/${userId}/events/upcoming?limit=${limit}`);
    return response.json();
  },
};
