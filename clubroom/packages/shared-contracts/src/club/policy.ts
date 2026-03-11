import type {
  ClubAccessLevel,
  ClubCapability,
  ClubRole,
  ClubVisibilityArea,
  OrganizationCommercialMode,
} from './definitions.js';
import {
  clubCapabilities,
  clubVisibilityAreas,
  organizationRoles,
} from './definitions.js';

const DIRECT_ACCESS_LEVELS = new Set<ClubAccessLevel>([
  'own',
  'assigned',
  'scoped',
  'limited',
  'org',
]);

export const ORGANIZATION_ROLE_ORDER = [...organizationRoles];

export const ORGANIZATION_ROLE_RANK: Record<ClubRole, number> = {
  OWNER: 600,
  ADMIN: 500,
  HEAD_COACH: 400,
  COACH: 300,
  ASSISTANT: 200,
  MEMBER: 100,
};

export const ORGANIZATION_ROLE_LABELS: Record<ClubRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  HEAD_COACH: 'Head Coach',
  COACH: 'Coach',
  ASSISTANT: 'Assistant',
  MEMBER: 'Member',
};

export const ORGANIZATION_COMMERCIAL_MODE_LABELS: Record<OrganizationCommercialMode, string> = {
  COACH_OWNED: 'Coach-owned',
  ORG_OWNED: 'Organization-owned',
};

const ORGANIZATION_ROLE_ALIASES: Record<string, ClubRole> = {
  owner: 'OWNER',
  admin: 'ADMIN',
  administrator: 'ADMIN',
  club_admin: 'ADMIN',
  head_coach: 'HEAD_COACH',
  headcoach: 'HEAD_COACH',
  coach: 'COACH',
  assistant: 'ASSISTANT',
  member: 'MEMBER',
  club_member: 'MEMBER',
};

export const CLUB_CAPABILITY_MATRIX: Record<
  ClubRole,
  Record<ClubCapability, ClubAccessLevel>
> = {
  OWNER: {
    view_org_dashboard: 'org',
    edit_org_profile: 'org',
    manage_staff_and_invites: 'org',
    create_org_sessions: 'org',
    assign_session_coach: 'org',
    reassign_session_coach: 'org',
    set_org_pricing_rules: 'org',
    override_coach_org_pricing: 'org',
    view_org_revenue: 'org',
    manage_coach_payouts: 'org',
    view_program_attendance: 'org',
    view_athlete_health_flags: 'limited',
    view_safeguarding_escalations: 'org',
    post_as_org: 'org',
    view_own_work_queue: 'own',
  },
  ADMIN: {
    view_org_dashboard: 'org',
    edit_org_profile: 'org',
    manage_staff_and_invites: 'org',
    create_org_sessions: 'org',
    assign_session_coach: 'org',
    reassign_session_coach: 'org',
    set_org_pricing_rules: 'granted',
    override_coach_org_pricing: 'granted',
    view_org_revenue: 'org',
    manage_coach_payouts: 'org',
    view_program_attendance: 'org',
    view_athlete_health_flags: 'limited',
    view_safeguarding_escalations: 'limited',
    post_as_org: 'org',
    view_own_work_queue: 'own',
  },
  HEAD_COACH: {
    view_org_dashboard: 'org',
    edit_org_profile: 'limited',
    manage_staff_and_invites: 'limited',
    create_org_sessions: 'org',
    assign_session_coach: 'org',
    reassign_session_coach: 'org',
    set_org_pricing_rules: 'none',
    override_coach_org_pricing: 'none',
    view_org_revenue: 'limited',
    manage_coach_payouts: 'none',
    view_program_attendance: 'org',
    view_athlete_health_flags: 'scoped',
    view_safeguarding_escalations: 'limited',
    post_as_org: 'org',
    view_own_work_queue: 'own',
  },
  COACH: {
    view_org_dashboard: 'limited',
    edit_org_profile: 'none',
    manage_staff_and_invites: 'none',
    create_org_sessions: 'granted',
    assign_session_coach: 'none',
    reassign_session_coach: 'none',
    set_org_pricing_rules: 'none',
    override_coach_org_pricing: 'none',
    view_org_revenue: 'none',
    manage_coach_payouts: 'none',
    view_program_attendance: 'assigned',
    view_athlete_health_flags: 'assigned',
    view_safeguarding_escalations: 'none',
    post_as_org: 'granted',
    view_own_work_queue: 'own',
  },
  ASSISTANT: {
    view_org_dashboard: 'none',
    edit_org_profile: 'none',
    manage_staff_and_invites: 'none',
    create_org_sessions: 'none',
    assign_session_coach: 'none',
    reassign_session_coach: 'none',
    set_org_pricing_rules: 'none',
    override_coach_org_pricing: 'none',
    view_org_revenue: 'none',
    manage_coach_payouts: 'none',
    view_program_attendance: 'assigned',
    view_athlete_health_flags: 'limited',
    view_safeguarding_escalations: 'none',
    post_as_org: 'none',
    view_own_work_queue: 'own',
  },
  MEMBER: {
    view_org_dashboard: 'none',
    edit_org_profile: 'none',
    manage_staff_and_invites: 'none',
    create_org_sessions: 'none',
    assign_session_coach: 'none',
    reassign_session_coach: 'none',
    set_org_pricing_rules: 'none',
    override_coach_org_pricing: 'none',
    view_org_revenue: 'none',
    manage_coach_payouts: 'none',
    view_program_attendance: 'none',
    view_athlete_health_flags: 'none',
    view_safeguarding_escalations: 'none',
    post_as_org: 'none',
    view_own_work_queue: 'own',
  },
};

export const CLUB_VISIBILITY_MATRIX: Record<
  ClubVisibilityArea,
  Record<ClubRole, ClubAccessLevel>
> = {
  finance: {
    OWNER: 'org',
    ADMIN: 'org',
    HEAD_COACH: 'limited',
    COACH: 'own',
    ASSISTANT: 'none',
    MEMBER: 'none',
  },
  athlete_development: {
    OWNER: 'limited',
    ADMIN: 'limited',
    HEAD_COACH: 'scoped',
    COACH: 'assigned',
    ASSISTANT: 'limited',
    MEMBER: 'none',
  },
  medical: {
    OWNER: 'limited',
    ADMIN: 'limited',
    HEAD_COACH: 'scoped',
    COACH: 'assigned',
    ASSISTANT: 'limited',
    MEMBER: 'none',
  },
  safeguarding: {
    OWNER: 'org',
    ADMIN: 'org',
    HEAD_COACH: 'limited',
    COACH: 'none',
    ASSISTANT: 'none',
    MEMBER: 'none',
  },
};

function buildCapabilityMap(level: ClubAccessLevel): Record<ClubCapability, ClubAccessLevel> {
  return Object.fromEntries(clubCapabilities.map((capability) => [capability, level])) as Record<
    ClubCapability,
    ClubAccessLevel
  >;
}

function buildVisibilityMap(level: ClubAccessLevel): Record<ClubVisibilityArea, ClubAccessLevel> {
  return Object.fromEntries(
    clubVisibilityAreas.map((area) => [area, level]),
  ) as Record<ClubVisibilityArea, ClubAccessLevel>;
}

export function getOrganizationRoleRank(role: ClubRole): number {
  return ORGANIZATION_ROLE_RANK[role];
}

export function compareOrganizationRoles(left: ClubRole, right: ClubRole): number {
  return getOrganizationRoleRank(right) - getOrganizationRoleRank(left);
}

export function parseOrganizationRole(value: unknown): ClubRole | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return ORGANIZATION_ROLE_ALIASES[normalized] ?? null;
}

export function formatOrganizationRoleLabel(role: ClubRole | null | undefined): string {
  return role ? ORGANIZATION_ROLE_LABELS[role] : 'Member';
}

export function isClubStaffRole(role: ClubRole): boolean {
  return role !== 'MEMBER';
}

export function isClubOversightRole(role: ClubRole): boolean {
  return role === 'OWNER' || role === 'ADMIN' || role === 'HEAD_COACH';
}

export function getClubCapabilityAccess(
  role: ClubRole | null | undefined,
  capability: ClubCapability,
): ClubAccessLevel {
  if (!role) {
    return 'none';
  }
  return CLUB_CAPABILITY_MATRIX[role][capability];
}

export function hasDirectClubCapability(
  role: ClubRole | null | undefined,
  capability: ClubCapability,
): boolean {
  return DIRECT_ACCESS_LEVELS.has(getClubCapabilityAccess(role, capability));
}

export function canUseClubCapability(
  role: ClubRole | null | undefined,
  capability: ClubCapability,
  options?: { hasGrant?: boolean },
): boolean {
  const access = getClubCapabilityAccess(role, capability);
  if (access === 'granted') {
    return options?.hasGrant === true;
  }
  return DIRECT_ACCESS_LEVELS.has(access);
}

export function getClubVisibilityAccess(
  role: ClubRole | null | undefined,
  area: ClubVisibilityArea,
): ClubAccessLevel {
  if (!role) {
    return 'none';
  }
  return CLUB_VISIBILITY_MATRIX[area][role];
}

export function canManageClubRole(
  managerRole: ClubRole,
  targetRole: ClubRole,
): boolean {
  return getOrganizationRoleRank(managerRole) > getOrganizationRoleRank(targetRole);
}

export function getAssignableClubRoles(managerRole: ClubRole): ClubRole[] {
  return ORGANIZATION_ROLE_ORDER.filter(
    (role) => role !== 'OWNER' && canManageClubRole(managerRole, role),
  );
}

export function canManageClubMembers(role: ClubRole | null | undefined): boolean {
  return hasDirectClubCapability(role, 'manage_staff_and_invites');
}

export function canManageClubAssignments(role: ClubRole | null | undefined): boolean {
  return hasDirectClubCapability(role, 'assign_session_coach');
}

export function canReassignClubAssignments(role: ClubRole | null | undefined): boolean {
  return hasDirectClubCapability(role, 'reassign_session_coach');
}

export function canViewClubCommercialMode(role: ClubRole | null | undefined): boolean {
  return role === 'OWNER' || role === 'ADMIN' || role === 'HEAD_COACH';
}

export function canEditClubCommercialMode(role: ClubRole | null | undefined): boolean {
  return role === 'OWNER';
}

export function formatOrganizationCommercialModeLabel(
  commercialMode?: OrganizationCommercialMode | null,
): string {
  return ORGANIZATION_COMMERCIAL_MODE_LABELS[commercialMode ?? 'COACH_OWNED'];
}

export interface ClubGovernanceSnapshot {
  role: ClubRole | null;
  isStaff: boolean;
  isOversightRole: boolean;
  canManageMembers: boolean;
  canManageAssignments: boolean;
  canReassignAssignments: boolean;
  canViewCommercialMode: boolean;
  canEditCommercialMode: boolean;
  capabilities: Record<ClubCapability, ClubAccessLevel>;
  visibility: Record<ClubVisibilityArea, ClubAccessLevel>;
}

export function getClubGovernanceSnapshot(
  role: ClubRole | null | undefined,
): ClubGovernanceSnapshot {
  const resolvedRole = role ?? null;
  return {
    role: resolvedRole,
    isStaff: resolvedRole ? isClubStaffRole(resolvedRole) : false,
    isOversightRole: resolvedRole ? isClubOversightRole(resolvedRole) : false,
    canManageMembers: canManageClubMembers(resolvedRole),
    canManageAssignments: canManageClubAssignments(resolvedRole),
    canReassignAssignments: canReassignClubAssignments(resolvedRole),
    canViewCommercialMode: canViewClubCommercialMode(resolvedRole),
    canEditCommercialMode: canEditClubCommercialMode(resolvedRole),
    capabilities: resolvedRole
      ? CLUB_CAPABILITY_MATRIX[resolvedRole]
      : buildCapabilityMap('none'),
    visibility: getClubVisibilitySnapshot(resolvedRole),
  };
}

export function getClubVisibilitySnapshot(
  role: ClubRole | null | undefined,
): Record<ClubVisibilityArea, ClubAccessLevel> {
  if (!role) {
    return buildVisibilityMap('none');
  }
  return Object.fromEntries(
    clubVisibilityAreas.map((area) => [area, CLUB_VISIBILITY_MATRIX[area][role]]),
  ) as Record<ClubVisibilityArea, ClubAccessLevel>;
}
