import type { ClubMembership, ClubRole } from '@/constants/types';

const OWNER_DASHBOARD_ROLE_PRIORITY: Record<ClubRole, number> = {
  OWNER: 0,
  ADMIN: 1,
  HEAD_COACH: 2,
  COACH: 3,
  ASSISTANT: 4,
  MEMBER: 5,
};

type ManageMembership = Pick<ClubMembership, 'clubId' | 'role' | 'status'>;

export function canRouteToOwnerDashboard(role?: ClubRole | null): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

export function pickOwnerDashboardClubId(
  memberships: ManageMembership[],
  preferredClubId?: string | null,
): string | null {
  const eligibleMemberships = memberships.filter(
    (membership) => membership.status === 'active' && canRouteToOwnerDashboard(membership.role),
  );

  if (preferredClubId) {
    const preferredMembership = eligibleMemberships.find(
      (membership) => membership.clubId === preferredClubId,
    );
    return preferredMembership?.clubId ?? null;
  }

  const bestMembership = [...eligibleMemberships].sort(
    (left, right) =>
      OWNER_DASHBOARD_ROLE_PRIORITY[left.role] - OWNER_DASHBOARD_ROLE_PRIORITY[right.role],
  )[0];

  return bestMembership?.clubId ?? null;
}
