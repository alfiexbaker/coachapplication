/**
 * Hook for ParentDevelopmentScreen state and data loading.
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { ensureCoachSessionsSeeded } from '@/services/coach-session-seed-service';
import {
  progressService,
  type AthleteProgress as ProgressReport,
} from '@/services/progress-service';
import { createLogger } from '@/utils/logger';
import type { BadgeAward, SkillProgress, Goal, Session } from '@/constants/types';
import { badgeService } from '@/services/badge-service';
import type { ThemeColors } from '@/hooks/useTheme';
import type { User } from '@/constants/app-types';

const logger = createLogger('ParentDevelopmentScreen');

export type DevTabType = 'progress' | 'badges' | 'goals';

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
  return skills
    .map((skill) => {
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
    })
    .sort((a, b) => b.currentLevel - a.currentLevel);
}

function buildEmptyProgressReport(): ProgressReport {
  return {
    athleteId: '__family__',
    athleteName: 'All children',
    totalSessions: 0,
    sessionsThisMonth: 0,
    averagePerformance: 0,
    averageEffort: 0,
    attendanceRate: 0,
    skills: [],
    overallTrend: 'steady',
    improvementRate: 0,
    activeGoals: [],
    completedGoals: [],
    recentFeedback: [],
    totalBadges: 0,
    recentBadges: [],
    currentLevel: { level: 0, name: 'Family' },
    totalPoints: 0,
    progressToNextLevel: 0,
  };
}

function mergeProgressReports(children: User[], reports: ProgressReport[]): ProgressReport {
  if (reports.length === 0) {
    return buildEmptyProgressReport();
  }

  const totalSessions = reports.reduce((sum, report) => sum + report.totalSessions, 0);
  const sessionsThisMonth = reports.reduce((sum, report) => sum + report.sessionsThisMonth, 0);
  const weightedDenominator = reports.reduce(
    (sum, report) => sum + Math.max(report.totalSessions, 1),
    0,
  );
  const averagePerformance =
    weightedDenominator > 0
      ? reports.reduce(
          (sum, report) =>
            sum + report.averagePerformance * Math.max(report.totalSessions, 1),
          0,
        ) / weightedDenominator
      : 0;
  const averageEffort =
    weightedDenominator > 0
      ? reports.reduce(
          (sum, report) => sum + report.averageEffort * Math.max(report.totalSessions, 1),
          0,
        ) / weightedDenominator
      : 0;
  const attendanceRate =
    weightedDenominator > 0
      ? Math.round(
          reports.reduce(
            (sum, report) => sum + report.attendanceRate * Math.max(report.totalSessions, 1),
            0,
          ) / weightedDenominator,
        )
      : 0;

  const skillAccumulator = new Map<
    string,
    {
      sample: ProgressReport['skills'][number];
      levelTotal: number;
      previousTotal: number;
      count: number;
      trendScore: number;
    }
  >();

  for (const report of reports) {
    for (const skill of report.skills) {
      const existing = skillAccumulator.get(skill.skill);
      if (!existing) {
        skillAccumulator.set(skill.skill, {
          sample: skill,
          levelTotal: skill.level,
          previousTotal: skill.previousLevel ?? skill.level,
          count: 1,
          trendScore:
            skill.trend === 'improving' ? 1 : skill.trend === 'declining' ? -1 : 0,
        });
        continue;
      }

      existing.levelTotal += skill.level;
      existing.previousTotal += skill.previousLevel ?? skill.level;
      existing.count += 1;
      existing.trendScore +=
        skill.trend === 'improving' ? 1 : skill.trend === 'declining' ? -1 : 0;
      const combinedHistory = [...existing.sample.history, ...skill.history]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 20);
      existing.sample = {
        ...skill,
        history: combinedHistory,
        lastUpdated:
          new Date(skill.lastUpdated).getTime() > new Date(existing.sample.lastUpdated).getTime()
            ? skill.lastUpdated
            : existing.sample.lastUpdated,
      };
    }
  }

  const mergedSkills = Array.from(skillAccumulator.entries())
    .map(([, value]) => {
      const averageLevel = value.levelTotal / value.count;
      const averagePrevious = value.previousTotal / value.count;
      const trend: ProgressReport['skills'][number]['trend'] =
        value.trendScore > 0 ? 'improving' : value.trendScore < 0 ? 'declining' : 'steady';
      return {
        ...value.sample,
        level: Number(averageLevel.toFixed(1)),
        previousLevel: Number(averagePrevious.toFixed(1)),
        trend,
      };
    })
    .sort((a, b) => b.level - a.level);

  const improvingSkills = mergedSkills.filter((skill) => skill.trend === 'improving').length;
  const decliningSkills = mergedSkills.filter((skill) => skill.trend === 'declining').length;
  let overallTrend: ProgressReport['overallTrend'] = 'steady';
  if (improvingSkills > decliningSkills + 1) {
    overallTrend = 'improving';
  } else if (decliningSkills > improvingSkills + 1) {
    overallTrend = 'declining';
  }

  const goalsById = new Map<string, Goal>();
  for (const report of reports) {
    for (const goal of report.activeGoals) {
      goalsById.set(goal.id, goal);
    }
    for (const goal of report.completedGoals) {
      goalsById.set(goal.id, goal);
    }
  }
  const allGoals = Array.from(goalsById.values());
  const activeGoals = allGoals
    .filter((goal) => goal.status === 'ACTIVE')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const completedGoals = allGoals
    .filter((goal) => goal.status === 'COMPLETED')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const recentFeedback = reports
    .flatMap((report) => report.recentFeedback)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const totalBadges = reports.reduce((sum, report) => sum + report.totalBadges, 0);
  const recentBadges = reports
    .flatMap((report) => report.recentBadges)
    .sort((a, b) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime())
    .slice(0, 5);

  const totalPoints = reports.reduce((sum, report) => sum + report.totalPoints, 0);
  const averageLevel =
    reports.length > 0
      ? Math.round(
          reports.reduce((sum, report) => sum + report.currentLevel.level, 0) / reports.length,
        )
      : 0;
  const averageProgressToNext =
    reports.length > 0
      ? Math.round(
          reports.reduce((sum, report) => sum + report.progressToNextLevel, 0) / reports.length,
        )
      : 0;

  return {
    athleteId: '__family__',
    athleteName: children.length > 1 ? 'All children' : children[0]?.name || 'Athlete',
    totalSessions,
    sessionsThisMonth,
    averagePerformance: Number(averagePerformance.toFixed(1)),
    averageEffort: Number(averageEffort.toFixed(1)),
    attendanceRate,
    skills: mergedSkills,
    overallTrend,
    improvementRate:
      mergedSkills.length > 0 ? Math.round((improvingSkills / mergedSkills.length) * 100) : 0,
    activeGoals,
    completedGoals,
    recentFeedback,
    totalBadges,
    recentBadges,
    currentLevel: { level: averageLevel, name: 'Family' },
    totalPoints,
    progressToNextLevel: averageProgressToNext,
  };
}

export function useParentDevelopment() {
  const { currentUser } = useAuth();
  const {
    children: contextChildren,
    activeChildId: contextActiveChildId,
    setActiveChildId,
  } = useChildContext();

  const userId = currentUser?.id;
  const children = useMemo<User[]>(
    () =>
      contextChildren.map((c) => ({
        id: c.id,
        name: c.name,
        email: '',
        role: 'USER' as const,
        postcode: '',
        dateOfBirth: c.dateOfBirth || '',
        avatar: c.avatarUrl ?? undefined,
      })),
    [contextChildren],
  );

  const selectedChildId = useMemo(() => {
    if (children.length === 1) {
      return children[0].id;
    }
    return contextActiveChildId;
  }, [children, contextActiveChildId]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [progress, setProgress] = useState<ProgressReport | null>(null);
  const [awards, setAwards] = useState<BadgeAward[]>([]);
  const [coachOnlyCount, setCoachOnlyCount] = useState(0);
  const [activeTab, setActiveTab] = useState<DevTabType>('progress');

  const selectedChild = useMemo(
    () => children.find((c) => c.id === selectedChildId),
    [children, selectedChildId],
  );
  const isAllChildrenSelected = children.length > 1 && selectedChildId === null;
  const childNameById = useMemo<Record<string, string>>(
    () =>
      children.reduce<Record<string, string>>((acc, child) => {
        acc[child.id] = child.name;
        return acc;
      }, {}),
    [children],
  );

  useEffect(() => {
    let active = true;

    const loadSessions = async () => {
      try {
        const sessions = await ensureCoachSessionsSeeded();
        if (active) {
          setAllSessions(sessions);
        }
      } catch (error) {
        logger.error('Failed to load sessions for parent development', { userId, error });
        if (active) {
          setAllSessions([]);
        }
      }
    };

    void loadSessions();

    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (children.length === 1 && selectedChildId !== children[0].id) {
      void setActiveChildId(children[0].id);
    }
  }, [children, selectedChildId, setActiveChildId]);

  const sessions = useMemo(() => {
    if (children.length === 0) {
      return [];
    }

    if (selectedChildId) {
      return allSessions.filter((session) => session.athleteId === selectedChildId);
    }

    const childIds = new Set(children.map((child) => child.id));
    return allSessions.filter((session) => childIds.has(session.athleteId));
  }, [allSessions, children, selectedChildId]);

  useEffect(() => {
    let active = true;

    const loadChildDevelopment = async () => {
      if (children.length === 0) {
        if (active) {
          setProgress(null);
          setAwards([]);
          setCoachOnlyCount(0);
        }
        return;
      }

      try {
        if (selectedChildId) {
          const [childProgress, childAwards] = await Promise.all([
            progressService.getAthleteProgress(selectedChildId, 'parent'),
            badgeService.listAwardsForAthlete(selectedChildId),
          ]);

          if (!active) return;

          childProgress.athleteName = childNameById[selectedChildId] || childProgress.athleteName;
          const supporterVisible = childAwards.filter((award) => award.visibility !== 'coach_only');
          setProgress(childProgress);
          setAwards(supporterVisible);
          setCoachOnlyCount(childAwards.length - supporterVisible.length);

          logger.info('Parent development loaded', {
            scope: selectedChildId,
            sessions: childProgress.totalSessions,
            skills: childProgress.skills.length,
            goals: childProgress.activeGoals.length + childProgress.completedGoals.length,
            badgesVisible: supporterVisible.length,
          });
          return;
        }

        const childIds = children.map((child) => child.id);
        const childResults = await Promise.all(
          childIds.map(async (childId) => {
            const [childProgress, childAwards] = await Promise.all([
              progressService.getAthleteProgress(childId, 'parent'),
              badgeService.listAwardsForAthlete(childId),
            ]);
            childProgress.athleteName = childNameById[childId] || childProgress.athleteName;
            return { childProgress, childAwards };
          }),
        );

        if (!active) return;

        const mergedProgress = mergeProgressReports(
          children,
          childResults.map((result) => result.childProgress),
        );
        const allAwards = childResults.flatMap((result) => result.childAwards);
        const supporterVisible = allAwards
          .filter((award) => award.visibility !== 'coach_only')
          .sort((a, b) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime());

        setProgress(mergedProgress);
        setAwards(supporterVisible);
        setCoachOnlyCount(allAwards.length - supporterVisible.length);

        logger.info('Parent family development loaded', {
          scope: 'all_children',
          childCount: childIds.length,
          sessions: mergedProgress.totalSessions,
          skills: mergedProgress.skills.length,
          goals: mergedProgress.activeGoals.length + mergedProgress.completedGoals.length,
          badgesVisible: supporterVisible.length,
        });
      } catch (error) {
        logger.error('Failed to load parent development data', {
          scope: selectedChildId ?? 'all_children',
          error,
        });
        if (active) {
          setProgress(null);
          setAwards([]);
          setCoachOnlyCount(0);
        }
      }
    };

    void loadChildDevelopment();

    return () => {
      active = false;
    };
  }, [children, childNameById, selectedChildId]);

  const skills = useMemo<SkillProgress[]>(
    () => (progress ? mapProgressSkillsToAnalytics(progress.skills) : []),
    [progress],
  );

  const goals: Goal[] = useMemo(() => {
    if (!progress) return [];
    return [...progress.activeGoals, ...progress.completedGoals].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [progress]);

  const sharedBadges = useMemo(
    () => awards.filter((award) => award.shared || award.visibility === 'supporters'),
    [awards],
  );

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

  const trend = useMemo(() => {
    if (progress) return progress.overallTrend;
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
  }, [progress, sessions]);

  const activeGoals = useMemo<Goal[]>(
    () => (progress ? progress.activeGoals : goals.filter((goal) => goal.status === 'ACTIVE')),
    [goals, progress],
  );
  const completedGoals = useMemo<Goal[]>(
    () =>
      progress ? progress.completedGoals : goals.filter((goal) => goal.status === 'COMPLETED'),
    [goals, progress],
  );

  const handleSelectChild = useCallback(
    (childId: string | null) => {
      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      void setActiveChildId(childId);
      logger.press('ChildTab', { childId: childId ?? 'all_children' });
    },
    [setActiveChildId],
  );

  const handleSelectTab = useCallback((tab: DevTabType) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  }, []);

  return {
    currentUser,
    children,
    selectedChildId,
    selectedChild,
    isAllChildrenSelected,
    childNameById,
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
  technical: (p) => p.success,
  physical: (p) => p.info,
  psychological: (p) => p.warning,
  social: (p) => p.accent,
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
    technical: 'football',
    physical: 'fitness',
    psychological: 'bulb',
    social: 'people',
    leadership: 'people',
    consistency: 'calendar',
    technique: 'football',
    mindset: 'bulb',
    teamwork: 'hand-left',
    resilience: 'fitness',
  };
  return icons[category || ''] || 'ribbon';
}
