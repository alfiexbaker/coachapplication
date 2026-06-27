import type {
  Booking,
  Club,
  ClubMembership,
  ClubRole,
  SessionOffering,
  UserRole,
} from '@/constants/types';
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

export interface OrgStaffMember {
  userId: string;
  label: string;
  role: ClubRole;
  status: ClubMembership['status'];
  canTakeAssignments: boolean;
  assignedToday: number;
  upcomingLoad: number;
  nextSessionAt?: string;
}

export interface OrgWorkItem {
  offeringId: string;
  title: string;
  scheduledAt: string;
  location: string;
  status: SessionOffering['status'];
  sessionType: SessionOffering['sessionType'];
  currentParticipants: number;
  maxParticipants: number;
  createdByName?: string;
  createdByRole?: UserRole;
  ownerCoachId?: string;
  ownerCoachName?: string;
  assigneeCoachId?: string;
  assigneeCoachName?: string;
  linkedBookingCount: number;
  isRecurring: boolean;
}

export interface OrgStaffingSummary {
  activeOrgSessions: number;
  assignedToday: number;
  upcomingAssignedLoad: number;
  unassignedCount: number;
}

export interface OrgStaffingConsoleData {
  club: Club;
  viewerMembership: ClubMembership;
  canManageAssignments: boolean;
  canPostAsClub: boolean;
  staff: OrgStaffMember[];
  unassignedWork: OrgWorkItem[];
  assignedWork: OrgWorkItem[];
  summary: OrgStaffingSummary;
}

type ApiOrgStaffingConsoleResponse = OrgStaffingConsoleData & {
  clubId: string;
  requestId?: string;
};

interface ApiWorkAssignmentResponse {
  offering: SessionOffering;
  updatedBookingIds: Booking['id'][];
  clubId: string;
  assignmentId: string;
  requestId?: string;
}

const MOCK_STAFFING_API_MESSAGE =
  'Club staffing console requires live /v1 API data. Local mock staffing data is disabled.';
const MOCK_REASSIGNMENT_API_MESSAGE =
  'Club work reassignment requires live /v1 API data. Local mock assignment writes are disabled.';

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
    return ok(result.data);
  }

  async assignOffering(params: {
    clubId: string;
    offeringId: string;
    assigneeCoachId: string;
    actorUserId: string;
    actorRole?: UserRole;
  }): Promise<
    Result<
      {
        offering: SessionOffering;
        updatedBookingIds: Booking['id'][];
      },
      ServiceError
    >
  > {
    void params.actorUserId;
    void params.actorRole;
    if (api.useMock) {
      return err(validationError(MOCK_REASSIGNMENT_API_MESSAGE));
    }
    const headersResult = await resolveStaffingHeaders();
    if (!headersResult.success) {
      return headersResult;
    }
    const result = await apiFetch<ApiWorkAssignmentResponse>(
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
    if (!result.success) {
      return err(result.error);
    }
    return ok({
      offering: result.data.offering,
      updatedBookingIds: result.data.updatedBookingIds,
    });
  }
}

export const orgStaffingService = new OrgStaffingService();
