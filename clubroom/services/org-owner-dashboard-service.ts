import type { OwnerDashboardResponse } from '../packages/shared-contracts/src/club/owner-dashboard';
export type {
  OwnerDashboardFinanceSummary,
  OwnerDashboardSummary,
  OwnerDashboardSupportIssue,
} from '../packages/shared-contracts/src/club/owner-dashboard';
import { api } from '@/constants/config';
import { apiFetch } from './api-client';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
} from './api-auth-context';
import { err, ok, type Result, type ServiceError, validationError } from '@/types/result';

export type OrgOwnerDashboardData = Omit<OwnerDashboardResponse, 'clubId' | 'requestId'>;

const MOCK_OWNER_DASHBOARD_API_MESSAGE =
  'Owner dashboard requires live /v1 API data. Local mock dashboard composition is disabled.';

async function resolveOwnerDashboardHeaders(): Promise<
  Result<Record<string, string>, ServiceError>
> {
  const currentUserResult = await resolveSignedInApiUser('Sign in to view owner dashboard.');
  if (!currentUserResult.success) {
    return currentUserResult;
  }

  return ok(
    buildApiAuthHeaders({
      actingRole: deriveApiActingRole(currentUserResult.data, 'club_admin'),
    }),
  );
}

class OrgOwnerDashboardService {
  async getDashboardData(
    clubId: string,
    viewerUserId: string,
  ): Promise<Result<OrgOwnerDashboardData, ServiceError>> {
    void viewerUserId;
    if (api.useMock) {
      return err(validationError(MOCK_OWNER_DASHBOARD_API_MESSAGE));
    }
    const headersResult = await resolveOwnerDashboardHeaders();
    if (!headersResult.success) {
      return headersResult;
    }
    const result = await apiFetch<OwnerDashboardResponse>(
      `/v1/clubs/${encodeURIComponent(clubId)}/owner-dashboard`,
      {
        headers: headersResult.data,
      },
    );
    if (!result.success) {
      return err(result.error);
    }
    return ok(result.data);
  }
}

export const orgOwnerDashboardService = new OrgOwnerDashboardService();
