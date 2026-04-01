import type { SessionInvite, TimeSlot } from '@/constants/types';
import { authService } from '@/services/auth-service';
import { apiFetch } from '@/services/api-client';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type Result, type ServiceError } from '@/types/result';

const logger = createLogger('SessionInviteAuthorityService');

type ActingRole = 'coach' | 'parent' | 'athlete' | 'club_admin';

interface ApiSessionInviteListResponse {
  invites: SessionInvite[];
  total: number;
  seedVersion?: string | null;
  requestId: string;
}

interface ApiSessionInviteDetailResponse {
  invite: SessionInvite;
  seedVersion?: string | null;
  requestId: string;
}

interface ApiInviteResponseResult {
  invite: SessionInvite;
  inviteId: string;
  response: 'ACCEPTED' | 'DECLINED';
  status: string;
  targetStatus: string;
  respondedAt: string;
  selectedSlot?: TimeSlot;
  booking?: { id: string; status: string } | null;
  bookingId?: string | null;
  registrationId?: string | null;
  registrationStatus?: string | null;
  requestId: string;
}

function toApiUserId(userId: string): string {
  return userId.startsWith('usr_') ? userId : `usr_${userId.replace(/^ath_/, '')}`;
}

function deriveActingRole(
  user: Awaited<ReturnType<typeof authService.getCurrentUser>>,
): ActingRole {
  if (user?.roles?.includes('club_admin')) {
    return 'club_admin';
  }
  if (user?.accountType === 'COACH') {
    return 'coach';
  }
  if (user?.accountType === 'PARENT') {
    return 'parent';
  }
  return 'athlete';
}

async function resolveInviteAccessHeaders(): Promise<Result<Record<string, string>, ServiceError>> {
  const currentUser = await authService.getCurrentUser();
  if (!currentUser?.id) {
    return err(serviceError('UNAUTHORIZED', 'Sign in to manage session invites.'));
  }

  const actingRole = deriveActingRole(currentUser);
  const roles = new Set(currentUser.roles ?? []);
  roles.add(actingRole);

  return ok({
    'x-auth-user-id': toApiUserId(currentUser.id),
    'x-auth-roles': Array.from(roles).join(','),
    'x-acting-role': actingRole,
  });
}

class SessionInviteAuthorityService {
  async getCoachInvites(coachId: string): Promise<Result<SessionInvite[], ServiceError>> {
    const headersResult = await resolveInviteAccessHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiSessionInviteListResponse>(
      `/v1/invites?coachUserId=${encodeURIComponent(toApiUserId(coachId))}`,
      {
        method: 'GET',
        headers: headersResult.data,
      },
    );
    if (!result.success) {
      logger.error('Failed to list coach session invites via API', {
        coachId,
        error: result.error,
      });
      return err(result.error);
    }

    return ok(result.data.invites);
  }

  async getParentInvites(parentId: string): Promise<Result<SessionInvite[], ServiceError>> {
    const headersResult = await resolveInviteAccessHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiSessionInviteListResponse>(
      `/v1/invites?parentUserId=${encodeURIComponent(toApiUserId(parentId))}`,
      {
        method: 'GET',
        headers: headersResult.data,
      },
    );
    if (!result.success) {
      logger.error('Failed to list parent session invites via API', {
        parentId,
        error: result.error,
      });
      return err(result.error);
    }

    return ok(result.data.invites);
  }

  async getInvite(inviteId: string): Promise<Result<SessionInvite, ServiceError>> {
    const headersResult = await resolveInviteAccessHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiSessionInviteDetailResponse>(`/v1/invites/${inviteId}`, {
      method: 'GET',
      headers: headersResult.data,
    });
    if (!result.success) {
      logger.error('Failed to get session invite via API', {
        inviteId,
        error: result.error,
      });
      return err(result.error);
    }

    return ok(result.data.invite);
  }

  async respondToInvite(input: {
    inviteId: string;
    response: 'ACCEPTED' | 'DECLINED';
    selectedSlot?: TimeSlot;
  }): Promise<Result<SessionInvite, ServiceError>> {
    const headersResult = await resolveInviteAccessHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiInviteResponseResult>(`/v1/invites/${input.inviteId}/respond`, {
      method: 'POST',
      headers: headersResult.data,
      body: JSON.stringify({
        inviteId: input.inviteId,
        response: input.response,
        ...(input.selectedSlot ? { selectedSlot: input.selectedSlot } : {}),
      }),
    });
    if (!result.success) {
      logger.error('Failed to respond to session invite via API', {
        inviteId: input.inviteId,
        response: input.response,
        error: result.error,
      });
      return err(result.error);
    }

    return ok(result.data.invite);
  }
}

export const sessionInviteAuthorityService = new SessionInviteAuthorityService();
