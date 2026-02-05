/**
 * Family Service - Re-export Facade
 *
 * This file has been refactored into focused modules under services/family/.
 * It re-exports everything for full backward compatibility.
 *
 * See:
 * - services/family/family-member-service.ts (members, bookings, calendar, spending, progress)
 * - services/family/family-relationship-service.ts (guardian management, invites)
 * - services/family/family-permission-service.ts (authorization, access control)
 * - services/family/index.ts (unified facade)
 */

export {
  familyService,
  familyServices,
  familyMemberService,
  familyRelationshipService,
  familyPermissionService,
  CHILD_COLORS,
  DEFAULT_ROLE_PERMISSIONS,
  RELATIONSHIP_OPTIONS,
  PERMISSION_DESCRIPTIONS,
} from './family/index';

export * from './family/types';
