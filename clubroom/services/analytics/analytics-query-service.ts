/**
 * Analytics Query Service
 *
 * Handles querying and aggregation of athlete analytics data.
 * Provides read-only access to analytics, skill history, goals,
 * and skill comparison data.
 *
 * API Integration Notes:
 * - GET /v1/athletes/:id/goals - Get backend-authoritative goals
 * - Athlete analytics and skill history need dedicated /v1 contracts before API mode can use them.
 */

import { apiClient, apiFetch } from '../api-client';
import type { AthleteAnalytics, SkillProgress, Goal } from '@/constants/types';
import { progressFeedbackService } from '@/services/progress/progress-feedback-service';
import type { AthleteSkillLevels } from '@/services/progress/progress-skills-service';
import type { Session } from '@/constants/app-types';
import type { FootballSkill } from '@/types/progress-types';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
  toApiAthleteId,
} from '@/services/api-auth-context';
import { createLogger } from '@/utils/logger';
import { api } from '@/constants/config';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  storageError,
  unsupportedError,
} from '@/types/result';

const logger = createLogger('AnalyticsQueryService');

const USE_MOCK = api.useMock;

export type AnalyticsPeriod = 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR' | 'ALL';

interface ApiAthleteGoalsResponse {
  athleteId: string;
  goals: ApiGoalRow[];
  milestones: ApiGoalMilestoneRow[];
}

type ApiGoalRow = Partial<Omit<Goal, 'milestones'>> & {
  id?: string | null;
  userId?: string | null;
  athleteId?: string | null;
  title?: string | null;
  description?: string | null;
  notes?: string | null;
  category?: string | null;
  targetDate?: string | null;
  status?: string | null;
  progress?: number | null;
  createdBy?: string | null;
  createdById?: string | null;
  ownerUserId?: string | null;
  creatorUserId?: string | null;
  createdByUserId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ApiGoalMilestoneRow = Partial<Goal['milestones'][number]> & {
  id?: string | null;
  goalId?: string | null;
  title?: string | null;
  isCompleted?: boolean | null;
  completedAt?: string | null;
  order?: number | null;
  sortOrder?: number | null;
  status?: string | null;
};

function athleteAnalyticsUnsupportedError(action: string, details?: unknown): ServiceError {
  return unsupportedError(
    `${action} needs a /v1 athlete analytics API before it can run in API mode.`,
    details,
  );
}

function unsupportedAthleteAnalytics<T>(
  action: string,
  details?: unknown,
): Result<T, ServiceError> {
  logger.warn('Athlete analytics API unavailable in live API mode', {
    action,
    details,
    requiredRoutes: [
      'GET /v1/athletes/:athleteId/analytics',
      'GET /v1/athletes/:athleteId/skills/history',
    ],
  });
  return err(athleteAnalyticsUnsupportedError(action, details));
}

async function resolveAthleteGoalsApiContext(
  athleteId: string,
): Promise<Result<{ apiAthleteId: string; headers: Record<string, string> }, ServiceError>> {
  const currentUserResult = await resolveSignedInApiUser('Sign in to view athlete goals.');
  if (!currentUserResult.success) {
    return currentUserResult;
  }

  const currentUser = currentUserResult.data;
  const apiAthleteId = toApiAthleteId(athleteId);
  const actingRole = deriveApiActingRole(currentUser);
  return ok({
    apiAthleteId,
    headers: buildApiAuthHeaders({
      actingRole,
      coachAthleteIds: actingRole === 'coach' ? [apiAthleteId] : undefined,
      guardianAthleteIds: actingRole === 'parent' ? [apiAthleteId] : undefined,
      coachVerified: actingRole === 'coach' && currentUser.isVerified,
    }),
  });
}

function isGoalStatus(value: unknown): value is Goal['status'] {
  return value === 'ACTIVE' || value === 'COMPLETED' || value === 'PAUSED' || value === 'ABANDONED';
}

function toGoalCategory(value: unknown): Goal['category'] {
  if (value === 'Technical') return 'BALL_SKILLS';
  if (value === 'Attacking') return 'ATTACKING';
  if (value === 'Defending') return 'DEFENDING';
  if (value === 'Tactical') return 'GAME_SENSE';
  if (value === 'Character') return 'CHARACTER';
  if (
    value === 'BALL_SKILLS' ||
    value === 'ATTACKING' ||
    value === 'DEFENDING' ||
    value === 'GAME_SENSE' ||
    value === 'CHARACTER' ||
    value === 'OTHER'
  ) {
    return value;
  }
  return 'OTHER';
}

function toGoalCreator(value: unknown): Goal['createdBy'] {
  if (value === 'COACH' || value === 'ATHLETE' || value === 'PARENT') {
    return value;
  }
  return 'COACH';
}

function mapApiMilestone(
  row: ApiGoalMilestoneRow,
  fallbackGoalId: string,
): Goal['milestones'][number] | null {
  if (!row.id) {
    return null;
  }
  return {
    id: row.id,
    goalId: row.goalId ?? fallbackGoalId,
    title: row.title ?? 'Milestone',
    isCompleted: row.isCompleted === true || row.status === 'COMPLETED',
    completedAt: row.completedAt ?? undefined,
    order:
      typeof row.order === 'number'
        ? row.order
        : typeof row.sortOrder === 'number'
          ? row.sortOrder
          : 0,
  };
}

function mapApiGoal(
  row: ApiGoalRow,
  milestones: ApiGoalMilestoneRow[],
  fallbackAthleteId: string,
): Goal | null {
  if (!row.id) {
    return null;
  }

  const goalId = row.id;
  const athleteId = row.athleteId ?? row.userId ?? fallbackAthleteId;
  const mappedMilestones = milestones
    .filter((milestone) => milestone.goalId === goalId)
    .flatMap((milestone) => {
      const mapped = mapApiMilestone(milestone, goalId);
      return mapped ? [mapped] : [];
    })
    .sort((a, b) => a.order - b.order);
  const completedMilestones = mappedMilestones.filter((milestone) => milestone.isCompleted).length;
  const derivedProgress =
    mappedMilestones.length > 0
      ? Math.round((completedMilestones / mappedMilestones.length) * 100)
      : row.status === 'COMPLETED'
        ? 100
        : 0;
  return {
    id: goalId,
    userId: row.userId ?? row.ownerUserId ?? athleteId,
    athleteId,
    title: row.title ?? 'Goal',
    description: row.description ?? row.notes ?? undefined,
    category: toGoalCategory(row.category),
    linkedSkill: row.linkedSkill ?? undefined,
    targetLevel: row.targetLevel ?? undefined,
    targetDate: row.targetDate ?? undefined,
    status: isGoalStatus(row.status) ? row.status : 'ACTIVE',
    progress: typeof row.progress === 'number' ? row.progress : derivedProgress,
    milestones: mappedMilestones,
    createdBy: toGoalCreator(row.createdBy),
    createdById: row.createdById ?? row.creatorUserId ?? row.createdByUserId ?? '',
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? row.createdAt ?? new Date().toISOString(),
    coachVerified: row.coachVerified,
    coachVerifiedAt: row.coachVerifiedAt,
    parentAcknowledged: row.parentAcknowledged,
    parentAcknowledgedAt: row.parentAcknowledgedAt,
  };
}

function normalizeAnalyticsSkill(skill: string): FootballSkill {
  if (skill === 'Dribbling') return 'Dribbling & Skills';
  if (skill === 'Defending') return '1v1 Defending';
  if (skill === 'Conditioning') return 'Work Rate';
  if (skill === 'Goalkeeping') return 'Shot Stopping';
  return skill as FootballSkill;
}

// ============================================================================
// MOCK DATA (shared references for query operations)
// ============================================================================

const MOCK_ANALYTICS: AthleteAnalytics[] = [
  {
    athleteId: 'athlete_1',
    period: 'MONTH',
    totalSessions: 24,
    sessionsThisPeriod: 8,
    averageSessionRating: 4.5,
    attendanceRate: 95,
    skills: [
      {
        skillName: 'Dribbling & Skills',
        category: 'Technical',
        currentLevel: 72,
        previousLevel: 65,
        changePercent: 10.8,
        history: [
          { date: '2025-10-01', level: 58 },
          { date: '2025-11-01', level: 62 },
          { date: '2025-12-01', level: 65 },
          { date: '2026-01-01', level: 72 },
        ],
      },
      {
        skillName: 'Passing',
        category: 'Technical',
        currentLevel: 68,
        previousLevel: 64,
        changePercent: 6.3,
        history: [
          { date: '2025-10-01', level: 55 },
          { date: '2025-11-01', level: 60 },
          { date: '2025-12-01', level: 64 },
          { date: '2026-01-01', level: 68 },
        ],
      },
      {
        skillName: 'Finishing',
        category: 'Technical',
        currentLevel: 58,
        previousLevel: 52,
        changePercent: 11.5,
        history: [
          { date: '2025-10-01', level: 42 },
          { date: '2025-11-01', level: 48 },
          { date: '2025-12-01', level: 52 },
          { date: '2026-01-01', level: 58 },
        ],
      },
      {
        skillName: '1v1 Defending',
        category: 'Tactical',
        currentLevel: 45,
        previousLevel: 45,
        changePercent: 0,
        history: [
          { date: '2025-10-01', level: 40 },
          { date: '2025-11-01', level: 42 },
          { date: '2025-12-01', level: 45 },
          { date: '2026-01-01', level: 45 },
        ],
      },
      {
        skillName: 'Work Rate',
        category: 'Physical',
        currentLevel: 75,
        previousLevel: 70,
        changePercent: 7.1,
        history: [
          { date: '2025-10-01', level: 60 },
          { date: '2025-11-01', level: 65 },
          { date: '2025-12-01', level: 70 },
          { date: '2026-01-01', level: 75 },
        ],
      },
    ],
    activeGoals: [],
    completedGoals: [],
    improvementRate: 8.9,
    consistencyScore: 85,
    percentileRank: 78,
    lastSessionDate: '2026-01-08',
    nextSessionDate: '2026-01-15',
  },
];

const MOCK_GOALS: Goal[] = [
  {
    id: 'goal_1',
    userId: 'athlete_1',
    athleteId: 'athlete_1',
    title: 'Master weak foot finishing',
    description: 'Be confident shooting with left foot from inside the box',
    category: 'BALL_SKILLS',
    targetDate: '2026-03-01',
    progress: 45,
    milestones: [
      {
        id: 'ms_1',
        goalId: 'goal_1',
        title: 'Complete 5 weak foot drills',
        isCompleted: true,
        completedAt: '2025-12-15',
        order: 0,
      },
      {
        id: 'ms_2',
        goalId: 'goal_1',
        title: 'Score 3 goals in training with weak foot',
        isCompleted: true,
        completedAt: '2026-01-05',
        order: 1,
      },
      {
        id: 'ms_3',
        goalId: 'goal_1',
        title: 'Score weak foot goal in match',
        isCompleted: false,
        order: 2,
      },
      {
        id: 'ms_4',
        goalId: 'goal_1',
        title: 'Consistent accuracy from 15 yards',
        isCompleted: false,
        order: 3,
      },
    ],
    status: 'ACTIVE',
    createdBy: 'COACH',
    createdById: 'coach1',
    createdAt: '2025-11-01T10:00:00Z',
    updatedAt: '2026-01-05T14:00:00Z',
  },
  {
    id: 'goal_2',
    userId: 'athlete_1',
    athleteId: 'athlete_1',
    title: 'Improve first touch under pressure',
    description: 'Control the ball cleanly when defenders are close',
    category: 'BALL_SKILLS',
    targetDate: '2026-02-15',
    progress: 70,
    milestones: [
      {
        id: 'ms_5',
        goalId: 'goal_2',
        title: 'Practice receiving drills for 4 weeks',
        isCompleted: true,
        completedAt: '2025-12-20',
        order: 0,
      },
      {
        id: 'ms_6',
        goalId: 'goal_2',
        title: 'Demonstrate in 1v1 scenarios',
        isCompleted: true,
        completedAt: '2026-01-03',
        order: 1,
      },
      {
        id: 'ms_7',
        goalId: 'goal_2',
        title: 'Apply in match situations',
        isCompleted: false,
        order: 2,
      },
    ],
    status: 'ACTIVE',
    createdBy: 'COACH',
    createdById: 'coach1',
    createdAt: '2025-11-15T09:00:00Z',
    updatedAt: '2026-01-03T16:00:00Z',
  },
  {
    id: 'goal_3',
    userId: 'athlete_1',
    athleteId: 'athlete_1',
    title: 'Complete 10 consecutive sessions',
    description: 'Build consistency and commitment',
    category: 'CHARACTER',
    targetDate: '2025-12-31',
    progress: 100,
    milestones: [
      {
        id: 'ms_8',
        goalId: 'goal_3',
        title: '5 sessions',
        isCompleted: true,
        completedAt: '2025-11-20',
        order: 0,
      },
      {
        id: 'ms_9',
        goalId: 'goal_3',
        title: '8 sessions',
        isCompleted: true,
        completedAt: '2025-12-10',
        order: 1,
      },
      {
        id: 'ms_10',
        goalId: 'goal_3',
        title: '10 sessions',
        isCompleted: true,
        completedAt: '2025-12-28',
        order: 2,
      },
    ],
    status: 'COMPLETED',
    createdBy: 'ATHLETE',
    createdById: 'athlete_1',
    createdAt: '2025-10-15T11:00:00Z',
    updatedAt: '2025-12-28T17:00:00Z',
  },
];

// ============================================================================
// STORAGE HELPERS
// ============================================================================

let analyticsCache: AthleteAnalytics[] = [...MOCK_ANALYTICS];
let goalsCache: Goal[] = [...MOCK_GOALS];

async function loadAnalytics(): Promise<AthleteAnalytics[]> {
  try {
    const stored = await apiClient.get<AthleteAnalytics[] | null>(
      STORAGE_KEYS.ATHLETE_ANALYTICS,
      null,
    );
    if (stored) return stored;
  } catch (error) {
    logger.error('Failed to load analytics', error);
  }
  return [...MOCK_ANALYTICS];
}

async function loadGoals(): Promise<Goal[]> {
  try {
    const storedUnified = await apiClient.get<Goal[] | null>(STORAGE_KEYS.GOALS, null);
    if (storedUnified && storedUnified.length > 0) {
      return storedUnified;
    }

    const storedLegacy = await apiClient.get<Goal[] | null>(STORAGE_KEYS.ATHLETE_GOALS, null);
    if (storedLegacy && storedLegacy.length > 0) {
      await apiClient.set(STORAGE_KEYS.GOALS, storedLegacy);
      return storedLegacy;
    }
  } catch (error) {
    logger.error('Failed to load goals', error);
  }
  return [...MOCK_GOALS];
}

/**
 * Build AthleteAnalytics from feedback-service and SKILL_LEVELS data.
 * Returns null if no real data exists for this athlete.
 */
async function buildRealAthleteAnalytics(
  athleteId: string,
  period: AnalyticsPeriod,
): Promise<AthleteAnalytics | null> {
  const [athleteFeedback, allSkillLevels, allSessions] = await Promise.all([
    progressFeedbackService.getFeedbackForAthlete(athleteId, 'athlete'),
    apiClient.get<Record<string, AthleteSkillLevels>>(STORAGE_KEYS.SKILL_LEVELS, {}),
    apiClient.get<Session[]>(STORAGE_KEYS.COACH_SESSIONS, []),
  ]);

  const athleteSkills = allSkillLevels[athleteId];

  // If no real data exists, return null so caller can fall back
  if (athleteFeedback.length === 0 && !athleteSkills) {
    return null;
  }

  // Build skill progress from SKILL_LEVELS
  const skills: SkillProgress[] = [];
  if (athleteSkills) {
    for (const [, skillData] of Object.entries(athleteSkills.skills)) {
      // Scale 1-10 skill level to 0-100 for display
      const currentLevel = Math.round(skillData.level * 10);
      const previousLevel = skillData.previousLevel
        ? Math.round(skillData.previousLevel * 10)
        : currentLevel;
      const changePercent =
        previousLevel > 0
          ? Math.round(((currentLevel - previousLevel) / previousLevel) * 1000) / 10
          : 0;

      skills.push({
        skillName: normalizeAnalyticsSkill(skillData.skill),
        category: 'Technical',
        currentLevel,
        previousLevel,
        changePercent,
        history: skillData.history.map((h) => ({
          date: h.date.split('T')[0],
          level: Math.round(h.level * 10),
        })),
      });
    }
  }

  // Calculate session stats from feedback
  const totalSessions = athleteFeedback.length;
  const avgRating =
    totalSessions > 0
      ? athleteFeedback.reduce((sum, f) => sum + f.overallPerformance, 0) / totalSessions
      : 0;

  // Calculate attendance rate from actual COACH_SESSIONS records
  const athleteSessions = allSessions.filter((s) => s.athleteId === athleteId);
  const sessionsWithAttendance = athleteSessions.filter((s) => Boolean(s.attendance));
  const attendedCount = sessionsWithAttendance.filter((s) => s.attendance === 'ATTENDED').length;
  const attendanceRate =
    sessionsWithAttendance.length > 0
      ? Math.round((attendedCount / sessionsWithAttendance.length) * 100)
      : totalSessions > 0
        ? 100
        : 0;

  // Calculate improvement rate from skill trends
  const improvingSkills = skills.filter((s) => s.changePercent > 0).length;
  const improvementRate =
    skills.length > 0 ? Math.round((improvingSkills / skills.length) * 100) : 0;

  return {
    athleteId,
    period,
    totalSessions,
    sessionsThisPeriod: totalSessions,
    averageSessionRating: Math.round(avgRating * 10) / 10,
    attendanceRate,
    skills,
    activeGoals: [],
    completedGoals: [],
    improvementRate,
    consistencyScore: Math.min(100, totalSessions * 10),
    percentileRank: 50,
    lastSessionDate: athleteFeedback[0]?.createdAt?.split('T')[0],
  };
}

// ============================================================================
// ANALYTICS QUERY SERVICE
// ============================================================================

export const analyticsQueryService = {
  /**
   * Get analytics for an athlete
   */
  async getAthleteAnalytics(
    athleteId: string,
    period: AnalyticsPeriod = 'MONTH',
  ): Promise<Result<AthleteAnalytics | null, ServiceError>> {
    try {
      if (USE_MOCK) {
        // Try real data first (from session completions)
        const realAnalytics = await buildRealAthleteAnalytics(athleteId, period);

        // Load goals (real or mock)
        goalsCache = await loadGoals();
        const activeGoals = goalsCache.filter(
          (g) => g.athleteId === athleteId && g.status === 'ACTIVE',
        );
        const completedGoals = goalsCache.filter(
          (g) => g.athleteId === athleteId && g.status === 'COMPLETED',
        );

        if (realAnalytics) {
          return ok({
            ...realAnalytics,
            activeGoals,
            completedGoals,
          });
        }

        // Fall back to cached/mock analytics
        analyticsCache = await loadAnalytics();
        const cachedAnalytics = analyticsCache.find((a) => a.athleteId === athleteId);
        if (cachedAnalytics) {
          return ok({
            ...cachedAnalytics,
            period,
            activeGoals,
            completedGoals,
          });
        }

        // Return empty state for unknown athletes
        return ok({
          athleteId,
          period,
          totalSessions: 0,
          sessionsThisPeriod: 0,
          averageSessionRating: 0,
          attendanceRate: 0,
          skills: [],
          activeGoals,
          completedGoals,
          improvementRate: 0,
          consistencyScore: 0,
          percentileRank: 50,
        });
      }

      return unsupportedAthleteAnalytics('Athlete analytics read', { athleteId, period });
    } catch (error) {
      logger.error('Failed to get athlete analytics', { athleteId, period, error });
      return err(storageError('Failed to load athlete analytics'));
    }
  },

  /**
   * Get skill progression history for an athlete
   */
  async getSkillHistory(
    athleteId: string,
    skillName?: string,
  ): Promise<Result<SkillProgress[], ServiceError>> {
    try {
      if (USE_MOCK) {
        // Try real skill data first
        const allSkillLevels = await apiClient.get<Record<string, AthleteSkillLevels>>(
          STORAGE_KEYS.SKILL_LEVELS,
          {},
        );
        const athleteSkills = allSkillLevels[athleteId];

        if (athleteSkills && Object.keys(athleteSkills.skills).length > 0) {
          const skills: SkillProgress[] = Object.values(athleteSkills.skills).map((s) => ({
            skillName: normalizeAnalyticsSkill(s.skill),
            category: 'Technical',
            currentLevel: Math.round(s.level * 10),
            previousLevel: s.previousLevel
              ? Math.round(s.previousLevel * 10)
              : Math.round(s.level * 10),
            changePercent:
              s.previousLevel && s.previousLevel > 0
                ? Math.round(((s.level - s.previousLevel) / s.previousLevel) * 1000) / 10
                : 0,
            history: s.history.map((h) => ({
              date: h.date.split('T')[0],
              level: Math.round(h.level * 10),
            })),
          }));

          if (skillName) {
            const filtered = skills.filter((s) => s.skillName === skillName);
            return ok(filtered);
          }
          return ok(skills);
        }

        // Fall back to cached/mock data
        analyticsCache = await loadAnalytics();
        const analytics = analyticsCache.find((a) => a.athleteId === athleteId);
        if (!analytics) return ok([]);

        if (skillName) {
          const skill = analytics.skills.find((s) => s.skillName === skillName);
          return ok(skill ? [skill] : []);
        }

        return ok(analytics.skills);
      }

      return unsupportedAthleteAnalytics('Skill history read', { athleteId, skillName });
    } catch (error) {
      logger.error('Failed to get skill history', { athleteId, skillName, error });
      return err(storageError('Failed to load skill history'));
    }
  },

  /**
   * Get all goals for an athlete
   */
  async getAthleteGoals(
    athleteId: string,
    status?: Goal['status'],
  ): Promise<Result<Goal[], ServiceError>> {
    try {
      if (USE_MOCK) {
        goalsCache = await loadGoals();
        let filtered = goalsCache.filter((g) => g.athleteId === athleteId);
        if (status) {
          filtered = filtered.filter((g) => g.status === status);
        }
        return ok(
          filtered.sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          ),
        );
      }

      const context = await resolveAthleteGoalsApiContext(athleteId);
      if (!context.success) {
        return context;
      }
      const result = await apiFetch<ApiAthleteGoalsResponse>(
        `/v1/athletes/${context.data.apiAthleteId}/goals`,
        {
          method: 'GET',
          headers: context.data.headers,
        },
      );
      if (!result.success) {
        return err(result.error);
      }

      let goals = result.data.goals.flatMap((goal) => {
        const mapped = mapApiGoal(goal, result.data.milestones, result.data.athleteId);
        return mapped ? [mapped] : [];
      });
      if (status) {
        goals = goals.filter((goal) => goal.status === status);
      }
      return ok(
        goals.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      );
    } catch (error) {
      logger.error('Failed to get athlete goals', { athleteId, status, error });
      return err(storageError('Failed to load athlete goals'));
    }
  },

  /**
   * Get comparison stats (for radar chart)
   */
  async getSkillComparison(athleteId: string): Promise<
    Result<
      {
        skills: { name: string; athleteLevel: number; averageLevel: number }[];
      },
      ServiceError
    >
  > {
    try {
      const analyticsResult = await this.getAthleteAnalytics(athleteId);
      if (!analyticsResult.success) {
        return analyticsResult;
      }

      if (!analyticsResult.data) {
        return ok({ skills: [] });
      }

      // Mock average levels for comparison
      const averageLevels: Record<string, number> = {
        Dribbling: 60,
        Passing: 62,
        Finishing: 55,
        Defending: 50,
        Goalkeeping: 45,
        Conditioning: 65,
      };

      return ok({
        skills: analyticsResult.data.skills.map((s) => ({
          name: s.skillName,
          athleteLevel: s.currentLevel,
          averageLevel: averageLevels[s.skillName] || 50,
        })),
      });
    } catch (error) {
      logger.error('Failed to get skill comparison', { athleteId, error });
      return err(storageError('Failed to load skill comparison'));
    }
  },
};
