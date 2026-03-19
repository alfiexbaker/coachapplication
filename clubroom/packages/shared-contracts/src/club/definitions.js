// Runtime mirror for Metro/Expo.
//
// The app currently imports shared-contracts source files directly, and those
// files use NodeNext-style `.js` specifiers from TypeScript source. TypeScript
// can resolve that to `definitions.ts`, but Metro needs an actual runtime
// module at this path.

export const organizationRoles = [
  'OWNER',
  'ADMIN',
  'HEAD_COACH',
  'COACH',
  'ASSISTANT',
  'MEMBER',
];

export const organizationCommercialModes = ['COACH_OWNED', 'ORG_OWNED'];

export const clubRelationshipLayers = [
  'membership',
  'delivery',
  'commercial_ownership',
  'trust_and_supervision',
  'family_identity',
];

export const clubAccessLevels = [
  'none',
  'own',
  'assigned',
  'scoped',
  'limited',
  'granted',
  'org',
];

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
];

export const clubVisibilityAreas = [
  'finance',
  'athlete_development',
  'medical',
  'safeguarding',
];
