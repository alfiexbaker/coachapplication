/**
 * useStatistics — State management and data loading for the Statistics screen.
 *
 * Manages:
 * - Child selection for parent users
 * - Session data loading and filtering
 * - Stats computation (total sessions, hours, badges, streak)
 * - Badge count fetching
 * - Quick link navigation
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { router } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/useTheme';
import {
  sessionHistory,
  athleteSkillLevels,
  getChildrenForParent,
  getSessionsForAthlete,
} from '@/constants/mock-data';
import { badgeService } from '@/services/badge-service';
import { hasChildren } from '@/utils/user-helpers';
import { Routes } from '@/navigation/routes';
import type { ThemeColors } from '@/hooks/useTheme';

export interface StatItem {
  id: string;
  icon: 'calendar' | 'time' | 'ribbon' | 'flame';
  label: string;
  value: string;
  color: string;
}

export interface SessionDisplayItem {
  id: string;
  coachName: string;
  athleteName?: string;
  focus: string;
  durationMinutes: number;
  rating?: number;
  coachFeedback?: string;
  completedAt?: string;
}

export function useStatistics() {
  const { currentUser } = useAuth();
  const { colors: palette } = useTheme();

  const children = useMemo(() => {
    if (currentUser && hasChildren(currentUser)) {
      return getChildrenForParent(currentUser.id);
    }
    return [];
  }, [currentUser]);

  const [selectedChildId, setSelectedChildId] = useState<string>(
    children.length > 0 ? children[0].id : ''
  );
  const [badgeCount, setBadgeCount] = useState(0);

  const isParent = hasChildren(currentUser);
  const targetId = isParent ? selectedChildId : currentUser?.id;

  // Load badge count
  useEffect(() => {
    const fetchBadges = async () => {
      if (targetId) {
        const badges = await badgeService.listAwardsForAthlete(targetId);
        setBadgeCount(badges.filter((b) => b.visibility !== 'coach_only').length);
      }
    };
    fetchBadges();
  }, [currentUser, selectedChildId, targetId]);

  // Get sessions filtered by selected child for parents
  const sessions = useMemo<SessionDisplayItem[]>(() => {
    if (isParent && selectedChildId) {
      const mapped: SessionDisplayItem[] = getSessionsForAthlete(selectedChildId).map((s) => ({
        id: s.id,
        coachName: s.coachName ?? 'Unknown Coach',
        athleteName: s.athleteName ?? 'Unknown Athlete',
        focus: s.skillsWorkedOn[0] || 'General Training',
        durationMinutes: 60,
        rating: s.performanceRating,
        coachFeedback: s.notes,
        completedAt: s.completedAt,
      }));
      return mapped;
    }
    return sessionHistory;
  }, [currentUser, selectedChildId, isParent]);

  // Calculate stats
  const totalSessions = sessions.length;
  const totalHours = sessions.reduce((sum, session) => sum + (session.durationMinutes ?? 60), 0) / 60;

  const stats: StatItem[] = useMemo(
    () => [
      {
        id: 'sessions',
        icon: 'calendar' as const,
        label: 'Total Sessions',
        value: totalSessions.toString(),
        color: palette.success,
      },
      {
        id: 'hours',
        icon: 'time' as const,
        label: 'Training Hours',
        value: Math.round(totalHours).toString(),
        color: palette.info,
      },
      {
        id: 'badges',
        icon: 'ribbon' as const,
        label: 'Badges Earned',
        value: badgeCount.toString(),
        color: palette.accent,
      },
      {
        id: 'streak',
        icon: 'flame' as const,
        label: 'Week Streak',
        value: '3',
        color: palette.warning,
      },
    ],
    [totalSessions, totalHours, badgeCount, palette]
  );

  // Sorted skills (top 6)
  const topSkills = useMemo(
    () =>
      [...athleteSkillLevels]
        .sort((a, b) => b.level - a.level)
        .slice(0, 6),
    []
  );

  // Recent sessions (top 5)
  const recentSessions = useMemo(() => sessions.slice(0, 5), [sessions]);

  // Quick link navigation
  const navigateToProgress = useCallback(() => {
    if (isParent && selectedChildId) {
      router.push(Routes.developmentChildProgress(selectedChildId));
    } else {
      router.push(Routes.DEVELOPMENT_MY_PROGRESS);
    }
  }, [isParent, selectedChildId]);

  const navigateToBadges = useCallback(() => {
    if (isParent && selectedChildId) {
      router.push(Routes.childBadges(selectedChildId));
    } else {
      router.push(Routes.BADGES);
    }
  }, [isParent, selectedChildId]);

  const navigateToBookings = useCallback(() => {
    router.push(Routes.BOOKINGS);
  }, []);

  const navigateToMessages = useCallback(() => {
    router.push(Routes.MESSAGES);
  }, []);

  return {
    // Data
    children,
    selectedChildId,
    setSelectedChildId,
    isParent,
    stats,
    recentSessions,
    topSkills,
    // Navigation
    navigateToProgress,
    navigateToBadges,
    navigateToBookings,
    navigateToMessages,
  };
}
