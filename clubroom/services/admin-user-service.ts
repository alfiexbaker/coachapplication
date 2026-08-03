import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { User } from '@/constants/types';
import { apiClient, apiFetch } from '@/services/api-client';
import {
  err,
  ok,
  serviceError,
  storageError,
  type Result,
  type ServiceError,
} from '@/types/result';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AdminUserService');

export interface AdminUserSummary {
  total: number;
  coaches: number;
  athletes: number;
  parents: number;
}

interface AdminUserSummaryResponse {
  summary: AdminUserSummary;
  seedVersion: string | null;
  requestId: string;
}

function isAdminUserSummaryResponse(value: unknown): value is AdminUserSummaryResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const response = value as Record<string, unknown>;
  if (
    Object.keys(response).length !== 3 ||
    !response.summary ||
    typeof response.summary !== 'object' ||
    Array.isArray(response.summary) ||
    (response.seedVersion !== null && typeof response.seedVersion !== 'string') ||
    typeof response.requestId !== 'string' ||
    response.requestId.length === 0
  ) {
    return false;
  }
  const summary = response.summary as Record<string, unknown>;
  return (
    Object.keys(summary).length === 4 &&
    ['total', 'coaches', 'athletes', 'parents'].every(
      (key) => Number.isInteger(summary[key]) && Number(summary[key]) >= 0,
    )
  );
}

class AdminUserService {
  async getSummary(): Promise<Result<AdminUserSummary, ServiceError>> {
    if (!apiClient.isMockMode) {
      const response = await apiFetch<unknown>('/v1/admin/users/summary');
      if (!response.success) return err(response.error);

      if (!isAdminUserSummaryResponse(response.data)) {
        logger.error('Invalid admin user summary response');
        return err(
          serviceError(
            'UNKNOWN',
            'Could not load active account counts because the server response was invalid.',
          ),
        );
      }
      return ok(response.data.summary);
    }

    try {
      const users = await apiClient.get<User[]>(STORAGE_KEYS.USERS, []);
      return ok({
        total: users.length,
        coaches: users.filter((user) => user.role === 'COACH').length,
        athletes: users.filter((user) => user.role === 'USER').length,
        parents: users.filter((user) => user.role === 'PARENT').length,
      });
    } catch (error) {
      logger.error('Failed to load the admin user summary', error);
      return err(storageError('Could not load active account counts.'));
    }
  }
}

export const adminUserService = new AdminUserService();
