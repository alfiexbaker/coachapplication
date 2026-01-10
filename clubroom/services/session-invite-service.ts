/**
 * Session Invite Service
 *
 * Handles coach-initiated session invites to parents/athletes.
 * This is a critical bilateral feature allowing coaches to be proactive.
 *
 * API Integration Notes:
 * - POST /api/session-invites - Create invite
 * - GET /api/session-invites?coachId=X - Coach's sent invites
 * - GET /api/session-invites?parentId=X - Parent's received invites
 * - PATCH /api/session-invites/:id/respond - Accept/decline/counter
 * - WebSocket event: session_invite_received
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SessionInvite, TimeSlot } from '@/constants/types';

const STORAGE_KEY = 'session_invites';
const USE_MOCK = true;

// Mock data for development
const MOCK_INVITES: SessionInvite[] = [
  {
    id: 'inv_1',
    coachId: 'coach_1',
    coachName: 'Marcus Thompson',
    coachPhotoUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
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
   */
  async createInvite(input: CreateInviteInput): Promise<SessionInvite> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays || 7));

    const newInvite: SessionInvite = {
      id: `inv_${Date.now()}`,
      coachId: input.coachId,
      coachName: input.coachName,
      coachPhotoUrl: input.coachPhotoUrl,
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
    };

    if (USE_MOCK) {
      invitesCache = await loadFromStorage();
      invitesCache.push(newInvite);
      await saveToStorage(invitesCache);
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
   * Respond to an invite (parent action)
   */
  async respondToInvite(input: RespondToInviteInput): Promise<SessionInvite> {
    if (USE_MOCK) {
      invitesCache = await loadFromStorage();
      const index = invitesCache.findIndex((inv) => inv.id === input.inviteId);

      if (index === -1) {
        throw new Error('Invite not found');
      }

      invitesCache[index] = {
        ...invitesCache[index],
        status: input.response,
        respondedAt: new Date().toISOString(),
        counterProposal: input.counterProposal,
        counterNote: input.counterNote,
      };

      await saveToStorage(invitesCache);
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
};
