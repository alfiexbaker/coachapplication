/**
 * Invite RSVP Service
 *
 * Facebook-style Going / Maybe / Can't Go RSVP responses on session invites.
 * Manages RSVP responses, counts, and respondent lists.
 */

import { api } from '@/constants/config';
import { apiFetch } from '@/services/api-client';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
} from '@/services/api-auth-context';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { createLogger } from '@/utils/logger';
import type { InviteRsvpResponse } from '@/constants/types';
import type { Result, ServiceError } from '@/types/result';
import { ok, err, serviceError } from '@/types/result';

const logger = createLogger('InviteRsvpService');

type RsvpStatus = 'going' | 'maybe' | 'cant_go';

interface RsvpCounts {
  going: number;
  maybe: number;
  cantGo: number;
}

interface ApiInviteRsvpResponse {
  inviteId: string;
  response: InviteRsvpResponse;
  responses: InviteRsvpResponse[];
  counts: RsvpCounts;
  requestId: string;
}

interface ApiInviteRsvpListResponse {
  inviteId: string;
  responses: InviteRsvpResponse[];
  counts: RsvpCounts;
  total: number;
  requestId: string;
}

const MOCK_INVITE_RSVPS: InviteRsvpResponse[] = [
  {
    id: 'invite_rsvp_seed_1',
    inviteId: 'inv_group_rsvp_1',
    userId: 'user1',
    userName: 'Sarah Baker',
    childId: 'athlete_1',
    childName: 'Alfie Barton',
    status: 'going',
    respondedAt: '2026-02-10T12:40:00Z',
  },
  {
    id: 'invite_rsvp_seed_2',
    inviteId: 'inv_group_rsvp_1',
    userId: 'user2',
    userName: 'James Barton',
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

function isMockMode(): boolean {
  return api.useMock;
}

async function resolveInviteRsvpHeaders(): Promise<Result<Record<string, string>, ServiceError>> {
  const currentUserResult = await resolveSignedInApiUser('Sign in to manage invite RSVPs.');
  if (!currentUserResult.success) {
    return currentUserResult;
  }
  return ok(
    buildApiAuthHeaders({
      actingRole: deriveApiActingRole(currentUserResult.data, 'parent'),
    }),
  );
}

function emitRsvpResponded(response: InviteRsvpResponse): void {
  emitTyped(ServiceEvents.INVITE_RSVP_RESPONDED, {
    inviteId: response.inviteId,
    responseId: response.id,
    userId: response.userId,
    userName: response.userName,
    status: response.status,
    childName: response.childName,
  });
}

async function getApiRsvpState(
  inviteId: string,
  status?: RsvpStatus,
): Promise<Result<ApiInviteRsvpListResponse, ServiceError>> {
  const headersResult = await resolveInviteRsvpHeaders();
  if (!headersResult.success) {
    return headersResult;
  }
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch<ApiInviteRsvpListResponse>(
    `/v1/invites/${encodeURIComponent(inviteId)}/rsvps${query}`,
    {
      method: 'GET',
      headers: headersResult.data,
    },
  );
}

let responsesCache: InviteRsvpResponse[] = MOCK_INVITE_RSVPS.map(cloneResponse);

function cloneResponse(response: InviteRsvpResponse): InviteRsvpResponse {
  return { ...response };
}

async function loadResponses(): Promise<InviteRsvpResponse[]> {
  return responsesCache.map(cloneResponse);
}

async function saveResponses(responses: InviteRsvpResponse[]): Promise<void> {
  responsesCache = responses.map(cloneResponse);
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
    if (!isMockMode()) {
      const headersResult = await resolveInviteRsvpHeaders();
      if (!headersResult.success) {
        return headersResult;
      }
      const result = await apiFetch<ApiInviteRsvpResponse>(
        `/v1/invites/${encodeURIComponent(inviteId)}/rsvps`,
        {
          method: 'POST',
          headers: headersResult.data,
          body: JSON.stringify({
            status,
            userName,
            ...(childId ? { childId } : {}),
            ...(childName ? { childName } : {}),
            ...(userPhotoUrl ? { userPhotoUrl } : {}),
          }),
        },
      );
      if (!result.success) {
        logger.error('Failed to record RSVP response via API', {
          inviteId,
          status,
          error: result.error,
        });
        return err(result.error);
      }
      emitRsvpResponded(result.data.response);
      logger.info('RSVP response recorded via API', { inviteId, status });
      return ok(result.data.response);
    }

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

      emitRsvpResponded(response);

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
    if (!isMockMode()) {
      const result = await getApiRsvpState(inviteId);
      return result.success ? ok(result.data.responses) : err(result.error);
    }

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
    if (!isMockMode()) {
      const result = await getApiRsvpState(inviteId);
      return result.success ? ok(result.data.counts) : err(result.error);
    }

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
    if (!isMockMode()) {
      const result = await getApiRsvpState(inviteId, status);
      return result.success ? ok(result.data.responses) : err(result.error);
    }

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
    if (!isMockMode()) {
      const headersResult = await resolveInviteRsvpHeaders();
      if (!headersResult.success) {
        return headersResult;
      }
      const result = await apiFetch<ApiInviteRsvpResponse>(
        `/v1/invite-rsvps/${encodeURIComponent(responseId)}`,
        {
          method: 'PATCH',
          headers: headersResult.data,
          body: JSON.stringify({
            status: newStatus,
          }),
        },
      );
      if (!result.success) {
        logger.error('Failed to update RSVP response via API', {
          responseId,
          newStatus,
          error: result.error,
        });
        return err(result.error);
      }
      emitRsvpResponded(result.data.response);
      logger.info('RSVP response updated via API', { responseId, newStatus });
      return ok(result.data.response);
    }

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

      emitRsvpResponded(allResponses[index]);

      logger.info('RSVP response updated', { responseId, newStatus });

      return ok(allResponses[index]);
    } catch (error) {
      logger.error('Failed to update RSVP response', error);
      return err(serviceError('STORAGE', 'Failed to update RSVP response'));
    }
  },

  __resetMockResponses(): void {
    responsesCache = MOCK_INVITE_RSVPS.map(cloneResponse);
  },

  __seedMockResponses(responses: InviteRsvpResponse[]): void {
    responsesCache = responses.map(cloneResponse);
  },
};
