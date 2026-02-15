/**
 * Hook for ParentDevelopmentScreen state and data loading.
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/use-auth';
import { ensureCoachSessionsSeeded } from '@/services/coach-session-seed-service';
import { createLogger } from '@/utils/logger';
import type { BadgeAward, SkillProgress, Goal, Session } from '@/constants/types';
import { badgeService } from '@/services/badge-service';
import type { ThemeColors } from '@/hooks/useTheme';
import type { User } from '@/constants/app-types';

const logger = createLogger('ParentDevelopmentScreen');

export type DevTabType = 'progress' | 'badges' | 'goals';

export function useParentDevelopment() {
  const { currentUser, availableUsers } = useAuth();

  const userId = currentUser?.id;
  const children = useMemo<User[]>(() => {
    if (!currentUser?.children || currentUser.children.length === 0) {
      return [];
    }

    return currentUser.children.map((childRef) => {
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
  }, [availableUsers, currentUser?.children]);

  const firstChildId = children[0]?.id;

  const [selectedChildId, setSelectedChildId] = useState<string | undefined>(firstChildId);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [awards, setAwards] = useState<BadgeAward[]>([]);
  const [coachOnlyCount, setCoachOnlyCount] = useState(0);
  const [activeTab, setActiveTab] = useState<DevTabType>('progress');

  const selectedChild = children.find((c) => c.id === selectedChildId);

  useEffect(() => {
    let active = true;

    const loadSessions = async () => {
      const sessions = await ensureCoachSessionsSeeded();
      if (active) {
        setAllSessions(sessions);
      }
    };

    void loadSessions();

    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!selectedChildId && firstChildId) {
      setSelectedChildId(firstChildId);
    }
  }, [firstChildId, selectedChildId]);

  const sessions = useMemo(() => {
    return selectedChild
      ? allSessions.filter((session) => session.athleteId === selectedChild.id)
      : [];
  }, [allSessions, selectedChild]);

  const skills: SkillProgress[] = useMemo(() => {
    if (sessions.length === 0) return [];
    const skillNames = [
      'Dribbling',
      'Passing',
      'Shooting',
      'Defending',
      'Positioning',
      'First Touch',
    ];
    const categories = ['Technical', 'Technical', 'Technical', 'Physical', 'Tactical', 'Technical'];
    return skillNames.map((name, index) => ({
      skillName: name,
      category: categories[index],
      currentLevel: Math.floor(40 + Math.random() * 45),
      previousLevel: Math.floor(35 + Math.random() * 40),
      changePercent: Math.floor(-5 + Math.random() * 20),
      history: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - (6 - i) * 7 * 24 * 60 * 60 * 1000).toISOString(),
        level: Math.floor(35 + Math.random() * 50),
      })),
    }));
  }, [sessions]);

  const goals: Goal[] = useMemo(() => {
    if (!selectedChild) return [];
    return [
      {
        id: 'goal-1',
        userId: selectedChild.id,
        athleteId: selectedChild.id,
        title: 'Master 1v1 Dribbling',
        description: 'Improve close control and beat defenders consistently',
        category: 'TECHNIQUE',
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        progress: 65,
        milestones: [
          {
            id: 'm1',
            goalId: 'goal-1',
            order: 0,
            title: 'Complete 10 dribbling drills',
            isCompleted: true,
          },
          {
            id: 'm2',
            goalId: 'goal-1',
            order: 1,
            title: 'Beat defender in 5 sessions',
            isCompleted: true,
          },
          {
            id: 'm3',
            goalId: 'goal-1',
            order: 2,
            title: 'Use both feet consistently',
            isCompleted: false,
          },
        ],
        status: 'ACTIVE',
        createdBy: 'COACH',
        createdById: 'coach-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'goal-2',
        userId: selectedChild.id,
        athleteId: selectedChild.id,
        title: 'Improve Passing Accuracy',
        category: 'TECHNIQUE',
        progress: 40,
        milestones: [
          {
            id: 'm4',
            goalId: 'goal-2',
            order: 0,
            title: 'Complete passing course',
            isCompleted: true,
          },
          {
            id: 'm5',
            goalId: 'goal-2',
            order: 1,
            title: 'Achieve 80% accuracy',
            isCompleted: false,
          },
        ],
        status: 'ACTIVE',
        createdBy: 'ATHLETE',
        createdById: selectedChild.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }, [selectedChild]);

  useEffect(() => {
    if (!selectedChildId) return;
    badgeService.listAwardsForAthlete(selectedChildId).then((childAwards) => {
      const supporterVisible = childAwards.filter((award) => award.visibility !== 'coach_only');
      setAwards(supporterVisible);
      setCoachOnlyCount(childAwards.length - supporterVisible.length);
    });
  }, [selectedChildId]);

  const sharedBadges = useMemo(() => awards.filter((award) => award.shared), [awards]);

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      ),
    [sessions],
  );

  const avgRating =
    sessions.length > 0
      ? (sessions.reduce((sum, s) => sum + s.performanceRating, 0) / sessions.length).toFixed(1)
      : '0.0';

  const trend = useMemo(() => {
    if (sessions.length < 2) return 'steady' as const;
    const sorted = [...sessions].sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    );
    const recentAvg =
      sorted.slice(0, 3).reduce((sum, s) => sum + s.performanceRating, 0) /
      Math.min(3, sorted.length);
    const previousAvg =
      sorted.slice(3, 6).reduce((sum, s) => sum + s.performanceRating, 0) /
      Math.min(3, sorted.slice(3, 6).length);
    if (sorted.length < 4) return 'steady' as const;
    if (recentAvg > previousAvg + 0.3) return 'improving' as const;
    if (recentAvg < previousAvg - 0.3) return 'declining' as const;
    return 'steady' as const;
  }, [sessions]);

  const activeGoals = goals.filter((g) => g.status === 'ACTIVE');
  const completedGoals = goals.filter((g) => g.status === 'COMPLETED');

  const handleSelectChild = useCallback((childId: string) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedChildId(childId);
    logger.press('ChildTab', { childId });
  }, []);

  const handleSelectTab = useCallback((tab: DevTabType) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  }, []);

  return {
    currentUser,
    children,
    selectedChildId,
    selectedChild,
    sessions,
    sortedSessions,
    skills,
    goals,
    activeGoals,
    completedGoals,
    awards,
    sharedBadges,
    coachOnlyCount,
    activeTab,
    avgRating,
    trend,
    handleSelectChild,
    handleSelectTab,
  };
}

// Badge helpers shared across sub-components
const BADGE_CATEGORY_COLORS: Record<string, (p: ThemeColors) => string> = {
  leadership: (p) => p.accent,
  consistency: (p) => p.info,
  technique: (p) => p.success,
  mindset: (p) => p.warning,
  teamwork: (p) => p.error,
  resilience: (p) => p.destructive,
};

export function getBadgeColor(category: string | undefined, palette: ThemeColors): string {
  const getter = BADGE_CATEGORY_COLORS[category || ''];
  return getter ? getter(palette) : palette.tint;
}

export function getBadgeIcon(category?: string): string {
  const icons: Record<string, string> = {
    leadership: 'people',
    consistency: 'calendar',
    technique: 'football',
    mindset: 'bulb',
    teamwork: 'hand-left',
    resilience: 'fitness',
  };
  return icons[category || ''] || 'ribbon';
}
