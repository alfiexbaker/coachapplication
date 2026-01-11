/**
 * Centralized Data Hooks
 *
 * This module provides shared data hooks for consistent data fetching
 * across the application. These hooks:
 *
 * - Use existing services (badge-service, progress-service, etc.)
 * - Handle loading and error states consistently
 * - Return predictable data shapes
 * - Support data caching with useCallback/useMemo
 * - Handle edge cases (null IDs, etc.)
 *
 * @example
 * ```tsx
 * import { useAthleteData, useCoachRoster, useClubMembers } from '@/hooks/data';
 *
 * // Full athlete data
 * const { athlete, progress, badges, loading } = useAthleteData(athleteId);
 *
 * // Just coach roster
 * const { athletes, stats } = useCoachRoster(coachId);
 *
 * // Club members management
 * const { members, getMembersByRole } = useClubMembers(clubId);
 * ```
 */

// ============================================================================
// ATHLETE DATA HOOKS
// ============================================================================

export {
  useAthleteData,
  useAthleteBadges,
  useAthleteProgress,
  useAthleteGoals,
  type AthleteInfo,
  type AthleteProgressSummary,
  type AthleteBadgeSummary,
  type AthleteGoalsSummary,
  type AthleteDataResult,
} from './useAthleteData';

// ============================================================================
// CLUB DATA HOOKS
// ============================================================================

export {
  useClubData,
  useClubMembers,
  useClubSessions,
  useClubMemberManagement,
  type ClubInfo,
  type ClubMembersSummary,
  type ClubSessionsSummary,
  type ClubDataResult,
} from './useClubData';

// ============================================================================
// COACH DATA HOOKS
// ============================================================================

export {
  useCoachData,
  useCoachRoster,
  useCoachSessions,
  useCoachRosterManagement,
  useCoachGroupSessionManagement,
  type CoachInfo,
  type CoachRosterSummary,
  type CoachSessionsSummary,
  type CoachDataResult,
} from './useCoachData';
