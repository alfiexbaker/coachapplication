/**
 * Invite RSVP Service
 *
 * Facebook-style Going / Maybe / Can't Go RSVP responses on session invites.
 * Manages RSVP responses, counts, and respondent lists.
 */

import { apiClient } from '../api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { createLogger } from '@/utils/logger';
import type { InviteRsvpResponse, SessionInvite } from '@/constants/types';
import type { Result, ServiceError } from '@/types/result';
import { ok, err, serviceError } from '@/types/result';

const logger = createLogger('InviteRsvpService');

type RsvpStatus = 'going' | 'maybe' | 'cant_go';

interface RsvpCounts {
  going: number;
  maybe: number;
  cantGo: number;
}

const MOCK_INVITE_RSVPS: InviteRsvpResponse[] = [
  {
    id: 'invite_rsvp_seed_1',
    inviteId: 'inv_group_rsvp_1',
    userId: 'user1',
    userName: 'Sarah Baker',
    childId: 'athlete_1',
    childName: 'Tom Henderson',
    status: 'going',
    respondedAt: '2026-02-10T12:40:00Z',
  },
  {
    id: 'invite_rsvp_seed_2',
    inviteId: 'inv_group_rsvp_1',
    userId: 'user2',
    userName: 'James Henderson',
    childId: 'athlete_3',
    childName: 'Mia Patel',
    status: 'maybe',
    respondedAt: '2026-02-10T13:05:00Z',
  },
  {
    id: 'invite_rsvp_seed_3',
    inviteId: 'inv_group_rsvp_1',
    userId: 'user5',
    userName: 'Priya Shah',
    childId: 'athlete_4',
    childName: 'Luca Bell',
    status: 'cant_go',
    respondedAt: '2026-02-10T14:25:00Z',
  },
];

async function loadResponses(): Promise<InviteRsvpResponse[]> {
  const stored = await apiClient.get<InviteRsvpResponse[] | null>(STORAGE_KEYS.INVITE_RSVPS, null);
  return stored ?? [...MOCK_INVITE_RSVPS];
}

async function saveResponses(responses: InviteRsvpResponse[]): Promise<void> {
  await apiClient.set(STORAGE_KEYS.INVITE_RSVPS, responses);
}

/**
 * Sync rsvpCounts on the SessionInvite object in storage
 * so carousel/card UIs reading invite.rsvpCounts get fresh data.
 */
async function syncCountsToInvite(
  inviteId: string,
  allResponses: InviteRsvpResponse[],
): Promise<void> {
  try {
    const invites = await apiClient.get<SessionInvite[]>(STORAGE_KEYS.SESSION_INVITES, []);
    const idx = invites.findIndex((inv) => inv.id === inviteId);
    if (idx === -1) return;

    const inviteResponses = allResponses.filter((r) => r.inviteId === inviteId);
    invites[idx] = {
      ...invites[idx],
      rsvpCounts: {
        going: inviteResponses.filter((r) => r.status === 'going').length,
        maybe: inviteResponses.filter((r) => r.status === 'maybe').length,
        cantGo: inviteResponses.filter((r) => r.status === 'cant_go').length,
      },
    };
    await apiClient.set(STORAGE_KEYS.SESSION_INVITES, invites);
  } catch (e) {
    logger.warn('Failed to sync RSVP counts to invite', e);
  }
}

export const inviteRsvpService = {
  /**
   * Store an RSVP response for an invite.
   * If the user has already responded, updates the existing response.
   */
  async respondToInvite(
    inviteId: string,
    userId: string,
    userName: string,
    status: RsvpStatus,
    childId?: string,
    childName?: string,
    userPhotoUrl?: string,
  ): Promise<Result<InviteRsvpResponse, ServiceError>> {
    try {
      const allResponses = await loadResponses();

      // Check for existing response from this user on this invite
      const existingIndex = allResponses.findIndex(
        (r) => r.inviteId === inviteId && r.userId === userId,
      );

      const response: InviteRsvpResponse = {
        id: existingIndex >= 0 ? allResponses[existingIndex].id : `rsvp_${Date.now()}_${userId}`,
        inviteId,
        userId,
        userName,
        userPhotoUrl,
        childId,
        childName,
        status,
        respondedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        allResponses[existingIndex] = response;
      } else {
        allResponses.push(response);
      }

      await saveResponses(allResponses);

      // Sync counts back to the invite object so card/carousel UIs stay fresh
      await syncCountsToInvite(inviteId, allResponses);

      // Emit event
      emitTyped(ServiceEvents.INVITE_RSVP_RESPONDED, {
        inviteId,
        responseId: response.id,
        userId,
        userName,
        status,
        childName,
      });

      logger.info('RSVP response recorded', { inviteId, userId, status });

      return ok(response);
    } catch (error) {
      logger.error('Failed to record RSVP response', error);
      return err(serviceError('STORAGE', 'Failed to record RSVP response'));
    }
  },

  /**
   * Get all RSVP responses for an invite.
   */
  async getResponses(inviteId: string): Promise<Result<InviteRsvpResponse[], ServiceError>> {
    try {
      const allResponses = await loadResponses();
      const filtered = allResponses.filter((r) => r.inviteId === inviteId);
      return ok(filtered);
    } catch (error) {
      logger.error('Failed to get RSVP responses', error);
      return err(serviceError('STORAGE', 'Failed to get RSVP responses'));
    }
  },

  /**
   * Get RSVP counts for an invite.
   */
  async getCounts(inviteId: string): Promise<Result<RsvpCounts, ServiceError>> {
    try {
      const allResponses = await loadResponses();
      const inviteResponses = allResponses.filter((r) => r.inviteId === inviteId);

      const counts: RsvpCounts = {
        going: inviteResponses.filter((r) => r.status === 'going').length,
        maybe: inviteResponses.filter((r) => r.status === 'maybe').length,
        cantGo: inviteResponses.filter((r) => r.status === 'cant_go').length,
      };

      return ok(counts);
    } catch (error) {
      logger.error('Failed to get RSVP counts', error);
      return err(serviceError('STORAGE', 'Failed to get RSVP counts'));
    }
  },

  /**
   * Get respondents filtered by status.
   */
  async getRespondents(
    inviteId: string,
    status: RsvpStatus,
  ): Promise<Result<InviteRsvpResponse[], ServiceError>> {
    try {
      const allResponses = await loadResponses();
      const filtered = allResponses.filter((r) => r.inviteId === inviteId && r.status === status);
      return ok(filtered);
    } catch (error) {
      logger.error('Failed to get respondents', error);
      return err(serviceError('STORAGE', 'Failed to get respondents'));
    }
  },

  /**
   * Update an existing RSVP response status.
   */
  async updateResponse(
    responseId: string,
    newStatus: RsvpStatus,
  ): Promise<Result<InviteRsvpResponse, ServiceError>> {
    try {
      const allResponses = await loadResponses();
      const index = allResponses.findIndex((r) => r.id === responseId);

      if (index === -1) {
        return err(serviceError('NOT_FOUND', `RSVP response not found: ${responseId}`));
      }

      allResponses[index] = {
        ...allResponses[index],
        status: newStatus,
        respondedAt: new Date().toISOString(),
      };

      await saveResponses(allResponses);

      // Sync counts back to the invite object
      await syncCountsToInvite(allResponses[index].inviteId, allResponses);

      emitTyped(ServiceEvents.INVITE_RSVP_RESPONDED, {
        inviteId: allResponses[index].inviteId,
        responseId,
        userId: allResponses[index].userId,
        userName: allResponses[index].userName,
        status: newStatus,
        childName: allResponses[index].childName,
      });

      logger.info('RSVP response updated', { responseId, newStatus });

      return ok(allResponses[index]);
    } catch (error) {
      logger.error('Failed to update RSVP response', error);
      return err(serviceError('STORAGE', 'Failed to update RSVP response'));
    }
  },
};
