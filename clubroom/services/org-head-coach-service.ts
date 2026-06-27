import type {
  Booking,
  Club,
  ClubMembership,
  ClubRole,
  ClubSquad,
  SessionOffering,
} from '@/constants/types';
import type { PracticeTaskRisk } from '@/services/progress/progress-practice-task-service';
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

export type HeadCoachScopeType = 'club' | 'assigned_squads';
export type HeadCoachTaskType = 'required_follow_up' | 'session_note_expectation';
export type HeadCoachTaskStatus = 'open' | 'done';
export type HeadCoachStandardCategory = 'session_notes' | 'follow_up' | 'program';

export interface HeadCoachScope {
  type: HeadCoachScopeType;
  squadIds: string[];
  label: string;
}

export interface HeadCoachCompletionItem {
  bookingId: Booking['id'];
  offeringId?: SessionOffering['id'];
  coachId: string;
  coachName: string;
  athleteName: string;
  service: string;
  scheduledAt: string;
  dueAt: string;
  overdue: boolean;
  squadId?: string;
  squadName?: string;
}

export interface HeadCoachWatchlistItem {
  athleteId: string;
  athleteName: string;
  coachId: string;
  coachName: string;
  risk: PracticeTaskRisk;
  pendingCount: number;
  overdueCount: number;
  dueSoonCount: number;
  recommendedAction: string;
  nextDueAt: string | null;
  latestCoachActionAt: string | null;
  attentionScore: number;
  taskIds: string[];
  squadId?: string;
  squadName?: string;
}

export interface HeadCoachTask {
  id: string;
  clubId: string;
  coachId: string;
  coachName: string;
  type: HeadCoachTaskType;
  status: HeadCoachTaskStatus;
  title: string;
  details?: string;
  dueAt: string;
  athleteId?: string;
  athleteName?: string;
  bookingId?: Booking['id'];
  offeringId?: SessionOffering['id'];
  squadId?: string;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  completedAt?: string;
  completedByUserId?: string;
}

export interface HeadCoachStandard {
  id: string;
  clubId: string;
  category: HeadCoachStandardCategory;
  title: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
}

export interface HeadCoachCoachHealth {
  coachId: string;
  coachName: string;
  role: ClubRole;
  squadNames: string[];
  completionCount: number;
  overdueCompletionCount: number;
  watchAthleteCount: number;
  overdueFollowUpCount: number;
  openTaskCount: number;
  sessionNoteExpectationCount: number;
  requiredFollowUpCount: number;
  latestCoachActionAt: string | null;
}

export interface HeadCoachOversightSummary {
  coachCount: number;
  squadCount: number;
  awaitingCompletionCount: number;
  overdueCompletionCount: number;
  watchAthleteCount: number;
  overdueFollowUpCount: number;
  openTaskCount: number;
  activeStandardCount: number;
}

export interface HeadCoachOversightData {
  club: Club;
  viewerMembership: ClubMembership;
  scope: HeadCoachScope;
  squads: ClubSquad[];
  coachHealth: HeadCoachCoachHealth[];
  completionQueue: HeadCoachCompletionItem[];
  watchlist: HeadCoachWatchlistItem[];
  tasks: HeadCoachTask[];
  standards: HeadCoachStandard[];
  summary: HeadCoachOversightSummary;
}

type ApiHeadCoachOversightResponse = HeadCoachOversightData & {
  clubId: string;
  requestId?: string;
};

const MISSING_HEAD_COACH_API_MESSAGE =
  'Head coach task and standard mutations require backend authority. Missing API: /v1 club head-coach task and standard routes.';
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
    const result = await apiFetch<ApiHeadCoachOversightResponse>(
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

  async createTask(params: {
    clubId: string;
    actorUserId: string;
    coachId: string;
    type: HeadCoachTaskType;
    dueAt?: string;
    athleteId?: string;
    athleteName?: string;
    bookingId?: Booking['id'];
    title?: string;
    details?: string;
  }): Promise<Result<HeadCoachTask, ServiceError>> {
    void params;
    return err(validationError(MISSING_HEAD_COACH_API_MESSAGE));
  }

  async setTaskStatus(params: {
    clubId: string;
    actorUserId: string;
    taskId: string;
    status: HeadCoachTaskStatus;
  }): Promise<Result<HeadCoachTask, ServiceError>> {
    void params;
    return err(validationError(MISSING_HEAD_COACH_API_MESSAGE));
  }

  async createStandard(params: {
    clubId: string;
    actorUserId: string;
    title: string;
    description?: string;
    category?: HeadCoachStandardCategory;
  }): Promise<Result<HeadCoachStandard, ServiceError>> {
    void params;
    return err(validationError(MISSING_HEAD_COACH_API_MESSAGE));
  }

  async toggleStandard(params: {
    clubId: string;
    actorUserId: string;
    standardId: string;
  }): Promise<Result<HeadCoachStandard, ServiceError>> {
    void params;
    return err(validationError(MISSING_HEAD_COACH_API_MESSAGE));
  }
}

export const orgHeadCoachService = new OrgHeadCoachService();
