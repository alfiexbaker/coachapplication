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
import type {
  ClubEvent,
  ClubEventType,
  EventAttendee,
  EventStatus,
  EventTargetAudience,
  RSVPStatus,
} from '@/constants/types';

const EVENTS_STORAGE_KEY = 'club_events';
const USE_MOCK = true;

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
};
