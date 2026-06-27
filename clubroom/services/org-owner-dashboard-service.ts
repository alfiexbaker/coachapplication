import type { Club, ClubMembership } from '@/constants/types';
import type {
  HeadCoachCoachHealth,
  HeadCoachCompletionItem,
} from '@/services/org-head-coach-service';
import type { OrgWorkItem } from '@/services/org-staffing-service';
import { api } from '@/constants/config';
import { apiFetch } from './api-client';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
} from './api-auth-context';
import {
  err,
  ok,
  type Result,
  type ServiceError,
  validationError,
} from '@/types/result';

type ProblemReportStatus = 'pending' | 'reviewed' | 'resolved';

export interface OwnerDashboardSummary {
  activeStaffCount: number;
  activeOrgSessions: number;
  liveBookingCount: number;
  unassignedCount: number;
  awaitingCompletionCount: number;
  overdueCompletionCount: number;
  watchAthleteCount: number;
  overdueFollowUpCount: number;
  supportIssueCount: number;
}

export interface OwnerDashboardFinanceSummary {
  openTotal: number;
  orgCreditOpen: number;
  coachCollectedOpen: number;
  collectedTotal: number;
  writtenOffTotal: number;
  overdueCount: number;
  owedCount: number;
  note: string;
}

export interface OwnerDashboardSupportIssue {
  id: string;
  bookingId: string;
  status: ProblemReportStatus;
  category: string;
  description: string;
  createdAt: string;
  scheduledAt?: string;
  sessionTitle: string;
  athleteLabel: string;
  supportLabel: string;
  deliveredByLabel: string;
}

export interface OrgOwnerDashboardData {
  club: Club;
  viewerMembership: ClubMembership;
  summary: OwnerDashboardSummary;
  finance: OwnerDashboardFinanceSummary;
  unassignedWork: OrgWorkItem[];
  coachHealth: HeadCoachCoachHealth[];
  completionQueue: HeadCoachCompletionItem[];
  supportIssues: OwnerDashboardSupportIssue[];
}

type ApiOwnerDashboardResponse = OrgOwnerDashboardData & {
  clubId: string;
  requestId?: string;
};

const MOCK_OWNER_DASHBOARD_API_MESSAGE =
  'Owner dashboard requires live /v1 API data. Local mock dashboard composition is disabled.';

async function resolveOwnerDashboardHeaders(): Promise<Result<Record<string, string>, ServiceError>> {
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
    const result = await apiFetch<ApiOwnerDashboardResponse>(
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
