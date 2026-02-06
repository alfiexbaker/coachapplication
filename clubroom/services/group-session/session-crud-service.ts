/**
 * Session CRUD Service
 *
 * Handles basic CRUD operations for group sessions: create, read, publish, cancel.
 * Manages session persistence and the shared mock data layer.
 *
 * API Integration Notes:
 * - POST /api/group-sessions - Create session
 * - GET /api/group-sessions/:id - Get session details
 * - GET /api/group-sessions?coachId=X - Coach's sessions
 * - PATCH /api/group-sessions/:id/publish - Publish session
 */

import { apiClient } from '../api-client';
import { api } from '@/constants/config';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { notificationTriggers } from '../notification-trigger';
import { socialFeedService } from '../social-feed-service';
import { emitTyped, ServiceEvents } from '../event-bus';
import { createLogger } from '@/utils/logger';
import { type Result, type ServiceError, ok, err, notFound } from '@/types/result';
import type {
  GroupSession,
  GroupSessionSchedule,
  FootballObjective,
  RecurringPattern,
  SessionInviteType,
} from '@/constants/types';

const USE_MOCK = api.useMock;
const logger = createLogger('SessionCrudService');

// ============================================================================
// MOCK DATA (shared across session sub-services via load/save helpers)
// ============================================================================

const MOCK_SESSIONS: GroupSession[] = [
  {
    id: 'gs_1',
    coachId: 'coach1',
    coachName: 'Sarah Mitchell',
    coachPhotoUrl: 'https://randomuser.me/api/portraits/women/32.jpg',
    title: 'Half-Term Football Camp',
    description: 'Intensive 3-day camp focusing on technical skills and game play. Includes lunch and snacks.',
    sessionType: 'CAMP',
    schedule: [
      { date: '2026-02-16', startTime: '09:00', endTime: '15:00' },
      { date: '2026-02-17', startTime: '09:00', endTime: '15:00' },
      { date: '2026-02-18', startTime: '09:00', endTime: '15:00' },
    ],
    maxParticipants: 16,
    currentParticipants: 12,
    waitlistEnabled: true,
    waitlistCount: 3,
    pricePerParticipant: 150,
    currency: 'GBP',
    ageMin: 8,
    ageMax: 12,
    skillLevel: 'ALL',
    location: 'Hackney Marshes, East London',
    isVirtual: false,
    status: 'PUBLISHED',
    createdAt: '2026-01-05T10:00:00Z',
    focus: ['Dribbling', 'Passing', 'Finishing'],
    equipment: ['Boots', 'Shin pads', 'Water bottle'],
    imageUrl: 'https://picsum.photos/seed/camp1/800/400',
  },
  {
    id: 'gs_2',
    coachId: 'coach1',
    coachName: 'Sarah Mitchell',
    coachPhotoUrl: 'https://randomuser.me/api/portraits/women/32.jpg',
    clubId: 'club_lions',
    clubName: 'Lions FC Academy',
    title: 'Striker Masterclass',
    description: 'Advanced finishing clinic for aspiring strikers. Learn professional techniques and movement.',
    sessionType: 'CLINIC',
    schedule: [
      { date: '2026-01-25', startTime: '10:00', endTime: '12:00' },
    ],
    maxParticipants: 10,
    currentParticipants: 8,
    waitlistEnabled: true,
    waitlistCount: 2,
    pricePerParticipant: 45,
    currency: 'GBP',
    ageMin: 10,
    ageMax: 14,
    skillLevel: 'INTERMEDIATE',
    location: 'Victoria Park, London',
    isVirtual: false,
    status: 'PUBLISHED',
    createdAt: '2026-01-08T14:00:00Z',
    focus: ['Finishing'],
    equipment: ['Boots', 'Shin pads'],
    imageUrl: 'https://picsum.photos/seed/clinic1/800/400',
  },
  {
    id: 'gs_3',
    coachId: 'coach2',
    coachName: 'Mike Thompson',
    coachPhotoUrl: 'https://randomuser.me/api/portraits/men/44.jpg',
    title: 'Goalkeeper Training Session',
    description: 'Specialized goalkeeper training covering shot stopping, positioning, and distribution.',
    sessionType: 'OPEN_SESSION',
    schedule: [
      { date: '2026-01-20', startTime: '14:00', endTime: '16:00' },
    ],
    maxParticipants: 6,
    currentParticipants: 4,
    waitlistEnabled: false,
    waitlistCount: 0,
    pricePerParticipant: 35,
    currency: 'GBP',
    skillLevel: 'ALL',
    location: 'Regent\'s Park, London',
    isVirtual: false,
    status: 'PUBLISHED',
    createdAt: '2026-01-10T09:00:00Z',
    focus: ['Goalkeeping'],
    equipment: ['Goalkeeper gloves', 'Boots'],
    imageUrl: 'https://picsum.photos/seed/gk1/800/400',
  },
  {
    id: 'gs_4',
    coachId: 'coach1',
    coachName: 'Sarah Mitchell',
    title: 'Free Trial Session',
    description: 'Come try a session with no commitment. See if we\'re the right fit for your child.',
    sessionType: 'TRIAL',
    schedule: [
      { date: '2026-01-22', startTime: '17:00', endTime: '18:00' },
    ],
    maxParticipants: 8,
    currentParticipants: 5,
    waitlistEnabled: false,
    waitlistCount: 0,
    pricePerParticipant: 0,
    currency: 'GBP',
    ageMin: 6,
    ageMax: 10,
    skillLevel: 'BEGINNER',
    location: 'Hackney Marshes, East London',
    isVirtual: false,
    status: 'PUBLISHED',
    createdAt: '2026-01-09T11:00:00Z',
    focus: ['Dribbling', 'Passing'],
    imageUrl: 'https://picsum.photos/seed/trial1/800/400',
  },
  // Recurring Training Sessions
  {
    id: 'gs_training_1',
    coachId: 'coach1',
    coachName: 'Sarah Mitchell',
    coachPhotoUrl: 'https://randomuser.me/api/portraits/women/32.jpg',
    clubId: 'club_lions',
    clubName: 'Lions FC Academy',
    squadId: 'squad_juniors',
    squadName: 'Under 11s',
    title: "Under 11's Training",
    description: 'Weekly training session for U11 squad. Focus on technical development, team tactics, and match preparation.',
    sessionType: 'TRAINING',
    schedule: [
      { date: '2026-01-14', startTime: '17:00', endTime: '18:30' },
      { date: '2026-01-21', startTime: '17:00', endTime: '18:30' },
      { date: '2026-01-28', startTime: '17:00', endTime: '18:30' },
      { date: '2026-02-04', startTime: '17:00', endTime: '18:30' },
    ],
    maxParticipants: 16,
    currentParticipants: 14,
    waitlistEnabled: true,
    waitlistCount: 2,
    pricePerParticipant: 0,
    currency: 'GBP',
    ageMin: 10,
    ageMax: 11,
    skillLevel: 'ALL',
    location: 'Hackney Marshes, East London',
    isVirtual: false,
    status: 'PUBLISHED',
    createdAt: '2026-01-01T08:00:00Z',
    focus: ['Passing', 'Dribbling', 'Defending'],
    equipment: ['Boots', 'Shin pads', 'Water bottle'],
    isRecurring: true,
    recurringPattern: {
      dayOfWeek: 2, // Tuesday
      startTime: '17:00',
      endTime: '18:30',
      until: '2026-06-30',
    },
    isFree: true,
  },
  {
    id: 'gs_training_2',
    coachId: 'coach2',
    coachName: 'Mike Thompson',
    coachPhotoUrl: 'https://randomuser.me/api/portraits/men/44.jpg',
    clubId: 'club_lions',
    clubName: 'Lions FC Academy',
    squadId: 'squad_juniors',
    squadName: 'Junior Skills',
    title: "Junior Skills Development",
    description: 'Saturday morning development sessions for our youngest squad members. Fun-focused with skill building.',
    sessionType: 'TRAINING',
    schedule: [
      { date: '2026-01-18', startTime: '10:00', endTime: '11:30' },
      { date: '2026-01-25', startTime: '10:00', endTime: '11:30' },
      { date: '2026-02-01', startTime: '10:00', endTime: '11:30' },
      { date: '2026-02-08', startTime: '10:00', endTime: '11:30' },
    ],
    maxParticipants: 14,
    currentParticipants: 12,
    waitlistEnabled: true,
    waitlistCount: 1,
    pricePerParticipant: 0,
    currency: 'GBP',
    ageMin: 8,
    ageMax: 9,
    skillLevel: 'BEGINNER',
    location: 'Victoria Park, London',
    isVirtual: false,
    status: 'PUBLISHED',
    createdAt: '2026-01-01T08:00:00Z',
    focus: ['Dribbling', 'Passing', 'Conditioning'],
    equipment: ['Boots', 'Shin pads', 'Water bottle'],
    isRecurring: true,
    recurringPattern: {
      dayOfWeek: 6, // Saturday
      startTime: '10:00',
      endTime: '11:30',
      until: '2026-06-30',
    },
    isFree: true,
  },
  {
    id: 'gs_training_3',
    coachId: 'coach1',
    coachName: 'Sarah Mitchell',
    coachPhotoUrl: 'https://randomuser.me/api/portraits/women/32.jpg',
    clubId: 'club_lions',
    clubName: 'Lions FC Academy',
    squadId: 'squad_u15',
    squadName: 'U15 Performance',
    title: "U15 Performance Training",
    description: 'Advanced training for our U15 performance squad. Focus on tactical understanding and match intensity.',
    sessionType: 'TRAINING',
    schedule: [
      { date: '2026-01-15', startTime: '18:00', endTime: '19:30' },
      { date: '2026-01-22', startTime: '18:00', endTime: '19:30' },
      { date: '2026-01-29', startTime: '18:00', endTime: '19:30' },
    ],
    maxParticipants: 18,
    currentParticipants: 16,
    waitlistEnabled: true,
    waitlistCount: 0,
    pricePerParticipant: 5,
    currency: 'GBP',
    ageMin: 14,
    ageMax: 15,
    skillLevel: 'ADVANCED',
    location: 'Hackney Marshes, East London',
    isVirtual: false,
    status: 'PUBLISHED',
    createdAt: '2026-01-01T08:00:00Z',
    focus: ['Finishing', 'Defending', 'Conditioning'],
    equipment: ['Boots', 'Shin pads', 'Water bottle'],
    isRecurring: true,
    recurringPattern: {
      dayOfWeek: 3, // Wednesday
      startTime: '18:00',
      endTime: '19:30',
      until: '2026-06-30',
    },
    isFree: false,
  },
];

let sessionsCache: GroupSession[] = [...MOCK_SESSIONS];

// ============================================================================
// SHARED PERSISTENCE HELPERS (used by other session sub-services)
// ============================================================================

export async function loadSessions(): Promise<GroupSession[]> {
  try {
    const stored = await apiClient.get<GroupSession[] | null>(STORAGE_KEYS.GROUP_SESSIONS, null);
    if (stored) return stored;
  } catch (error) {
    logger.error('Failed to load sessions', error);
  }
  return [...MOCK_SESSIONS];
}

export async function saveSessions(sessions: GroupSession[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.GROUP_SESSIONS, sessions);
    sessionsCache = sessions;
  } catch (error) {
    logger.error('Failed to save sessions', error);
  }
}

export function getSessionsCache(): GroupSession[] {
  return sessionsCache;
}

export function setSessionsCache(sessions: GroupSession[]): void {
  sessionsCache = sessions;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface CreateGroupSessionInput {
  coachId: string;
  coachName: string;
  coachPhotoUrl?: string;
  clubId?: string;
  clubName?: string;
  title: string;
  description: string;
  sessionType: GroupSession['sessionType'];
  schedule: GroupSessionSchedule[];
  maxParticipants: number;
  pricePerParticipant: number;
  currency?: string;
  ageMin?: number;
  ageMax?: number;
  skillLevel?: GroupSession['skillLevel'];
  location: string;
  isVirtual?: boolean;
  focus?: FootballObjective[];
  equipment?: string[];
  imageUrl?: string;
  waitlistEnabled?: boolean;
  // Recurring/Training session fields
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
  squadId?: string;
  squadName?: string;
  isFree?: boolean;
  inviteType?: SessionInviteType;
}

// ============================================================================
// RECURRING DATE GENERATION
// ============================================================================

/** Helper to generate dates for recurring sessions */
function generateRecurringDates(pattern: RecurringPattern, weeksAhead: number = 12): string[] {
  const dates: string[] = [];
  const today = new Date();
  const endDate = pattern.until ? new Date(pattern.until) : null;

  // Find the next occurrence of the day of week
  const currentDate = new Date(today);
  const currentDay = currentDate.getDay();
  const daysUntilTarget = (pattern.dayOfWeek - currentDay + 7) % 7;
  currentDate.setDate(currentDate.getDate() + (daysUntilTarget === 0 ? 0 : daysUntilTarget));

  for (let i = 0; i < weeksAhead; i++) {
    if (endDate && currentDate > endDate) break;
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 7);
  }

  return dates;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Session types considered "open" that should auto-post to the coach feed */
function isOpenSessionType(sessionType: string): boolean {
  return ['OPEN_SESSION', 'CAMP', 'CLINIC', 'TRIAL'].includes(sessionType);
}

// ============================================================================
// CRUD SERVICE
// ============================================================================

export const sessionCrudService = {
  /**
   * Get all group sessions for a coach
   */
  async getCoachSessions(coachId: string): Promise<GroupSession[]> {
    if (USE_MOCK) {
      sessionsCache = await loadSessions();
      return sessionsCache
        .filter((s) => s.coachId === coachId)
        .sort((a, b) => {
          const aDate = a.schedule[0]?.date || '';
          const bDate = b.schedule[0]?.date || '';
          return aDate.localeCompare(bDate);
        });
    }

    const response = await fetch(`/api/group-sessions?coachId=${coachId}`);
    return response.json();
  },

  /**
   * Discover group sessions (for parents)
   */
  async discoverSessions(filters?: {
    postcode?: string;
    sessionType?: GroupSession['sessionType'];
    skillLevel?: GroupSession['skillLevel'];
    ageMin?: number;
    ageMax?: number;
  }): Promise<GroupSession[]> {
    if (USE_MOCK) {
      sessionsCache = await loadSessions();
      let filtered = sessionsCache.filter((s) => s.status === 'PUBLISHED');

      if (filters?.sessionType) {
        filtered = filtered.filter((s) => s.sessionType === filters.sessionType);
      }
      if (filters?.skillLevel) {
        filtered = filtered.filter((s) => s.skillLevel === filters.skillLevel || s.skillLevel === 'ALL');
      }

      return filtered.sort((a, b) => {
        const aDate = a.schedule[0]?.date || '';
        const bDate = b.schedule[0]?.date || '';
        return aDate.localeCompare(bDate);
      });
    }

    const params = new URLSearchParams();
    if (filters?.postcode) params.append('near', filters.postcode);
    if (filters?.sessionType) params.append('type', filters.sessionType);
    if (filters?.skillLevel) params.append('level', filters.skillLevel);

    const response = await fetch(`/api/group-sessions?${params.toString()}`);
    return response.json();
  },

  /**
   * Get a single session
   */
  async getSession(sessionId: string): Promise<GroupSession | null> {
    if (USE_MOCK) {
      sessionsCache = await loadSessions();
      return sessionsCache.find((s) => s.id === sessionId) || null;
    }

    const response = await fetch(`/api/group-sessions/${sessionId}`);
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Create a new group session
   */
  async createSession(input: CreateGroupSessionInput): Promise<GroupSession> {
    // For recurring training sessions, auto-generate the schedule if not provided
    let schedule = input.schedule;
    if (input.isRecurring && input.recurringPattern && schedule.length === 0) {
      const dates = generateRecurringDates(input.recurringPattern);
      schedule = dates.map((date) => ({
        date,
        startTime: input.recurringPattern!.startTime,
        endTime: input.recurringPattern!.endTime,
      }));
    }

    const newSession: GroupSession = {
      id: `gs_${Date.now()}`,
      coachId: input.coachId,
      coachName: input.coachName,
      coachPhotoUrl: input.coachPhotoUrl,
      clubId: input.clubId,
      clubName: input.clubName,
      title: input.title,
      description: input.description,
      sessionType: input.sessionType,
      schedule,
      maxParticipants: input.maxParticipants,
      currentParticipants: 0,
      waitlistEnabled: input.waitlistEnabled ?? true,
      waitlistCount: 0,
      pricePerParticipant: input.pricePerParticipant,
      currency: input.currency || 'GBP',
      ageMin: input.ageMin,
      ageMax: input.ageMax,
      skillLevel: input.skillLevel,
      location: input.location,
      isVirtual: input.isVirtual || false,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      focus: input.focus,
      equipment: input.equipment,
      imageUrl: input.imageUrl,
      // Recurring/Training fields
      isRecurring: input.isRecurring,
      recurringPattern: input.recurringPattern,
      squadId: input.squadId,
      squadName: input.squadName,
      isFree: input.isFree ?? (input.pricePerParticipant === 0),
      inviteType: input.inviteType,
    };

    if (USE_MOCK) {
      sessionsCache = await loadSessions();
      sessionsCache.push(newSession);
      await saveSessions(sessionsCache);

      // Trigger notification for group session creation
      const firstDate = newSession.schedule[0]?.date || 'TBD';
      await notificationTriggers.groupSessionCreated(newSession.title, firstDate);

      return newSession;
    }

    const response = await fetch('/api/group-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSession),
    });
    return response.json();
  },

  /**
   * Publish a session (make it visible)
   */
  async publishSession(sessionId: string): Promise<Result<GroupSession, ServiceError>> {
    if (USE_MOCK) {
      sessionsCache = await loadSessions();
      const session = sessionsCache.find((s) => s.id === sessionId);
      if (!session) return err(notFound('Session', sessionId));

      session.status = 'PUBLISHED';
      await saveSessions(sessionsCache);

      // Create social feed post for club sessions
      if (session.clubId && session.schedule.length > 0) {
        const firstSchedule = session.schedule[0];
        socialFeedService.createSessionPost({
          clubId: session.clubId,
          clubName: session.clubName || 'Club',
          sessionId: session.id,
          sessionTitle: session.title,
          sessionDate: firstSchedule.date,
          sessionTime: firstSchedule.startTime,
          location: session.location,
          coachId: session.coachId,
          coachName: session.coachName,
          squadName: session.squadName,
        });
      }

      // Emit event for open sessions so service-subscribers can auto-create a feed post
      if (isOpenSessionType(session.sessionType) && session.schedule.length > 0) {
        const firstSchedule = session.schedule[0];
        emitTyped(ServiceEvents.OPEN_SESSION_PUBLISHED, {
          sessionId: session.id,
          coachId: session.coachId,
          coachName: session.coachName,
          title: session.title,
          description: session.description,
          sessionType: session.sessionType,
          location: session.location,
          price: session.pricePerParticipant,
          currency: session.currency,
          date: firstSchedule.date,
          startTime: firstSchedule.startTime,
          endTime: firstSchedule.endTime,
          maxParticipants: session.maxParticipants,
          clubId: session.clubId,
          clubName: session.clubName,
          imageUrl: session.imageUrl,
        });
      }

      return ok(session);
    }

    const response = await fetch(`/api/group-sessions/${sessionId}/publish`, {
      method: 'PATCH',
    });
    return ok(await response.json());
  },

  /**
   * Cancel a session
   */
  async cancelSession(sessionId: string): Promise<Result<GroupSession, ServiceError>> {
    if (USE_MOCK) {
      sessionsCache = await loadSessions();
      const session = sessionsCache.find((s) => s.id === sessionId);
      if (!session) return err(notFound('Session', sessionId));

      session.status = 'CANCELLED';
      await saveSessions(sessionsCache);

      // Trigger notification for group session cancellation
      await notificationTriggers.groupSessionCancelled(session.title);

      return ok(session);
    }

    const response = await fetch(`/api/group-sessions/${sessionId}/cancel`, {
      method: 'PATCH',
    });
    return ok(await response.json());
  },
};
