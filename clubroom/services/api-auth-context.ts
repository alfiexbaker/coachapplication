import { authService, type UserProfile } from '@/services/auth-service';
import { err, ok, serviceError, type Result, type ServiceError } from '@/types/result';

export type ApiActingRole = 'coach' | 'parent' | 'athlete' | 'club_admin' | 'member' | 'admin';

export function toApiUserId(userId: string): string {
  return userId.startsWith('usr_') ? userId : `usr_${userId.replace(/^ath_/, '')}`;
}

export function toApiAthleteId(athleteId: string): string {
  return athleteId.startsWith('ath_') ? athleteId : `ath_${athleteId.replace(/^usr_/, '')}`;
}

export function deriveApiActingRole(
  user: UserProfile | null | undefined,
  fallback: ApiActingRole = 'athlete',
): ApiActingRole {
  if (user?.roles?.includes('club_admin')) {
    return 'club_admin';
  }
  if (user?.roles?.includes('admin') || user?.appRole === 'ADMIN') {
    return 'admin';
  }
  if (user?.accountType === 'COACH') {
    return 'coach';
  }
  if (user?.accountType === 'PARENT') {
    return 'parent';
  }
  if (user?.accountType === 'ATHLETE') {
    return 'athlete';
  }
  return fallback;
}

export function buildApiAuthHeaders(params: {
  actingRole: ApiActingRole;
  coachAthleteIds?: string[];
  guardianAthleteIds?: string[];
  coachVerified?: boolean;
}): Record<string, string> {
  const headers: Record<string, string> = {
    'x-acting-role': params.actingRole,
  };

  if (params.coachAthleteIds && params.coachAthleteIds.length > 0) {
    headers['x-coach-athlete-ids'] = params.coachAthleteIds.join(',');
  }
  if (params.guardianAthleteIds && params.guardianAthleteIds.length > 0) {
    headers['x-guardian-athlete-ids'] = params.guardianAthleteIds.join(',');
  }
  if (params.coachVerified) {
    headers['x-coach-verified'] = '1';
  }

  return headers;
}

export async function resolveSignedInApiUser(
  message: string,
): Promise<Result<UserProfile, ServiceError>> {
  const currentUser = await authService.getCurrentUser();
  if (!currentUser?.id) {
    return err(serviceError('UNAUTHORIZED', message));
  }
  return ok(currentUser);
}
