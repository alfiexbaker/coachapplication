import type { GroupRegistration, GroupSession } from '@/constants/types';
import { apiFetch } from '@/services/api-client';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
  toApiAthleteId,
  toApiUserId,
} from '@/services/api-auth-context';
import { createLogger } from '@/utils/logger';
import { err, ok, type Result, type ServiceError } from '@/types/result';

const logger = createLogger('GroupSessionAuthorityService');

type ActingRole = 'coach' | 'parent' | 'athlete' | 'club_admin';

interface ApiGroupSessionListResponse {
  groupSessions: GroupSession[];
  total: number;
  seedVersion?: string | null;
  requestId: string;
}

interface ApiGroupSessionDetailResponse {
  groupSession: GroupSession;
  seedVersion?: string | null;
  requestId: string;
}

interface ApiGroupSessionMutationResponse {
  groupSession: GroupSession;
  seedVersion?: string | null;
  requestId: string;
}

interface ApiGroupSessionRosterResponse {
  session: GroupSession;
  registrations: GroupRegistration[];
  total: number;
  seedVersion?: string | null;
  requestId: string;
}

interface ApiGroupSessionRegisterResponse {
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
  booking?: { id: string; status: string } | null;
  sessionStatus: GroupSession['status'] | string;
  requestId: string;
}

interface ApiGroupSessionRegistrationResponse {
  registration: GroupRegistration;
  seedVersion?: string | null;
  requestId: string;
}

interface ApiGroupSessionRegistrationListResponse {
  registrations: GroupRegistration[];
  total: number;
  seedVersion?: string | null;
  requestId: string;
}

interface ListSessionsParams {
  status?: string;
  coachUserId?: string;
  clubId?: string;
  squadId?: string;
  athleteId?: string;
  sessionType?: string;
  skillLevel?: string;
  discover?: boolean;
}

interface CreateSessionInput {
  coachId: string;
  clubId?: string;
  squadId?: string;
  title: string;
  description: string;
  sessionType: GroupSession['sessionType'];
  schedule: GroupSession['schedule'];
  maxParticipants: number;
  pricePerParticipant: number;
  currency?: string;
  ageMin?: number;
  ageMax?: number;
  skillLevel?: GroupSession['skillLevel'];
  location: string;
  isVirtual?: boolean;
  focus?: string[];
  equipment?: string[];
  waitlistEnabled?: boolean;
  inviteType?: GroupSession['inviteType'];
  registrationDeadline?: string;
}

async function resolveAuthorityHeaders(
  failureMessage: string,
): Promise<Result<Record<string, string>, ServiceError>> {
  const currentUserResult = await resolveSignedInApiUser(failureMessage);
  if (!currentUserResult.success) {
    return currentUserResult;
  }

  const actingRole = deriveApiActingRole(currentUserResult.data) as ActingRole;
  return ok(buildApiAuthHeaders({ actingRole }));
}

function buildListPath(params: ListSessionsParams): string {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  if (params.coachUserId) search.set('coachUserId', toApiUserId(params.coachUserId));
  if (params.clubId) search.set('clubId', params.clubId);
  if (params.squadId) search.set('squadId', params.squadId);
  if (params.athleteId) search.set('athleteId', toApiAthleteId(params.athleteId));
  if (params.sessionType) search.set('sessionType', params.sessionType);
  if (params.skillLevel) search.set('skillLevel', params.skillLevel);
  if (params.discover) search.set('discover', 'true');
  const query = search.toString();
  return query.length > 0 ? `/v1/group-sessions?${query}` : '/v1/group-sessions';
}

class GroupSessionAuthorityService {
  async listSessions(params: ListSessionsParams): Promise<Result<GroupSession[], ServiceError>> {
    const headersResult = await resolveAuthorityHeaders('Sign in to view group sessions.');
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiGroupSessionListResponse>(buildListPath(params), {
      method: 'GET',
      headers: headersResult.data,
    });
    if (!result.success) {
      logger.error('Failed to list group sessions via API', { params, error: result.error });
      return err(result.error);
    }
    return ok(result.data.groupSessions);
  }

  async getSession(sessionId: string): Promise<Result<GroupSession, ServiceError>> {
    const headersResult = await resolveAuthorityHeaders('Sign in to view this group session.');
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiGroupSessionDetailResponse>(`/v1/group-sessions/${sessionId}`, {
      method: 'GET',
      headers: headersResult.data,
    });
    if (!result.success) {
      logger.error('Failed to get group session via API', { sessionId, error: result.error });
      return err(result.error);
    }
    return ok(result.data.groupSession);
  }

  async createSession(input: CreateSessionInput): Promise<Result<GroupSession, ServiceError>> {
    const headersResult = await resolveAuthorityHeaders('Sign in to create group sessions.');
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiGroupSessionMutationResponse>('/v1/group-sessions', {
      method: 'POST',
      headers: headersResult.data,
      body: JSON.stringify({
        coachId: toApiUserId(input.coachId),
        ...(input.clubId ? { clubId: input.clubId } : {}),
        ...(input.squadId ? { squadId: input.squadId } : {}),
        title: input.title,
        description: input.description,
        sessionType: input.sessionType,
        schedule: input.schedule,
        maxParticipants: input.maxParticipants,
        pricePerParticipant: input.pricePerParticipant,
        ...(input.currency ? { currency: input.currency } : {}),
        ...(typeof input.ageMin === 'number' ? { ageMin: input.ageMin } : {}),
        ...(typeof input.ageMax === 'number' ? { ageMax: input.ageMax } : {}),
        ...(input.skillLevel ? { skillLevel: input.skillLevel } : {}),
        location: input.location,
        ...(typeof input.isVirtual === 'boolean' ? { isVirtual: input.isVirtual } : {}),
        ...(input.focus && input.focus.length > 0 ? { focus: input.focus } : {}),
        ...(input.equipment && input.equipment.length > 0 ? { equipment: input.equipment } : {}),
        ...(typeof input.waitlistEnabled === 'boolean'
          ? { waitlistEnabled: input.waitlistEnabled }
          : {}),
        ...(input.inviteType ? { inviteType: input.inviteType } : {}),
        ...(input.registrationDeadline ? { registrationDeadline: input.registrationDeadline } : {}),
      }),
    });
    if (!result.success) {
      logger.error('Failed to create group session via API', { input, error: result.error });
      return err(result.error);
    }
    return ok(result.data.groupSession);
  }

  async publishSession(sessionId: string): Promise<Result<GroupSession, ServiceError>> {
    const headersResult = await resolveAuthorityHeaders('Sign in to publish group sessions.');
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiGroupSessionMutationResponse>(
      `/v1/group-sessions/${sessionId}/publish`,
      {
        method: 'PATCH',
        headers: headersResult.data,
      },
    );
    if (!result.success) {
      logger.error('Failed to publish group session via API', { sessionId, error: result.error });
      return err(result.error);
    }
    return ok(result.data.groupSession);
  }

  async cancelSession(sessionId: string): Promise<Result<GroupSession, ServiceError>> {
    const headersResult = await resolveAuthorityHeaders('Sign in to cancel group sessions.');
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiGroupSessionMutationResponse>(
      `/v1/group-sessions/${sessionId}/cancel`,
      {
        method: 'PATCH',
        headers: headersResult.data,
      },
    );
    if (!result.success) {
      logger.error('Failed to cancel group session via API', { sessionId, error: result.error });
      return err(result.error);
    }
    return ok(result.data.groupSession);
  }

  async listRoster(sessionId: string): Promise<Result<GroupRegistration[], ServiceError>> {
    const headersResult = await resolveAuthorityHeaders('Sign in to view this group session roster.');
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiGroupSessionRosterResponse>(
      `/v1/group-sessions/${sessionId}/roster`,
      {
        method: 'GET',
        headers: headersResult.data,
      },
    );
    if (!result.success) {
      logger.error('Failed to list group session roster via API', { sessionId, error: result.error });
      return err(result.error);
    }
    return ok(result.data.registrations);
  }

  async register(params: {
    sessionId: string;
    athleteId: string;
    parentUserId?: string;
  }): Promise<Result<ApiGroupSessionRegisterResponse['registration'] & { booking?: { id: string; status: string } | null; sessionStatus: string }, ServiceError>> {
    const headersResult = await resolveAuthorityHeaders('Sign in to register for group sessions.');
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiGroupSessionRegisterResponse>(
      `/v1/group-sessions/${params.sessionId}/register`,
      {
        method: 'POST',
        headers: headersResult.data,
        body: JSON.stringify({
          athleteId: toApiAthleteId(params.athleteId),
          ...(params.parentUserId ? { parentUserId: toApiUserId(params.parentUserId) } : {}),
        }),
      },
    );
    if (!result.success) {
      logger.error('Failed to register group session via API', {
        params,
        error: result.error,
      });
      return err(result.error);
    }

    return ok({
      ...result.data.registration,
      booking: result.data.booking ?? null,
      sessionStatus: result.data.sessionStatus,
    });
  }

  async cancelRegistration(registrationId: string): Promise<Result<void, ServiceError>> {
    const headersResult = await resolveAuthorityHeaders('Sign in to update group session registrations.');
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<void>(`/v1/group-session-registrations/${registrationId}`, {
      method: 'DELETE',
      headers: headersResult.data,
    });
    if (!result.success) {
      logger.error('Failed to cancel group session registration via API', {
        registrationId,
        error: result.error,
      });
      return err(result.error);
    }

    return ok(undefined);
  }

  async markAttendance(params: {
    registrationId: string;
    date: string;
    attended: boolean;
  }): Promise<Result<GroupRegistration, ServiceError>> {
    const headersResult = await resolveAuthorityHeaders('Sign in to record group session attendance.');
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiGroupSessionRegistrationResponse>(
      `/v1/group-session-registrations/${params.registrationId}/attendance`,
      {
        method: 'PATCH',
        headers: headersResult.data,
        body: JSON.stringify({
          date: params.date,
          attended: params.attended,
        }),
      },
    );
    if (!result.success) {
      logger.error('Failed to mark group session attendance via API', {
        params,
        error: result.error,
      });
      return err(result.error);
    }

    return ok(result.data.registration);
  }

  async getRegistrationsForAthletes(
    athleteIds: ReadonlySet<string>,
  ): Promise<Result<GroupRegistration[], ServiceError>> {
    const headersResult = await resolveAuthorityHeaders('Sign in to view group session registrations.');
    if (!headersResult.success) {
      return headersResult;
    }

    const ids = Array.from(athleteIds);
    if (ids.length === 0) {
      return ok([]);
    }

    const search = new URLSearchParams({
      athleteIds: ids.map((athleteId) => toApiAthleteId(athleteId)).join(','),
    });
    const result = await apiFetch<ApiGroupSessionRegistrationListResponse>(
      `/v1/group-session-registrations?${search.toString()}`,
      {
        method: 'GET',
        headers: headersResult.data,
      },
    );
    if (!result.success) {
      logger.error('Failed to list group session registrations via API', {
        athleteIds: ids,
        error: result.error,
      });
      return err(result.error);
    }

    return ok(result.data.registrations);
  }
}

export const groupSessionAuthorityService = new GroupSessionAuthorityService();
