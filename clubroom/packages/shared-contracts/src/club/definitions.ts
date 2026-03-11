export const organizationRoles = [
  'OWNER',
  'ADMIN',
  'HEAD_COACH',
  'COACH',
  'ASSISTANT',
  'MEMBER',
] as const;

export type OrganizationRole = (typeof organizationRoles)[number];
export type ClubRole = OrganizationRole;

export const organizationCommercialModes = ['COACH_OWNED', 'ORG_OWNED'] as const;
export type OrganizationCommercialMode = (typeof organizationCommercialModes)[number];

export const clubRelationshipLayers = [
  'membership',
  'delivery',
  'commercial_ownership',
  'trust_and_supervision',
  'family_identity',
] as const;
export type ClubRelationshipLayer = (typeof clubRelationshipLayers)[number];

export const clubAccessLevels = [
  'none',
  'own',
  'assigned',
  'scoped',
  'limited',
  'granted',
  'org',
] as const;
export type ClubAccessLevel = (typeof clubAccessLevels)[number];

export const clubCapabilities = [
  'view_org_dashboard',
  'edit_org_profile',
  'manage_staff_and_invites',
  'create_org_sessions',
  'assign_session_coach',
  'reassign_session_coach',
  'set_org_pricing_rules',
  'override_coach_org_pricing',
  'view_org_revenue',
  'manage_coach_payouts',
  'view_program_attendance',
  'view_athlete_health_flags',
  'view_safeguarding_escalations',
  'post_as_org',
  'view_own_work_queue',
] as const;
export type ClubCapability = (typeof clubCapabilities)[number];

export const clubVisibilityAreas = [
  'finance',
  'athlete_development',
  'medical',
  'safeguarding',
] as const;
export type ClubVisibilityArea = (typeof clubVisibilityAreas)[number];
