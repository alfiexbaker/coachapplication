/**
 * useAthleteData Hook
 *
 * Centralized hook for fetching athlete information, progress, and badges.
 * Provides consistent data shape, loading states, and error handling.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { badgeService, type AllBadgeWithProgress } from '@/services/badge-service';
import { progressService, type AthleteProgress, type SessionFeedback } from '@/services/progress-service';
import type { BadgeAward, Goal } from '@/constants/types';

// ============================================================================
// TYPES
// ============================================================================

export interface AthleteInfo {
  id: string;
  name: string;
  age?: number;
  photoUrl?: string;
  skillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
}

export interface AthleteProgressSummary {
  totalSessions: number;
  sessionsThisMonth: number;
  averagePerformance: number;
  averageEffort: number;
  attendanceRate: number;
  overallTrend: 'improving' | 'steady' | 'declining';
  improvementRate: number;
  currentLevel: { level: number; name: string };
  totalPoints: number;
  progressToNextLevel: number;
}

export interface AthleteBadgeSummary {
  totalBadges: number;
  recentBadges: BadgeAward[];
  allBadgesWithProgress: AllBadgeWithProgress[];
  topCategories: Array<{
    category: string;
    label: string;
    badgeCount: number;
    totalPoints: number;
  }>;
}

export interface AthleteGoalsSummary {
  activeGoals: Goal[];
  completedGoals: Goal[];
}

export interface AthleteDataResult {
  athlete: AthleteInfo | null;
  progress: AthleteProgressSummary | null;
  badges: AthleteBadgeSummary | null;
  goals: AthleteGoalsSummary | null;
  recentFeedback: SessionFeedback[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook to fetch comprehensive athlete data including progress, badges, and goals.
 *
 * @param athleteId - The ID of the athlete to fetch data for
 * @param options - Optional configuration
 * @returns AthleteDataResult with athlete data, loading state, and error
 *
 * @example
 * ```tsx
 * const { athlete, progress, badges, loading, error } = useAthleteData('athlete_1');
 *
 * if (loading) return <LoadingSpinner />;
 * if (error) return <ErrorMessage error={error} />;
 *
 * return <AthleteProfile athlete={athlete} progress={progress} badges={badges} />;
 * ```
 */
export function useAthleteData(
  athleteId: string | null | undefined,
  options?: {
    viewerRole?: 'coach' | 'parent' | 'athlete';
    includeBadgeProgress?: boolean;
    feedbackLimit?: number;
  }
): AthleteDataResult {
  const {
    viewerRole = 'parent',
    includeBadgeProgress = true,
    feedbackLimit = 5,
  } = options ?? {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [athlete, setAthlete] = useState<AthleteInfo | null>(null);
  const [progress, setProgress] = useState<AthleteProgressSummary | null>(null);
  const [badges, setBadges] = useState<AthleteBadgeSummary | null>(null);
  const [goals, setGoals] = useState<AthleteGoalsSummary | null>(null);
  const [recentFeedback, setRecentFeedback] = useState<SessionFeedback[]>([]);

  const fetchData = useCallback(async () => {
    // Handle null/undefined athleteId
    if (!athleteId) {
      setAthlete(null);
      setProgress(null);
      setBadges(null);
      setGoals(null);
      setRecentFeedback([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel for performance
      const [
        athleteProgress,
        badgeAwards,
        progressionSummary,
        allBadgesWithProgress,
      ] = await Promise.all([
        progressService.getAthleteProgress(athleteId, viewerRole),
        badgeService.listAwardsForAthlete(athleteId),
        badgeService.getProgressionSummary(athleteId),
        includeBadgeProgress
          ? badgeService.getAllBadgesWithProgress(athleteId)
          : Promise.resolve([]),
      ]);

      // Build athlete info from progress data
      const athleteInfo: AthleteInfo = {
        id: athleteId,
        name: athleteProgress.athleteName || `Athlete ${athleteId}`,
      };

      // Build progress summary
      const progressSummary: AthleteProgressSummary = {
        totalSessions: athleteProgress.totalSessions,
        sessionsThisMonth: athleteProgress.sessionsThisMonth,
        averagePerformance: athleteProgress.averagePerformance,
        averageEffort: athleteProgress.averageEffort,
        attendanceRate: athleteProgress.attendanceRate,
        overallTrend: athleteProgress.overallTrend,
        improvementRate: athleteProgress.improvementRate,
        currentLevel: athleteProgress.currentLevel,
        totalPoints: athleteProgress.totalPoints,
        progressToNextLevel: athleteProgress.progressToNextLevel,
      };

      // Build badges summary
      const badgesSummary: AthleteBadgeSummary = {
        totalBadges: progressionSummary.totalBadges,
        recentBadges: badgeAwards.slice(0, 5),
        allBadgesWithProgress,
        topCategories: progressionSummary.topCategories,
      };

      // Build goals summary
      const goalsSummary: AthleteGoalsSummary = {
        activeGoals: athleteProgress.activeGoals,
        completedGoals: athleteProgress.completedGoals,
      };

      setAthlete(athleteInfo);
      setProgress(progressSummary);
      setBadges(badgesSummary);
      setGoals(goalsSummary);
      setRecentFeedback(athleteProgress.recentFeedback.slice(0, feedbackLimit));
    } catch (e) {
      const errorInstance = e instanceof Error ? e : new Error(String(e));
      setError(errorInstance);
      console.error('[useAthleteData] Error fetching athlete data:', e);
    } finally {
      setLoading(false);
    }
  }, [athleteId, viewerRole, includeBadgeProgress, feedbackLimit]);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Memoize the refetch function
  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Memoize the return value to prevent unnecessary re-renders
  return useMemo(
    () => ({
      athlete,
      progress,
      badges,
      goals,
      recentFeedback,
      loading,
      error,
      refetch,
    }),
    [athlete, progress, badges, goals, recentFeedback, loading, error, refetch]
  );
}

// ============================================================================
// HELPER HOOKS
// ============================================================================

/**
 * Lightweight hook for fetching just athlete badges.
 * Use when you only need badge data without full progress information.
 */
export function useAthleteBadges(athleteId: string | null | undefined) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [badges, setBadges] = useState<BadgeAward[]>([]);

  const fetchBadges = useCallback(async () => {
    if (!athleteId) {
      setBadges([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const awards = await badgeService.listAwardsForAthlete(athleteId);
      setBadges(awards);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  return useMemo(
    () => ({ badges, loading, error, refetch: fetchBadges }),
    [badges, loading, error, fetchBadges]
  );
}

/**
 * Lightweight hook for fetching just athlete progress/level.
 * Use when you only need progression data without badges.
 */
export function useAthleteProgress(athleteId: string | null | undefined) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [progressData, setProgressData] = useState<{
    totalPoints: number;
    currentLevel: { level: number; name: string };
    progressPercent: number;
    pointsToNext: number;
  } | null>(null);

  const fetchProgress = useCallback(async () => {
    if (!athleteId) {
      setProgressData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const progress = await badgeService.getProgressToNextLevel(athleteId);
      setProgressData({
        totalPoints: progress.totalPoints,
        currentLevel: progress.currentLevel,
        progressPercent: progress.progressPercent,
        pointsToNext: progress.pointsToNext,
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return useMemo(
    () => ({ progress: progressData, loading, error, refetch: fetchProgress }),
    [progressData, loading, error, fetchProgress]
  );
}

/**
 * Hook for fetching athlete goals.
 */
export function useAthleteGoals(athleteId: string | null | undefined) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [goals, setGoals] = useState<{ active: Goal[]; completed: Goal[] }>({
    active: [],
    completed: [],
  });

  const fetchGoals = useCallback(async () => {
    if (!athleteId) {
      setGoals({ active: [], completed: [] });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const goalsData = await progressService.getGoalsForAthlete(athleteId);
      setGoals(goalsData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  return useMemo(
    () => ({ goals, loading, error, refetch: fetchGoals }),
    [goals, loading, error, fetchGoals]
  );
}
