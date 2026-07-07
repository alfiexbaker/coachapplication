interface SessionOwnershipAuthorityInput {
  actingAs?: 'self' | 'club' | string | null;
  coachId?: string | null;
  ownerCoachId?: string | null;
  assigneeCoachId?: string | null;
  currentUserId?: string | null;
  canManageClubAssignments?: boolean;
}

export function isAssignedSessionCoach(input: SessionOwnershipAuthorityInput): boolean {
  if (!input.currentUserId) return false;
  return [input.coachId, input.ownerCoachId, input.assigneeCoachId].some(
    (candidate) => candidate === input.currentUserId,
  );
}

export function canManageSessionOperations(input: SessionOwnershipAuthorityInput): boolean {
  if (!input.currentUserId) return false;

  const isAssignedCoach = isAssignedSessionCoach(input);
  if (input.actingAs === 'club') {
    return isAssignedCoach || input.canManageClubAssignments === true;
  }

  return isAssignedCoach;
}
