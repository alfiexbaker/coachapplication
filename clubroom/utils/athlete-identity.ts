export interface LinkedAthleteUser {
  id?: string | null;
  athleteId?: string | null;
  athleteName?: string | null;
  fullName?: string | null;
  name?: string | null;
}

export function resolveSelfAthleteId(user?: LinkedAthleteUser | null): string | null {
  return user?.athleteId?.trim() || user?.id?.trim() || null;
}

export function resolveSelfAthleteName(user?: LinkedAthleteUser | null): string | null {
  return user?.athleteName?.trim() || user?.fullName?.trim() || user?.name?.trim() || null;
}

export function isSelfAthleteTarget(
  user: LinkedAthleteUser | null | undefined,
  targetId: string | null | undefined,
): boolean {
  const normalizedTargetId = targetId?.trim();
  if (!normalizedTargetId) {
    return false;
  }
  return normalizedTargetId === resolveSelfAthleteId(user) || normalizedTargetId === user?.id;
}
