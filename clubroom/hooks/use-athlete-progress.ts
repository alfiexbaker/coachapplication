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
import {
  progressService,
  type AthleteProgress as ProgressReport,
} from '@/services/progress-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { BadgeAward, Goal, Session, SkillProgress, User } from '@/constants/types';

const logger = createLogger('AthleteProgressScreen');

export type ProgressTabType = 'progress' | 'badges' | 'goals';

const BADGE_CATEGORY_COLORS: Record<string, string> = {
  technical: '#10B981',
  physical: '#3B82F6',
  psychological: '#F59E0B',
  social: '#F43F5E',
};
const BADGE_DEFAULT_COLOR = '#0EA5E9';

const TIER_COLORS = { GOLD: '#FFD700', SILVER: '#C0C0C0', BRONZE: '#CD7F32' };
const FITNESS_KEYWORDS = [
  'fitness',
  'stamina',
  'speed',
  'agility',
  'strength',
  'power',
  'endurance',
  'conditioning',
];
const TACTICAL_KEYWORDS = ['positioning', 'awareness', 'decision', 'vision', 'tactical'];
const MENTAL_KEYWORDS = ['focus', 'confidence', 'mindset', 'resilience', 'composure'];

function inferSkillCategory(skillName: string): string {
  const normalized = skillName.toLowerCase();
  if (FITNESS_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'Physical';
  }
  if (TACTICAL_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'Tactical';
  }
  if (MENTAL_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'Mental';
  }
  return 'Technical';
}

function mapProgressSkillsToAnalytics(skills: ProgressReport['skills']): SkillProgress[] {
  return skills.map((skill) => {
    const currentLevel = Math.max(0, Math.min(100, Math.round(skill.level * 10)));
    const previousRaw = skill.previousLevel ?? skill.level;
    const previousLevel = Math.max(0, Math.min(100, Math.round(previousRaw * 10)));
    const changePercent =
      previousLevel > 0
        ? Math.round(((currentLevel - previousLevel) / previousLevel) * 1000) / 10
        : 0;
    const history =
      skill.history.length > 0
        ? skill.history.map((entry) => ({
            date: entry.date,
            level: Math.max(0, Math.min(100, Math.round(entry.level * 10))),
          }))
        : [{ date: skill.lastUpdated, level: currentLevel }];

    return {
      skillName: skill.skill,
      category: inferSkillCategory(skill.skill),
      currentLevel,
      previousLevel,
      changePercent,
      history,
    };
  });
}

function getProgressLevelIcon(level: number): keyof typeof Ionicons.glyphMap {
  if (level >= 5) return 'trophy';
  if (level >= 3) return 'medal';
  return 'ribbon';
}

function getProgressLevelColor(level: number): string {
  if (level >= 5) return TIER_COLORS.GOLD;
  if (level >= 3) return TIER_COLORS.SILVER;
  return TIER_COLORS.BRONZE;
}

export function getBadgeColor(category?: string): string {
  return BADGE_CATEGORY_COLORS[category || ''] || BADGE_DEFAULT_COLOR;
}

export function getBadgeIcon(category?: string): keyof typeof Ionicons.glyphMap {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    technical: 'football',
    physical: 'fitness',
    psychological: 'bulb',
    social: 'people',
  };
  return icons[category || ''] || 'ribbon';
}

export function getTierColor(tier?: number): string {
  if (tier === 3) return TIER_COLORS.GOLD;
  if (tier === 2) return TIER_COLORS.SILVER;
  return TIER_COLORS.BRONZE;
}

export function useAthleteProgress() {
  const { currentUser } = useAuth();
  const [athlete, setAthlete] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [awards, setAwards] = useState<BadgeAward[]>([]);
  const [activeTab, setActiveTab] = useState<ProgressTabType>('progress');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [progress, setProgress] = useState<ProgressReport | null>(null);

  const userId = currentUser?.id;

  useEffect(() => {
    let mounted = true;

    const loadAthleteProgress = async () => {
      if (!userId) {
        if (mounted) {
          setAthlete(null);
          setSessions([]);
          setAwards([]);
          setGoals([]);
          setProgress(null);
        }
        return;
      }

      try {
        const [athleteResult, allSessions, athleteProgress, athleteAwards] = await Promise.all([
          userService.getUserById(userId),
          apiClient.get<Session[]>(STORAGE_KEYS.COACH_SESSIONS, []),
          progressService.getAthleteProgress(userId, 'athlete'),
          badgeService.listAwardsForAthlete(userId),
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
        setProgress(athleteProgress);
        setGoals(
          [...athleteProgress.activeGoals, ...athleteProgress.completedGoals].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          ),
        );
        setAwards(athleteAwards.filter((award) => award.visibility !== 'coach_only'));
      } catch (error) {
        logger.error('Failed to load athlete progress', { userId, error });
        if (mounted) {
          setAthlete(null);
          setSessions([]);
          setAwards([]);
          setGoals([]);
          setProgress(null);
        }
      }
    };

    void loadAthleteProgress();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const skills: SkillProgress[] = useMemo(
    () => (progress ? mapProgressSkillsToAnalytics(progress.skills) : []),
    [progress],
  );

  const skillsByCategory = useMemo(() => {
    const grouped: Record<string, SkillProgress[]> = {};
    skills.forEach((skill) => {
      const category = skill.category || 'General';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(skill);
    });
    return grouped;
  }, [skills]);

  const trend = useMemo(() => {
    if (progress) {
      return progress.overallTrend;
    }
    if (sessions.length < 2) return 'steady' as const;

    const sorted = [...sessions].sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    );
    const recentAvg =
      sorted.slice(0, 3).reduce((sum, s) => sum + s.performanceRating, 0) /
      Math.min(3, sorted.length);
    const previousWindow = sorted.slice(3, 6);
    const previousAvg =
      previousWindow.reduce((sum, s) => sum + s.performanceRating, 0) /
      Math.min(3, previousWindow.length || 1);
    if (sorted.length < 4) return 'steady' as const;
    if (recentAvg > previousAvg + 0.3) return 'improving' as const;
    if (recentAvg < previousAvg - 0.3) return 'declining' as const;
    return 'steady' as const;
  }, [progress, sessions]);

  const level = useMemo(() => {
    if (progress) {
      return {
        name: progress.currentLevel.name,
        icon: getProgressLevelIcon(progress.currentLevel.level),
        color: getProgressLevelColor(progress.currentLevel.level),
      };
    }

    const count = sessions.length;
    if (count >= 20) return { name: 'Gold', icon: 'trophy' as const, color: TIER_COLORS.GOLD };
    if (count >= 10) return { name: 'Silver', icon: 'medal' as const, color: TIER_COLORS.SILVER };
    return { name: 'Bronze', icon: 'ribbon' as const, color: TIER_COLORS.BRONZE };
  }, [progress, sessions.length]);

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      ),
    [sessions],
  );

  const avgRating = useMemo(() => {
    if (sessions.length > 0) {
      return (sessions.reduce((sum, s) => sum + s.performanceRating, 0) / sessions.length).toFixed(1);
    }
    if (progress) {
      return progress.averagePerformance.toFixed(1);
    }
    return '0.0';
  }, [sessions, progress]);

  const activeGoals = useMemo(() => goals.filter((goal) => goal.status === 'ACTIVE'), [goals]);
  const completedGoals = useMemo(
    () => goals.filter((goal) => goal.status === 'COMPLETED'),
    [goals],
  );

  const handleSelectTab = useCallback((tab: ProgressTabType) => {
    setActiveTab(tab);
  }, []);

  logger.debug('Athlete progress rendered', {
    athleteId: currentUser?.id,
    sessionCount: sessions.length,
    goalCount: goals.length,
    skillCount: skills.length,
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
