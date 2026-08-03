import { api } from '@/constants/config';
import { apiFetch } from '@/services/api-client';
import {
  err,
  ok,
  unsupportedError,
  validationError,
  type Result,
  type ServiceError,
} from '@/types/result';

export interface DataDeletionRequest {
  id: string;
  requesterUserId: string;
  status: string;
  requestedAt: string;
  scheduledDeletionAt: string | null;
  cancelledAt: string | null;
  reason: string | null;
}

export interface DataDeletionRequestCreateResult {
  request: DataDeletionRequest;
  created: boolean;
}

interface ListResponse {
  requests?: unknown;
}

interface CreateResponse {
  request?: unknown;
  created?: unknown;
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function normalizeRequest(value: unknown): Result<DataDeletionRequest, ServiceError> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return err(validationError('Data deletion request response was malformed.'));
  }

  const record = value as Record<string, unknown>;
  const id = readString(record, 'id');
  const requesterUserId = readString(record, 'requesterUserId');
  const status = readString(record, 'status');
  const requestedAt = readString(record, 'requestedAt');

  if (!id || !requesterUserId || !status || !requestedAt) {
    return err(validationError('Data deletion request response was missing required fields.'));
  }

  return ok({
    id,
    requesterUserId,
    status,
    requestedAt,
    scheduledDeletionAt: readString(record, 'scheduledDeletionAt'),
    cancelledAt: readString(record, 'cancelledAt'),
    reason: readString(record, 'reason'),
  });
}

function normalizeRequestList(value: unknown): Result<DataDeletionRequest[], ServiceError> {
  if (!Array.isArray(value)) {
    return err(validationError('Data deletion request list response was malformed.'));
  }

  const requests: DataDeletionRequest[] = [];
  for (const item of value) {
    const normalized = normalizeRequest(item);
    if (!normalized.success) {
      return normalized;
    }
    requests.push(normalized.data);
  }
  return ok(requests);
}

export const dataDeletionRequestService = {
  async listSelfRequests(): Promise<Result<DataDeletionRequest[], ServiceError>> {
    if (api.useMock) {
      return ok([]);
    }

    const result = await apiFetch<ListResponse>('/v1/me/data-deletion-requests', {
      method: 'GET',
    });
    if (!result.success) {
      return err(result.error);
    }

    return normalizeRequestList(result.data.requests);
  },

  async createSelfRequest(input?: {
    reason?: string;
  }): Promise<Result<DataDeletionRequestCreateResult, ServiceError>> {
    if (api.useMock) {
      return err(unsupportedError('Account closure requests require the live API.'));
    }

    const reason = input?.reason?.trim();
    const result = await apiFetch<CreateResponse>('/v1/me/data-deletion-requests', {
      method: 'POST',
      body: JSON.stringify(reason ? { reason } : {}),
    });
    if (!result.success) {
      return err(result.error);
    }

    const request = normalizeRequest(result.data.request);
    if (!request.success) {
      return request;
    }

    return ok({
      request: request.data,
      created: result.data.created === true,
    });
  },
};
