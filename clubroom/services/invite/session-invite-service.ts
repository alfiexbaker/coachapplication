/**
 * Session Invite Service
 *
 * Handles individual session invites between coaches and parents.
 * Core CRUD operations for session invitations.
 *
 * FLOW:
 * 1. COACH: Selects athlete(s) -> Picks time slots -> Sends invite
 * 2. PARENT: Gets notification -> Opens invites -> Sees invite card
 * 3. PARENT: Accepts (picks slot) / Declines
 * 4. COACH: Gets notification of response -> Booking created if accepted
 *
 * API Integration Notes:
 * - GET /v1/invites?coachUserId=X - Coach's sent invites
 * - GET /v1/invites?parentUserId=X - Parent's received invites
 * - GET /v1/invites/:inviteId - Invite detail
 * - POST /v1/invites/:inviteId/respond - Accept/decline
 * - WebSocket event: session_invite_received
 */

import { apiClient } from '../api-client';
import { api } from '@/constants/config';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type {
  GroupSession,
  SessionOffering,
  SessionInvite,
  SessionInviteType,
  TimeSlot,
  WeekAcceptance,
} from '@/constants/types';
import { notificationSenderService } from '../notification/notification-sender';
import { notificationStore, type ExtendedNotificationItem } from '../notification/notification-store';
import { bookingService } from '../booking-service';
import { inviteHoldService } from '../invite-hold-service';
import { availabilityService } from '../availability-service';
import { multiWeekBookingService } from '../multi-week-booking-service';
import { sessionTemplateService } from '../session-template-service';
import { userService } from '../user-service';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';
import { accountIdsMatch } from '@/utils/account-id';
import type { Result, ServiceError } from '@/types/result';
import { ok, err, serviceError, storageError } from '@/types/result';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { sessionInviteAuthorityService } from './session-invite-authority-service';

const logger = createLogger('SessionInviteService');

const USE_MOCK = api.useMock;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CreateInviteInput {
  coachId: string;
  coachName: string;
  coachPhotoUrl?: string;
  clubName?: string;
  inviteType?: SessionInviteType; // OPEN = browsable, CLOSED = invite-only, SQUAD_ONLY = squad members
  squadIds?: string[]; // Relevant squad IDs when inviteType is SQUAD_ONLY
  athleteIds: string[];
  athleteNames: string[];
  parentId: string;
  parentName: string;
  proposedSlots: TimeSlot[];
  sessionType: string;
  sessionTemplateId?: string; // Links to SessionTemplate for auto-fill
  focus: string;
  notes?: string;
  price?: number;
  duration?: number; // Duration in minutes from session template
  expiresInDays?: number;
  groupId?: string; // Links invites that were sent as part of a group/bulk send
  existingSessionId?: string; // When inviting to an existing group session
  isRecurring?: boolean;
  recurrenceWeeks?: number;
  coverImageUrl?: string;
  locationCoordinates?: { latitude: number; longitude: number };
}

export interface RespondToInviteInput {
  inviteId: string;
  response: 'ACCEPTED' | 'DECLINED';
  selectedSlot?: TimeSlot;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_INVITES: SessionInvite[] = [
  {
    id: 'inv_1',
    coachId: 'coach1',
    clubName: 'Bradwell Boys Academy',
    athleteIds: ['athlete_1'],
    parentId: 'parent_1',
    proposedSlots: [
      { date: '2026-02-16', startTime: '16:00', endTime: '17:00', location: 'Hackney Marshes' },
      { date: '2026-02-20', startTime: '15:00', endTime: '16:00', location: 'Hackney Marshes' },
    ],
    sessionType: '1:1 Coaching',
    focus: 'Finishing',
    notes: 'Great progress last session! Ready to work on weak foot finishing.',
    price: 60,
    status: 'PENDING',
    expiresAt: '2026-02-28T23:59:59Z',
    createdAt: '2026-02-08T10:00:00Z',
  },
  {
    id: 'inv_2',
    coachId: 'coach2',
    clubName: 'Victoria Park FC',
    athleteIds: ['athlete_2'],
    parentId: 'parent_1',
    proposedSlots: [
      { date: '2026-02-17', startTime: '17:00', endTime: '18:00', location: 'Victoria Park' },
    ],
    sessionType: '1:1 Coaching',
    focus: 'Goalkeeping',
    notes: 'Trial session to assess current level.',
    price: 50,
    status: 'PENDING',
    expiresAt: '2026-02-28T23:59:59Z',
    createdAt: '2026-02-08T14:30:00Z',
  },
  {
    id: 'inv_3',
    coachId: 'coach1',
    clubName: 'Bradwell Boys Academy',
    athleteIds: ['athlete_3'],
    parentId: 'parent_2',
    proposedSlots: [
      { date: '2026-02-21', startTime: '09:00', endTime: '10:00', location: 'Hackney Marshes' },
    ],
    sessionType: '1:1 Coaching',
    focus: 'Dribbling',
    price: 60,
    status: 'ACCEPTED',
    expiresAt: '2026-02-28T23:59:59Z',
    createdAt: '2026-02-08T09:00:00Z',
    respondedAt: '2026-02-08T12:00:00Z',
  },
  {
    id: 'inv_group_rsvp_1',
    coachId: 'coach1',
    clubName: 'Lions FC Academy',
    inviteType: 'SQUAD_ONLY',
    squadIds: ['squad_u14'],
    athleteIds: ['athlete_1', 'athlete_3', 'athlete_4'],
    parentId: 'user4',
    proposedSlots: [
      {
        date: '2026-02-18',
        startTime: '18:00',
        endTime: '19:00',
        location: 'Lions Indoor Dome',
      },
    ],
    sessionType: 'Small Group Session',
    focus: 'Game Vision',
    notes: 'Invite-only development block for U14 core group.',
    price: 25,
    status: 'PENDING',
    expiresAt: '2026-03-01T23:59:59Z',
    createdAt: '2026-02-10T08:45:00Z',
    rsvpCounts: { going: 1, maybe: 1, cantGo: 1 },
  },
];

// ============================================================================
// STORAGE & CACHING
// ============================================================================

let invitesCache: SessionInvite[] = [...MOCK_INVITES];

async function resolveUserName(userId: string, fallback: string): Promise<string> {
  const userResult = await userService.getUserById(userId);
  if (!userResult.success) {
    return fallback;
  }

  return userResult.data.name?.trim() || fallback;
}

async function resolveAthleteNames(
  athleteIds: string[],
  fallbackNames: string[] = [],
): Promise<string[]> {
  const uniqueAthleteIds = Array.from(new Set(athleteIds.filter(Boolean)));
  if (uniqueAthleteIds.length === 0) {
    return fallbackNames;
  }

  const usersResult = await userService.getUsersByIds(uniqueAthleteIds);
  if (!usersResult.success) {
    return athleteIds.map((_, index) => fallbackNames[index] || `Athlete ${index + 1}`);
  }

  const usersById = new Map(usersResult.data.map((user) => [user.id, user.name?.trim() || '']));
  return athleteIds.map(
    (athleteId, index) =>
      usersById.get(athleteId) || fallbackNames[index] || `Athlete ${index + 1}`,
  );
}

async function resolveInviteTemplateContext(invite: SessionInvite): Promise<{
  sessionTemplateName?: string;
  objectives: string[];
}> {
  const fallbackObjectives =
    invite.focus?.trim().length ? [invite.focus.trim()] : [];

  if (!invite.sessionTemplateId) {
    return { objectives: fallbackObjectives };
  }

  const template = await sessionTemplateService.getTemplate(invite.sessionTemplateId);
  if (!template) {
    return { objectives: fallbackObjectives };
  }

  const templateObjectives = Array.from(
    new Set(
      (template.skillsFocus ?? [])
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 0),
    ),
  );

  return {
    sessionTemplateName: template.name,
    objectives: templateObjectives.length > 0 ? templateObjectives : fallbackObjectives,
  };
}

interface InviteLineageContext {
  sessionSource?: 'direct' | 'event' | 'group';
  sessionSourceEntityId?: string;
  clubId?: string;
  actingAs?: 'self' | 'club';
  ownerCoachId?: string;
  assigneeCoachId?: string;
  createdByUserId?: string;
  createdByRole?: SessionOffering['createdByRole'];
}

async function resolveInviteLineageContext(invite: SessionInvite): Promise<InviteLineageContext> {
  if (!invite.existingSessionId) {
    return {};
  }

  const [offerings, groupSessions] = await Promise.all([
    apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []),
    apiClient.get<GroupSession[]>(STORAGE_KEYS.GROUP_SESSIONS, []),
  ]);

  const linkedOffering = offerings.find((offering) => offering.id === invite.existingSessionId);
  if (linkedOffering) {
    return {
      sessionSource: linkedOffering.source ?? 'direct',
      sessionSourceEntityId: linkedOffering.sourceEntityId ?? linkedOffering.id,
      clubId: linkedOffering.clubId,
      actingAs: linkedOffering.actingAs,
      ownerCoachId: linkedOffering.ownerCoachId,
      assigneeCoachId: linkedOffering.assigneeCoachId,
      createdByUserId: linkedOffering.createdByUserId,
      createdByRole: linkedOffering.createdByRole,
    };
  }

  const linkedGroupSession = groupSessions.find((session) => session.id === invite.existingSessionId);
  if (linkedGroupSession) {
    return {
      sessionSource: 'group',
      sessionSourceEntityId: linkedGroupSession.id,
      clubId: linkedGroupSession.clubId,
      actingAs: linkedGroupSession.actingAs,
      ownerCoachId: linkedGroupSession.ownerCoachId,
      assigneeCoachId: linkedGroupSession.assigneeCoachId,
      createdByUserId: linkedGroupSession.createdByUserId,
      createdByRole: linkedGroupSession.createdByRole,
    };
  }

  return {};
}

export async function loadFromStorage(): Promise<SessionInvite[]> {
  try {
    const stored = await apiClient.get<SessionInvite[] | null>(STORAGE_KEYS.SESSION_INVITES, null);
    if (stored) return stored;
  } catch (error) {
    logger.error('Failed to load from storage', error);
  }
  return [...MOCK_INVITES];
}

export async function saveToStorage(invites: SessionInvite[]): Promise<Result<void, ServiceError>> {
  try {
    await apiClient.set(STORAGE_KEYS.SESSION_INVITES, invites);
    return ok(undefined);
  } catch (error) {
    logger.error('Failed to save to storage', error);
    return err(storageError(`Failed to save session invites: ${String(error)}`));
  }
}

export function getInvitesCache(): SessionInvite[] {
  return invitesCache;
}

export function setInvitesCache(invites: SessionInvite[]): void {
  invitesCache = invites;
}

export function getMockInvites(): SessionInvite[] {
  return [...MOCK_INVITES];
}

// ============================================================================
// SESSION INVITE SERVICE
// ============================================================================

export const sessionInviteService = {
  // ==========================================================================
  // CORE INVITE OPERATIONS (Individual & Multiple Athletes)
  // ==========================================================================

  /**
   * Create invite for single or multiple athletes
   * Unified method that handles both single and bulk athlete invites
   */
  async createInvite(
    athletes: string | string[],
    sessionDetails: Omit<CreateInviteInput, 'athleteIds' | 'athleteNames'> & {
      athleteNames?: string | string[];
    },
  ): Promise<Result<SessionInvite, ServiceError>> {
    const athleteIds = Array.isArray(athletes) ? athletes : [athletes];
    const athleteNames = Array.isArray(sessionDetails.athleteNames)
      ? sessionDetails.athleteNames
      : sessionDetails.athleteNames
        ? [sessionDetails.athleteNames]
        : athleteIds.map((_, i) => `Athlete ${i + 1}`);

    let input: CreateInviteInput = {
      ...sessionDetails,
      athleteIds,
      athleteNames,
    };

    // Validate proposed slots are still available before creating
    if (input.proposedSlots.length > 0) {
      const validationResults = await this._validateSlots(
        input.coachId,
        input.proposedSlots,
        input.sessionTemplateId,
      );
      if (validationResults.takenSlots.length > 0) {
        const takenDesc = validationResults.takenSlots
          .map((s) => `${s.date} ${s.startTime}`)
          .join(', ');
        logger.warn('Some proposed slots are no longer available', { takenDesc });

        if (validationResults.validSlots.length === 0) {
          return err(
            serviceError(
              'VALIDATION',
              'All proposed time slots are no longer available. Please select new times.',
            ),
          );
        }

        // Proceed with only valid slots
        input = {
          ...input,
          proposedSlots: validationResults.validSlots,
        };
      }
    }

    const invite = await this._createSingleInvite(input);
    return ok(invite);
  },

  /**
   * Validate proposed slots against current availability
   */
  async _validateSlots(
    coachId: string,
    slots: TimeSlot[],
    sessionTemplateId?: string,
  ): Promise<{ validSlots: TimeSlot[]; takenSlots: TimeSlot[] }> {
    const validSlots: TimeSlot[] = [];
    const takenSlots: TimeSlot[] = [];

    // Get date range from proposed slots
    const dates = slots.map((s) => s.date).sort();
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];

    const invitableSlots = await availabilityService.getInvitableSlots(
      coachId,
      startDate,
      endDate,
      sessionTemplateId,
    );

    const invitableKeys = new Set(invitableSlots.map((s) => `${s.date}_${s.startTime}`));

    for (const slot of slots) {
      const key = `${slot.date}_${slot.startTime}`;
      if (invitableKeys.has(key)) {
        validSlots.push(slot);
      } else {
        takenSlots.push(slot);
      }
    }

    return { validSlots, takenSlots };
  },

  /**
   * Internal method to create a single invite
   */
  async _createSingleInvite(input: CreateInviteInput): Promise<SessionInvite> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays || 7));

    const newInvite: SessionInvite = {
      id: apiClient.generateId('inv'),
      coachId: input.coachId,
      clubName: input.clubName,
      inviteType: input.inviteType || 'OPEN',
      squadIds: input.squadIds,
      athleteIds: input.athleteIds,
      parentId: input.parentId,
      proposedSlots: input.proposedSlots,
      sessionType: input.sessionType,
      sessionTemplateId: input.sessionTemplateId,
      focus: input.focus,
      notes: input.notes,
      price: input.price,
      duration: input.duration,
      status: 'PENDING',
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      groupId: input.groupId,
      existingSessionId: input.existingSessionId,
      isRecurring: input.isRecurring,
      recurrenceWeeks: input.recurrenceWeeks,
      coverImageUrl: input.coverImageUrl,
      locationCoordinates: input.locationCoordinates,
      rsvpCounts: { going: 0, maybe: 0, cantGo: 0 },
    };

    // Generate weekSlots for recurring invites
    if (input.isRecurring && input.recurrenceWeeks && input.proposedSlots.length > 0) {
      const startDate = input.proposedSlots[0].date;
      newInvite.weekSlots = this.generateWeekSlots(
        input.proposedSlots,
        input.recurrenceWeeks,
        startDate,
      );
    }

    // Populate location from availability slots if not already set on proposed slots
    for (const slot of newInvite.proposedSlots) {
      if (!slot.location) {
        try {
          const availSlots = await availabilityService.getAvailableSlots(
            input.coachId,
            slot.date,
            slot.date,
            input.duration ?? 60,
          );
          const match = availSlots.find(
            (s) => s.date === slot.date && s.startTime === slot.startTime,
          );
          if (match?.location) {
            slot.location = match.location;
          }
        } catch {
          // Non-critical: location enrichment is best-effort
        }
      }
    }

    if (USE_MOCK) {
      invitesCache = await loadFromStorage();
      invitesCache.push(newInvite);
      await saveToStorage(invitesCache);

      // Create soft-holds for proposed slots
      await inviteHoldService.createHolds(
        input.coachId,
        newInvite.id,
        input.proposedSlots.map((s) => ({
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
        newInvite.expiresAt,
      );

      // Notify parent via sender service (respects preferences + push)
      const athleteDisplay =
        input.athleteNames.length === 1
          ? input.athleteNames[0]
          : `${input.athleteNames.length} athletes`;

      await notificationSenderService.notifyParentSessionInvite({
        parentId: input.parentId,
        coachName: input.coachName,
        childName: athleteDisplay,
        inviteId: newInvite.id,
      });

      return newInvite;
    }

    const response = await fetch('/api/session-invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newInvite),
    });
    return response.json();
  },

  /**
   * Accept an invite - CRITICAL: Routes through bookingService.createBooking()
   */
  async acceptInvite(
    inviteId: string,
    selectedSlot: TimeSlot,
  ): Promise<Result<SessionInvite, ServiceError>> {
    return this.respondToInvite({
      inviteId,
      response: 'ACCEPTED',
      selectedSlot,
    });
  },

  /**
   * Decline an invite
   */
  async declineInvite(inviteId: string): Promise<Result<SessionInvite, ServiceError>> {
    return this.respondToInvite({
      inviteId,
      response: 'DECLINED',
    });
  },

  /**
   * Respond to an invite (parent action)
   * - ACCEPTED: Creates a booking automatically via bookingService and notifies coach
   * - DECLINED: Notifies coach
   */
  async respondToInvite(input: RespondToInviteInput): Promise<Result<SessionInvite, ServiceError>> {
    if (USE_MOCK) {
      invitesCache = await loadFromStorage();
      const index = invitesCache.findIndex((inv) => inv.id === input.inviteId);

      if (index === -1) {
        return err(serviceError('NOT_FOUND', `Invite not found: ${input.inviteId}`));
      }

      const invite = invitesCache[index];

      // Create notification for coach based on response
      const [coachName, parentName, athleteNames] = await Promise.all([
        resolveUserName(invite.coachId, 'Coach'),
        resolveUserName(invite.parentId, 'Parent'),
        resolveAthleteNames(invite.athleteIds),
      ]);
      const athleteDisplay = athleteNames.join(', ');

      if (input.response === 'ACCEPTED') {
        // CRITICAL FIX: Attempt booking creation FIRST, before changing invite status.
        // If booking fails, the invite stays unchanged (no orphaned ACCEPTED status).
        if (!input.selectedSlot) {
          return err(serviceError('VALIDATION', 'A selected slot is required to accept an invite'));
        }

        const scheduledAt = `${input.selectedSlot.date}T${input.selectedSlot.startTime}:00`;
        const endTime = input.selectedSlot.endTime;
        const startTime = input.selectedSlot.startTime;

        // Calculate duration in minutes from start and end time
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        const durationMinutes = endHour * 60 + endMin - (startHour * 60 + startMin);
        const [templateContext, lineageContext] = await Promise.all([
          resolveInviteTemplateContext(invite),
          resolveInviteLineageContext(invite),
        ]);

        const bookingResult = await bookingService.createBooking({
          coachId: invite.coachId,
          coachName,
          athleteIds: invite.athleteIds,
          athleteNames:
            athleteNames.length > 0 ? athleteNames : invite.athleteIds.map(() => 'Athlete'),
          bookedById: invite.parentId,
          bookedByName: parentName,
          scheduledAt,
          duration: durationMinutes > 0 ? durationMinutes : 60,
          location: input.selectedSlot.location || 'Coach preferred location',
          service: invite.sessionType,
          serviceType: invite.sessionType,
          sessionTemplateId: invite.sessionTemplateId,
          sessionTemplateName: templateContext.sessionTemplateName,
          sessionSource: lineageContext.sessionSource,
          sessionSourceEntityId: lineageContext.sessionSourceEntityId,
          clubId: lineageContext.clubId,
          actingAs: lineageContext.actingAs,
          ownerCoachId: lineageContext.ownerCoachId,
          assigneeCoachId: lineageContext.assigneeCoachId,
          createdByUserId: lineageContext.createdByUserId,
          createdByRole: lineageContext.createdByRole,
          objectives: templateContext.objectives,
          price: invite.price,
          notes: invite.notes,
          sessionInviteId: invite.id, // Link booking to invite
          skipAvailabilityValidation: true, // Coach already validated when creating the invite
        });

        if (!bookingResult.success) {
          // Booking failed — do NOT change invite status. Return error to caller.
          const reason = bookingResult.error?.message ?? 'Booking creation failed';
          logger.error('Booking creation failed during invite acceptance', {
            inviteId: invite.id,
            reason,
          });

          emitTyped(ServiceEvents.INVITE_BOOKING_FAILED, {
            inviteId: invite.id,
            coachId: invite.coachId,
            parentId: invite.parentId,
            reason,
          });

          return err(serviceError('CONFLICT', reason));
        }

        // Booking succeeded — NOW set invite to ACCEPTED with bookingId
        invitesCache[index] = {
          ...invite,
          status: 'ACCEPTED',
          respondedAt: new Date().toISOString(),
          selectedSlot: input.selectedSlot,
          bookingId: bookingResult.data.id,
        };
        await saveToStorage(invitesCache);

        logger.info('Booking created successfully from invite', {
          bookingId: bookingResult.data.id,
          inviteId: invite.id,
        });

        emitTyped(ServiceEvents.INVITE_ACCEPTED, {
          inviteId: invite.id,
          bookingId: bookingResult.data.id,
          coachId: invite.coachId,
          parentId: invite.parentId,
          athleteIds: invite.athleteIds,
          selectedSlot: {
            date: input.selectedSlot.date,
            startTime: input.selectedSlot.startTime,
            endTime: input.selectedSlot.endTime,
            location: input.selectedSlot.location,
          },
        });

        await notificationSenderService.notifyCoachInviteAccepted({
          coachId: invite.coachId,
          parentName,
          childName: athleteDisplay,
          inviteId: invite.id,
        });

        // Release all holds for this invite (accepted slot becomes a booking, others freed)
        await inviteHoldService.releaseHoldsForInvite(invite.id);

        return ok(invitesCache[index]);
      }

      // DECLINED: set status immediately after hold cleanup and coach notification.
      invitesCache[index] = {
        ...invite,
        status: input.response,
        respondedAt: new Date().toISOString(),
        selectedSlot: input.selectedSlot,
      };

      await saveToStorage(invitesCache);

      await inviteHoldService.releaseHoldsForInvite(invite.id);
      await notificationSenderService.notifyCoachInviteDeclined({
        coachId: invite.coachId,
        parentName,
        childName: athleteDisplay,
        inviteId: invite.id,
      });

      return ok(invitesCache[index]);
    }

    return sessionInviteAuthorityService.respondToInvite(input);
  },

  /**
   * Cancel an invite (coach action)
   */
  async cancelInvite(inviteId: string): Promise<void> {
    if (USE_MOCK) {
      invitesCache = await loadFromStorage();
      const index = invitesCache.findIndex((inv) => inv.id === inviteId);
      if (index !== -1) {
        invitesCache[index].status = 'EXPIRED';
        await saveToStorage(invitesCache);
      }
      // Release all holds
      await inviteHoldService.releaseHoldsForInvite(inviteId);
      return;
    }

    await fetch(`/api/session-invites/${inviteId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Send a reminder to the parent for a pending invite.
   */
  async sendInviteReminder(inviteId: string): Promise<Result<void, ServiceError>> {
    if (USE_MOCK) {
      invitesCache = await loadFromStorage();
      const invite = invitesCache.find((inv) => inv.id === inviteId);

      if (!invite) {
        return err(serviceError('NOT_FOUND', `Invite not found: ${inviteId}`));
      }

      if (invite.status !== 'PENDING') {
        return err(serviceError('VALIDATION', 'Only pending invites can be reminded.'));
      }

      if (new Date(invite.expiresAt) <= new Date()) {
        return err(serviceError('VALIDATION', 'Invite has expired.'));
      }

      const [coachName, athleteNames] = await Promise.all([
        resolveUserName(invite.coachId, 'Coach'),
        resolveAthleteNames(invite.athleteIds),
      ]);
      const athleteDisplay =
        athleteNames.length === 1 ? athleteNames[0] : `${athleteNames.length} athletes`;

      const reminderResult = await notificationStore.create({
        id: apiClient.generateId('notif'),
        type: 'reminder',
        notificationType: 'SESSION_INVITE',
        title: 'Reminder: Session Invite',
        body: `Coach ${coachName.split(' ')[0]} is waiting for a response for ${athleteDisplay}.`,
        timeLabel: 'Just now',
        read: false,
        recipientId: invite.parentId,
        recipientRole: 'parent',
        deepLink: `/session-invites/${invite.id}`,
        data: {
          inviteId: invite.id,
        },
      });

      if (!reminderResult.success) {
        return err(reminderResult.error);
      }

      logger.info('Invite reminder sent', { inviteId, parentId: invite.parentId });
      return ok(undefined);
    }

    await fetch(`/api/session-invites/${inviteId}/remind`, {
      method: 'POST',
    });
    return ok(undefined);
  },

  /**
   * Dismiss/remove an invite from parent's view (parent action)
   * This doesn't delete the invite, just hides it from the parent's list
   */
  async dismissInvite(inviteId: string): Promise<void> {
    if (USE_MOCK) {
      invitesCache = await loadFromStorage();
      const index = invitesCache.findIndex((inv) => inv.id === inviteId);
      if (index !== -1) {
        // Mark as dismissed by setting a flag
        invitesCache[index].dismissed = true;
        await saveToStorage(invitesCache);
      }
      return;
    }

    await fetch(`/api/session-invites/${inviteId}/dismiss`, {
      method: 'POST',
    });
  },

  // ==========================================================================
  // QUERY METHODS - Individual Invites
  // ==========================================================================

  /**
   * Get all invites for a coach (sent invites)
   */
  async getCoachInvites(coachId: string): Promise<SessionInvite[]> {
    if (USE_MOCK) {
      invitesCache = await loadFromStorage();
      return invitesCache.filter((inv) => accountIdsMatch(inv.coachId, coachId));
    }

    const result = await sessionInviteAuthorityService.getCoachInvites(coachId);
    if (!result.success) {
      logger.error('Failed to load coach invites via API', {
        coachId,
        error: result.error,
      });
      return [];
    }

    return result.data;
  },

  /**
   * Get all invites for a parent (received invites)
   * Filters out dismissed invites
   */
  async getParentInvites(parentId: string): Promise<SessionInvite[]> {
    if (USE_MOCK) {
      invitesCache = await loadFromStorage();
      return invitesCache.filter(
        (inv) => accountIdsMatch(inv.parentId, parentId) && !inv.dismissed,
      );
    }

    const result = await sessionInviteAuthorityService.getParentInvites(parentId);
    if (!result.success) {
      logger.error('Failed to load parent invites via API', {
        parentId,
        error: result.error,
      });
      return [];
    }

    return result.data;
  },

  /**
   * Get pending invites for a parent
   */
  async getPendingInvites(parentId?: string): Promise<SessionInvite[]> {
    if (!parentId) {
      // Return all pending invites if no parentId provided
      invitesCache = await loadFromStorage();
      return invitesCache.filter(
        (inv) => inv.status === 'PENDING' && new Date(inv.expiresAt) > new Date(),
      );
    }

    const invites = await this.getParentInvites(parentId);
    return invites.filter(
      (inv) => inv.status === 'PENDING' && new Date(inv.expiresAt) > new Date(),
    );
  },

  /**
   * Get invite history - all invites
   */
  async getInviteHistory(): Promise<SessionInvite[]> {
    if (USE_MOCK) {
      invitesCache = await loadFromStorage();
      return invitesCache;
    }

    const response = await fetch('/api/session-invites');
    return response.json();
  },

  /**
   * Get a single invite by ID
   */
  async getInvite(inviteId: string): Promise<SessionInvite | null> {
    if (USE_MOCK) {
      invitesCache = await loadFromStorage();
      return invitesCache.find((inv) => inv.id === inviteId) || null;
    }

    const result = await sessionInviteAuthorityService.getInvite(inviteId);
    if (!result.success) {
      logger.error('Failed to load invite detail via API', {
        inviteId,
        error: result.error,
      });
      return null;
    }

    return result.data;
  },

  /**
   * Alias for getParentInvites - clearer naming
   */
  async getInvitesForParent(parentId: string): Promise<SessionInvite[]> {
    return this.getParentInvites(parentId);
  },

  // ==========================================================================
  // INVITE TYPE FILTERING
  // ==========================================================================

  /**
   * Get open invites visible to any parent browsing sessions
   */
  async getOpenInvites(): Promise<SessionInvite[]> {
    if (USE_MOCK) {
      invitesCache = await loadFromStorage();
      return invitesCache.filter(
        (inv) =>
          (!inv.inviteType || inv.inviteType === 'OPEN') &&
          inv.status === 'PENDING' &&
          (!inv.expiresAt || new Date(inv.expiresAt) > new Date()) &&
          !inv.dismissed,
      );
    }
    const response = await fetch('/api/session-invites?inviteType=OPEN');
    return response.json();
  },

  /**
   * Get closed invites for a specific parent (invite-only sessions)
   */
  async getClosedInvitesForParent(parentId: string): Promise<SessionInvite[]> {
    if (USE_MOCK) {
      invitesCache = await loadFromStorage();
      return invitesCache.filter(
        (inv) =>
          inv.inviteType === 'CLOSED' && accountIdsMatch(inv.parentId, parentId) && !inv.dismissed,
      );
    }
    const response = await fetch(`/api/session-invites?inviteType=CLOSED&parentId=${parentId}`);
    return response.json();
  },

  /**
   * Get squad-only invites for a parent who belongs to the relevant squads
   */
  async getSquadOnlyInvitesForParent(
    parentId: string,
    memberSquadIds: string[],
  ): Promise<SessionInvite[]> {
    if (USE_MOCK) {
      invitesCache = await loadFromStorage();
      return invitesCache.filter((inv) => {
        if (inv.inviteType !== 'SQUAD_ONLY') return false;
        if (inv.dismissed) return false;
        // The parent must be the target OR their squad must match
        if (accountIdsMatch(inv.parentId, parentId)) return true;
        if (inv.squadIds && inv.squadIds.some((sid) => memberSquadIds.includes(sid))) return true;
        return false;
      });
    }
    const response = await fetch(
      `/api/session-invites?inviteType=SQUAD_ONLY&parentId=${parentId}&squadIds=${memberSquadIds.join(',')}`,
    );
    return response.json();
  },

  /**
   * Get all available invites for a parent, filtered by invite type rules.
   * OPEN: visible to all
   * CLOSED: only if explicitly invited
   * SQUAD_ONLY: only if parent's squad matches
   */
  async getAvailableInvitesForParent(
    parentId: string,
    memberSquadIds: string[] = [],
  ): Promise<SessionInvite[]> {
    if (USE_MOCK) {
      invitesCache = await loadFromStorage();
      return invitesCache.filter((inv) => {
        if (inv.dismissed) return false;
        const type = inv.inviteType || 'OPEN';
        if (type === 'OPEN') return true;
        if (type === 'CLOSED') return accountIdsMatch(inv.parentId, parentId);
        if (type === 'SQUAD_ONLY') {
          if (accountIdsMatch(inv.parentId, parentId)) return true;
          if (inv.squadIds && inv.squadIds.some((sid) => memberSquadIds.includes(sid))) return true;
          return false;
        }
        return false;
      });
    }
    const response = await fetch(
      `/api/session-invites/available?parentId=${parentId}&squadIds=${memberSquadIds.join(',')}`,
    );
    return response.json();
  },

  /**
   * Clear invite cache (for testing)
   */
  async clearCache(): Promise<void> {
    invitesCache = [...MOCK_INVITES];
    await apiClient.remove(STORAGE_KEYS.SESSION_INVITES);
  },

  // ==========================================================================
  // MULTI-WEEK / RECURRING INVITE METHODS
  // ==========================================================================

  /**
   * Generate weekSlots from a recurring invite's proposed slots and recurrence config.
   * Used to populate the per-week acceptance UI.
   */
  generateWeekSlots(
    proposedSlots: TimeSlot[],
    recurrenceWeeks: number,
    startDate: string,
  ): WeekAcceptance[] {
    const weekSlots: WeekAcceptance[] = [];
    const baseSlot = proposedSlots[0];

    if (!baseSlot) return weekSlots;

    const start = new Date(startDate + 'T00:00:00');

    for (let i = 0; i < recurrenceWeeks; i++) {
      const weekDate = new Date(start);
      weekDate.setDate(start.getDate() + i * 7);
      const dateStr = toDateStr(weekDate);

      weekSlots.push({
        weekDate: dateStr,
        startTime: baseSlot.startTime,
        endTime: baseSlot.endTime,
        location: baseSlot.location,
        accepted: true, // Default all to accepted
      });
    }

    return weekSlots;
  },

  /**
   * Respond to a recurring invite with per-week acceptance.
   * Creates a BookingSeries for the accepted weeks only.
   */
  async respondToRecurringInvite(
    inviteId: string,
    weekAcceptances: WeekAcceptance[],
  ): Promise<Result<SessionInvite, ServiceError>> {
    invitesCache = await loadFromStorage();
    const index = invitesCache.findIndex((inv) => inv.id === inviteId);

    if (index === -1) {
      return err(serviceError('NOT_FOUND', `Invite not found: ${inviteId}`));
    }

    const invite = invitesCache[index];
    const [coachName, parentName, athleteNames] = await Promise.all([
      resolveUserName(invite.coachId, 'Coach'),
      resolveUserName(invite.parentId, 'Parent'),
      resolveAthleteNames(invite.athleteIds),
    ]);
    const acceptedWeeks = weekAcceptances.filter((w) => w.accepted);
    const declinedWeeks = weekAcceptances.filter((w) => !w.accepted);
    const lineageContext = await resolveInviteLineageContext(invite);

    if (acceptedWeeks.length === 0) {
      // Decline the entire invite
      return this.respondToInvite({
        inviteId,
        response: 'DECLINED',
      });
    }

    // Create a multi-week booking series for accepted weeks
    const seriesResult = await multiWeekBookingService.createSeries({
      createdById: invite.parentId,
      createdByName: parentName,
      coachId: invite.coachId,
      coachName,
      athleteIds: invite.athleteIds,
      athleteNames,
      sessionType: invite.sessionType,
      focus: invite.focus,
      pricePerSession: invite.price,
      selectedWeeks: acceptedWeeks.map((w) => w.weekDate),
      startTime: acceptedWeeks[0].startTime,
      duration: invite.duration ?? 60,
      location: acceptedWeeks[0].location ?? 'Coach preferred location',
      patternLabel: `${acceptedWeeks.length} of ${weekAcceptances.length} weeks`,
      sessionInviteId: invite.id,
      sessionSource: lineageContext.sessionSource,
      sessionSourceEntityId: lineageContext.sessionSourceEntityId,
      clubId: lineageContext.clubId,
      actingAs: lineageContext.actingAs,
      ownerCoachId: lineageContext.ownerCoachId,
      assigneeCoachId: lineageContext.assigneeCoachId,
      createdByUserId: lineageContext.createdByUserId,
      createdByRole: lineageContext.createdByRole,
      notes: invite.notes,
    });

    if (!seriesResult.success) {
      logger.error('Failed to create series from recurring invite', { error: seriesResult.error });
      return err(seriesResult.error);
    }

    // Update the invite with acceptance data
    const status = declinedWeeks.length > 0 ? ('ACCEPTED' as const) : ('ACCEPTED' as const);
    invitesCache[index] = {
      ...invite,
      status,
      respondedAt: new Date().toISOString(),
      weekSlots: weekAcceptances,
      acceptedWeeks: acceptedWeeks.map((w) => w.weekDate),
      declinedWeeks: declinedWeeks.map((w) => w.weekDate),
      bookingId: seriesResult.data.bookingIds[0], // Link to first booking
    };

    await saveToStorage(invitesCache);

    // Notify coach
    const athleteDisplay = athleteNames.join(', ');
    const notification: ExtendedNotificationItem = {
      id: apiClient.generateId('notif'),
      type: 'booking',
      notificationType: 'SESSION_INVITE_RESPONSE',
      title: 'Recurring Invite Accepted!',
      body: `${parentName} accepted ${acceptedWeeks.length} of ${weekAcceptances.length} weeks for ${athleteDisplay}.`,
      timeLabel: 'Just now',
      read: false,
      recipientId: invite.coachId,
      recipientRole: 'coach',
      deepLink: `/session-invites/${invite.id}`,
      data: { inviteId: invite.id },
    };
    await notificationStore.create(notification);

    // Release holds
    await inviteHoldService.releaseHoldsForInvite(invite.id);

    logger.info('Recurring invite responded', {
      inviteId,
      acceptedCount: acceptedWeeks.length,
      declinedCount: declinedWeeks.length,
      seriesId: seriesResult.data.id,
    });

    return ok(invitesCache[index]);
  },
};
