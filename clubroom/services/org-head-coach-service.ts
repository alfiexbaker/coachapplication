import { api } from '@/constants/config';
import { apiFetch } from './api-client';
import type {
  CreateHeadCoachStandardRequest,
  CreateHeadCoachTaskRequest,
  HeadCoachCoachHealth,
  HeadCoachCompletionItem,
  HeadCoachOversightData,
  HeadCoachOversightResponse,
  HeadCoachScope,
  HeadCoachScopeType,
  HeadCoachSquad,
  HeadCoachStandard,
  HeadCoachStandardCategory,
  HeadCoachStandardResponse,
  HeadCoachTask,
  HeadCoachTaskResponse,
  HeadCoachTaskStatus,
  HeadCoachTaskType,
  HeadCoachWatchlistItem,
  UpdateHeadCoachStandardRequest,
  UpdateHeadCoachTaskRequest,
} from '../packages/shared-contracts/src/club/head-coach';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
} from './api-auth-context';
import { err, ok, type Result, type ServiceError, validationError } from '@/types/result';

export type {
  HeadCoachCoachHealth,
  HeadCoachCompletionItem,
  HeadCoachOversightData,
  HeadCoachScope,
  HeadCoachScopeType,
  HeadCoachSquad,
  HeadCoachStandard,
  HeadCoachStandardCategory,
  HeadCoachTask,
  HeadCoachTaskStatus,
  HeadCoachTaskType,
  HeadCoachWatchlistItem,
};

const MOCK_HEAD_COACH_API_MESSAGE =
  'Head coach oversight requires live /v1 API data. Local mock oversight data is disabled.';

async function resolveHeadCoachHeaders(): Promise<Result<Record<string, string>, ServiceError>> {
  const currentUserResult = await resolveSignedInApiUser('Sign in to view head coach oversight.');
  if (!currentUserResult.success) {
    return currentUserResult;
  }

  return ok(
    buildApiAuthHeaders({
      actingRole: deriveApiActingRole(currentUserResult.data, 'coach'),
    }),
  );
}

class OrgHeadCoachService {
  async getOversightData(
    clubId: string,
    viewerUserId: string,
  ): Promise<Result<HeadCoachOversightData, ServiceError>> {
    void viewerUserId;
    if (api.useMock) {
      return err(validationError(MOCK_HEAD_COACH_API_MESSAGE));
    }
    const headersResult = await resolveHeadCoachHeaders();
    if (!headersResult.success) {
      return headersResult;
    }
    const result = await apiFetch<HeadCoachOversightResponse>(
      `/v1/clubs/${encodeURIComponent(clubId)}/head-coach/oversight`,
      {
        headers: headersResult.data,
      },
    );
    if (!result.success) {
      return err(result.error);
    }
    return ok(result.data);
  }

  async createTask(
    params: CreateHeadCoachTaskRequest & {
      clubId: string;
      actorUserId: string;
    },
  ): Promise<Result<HeadCoachTask, ServiceError>> {
    void params.actorUserId;
    if (api.useMock) {
      return err(validationError(MOCK_HEAD_COACH_API_MESSAGE));
    }
    const headersResult = await resolveHeadCoachHeaders();
    if (!headersResult.success) {
      return headersResult;
    }
    const result = await apiFetch<HeadCoachTaskResponse>(
      `/v1/clubs/${encodeURIComponent(params.clubId)}/head-coach/tasks`,
      {
        method: 'POST',
        headers: headersResult.data,
        body: JSON.stringify({
          coachId: params.coachId,
          type: params.type,
          ...(params.dueAt ? { dueAt: params.dueAt } : {}),
          ...(params.athleteId ? { athleteId: params.athleteId } : {}),
          ...(params.athleteName ? { athleteName: params.athleteName } : {}),
          ...(params.bookingId ? { bookingId: params.bookingId } : {}),
          ...(params.offeringId ? { offeringId: params.offeringId } : {}),
          ...(params.squadId ? { squadId: params.squadId } : {}),
          ...(params.title ? { title: params.title } : {}),
          ...(params.details ? { details: params.details } : {}),
        }),
      },
    );
    if (!result.success) {
      return err(result.error);
    }
    return ok(result.data);
  }

  async setTaskStatus(params: {
    clubId: string;
    actorUserId: string;
    taskId: string;
    status: HeadCoachTaskStatus;
  }): Promise<Result<HeadCoachTask, ServiceError>> {
    void params.actorUserId;
    if (api.useMock) {
      return err(validationError(MOCK_HEAD_COACH_API_MESSAGE));
    }
    const headersResult = await resolveHeadCoachHeaders();
    if (!headersResult.success) {
      return headersResult;
    }
    const body: UpdateHeadCoachTaskRequest = { status: params.status };
    const result = await apiFetch<HeadCoachTaskResponse>(
      `/v1/clubs/${encodeURIComponent(params.clubId)}/head-coach/tasks/${encodeURIComponent(params.taskId)}`,
      {
        method: 'PATCH',
        headers: headersResult.data,
        body: JSON.stringify(body),
      },
    );
    if (!result.success) {
      return err(result.error);
    }
    return ok(result.data);
  }

  async createStandard(
    params: CreateHeadCoachStandardRequest & {
      clubId: string;
      actorUserId: string;
    },
  ): Promise<Result<HeadCoachStandard, ServiceError>> {
    void params.actorUserId;
    if (api.useMock) {
      return err(validationError(MOCK_HEAD_COACH_API_MESSAGE));
    }
    const headersResult = await resolveHeadCoachHeaders();
    if (!headersResult.success) {
      return headersResult;
    }
    const result = await apiFetch<HeadCoachStandardResponse>(
      `/v1/clubs/${encodeURIComponent(params.clubId)}/head-coach/standards`,
      {
        method: 'POST',
        headers: headersResult.data,
        body: JSON.stringify({
          title: params.title,
          ...(params.description ? { description: params.description } : {}),
          ...(params.category ? { category: params.category } : {}),
        }),
      },
    );
    if (!result.success) {
      return err(result.error);
    }
    return ok(result.data);
  }

  async toggleStandard(params: {
    clubId: string;
    actorUserId: string;
    standardId: string;
    active?: boolean;
  }): Promise<Result<HeadCoachStandard, ServiceError>> {
    void params.actorUserId;
    if (api.useMock) {
      return err(validationError(MOCK_HEAD_COACH_API_MESSAGE));
    }
    const headersResult = await resolveHeadCoachHeaders();
    if (!headersResult.success) {
      return headersResult;
    }
    const body: UpdateHeadCoachStandardRequest = {
      ...(typeof params.active === 'boolean' ? { active: params.active } : {}),
    };
    const result = await apiFetch<HeadCoachStandardResponse>(
      `/v1/clubs/${encodeURIComponent(params.clubId)}/head-coach/standards/${encodeURIComponent(
        params.standardId,
      )}`,
      {
        method: 'PATCH',
        headers: headersResult.data,
        body: JSON.stringify(body),
      },
    );
    if (!result.success) {
      return err(result.error);
    }
    return ok(result.data);
  }
}

export const orgHeadCoachService = new OrgHeadCoachService();
