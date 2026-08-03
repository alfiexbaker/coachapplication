import type {
  SessionOwnershipAuditEvent,
  UserRole,
} from '@/constants/types';
import type {
  StaffingConsoleResponse,
  StaffingStaffMember,
  StaffingSummary,
  StaffingWorkItem,
  WorkAssignmentUpdateResponse,
} from '../packages/shared-contracts/src/club/staffing';
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

export interface OrgStaffMember extends StaffingStaffMember {
  assignedToday: number;
}

export type OrgWorkItem = StaffingWorkItem;

export interface OrgStaffingSummary extends StaffingSummary {
  assignedToday: number;
}

export interface OrgStaffingConsoleData
  extends Omit<StaffingConsoleResponse, 'clubId' | 'requestId' | 'staff' | 'summary'> {
  canManageAssignments: boolean;
  staff: OrgStaffMember[];
  summary: OrgStaffingSummary;
}

type ApiOrgStaffingConsoleResponse = StaffingConsoleResponse;

interface ApiWorkAssignmentHistoryResponse {
  clubId: string;
  assignmentId: string;
  events: SessionOwnershipAuditEvent[];
  total: number;
  truncated: boolean;
  requestId?: string;
}

const MOCK_STAFFING_API_MESSAGE =
  'Club staffing console requires live /v1 API data. Local mock staffing data is disabled.';
const MOCK_REASSIGNMENT_API_MESSAGE =
  'Club work reassignment requires live /v1 API data. Local mock assignment writes are disabled.';
const MOCK_ASSIGNMENT_HISTORY_API_MESSAGE =
  'Club work assignment history requires live /v1 API data. Local mock history is disabled.';

function toLocalDateKey(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function addLocalStaffingMetrics(
  response: StaffingConsoleResponse,
): OrgStaffingConsoleData {
  const todayKey = toLocalDateKey(new Date().toISOString());
  const assignedTodayByUserId = new Map<string, number>();
  for (const item of response.assignedWork) {
    if (!item.assigneeCoachId || toLocalDateKey(item.scheduledAt) !== todayKey) continue;
    assignedTodayByUserId.set(
      item.assigneeCoachId,
      (assignedTodayByUserId.get(item.assigneeCoachId) ?? 0) + 1,
    );
  }

  return {
    club: response.club,
    viewerMembership: response.viewerMembership,
    privilegedAdminAccess: response.privilegedAdminAccess,
    canManageAssignments: response.canManageAssignments,
    staff: response.staff.map((member) => ({
      ...member,
      assignedToday: assignedTodayByUserId.get(member.userId) ?? 0,
    })),
    unassignedWork: response.unassignedWork,
    assignedWork: response.assignedWork,
    summary: {
      ...response.summary,
      assignedToday: Array.from(assignedTodayByUserId.values()).reduce(
        (total, count) => total + count,
        0,
      ),
    },
  };
}

async function resolveStaffingHeaders(): Promise<Result<Record<string, string>, ServiceError>> {
  const currentUserResult = await resolveSignedInApiUser('Sign in to view club staffing.');
  if (!currentUserResult.success) {
    return currentUserResult;
  }
  return ok(
    buildApiAuthHeaders({
      actingRole: deriveApiActingRole(currentUserResult.data, 'member'),
    }),
  );
}

class OrgStaffingService {
  async getConsoleData(
    clubId: string,
    viewerUserId: string,
  ): Promise<Result<OrgStaffingConsoleData, ServiceError>> {
    void viewerUserId;
    if (api.useMock) {
      return err(validationError(MOCK_STAFFING_API_MESSAGE));
    }
    const headersResult = await resolveStaffingHeaders();
    if (!headersResult.success) {
      return headersResult;
    }
    const result = await apiFetch<ApiOrgStaffingConsoleResponse>(
      `/v1/clubs/${encodeURIComponent(clubId)}/staffing-console`,
      {
        method: 'GET',
        headers: headersResult.data,
      },
    );
    if (!result.success) {
      return err(result.error);
    }
    return ok(addLocalStaffingMetrics(result.data));
  }

  async assignOffering(params: {
    clubId: string;
    offeringId: string;
    assigneeCoachId: string;
    actorUserId: string;
    actorRole?: UserRole;
  }): Promise<Result<WorkAssignmentUpdateResponse, ServiceError>> {
    void params.actorUserId;
    void params.actorRole;
    if (api.useMock) {
      return err(validationError(MOCK_REASSIGNMENT_API_MESSAGE));
    }
    const headersResult = await resolveStaffingHeaders();
    if (!headersResult.success) {
      return headersResult;
    }
    return apiFetch<WorkAssignmentUpdateResponse>(
      `/v1/clubs/${encodeURIComponent(params.clubId)}/work-assignments/${encodeURIComponent(
        params.offeringId,
      )}`,
      {
        method: 'PATCH',
        headers: headersResult.data,
        body: JSON.stringify({
          assigneeCoachId: params.assigneeCoachId,
        }),
      },
    );
  }

  async getOwnershipHistory(
    clubId: string,
    assignmentId: string,
  ): Promise<Result<SessionOwnershipAuditEvent[], ServiceError>> {
    if (api.useMock) {
      return err(validationError(MOCK_ASSIGNMENT_HISTORY_API_MESSAGE));
    }
    const headersResult = await resolveStaffingHeaders();
    if (!headersResult.success) {
      return headersResult;
    }
    const result = await apiFetch<ApiWorkAssignmentHistoryResponse>(
      `/v1/clubs/${encodeURIComponent(clubId)}/work-assignments/${encodeURIComponent(
        assignmentId,
      )}/history`,
      {
        method: 'GET',
        headers: headersResult.data,
      },
    );
    if (!result.success) {
      return err(result.error);
    }
    return ok(result.data.events);
  }
}

export const orgStaffingService = new OrgStaffingService();
