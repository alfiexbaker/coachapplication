/**
 * Event Service
 *
 * Handles club events including tournaments, social events, meetings, and presentations.
 * Supports RSVP management, attendance tracking, and event notifications.
 *
 * API Integration Notes:
 * - POST /api/events - Create event
 * - GET /api/events?clubId=X - Get club events
 * - GET /api/events/:id - Get event details
 * - PATCH /api/events/:id/publish - Publish event
 * - POST /api/events/:id/rsvp - RSVP to event
 * - POST /api/events/:id/invite - Invite members
 * - GET /api/events/:id/attendees - Get attendees
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '@/utils/logger';
import type {
  ClubEvent,
  ClubEventType,
  EventAttendee,
  EventAttendance,
  EventAttendanceStats,
  EventRSVP,
  EventStatus,
  EventTargetAudience,
  RSVPStatus,
  SubmitRSVPInput,
  CheckInInput,
} from '@/constants/types';

const EVENTS_STORAGE_KEY = 'club_events';
const RSVPS_STORAGE_KEY = 'event_rsvps';
const ATTENDANCE_STORAGE_KEY = 'event_attendance';
const USE_MOCK = true;
const logger = createLogger('EventService');

// Location validation threshold in meters
const LOCATION_VALIDATION_THRESHOLD = 500;

// Mock events data
const MOCK_EVENTS: ClubEvent[] = [
  {
    id: 'event_1',
    clubId: 'club_1',
    clubName: 'Bradwell Boys FC',
    createdBy: 'coach_1',
    createdByName: 'Director Kelly',
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
    clubId: 'club_1',
    clubName: 'Bradwell Boys FC',
    createdBy: 'coach_1',
    createdByName: 'Director Kelly',
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
    clubId: 'club_1',
    clubName: 'Bradwell Boys FC',
    createdBy: 'coach_1',
    createdByName: 'Director Kelly',
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
    clubId: 'club_1',
    clubName: 'Bradwell Boys FC',
    createdBy: 'coach_2',
    createdByName: 'Sarah Mitchell',
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

// Mock RSVP data
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

// Mock attendance data
const MOCK_ATTENDANCE: EventAttendance[] = [
  {
    id: 'attendance_1',
    eventId: 'event_1',
    userId: 'parent_1',
    userName: 'Sarah Baker',
    userRole: 'PARENT',
    checkedInAt: '2026-06-15T13:45:00Z',
    checkedInBy: 'coach_1',
    checkedInByName: 'Director Kelly',
    checkInMethod: 'COACH',
    guestsCheckedIn: 2,
    locationValidated: true,
    distanceFromVenue: 25,
  },
];

let rsvpsCache: EventRSVP[] = [...MOCK_RSVPS];
let attendanceCache: EventAttendance[] = [...MOCK_ATTENDANCE];

async function loadRSVPs(): Promise<EventRSVP[]> {
  try {
    const stored = await AsyncStorage.getItem(RSVPS_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (error) {
    logger.error('Failed to load RSVPs', error);
  }
  return [...MOCK_RSVPS];
}

async function saveRSVPs(rsvps: EventRSVP[]): Promise<void> {
  try {
    await AsyncStorage.setItem(RSVPS_STORAGE_KEY, JSON.stringify(rsvps));
    rsvpsCache = rsvps;
  } catch (error) {
    logger.error('Failed to save RSVPs', error);
  }
}

async function loadAttendance(): Promise<EventAttendance[]> {
  try {
    const stored = await AsyncStorage.getItem(ATTENDANCE_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (error) {
    logger.error('Failed to load attendance', error);
  }
  return [...MOCK_ATTENDANCE];
}

async function saveAttendance(attendance: EventAttendance[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(attendance));
    attendanceCache = attendance;
  } catch (error) {
    console.error('[EventService] Failed to save attendance:', error);
  }
}

/**
 * Calculate distance between two coordinates in meters using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function loadEvents(): Promise<ClubEvent[]> {
  try {
    const stored = await AsyncStorage.getItem(EVENTS_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (error) {
    console.error('[EventService] Failed to load events:', error);
  }
  return [...MOCK_EVENTS];
}

async function saveEvents(events: ClubEvent[]): Promise<void> {
  try {
    await AsyncStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
    eventsCache = events;
  } catch (error) {
    console.error('[EventService] Failed to save events:', error);
  }
}

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

export const eventService = {
  /**
   * Create a new event
   */
  async createEvent(input: CreateEventInput): Promise<ClubEvent> {
    const newEvent: ClubEvent = {
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
  async publishEvent(eventId: string): Promise<ClubEvent> {
    if (USE_MOCK) {
      eventsCache = await loadEvents();
      const event = eventsCache.find((e) => e.id === eventId);
      if (!event) throw new Error('Event not found');

      event.status = 'PUBLISHED';
      await saveEvents(eventsCache);
      return event;
    }

    const response = await fetch(`/api/events/${eventId}/publish`, {
      method: 'PATCH',
    });
    return response.json();
  },

  /**
   * Cancel an event
   */
  async cancelEvent(eventId: string): Promise<ClubEvent> {
    if (USE_MOCK) {
      eventsCache = await loadEvents();
      const event = eventsCache.find((e) => e.id === eventId);
      if (!event) throw new Error('Event not found');

      event.status = 'CANCELLED';
      await saveEvents(eventsCache);
      return event;
    }

    const response = await fetch(`/api/events/${eventId}/cancel`, {
      method: 'PATCH',
    });
    return response.json();
  },

  /**
   * Get an event by ID
   */
  async getEvent(eventId: string): Promise<ClubEvent | null> {
    if (USE_MOCK) {
      eventsCache = await loadEvents();
      return eventsCache.find((e) => e.id === eventId) || null;
    }

    const response = await fetch(`/api/events/${eventId}`);
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Get upcoming events for a club
   */
  async getUpcomingEvents(clubId: string): Promise<ClubEvent[]> {
    if (USE_MOCK) {
      eventsCache = await loadEvents();
      const now = new Date().toISOString().split('T')[0];
      return eventsCache
        .filter(
          (e) => e.clubId === clubId && e.status === 'PUBLISHED' && e.date >= now
        )
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    const response = await fetch(`/api/events?clubId=${clubId}&upcoming=true`);
    return response.json();
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

    const response = await fetch(`/api/events?clubId=${clubId}`);
    return response.json();
  },

  /**
   * Invite all club members to an event
   */
  async inviteClub(eventId: string): Promise<void> {
    if (USE_MOCK) {
      // In a real app, this would send notifications to all club members
      console.log(`[EventService] Inviting all club members to event ${eventId}`);
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
  async inviteSquads(eventId: string, squadIds: string[]): Promise<void> {
    if (USE_MOCK) {
      eventsCache = await loadEvents();
      const event = eventsCache.find((e) => e.id === eventId);
      if (event) {
        event.squadIds = squadIds;
        await saveEvents(eventsCache);
      }
      console.log(`[EventService] Inviting squads ${squadIds.join(', ')} to event ${eventId}`);
      return;
    }

    await fetch(`/api/events/${eventId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'squads', squadIds }),
    });
  },

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
  ): Promise<EventAttendee> {
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
      eventsCache = await loadEvents();
      const event = eventsCache.find((e) => e.id === eventId);
      if (!event) throw new Error('Event not found');

      // Update or add attendee
      const existingIndex = event.attendees.findIndex((a) => a.userId === userId);
      if (existingIndex >= 0) {
        event.attendees[existingIndex] = attendee;
      } else {
        event.attendees.push(attendee);
      }

      await saveEvents(eventsCache);
      return attendee;
    }

    const response = await fetch(`/api/events/${eventId}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attendee),
    });
    return response.json();
  },

  /**
   * Get attendees for an event
   */
  async getEventAttendees(eventId: string): Promise<EventAttendee[]> {
    if (USE_MOCK) {
      eventsCache = await loadEvents();
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
   * Format event type for display
   */
  formatEventType(type: ClubEventType): string {
    const labels: Record<ClubEventType, string> = {
      TOURNAMENT: 'Tournament',
      SOCIAL: 'Social Event',
      MEETING: 'Meeting',
      PRESENTATION: 'Presentation',
      FUNDRAISER: 'Fundraiser',
      TRIAL_DAY: 'Trial Day',
      TRAINING_CAMP: 'Training Camp',
      OTHER: 'Other',
    };
    return labels[type] || type;
  },

  /**
   * Get event type icon
   */
  getEventTypeIcon(type: ClubEventType): string {
    const icons: Record<ClubEventType, string> = {
      TOURNAMENT: 'trophy',
      SOCIAL: 'people',
      MEETING: 'chatbubbles',
      PRESENTATION: 'ribbon',
      FUNDRAISER: 'cash',
      TRIAL_DAY: 'football',
      TRAINING_CAMP: 'fitness',
      OTHER: 'calendar',
    };
    return icons[type] || 'calendar';
  },

  /**
   * Get event type color
   */
  getEventTypeColor(type: ClubEventType): string {
    const colors: Record<ClubEventType, string> = {
      TOURNAMENT: '#F59E0B', // amber
      SOCIAL: '#8B5CF6', // purple
      MEETING: '#3B82F6', // blue
      PRESENTATION: '#10B981', // green
      FUNDRAISER: '#EC4899', // pink
      TRIAL_DAY: '#06B6D4', // cyan
      TRAINING_CAMP: '#EF4444', // red
      OTHER: '#6B7280', // gray
    };
    return colors[type] || '#6B7280';
  },

  /**
   * Format audience for display
   */
  formatAudience(audience: EventTargetAudience): string {
    const labels: Record<EventTargetAudience, string> = {
      ALL: 'Everyone',
      COACHES: 'Coaches Only',
      PARENTS: 'Parents Only',
      ATHLETES: 'Athletes Only',
      SQUAD: 'Specific Squads',
    };
    return labels[audience] || audience;
  },

  /**
   * Format price for display
   */
  formatPrice(price: number, currency: string = 'GBP'): string {
    if (price === 0) return 'Free';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
    }).format(price);
  },

  /**
   * Format date for display
   */
  formatEventDate(date: string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  },

  /**
   * Format time for display
   */
  formatEventTime(startTime: string, endTime?: string): string {
    if (endTime) {
      return `${startTime} - ${endTime}`;
    }
    return startTime;
  },

  /**
   * Check if RSVP deadline has passed
   */
  isRSVPClosed(event: ClubEvent): boolean {
    if (!event.rsvpDeadline) return false;
    const now = new Date().toISOString().split('T')[0];
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
      eventsCache = await loadEvents();
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
  async updateRSVP(rsvpId: string, status: RSVPStatus, guestCount?: number): Promise<EventRSVP> {
    if (USE_MOCK) {
      rsvpsCache = await loadRSVPs();
      const rsvp = rsvpsCache.find((r) => r.id === rsvpId);
      if (!rsvp) throw new Error('RSVP not found');

      rsvp.status = status;
      if (guestCount !== undefined) {
        rsvp.guestCount = guestCount;
      }
      rsvp.updatedAt = new Date().toISOString();

      await saveRSVPs(rsvpsCache);

      // Update event attendees for backward compatibility
      eventsCache = await loadEvents();
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

      return rsvp;
    }

    const response = await fetch(`/api/rsvps/${rsvpId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, guestCount }),
    });
    return response.json();
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
  // CHECK-IN & ATTENDANCE TRACKING
  // ============================================================================

  /**
   * Check in a user to an event
   * Supports location validation for in-person events
   */
  async checkIn(input: CheckInInput): Promise<EventAttendance> {
    const attendance: EventAttendance = {
      id: `attendance_${Date.now()}`,
      eventId: input.eventId,
      userId: input.userId,
      userName: input.userName,
      userPhotoUrl: input.userPhotoUrl,
      userRole: input.userRole,
      checkedInAt: new Date().toISOString(),
      checkedInBy: input.checkedInBy,
      checkedInByName: input.checkedInByName,
      checkInMethod: input.checkInMethod,
      checkInLocation: input.location,
      guestsCheckedIn: input.guestsCheckedIn ?? 0,
      notes: input.notes,
    };

    // Location validation for in-person events
    if (input.location) {
      // For mock data, we'll use a fixed venue location
      // In production, this would come from the event's venue geocoding
      const venueLocation = { latitude: 51.5074, longitude: -0.1278 }; // London
      const distance = calculateDistance(
        input.location.latitude,
        input.location.longitude,
        venueLocation.latitude,
        venueLocation.longitude
      );
      attendance.distanceFromVenue = Math.round(distance);
      attendance.locationValidated = distance <= LOCATION_VALIDATION_THRESHOLD;
    }

    if (USE_MOCK) {
      attendanceCache = await loadAttendance();

      // Check if already checked in
      const existingIndex = attendanceCache.findIndex(
        (a) => a.eventId === input.eventId && a.userId === input.userId
      );

      if (existingIndex >= 0) {
        // Update existing check-in (e.g., for guest count updates)
        attendance.id = attendanceCache[existingIndex].id;
        attendanceCache[existingIndex] = attendance;
      } else {
        attendanceCache.push(attendance);
      }

      await saveAttendance(attendanceCache);
      return attendance;
    }

    const response = await fetch(`/api/events/${input.eventId}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attendance),
    });
    return response.json();
  },

  /**
   * Remove a check-in (undo check-in)
   */
  async removeCheckIn(eventId: string, userId: string): Promise<void> {
    if (USE_MOCK) {
      attendanceCache = await loadAttendance();
      const index = attendanceCache.findIndex(
        (a) => a.eventId === eventId && a.userId === userId
      );
      if (index >= 0) {
        attendanceCache.splice(index, 1);
        await saveAttendance(attendanceCache);
      }
      return;
    }

    await fetch(`/api/events/${eventId}/checkin/${userId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get attendee list (checked-in users) for an event
   */
  async getAttendeeList(eventId: string): Promise<EventAttendance[]> {
    if (USE_MOCK) {
      attendanceCache = await loadAttendance();
      return attendanceCache.filter((a) => a.eventId === eventId);
    }

    const response = await fetch(`/api/events/${eventId}/attendance`);
    return response.json();
  },

  /**
   * Check if a user has checked in to an event
   */
  async isUserCheckedIn(eventId: string, userId: string): Promise<boolean> {
    if (USE_MOCK) {
      attendanceCache = await loadAttendance();
      return attendanceCache.some((a) => a.eventId === eventId && a.userId === userId);
    }

    const response = await fetch(`/api/events/${eventId}/attendance/${userId}`);
    return response.ok;
  },

  /**
   * Get a user's attendance record for an event
   */
  async getUserAttendance(eventId: string, userId: string): Promise<EventAttendance | null> {
    if (USE_MOCK) {
      attendanceCache = await loadAttendance();
      return attendanceCache.find((a) => a.eventId === eventId && a.userId === userId) || null;
    }

    const response = await fetch(`/api/events/${eventId}/attendance/${userId}`);
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Get attendance statistics for an event
   */
  async getAttendanceStats(eventId: string): Promise<EventAttendanceStats> {
    if (USE_MOCK) {
      rsvpsCache = await loadRSVPs();
      attendanceCache = await loadAttendance();
      eventsCache = await loadEvents();

      const event = eventsCache.find((e) => e.id === eventId);
      const eventRSVPs = rsvpsCache.filter((r) => r.eventId === eventId);
      const eventAttendance = attendanceCache.filter((a) => a.eventId === eventId);

      // Calculate RSVP counts
      const rsvpCounts = {
        going: eventRSVPs.filter((r) => r.status === 'GOING').length,
        notGoing: eventRSVPs.filter((r) => r.status === 'NOT_GOING').length,
        maybe: eventRSVPs.filter((r) => r.status === 'MAYBE').length,
        noResponse: 0, // Would need invited list to calculate
      };

      // Calculate expected guests
      const expectedGuests = eventRSVPs
        .filter((r) => r.status === 'GOING')
        .reduce((sum, r) => sum + r.guestCount, 0);

      // Calculate checked-in counts
      const checkedInCount = eventAttendance.length;
      const guestsCheckedInCount = eventAttendance.reduce(
        (sum, a) => sum + a.guestsCheckedIn,
        0
      );

      // Calculate attendance rate
      const goingCount = rsvpCounts.going;
      const attendanceRate =
        goingCount > 0 ? Math.round((checkedInCount / goingCount) * 100) : 0;

      // Breakdown by role
      const byRole = {
        coaches: {
          rsvp: eventRSVPs.filter((r) => r.userRole === 'COACH' && r.status === 'GOING').length,
          checkedIn: eventAttendance.filter((a) => a.userRole === 'COACH').length,
        },
        parents: {
          rsvp: eventRSVPs.filter((r) => r.userRole === 'PARENT' && r.status === 'GOING').length,
          checkedIn: eventAttendance.filter((a) => a.userRole === 'PARENT').length,
        },
        athletes: {
          rsvp: eventRSVPs.filter((r) => r.userRole === 'ATHLETE' && r.status === 'GOING').length,
          checkedIn: eventAttendance.filter((a) => a.userRole === 'ATHLETE').length,
        },
      };

      return {
        eventId,
        rsvpCounts,
        expectedGuests,
        capacity: event?.maxAttendees,
        checkedInCount,
        guestsCheckedInCount,
        attendanceRate,
        byRole,
        updatedAt: new Date().toISOString(),
      };
    }

    const response = await fetch(`/api/events/${eventId}/stats`);
    return response.json();
  },

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Format RSVP status for display
   */
  formatRSVPStatus(status: RSVPStatus): string {
    const labels: Record<RSVPStatus, string> = {
      GOING: 'Going',
      NOT_GOING: "Can't Go",
      MAYBE: 'Maybe',
    };
    return labels[status] || status;
  },

  /**
   * Get RSVP status color
   */
  getRSVPStatusColor(status: RSVPStatus): string {
    const colors: Record<RSVPStatus, string> = {
      GOING: '#10B981', // green
      NOT_GOING: '#EF4444', // red
      MAYBE: '#F59E0B', // amber
    };
    return colors[status] || '#6B7280';
  },

  /**
   * Get RSVP status icon
   */
  getRSVPStatusIcon(status: RSVPStatus): string {
    const icons: Record<RSVPStatus, string> = {
      GOING: 'checkmark-circle',
      NOT_GOING: 'close-circle',
      MAYBE: 'help-circle',
    };
    return icons[status] || 'ellipse';
  },

  /**
   * Format time ago for display
   */
  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  },

  /**
   * Check if event is happening today
   */
  isEventToday(event: ClubEvent): boolean {
    const today = new Date().toISOString().split('T')[0];
    return event.date === today;
  },

  /**
   * Check if check-in is available for an event
   * (Event must be today and within reasonable time window)
   */
  isCheckInAvailable(event: ClubEvent): boolean {
    if (event.status !== 'PUBLISHED') return false;

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Event must be today
    if (event.date !== today) return false;

    // Parse event times
    const [startHour, startMin] = event.startTime.split(':').map(Number);
    const eventStart = new Date(now);
    eventStart.setHours(startHour, startMin, 0, 0);

    // Check-in available 2 hours before and until event end
    const checkInStart = new Date(eventStart);
    checkInStart.setHours(checkInStart.getHours() - 2);

    let eventEnd: Date;
    if (event.endTime) {
      const [endHour, endMin] = event.endTime.split(':').map(Number);
      eventEnd = new Date(now);
      eventEnd.setHours(endHour, endMin, 0, 0);
    } else {
      // Default to 3 hours after start
      eventEnd = new Date(eventStart);
      eventEnd.setHours(eventEnd.getHours() + 3);
    }

    return now >= checkInStart && now <= eventEnd;
  },
};
