"use strict";
/**
 * Session Registration Service
 *
 * Handles athlete registration for group sessions: register, cancel,
 * waitlist management, roster queries, and attendance marking.
 *
 * API Integration Notes:
 * - POST /api/group-sessions/:id/register - Register athlete
 * - POST /api/group-sessions/:id/waitlist - Join waitlist
 * - DELETE /api/registrations/:id - Cancel registration
 * - GET /api/group-sessions/:id/roster - Get participants
 * - PATCH /api/registrations/:id/attendance - Mark attendance
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionRegistrationService = void 0;
exports.loadRegistrations = loadRegistrations;
exports.saveRegistrations = saveRegistrations;
const api_client_1 = require("../api-client");
const config_1 = require("@/constants/config");
const storage_keys_1 = require("@/constants/storage-keys");
const notification_trigger_1 = require("../notification-trigger");
const logger_1 = require("@/utils/logger");
const result_1 = require("@/types/result");
const event_bus_1 = require("../event-bus");
const booking_1 = require("../booking");
const user_service_1 = require("../user-service");
const session_crud_service_1 = require("./session-crud-service");
const USE_MOCK = config_1.api.useMock;
const logger = (0, logger_1.createLogger)('SessionRegistrationService');
// ============================================================================
// MOCK REGISTRATION DATA
// ============================================================================
const MOCK_REGISTRATIONS = [
    // Half-Term Football Camp registrations (gs_1)
    {
        id: 'reg_1',
        sessionId: 'gs_1',
        athleteId: 'user1',
        parentId: 'user_parent_01',
        status: 'REGISTERED',
        registeredAt: '2026-01-06T09:00:00Z',
        paidAt: '2026-01-06T09:05:00Z',
        attendedDates: [],
    },
    {
        id: 'reg_2',
        sessionId: 'gs_1',
        athleteId: 'user2',
        parentId: 'user_parent_01',
        status: 'REGISTERED',
        registeredAt: '2026-01-06T09:30:00Z',
        paidAt: '2026-01-06T09:35:00Z',
        attendedDates: [],
    },
    {
        id: 'reg_3',
        sessionId: 'gs_1',
        athleteId: 'user3',
        parentId: 'user_parent_01',
        status: 'REGISTERED',
        registeredAt: '2026-01-07T10:00:00Z',
        paidAt: '2026-01-07T10:05:00Z',
        attendedDates: [],
    },
    {
        id: 'reg_4',
        sessionId: 'gs_1',
        athleteId: 'user4a',
        parentId: 'user_parent_01',
        status: 'REGISTERED',
        registeredAt: '2026-01-07T14:00:00Z',
        paidAt: '2026-01-07T14:02:00Z',
        attendedDates: [],
    },
    {
        id: 'reg_5',
        sessionId: 'gs_1',
        athleteId: 'user5',
        parentId: 'user_parent_01',
        status: 'WAITLISTED',
        registeredAt: '2026-01-08T11:00:00Z',
        attendedDates: [],
    },
    // Striker Masterclass registrations (gs_2)
    {
        id: 'reg_6',
        sessionId: 'gs_2',
        athleteId: 'user1',
        parentId: 'user_parent_01',
        status: 'REGISTERED',
        registeredAt: '2026-01-09T10:00:00Z',
        paidAt: '2026-01-09T10:02:00Z',
        attendedDates: [],
    },
    {
        id: 'reg_7',
        sessionId: 'gs_2',
        athleteId: 'user3',
        parentId: 'user_parent_01',
        status: 'REGISTERED',
        registeredAt: '2026-01-09T11:00:00Z',
        paidAt: '2026-01-09T11:05:00Z',
        attendedDates: [],
    },
    {
        id: 'reg_8',
        sessionId: 'gs_2',
        athleteId: 'user6',
        parentId: 'user_parent_01',
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
        parentId: 'user_parent_01',
        status: 'REGISTERED',
        registeredAt: '2026-01-11T15:00:00Z',
        paidAt: '2026-01-11T15:05:00Z',
        attendedDates: [],
    },
    {
        id: 'reg_10',
        sessionId: 'gs_3',
        athleteId: 'user5',
        parentId: 'user_parent_01',
        status: 'REGISTERED',
        registeredAt: '2026-01-11T16:00:00Z',
        paidAt: '2026-01-11T16:02:00Z',
        attendedDates: [],
    },
    // Free Trial Session registrations (gs_4)
    {
        id: 'reg_11',
        sessionId: 'gs_4',
        athleteId: 'user4a',
        parentId: 'user_parent_01',
        status: 'REGISTERED',
        registeredAt: '2026-01-12T10:00:00Z',
        attendedDates: [],
    },
    {
        id: 'reg_12',
        sessionId: 'gs_4',
        athleteId: 'user6',
        parentId: 'user_parent_01',
        status: 'REGISTERED',
        registeredAt: '2026-01-12T11:00:00Z',
        attendedDates: [],
    },
    // U11 Training registrations (gs_training_1)
    {
        id: 'reg_13',
        sessionId: 'gs_training_1',
        athleteId: 'user1',
        parentId: 'user_parent_01',
        status: 'REGISTERED',
        registeredAt: '2026-01-01T09:00:00Z',
        attendedDates: ['2026-01-14', '2026-01-21'],
    },
    {
        id: 'reg_14',
        sessionId: 'gs_training_1',
        athleteId: 'user2',
        parentId: 'user_parent_01',
        status: 'REGISTERED',
        registeredAt: '2026-01-01T09:00:00Z',
        attendedDates: ['2026-01-14'],
    },
    {
        id: 'reg_15',
        sessionId: 'gs_training_1',
        athleteId: 'user3',
        parentId: 'user_parent_01',
        status: 'REGISTERED',
        registeredAt: '2026-01-02T10:00:00Z',
        attendedDates: ['2026-01-14', '2026-01-21'],
    },
    {
        id: 'reg_16',
        sessionId: 'gs_training_1',
        athleteId: 'user4a',
        parentId: 'user_parent_01',
        status: 'REGISTERED',
        registeredAt: '2026-01-02T10:30:00Z',
        attendedDates: ['2026-01-14'],
    },
    {
        id: 'reg_17',
        sessionId: 'gs_training_1',
        athleteId: 'user5',
        parentId: 'user_parent_01',
        status: 'REGISTERED',
        registeredAt: '2026-01-03T11:00:00Z',
        attendedDates: [],
    },
    {
        id: 'reg_18',
        sessionId: 'gs_training_1',
        athleteId: 'user6',
        parentId: 'user_parent_01',
        status: 'REGISTERED',
        registeredAt: '2026-01-03T12:00:00Z',
        attendedDates: ['2026-01-14', '2026-01-21'],
    },
    // ── parent1 (user4) registrations — Tom (user1) + Emma (user2) ──
    {
        id: 'reg_p1_gs1_tom',
        sessionId: 'gs_1',
        athleteId: 'user1',
        parentId: 'user4',
        status: 'REGISTERED',
        registeredAt: '2026-01-06T08:00:00Z',
        paidAt: '2026-01-06T08:05:00Z',
        attendedDates: [],
    },
    {
        id: 'reg_p1_gs1_emma',
        sessionId: 'gs_1',
        athleteId: 'user2',
        parentId: 'user4',
        status: 'REGISTERED',
        registeredAt: '2026-01-06T08:10:00Z',
        paidAt: '2026-01-06T08:15:00Z',
        attendedDates: [],
    },
    {
        id: 'reg_p1_gs2_tom',
        sessionId: 'gs_2',
        athleteId: 'user1',
        parentId: 'user4',
        status: 'REGISTERED',
        registeredAt: '2026-01-09T09:00:00Z',
        paidAt: '2026-01-09T09:05:00Z',
        attendedDates: [],
    },
    {
        id: 'reg_p1_gs3_emma',
        sessionId: 'gs_3',
        athleteId: 'user2',
        parentId: 'user4',
        status: 'REGISTERED',
        registeredAt: '2026-01-11T14:00:00Z',
        paidAt: '2026-01-11T14:05:00Z',
        attendedDates: [],
    },
    {
        id: 'reg_p1_gs4_tom',
        sessionId: 'gs_4',
        athleteId: 'user1',
        parentId: 'user4',
        status: 'REGISTERED',
        registeredAt: '2026-01-12T09:00:00Z',
        attendedDates: [],
    },
    // U15 Performance Training registrations (gs_training_3)
    {
        id: 'reg_19',
        sessionId: 'gs_training_3',
        athleteId: 'user1',
        parentId: 'user_parent_01',
        status: 'REGISTERED',
        registeredAt: '2026-01-01T08:00:00Z',
        attendedDates: ['2026-01-15'],
    },
    {
        id: 'reg_20',
        sessionId: 'gs_training_3',
        athleteId: 'user3',
        parentId: 'user_parent_01',
        status: 'ATTENDED',
        registeredAt: '2026-01-01T08:30:00Z',
        attendedDates: ['2026-01-15'],
    },
];
let registrationsCache = [...MOCK_REGISTRATIONS];
async function resolveUserName(userId, fallback) {
    const userResult = await user_service_1.userService.getUserById(userId);
    if (!userResult.success)
        return fallback;
    const resolved = userResult.data.name?.trim();
    return resolved && resolved.length > 0 ? resolved : fallback;
}
// ============================================================================
// PERSISTENCE HELPERS
// ============================================================================
async function loadRegistrations() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.GROUP_REGISTRATIONS, null);
        if (stored)
            return stored;
    }
    catch (error) {
        logger.error('Failed to load registrations', error);
    }
    return [...MOCK_REGISTRATIONS];
}
async function saveRegistrations(registrations) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.GROUP_REGISTRATIONS, registrations);
        registrationsCache = registrations;
    }
    catch (error) {
        logger.error('Failed to save registrations', error);
    }
}
// ============================================================================
// REGISTRATION SERVICE
// ============================================================================
exports.sessionRegistrationService = {
    /**
     * Register an athlete for a session
     */
    async register(sessionId, athleteId, parentId) {
        if (USE_MOCK) {
            let sessionsCache = await (0, session_crud_service_1.loadSessions)();
            registrationsCache = await loadRegistrations();
            const session = sessionsCache.find((s) => s.id === sessionId);
            if (!session)
                return (0, result_1.err)((0, result_1.notFound)('Session', sessionId));
            // Check capacity
            const isFull = session.currentParticipants >= session.maxParticipants;
            const registration = {
                id: `reg_${Date.now()}`,
                sessionId,
                athleteId,
                parentId,
                status: isFull ? 'WAITLISTED' : 'REGISTERED',
                registeredAt: new Date().toISOString(),
                paidAt: isFull ? undefined : new Date().toISOString(),
                attendedDates: [],
            };
            registrationsCache.push(registration);
            await saveRegistrations(registrationsCache);
            // Trigger notification to coach for new registration
            if (!isFull) {
                const athleteDisplayName = await resolveUserName(athleteId, 'Athlete');
                await notification_trigger_1.notificationTriggers.groupRegistered(athleteDisplayName, session.title, session.coachId);
            }
            // Update session counts
            if (isFull) {
                session.waitlistCount += 1;
            }
            else {
                session.currentParticipants += 1;
                if (session.currentParticipants >= session.maxParticipants) {
                    session.status = 'FULL';
                }
            }
            await (0, session_crud_service_1.saveSessions)(sessionsCache);
            // Create a linked booking so group sessions appear in the bookings list
            if (!isFull) {
                try {
                    const [coachDisplayName, athleteDisplayName, parentDisplayName] = await Promise.all([
                        resolveUserName(session.coachId, 'Coach'),
                        resolveUserName(athleteId, 'Athlete'),
                        resolveUserName(parentId, 'Parent'),
                    ]);
                    const nextDate = session.schedule[0]?.date
                        ? `${session.schedule[0].date}T${session.schedule[0].startTime || '09:00'}:00`
                        : new Date().toISOString();
                    const bookingResult = await booking_1.bookingCrudService.createBooking({
                        coachId: session.coachId,
                        coachName: coachDisplayName,
                        athleteIds: [athleteId],
                        athleteNames: [athleteDisplayName],
                        bookedById: parentId,
                        bookedByName: parentDisplayName,
                        scheduledAt: nextDate,
                        duration: 60,
                        location: session.location,
                        service: session.title,
                        serviceType: 'GROUP_SESSION',
                        price: session.pricePerParticipant,
                    });
                    if (bookingResult.success) {
                        const booking = bookingResult.data;
                        const linkResult = await booking_1.bookingCrudService.updateBooking(booking.id, {
                            isGroupSession: true,
                            groupSessionId: session.id,
                            groupRegistrationId: registration.id,
                            status: 'CONFIRMED',
                        });
                        if (!linkResult.success) {
                            logger.error('Failed to persist group linkage on booking', {
                                bookingId: booking.id,
                                groupSessionId: session.id,
                                groupRegistrationId: registration.id,
                                error: linkResult.error.message,
                            });
                        }
                        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.BOOKING_CREATED, {
                            bookingId: booking.id,
                            userId: parentId,
                            coachId: session.coachId,
                        });
                    }
                }
                catch (error) {
                    logger.error('Failed to create linked booking for group registration', error);
                }
            }
            return (0, result_1.ok)(registration);
        }
        const response = await fetch(`/api/group-sessions/${sessionId}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ athleteId, parentId }),
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Cancel a registration
     */
    async cancelRegistration(registrationId) {
        if (USE_MOCK) {
            registrationsCache = await loadRegistrations();
            let sessionsCache = await (0, session_crud_service_1.loadSessions)();
            const registration = registrationsCache.find((r) => r.id === registrationId);
            if (!registration)
                return (0, result_1.err)((0, result_1.notFound)('Registration', registrationId));
            const wasRegistered = registration.status === 'REGISTERED';
            registration.status = 'CANCELLED';
            await saveRegistrations(registrationsCache);
            // Trigger notification to coach for cancelled registration
            const sessionForNotif = sessionsCache.find((s) => s.id === registration.sessionId);
            if (sessionForNotif && wasRegistered) {
                const athleteDisplayName = await resolveUserName(registration.athleteId, 'Athlete');
                await notification_trigger_1.notificationTriggers.groupCancelledRegistration(athleteDisplayName, sessionForNotif.title, sessionForNotif.coachId);
            }
            // Update session counts
            const session = sessionsCache.find((s) => s.id === registration.sessionId);
            if (session) {
                if (wasRegistered) {
                    session.currentParticipants -= 1;
                    if (session.status === 'FULL') {
                        session.status = 'PUBLISHED';
                    }
                    // Promote from waitlist if applicable
                    const waitlisted = registrationsCache.find((r) => r.sessionId === session.id && r.status === 'WAITLISTED');
                    if (waitlisted) {
                        waitlisted.status = 'REGISTERED';
                        waitlisted.paidAt = new Date().toISOString();
                        session.currentParticipants += 1;
                        session.waitlistCount -= 1;
                    }
                }
                else {
                    session.waitlistCount -= 1;
                }
                await (0, session_crud_service_1.saveSessions)(sessionsCache);
            }
            return (0, result_1.ok)(undefined);
        }
        await fetch(`/api/registrations/${registrationId}`, { method: 'DELETE' });
        return (0, result_1.ok)(undefined);
    },
    /**
     * Get roster for a session
     */
    async getSessionRoster(sessionId) {
        if (USE_MOCK) {
            registrationsCache = await loadRegistrations();
            return registrationsCache
                .filter((r) => r.sessionId === sessionId && r.status !== 'CANCELLED')
                .sort((a, b) => {
                // Registered first, then waitlisted
                if (a.status === 'REGISTERED' && b.status !== 'REGISTERED')
                    return -1;
                if (a.status !== 'REGISTERED' && b.status === 'REGISTERED')
                    return 1;
                return new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime();
            });
        }
        const response = await fetch(`/api/group-sessions/${sessionId}/roster`);
        return response.json();
    },
    /**
     * Mark attendance
     */
    async markAttendance(registrationId, date, attended) {
        if (USE_MOCK) {
            registrationsCache = await loadRegistrations();
            const registration = registrationsCache.find((r) => r.id === registrationId);
            if (!registration)
                return (0, result_1.err)((0, result_1.notFound)('Registration', registrationId));
            if (attended) {
                if (!registration.attendedDates.includes(date)) {
                    registration.attendedDates.push(date);
                }
                registration.status = 'ATTENDED';
            }
            else {
                registration.attendedDates = registration.attendedDates.filter((d) => d !== date);
                if (registration.attendedDates.length === 0) {
                    registration.status = 'REGISTERED';
                }
            }
            await saveRegistrations(registrationsCache);
            return (0, result_1.ok)(registration);
        }
        const response = await fetch(`/api/registrations/${registrationId}/attendance`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, attended }),
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Get parent's registrations
     */
    async getParentRegistrations(parentId) {
        if (USE_MOCK) {
            registrationsCache = await loadRegistrations();
            const sessionsCache = await (0, session_crud_service_1.loadSessions)();
            return registrationsCache
                .filter((r) => r.parentId === parentId && r.status !== 'CANCELLED')
                .map((r) => ({
                ...r,
                session: sessionsCache.find((s) => s.id === r.sessionId),
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
     * Get all active registrations for a set of athlete IDs (across all sessions).
     * Used by the session list to compute per-child registration badges.
     */
    async getRegistrationsForAthletes(athleteIds) {
        if (USE_MOCK) {
            registrationsCache = await loadRegistrations();
            return registrationsCache.filter((r) => athleteIds.has(r.athleteId) && r.status !== 'CANCELLED');
        }
        const ids = Array.from(athleteIds).join(',');
        const response = await fetch(`/api/registrations?athleteIds=${encodeURIComponent(ids)}`);
        return response.json();
    },
};
