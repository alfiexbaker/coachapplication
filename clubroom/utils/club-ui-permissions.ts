import type { ClubMembership, ClubRole } from '@/constants/types';
import {
  canManageClubMembers,
  canUseClubCapability,
  formatOrganizationRoleLabel,
} from '@/contracts/club-governance';

export function getClubRoleLabel(role: ClubRole | null | undefined): string {
  return formatOrganizationRoleLabel(role);
}

function isActiveMembership(
  membership: ClubMembership | null | undefined,
): membership is ClubMembership {
  return membership?.status === 'active';
}

export function canShareClubInvite(membership: ClubMembership | null | undefined): boolean {
  return isActiveMembership(membership) && canManageClubMembers(membership.role);
}

export function canManageClubUi(membership: ClubMembership | null | undefined): boolean {
  return isActiveMembership(membership) && canManageClubMembers(membership.role);
}

export function canCreateClubPost(membership: ClubMembership | null | undefined): boolean {
  return (
    isActiveMembership(membership) &&
    canUseClubCapability(membership.role, 'post_as_org', {
      hasGrant: membership.canPostAsClub === true,
    })
  );
}

export function canCreateClubScheduleItems(
  membership: ClubMembership | null | undefined,
): boolean {
  return (
    isActiveMembership(membership) &&
    canUseClubCapability(membership.role, 'create_org_sessions', {
      hasGrant: membership.canCreateSessions === true,
    })
  );
}

export function canViewClubOwnerDashboard(role: ClubRole | null | undefined): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}
