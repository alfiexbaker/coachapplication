/**
 * Family Service Types
 *
 * Shared type definitions for family services.
 * Re-exports from @/constants/types for convenience.
 */

// Re-export all family-related types from constants
export {
  type FamilyMember,
  type FamilyCalendarEvent,
  type FamilyOverview,
  type FamilyDateRange,
  type ChildProgressSummary,
  type BadgeAward,
  type FamilyAccount,
  type FamilyGuardian,
  type GuardianInvite,
  type GuardianPermission,
  type GuardianRole,
} from '@/constants/types';

// Re-export constants from services
export { CHILD_COLORS } from './family-member-service';
export {
  DEFAULT_ROLE_PERMISSIONS,
  RELATIONSHIP_OPTIONS,
  PERMISSION_DESCRIPTIONS,
} from './family-relationship-service';
