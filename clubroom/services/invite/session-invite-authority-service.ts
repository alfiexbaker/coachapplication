import type { SessionInvite, TimeSlot } from '@/constants/types';
import { apiFetch } from '@/services/api-client';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
  toApiAthleteId,
  toApiUserId,
} from '@/services/api-auth-context';
import { authService } from '@/services/auth-service';
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

interface ApiCreateSessionInviteResponse {
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

interface CreateSessionInviteAuthorityInput {
  coachId: string;
  clubName?: string;
  inviteType?: 'OPEN' | 'CLOSED' | 'SQUAD_ONLY';
  squadIds?: string[];
  athleteIds: string[];
  parentId: string;
  proposedSlots: TimeSlot[];
  sessionType: string;
  sessionTemplateId?: string;
  focus: string;
  notes?: string;
  price?: number;
  duration?: number;
  expiresInDays?: number;
  groupId?: string;
  existingSessionId?: string;
  isRecurring?: boolean;
  recurrenceWeeks?: number;
  coverImageUrl?: string;
  locationCoordinates?: { latitude: number; longitude: number };
}

async function resolveInviteAccessHeaders(): Promise<Result<Record<string, string>, ServiceError>> {
  const currentUserResult = await resolveSignedInApiUser('Sign in to manage session invites.');
  if (!currentUserResult.success) {
    return currentUserResult;
  }

  const actingRole = deriveApiActingRole(currentUserResult.data) as ActingRole;
  return ok(buildApiAuthHeaders({ actingRole }));
}

function buildInviteListPath(params: {
  coachUserId?: string;
  parentUserId?: string;
  groupId?: string;
  inviteType?: 'OPEN' | 'CLOSED' | 'SQUAD_ONLY';
  squadIds?: string[];
}): string {
  const search = new URLSearchParams();
  if (params.coachUserId) {
    search.set('coachUserId', params.coachUserId);
  }
  if (params.parentUserId) {
    search.set('parentUserId', params.parentUserId);
  }
  if (params.groupId) {
    search.set('groupId', params.groupId);
  }
  if (params.inviteType) {
    search.set('inviteType', params.inviteType);
  }
  if (params.squadIds && params.squadIds.length > 0) {
    search.set('squadIds', params.squadIds.join(','));
  }

  const query = search.toString();
  return query.length > 0 ? `/v1/invites?${query}` : '/v1/invites';
}

class SessionInviteAuthorityService {
  private async listInvites(params: {
    coachUserId?: string;
    parentUserId?: string;
    groupId?: string;
    inviteType?: 'OPEN' | 'CLOSED' | 'SQUAD_ONLY';
    squadIds?: string[];
  }): Promise<Result<SessionInvite[], ServiceError>> {
    const headersResult = await resolveInviteAccessHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiSessionInviteListResponse>(buildInviteListPath(params), {
      method: 'GET',
      headers: headersResult.data,
    });
    if (!result.success) {
      logger.error('Failed to list session invites via API', {
        params,
        error: result.error,
      });
      return err(result.error);
    }

    return ok(result.data.invites);
  }

  async createInvite(
    input: CreateSessionInviteAuthorityInput,
  ): Promise<Result<SessionInvite, ServiceError>> {
    const headersResult = await resolveInviteAccessHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiCreateSessionInviteResponse>('/v1/invites', {
      method: 'POST',
      headers: headersResult.data,
      body: JSON.stringify({
        coachUserId: toApiUserId(input.coachId),
        ...(input.clubName ? { clubName: input.clubName } : {}),
        ...(input.inviteType ? { inviteType: input.inviteType } : {}),
        ...(input.squadIds && input.squadIds.length > 0 ? { squadIds: input.squadIds } : {}),
        athleteIds: input.athleteIds.map((athleteId) => toApiAthleteId(athleteId)),
        parentUserId: toApiUserId(input.parentId),
        proposedSlots: input.proposedSlots,
        sessionType: input.sessionType,
        ...(input.sessionTemplateId ? { sessionTemplateId: input.sessionTemplateId } : {}),
        focus: input.focus,
        ...(input.notes ? { notes: input.notes } : {}),
        ...(typeof input.price === 'number'
          ? { priceMinor: Math.max(0, Math.round(input.price * 100)) }
          : {}),
        ...(typeof input.duration === 'number' ? { durationMinutes: input.duration } : {}),
        ...(typeof input.expiresInDays === 'number' ? { expiresInDays: input.expiresInDays } : {}),
        ...(input.groupId ? { groupId: input.groupId } : {}),
        ...(input.existingSessionId ? { existingSessionId: input.existingSessionId } : {}),
        ...(input.isRecurring ? { isRecurring: true } : {}),
        ...(typeof input.recurrenceWeeks === 'number'
          ? { recurrenceWeeks: input.recurrenceWeeks }
          : {}),
        ...(input.coverImageUrl ? { coverImageUrl: input.coverImageUrl } : {}),
        ...(input.locationCoordinates ? { locationCoordinates: input.locationCoordinates } : {}),
      }),
    });
    if (!result.success) {
      logger.error('Failed to create session invite via API', {
        coachId: input.coachId,
        parentId: input.parentId,
        athleteIds: input.athleteIds,
        error: result.error,
      });
      return err(result.error);
    }

    return ok(result.data.invite);
  }

  async getCoachInvites(coachId: string): Promise<Result<SessionInvite[], ServiceError>> {
    return this.listInvites({ coachUserId: toApiUserId(coachId) });
  }

  async getParentInvites(parentId: string): Promise<Result<SessionInvite[], ServiceError>> {
    return this.listInvites({ parentUserId: toApiUserId(parentId) });
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

  async cancelInvite(inviteId: string): Promise<Result<void, ServiceError>> {
    const headersResult = await resolveInviteAccessHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<void>(`/v1/invites/${inviteId}`, {
      method: 'DELETE',
      headers: headersResult.data,
    });
    if (!result.success) {
      logger.error('Failed to cancel session invite via API', {
        inviteId,
        error: result.error,
      });
      return err(result.error);
    }

    return ok(undefined);
  }

  async sendInviteReminder(inviteId: string): Promise<Result<void, ServiceError>> {
    const headersResult = await resolveInviteAccessHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<void>(`/v1/invites/${inviteId}/remind`, {
      method: 'POST',
      headers: headersResult.data,
    });
    if (!result.success) {
      logger.error('Failed to remind session invite via API', {
        inviteId,
        error: result.error,
      });
      return err(result.error);
    }

    return ok(undefined);
  }

  async dismissInvite(inviteId: string): Promise<Result<void, ServiceError>> {
    const headersResult = await resolveInviteAccessHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<void>(`/v1/invites/${inviteId}/dismiss`, {
      method: 'POST',
      headers: headersResult.data,
    });
    if (!result.success) {
      logger.error('Failed to dismiss session invite via API', {
        inviteId,
        error: result.error,
      });
      return err(result.error);
    }

    return ok(undefined);
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

  async getInviteHistory(): Promise<Result<SessionInvite[], ServiceError>> {
    const currentUser = await authService.getCurrentUser();
    if (!currentUser?.id) {
      return err(serviceError('UNAUTHORIZED', 'Sign in to view session invites.'));
    }

    if (currentUser.accountType === 'COACH' || currentUser.roles?.includes('club_admin')) {
      return this.getCoachInvites(currentUser.id);
    }

    return this.getParentInvites(currentUser.id);
  }

  async getOpenInvites(): Promise<Result<SessionInvite[], ServiceError>> {
    return this.listInvites({ inviteType: 'OPEN' });
  }

  async getClosedInvitesForParent(parentId: string): Promise<Result<SessionInvite[], ServiceError>> {
    return this.listInvites({
      parentUserId: toApiUserId(parentId),
      inviteType: 'CLOSED',
    });
  }

  async getSquadOnlyInvitesForParent(
    parentId: string,
    squadIds: string[],
  ): Promise<Result<SessionInvite[], ServiceError>> {
    return this.listInvites({
      parentUserId: toApiUserId(parentId),
      inviteType: 'SQUAD_ONLY',
      squadIds,
    });
  }

  async getAvailableInvitesForParent(
    parentId: string,
    squadIds: string[] = [],
  ): Promise<Result<SessionInvite[], ServiceError>> {
    const [openInvites, closedInvites, squadInvites] = await Promise.all([
      this.getOpenInvites(),
      this.getClosedInvitesForParent(parentId),
      this.getSquadOnlyInvitesForParent(parentId, squadIds),
    ]);

    const firstError = [openInvites, closedInvites, squadInvites].find((result) => !result.success);
    if (firstError && !firstError.success) {
      return firstError;
    }

    const deduped = new Map<string, SessionInvite>();
    for (const invite of [
      ...(openInvites.success ? openInvites.data : []),
      ...(closedInvites.success ? closedInvites.data : []),
      ...(squadInvites.success ? squadInvites.data : []),
    ]) {
      deduped.set(invite.id, invite);
    }

    return ok(Array.from(deduped.values()));
  }

  async getGroupInvites(groupId: string): Promise<Result<SessionInvite[], ServiceError>> {
    return this.listInvites({ groupId });
  }
}

export const sessionInviteAuthorityService = new SessionInviteAuthorityService();
