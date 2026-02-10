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
import { badgeService } from '@/services/badge-service';
import { apiClient } from '@/services/api-client';
import { hasChildren } from '@/utils/user-helpers';
import { Routes } from '@/navigation/routes';
import type { Session, User } from '@/constants/types';

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

const mapSessionToDisplay = (session: Session): SessionDisplayItem => ({
  id: session.id,
  coachName: session.coachName ?? 'Unknown Coach',
  athleteName: session.athleteName ?? 'Unknown Athlete',
  focus: session.skillsWorkedOn[0] || 'General Training',
  durationMinutes: 60,
  rating: session.performanceRating,
  coachFeedback: session.notes,
  completedAt: session.completedAt,
});

export function useStatistics() {
  const { currentUser, availableUsers } = useAuth();
  const { colors: palette } = useTheme();
  const [storedSessions, setStoredSessions] = useState<Session[]>([]);

  const children = useMemo<User[]>(() => {
    if (currentUser && hasChildren(currentUser)) {
      return (currentUser.children || []).map((childRef) => {
        const linkedUser = availableUsers.find((user) => user.id === childRef.childId);
        return {
          id: childRef.childId,
          name: childRef.childName || linkedUser?.name || 'Child',
          email: linkedUser?.email || '',
          role: linkedUser?.role || 'USER',
          postcode: linkedUser?.postcode || '',
          dateOfBirth: linkedUser?.dateOfBirth || '',
          avatar: linkedUser?.avatar,
        };
      });
    }
    return [];
  }, [availableUsers, currentUser]);

  const [selectedChildId, setSelectedChildId] = useState<string>(
    children.length > 0 ? children[0].id : ''
  );
  const [badgeCount, setBadgeCount] = useState(0);

  const isParent = hasChildren(currentUser);
  const targetId = isParent ? selectedChildId : currentUser?.id;

  // Load stored sessions once per user context
  useEffect(() => {
    let active = true;
    const loadSessions = async () => {
      const sessions = await apiClient.get<Session[]>('coach_sessions', []);
      if (active) {
        setStoredSessions(sessions);
      }
    };
    void loadSessions();
    return () => {
      active = false;
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!selectedChildId && children.length > 0) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

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
    if (!targetId) {
      return [];
    }

    const filtered = storedSessions.filter((session) => session.athleteId === targetId);
    return filtered
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .map(mapSessionToDisplay);
  }, [storedSessions, targetId]);

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
  const topSkills = useMemo(() => {
    const skillCounts = new Map<string, number>();
    for (const session of sessions) {
      const skill = session.focus;
      if (!skill) {
        continue;
      }
      skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
    }

    return Array.from(skillCounts.entries())
      .map(([skill, count]) => ({
        skill,
        level: Math.min(100, count * 20),
      }))
      .sort((a, b) => b.level - a.level)
      .slice(0, 6);
  }, [sessions]);

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
