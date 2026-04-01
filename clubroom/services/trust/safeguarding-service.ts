import { apiFetch } from '@/services/api-client';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
  toApiAthleteId,
} from '@/services/api-auth-context';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type Result, type ServiceError } from '@/types/result';

const logger = createLogger('SafeguardingService');

type ActingRole = 'coach' | 'parent' | 'athlete' | 'club_admin';
type SafeguardingCategory =
  | 'session_conduct'
  | 'injury_followup'
  | 'medical_concern'
  | 'booking_issue_safety'
  | 'other';
type SafeguardingSeverity = 'low' | 'medium' | 'high' | 'critical';
type SafeguardingIncidentStatus = 'open' | 'in_review' | 'closed';
type SafeguardingActionType =
  | 'note_added'
  | 'escalated'
  | 'contacted_guardian'
  | 'contacted_authority'
  | 'close_case'
  | 'reopen_case';

export interface CreateSafeguardingIncidentInput {
  athleteId?: string;
  bookingId?: string;
  category: SafeguardingCategory;
  severity?: SafeguardingSeverity;
  summary: string;
  details?: string;
}

export interface CreateSafeguardingActionInput {
  actionType: SafeguardingActionType;
  notes: string;
}

export interface SafeguardingAction {
  id: string;
  incidentId: string;
  actionType: SafeguardingActionType;
  notes: string;
  performedByUserId: string;
  createdAt: string;
}

export interface SafeguardingIncident {
  id: string;
  athleteId: string | null;
  bookingId: string | null;
  category: SafeguardingCategory;
  severity: SafeguardingSeverity;
  status: SafeguardingIncidentStatus;
  summary: string;
  details: string | null;
  reportedByUserId: string;
  createdAt: string;
  updatedAt: string;
  actions: SafeguardingAction[];
}

async function resolveSafeguardingAccess(
  athleteId?: string,
): Promise<
  Result<{ apiAthleteId?: string; headers: Record<string, string> }, ServiceError>
> {
  const currentUserResult = await resolveSignedInApiUser(
    'Sign in to manage safeguarding incidents.',
  );
  if (!currentUserResult.success) {
    return currentUserResult;
  }

  const currentUser = currentUserResult.data;
  const actingRole = deriveApiActingRole(currentUser) as ActingRole;
  const apiAthleteId = athleteId ? toApiAthleteId(athleteId) : undefined;
  const headers = buildApiAuthHeaders({
    actingRole,
    coachAthleteIds: apiAthleteId && actingRole === 'coach' ? [apiAthleteId] : undefined,
    guardianAthleteIds: apiAthleteId && actingRole === 'parent' ? [apiAthleteId] : undefined,
    coachVerified: actingRole === 'coach' && currentUser.isVerified,
  });

  return ok({ apiAthleteId, headers });
}

class SafeguardingService {
  async createIncident(
    input: CreateSafeguardingIncidentInput,
  ): Promise<Result<SafeguardingIncident, ServiceError>> {
    const access = await resolveSafeguardingAccess(input.athleteId);
    if (!access.success) {
      return access;
    }

    const result = await apiFetch<SafeguardingIncident>('/v1/safeguarding/incidents', {
      method: 'POST',
      headers: access.data.headers,
      body: JSON.stringify({
        ...input,
        ...(access.data.apiAthleteId ? { athleteId: access.data.apiAthleteId } : {}),
      }),
    });

    if (!result.success) {
      logger.error('Failed to create safeguarding incident', {
        athleteId: input.athleteId,
        bookingId: input.bookingId,
        error: result.error,
      });
      return err(result.error);
    }

    return result;
  }

  async getIncident(
    incidentId: string,
    athleteId?: string,
  ): Promise<Result<SafeguardingIncident, ServiceError>> {
    const access = await resolveSafeguardingAccess(athleteId);
    if (!access.success) {
      return access;
    }

    const result = await apiFetch<SafeguardingIncident>(
      `/v1/safeguarding/incidents/${incidentId}`,
      {
        method: 'GET',
        headers: access.data.headers,
      },
    );

    if (!result.success) {
      logger.error('Failed to load safeguarding incident', { incidentId, error: result.error });
      return err(result.error);
    }

    return result;
  }

  async addAction(
    incidentId: string,
    input: CreateSafeguardingActionInput,
    athleteId?: string,
  ): Promise<Result<SafeguardingAction, ServiceError>> {
    const access = await resolveSafeguardingAccess(athleteId);
    if (!access.success) {
      return access;
    }

    const result = await apiFetch<SafeguardingAction>(
      `/v1/safeguarding/incidents/${incidentId}/actions`,
      {
        method: 'POST',
        headers: access.data.headers,
        body: JSON.stringify(input),
      },
    );

    if (!result.success) {
      logger.error('Failed to add safeguarding incident action', {
        incidentId,
        athleteId,
        error: result.error,
      });
      return err(result.error);
    }

    return result;
  }
}

export const safeguardingService = new SafeguardingService();
