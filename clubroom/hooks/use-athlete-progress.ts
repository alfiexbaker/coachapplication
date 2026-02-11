/**
 * useAthleteProgress — State, data loading, and computed values for athlete progress screen.
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import { badgeService } from '@/services/badge-service';
import { apiClient } from '@/services/api-client';
import { userService } from '@/services/user-service';
import type { BadgeAward, Goal, Session, SkillProgress, User } from '@/constants/types';

const logger = createLogger('AthleteProgressScreen');

export type ProgressTabType = 'progress' | 'badges' | 'goals';

// Decorative: categorical badge colors for distinct visual identification
const BADGE_CATEGORY_COLORS: Record<string, string> = {
  leadership: '#8B5CF6',
  consistency: '#3B82F6',
  technique: '#10B981',
  mindset: '#F59E0B',
  teamwork: '#EC4899',
  resilience: '#EF4444',
};
const BADGE_DEFAULT_COLOR = '#6366F1'; // Decorative: fallback badge color

export function getBadgeColor(category?: string): string {
  return BADGE_CATEGORY_COLORS[category || ''] || BADGE_DEFAULT_COLOR;
}

export function getBadgeIcon(category?: string): keyof typeof Ionicons.glyphMap {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    leadership: 'people',
    consistency: 'calendar',
    technique: 'football',
    mindset: 'bulb',
    teamwork: 'hand-left',
    resilience: 'fitness',
  };
  return icons[category || ''] || 'ribbon';
}

// Decorative: metallic tier colors (gold/silver/bronze)
const TIER_COLORS = { GOLD: '#FFD700', SILVER: '#C0C0C0', BRONZE: '#CD7F32' };

export function getTierColor(tier?: number): string {
  if (tier === 3) return TIER_COLORS.GOLD;
  if (tier === 2) return TIER_COLORS.SILVER;
  return TIER_COLORS.BRONZE;
}

function generateMockSkills(sessions: { id: string }[]): SkillProgress[] {
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
}

function getMockGoals(athleteId: string): Goal[] {
  return [
    {
      id: 'goal-1',
      userId: athleteId,
      athleteId,
      title: 'Master 1v1 Dribbling',
      description: 'Improve close control and beat defenders consistently in 1v1 situations',
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
          completedAt: new Date().toISOString(),
        },
        {
          id: 'm2',
          goalId: 'goal-1',
          order: 1,
          title: 'Successfully beat defender in 5 sessions',
          isCompleted: true,
        },
        {
          id: 'm3',
          goalId: 'goal-1',
          order: 2,
          title: 'Use both feet consistently',
          isCompleted: false,
        },
        {
          id: 'm4',
          goalId: 'goal-1',
          order: 3,
          title: 'Apply in match situation',
          isCompleted: false,
        },
      ],
      status: 'ACTIVE',
      createdBy: 'COACH',
      createdById: 'coach-1',
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'goal-2',
      userId: athleteId,
      athleteId,
      title: 'Improve Passing Accuracy',
      description: 'Increase passing accuracy to 85% in training sessions',
      category: 'TECHNIQUE',
      targetDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 40,
      milestones: [
        {
          id: 'm5',
          goalId: 'goal-2',
          order: 0,
          title: 'Complete passing fundamentals course',
          isCompleted: true,
        },
        {
          id: 'm6',
          goalId: 'goal-2',
          order: 1,
          title: 'Practice weighted passes daily',
          isCompleted: false,
        },
        {
          id: 'm7',
          goalId: 'goal-2',
          order: 2,
          title: 'Achieve 80% accuracy in drills',
          isCompleted: false,
        },
      ],
      status: 'ACTIVE',
      createdBy: 'ATHLETE',
      createdById: athleteId,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'goal-3',
      userId: athleteId,
      athleteId,
      title: 'First Touch Control',
      description: 'Control the ball within one touch consistently',
      category: 'TECHNIQUE',
      progress: 100,
      milestones: [
        { id: 'm8', goalId: 'goal-3', order: 0, title: 'Practice wall passes', isCompleted: true },
        {
          id: 'm9',
          goalId: 'goal-3',
          order: 1,
          title: 'Receive and turn drill mastery',
          isCompleted: true,
        },
      ],
      status: 'COMPLETED',
      createdBy: 'COACH',
      createdById: 'coach-1',
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

export function useAthleteProgress() {
  const { currentUser } = useAuth();
  const [athlete, setAthlete] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [awards, setAwards] = useState<BadgeAward[]>([]);
  const [activeTab, setActiveTab] = useState<ProgressTabType>('progress');
  const [goals, setGoals] = useState<Goal[]>([]);

  const userId = currentUser?.id;

  useEffect(() => {
    let mounted = true;

    const loadAthleteAndSessions = async () => {
      if (!userId) {
        if (mounted) {
          setAthlete(null);
          setSessions([]);
        }
        return;
      }

      try {
        const [athleteResult, allSessions] = await Promise.all([
          userService.getUserById(userId),
          apiClient.get<Session[]>('coach_sessions', []),
        ]);

        if (!mounted) {
          return;
        }

        if (athleteResult.success) {
          setAthlete(athleteResult.data);
        } else {
          logger.error('Failed to load athlete profile', { userId, error: athleteResult.error });
          setAthlete(null);
        }

        setSessions(allSessions.filter((session) => session.athleteId === userId));
      } catch (error) {
        logger.error('Failed to load athlete sessions', { userId, error });
        if (mounted) {
          setAthlete(null);
          setSessions([]);
        }
      }
    };

    loadAthleteAndSessions();

    return () => {
      mounted = false;
    };
  }, [userId]);

  useEffect(() => {
    if (userId) {
      badgeService.listAwardsForAthlete(userId).then(setAwards);
      setGoals(getMockGoals(userId));
    }
  }, [userId]);

  const skills: SkillProgress[] = useMemo(() => generateMockSkills(sessions), [sessions]);

  const skillsByCategory = useMemo(() => {
    const grouped: Record<string, SkillProgress[]> = {};
    skills.forEach((skill) => {
      const cat = skill.category || 'General';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(skill);
    });
    return grouped;
  }, [skills]);

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

  const level = useMemo(() => {
    const count = sessions.length;
    if (count >= 20) return { name: 'Gold', icon: 'trophy' as const, color: '#FFD700' }; // Decorative: gold tier
    if (count >= 10) return { name: 'Silver', icon: 'medal' as const, color: '#C0C0C0' }; // Decorative: silver tier
    return { name: 'Bronze', icon: 'ribbon' as const, color: '#CD7F32' }; // Decorative: bronze tier
  }, [sessions.length]);

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      ),
    [sessions],
  );

  const avgRating = useMemo(
    () =>
      sessions.length > 0
        ? (sessions.reduce((sum, s) => sum + s.performanceRating, 0) / sessions.length).toFixed(1)
        : '0.0',
    [sessions],
  );

  const activeGoals = useMemo(() => goals.filter((g) => g.status === 'ACTIVE'), [goals]);
  const completedGoals = useMemo(() => goals.filter((g) => g.status === 'COMPLETED'), [goals]);

  const handleSelectTab = useCallback((tab: ProgressTabType) => {
    setActiveTab(tab);
  }, []);

  logger.debug('Athlete progress rendered', {
    athleteId: currentUser?.id,
    sessionCount: sessions.length,
    trend,
    level: level.name,
  });

  return {
    currentUser,
    athlete,
    sessions,
    skills,
    skillsByCategory,
    awards,
    activeGoals,
    completedGoals,
    activeTab,
    trend,
    level,
    sortedSessions,
    avgRating,
    handleSelectTab,
  };
}
