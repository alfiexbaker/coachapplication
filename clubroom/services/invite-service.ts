/**
 * Unified Invite Service
 *
 * Consolidates session-invite, bulk-invite, and squad-bulk-invite services
 * into a single comprehensive invite management system.
 *
 * Handles:
 * - Individual session invites to parents/athletes
 * - Bulk invites to squads or custom groups
 * - Match invites
 * - Event invites
 * - Invite history and tracking
 *
 * FLOW:
 * 1. COACH: Selects athlete(s) -> Picks time slots -> Sends invite
 * 2. PARENT: Gets notification -> Opens invites -> Sees invite card
 * 3. PARENT: Accepts (picks slot) / Declines / Counter-proposes
 * 4. COACH: Gets notification of response -> Booking created if accepted
 *
 * API Integration Notes:
 * - POST /api/session-invites - Create invite
 * - GET /api/session-invites?coachId=X - Coach's sent invites
 * - GET /api/session-invites?parentId=X - Parent's received invites
 * - PATCH /api/session-invites/:id/respond - Accept/decline/counter
 * - WebSocket event: session_invite_received
 */

import { apiClient } from './api-client';
import { api } from '@/constants/config';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type {
  SessionInvite,
  TimeSlot,
  NotificationItem,
  SquadMember,
  SquadInvite,
  SquadSessionInvite,
  SquadInvitedMember,
  BulkInviteResult,
  BulkInviteError,
  SquadInviteHistoryEntry,
  Match,
  ClubEvent,
} from '@/constants/types';
import { notificationService } from './notification-service';
import { bookingService } from './booking-service';
import { squadService } from './squad-service';
import { matchService } from './match-service';
import { eventService } from './event-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('InviteService');

// UNIFIED STORAGE - using centralized keys
const USE_MOCK = api.useMock;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CreateInviteInput {
  coachId: string;
  coachName: string;
  coachPhotoUrl?: string;
  clubName?: string;
  athleteIds: string[];
  athleteNames: string[];
  parentId: string;
  parentName: string;
  proposedSlots: TimeSlot[];
  sessionType: string;
  focus: string;
  notes?: string;
  priceUsd?: number;
  expiresInDays?: number;
  groupId?: string; // Links invites that were sent as part of a group/bulk send
}

export interface RespondToInviteInput {
  inviteId: string;
  response: 'ACCEPTED' | 'DECLINED' | 'COUNTERED';
  selectedSlot?: TimeSlot;
  counterProposal?: TimeSlot[];
  counterNote?: string;
}

export interface SquadInvitePreview {
  squadId: string;
  squadName: string;
  memberCount: number;
  members: {
    athleteId: string;
    athleteName: string;
    athleteAge?: number;
    parentId: string;
    parentName: string;
  }[];
  uniqueParentCount: number;
}

export interface InviteSquadToSessionInput {
  sessionId: string;
  sessionTitle: string;
  squadId: string;
  coachId: string;
  coachName: string;
  coachPhotoUrl?: string;
  clubName?: string;
  proposedSlots: TimeSlot[];
  sessionType: string;
  focus: string;
  notes?: string;
  priceUsd?: number;
  excludeMemberIds?: string[];
}

export interface InviteSquadToMatchInput {
  squadId: string;
  squadName: string;
  matchTitle: string;
  opponent: string;
  isHome: boolean;
  date: string;
  kickoffTime: string;
  venue: string;
  clubId: string;
  clubName: string;
  coachId: string;
  coachName: string;
  matchType?: 'FRIENDLY' | 'LEAGUE' | 'CUP' | 'TOURNAMENT';
  notes?: string;
  excludeMemberIds?: string[];
}

export interface InviteSquadsToEventInput {
  clubId: string;
  clubName: string;
  title: string;
  description: string;
  eventType: 'TOURNAMENT' | 'SOCIAL' | 'MEETING' | 'PRESENTATION' | 'FUNDRAISER' | 'TRIAL_DAY' | 'TRAINING_CAMP' | 'OTHER';
  date: string;
  startTime: string;
  endTime?: string;
  venue: string;
  isVirtual?: boolean;
  squadIds: string[];
  createdBy: string;
  createdByName: string;
  price?: number;
  maxAttendees?: number;
  excludeMemberIds?: string[];
}

export interface CreateBulkInviteInput {
  squadId: string;
  sessionId: string;
  sessionTitle: string;
  coachId: string;
  coachName: string;
  coachPhotoUrl?: string;
  clubName?: string;
  proposedSlots: TimeSlot[];
  sessionType: string;
  focus: string;
  notes?: string;
  priceUsd?: number;
  expiresInDays?: number;
}

export interface InviteSelectedMembersInput {
  memberIds: string[];
  sessionId: string;
  sessionTitle: string;
  coachId: string;
  coachName: string;
  coachPhotoUrl?: string;
  clubName?: string;
  proposedSlots: TimeSlot[];
  sessionType: string;
  focus: string;
  notes?: string;
  priceUsd?: number;
  expiresInDays?: number;
}

export interface SquadMemberWithSelection extends SquadMember {
  isSelected: boolean;
  hasPendingInvite?: boolean;
  lastInvitedAt?: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_INVITES: SessionInvite[] = [
  {
    id: 'inv_1',
    coachId: 'coach_1',
    coachName: 'Marcus Thompson',
    coachPhotoUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
    clubName: 'Bradwell Boys Academy',
    athleteIds: ['athlete_1'],
    athleteNames: ['Tom Baker'],
    parentId: 'parent_1',
    parentName: 'Sarah Baker',
    proposedSlots: [
      { date: '2026-01-15', startTime: '16:00', endTime: '17:00', location: 'Hackney Marshes' },
      { date: '2026-01-17', startTime: '16:00', endTime: '17:00', location: 'Hackney Marshes' },
    ],
    sessionType: '1:1 Coaching',
    focus: 'Finishing',
    notes: 'Great progress last session! Ready to work on weak foot finishing.',
    priceUsd: 60,
    status: 'PENDING',
    expiresAt: '2026-01-14T23:59:59Z',
    createdAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'inv_2',
    coachId: 'coach_2',
    coachName: 'Emma Williams',
    coachPhotoUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
    clubName: 'Victoria Park FC',
    athleteIds: ['athlete_2'],
    athleteNames: ['Lucy Baker'],
    parentId: 'parent_1',
    parentName: 'Sarah Baker',
    proposedSlots: [
      { date: '2026-01-20', startTime: '10:00', endTime: '11:00', location: 'Victoria Park' },
    ],
    sessionType: '1:1 Coaching',
    focus: 'Goalkeeping',
    notes: 'Trial session to assess current level.',
    priceUsd: 50,
    status: 'PENDING',
    expiresAt: '2026-01-18T23:59:59Z',
    createdAt: '2026-01-10T14:30:00Z',
  },
  {
    id: 'inv_3',
    coachId: 'coach_1',
    coachName: 'Marcus Thompson',
    clubName: 'Bradwell Boys Academy',
    athleteIds: ['athlete_3'],
    athleteNames: ['James Wilson'],
    parentId: 'parent_2',
    parentName: 'Mike Wilson',
    proposedSlots: [
      { date: '2026-01-12', startTime: '15:00', endTime: '16:00', location: 'Hackney Marshes' },
    ],
    sessionType: '1:1 Coaching',
    focus: 'Dribbling',
    priceUsd: 60,
    status: 'ACCEPTED',
    expiresAt: '2026-01-11T23:59:59Z',
    createdAt: '2026-01-08T09:00:00Z',
    respondedAt: '2026-01-08T12:00:00Z',
  },
];

// ============================================================================
// STORAGE & CACHING
// ============================================================================

let invitesCache: SessionInvite[] = [...MOCK_INVITES];
let squadInvitesCache: SquadInvite[] = [];
let squadSessionInvitesCache: SquadSessionInvite[] = [];
let inviteHistoryCache: SquadInviteHistoryEntry[] = [];

async function loadFromStorage(): Promise<SessionInvite[]> {
  try {
    const stored = await apiClient.get<SessionInvite[] | null>(STORAGE_KEYS.SESSION_INVITES, null);
    if (stored) return stored;
  } catch (error) {
    logger.error('Failed to load from storage', error);
  }
  return [...MOCK_INVITES];
}

async function saveToStorage(invites: SessionInvite[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.SESSION_INVITES, invites);
  } catch (error) {
    logger.error('Failed to save to storage', error);
  }
}

async function loadSquadInvites(): Promise<SquadInvite[]> {
  try {
    return await apiClient.get<SquadInvite[]>(STORAGE_KEYS.SQUAD_INVITES, []);
  } catch (error) {
    logger.error('Failed to load squad invites', error);
  }
  return [];
}

async function saveSquadInvites(invites: SquadInvite[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.SQUAD_INVITES, invites);
    squadInvitesCache = invites;
  } catch (error) {
    logger.error('Failed to save squad invites', error);
  }
}

async function loadSquadSessionInvites(): Promise<SquadSessionInvite[]> {
  try {
    return await apiClient.get<SquadSessionInvite[]>(STORAGE_KEYS.SQUAD_SESSION_INVITES, []);
  } catch (error) {
    logger.error('Failed to load squad session invites', error);
  }
  return [];
}

async function saveSquadSessionInvites(invites: SquadSessionInvite[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.SQUAD_SESSION_INVITES, invites);
    squadSessionInvitesCache = invites;
  } catch (error) {
    logger.error('Failed to save squad session invites', error);
  }
}

async function loadInviteHistory(): Promise<SquadInviteHistoryEntry[]> {
  try {
    return await apiClient.get<SquadInviteHistoryEntry[]>(STORAGE_KEYS.SQUAD_INVITE_HISTORY, []);
  } catch (error) {
    logger.error('Failed to load invite history', error);
  }
  return [];
}

async function saveInviteHistory(history: SquadInviteHistoryEntry[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.SQUAD_INVITE_HISTORY, history);
    inviteHistoryCache = history;
  } catch (error) {
    logger.error('Failed to save invite history', error);
  }
}

// ============================================================================
// UNIFIED INVITE SERVICE
// ============================================================================

export const inviteService = {
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
    }
  ): Promise<SessionInvite> {
    const athleteIds = Array.isArray(athletes) ? athletes : [athletes];
    const athleteNames = Array.isArray(sessionDetails.athleteNames)
      ? sessionDetails.athleteNames
      : sessionDetails.athleteNames
      ? [sessionDetails.athleteNames]
      : athleteIds.map((_, i) => `Athlete ${i + 1}`);

    const input: CreateInviteInput = {
      ...sessionDetails,
      athleteIds,
      athleteNames,
    };

    return this._createSingleInvite(input);
  },

  /**
   * Internal method to create a single invite
   */
  async _createSingleInvite(input: CreateInviteInput): Promise<SessionInvite> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays || 7));

    const newInvite: SessionInvite = {
      id: `inv_${Date.now()}`,
      coachId: input.coachId,
      coachName: input.coachName,
      coachPhotoUrl: input.coachPhotoUrl,
      clubName: input.clubName,
      athleteIds: input.athleteIds,
      athleteNames: input.athleteNames,
      parentId: input.parentId,
      parentName: input.parentName,
      proposedSlots: input.proposedSlots,
      sessionType: input.sessionType,
      focus: input.focus,
      notes: input.notes,
      priceUsd: input.priceUsd,
      status: 'PENDING',
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      groupId: input.groupId,
    };

    if (USE_MOCK) {
      invitesCache = await loadFromStorage();
      invitesCache.push(newInvite);
      await saveToStorage(invitesCache);

      // Create notification for parent
      const coachFirstName = input.coachName.split(' ')[0];
      const athleteDisplay = input.athleteNames.length === 1
        ? input.athleteNames[0]
        : `${input.athleteNames.length} athletes`;
      const clubDisplay = input.clubName ? ` to ${input.clubName}` : '';

      const notification: NotificationItem = {
        id: `notif_${Date.now()}`,
        type: 'booking',
        title: 'New Session Invite',
        body: `Coach ${coachFirstName} has invited ${athleteDisplay}${clubDisplay} - ${input.sessionType}`,
        timeLabel: 'Just now',
        read: false,
        actionLabel: 'View Invite',
      };

      await notificationService.create(notification);

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
  async acceptInvite(inviteId: string, selectedSlot: TimeSlot): Promise<SessionInvite> {
    return this.respondToInvite({
      inviteId,
      response: 'ACCEPTED',
      selectedSlot,
    });
  },

  /**
   * Decline an invite
   */
  async declineInvite(inviteId: string): Promise<SessionInvite> {
    return this.respondToInvite({
      inviteId,
      response: 'DECLINED',
    });
  },

  /**
   * Respond to an invite (parent action)
   * - ACCEPTED: Creates a booking automatically via bookingService and notifies coach
   * - DECLINED: Notifies coach
   * - COUNTERED: Sends alternative times back to coach
   */
  async respondToInvite(input: RespondToInviteInput): Promise<SessionInvite> {
    if (USE_MOCK) {
      invitesCache = await loadFromStorage();
      const index = invitesCache.findIndex((inv) => inv.id === input.inviteId);

      if (index === -1) {
        throw new Error('Invite not found');
      }

      const invite = invitesCache[index];

      invitesCache[index] = {
        ...invite,
        status: input.response,
        respondedAt: new Date().toISOString(),
        selectedSlot: input.selectedSlot,
        counterProposal: input.counterProposal,
        counterNote: input.counterNote,
      };

      await saveToStorage(invitesCache);

      // Create notification for coach based on response
      const athleteNames = invite.athleteNames.join(', ');
      const notification: NotificationItem = {
        id: `notif_${Date.now()}`,
        type: 'booking',
        title: '',
        body: '',
        timeLabel: 'Just now',
        read: false,
      };

      if (input.response === 'ACCEPTED') {
        notification.title = 'Invite Accepted!';
        notification.body = `${invite.parentName} accepted your invite for ${athleteNames}. Session confirmed for ${
          input.selectedSlot
            ? new Date(input.selectedSlot.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
              ` at ${input.selectedSlot.startTime}`
            : 'the selected time'
        }.`;

        // CRITICAL: Create the actual booking via bookingService
        if (input.selectedSlot) {
          const scheduledAt = `${input.selectedSlot.date}T${input.selectedSlot.startTime}:00`;
          const endTime = input.selectedSlot.endTime;
          const startTime = input.selectedSlot.startTime;

          // Calculate duration in minutes from start and end time
          const [startHour, startMin] = startTime.split(':').map(Number);
          const [endHour, endMin] = endTime.split(':').map(Number);
          const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

          const bookingResult = await bookingService.createBooking({
            coachId: invite.coachId,
            coachName: invite.coachName,
            athleteIds: [invite.athleteIds[0]], // Primary athlete
            athleteNames: [invite.athleteNames[0]],
            bookedById: invite.parentId,
            bookedByName: invite.parentName,
            scheduledAt,
            duration: durationMinutes > 0 ? durationMinutes : 60,
            location: input.selectedSlot.location || 'Coach preferred location',
            service: invite.sessionType,
            serviceType: invite.sessionType,
            objectives: invite.focus ? [invite.focus] : [],
            price: invite.priceUsd,
            notes: invite.notes,
            sessionInviteId: invite.id, // Link booking to invite
          });

          if (bookingResult.success && bookingResult.booking) {
            // Link booking back to invite (bidirectional)
            invitesCache[index].bookingId = bookingResult.booking.id;
            await saveToStorage(invitesCache);
            logger.info('Booking created successfully', { bookingId: bookingResult.booking.id });
          } else {
            logger.error('Failed to create booking', { error: bookingResult.error });
          }
        }
      } else if (input.response === 'DECLINED') {
        notification.title = 'Invite Declined';
        notification.body = `${invite.parentName} declined your session invite for ${athleteNames}.`;
      } else if (input.response === 'COUNTERED') {
        notification.title = 'Counter Proposal Received';
        notification.body = `${invite.parentName} proposed alternative times for ${athleteNames}. ${input.counterNote || ''}`;
      }

      await notificationService.create(notification);

      return invitesCache[index];
    }

    const response = await fetch(`/api/session-invites/${input.inviteId}/respond`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return response.json();
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
      return;
    }

    await fetch(`/api/session-invites/${inviteId}`, {
      method: 'DELETE',
    });
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
      return invitesCache.filter((inv) => inv.coachId === coachId);
    }

    const response = await fetch(`/api/session-invites?coachId=${coachId}`);
    return response.json();
  },

  /**
   * Get all invites for a parent (received invites)
   * Filters out dismissed invites
   */
  async getParentInvites(parentId: string): Promise<SessionInvite[]> {
    if (USE_MOCK) {
      invitesCache = await loadFromStorage();
      return invitesCache.filter((inv) => inv.parentId === parentId && !inv.dismissed);
    }

    const response = await fetch(`/api/session-invites?parentId=${parentId}`);
    return response.json();
  },

  /**
   * Get pending invites for a parent
   */
  async getPendingInvites(parentId?: string): Promise<SessionInvite[]> {
    if (!parentId) {
      // Return all pending invites if no parentId provided
      invitesCache = await loadFromStorage();
      return invitesCache.filter(
        (inv) => inv.status === 'PENDING' && new Date(inv.expiresAt) > new Date()
      );
    }

    const invites = await this.getParentInvites(parentId);
    return invites.filter(
      (inv) => inv.status === 'PENDING' && new Date(inv.expiresAt) > new Date()
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

    const response = await fetch(`/api/session-invites/${inviteId}`);
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Get countered invites that need coach attention
   */
  async getCounteredInvites(coachId: string): Promise<SessionInvite[]> {
    const invites = await this.getCoachInvites(coachId);
    return invites.filter((inv) => inv.status === 'COUNTERED');
  },

  /**
   * Accept a counter proposal (coach action)
   */
  async acceptCounterProposal(
    inviteId: string,
    selectedSlot: TimeSlot
  ): Promise<SessionInvite> {
    if (USE_MOCK) {
      invitesCache = await loadFromStorage();
      const index = invitesCache.findIndex((inv) => inv.id === inviteId);

      if (index === -1) {
        throw new Error('Invite not found');
      }

      invitesCache[index] = {
        ...invitesCache[index],
        status: 'ACCEPTED',
        selectedSlot,
        respondedAt: new Date().toISOString(),
      };

      await saveToStorage(invitesCache);

      // Create notification for parent
      const invite = invitesCache[index];
      const notification: NotificationItem = {
        id: `notif_${Date.now()}`,
        type: 'booking',
        title: 'Counter Proposal Accepted!',
        body: `Coach ${invite.coachName.split(' ')[0]} accepted your proposed time. Session confirmed!`,
        timeLabel: 'Just now',
        read: false,
      };

      await notificationService.create(notification);

      // CRITICAL: Create the actual booking when counter-proposal is accepted
      const scheduledAt = `${selectedSlot.date}T${selectedSlot.startTime}:00`;
      const endTime = selectedSlot.endTime;
      const startTime = selectedSlot.startTime;

      // Calculate duration in minutes from start and end time
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

      const bookingResult = await bookingService.createBooking({
        coachId: invite.coachId,
        coachName: invite.coachName,
        athleteIds: [invite.athleteIds[0]], // Primary athlete
        athleteNames: [invite.athleteNames[0]],
        bookedById: invite.parentId,
        bookedByName: invite.parentName,
        scheduledAt,
        duration: durationMinutes > 0 ? durationMinutes : 60,
        location: selectedSlot.location || 'Coach preferred location',
        service: invite.sessionType,
        serviceType: invite.sessionType,
        objectives: invite.focus ? [invite.focus] : [],
        price: invite.priceUsd,
        notes: invite.notes,
        sessionInviteId: invite.id, // Link booking to invite
      });

      if (bookingResult.success && bookingResult.booking) {
        // Link booking back to invite (bidirectional)
        invitesCache[index].bookingId = bookingResult.booking.id;
        await saveToStorage(invitesCache);
        logger.info('Booking created from counter-proposal', { bookingId: bookingResult.booking.id });
      } else {
        logger.error('Failed to create booking from counter-proposal', { error: bookingResult.error });
      }

      return invitesCache[index];
    }

    const response = await fetch(`/api/session-invites/${inviteId}/accept-counter`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedSlot }),
    });
    return response.json();
  },

  // ==========================================================================
  // BULK INVITE OPERATIONS
  // ==========================================================================

  /**
   * Create multiple session invites at once (bulk send)
   * Used for group invites to multiple parents/athletes
   */
  async createBulk(inputs: CreateInviteInput[]): Promise<{
    successful: SessionInvite[];
    failed: { input: CreateInviteInput; error: string }[];
    groupId: string;
  }> {
    const groupId = inputs[0]?.groupId || `group_${Date.now()}`;
    const successful: SessionInvite[] = [];
    const failed: { input: CreateInviteInput; error: string }[] = [];

    if (USE_MOCK) {
      invitesCache = await loadFromStorage();

      for (const input of inputs) {
        try {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays || 7));

          const newInvite: SessionInvite = {
            id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            coachId: input.coachId,
            coachName: input.coachName,
            coachPhotoUrl: input.coachPhotoUrl,
            clubName: input.clubName,
            athleteIds: input.athleteIds,
            athleteNames: input.athleteNames,
            parentId: input.parentId,
            parentName: input.parentName,
            proposedSlots: input.proposedSlots,
            sessionType: input.sessionType,
            focus: input.focus,
            notes: input.notes,
            priceUsd: input.priceUsd,
            status: 'PENDING',
            expiresAt: expiresAt.toISOString(),
            createdAt: new Date().toISOString(),
            groupId,
          };

          invitesCache.push(newInvite);
          successful.push(newInvite);
        } catch (error) {
          failed.push({
            input,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      await saveToStorage(invitesCache);
      return { successful, failed, groupId };
    }

    // API call for bulk creation
    const response = await fetch('/api/session-invites/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invites: inputs, groupId }),
    });
    return response.json();
  },

  /**
   * Get all invites that are part of a group send
   */
  async getGroupInvites(groupId: string): Promise<SessionInvite[]> {
    if (USE_MOCK) {
      invitesCache = await loadFromStorage();
      return invitesCache.filter((inv) => inv.groupId === groupId);
    }

    const response = await fetch(`/api/session-invites?groupId=${groupId}`);
    return response.json();
  },

  /**
   * Get group send statistics
   */
  async getGroupStats(groupId: string): Promise<{
    total: number;
    pending: number;
    accepted: number;
    declined: number;
    expired: number;
  }> {
    const invites = await this.getGroupInvites(groupId);
    return {
      total: invites.length,
      pending: invites.filter((i) => i.status === 'PENDING').length,
      accepted: invites.filter((i) => i.status === 'ACCEPTED').length,
      declined: invites.filter((i) => i.status === 'DECLINED').length,
      expired: invites.filter((i) => i.status === 'EXPIRED').length,
    };
  },

  /**
   * Get invite statistics for a coach
   */
  async getCoachInviteStats(coachId: string): Promise<{
    sent: number;
    pending: number;
    accepted: number;
    declined: number;
    acceptanceRate: number;
  }> {
    const invites = await this.getCoachInvites(coachId);
    const sent = invites.length;
    const pending = invites.filter((i) => i.status === 'PENDING').length;
    const accepted = invites.filter((i) => i.status === 'ACCEPTED').length;
    const declined = invites.filter((i) => i.status === 'DECLINED').length;
    const responded = accepted + declined;
    const acceptanceRate = responded > 0 ? (accepted / responded) * 100 : 0;

    return { sent, pending, accepted, declined, acceptanceRate };
  },

  // ==========================================================================
  // SQUAD INVITE OPERATIONS
  // ==========================================================================

  /**
   * Create invite for entire squad - unified method
   */
  async createSquadInvite(squadId: string, sessionDetails: InviteSquadToSessionInput): Promise<{
    squadInvite: SquadSessionInvite;
    result: BulkInviteResult;
  }> {
    return this.createBulkInvite({
      squadId,
      sessionId: sessionDetails.sessionId,
      sessionTitle: sessionDetails.sessionTitle,
      coachId: sessionDetails.coachId,
      coachName: sessionDetails.coachName,
      coachPhotoUrl: sessionDetails.coachPhotoUrl,
      clubName: sessionDetails.clubName,
      proposedSlots: sessionDetails.proposedSlots,
      sessionType: sessionDetails.sessionType,
      focus: sessionDetails.focus,
      notes: sessionDetails.notes,
      priceUsd: sessionDetails.priceUsd,
    });
  },

  /**
   * Get squad invite preview - shows how many athletes/parents will be invited
   */
  async getSquadInvitePreview(
    squadId: string,
    excludeMemberIds: string[] = []
  ): Promise<SquadInvitePreview> {
    const squad = await squadService.getSquad(squadId);
    const members = await squadService.getSquadMembers(squadId);

    const eligibleMembers = members.filter(
      (m) => !excludeMemberIds.includes(m.athleteId)
    );

    const uniqueParents = new Set(eligibleMembers.map((m) => m.parentId));

    return {
      squadId,
      squadName: squad?.name || 'Unknown Squad',
      memberCount: eligibleMembers.length,
      members: eligibleMembers.map((m) => ({
        athleteId: m.athleteId,
        athleteName: m.athleteName,
        athleteAge: m.athleteAge,
        parentId: m.parentId,
        parentName: m.parentName,
      })),
      uniqueParentCount: uniqueParents.size,
    };
  },

  /**
   * Get preview for multiple squads
   */
  async getMultipleSquadsPreview(
    squadIds: string[],
    excludeMemberIds: string[] = []
  ): Promise<{
    squads: SquadInvitePreview[];
    totalMembers: number;
    totalParents: number;
  }> {
    const previews = await Promise.all(
      squadIds.map((id) => this.getSquadInvitePreview(id, excludeMemberIds))
    );

    // Count unique parents across all squads
    const allParentIds = new Set<string>();
    previews.forEach((p) => {
      p.members.forEach((m) => allParentIds.add(m.parentId));
    });

    return {
      squads: previews,
      totalMembers: previews.reduce((sum, p) => sum + p.memberCount, 0),
      totalParents: allParentIds.size,
    };
  },

  /**
   * Invite entire squad to a session
   * Creates individual session invites for each parent
   */
  async inviteSquadToSession(
    input: InviteSquadToSessionInput
  ): Promise<BulkInviteResult> {
    const members = await squadService.getSquadMembers(input.squadId);
    const squad = await squadService.getSquad(input.squadId);

    // Filter out excluded members
    const eligibleMembers = input.excludeMemberIds
      ? members.filter((m) => !input.excludeMemberIds!.includes(m.athleteId))
      : members;

    // Group by parent
    const parentMap = new Map<string, SquadMember[]>();
    eligibleMembers.forEach((m) => {
      const existing = parentMap.get(m.parentId) || [];
      parentMap.set(m.parentId, [...existing, m]);
    });

    const groupId = `squad_session_${Date.now()}`;
    let sent = 0;
    let failed = 0;
    const errors: BulkInviteError[] = [];

    // Create invite for each parent
    for (const [parentId, athletes] of parentMap.entries()) {
      try {
        await this._createSingleInvite({
          coachId: input.coachId,
          coachName: input.coachName,
          coachPhotoUrl: input.coachPhotoUrl,
          clubName: input.clubName || squad?.name,
          athleteIds: athletes.map((a) => a.athleteId),
          athleteNames: athletes.map((a) => a.athleteName),
          parentId,
          parentName: athletes[0].parentName,
          proposedSlots: input.proposedSlots,
          sessionType: input.sessionType,
          focus: input.focus,
          notes: input.notes
            ? `[${squad?.name}] ${input.notes}`
            : `Squad Training: ${squad?.name}`,
          priceUsd: input.priceUsd,
          groupId,
        });
        sent++;
      } catch (error) {
        failed++;
        errors.push({
          memberId: athletes[0].athleteId,
          athleteName: athletes[0].athleteName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Track squad invite
    const squadInvite: SquadInvite = {
      id: groupId,
      squadId: input.squadId,
      squadName: squad?.name || 'Unknown Squad',
      targetType: 'SESSION',
      targetId: input.sessionId,
      targetTitle: input.sessionTitle,
      invitedBy: input.coachId,
      invitedByName: input.coachName,
      invitedAt: new Date().toISOString(),
      memberCount: eligibleMembers.length,
      excludedMemberIds: input.excludeMemberIds,
      responses: {
        accepted: 0,
        declined: 0,
        pending: parentMap.size,
      },
    };

    squadInvitesCache = await loadSquadInvites();
    squadInvitesCache.push(squadInvite);
    await saveSquadInvites(squadInvitesCache);

    return { sent, successful: sent, failed, skipped: 0, totalAttempted: eligibleMembers.length, errors, groupId };
  },

  /**
   * Invite squad to a match - creates match and sends invites to all members
   */
  async inviteSquadToMatch(input: InviteSquadToMatchInput): Promise<{
    match: Match;
    inviteResult: BulkInviteResult;
  }> {
    const members = await squadService.getSquadMembers(input.squadId);

    // Filter out excluded members
    const eligibleMembers = input.excludeMemberIds
      ? members.filter((m) => !input.excludeMemberIds!.includes(m.athleteId))
      : members;

    // Create match using match service
    const match = await matchService.createMatch({
      clubId: input.clubId,
      clubName: input.clubName,
      squadId: input.squadId,
      squadName: input.squadName,
      coachId: input.coachId,
      coachName: input.coachName,
      title: input.matchTitle,
      matchType: input.matchType || 'FRIENDLY',
      opponent: input.opponent,
      isHome: input.isHome,
      date: input.date,
      kickoffTime: input.kickoffTime,
      venue: input.venue,
      maxPlayers: eligibleMembers.length,
      notes: input.notes,
    });

    // Invite all squad members
    if (match) {
      await matchService.invitePlayers({
        matchId: match.id,
        players: eligibleMembers.map((m) => ({
          athleteId: m.athleteId,
          athleteName: m.athleteName,
          parentId: m.parentId,
          parentName: m.parentName,
        })),
      });
    }

    // Track squad invite
    const groupId = `squad_match_${match.id}`;
    const squadInvite: SquadInvite = {
      id: groupId,
      squadId: input.squadId,
      squadName: input.squadName,
      targetType: 'MATCH',
      targetId: match.id,
      targetTitle: `${input.isHome ? 'vs' : '@'} ${input.opponent}`,
      invitedBy: input.coachId,
      invitedByName: input.coachName,
      invitedAt: new Date().toISOString(),
      memberCount: eligibleMembers.length,
      excludedMemberIds: input.excludeMemberIds,
      responses: {
        accepted: 0,
        declined: 0,
        pending: eligibleMembers.length,
      },
    };

    squadInvitesCache = await loadSquadInvites();
    squadInvitesCache.push(squadInvite);
    await saveSquadInvites(squadInvitesCache);

    // Send notifications to all parents
    const parentMap = new Map<string, SquadMember[]>();
    eligibleMembers.forEach((m) => {
      const existing = parentMap.get(m.parentId) || [];
      parentMap.set(m.parentId, [...existing, m]);
    });

    let sent = 0;
    let failed = 0;
    const errors: BulkInviteError[] = [];

    for (const [parentId, athletes] of parentMap.entries()) {
      try {
        const athleteNames = athletes.map((a) => a.athleteName).join(', ');
        await notificationService.create({
          id: `notif_match_${Date.now()}_${parentId}`,
          type: 'booking',
          title: 'Match Availability Request',
          body: `${athleteNames} invited to match ${input.isHome ? 'vs' : '@'} ${input.opponent} on ${input.date}`,
          recipientId: parentId,
          recipientRole: 'parent',
          deepLink: `/matches/${match.id}`,
          data: {
            matchId: match.id,
            squadName: input.squadName,
          },
          timeLabel: 'Just now',
        });
        sent++;
      } catch (error) {
        failed++;
        errors.push({
          memberId: athletes[0].athleteId,
          athleteName: athletes[0].athleteName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      match,
      inviteResult: { sent, successful: sent, failed, skipped: 0, totalAttempted: eligibleMembers.length, errors, groupId },
    };
  },

  /**
   * Invite multiple squads to an event
   */
  async inviteSquadsToEvent(input: InviteSquadsToEventInput): Promise<{
    event: ClubEvent;
    inviteResult: BulkInviteResult;
  }> {
    // Get all members from all squads
    const allMembers = await squadService.getMembersForSquads(input.squadIds);

    // Filter out excluded members
    const eligibleMembers = input.excludeMemberIds
      ? allMembers.filter((m) => !input.excludeMemberIds!.includes(m.athleteId))
      : allMembers;

    // Create event using event service
    const event = await eventService.createEvent({
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
      isVirtual: input.isVirtual || false,
      targetAudience: 'SQUAD',
      maxAttendees: input.maxAttendees,
      price: input.price || 0,
      currency: 'GBP',
      rsvpRequired: true,
    });

    // Track squad invite for each squad
    const groupId = `squad_event_${event.id}`;
    for (const squadId of input.squadIds) {
      const squad = await squadService.getSquad(squadId);
      const squadMembers = eligibleMembers.filter((m) => m.squadId === squadId);

      const squadInvite: SquadInvite = {
        id: `${groupId}_${squadId}`,
        squadId,
        squadName: squad?.name || 'Unknown Squad',
        targetType: 'EVENT',
        targetId: event.id,
        targetTitle: input.title,
        invitedBy: input.createdBy,
        invitedByName: input.createdByName,
        invitedAt: new Date().toISOString(),
        memberCount: squadMembers.length,
        excludedMemberIds: input.excludeMemberIds,
        responses: {
          accepted: 0,
          declined: 0,
          pending: squadMembers.length,
        },
      };

      squadInvitesCache = await loadSquadInvites();
      squadInvitesCache.push(squadInvite);
    }
    await saveSquadInvites(squadInvitesCache);

    // Send notifications to all unique parents
    const parentMap = new Map<string, SquadMember[]>();
    eligibleMembers.forEach((m) => {
      const existing = parentMap.get(m.parentId) || [];
      parentMap.set(m.parentId, [...existing, m]);
    });

    let sent = 0;
    let failed = 0;
    const errors: BulkInviteError[] = [];

    for (const [parentId, athletes] of parentMap.entries()) {
      try {
        const athleteNames = athletes.map((a) => a.athleteName).join(', ');
        await notificationService.create({
          id: `notif_event_${Date.now()}_${parentId}`,
          type: 'booking',
          title: 'Event Invitation',
          body: `${athleteNames} invited to ${input.title} on ${input.date}`,
          recipientId: parentId,
          recipientRole: 'parent',
          deepLink: `/events/${event.id}`,
          data: {
            eventId: event.id,
            eventTitle: input.title,
          },
          timeLabel: 'Just now',
        });
        sent++;
      } catch (error) {
        failed++;
        errors.push({
          memberId: athletes[0].athleteId,
          athleteName: athletes[0].athleteName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      event,
      inviteResult: { sent, successful: sent, failed, skipped: 0, totalAttempted: eligibleMembers.length, errors, groupId },
    };
  },

  /**
   * Create bulk invite to entire squad
   * Sends session invites to all active squad members
   */
  async createBulkInvite(input: CreateBulkInviteInput): Promise<{
    squadInvite: SquadSessionInvite;
    result: BulkInviteResult;
  }> {
    const squad = await squadService.getSquad(input.squadId);
    const members = await squadService.getSquadMembers(input.squadId);

    if (!squad) {
      throw new Error('Squad not found');
    }

    if (members.length === 0) {
      throw new Error('Squad has no active members');
    }

    const groupId = `squad_bulk_${input.squadId}_${Date.now()}`;
    const invitedMembers: SquadInvitedMember[] = [];
    const errors: BulkInviteError[] = [];
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    // Group members by parent to avoid duplicate notifications
    const parentMap = new Map<string, SquadMember[]>();
    members.forEach((m) => {
      const existing = parentMap.get(m.parentId) || [];
      parentMap.set(m.parentId, [...existing, m]);
    });

    if (USE_MOCK) {
      // Create invites for each parent
      for (const [parentId, athletes] of parentMap.entries()) {
        try {
          const invite = await this._createSingleInvite({
            coachId: input.coachId,
            coachName: input.coachName,
            coachPhotoUrl: input.coachPhotoUrl,
            clubName: input.clubName || squad.name,
            athleteIds: athletes.map((a) => a.athleteId),
            athleteNames: athletes.map((a) => a.athleteName),
            parentId,
            parentName: athletes[0].parentName,
            proposedSlots: input.proposedSlots,
            sessionType: input.sessionType,
            focus: input.focus,
            notes: input.notes
              ? `[${squad.name}] ${input.notes}`
              : `Squad Training: ${squad.name}`,
            priceUsd: input.priceUsd,
            expiresInDays: input.expiresInDays ?? 7,
            groupId,
          });

          // Mark all athletes for this parent as sent
          athletes.forEach((athlete) => {
            invitedMembers.push({
              memberId: athlete.id,
              athleteId: athlete.athleteId,
              athleteName: athlete.athleteName,
              parentId: athlete.parentId,
              parentName: athlete.parentName,
              inviteId: invite.id,
              status: 'SENT',
            });
            sent++;
          });
        } catch (error) {
          // Mark all athletes for this parent as failed
          athletes.forEach((athlete) => {
            invitedMembers.push({
              memberId: athlete.id,
              athleteId: athlete.athleteId,
              athleteName: athlete.athleteName,
              parentId: athlete.parentId,
              parentName: athlete.parentName,
              status: 'FAILED',
              failureReason: error instanceof Error ? error.message : 'Unknown error',
            });
            errors.push({
              memberId: athlete.id,
              athleteName: athlete.athleteName,
              error: error instanceof Error ? error.message : 'Unknown error',
              code: 'UNKNOWN',
            });
            failed++;
          });
        }
      }
    }

    const result: BulkInviteResult = {
      sent,
      successful: sent,
      failed,
      skipped,
      totalAttempted: members.length,
      errors,
      groupId,
    };

    const squadInvite: SquadSessionInvite = {
      id: groupId,
      squadId: input.squadId,
      squadName: squad.name,
      sessionId: input.sessionId,
      sessionTitle: input.sessionTitle,
      invitedMembers,
      sentAt: new Date().toISOString(),
      sentBy: input.coachId,
      sentByName: input.coachName,
      status: failed === 0 ? 'SENT' : failed === members.length ? 'FAILED' : 'PARTIAL',
      result,
    };

    // Save to storage
    squadSessionInvitesCache = await loadSquadSessionInvites();
    squadSessionInvitesCache.push(squadInvite);
    await saveSquadSessionInvites(squadSessionInvitesCache);

    // Create history entry
    await this.addToInviteHistory({
      id: groupId,
      squadId: input.squadId,
      squadName: squad.name,
      sessionId: input.sessionId,
      sessionTitle: input.sessionTitle,
      sessionType: input.sessionType,
      focus: input.focus,
      sentAt: new Date().toISOString(),
      sentBy: input.coachId,
      sentByName: input.coachName,
      inviteCount: sent,
      acceptedCount: 0,
      declinedCount: 0,
      pendingCount: sent,
      status: 'ACTIVE',
    });

    // Send summary notification to coach
    await notificationService.create({
      id: `notif_bulk_${Date.now()}`,
      type: 'booking',
      title: 'Squad Invites Sent',
      body: `${sent} invite${sent !== 1 ? 's' : ''} sent to ${squad.name}${failed > 0 ? ` (${failed} failed)` : ''}`,
      timeLabel: 'Just now',
    });

    return { squadInvite, result };
  },

  /**
   * Invite selected members (subset of squad)
   * Allows coach to pick specific members to invite
   */
  async inviteSelectedMembers(input: InviteSelectedMembersInput): Promise<{
    result: BulkInviteResult;
    invitedMembers: SquadInvitedMember[];
  }> {
    if (input.memberIds.length === 0) {
      throw new Error('No members selected');
    }

    // Get all members from all known squads
    const clubSquads = await squadService.getSquads('club_lions');
    const selectedMembers: SquadMember[] = [];

    for (const squad of clubSquads) {
      const members = await squadService.getSquadMembers(squad.id);
      members.forEach((m) => {
        if (input.memberIds.includes(m.id)) {
          selectedMembers.push(m);
        }
      });
    }

    if (selectedMembers.length === 0) {
      throw new Error('No valid members found for the provided IDs');
    }

    const groupId = `selected_${Date.now()}`;
    const invitedMembers: SquadInvitedMember[] = [];
    const errors: BulkInviteError[] = [];
    let sent = 0;
    let failed = 0;
    const skipped = 0;

    // Group by parent
    const parentMap = new Map<string, SquadMember[]>();
    selectedMembers.forEach((m) => {
      const existing = parentMap.get(m.parentId) || [];
      parentMap.set(m.parentId, [...existing, m]);
    });

    if (USE_MOCK) {
      for (const [parentId, athletes] of parentMap.entries()) {
        try {
          const invite = await this._createSingleInvite({
            coachId: input.coachId,
            coachName: input.coachName,
            coachPhotoUrl: input.coachPhotoUrl,
            clubName: input.clubName,
            athleteIds: athletes.map((a) => a.athleteId),
            athleteNames: athletes.map((a) => a.athleteName),
            parentId,
            parentName: athletes[0].parentName,
            proposedSlots: input.proposedSlots,
            sessionType: input.sessionType,
            focus: input.focus,
            notes: input.notes,
            priceUsd: input.priceUsd,
            expiresInDays: input.expiresInDays ?? 7,
            groupId,
          });

          athletes.forEach((athlete) => {
            invitedMembers.push({
              memberId: athlete.id,
              athleteId: athlete.athleteId,
              athleteName: athlete.athleteName,
              parentId: athlete.parentId,
              parentName: athlete.parentName,
              inviteId: invite.id,
              status: 'SENT',
            });
            sent++;
          });
        } catch (error) {
          athletes.forEach((athlete) => {
            invitedMembers.push({
              memberId: athlete.id,
              athleteId: athlete.athleteId,
              athleteName: athlete.athleteName,
              parentId: athlete.parentId,
              parentName: athlete.parentName,
              status: 'FAILED',
              failureReason: error instanceof Error ? error.message : 'Unknown error',
            });
            errors.push({
              memberId: athlete.id,
              athleteName: athlete.athleteName,
              error: error instanceof Error ? error.message : 'Unknown error',
              code: 'UNKNOWN',
            });
            failed++;
          });
        }
      }
    }

    const result: BulkInviteResult = {
      sent,
      successful: sent,
      failed,
      skipped,
      totalAttempted: selectedMembers.length,
      errors,
      groupId,
    };

    return { result, invitedMembers };
  },

  // ==========================================================================
  // SQUAD QUERY METHODS
  // ==========================================================================

  /**
   * Get all squad invites for a specific target
   */
  async getSquadInvitesForTarget(
    targetType: 'SESSION' | 'MATCH' | 'EVENT',
    targetId: string
  ): Promise<SquadInvite[]> {
    squadInvitesCache = await loadSquadInvites();
    return squadInvitesCache.filter(
      (si) => si.targetType === targetType && si.targetId === targetId
    );
  },

  /**
   * Get all squad invites by coach
   */
  async getSquadInvitesByCoach(coachId: string): Promise<SquadInvite[]> {
    squadInvitesCache = await loadSquadInvites();
    return squadInvitesCache.filter((si) => si.invitedBy === coachId);
  },

  /**
   * Get all squad members with selection state
   */
  async getSquadMembers(squadId: string): Promise<SquadMember[]> {
    return squadService.getSquadMembers(squadId);
  },

  /**
   * Get squad members with additional metadata for selection UI
   */
  async getSquadMembersWithMetadata(
    squadId: string,
    sessionId?: string
  ): Promise<SquadMemberWithSelection[]> {
    const members = await squadService.getSquadMembers(squadId);

    // Get existing invites to check for pending ones
    let existingInviteMap = new Map<string, { pending: boolean; lastInvited: string }>();

    if (sessionId) {
      squadSessionInvitesCache = await loadSquadSessionInvites();
      const relatedInvites = squadSessionInvitesCache.filter(
        (inv) => inv.squadId === squadId && inv.sessionId === sessionId
      );

      relatedInvites.forEach((inv) => {
        inv.invitedMembers.forEach((m) => {
          if (m.status === 'SENT') {
            existingInviteMap.set(m.athleteId, {
              pending: true,
              lastInvited: inv.sentAt,
            });
          }
        });
      });
    }

    return members.map((member) => ({
      ...member,
      isSelected: false,
      hasPendingInvite: existingInviteMap.get(member.athleteId)?.pending ?? false,
      lastInvitedAt: existingInviteMap.get(member.athleteId)?.lastInvited,
    }));
  },

  /**
   * Get squad members grouped by parent
   */
  async getSquadMembersGroupedByParent(
    squadId: string
  ): Promise<Map<string, { parent: { id: string; name: string; email?: string }; athletes: SquadMember[] }>> {
    const members = await squadService.getSquadMembers(squadId);
    const parentMap = new Map<string, { parent: { id: string; name: string; email?: string }; athletes: SquadMember[] }>();

    members.forEach((member) => {
      const existing = parentMap.get(member.parentId);
      if (existing) {
        existing.athletes.push(member);
      } else {
        parentMap.set(member.parentId, {
          parent: {
            id: member.parentId,
            name: member.parentName,
            email: member.parentEmail,
          },
          athletes: [member],
        });
      }
    });

    return parentMap;
  },

  // ==========================================================================
  // INVITE HISTORY
  // ==========================================================================

  /**
   * Get invite history for a squad
   */
  async getSquadInviteHistory(squadId: string): Promise<SquadInviteHistoryEntry[]> {
    inviteHistoryCache = await loadInviteHistory();
    return inviteHistoryCache
      .filter((entry) => entry.squadId === squadId)
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  },

  /**
   * Get all invite history for a coach
   */
  async getCoachInviteHistory(coachId: string): Promise<SquadInviteHistoryEntry[]> {
    inviteHistoryCache = await loadInviteHistory();
    return inviteHistoryCache
      .filter((entry) => entry.sentBy === coachId)
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  },

  /**
   * Add entry to invite history
   */
  async addToInviteHistory(entry: SquadInviteHistoryEntry): Promise<void> {
    inviteHistoryCache = await loadInviteHistory();
    inviteHistoryCache.push(entry);
    await saveInviteHistory(inviteHistoryCache);
  },

  /**
   * Update invite history entry
   */
  async updateInviteHistoryEntry(
    entryId: string,
    updates: Partial<Pick<SquadInviteHistoryEntry, 'acceptedCount' | 'declinedCount' | 'pendingCount' | 'status'>>
  ): Promise<void> {
    inviteHistoryCache = await loadInviteHistory();
    const index = inviteHistoryCache.findIndex((e) => e.id === entryId);
    if (index !== -1) {
      inviteHistoryCache[index] = { ...inviteHistoryCache[index], ...updates };
      await saveInviteHistory(inviteHistoryCache);
    }
  },

  /**
   * Get squad session invite by ID
   */
  async getSquadSessionInvite(inviteId: string): Promise<SquadSessionInvite | null> {
    squadSessionInvitesCache = await loadSquadSessionInvites();
    return squadSessionInvitesCache.find((inv) => inv.id === inviteId) || null;
  },

  /**
   * Get all squad session invites for a session
   */
  async getInvitesForSession(sessionId: string): Promise<SquadSessionInvite[]> {
    squadSessionInvitesCache = await loadSquadSessionInvites();
    return squadSessionInvitesCache.filter((inv) => inv.sessionId === sessionId);
  },

  /**
   * Get squad session invites by coach
   */
  async getInvitesByCoach(coachId: string): Promise<SquadSessionInvite[]> {
    squadSessionInvitesCache = await loadSquadSessionInvites();
    return squadSessionInvitesCache
      .filter((inv) => inv.sentBy === coachId)
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  },

  // ==========================================================================
  // UTILITY FUNCTIONS
  // ==========================================================================

  /**
   * Calculate how many unique notifications will be sent
   */
  async calculateNotificationCount(memberIds: string[], squadId: string): Promise<number> {
    const members = await squadService.getSquadMembers(squadId);
    const selectedMembers = members.filter((m) => memberIds.includes(m.id));
    const uniqueParents = new Set(selectedMembers.map((m) => m.parentId));
    return uniqueParents.size;
  },

  /**
   * Get summary stats for a squad's invite activity
   */
  async getSquadInviteStats(squadId: string): Promise<{
    totalInvitesSent: number;
    totalAccepted: number;
    totalDeclined: number;
    acceptanceRate: number;
    lastInviteSentAt: string | null;
  }> {
    const history = await this.getSquadInviteHistory(squadId);

    if (history.length === 0) {
      return {
        totalInvitesSent: 0,
        totalAccepted: 0,
        totalDeclined: 0,
        acceptanceRate: 0,
        lastInviteSentAt: null,
      };
    }

    const totalInvitesSent = history.reduce((sum, h) => sum + h.inviteCount, 0);
    const totalAccepted = history.reduce((sum, h) => sum + h.acceptedCount, 0);
    const totalDeclined = history.reduce((sum, h) => sum + h.declinedCount, 0);
    const totalResponded = totalAccepted + totalDeclined;
    const acceptanceRate = totalResponded > 0 ? (totalAccepted / totalResponded) * 100 : 0;

    return {
      totalInvitesSent,
      totalAccepted,
      totalDeclined,
      acceptanceRate,
      lastInviteSentAt: history[0]?.sentAt || null,
    };
  },

  /**
   * Check if member has already been invited to a session
   */
  async hasMemberBeenInvited(memberId: string, sessionId: string): Promise<boolean> {
    squadSessionInvitesCache = await loadSquadSessionInvites();
    return squadSessionInvitesCache.some(
      (inv) =>
        inv.sessionId === sessionId &&
        inv.invitedMembers.some((m) => m.memberId === memberId && m.status === 'SENT')
    );
  },

  /**
   * Clear all cached data (for testing)
   */
  async clearCache(): Promise<void> {
    invitesCache = [...MOCK_INVITES];
    squadInvitesCache = [];
    squadSessionInvitesCache = [];
    inviteHistoryCache = [];
    await apiClient.remove(STORAGE_KEYS.SESSION_INVITES);
    await apiClient.remove(STORAGE_KEYS.SQUAD_INVITES);
    await apiClient.remove(STORAGE_KEYS.SQUAD_SESSION_INVITES);
    await apiClient.remove(STORAGE_KEYS.SQUAD_INVITE_HISTORY);
  },

  // ==========================================================================
  // BACKWARD COMPATIBILITY ALIASES
  // ==========================================================================

  /**
   * Alias for getParentInvites - clearer naming
   */
  async getInvitesForParent(parentId: string): Promise<SessionInvite[]> {
    return this.getParentInvites(parentId);
  },
};

// Export backward compatible service names
export const sessionInviteService = inviteService;
export const bulkInviteService = inviteService;
export const squadBulkInviteService = inviteService;
