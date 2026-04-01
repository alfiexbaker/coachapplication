/**
 * Session Registration Service
 *
 * Handles athlete registration for group sessions: register, cancel,
 * waitlist management, roster queries, and attendance marking.
 *
 * API Integration Notes:
 * - POST /v1/group-sessions/:id/register - Register athlete in non-mock mode
 * - POST /api/group-sessions/:id/waitlist - Join waitlist
 * - DELETE /api/registrations/:id - Cancel registration
 * - GET /api/group-sessions/:id/roster - Get participants
 * - PATCH /api/registrations/:id/attendance - Mark attendance
 */

import { authService } from '../auth-service';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
  toApiAthleteId,
  toApiUserId,
} from '../api-auth-context';
import { apiClient, apiFetch } from '../api-client';
import { api } from '@/constants/config';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { notificationTriggers } from '../notification-trigger';
import { createLogger } from '@/utils/logger';
import { type Result, type ServiceError, ok, err, notFound, serviceError } from '@/types/result';
import { emitTyped, ServiceEvents } from '../event-bus';
import { bookingCrudService } from '../booking';
import { userService } from '../user-service';
import type { GroupSession, GroupRegistration } from '@/constants/types';
import { loadSessions, saveSessions } from './session-crud-service';

const USE_MOCK = api.useMock;
const logger = createLogger('SessionRegistrationService');

type ActingRole = 'coach' | 'parent' | 'athlete' | 'club_admin';

interface ApiGroupRegistrationResponse {
  registration: {
    id: string;
    sessionId: string;
    athleteId: string;
    parentUserId: string;
    status: GroupRegistration['status'];
    registeredAt: string;
    paidAt?: string | null;
    notes?: string | null;
  };
  booking?: {
    id: string;
  } | null;
  sessionStatus: GroupSession['status'] | string;
  requestId: string;
}

async function resolveRegistrationAccessHeaders(): Promise<Result<Record<string, string>, ServiceError>> {
  const currentUserResult = await resolveSignedInApiUser('Sign in to register for sessions.');
  if (!currentUserResult.success) {
    return currentUserResult;
  }

  const actingRole = deriveApiActingRole(currentUserResult.data) as ActingRole;
  return ok(buildApiAuthHeaders({ actingRole }));
}

// ============================================================================
// MOCK REGISTRATION DATA
// ============================================================================

const MOCK_REGISTRATIONS: GroupRegistration[] = [
  // Half-Term Football Camp registrations (gs_1) — COMPLETED
  {
    id: 'reg_1',
    sessionId: 'gs_1',
    athleteId: 'user1',
    parentId: 'user_parent_01',
    status: 'ATTENDED',
    registeredAt: '2026-01-06T09:00:00Z',
    paidAt: '2026-01-06T09:05:00Z',
    attendedDates: ['2026-02-16', '2026-02-17', '2026-02-18'],
  },
  {
    id: 'reg_2',
    sessionId: 'gs_1',
    athleteId: 'user2',
    parentId: 'user_parent_01',
    status: 'ATTENDED',
    registeredAt: '2026-01-06T09:30:00Z',
    paidAt: '2026-01-06T09:35:00Z',
    attendedDates: ['2026-02-16', '2026-02-17'],
  },
  {
    id: 'reg_3',
    sessionId: 'gs_1',
    athleteId: 'user3',
    parentId: 'user_parent_01',
    status: 'ATTENDED',
    registeredAt: '2026-01-07T10:00:00Z',
    paidAt: '2026-01-07T10:05:00Z',
    attendedDates: ['2026-02-16', '2026-02-17', '2026-02-18'],
  },
  {
    id: 'reg_4',
    sessionId: 'gs_1',
    athleteId: 'user4a',
    parentId: 'user_parent_01',
    status: 'ATTENDED',
    registeredAt: '2026-01-07T14:00:00Z',
    paidAt: '2026-01-07T14:02:00Z',
    attendedDates: ['2026-02-16', '2026-02-18'],
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
    status: 'ATTENDED',
    registeredAt: '2026-01-06T08:00:00Z',
    paidAt: '2026-01-06T08:05:00Z',
    attendedDates: ['2026-02-16', '2026-02-17', '2026-02-18'],
  },
  {
    id: 'reg_p1_gs1_emma',
    sessionId: 'gs_1',
    athleteId: 'user2',
    parentId: 'user4',
    status: 'ATTENDED',
    registeredAt: '2026-01-06T08:10:00Z',
    paidAt: '2026-01-06T08:15:00Z',
    attendedDates: ['2026-02-16', '2026-02-17'],
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
  // ── Passing & Movement Session registrations (gs_5) — COMPLETED ──
  {
    id: 'reg_gs5_1',
    sessionId: 'gs_5',
    athleteId: 'user1',
    parentId: 'user4',
    status: 'ATTENDED',
    registeredAt: '2026-02-11T09:00:00Z',
    paidAt: '2026-02-11T09:05:00Z',
    attendedDates: ['2026-02-21'],
  },
  {
    id: 'reg_gs5_2',
    sessionId: 'gs_5',
    athleteId: 'user2',
    parentId: 'user4',
    status: 'ATTENDED',
    registeredAt: '2026-02-11T09:10:00Z',
    paidAt: '2026-02-11T09:15:00Z',
    attendedDates: ['2026-02-21'],
  },
  {
    id: 'reg_gs5_3',
    sessionId: 'gs_5',
    athleteId: 'user3',
    parentId: 'user_parent_01',
    status: 'ATTENDED',
    registeredAt: '2026-02-12T10:00:00Z',
    paidAt: '2026-02-12T10:05:00Z',
    attendedDates: ['2026-02-21'],
  },
  {
    id: 'reg_gs5_4',
    sessionId: 'gs_5',
    athleteId: 'user4a',
    parentId: 'user_parent_01',
    status: 'ATTENDED',
    registeredAt: '2026-02-13T14:00:00Z',
    paidAt: '2026-02-13T14:02:00Z',
    attendedDates: ['2026-02-21'],
  },
  {
    id: 'reg_gs5_5',
    sessionId: 'gs_5',
    athleteId: 'user5',
    parentId: 'user_parent_01',
    status: 'REGISTERED',
    registeredAt: '2026-02-14T11:00:00Z',
    paidAt: '2026-02-14T11:05:00Z',
    attendedDates: [],
    notes: 'No show',
  },
  {
    id: 'reg_gs5_6',
    sessionId: 'gs_5',
    athleteId: 'user6',
    parentId: 'user_parent_01',
    status: 'ATTENDED',
    registeredAt: '2026-02-15T12:00:00Z',
    paidAt: '2026-02-15T12:02:00Z',
    attendedDates: ['2026-02-21'],
  },
  // ── 1v1 Defending Workshop registrations (gs_6) — COMPLETED ──
  {
    id: 'reg_gs6_1',
    sessionId: 'gs_6',
    athleteId: 'user1',
    parentId: 'user4',
    status: 'ATTENDED',
    registeredAt: '2026-02-13T10:00:00Z',
    paidAt: '2026-02-13T10:05:00Z',
    attendedDates: ['2026-02-22'],
  },
  {
    id: 'reg_gs6_2',
    sessionId: 'gs_6',
    athleteId: 'user3',
    parentId: 'user_parent_01',
    status: 'ATTENDED',
    registeredAt: '2026-02-14T09:00:00Z',
    paidAt: '2026-02-14T09:05:00Z',
    attendedDates: ['2026-02-22'],
  },
  {
    id: 'reg_gs6_3',
    sessionId: 'gs_6',
    athleteId: 'user4a',
    parentId: 'user_parent_01',
    status: 'ATTENDED',
    registeredAt: '2026-02-14T10:00:00Z',
    paidAt: '2026-02-14T10:05:00Z',
    attendedDates: ['2026-02-22'],
  },
  {
    id: 'reg_gs6_4',
    sessionId: 'gs_6',
    athleteId: 'user2',
    parentId: 'user4',
    status: 'ATTENDED',
    registeredAt: '2026-02-15T11:00:00Z',
    paidAt: '2026-02-15T11:05:00Z',
    attendedDates: ['2026-02-22'],
  },
  {
    id: 'reg_gs6_5',
    sessionId: 'gs_6',
    athleteId: 'user6',
    parentId: 'user_parent_01',
    status: 'ATTENDED',
    registeredAt: '2026-02-16T09:00:00Z',
    paidAt: '2026-02-16T09:02:00Z',
    attendedDates: ['2026-02-22'],
  },
  // ── Finishing Masterclass registrations (gs_7) — UPCOMING ──
  {
    id: 'reg_gs7_1',
    sessionId: 'gs_7',
    athleteId: 'user1',
    parentId: 'user4',
    status: 'REGISTERED',
    registeredAt: '2026-02-16T10:00:00Z',
    paidAt: '2026-02-16T10:05:00Z',
    attendedDates: [],
  },
  {
    id: 'reg_gs7_2',
    sessionId: 'gs_7',
    athleteId: 'user2',
    parentId: 'user4',
    status: 'REGISTERED',
    registeredAt: '2026-02-16T10:10:00Z',
    paidAt: '2026-02-16T10:15:00Z',
    attendedDates: [],
  },
  {
    id: 'reg_gs7_3',
    sessionId: 'gs_7',
    athleteId: 'user3',
    parentId: 'user_parent_01',
    status: 'REGISTERED',
    registeredAt: '2026-02-17T09:00:00Z',
    paidAt: '2026-02-17T09:05:00Z',
    attendedDates: [],
  },
  {
    id: 'reg_gs7_4',
    sessionId: 'gs_7',
    athleteId: 'user4a',
    parentId: 'user_parent_01',
    status: 'REGISTERED',
    registeredAt: '2026-02-18T14:00:00Z',
    paidAt: '2026-02-18T14:05:00Z',
    attendedDates: [],
  },
  {
    id: 'reg_gs7_5',
    sessionId: 'gs_7',
    athleteId: 'user5',
    parentId: 'user_parent_01',
    status: 'REGISTERED',
    registeredAt: '2026-02-19T11:00:00Z',
    paidAt: '2026-02-19T11:05:00Z',
    attendedDates: [],
  },
  {
    id: 'reg_gs7_6',
    sessionId: 'gs_7',
    athleteId: 'user6',
    parentId: 'user_parent_01',
    status: 'REGISTERED',
    registeredAt: '2026-02-20T10:00:00Z',
    paidAt: '2026-02-20T10:05:00Z',
    attendedDates: [],
  },
  {
    id: 'reg_gs7_7',
    sessionId: 'gs_7',
    athleteId: 'athlete_7',
    parentId: 'user_parent_01',
    status: 'WAITLISTED',
    registeredAt: '2026-02-21T09:00:00Z',
    attendedDates: [],
  },
  // ── Weekend Skills Camp registrations (gs_8) — UPCOMING ──
  {
    id: 'reg_gs8_1',
    sessionId: 'gs_8',
    athleteId: 'user1',
    parentId: 'user4',
    status: 'REGISTERED',
    registeredAt: '2026-02-19T10:00:00Z',
    paidAt: '2026-02-19T10:05:00Z',
    attendedDates: [],
  },
  {
    id: 'reg_gs8_2',
    sessionId: 'gs_8',
    athleteId: 'user3',
    parentId: 'user_parent_01',
    status: 'REGISTERED',
    registeredAt: '2026-02-20T09:00:00Z',
    paidAt: '2026-02-20T09:05:00Z',
    attendedDates: [],
  },
  {
    id: 'reg_gs8_3',
    sessionId: 'gs_8',
    athleteId: 'user4a',
    parentId: 'user_parent_01',
    status: 'REGISTERED',
    registeredAt: '2026-02-21T14:00:00Z',
    paidAt: '2026-02-21T14:02:00Z',
    attendedDates: [],
  },
  {
    id: 'reg_gs8_4',
    sessionId: 'gs_8',
    athleteId: 'user6',
    parentId: 'user_parent_01',
    status: 'REGISTERED',
    registeredAt: '2026-02-22T11:00:00Z',
    paidAt: '2026-02-22T11:05:00Z',
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

let registrationsCache: GroupRegistration[] = [...MOCK_REGISTRATIONS];
let _registrationLock: Promise<void> = Promise.resolve();

function withRegistrationLock<T>(fn: () => Promise<T>): Promise<T> {
  let release!: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  const prev = _registrationLock;
  _registrationLock = next;
  return prev.then(fn).finally(() => release());
}

async function resolveUserName(userId: string, fallback: string): Promise<string> {
  const userResult = await userService.getUserById(userId);
  if (!userResult.success) return fallback;

  const resolved = userResult.data.name?.trim();
  return resolved && resolved.length > 0 ? resolved : fallback;
}

// ============================================================================
// PERSISTENCE HELPERS
// ============================================================================

export async function loadRegistrations(): Promise<GroupRegistration[]> {
  try {
    const stored = await apiClient.get<GroupRegistration[] | null>(
      STORAGE_KEYS.GROUP_REGISTRATIONS,
      null,
    );
    if (stored) return stored;
  } catch (error) {
    logger.error('Failed to load registrations', error);
  }
  return [...MOCK_REGISTRATIONS];
}

export async function saveRegistrations(registrations: GroupRegistration[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.GROUP_REGISTRATIONS, registrations);
    registrationsCache = registrations;
  } catch (error) {
    logger.error('Failed to save registrations', error);
  }
}

// ============================================================================
// REGISTRATION SERVICE
// ============================================================================

export const sessionRegistrationService = {
  /**
   * Register an athlete for a session
   */
  async register(
    sessionId: string,
    athleteId: string,
    parentId: string,
  ): Promise<Result<GroupRegistration, ServiceError>> {
    if (USE_MOCK) {
      // Single-device, in-process mutex to serialize AsyncStorage read-check-write.
      return withRegistrationLock(async () => {
        let sessionsCache = await loadSessions();
        registrationsCache = await loadRegistrations();

        const session = sessionsCache.find((s) => s.id === sessionId);
        if (!session) return err(notFound('Session', sessionId));

        const isFull = session.currentParticipants >= session.maxParticipants;

        const registration: GroupRegistration = {
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

        if (!isFull) {
          const athleteDisplayName = await resolveUserName(athleteId, 'Athlete');
          await notificationTriggers.groupRegistered(
            athleteDisplayName,
            session.title,
            session.coachId,
          );
        }

        if (isFull) {
          session.waitlistCount += 1;
        } else {
          session.currentParticipants += 1;
          if (session.currentParticipants >= session.maxParticipants) {
            session.status = 'FULL';
          }
        }
        await saveSessions(sessionsCache);

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
            const bookingResult = await bookingCrudService.createBooking({
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
              sessionSource: 'group',
              sessionSourceEntityId: session.id,
              clubId: session.clubId,
              actingAs: session.actingAs,
              ownerCoachId: session.ownerCoachId,
              assigneeCoachId: session.assigneeCoachId,
              createdByUserId: session.createdByUserId,
              createdByRole: session.createdByRole,
              price: session.pricePerParticipant,
            });
            if (bookingResult.success) {
              const booking = bookingResult.data;
              const linkResult = await bookingCrudService.updateBooking(booking.id, {
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

              emitTyped(ServiceEvents.BOOKING_CREATED, {
                bookingId: booking.id,
                userId: parentId,
                coachId: session.coachId,
              });
            }
          } catch (error) {
            logger.error('Failed to create linked booking for group registration', error);
          }
        }

        return ok(registration);
      });
    }

    const headersResult = await resolveRegistrationAccessHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiGroupRegistrationResponse>(
      `/v1/group-sessions/${sessionId}/register`,
      {
        method: 'POST',
        headers: headersResult.data,
        body: JSON.stringify({
          athleteId: toApiAthleteId(athleteId),
          parentUserId: toApiUserId(parentId),
        }),
      },
    );
    if (!result.success) {
      logger.error('Failed to register group session via API', {
        sessionId,
        athleteId,
        parentId,
        error: result.error.message,
      });
      return err(result.error);
    }

    const authoritative = result.data.registration;
    const mirroredRegistration: GroupRegistration = {
      id: authoritative.id,
      sessionId,
      athleteId,
      parentId,
      status: authoritative.status,
      registeredAt: authoritative.registeredAt,
      ...(authoritative.paidAt ? { paidAt: authoritative.paidAt } : {}),
      attendedDates: [],
      ...(authoritative.notes ? { notes: authoritative.notes } : {}),
    };

    const registrations = await loadRegistrations();
    const existingIndex = registrations.findIndex((entry) => entry.id === mirroredRegistration.id);
    if (existingIndex >= 0) {
      registrations[existingIndex] = mirroredRegistration;
    } else {
      registrations.push(mirroredRegistration);
    }
    await saveRegistrations(registrations);

    const sessions = await loadSessions();
    const sessionIndex = sessions.findIndex((entry) => entry.id === sessionId);
    if (sessionIndex >= 0) {
      const existingSession = sessions[sessionIndex];
      const nextParticipants = registrations.filter(
        (entry) =>
          entry.sessionId === sessionId
          && (entry.status === 'REGISTERED' || entry.status === 'ATTENDED'),
      ).length;
      const nextWaitlist = registrations.filter(
        (entry) => entry.sessionId === sessionId && entry.status === 'WAITLISTED',
      ).length;

      sessions[sessionIndex] = {
        ...existingSession,
        currentParticipants: nextParticipants,
        waitlistCount: nextWaitlist,
        status: result.data.sessionStatus as GroupSession['status'],
      };
      await saveSessions(sessions);
    }

    return ok(mirroredRegistration);
  },

  /**
   * Cancel a registration
   */
  async cancelRegistration(registrationId: string): Promise<Result<void, ServiceError>> {
    if (USE_MOCK) {
      registrationsCache = await loadRegistrations();
      let sessionsCache = await loadSessions();

      const registration = registrationsCache.find((r) => r.id === registrationId);
      if (!registration) return err(notFound('Registration', registrationId));

      const wasRegistered = registration.status === 'REGISTERED';
      registration.status = 'CANCELLED';
      await saveRegistrations(registrationsCache);

      // Trigger notification to coach for cancelled registration
      const sessionForNotif = sessionsCache.find((s) => s.id === registration.sessionId);
      if (sessionForNotif && wasRegistered) {
        const athleteDisplayName = await resolveUserName(registration.athleteId, 'Athlete');
        await notificationTriggers.groupCancelledRegistration(
          athleteDisplayName,
          sessionForNotif.title,
          sessionForNotif.coachId,
        );
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
          const waitlisted = registrationsCache.find(
            (r) => r.sessionId === session.id && r.status === 'WAITLISTED',
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

      return ok(undefined);
    }

    await fetch(`/api/registrations/${registrationId}`, { method: 'DELETE' });
    return ok(undefined);
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
  async markAttendance(
    registrationId: string,
    date: string,
    attended: boolean,
  ): Promise<Result<GroupRegistration, ServiceError>> {
    if (USE_MOCK) {
      registrationsCache = await loadRegistrations();
      const registration = registrationsCache.find((r) => r.id === registrationId);
      if (!registration) return err(notFound('Registration', registrationId));

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
      return ok(registration);
    }

    const response = await fetch(`/api/registrations/${registrationId}/attendance`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, attended }),
    });
    return ok(await response.json());
  },

  /**
   * Get parent's registrations
   */
  async getParentRegistrations(
    parentId: string,
  ): Promise<(GroupRegistration & { session: GroupSession })[]> {
    if (USE_MOCK) {
      registrationsCache = await loadRegistrations();
      const sessionsCache = await loadSessions();

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
   * Get all active registrations for a set of athlete IDs (across all sessions).
   * Used by the session list to compute per-child registration badges.
   */
  async getRegistrationsForAthletes(athleteIds: ReadonlySet<string>): Promise<GroupRegistration[]> {
    if (USE_MOCK) {
      registrationsCache = await loadRegistrations();
      return registrationsCache.filter(
        (r) => athleteIds.has(r.athleteId) && r.status !== 'CANCELLED',
      );
    }

    const ids = Array.from(athleteIds).join(',');
    const response = await fetch(`/api/registrations?athleteIds=${encodeURIComponent(ids)}`);
    return response.json();
  },
};
