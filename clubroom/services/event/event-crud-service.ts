/**
 * Event CRUD Service
 *
 * Handles basic CRUD operations for club events: create, read, update, publish, cancel.
 * Manages event persistence and the shared mock data layer.
 *
 * API Integration Notes:
 * - GET /v1/events/:id - Get event details
 * - GET /v1/clubs/:clubId/events - List club events
 * - POST /v1/clubs/:clubId/events and PATCH /v1/events/:id - Create and manage events
 * - POST /v1/events/:id/invites/club - Queue club event invites
 */

import { apiClient, apiFetch } from '../api-client';
import { api } from '@/constants/config';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { notificationTriggers } from '../notification-trigger';
import { clubService, type ClubMember } from '../club-service';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
} from '@/services/api-auth-context';
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
  EventTargetAudience,
} from '@/constants/types';
const USE_MOCK = api.useMock;
const logger = createLogger('EventCrudService');

interface ApiClubEventListResponse {
  events: ClubEvent[];
  total: number;
}

interface ApiClubEventResponse {
  event: ClubEvent;
}

interface ApiClubEventInviteResponse {
  inviteCount: number;
}

function eventUnsupportedError(action: string): ServiceError {
  return unsupportedError(`${action} needs a /v1 club event API before it can run in API mode.`, {
    missingAuthority: 'club_event',
  });
}

function throwEventUnsupported(action: string): never {
  throw new Error(eventUnsupportedError(action).message);
}

async function resolveEventApiHeaders(): Promise<Result<Record<string, string>, ServiceError>> {
  const currentUserResult = await resolveSignedInApiUser('Sign in to view club events.');
  if (!currentUserResult.success) {
    return currentUserResult;
  }
  return ok(
    buildApiAuthHeaders({
      actingRole: deriveApiActingRole(currentUserResult.data, 'member'),
    }),
  );
}

async function listClubEventsFromApi(
  clubId: string,
): Promise<Result<ClubEvent[], ServiceError>> {
  const headersResult = await resolveEventApiHeaders();
  if (!headersResult.success) {
    return headersResult;
  }

  const result = await apiFetch<ApiClubEventListResponse>(
    `/v1/clubs/${encodeURIComponent(clubId)}/events`,
    {
      method: 'GET',
      headers: headersResult.data,
    },
  );
  if (!result.success) {
    return err(result.error);
  }

  return ok(result.data.events);
}

// ============================================================================
// MOCK DATA (shared across event sub-services via load/save helpers)
// ============================================================================

const MOCK_EVENTS: ClubEvent[] = [
  {
    id: 'event_1',
    clubId: 'club_lions',
    createdBy: 'coach1',
    title: 'End of Season Presentation',
    description:
      'Join us to celebrate an amazing season! Awards ceremony, refreshments, and a chance to thank our coaches and volunteers. All players will receive participation certificates.',
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
        userRole: 'PARENT',
        status: 'GOING',
        guestCount: 2,
        respondedAt: '2026-01-05T10:00:00Z',
      },
      {
        userId: 'parent_2',
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
    createdBy: 'coach1',
    title: 'Summer Tournament',
    description:
      'Annual summer 7-a-side tournament with teams from across the region. Entry fee includes lunch, snacks, and a medal for all participants. Limited spots available!',
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
    createdBy: 'coach1',
    title: 'Parents Meeting',
    description:
      'Monthly parents meeting to discuss upcoming fixtures, training schedules, and club updates. This meeting will be held virtually via Zoom.',
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
        userRole: 'PARENT',
        status: 'GOING',
        guestCount: 0,
        respondedAt: '2026-01-10T09:00:00Z',
      },
      {
        userId: 'parent_2',
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
    createdBy: 'coach_2',
    title: 'Club BBQ Social',
    description:
      'End of summer BBQ for all club members and families. Bring a dish to share! Games and activities for the kids.',
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
let eventsCache: ClubEvent[] = [...MOCK_EVENTS];
const CLUB_STAFF_ROLES = new Set(['OWNER', 'ADMIN', 'HEAD_COACH', 'COACH']);
function isActiveMember(member: ClubMember): boolean {
  return member.status === 'active';
}
function isStaffMember(member: ClubMember): boolean {
  return CLUB_STAFF_ROLES.has(member.role);
}
function memberMatchesAudience(member: ClubMember, event: ClubEvent): boolean {
  switch (event.targetAudience) {
    case 'COACHES':
      return isStaffMember(member);
    case 'PARENTS':
    case 'ATHLETES':
    case 'SQUAD':
      return !isStaffMember(member);
    case 'ALL':
    default:
      return true;
  }
}
function memberMatchesSquads(member: ClubMember, squadIds?: string[]): boolean {
  if (!squadIds || squadIds.length === 0) {
    return true;
  }
  const memberSquads = member.squadIds ?? [];
  return memberSquads.some((squadId) => squadIds.includes(squadId));
}
async function getNotificationRecipientIds(
  event: ClubEvent,
  options?: {
    squadIds?: string[];
  },
): Promise<string[]> {
  const scopedSquadIds = options?.squadIds ?? event.squadIds;
  try {
    const members = await clubService.getMembers(event.clubId);
    return members.flatMap((item) =>
      ((member) => isActiveMember(member))(item)
        ? ((item) =>
            ((member) => member.userId !== event.createdBy)(item)
              ? ((member) => {
                  if (!memberMatchesAudience(member, event)) return [];
                  return memberMatchesSquads(member, scopedSquadIds) ? [member.userId] : [];
                })(item)
              : [])(item)
        : [],
    );
  } catch (error) {
    logger.error('Failed to resolve event notification recipients', {
      eventId: event.id,
      clubId: event.clubId,
      error,
    });
    return [];
  }
}
async function notifyEventCreatedRecipients(
  event: ClubEvent,
  options?: {
    squadIds?: string[];
  },
): Promise<void> {
  const recipientIds = await getNotificationRecipientIds(event, options);
  if (recipientIds.length === 0) {
    logger.info('No recipients for event created notification', {
      eventId: event.id,
    });
    return;
  }
  await Promise.allSettled(
    recipientIds.map((recipientId) =>
      notificationTriggers.eventCreated(event.title, event.date, recipientId),
    ),
  );
}
async function notifyEventCancelledRecipients(event: ClubEvent): Promise<void> {
  const recipientIds = await getNotificationRecipientIds(event, {
    squadIds: event.squadIds,
  });
  if (recipientIds.length === 0) {
    logger.info('No recipients for event cancelled notification', {
      eventId: event.id,
    });
    return;
  }
  await Promise.allSettled(
    recipientIds.map((recipientId) =>
      notificationTriggers.eventCancelled(event.title, recipientId),
    ),
  );
}

// ============================================================================
// SHARED PERSISTENCE HELPERS (used by other event sub-services)
// ============================================================================

export async function loadEvents(): Promise<ClubEvent[]> {
  try {
    const stored = await apiClient.get<ClubEvent[] | null>(STORAGE_KEYS.CLUB_EVENTS, null);
    if (stored) return stored;
  } catch (error) {
    logger.error('Failed to load events', error);
  }
  return [...MOCK_EVENTS];
}
export async function saveEvents(events: ClubEvent[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.CLUB_EVENTS, events);
    eventsCache = events;
  } catch (error) {
    logger.error('Failed to save events', error);
  }
}
export function getEventsCache(): ClubEvent[] {
  return eventsCache;
}
export function setEventsCache(events: ClubEvent[]): void {
  eventsCache = events;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface CreateEventInput {
  clubId: string;
  clubName: string;
  createdBy: string;
  createdByName: string;
  title: string;
  description: string;
  eventType: ClubEventType;
  date: string;
  startTime: string;
  endTime?: string;
  venue: string;
  address?: string;
  isVirtual?: boolean;
  meetingLink?: string;
  targetAudience: EventTargetAudience;
  squadIds?: string[];
  maxAttendees?: number;
  price?: number;
  currency?: string;
  rsvpRequired?: boolean;
  rsvpDeadline?: string;
  imageUrl?: string;
}

// ============================================================================
// CRUD SERVICE
// ============================================================================

export const eventCrudService = {
  /**
   * Create a new event
   */
  async createEvent(input: CreateEventInput): Promise<ClubEvent> {
    const newEvent: ClubEvent = {
      id: `event_${Date.now()}`,
      clubId: input.clubId,
      createdBy: input.createdBy,
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
      return newEvent;
    }
    const headersResult = await resolveEventApiHeaders();
    if (!headersResult.success) {
      throw new Error(headersResult.error.message);
    }
    const result = await apiFetch<ApiClubEventResponse>(
      `/v1/clubs/${encodeURIComponent(input.clubId)}/events`,
      {
        method: 'POST',
        headers: headersResult.data,
        body: JSON.stringify({
          title: input.title,
          description: input.description,
          eventType: input.eventType,
          date: input.date,
          startTime: input.startTime,
          endTime: input.endTime,
          venue: input.venue,
          address: input.address,
          isVirtual: input.isVirtual ?? false,
          meetingLink: input.meetingLink,
          targetAudience: input.targetAudience,
          squadIds: input.squadIds,
          maxAttendees: input.maxAttendees,
          price: input.price ?? 0,
          currency: input.currency ?? 'GBP',
          rsvpRequired: input.rsvpRequired ?? true,
          rsvpDeadline: input.rsvpDeadline,
          imageUrl: input.imageUrl,
        }),
      },
    );
    if (!result.success) {
      throw new Error(result.error.message);
    }
    return result.data.event;
  },
  /**
   * Publish an event (make visible to members)
   */
  async publishEvent(eventId: string): Promise<Result<ClubEvent, ServiceError>> {
    if (USE_MOCK) {
      eventsCache = await loadEvents();
      const event = eventsCache.find((e) => e.id === eventId);
      if (!event) return err(notFound('Event', eventId));
      event.status = 'PUBLISHED';
      await saveEvents(eventsCache);
      return ok(event);
    }
    const headersResult = await resolveEventApiHeaders();
    if (!headersResult.success) {
      return headersResult;
    }
    const result = await apiFetch<ApiClubEventResponse>(
      `/v1/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PATCH',
        headers: headersResult.data,
        body: JSON.stringify({ status: 'PUBLISHED' }),
      },
    );
    return result.success ? ok(result.data.event) : err(result.error);
  },
  /**
   * Cancel an event
   */
  async cancelEvent(eventId: string): Promise<Result<ClubEvent, ServiceError>> {
    if (USE_MOCK) {
      eventsCache = await loadEvents();
      const event = eventsCache.find((e) => e.id === eventId);
      if (!event) return err(notFound('Event', eventId));
      event.status = 'CANCELLED';
      await saveEvents(eventsCache);
      await notifyEventCancelledRecipients(event);
      return ok(event);
    }
    const headersResult = await resolveEventApiHeaders();
    if (!headersResult.success) {
      return headersResult;
    }
    const result = await apiFetch<ApiClubEventResponse>(
      `/v1/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PATCH',
        headers: headersResult.data,
        body: JSON.stringify({ status: 'CANCELLED' }),
      },
    );
    return result.success ? ok(result.data.event) : err(result.error);
  },
  /**
   * Get an event by ID
   */
  async getEvent(eventId: string): Promise<ClubEvent | null> {
    if (USE_MOCK) {
      eventsCache = await loadEvents();
      return eventsCache.find((e) => e.id === eventId) || null;
    }
    const headersResult = await resolveEventApiHeaders();
    if (!headersResult.success) {
      logger.warn('Cannot load club event detail without an authenticated API user', {
        eventId,
        error: headersResult.error,
      });
      return null;
    }
    const result = await apiFetch<ApiClubEventResponse>(
      `/v1/events/${encodeURIComponent(eventId)}`,
      {
        method: 'GET',
        headers: headersResult.data,
      },
    );
    if (!result.success) {
      logger.error('Failed to load club event detail via /v1', {
        eventId,
        error: result.error,
      });
      return null;
    }
    return result.data.event;
  },
  /**
   * Get upcoming events for a club
   */
  async getUpcomingEvents(clubId: string): Promise<ClubEvent[]> {
    if (USE_MOCK) {
      eventsCache = await loadEvents();
      const now = toDateStr(new Date());
      return eventsCache
        .filter((e) => e.clubId === clubId && e.status === 'PUBLISHED' && e.date >= now)
        .sort((a, b) => a.date.localeCompare(b.date));
    }
    const result = await listClubEventsFromApi(clubId);
    if (!result.success) {
      logger.error('Failed to load upcoming club events via /v1 events', {
        clubId,
        error: result.error,
      });
      return [];
    }
    const now = toDateStr(new Date());
    return result.data
      .filter((event) => event.status === 'PUBLISHED' && event.date >= now)
      .sort((a, b) => a.date.localeCompare(b.date));
  },
  /**
   * Get all events for a club (including past and drafts)
   */
  async getAllClubEvents(clubId: string): Promise<ClubEvent[]> {
    if (USE_MOCK) {
      eventsCache = await loadEvents();
      return eventsCache
        .filter((e) => e.clubId === clubId)
        .sort((a, b) => b.date.localeCompare(a.date));
    }
    const result = await listClubEventsFromApi(clubId);
    if (!result.success) {
      logger.error('Failed to load club events via /v1 events', {
        clubId,
        error: result.error,
      });
      return [];
    }
    return result.data.sort((a, b) => b.date.localeCompare(a.date));
  },
  /**
   * Invite all club members to an event
   */
  async inviteClub(eventId: string): Promise<void> {
    if (USE_MOCK) {
      eventsCache = await loadEvents();
      const event = eventsCache.find((e) => e.id === eventId);
      if (!event) {
        logger.warn('Cannot invite club members for missing event', {
          eventId,
        });
        return;
      }
      await notifyEventCreatedRecipients(event);
      logger.info('Invited club members to event', {
        eventId,
      });
      return;
    }
    const headersResult = await resolveEventApiHeaders();
    if (!headersResult.success) {
      throw new Error(headersResult.error.message);
    }
    const result = await apiFetch<ApiClubEventInviteResponse>(
      `/v1/events/${encodeURIComponent(eventId)}/invites/club`,
      {
        method: 'POST',
        headers: headersResult.data,
      },
    );
    if (!result.success) {
      throw new Error(result.error.message);
    }
    logger.info('Invited club members to event via /v1', {
      eventId,
      inviteCount: result.data.inviteCount,
    });
  },
  /**
   * Invite specific squads to an event
   */
  async inviteSquads(eventId: string, squadIds: string[]): Promise<void> {
    if (USE_MOCK) {
      eventsCache = await loadEvents();
      const event = eventsCache.find((e) => e.id === eventId);
      if (event) {
        event.squadIds = squadIds;
        await saveEvents(eventsCache);
        await notifyEventCreatedRecipients(event, {
          squadIds,
        });
      } else {
        logger.warn('Cannot invite squads for missing event', {
          eventId,
          squadIds,
        });
      }
      logger.info('Inviting squads to event', {
        eventId,
        squadIds,
      });
      return;
    }
    void squadIds;
    return throwEventUnsupported('Inviting squads to club events');
  },
};
