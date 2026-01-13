/**
 * Group Session Service
 *
 * Handles group sessions like camps, clinics, and team training.
 * Supports waitlists, capacity management, and attendance tracking.
 *
 * API Integration Notes:
 * - POST /api/group-sessions - Create session
 * - GET /api/group-sessions?coachId=X - Coach's sessions
 * - GET /api/group-sessions?near=POSTCODE - Discovery
 * - POST /api/group-sessions/:id/register - Register athlete
 * - POST /api/group-sessions/:id/waitlist - Join waitlist
 * - GET /api/group-sessions/:id/roster - Get participants
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GroupSession, GroupRegistration, GroupSessionSchedule, FootballObjective, RecurringPattern } from '@/constants/types';
import { socialFeedService } from './social-feed-service';
import { notificationService } from './notification-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('GroupSessionService');

const SESSIONS_STORAGE_KEY = 'group_sessions';
const REGISTRATIONS_STORAGE_KEY = 'group_registrations';
const USE_MOCK = true;

// Mock group sessions
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

const MOCK_REGISTRATIONS: GroupRegistration[] = [
  // Half-Term Football Camp registrations (gs_1)
  {
    id: 'reg_1',
    sessionId: 'gs_1',
    athleteId: 'user1',
    athleteName: 'Tom Henderson',
    status: 'REGISTERED',
    registeredAt: '2026-01-06T09:00:00Z',
    paidAt: '2026-01-06T09:05:00Z',
    attendedDates: [],
  },
  {
    id: 'reg_2',
    sessionId: 'gs_1',
    athleteId: 'user2',
    athleteName: 'Emma Henderson',
    status: 'REGISTERED',
    registeredAt: '2026-01-06T09:30:00Z',
    paidAt: '2026-01-06T09:35:00Z',
    attendedDates: [],
  },
  {
    id: 'reg_3',
    sessionId: 'gs_1',
    athleteId: 'user3',
    athleteName: 'James Wilson',
    status: 'REGISTERED',
    registeredAt: '2026-01-07T10:00:00Z',
    paidAt: '2026-01-07T10:05:00Z',
    attendedDates: [],
  },
  {
    id: 'reg_4',
    sessionId: 'gs_1',
    athleteId: 'user4',
    athleteName: 'Sophie Taylor',
    status: 'REGISTERED',
    registeredAt: '2026-01-07T14:00:00Z',
    paidAt: '2026-01-07T14:02:00Z',
    attendedDates: [],
  },
  {
    id: 'reg_5',
    sessionId: 'gs_1',
    athleteId: 'user5',
    athleteName: 'Liam Davies',
    status: 'WAITLISTED',
    registeredAt: '2026-01-08T11:00:00Z',
    attendedDates: [],
  },
  // Striker Masterclass registrations (gs_2)
  {
    id: 'reg_6',
    sessionId: 'gs_2',
    athleteId: 'user1',
    athleteName: 'Tom Henderson',
    status: 'REGISTERED',
    registeredAt: '2026-01-09T10:00:00Z',
    paidAt: '2026-01-09T10:02:00Z',
    attendedDates: [],
  },
  {
    id: 'reg_7',
    sessionId: 'gs_2',
    athleteId: 'user3',
    athleteName: 'James Wilson',
    status: 'REGISTERED',
    registeredAt: '2026-01-09T11:00:00Z',
    paidAt: '2026-01-09T11:05:00Z',
    attendedDates: [],
  },
  {
    id: 'reg_8',
    sessionId: 'gs_2',
    athleteId: 'user6',
    athleteName: 'Ella Martinez',
    status: 'REGISTERED',
    registeredAt: '2026-01-10T09:00:00Z',
    paidAt: '2026-01-10T09:10:00Z',
    attendedDates: [],
  },
  // Goalkeeper Training registrations (gs_3)
  {
    id: 'reg_9',
    sessionId: 'gs_3',
    athleteId: 'user2',
    athleteName: 'Emma Henderson',
    status: 'REGISTERED',
    registeredAt: '2026-01-11T15:00:00Z',
    paidAt: '2026-01-11T15:05:00Z',
    attendedDates: [],
  },
  {
    id: 'reg_10',
    sessionId: 'gs_3',
    athleteId: 'user5',
    athleteName: 'Liam Davies',
    status: 'REGISTERED',
    registeredAt: '2026-01-11T16:00:00Z',
    paidAt: '2026-01-11T16:02:00Z',
    attendedDates: [],
  },
  // Free Trial Session registrations (gs_4)
  {
    id: 'reg_11',
    sessionId: 'gs_4',
    athleteId: 'user4',
    athleteName: 'Sophie Taylor',
    status: 'REGISTERED',
    registeredAt: '2026-01-12T10:00:00Z',
    attendedDates: [],
  },
  {
    id: 'reg_12',
    sessionId: 'gs_4',
    athleteId: 'user6',
    athleteName: 'Ella Martinez',
    status: 'REGISTERED',
    registeredAt: '2026-01-12T11:00:00Z',
    attendedDates: [],
  },
  // U11 Training registrations (gs_training_1)
  {
    id: 'reg_13',
    sessionId: 'gs_training_1',
    athleteId: 'user1',
    athleteName: 'Tom Henderson',
    status: 'REGISTERED',
    registeredAt: '2026-01-01T09:00:00Z',
    attendedDates: ['2026-01-14', '2026-01-21'],
  },
  {
    id: 'reg_14',
    sessionId: 'gs_training_1',
    athleteId: 'user2',
    athleteName: 'Emma Henderson',
    status: 'REGISTERED',
    registeredAt: '2026-01-01T09:00:00Z',
    attendedDates: ['2026-01-14'],
  },
  {
    id: 'reg_15',
    sessionId: 'gs_training_1',
    athleteId: 'user3',
    athleteName: 'James Wilson',
    status: 'REGISTERED',
    registeredAt: '2026-01-02T10:00:00Z',
    attendedDates: ['2026-01-14', '2026-01-21'],
  },
  {
    id: 'reg_16',
    sessionId: 'gs_training_1',
    athleteId: 'user4',
    athleteName: 'Sophie Taylor',
    status: 'REGISTERED',
    registeredAt: '2026-01-02T10:30:00Z',
    attendedDates: ['2026-01-14'],
  },
  {
    id: 'reg_17',
    sessionId: 'gs_training_1',
    athleteId: 'user5',
    athleteName: 'Liam Davies',
    status: 'REGISTERED',
    registeredAt: '2026-01-03T11:00:00Z',
    attendedDates: [],
  },
  {
    id: 'reg_18',
    sessionId: 'gs_training_1',
    athleteId: 'user6',
    athleteName: 'Ella Martinez',
    status: 'REGISTERED',
    registeredAt: '2026-01-03T12:00:00Z',
    attendedDates: ['2026-01-14', '2026-01-21'],
  },
  // U15 Performance Training registrations (gs_training_3)
  {
    id: 'reg_19',
    sessionId: 'gs_training_3',
    athleteId: 'user1',
    athleteName: 'Tom Henderson',
    status: 'REGISTERED',
    registeredAt: '2026-01-01T08:00:00Z',
    attendedDates: ['2026-01-15'],
  },
  {
    id: 'reg_20',
    sessionId: 'gs_training_3',
    athleteId: 'user3',
    athleteName: 'James Wilson',
    status: 'ATTENDED',
    registeredAt: '2026-01-01T08:30:00Z',
    attendedDates: ['2026-01-15'],
  },
];

let sessionsCache: GroupSession[] = [...MOCK_SESSIONS];
let registrationsCache: GroupRegistration[] = [...MOCK_REGISTRATIONS];

async function loadSessions(): Promise<GroupSession[]> {
  try {
    const stored = await AsyncStorage.getItem(SESSIONS_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (error) {
    logger.error('Failed to load sessions', error);
  }
  return [...MOCK_SESSIONS];
}

async function saveSessions(sessions: GroupSession[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    logger.error('Failed to save sessions', error);
  }
}

async function loadRegistrations(): Promise<GroupRegistration[]> {
  try {
    const stored = await AsyncStorage.getItem(REGISTRATIONS_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (error) {
    logger.error('Failed to load registrations', error);
  }
  return [...MOCK_REGISTRATIONS];
}

async function saveRegistrations(registrations: GroupRegistration[]): Promise<void> {
  try {
    await AsyncStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(registrations));
  } catch (error) {
    logger.error('Failed to save registrations', error);
  }
}

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
}

// Helper to generate dates for recurring sessions
function generateRecurringDates(pattern: RecurringPattern, weeksAhead: number = 12): string[] {
  const dates: string[] = [];
  const today = new Date();
  const endDate = pattern.until ? new Date(pattern.until) : null;

  // Find the next occurrence of the day of week
  let currentDate = new Date(today);
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

// Day of week labels
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const groupSessionService = {
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
    };

    if (USE_MOCK) {
      sessionsCache = await loadSessions();
      sessionsCache.push(newSession);
      await saveSessions(sessionsCache);
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
  async publishSession(sessionId: string): Promise<GroupSession> {
    if (USE_MOCK) {
      sessionsCache = await loadSessions();
      const session = sessionsCache.find((s) => s.id === sessionId);
      if (!session) throw new Error('Session not found');

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

      return session;
    }

    const response = await fetch(`/api/group-sessions/${sessionId}/publish`, {
      method: 'PATCH',
    });
    return response.json();
  },

  /**
   * Cancel a session
   */
  async cancelSession(sessionId: string): Promise<GroupSession> {
    if (USE_MOCK) {
      sessionsCache = await loadSessions();
      const session = sessionsCache.find((s) => s.id === sessionId);
      if (!session) throw new Error('Session not found');

      session.status = 'CANCELLED';
      await saveSessions(sessionsCache);
      return session;
    }

    const response = await fetch(`/api/group-sessions/${sessionId}/cancel`, {
      method: 'PATCH',
    });
    return response.json();
  },

  /**
   * Register an athlete for a session
   */
  async register(
    sessionId: string,
    athleteId: string,
    athleteName: string,
    parentId: string,
    parentName: string
  ): Promise<GroupRegistration> {
    if (USE_MOCK) {
      sessionsCache = await loadSessions();
      registrationsCache = await loadRegistrations();

      const session = sessionsCache.find((s) => s.id === sessionId);
      if (!session) throw new Error('Session not found');

      // Check capacity
      const isFull = session.currentParticipants >= session.maxParticipants;

      const registration: GroupRegistration = {
        id: `reg_${Date.now()}`,
        sessionId,
        athleteId,
        athleteName,
        parentId,
        parentName,
        status: isFull ? 'WAITLISTED' : 'REGISTERED',
        registeredAt: new Date().toISOString(),
        paidAt: isFull ? undefined : new Date().toISOString(),
        attendedDates: [],
      };

      registrationsCache.push(registration);
      await saveRegistrations(registrationsCache);

      // Update session counts
      if (isFull) {
        session.waitlistCount += 1;
      } else {
        session.currentParticipants += 1;
        if (session.currentParticipants >= session.maxParticipants) {
          session.status = 'FULL';
        }
      }
      await saveSessions(sessionsCache);

      return registration;
    }

    const response = await fetch(`/api/group-sessions/${sessionId}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athleteId, athleteName, parentId, parentName }),
    });
    return response.json();
  },

  /**
   * Cancel a registration
   */
  async cancelRegistration(registrationId: string): Promise<void> {
    if (USE_MOCK) {
      registrationsCache = await loadRegistrations();
      sessionsCache = await loadSessions();

      const registration = registrationsCache.find((r) => r.id === registrationId);
      if (!registration) throw new Error('Registration not found');

      const wasRegistered = registration.status === 'REGISTERED';
      registration.status = 'CANCELLED';
      await saveRegistrations(registrationsCache);

      // Update session counts
      const session = sessionsCache.find((s) => s.id === registration.sessionId);
      if (session) {
        if (wasRegistered) {
          session.currentParticipants -= 1;
          if (session.status === 'FULL') {
            session.status = 'PUBLISHED';
          }

          // Promote from waitlist if applicable
          const waitlisted = registrationsCache.find(
            (r) => r.sessionId === session.id && r.status === 'WAITLISTED'
          );
          if (waitlisted) {
            waitlisted.status = 'REGISTERED';
            waitlisted.paidAt = new Date().toISOString();
            session.currentParticipants += 1;
            session.waitlistCount -= 1;
          }
        } else {
          session.waitlistCount -= 1;
        }
        await saveSessions(sessionsCache);
      }

      return;
    }

    await fetch(`/api/registrations/${registrationId}`, { method: 'DELETE' });
  },

  /**
   * Get roster for a session
   */
  async getSessionRoster(sessionId: string): Promise<GroupRegistration[]> {
    if (USE_MOCK) {
      registrationsCache = await loadRegistrations();
      return registrationsCache
        .filter((r) => r.sessionId === sessionId && r.status !== 'CANCELLED')
        .sort((a, b) => {
          // Registered first, then waitlisted
          if (a.status === 'REGISTERED' && b.status !== 'REGISTERED') return -1;
          if (a.status !== 'REGISTERED' && b.status === 'REGISTERED') return 1;
          return new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime();
        });
    }

    const response = await fetch(`/api/group-sessions/${sessionId}/roster`);
    return response.json();
  },

  /**
   * Mark attendance
   */
  async markAttendance(registrationId: string, date: string, attended: boolean): Promise<GroupRegistration> {
    if (USE_MOCK) {
      registrationsCache = await loadRegistrations();
      const registration = registrationsCache.find((r) => r.id === registrationId);
      if (!registration) throw new Error('Registration not found');

      if (attended) {
        if (!registration.attendedDates.includes(date)) {
          registration.attendedDates.push(date);
        }
        registration.status = 'ATTENDED';
      } else {
        registration.attendedDates = registration.attendedDates.filter((d) => d !== date);
        if (registration.attendedDates.length === 0) {
          registration.status = 'REGISTERED';
        }
      }

      await saveRegistrations(registrationsCache);
      return registration;
    }

    const response = await fetch(`/api/registrations/${registrationId}/attendance`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, attended }),
    });
    return response.json();
  },

  /**
   * Get parent's registrations
   */
  async getParentRegistrations(parentId: string): Promise<(GroupRegistration & { session: GroupSession })[]> {
    if (USE_MOCK) {
      registrationsCache = await loadRegistrations();
      sessionsCache = await loadSessions();

      return registrationsCache
        .filter((r) => r.parentId === parentId && r.status !== 'CANCELLED')
        .map((r) => ({
          ...r,
          session: sessionsCache.find((s) => s.id === r.sessionId)!,
        }))
        .filter((r) => r.session)
        .sort((a, b) => {
          const aDate = a.session.schedule[0]?.date || '';
          const bDate = b.session.schedule[0]?.date || '';
          return aDate.localeCompare(bDate);
        });
    }

    const response = await fetch(`/api/parents/${parentId}/registrations`);
    return response.json();
  },

  /**
   * Format price for display
   */
  formatPrice(amount: number, currency: string = 'GBP'): string {
    if (amount === 0) return 'Free';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
    }).format(amount);
  },

  /**
   * Format session type for display
   */
  formatSessionType(type: GroupSession['sessionType']): string {
    const labels: Record<GroupSession['sessionType'], string> = {
      CAMP: 'Camp',
      CLINIC: 'Clinic',
      TEAM_TRAINING: 'Team Training',
      OPEN_SESSION: 'Open Session',
      TRIAL: 'Trial Session',
      TRAINING: 'Training',
    };
    return labels[type] || type;
  },

  /**
   * Get club training sessions
   */
  async getClubTrainingSessions(clubId: string): Promise<GroupSession[]> {
    if (USE_MOCK) {
      sessionsCache = await loadSessions();
      return sessionsCache
        .filter(
          (s) =>
            s.clubId === clubId &&
            s.sessionType === 'TRAINING' &&
            s.status === 'PUBLISHED'
        )
        .sort((a, b) => {
          const aDate = a.schedule[0]?.date || '';
          const bDate = b.schedule[0]?.date || '';
          return aDate.localeCompare(bDate);
        });
    }

    const response = await fetch(`/api/clubs/${clubId}/training-sessions`);
    return response.json();
  },

  /**
   * Get training sessions for a squad
   */
  async getSquadTrainingSessions(squadId: string): Promise<GroupSession[]> {
    if (USE_MOCK) {
      sessionsCache = await loadSessions();
      return sessionsCache
        .filter(
          (s) =>
            s.squadId === squadId &&
            s.sessionType === 'TRAINING' &&
            s.status === 'PUBLISHED'
        )
        .sort((a, b) => {
          const aDate = a.schedule[0]?.date || '';
          const bDate = b.schedule[0]?.date || '';
          return aDate.localeCompare(bDate);
        });
    }

    const response = await fetch(`/api/squads/${squadId}/training-sessions`);
    return response.json();
  },

  /**
   * Get all upcoming training sessions (for parent's child)
   */
  async getChildTrainingSessions(childId: string): Promise<GroupSession[]> {
    if (USE_MOCK) {
      registrationsCache = await loadRegistrations();
      sessionsCache = await loadSessions();

      const registeredSessionIds = registrationsCache
        .filter((r) => r.athleteId === childId && r.status !== 'CANCELLED')
        .map((r) => r.sessionId);

      return sessionsCache
        .filter(
          (s) =>
            registeredSessionIds.includes(s.id) &&
            s.sessionType === 'TRAINING' &&
            s.status === 'PUBLISHED'
        )
        .sort((a, b) => {
          const aDate = a.schedule[0]?.date || '';
          const bDate = b.schedule[0]?.date || '';
          return aDate.localeCompare(bDate);
        });
    }

    const response = await fetch(`/api/athletes/${childId}/training-sessions`);
    return response.json();
  },

  /**
   * Format day of week for display
   */
  formatDayOfWeek(day: number): string {
    return DAY_LABELS[day] || `Day ${day}`;
  },

  /**
   * Format recurring pattern for display
   */
  formatRecurringPattern(pattern: RecurringPattern): string {
    const day = DAY_LABELS[pattern.dayOfWeek];
    return `${day}s ${pattern.startTime} - ${pattern.endTime}`;
  },

  /**
   * Get next upcoming date for a training session
   */
  getNextTrainingDate(session: GroupSession): GroupSessionSchedule | null {
    const today = new Date().toISOString().split('T')[0];
    return session.schedule.find((s) => s.date >= today) || null;
  },
};
