/**
 * Session Invite Service
 *
 * Handles coach-initiated session invites to parents/athletes.
 * This is a critical bilateral feature allowing coaches to be proactive.
 *
 * FLOW:
 * 1. COACH: Selects athlete(s) -> Picks time slots -> Sends invite
 *    "Coach John has invited Tom to Bradwell Boys - 1:1 Session"
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

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SessionInvite, TimeSlot, NotificationItem } from '@/constants/types';
import { notificationService } from './notification-service';

const STORAGE_KEY = 'session_invites';
const USE_MOCK = true;

// Mock data for development
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

let invitesCache: SessionInvite[] = [...MOCK_INVITES];

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

export interface BulkInviteResult {
  successful: SessionInvite[];
  failed: { input: CreateInviteInput; error: string }[];
  groupId: string;
}

export interface RespondToInviteInput {
  inviteId: string;
  response: 'ACCEPTED' | 'DECLINED' | 'COUNTERED';
  selectedSlot?: TimeSlot;
  counterProposal?: TimeSlot[];
  counterNote?: string;
}

async function loadFromStorage(): Promise<SessionInvite[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[SessionInviteService] Failed to load from storage:', error);
  }
  return [...MOCK_INVITES];
}

async function saveToStorage(invites: SessionInvite[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(invites));
  } catch (error) {
    console.error('[SessionInviteService] Failed to save to storage:', error);
  }
}

export const sessionInviteService = {
  /**
   * Get all invites for a coach (sent invites)
   */
  async getCoachInvites(coachId: string): Promise<SessionInvite[]> {
    if (USE_MOCK) {
      invitesCache = await loadFromStorage();
      return invitesCache.filter((inv) => inv.coachId === coachId);
    }

    // API call would go here
    const response = await fetch(`/api/session-invites?coachId=${coachId}`);
    return response.json();
  },

  /**
   * Get all invites for a parent (received invites)
   */
  async getParentInvites(parentId: string): Promise<SessionInvite[]> {
    if (USE_MOCK) {
      invitesCache = await loadFromStorage();
      return invitesCache.filter((inv) => inv.parentId === parentId);
    }

    const response = await fetch(`/api/session-invites?parentId=${parentId}`);
    return response.json();
  },

  /**
   * Get pending invites for a parent
   */
  async getPendingInvites(parentId: string): Promise<SessionInvite[]> {
    const invites = await this.getParentInvites(parentId);
    return invites.filter(
      (inv) => inv.status === 'PENDING' && new Date(inv.expiresAt) > new Date()
    );
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
   * Create a new session invite (coach action)
   * Sends notification to parent: "Coach {name} has invited {child} to {club}"
   */
  async createInvite(input: CreateInviteInput): Promise<SessionInvite> {
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
   * Create multiple session invites at once (bulk send)
   * Used for group invites to multiple parents/athletes
   */
  async createBulk(inputs: CreateInviteInput[]): Promise<BulkInviteResult> {
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
   * Respond to an invite (parent action)
   * - ACCEPTED: Creates a booking automatically and notifies coach
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

        // In a real app, this would create a booking via booking service
        console.log('[SessionInviteService] Booking would be created for invite:', invite.id);
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

  /**
   * Alias for getParentInvites - clearer naming for getting invites for a parent
   */
  async getInvitesForParent(parentId: string): Promise<SessionInvite[]> {
    return this.getParentInvites(parentId);
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

      return invitesCache[index];
    }

    const response = await fetch(`/api/session-invites/${inviteId}/accept-counter`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedSlot }),
    });
    return response.json();
  },
};
