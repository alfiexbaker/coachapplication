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

import { apiClient, apiFetch } from '../api-client';
import { api } from '@/constants/config';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { notificationTriggers } from '../notification-trigger';
import { notificationService } from '../notification-service';
import { userService } from '../user-service';
import { emitTyped, ServiceEvents } from '../event-bus';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  notFound,
  unsupportedError,
} from '@/types/result';
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

function eventRsvpUnsupportedError(action: string, details?: unknown): ServiceError {
  return unsupportedError(
    `${action} needs a /v1 event RSVP API before it can run in API mode.`,
    details,
  );
}

interface ApiEventRsvp {
  id: string;
  clubEventId?: string | null;
  eventId?: string | null;
  userId: string;
  status: RSVPStatus;
  guestCount?: number | null;
  notes?: string | null;
  note?: string | null;
  respondedAt?: string | null;
  updatedAt?: string | null;
}

interface ApiEventRsvpResponse {
  rsvp: ApiEventRsvp;
}

function mapApiRsvpToEventRsvp(rsvp: ApiEventRsvp, fallbackEventId: string): EventRSVP {
  return {
    id: rsvp.id,
    eventId: rsvp.eventId ?? rsvp.clubEventId ?? fallbackEventId,
    userId: rsvp.userId,
    userRole: 'PARENT',
    status: rsvp.status,
    guestCount: rsvp.guestCount ?? 0,
    respondedAt: rsvp.respondedAt ?? new Date().toISOString(),
    note: rsvp.note ?? rsvp.notes ?? undefined,
    updatedAt: rsvp.updatedAt ?? undefined,
  };
}

function mapApiRsvpToAttendee(
  rsvp: ApiEventRsvp,
  fallbackRole: EventAttendee['userRole'],
): EventAttendee {
  return {
    userId: rsvp.userId,
    userRole: fallbackRole,
    status: rsvp.status,
    guestCount: rsvp.guestCount ?? 0,
    respondedAt: rsvp.respondedAt ?? new Date().toISOString(),
  };
}

async function resolveUserName(userId: string, fallback: string): Promise<string> {
  const userResult = await userService.getUserById(userId);
  if (!userResult.success) {
    return fallback;
  }
  return userResult.data.name?.trim() || fallback;
}

// ============================================================================
// MOCK RSVP DATA
// ============================================================================

const MOCK_RSVPS: EventRSVP[] = [
  {
    id: 'rsvp_1',
    eventId: 'event_1',
    userId: 'parent_1',
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
    userRole: 'PARENT',
    status: 'GOING',
    guestCount: 1,
    respondedAt: '2026-01-06T14:30:00Z',
  },
  {
    id: 'rsvp_3',
    eventId: 'event_2',
    userId: 'parent_1',
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
    _userPhotoUrl?: string,
  ): Promise<Result<EventAttendee, ServiceError>> {
    const attendee: EventAttendee = {
      userId,
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
      const displayName = userName?.trim() || (await resolveUserName(userId, 'A parent'));
      if (event.createdBy?.trim()) {
        await notificationTriggers.eventRsvp(displayName, event.title, status, event.createdBy);
      } else {
        logger.warn('Event RSVP notification skipped: missing event creator recipient', {
          eventId: event.id,
        });
      }
      return ok(attendee);
    }
    const result = await apiFetch<ApiEventRsvpResponse>(
      `/v1/events/${encodeURIComponent(eventId)}/rsvp`,
      {
        method: 'POST',
        body: JSON.stringify({
          status,
          guestCount,
        }),
      },
    );
    if (!result.success) {
      return err(result.error);
    }
    return ok(mapApiRsvpToAttendee(result.data.rsvp, userRole));
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
    logger.warn('Event attendee reads need a /v1 event attendee API', { eventId });
    return [];
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
    return {
      going,
      maybe,
      notGoing,
      totalGuests,
    };
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
    const { going } = this.getAttendeeCounts(event.attendees);
    return going >= event.maxAttendees;
  },
  // ============================================================================
  // ENHANCED RSVP MANAGEMENT
  // ============================================================================

  /**
   * Submit or update an RSVP (enhanced version with full tracking)
   */
  async submitRSVP(input: SubmitRSVPInput): Promise<EventRSVP> {
    let previousStatus: RSVPStatus | null = null;
    if (USE_MOCK && input.status === 'GOING') {
      const eventsCache = await loadEvents();
      const event = eventsCache.find((candidate) => candidate.id === input.eventId);
      if (event?.maxAttendees) {
        rsvpsCache = await loadRSVPs();
        const existing = rsvpsCache.find(
          (r) => r.eventId === input.eventId && r.userId === input.userId,
        );
        previousStatus = existing?.status ?? null;
        const existingGuests = existing?.status === 'GOING' ? (existing.guestCount ?? 0) : 0;
        const existingSelf = existing?.status === 'GOING' ? 1 : 0;
        const requestedGuests = input.guestCount ?? 0;
        const requestedSelf = 1;
        const { going, totalGuests } = this.getAttendeeCounts(event.attendees);
        const occupiedExcludingCurrent = going + totalGuests - existingSelf - existingGuests;
        const requestedFootprint = requestedSelf + requestedGuests;
        if (occupiedExcludingCurrent + requestedFootprint > event.maxAttendees) {
          throw new Error('Event has reached maximum capacity');
        }
      }
    }
    const rsvp: EventRSVP = {
      id: `rsvp_${Date.now()}`,
      eventId: input.eventId,
      userId: input.userId,
      userRole: input.userRole,
      status: input.status,
      guestCount: input.guestCount ?? 0,
      respondedAt: new Date().toISOString(),
      note: input.note,
    };
    if (USE_MOCK) {
      rsvpsCache = await loadRSVPs();
      const existingIndex = rsvpsCache.findIndex(
        (r) => r.eventId === input.eventId && r.userId === input.userId,
      );
      if (existingIndex >= 0) {
        previousStatus = rsvpsCache[existingIndex]?.status ?? null;
      }
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
      emitTyped(ServiceEvents.EVENT_RSVP_UPDATED, {
        eventId: input.eventId,
        rsvpId: rsvp.id,
        userId: input.userId,
        previousStatus,
        newStatus: rsvp.status,
      });
      return rsvp;
    }
    const result = await apiFetch<ApiEventRsvpResponse>(
      `/v1/events/${encodeURIComponent(input.eventId)}/rsvp`,
      {
        method: 'POST',
        body: JSON.stringify({
          status: input.status,
          guestCount: input.guestCount ?? 0,
          notes: input.note ?? null,
        }),
      },
    );
    if (!result.success) {
      throw new Error(result.error.message);
    }
    const savedRsvp = mapApiRsvpToEventRsvp(result.data.rsvp, input.eventId);
    emitTyped(ServiceEvents.EVENT_RSVP_UPDATED, {
      eventId: input.eventId,
      rsvpId: savedRsvp.id ?? rsvp.id,
      userId: input.userId,
      previousStatus,
      newStatus: input.status,
    });
    return savedRsvp;
  },
  /**
   * Update an existing RSVP
   */
  async updateRSVP(
    rsvpId: string,
    status: RSVPStatus,
    guestCount?: number,
  ): Promise<Result<EventRSVP, ServiceError>> {
    if (USE_MOCK) {
      rsvpsCache = await loadRSVPs();
      const rsvp = rsvpsCache.find((r) => r.id === rsvpId);
      if (!rsvp) return err(notFound('RSVP', rsvpId));
      const previousStatus = rsvp.status;
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
      emitTyped(ServiceEvents.EVENT_RSVP_UPDATED, {
        eventId: rsvp.eventId,
        rsvpId: rsvp.id,
        userId: rsvp.userId,
        previousStatus,
        newStatus: status,
      });
      return ok(rsvp);
    }
    void rsvpId;
    void status;
    void guestCount;
    return err(eventRsvpUnsupportedError('Updating event RSVPs'));
  },
  /**
   * Get all RSVPs for an event
   */
  async getEventRSVPs(eventId: string): Promise<EventRSVP[]> {
    if (USE_MOCK) {
      rsvpsCache = await loadRSVPs();
      return rsvpsCache.filter((r) => r.eventId === eventId);
    }
    logger.warn('Event RSVP list reads need a /v1 event RSVP API', { eventId });
    return [];
  },
  /**
   * Get all RSVPs by a user
   */
  async getUserRSVPs(userId: string): Promise<EventRSVP[]> {
    if (USE_MOCK) {
      rsvpsCache = await loadRSVPs();
      return rsvpsCache.filter((r) => r.userId === userId);
    }
    logger.warn('User event RSVP list reads need a /v1 event RSVP API', { userId });
    return [];
  },
  /**
   * Get a specific user's RSVP for an event
   */
  async getUserEventRSVP(eventId: string, userId: string): Promise<EventRSVP | null> {
    if (USE_MOCK) {
      rsvpsCache = await loadRSVPs();
      return rsvpsCache.find((r) => r.eventId === eventId && r.userId === userId) || null;
    }
    logger.warn('User event RSVP detail reads need a /v1 event RSVP API', { eventId, userId });
    return null;
  },
  /**
   * Send reminders to users who responded "Maybe".
   * Returns the number of queued reminders.
   */
  async sendReminderToMaybes(eventId: string): Promise<Result<number, ServiceError>> {
    if (USE_MOCK) {
      const [events, rsvps] = await Promise.all([loadEvents(), loadRSVPs()]);
      const event = events.find((item) => item.id === eventId);
      if (!event) {
        return err(notFound('Event', eventId));
      }
      const maybeRsvps = rsvps.filter((r) => r.eventId === eventId && r.status === 'MAYBE');
      if (maybeRsvps.length === 0) {
        return ok(0);
      }
      const reminderResults = await Promise.all(
        maybeRsvps.map(async (rsvp) => {
          const createResult = await notificationService.create({
            id: apiClient.generateId('notif'),
            type: 'reminder',
            notificationType: 'SESSION_REMINDER',
            title: 'Reminder: Event RSVP',
            body: `Please confirm attendance for "${event.title}".`,
            recipientId: rsvp.userId,
            recipientRole: rsvp.userRole === 'COACH' ? 'coach' : 'parent',
            deepLink: `/events/${event.id}/rsvp`,
            data: {
              eventId: event.id,
            },
            timeLabel: 'Just now',
            read: false,
          });
          if (createResult.success) {
            return { sent: 1, userId: rsvp.userId, error: null };
          }
          return { sent: 0, userId: rsvp.userId, error: createResult.error.message };
        }),
      );
      let sent = 0;
      for (const result of reminderResults) {
        sent += result.sent;
        if (result.error) {
          logger.warn('Failed to queue RSVP reminder', {
            eventId,
            userId: result.userId,
            error: result.error,
          });
        }
      }
      logger.info('Event RSVP reminders queued', {
        eventId,
        count: sent,
      });
      return ok(sent);
    }
    return err(
      eventRsvpUnsupportedError('Sending event RSVP reminders', {
        missingEndpoint: `/v1/events/${eventId}/rsvps/remind`,
      }),
    );
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
    endDate: string,
  ): Promise<
    {
      id: string;
      title: string;
      date: string;
      startTime: string;
      endTime: string;
      location: string;
      type: 'EVENT';
      eventType: ClubEventType;
      status: RSVPStatus | null;
    }[]
  > {
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
    logger.warn('Calendar event reads need a /v1 event calendar API', {
      userId,
      startDate,
      endDate,
    });
    return [];
  },
  /**
   * Get upcoming events for a user (events they've RSVP'd to or are invited to)
   */
  async getUpcomingUserEvents(userId: string, limit: number = 5): Promise<ClubEvent[]> {
    if (USE_MOCK) {
      const eventsCache = await loadEvents();
      rsvpsCache = await loadRSVPs();
      const now = new Date().getTime();
      const userRSVPs = rsvpsCache.flatMap((r) =>
        r.userId === userId && r.status === 'GOING' ? [r.eventId] : [],
      );
      return eventsCache
        .filter((event) => {
          const eventDate = new Date(event.date).getTime();
          return eventDate > now && event.status === 'PUBLISHED' && userRSVPs.includes(event.id);
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, limit);
    }
    logger.warn('Upcoming user event reads need a /v1 event calendar API', { userId, limit });
    return [];
  },
};
