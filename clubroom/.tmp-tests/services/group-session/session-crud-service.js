"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionCrudService = void 0;
exports.loadSessions = loadSessions;
exports.saveSessions = saveSessions;
exports.getSessionsCache = getSessionsCache;
exports.setSessionsCache = setSessionsCache;
const api_client_1 = require("../api-client");
const config_1 = require("@/constants/config");
const storage_keys_1 = require("@/constants/storage-keys");
const notification_trigger_1 = require("../notification-trigger");
const social_feed_service_1 = require("../social-feed-service");
const event_bus_1 = require("../event-bus");
const logger_1 = require("@/utils/logger");
const format_1 = require("@/utils/format");
const result_1 = require("@/types/result");
const USE_MOCK = config_1.api.useMock;
const logger = (0, logger_1.createLogger)('SessionCrudService');
// ============================================================================
// MOCK DATA (shared across session sub-services via load/save helpers)
// ============================================================================
const MOCK_SESSIONS = [
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
let sessionsCache = [...MOCK_SESSIONS];
// ============================================================================
// SHARED PERSISTENCE HELPERS (used by other session sub-services)
// ============================================================================
async function loadSessions() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.GROUP_SESSIONS, null);
        if (stored)
            return stored;
    }
    catch (error) {
        logger.error('Failed to load sessions', error);
    }
    return [...MOCK_SESSIONS];
}
async function saveSessions(sessions) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.GROUP_SESSIONS, sessions);
        sessionsCache = sessions;
    }
    catch (error) {
        logger.error('Failed to save sessions', error);
    }
}
function getSessionsCache() {
    return sessionsCache;
}
function setSessionsCache(sessions) {
    sessionsCache = sessions;
}
// ============================================================================
// RECURRING DATE GENERATION
// ============================================================================
/** Helper to generate dates for recurring sessions */
function generateRecurringDates(pattern, weeksAhead = 12) {
    const dates = [];
    const today = new Date();
    const endDate = pattern.until ? new Date(pattern.until) : null;
    // Find the next occurrence of the day of week
    const currentDate = new Date(today);
    const currentDay = currentDate.getDay();
    const daysUntilTarget = (pattern.dayOfWeek - currentDay + 7) % 7;
    currentDate.setDate(currentDate.getDate() + (daysUntilTarget === 0 ? 0 : daysUntilTarget));
    for (let i = 0; i < weeksAhead; i++) {
        if (endDate && currentDate > endDate)
            break;
        dates.push((0, format_1.toDateStr)(currentDate));
        currentDate.setDate(currentDate.getDate() + 7);
    }
    return dates;
}
// ============================================================================
// HELPERS
// ============================================================================
/** Session types considered "open" that should auto-post to the coach feed */
function isOpenSessionType(sessionType) {
    return ['OPEN_SESSION', 'CAMP', 'CLINIC', 'TRIAL'].includes(sessionType);
}
// ============================================================================
// CRUD SERVICE
// ============================================================================
exports.sessionCrudService = {
    /**
     * Get all group sessions for a coach
     */
    async getCoachSessions(coachId) {
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
    async discoverSessions(filters) {
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
        if (filters?.postcode)
            params.append('near', filters.postcode);
        if (filters?.sessionType)
            params.append('type', filters.sessionType);
        if (filters?.skillLevel)
            params.append('level', filters.skillLevel);
        const response = await fetch(`/api/group-sessions?${params.toString()}`);
        return response.json();
    },
    /**
     * Get a single session
     */
    async getSession(sessionId) {
        if (USE_MOCK) {
            sessionsCache = await loadSessions();
            return sessionsCache.find((s) => s.id === sessionId) || null;
        }
        const response = await fetch(`/api/group-sessions/${sessionId}`);
        if (!response.ok)
            return null;
        return response.json();
    },
    /**
     * Create a new group session
     */
    async createSession(input) {
        // For recurring training sessions, auto-generate the schedule if not provided
        let schedule = input.schedule;
        if (input.isRecurring && input.recurringPattern && schedule.length === 0) {
            const dates = generateRecurringDates(input.recurringPattern);
            schedule = dates.map((date) => ({
                date,
                startTime: input.recurringPattern.startTime,
                endTime: input.recurringPattern.endTime,
            }));
        }
        const newSession = {
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
            await notification_trigger_1.notificationTriggers.groupSessionCreated(newSession.title, firstDate);
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
    async publishSession(sessionId) {
        if (USE_MOCK) {
            sessionsCache = await loadSessions();
            const session = sessionsCache.find((s) => s.id === sessionId);
            if (!session)
                return (0, result_1.err)((0, result_1.notFound)('Session', sessionId));
            session.status = 'PUBLISHED';
            await saveSessions(sessionsCache);
            // Create social feed post for club sessions
            if (session.clubId && session.schedule.length > 0) {
                const firstSchedule = session.schedule[0];
                social_feed_service_1.socialFeedService.createSessionPost({
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
                (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.OPEN_SESSION_PUBLISHED, {
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
            return (0, result_1.ok)(session);
        }
        const response = await fetch(`/api/group-sessions/${sessionId}/publish`, {
            method: 'PATCH',
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Cancel a session
     */
    async cancelSession(sessionId) {
        if (USE_MOCK) {
            sessionsCache = await loadSessions();
            const session = sessionsCache.find((s) => s.id === sessionId);
            if (!session)
                return (0, result_1.err)((0, result_1.notFound)('Session', sessionId));
            session.status = 'CANCELLED';
            await saveSessions(sessionsCache);
            // Trigger notification for group session cancellation
            await notification_trigger_1.notificationTriggers.groupSessionCancelled(session.title);
            return (0, result_1.ok)(session);
        }
        const response = await fetch(`/api/group-sessions/${sessionId}/cancel`, {
            method: 'PATCH',
        });
        return (0, result_1.ok)(await response.json());
    },
};
