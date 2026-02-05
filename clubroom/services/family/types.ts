/**
 * Family Service Types
 *
 * Shared type definitions for family services.
 * Re-exports from @/constants/types for convenience.
 */

export {
  type FamilyMember,
  type FamilySpending,
  type FamilySpendingMonth,
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

/**
 * Default permissions for each guardian role.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<
  'PRIMARY' | 'GUARDIAN' | 'VIEWER',
  ('VIEW_SCHEDULE' | 'VIEW_PROGRESS' | 'BOOK_SESSIONS' | 'MANAGE_PAYMENTS' | 'MANAGE_PROFILE' | 'ADMIN')[]
> = {
  PRIMARY: ['VIEW_SCHEDULE', 'VIEW_PROGRESS', 'BOOK_SESSIONS', 'MANAGE_PAYMENTS', 'MANAGE_PROFILE', 'ADMIN'],
  GUARDIAN: ['VIEW_SCHEDULE', 'VIEW_PROGRESS', 'BOOK_SESSIONS'],
  VIEWER: ['VIEW_SCHEDULE', 'VIEW_PROGRESS'],
};

/**
 * Color palette for children in calendar/charts.
 */
export const CHILD_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
] as const;
