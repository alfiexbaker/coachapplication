import { authService } from '@/services/auth-service';
import { apiFetch } from '@/services/api-client';
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

function toApiUserId(userId: string): string {
  return userId.startsWith('usr_') ? userId : `usr_${userId.replace(/^ath_/, '')}`;
}

function toApiAthleteId(athleteId: string): string {
  return athleteId.startsWith('ath_') ? athleteId : `ath_${athleteId.replace(/^usr_/, '')}`;
}

function deriveActingRole(
  user: Awaited<ReturnType<typeof authService.getCurrentUser>>,
): ActingRole {
  if (user?.roles?.includes('club_admin')) {
    return 'club_admin';
  }
  if (user?.accountType === 'COACH') {
    return 'coach';
  }
  if (user?.accountType === 'PARENT') {
    return 'parent';
  }
  return 'athlete';
}

async function resolveSafeguardingAccess(
  athleteId?: string,
): Promise<
  Result<{ apiAthleteId?: string; headers: Record<string, string> }, ServiceError>
> {
  const currentUser = await authService.getCurrentUser();
  if (!currentUser?.id) {
    return err(serviceError('UNAUTHORIZED', 'Sign in to manage safeguarding incidents.'));
  }

  const actingRole = deriveActingRole(currentUser);
  const roles = new Set(currentUser.roles ?? []);
  roles.add(actingRole);

  const headers: Record<string, string> = {
    'x-auth-user-id': toApiUserId(currentUser.id),
    'x-auth-roles': Array.from(roles).join(','),
    'x-acting-role': actingRole,
  };

  const apiAthleteId = athleteId ? toApiAthleteId(athleteId) : undefined;
  if (apiAthleteId && actingRole === 'coach') {
    headers['x-coach-athlete-ids'] = apiAthleteId;
    if (currentUser.isVerified) {
      headers['x-coach-verified'] = '1';
    }
  } else if (apiAthleteId && actingRole === 'parent') {
    headers['x-guardian-athlete-ids'] = apiAthleteId;
  }

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
