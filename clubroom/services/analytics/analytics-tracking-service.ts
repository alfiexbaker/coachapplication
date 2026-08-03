/**
 * Analytics Tracking Service
 *
 * Handles event tracking for athlete analytics: skill updates,
 * goal management (create, progress, milestones, abandon), and
 * session-related analytics tracking.
 *
 * API Integration Notes:
 * - Mock mode keeps local goal and skill tracking state for development-only flows.
 * - Live API mode sends skill and goal mutations through named /v1 athlete/goal routes.
 */

import { apiClient, apiFetch } from '../api-client';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  notFound,
  storageError,
  validationError,
} from '@/types/result';
import type { AthleteAnalytics, SkillProgress, Goal, GoalCategory } from '@/constants/types';
import type { FootballSkill } from '@/types/progress-types';
import { generateId } from '@/utils/generate-id';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';
import { api } from '@/constants/config';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
  toApiAthleteId,
} from '@/services/api-auth-context';
import { parseApiSkillUpdateResponse } from '@/services/progress/skill-history-response-contract';

const logger = createLogger('AnalyticsTrackingService');

const USE_MOCK = api.useMock;

function createUniqueId(prefix: 'goal' | 'ms'): string {
  return generateId(prefix);
}

type ApiGoalRow = {
  id: string;
  athleteId: string;
  ownerUserId?: string | null;
  creatorUserId?: string | null;
  title: string;
  category?: string | null;
  status?: string | null;
  targetDate?: string | null;
  notes?: string | null;
  progress?: number | null;
  createdByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
};

type ApiGoalMilestoneRow = {
  id: string;
  goalId: string;
  title: string;
  status?: string | null;
  completedAt?: string | null;
  sortOrder?: number | null;
};

type ApiGoalPayload = {
  goal: ApiGoalRow;
  milestones: ApiGoalMilestoneRow[];
};

function mapApiGoalPayload(payload: ApiGoalPayload): Goal {
  const milestones = payload.milestones.map((milestone) => ({
    id: milestone.id,
    goalId: milestone.goalId,
    title: milestone.title,
    isCompleted: milestone.status === 'COMPLETED',
    completedAt: milestone.completedAt ?? undefined,
    order: milestone.sortOrder ?? 0,
  }));
  const completedCount = milestones.filter((milestone) => milestone.isCompleted).length;
  const derivedProgress =
    milestones.length > 0
      ? Math.round((completedCount / milestones.length) * 100)
      : payload.goal.status === 'COMPLETED'
        ? 100
        : 0;

  return {
    id: payload.goal.id,
    userId: payload.goal.ownerUserId ?? payload.goal.athleteId,
    athleteId: payload.goal.athleteId,
    title: payload.goal.title,
    description: payload.goal.notes ?? undefined,
    category: (payload.goal.category as GoalCategory | null) ?? 'OTHER',
    targetDate: payload.goal.targetDate ?? undefined,
    status:
      payload.goal.status === 'COMPLETED' ||
      payload.goal.status === 'PAUSED' ||
      payload.goal.status === 'ABANDONED'
        ? payload.goal.status
        : 'ACTIVE',
    progress: typeof payload.goal.progress === 'number' ? payload.goal.progress : derivedProgress,
    milestones,
    createdBy: 'ATHLETE',
    createdById:
      payload.goal.creatorUserId ?? payload.goal.createdByUserId ?? payload.goal.athleteId,
    createdAt: payload.goal.createdAt,
    updatedAt: payload.goal.updatedAt,
  };
}

async function resolveAthleteSkillUpdateApiContext(
  athleteId: string,
): Promise<Result<{ apiAthleteId: string; headers: Record<string, string> }, ServiceError>> {
  const currentUserResult = await resolveSignedInApiUser('Sign in to update athlete skills.');
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

async function resolveGoalMutationApiHeaders(
  message: string,
): Promise<Result<Record<string, string>, ServiceError>> {
  const currentUserResult = await resolveSignedInApiUser(message);
  if (!currentUserResult.success) {
    return err(currentUserResult.error);
  }

  return ok(
    buildApiAuthHeaders({
      actingRole: deriveApiActingRole(currentUserResult.data),
    }),
  );
}

function toApiSkillScore(level: number): number | null {
  if (!Number.isFinite(level)) {
    return null;
  }
  const tenPointLevel = level > 10 ? level / 10 : level;
  if (tenPointLevel < 1 || tenPointLevel > 10) {
    return null;
  }
  return Math.round(tenPointLevel);
}

function normalizeAnalyticsSkill(skill: string): FootballSkill {
  if (skill === 'Dribbling') return 'Dribbling & Skills';
  if (skill === 'Defending') return '1v1 Defending';
  if (skill === 'Conditioning') return 'Work Rate';
  if (skill === 'Goalkeeping') return 'Shot Stopping';
  return skill as FootballSkill;
}

// ============================================================================
// MOCK DATA
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

let analyticsCache: AthleteAnalytics[] = USE_MOCK ? [...MOCK_ANALYTICS] : [];
let goalsCache: Goal[] = USE_MOCK ? [...MOCK_GOALS] : [];

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
  return USE_MOCK ? [...MOCK_ANALYTICS] : [];
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
  return USE_MOCK ? [...MOCK_GOALS] : [];
}

async function saveGoals(goals: Goal[]): Promise<Result<void, ServiceError>> {
  try {
    await Promise.all([
      apiClient.set(STORAGE_KEYS.GOALS, goals),
      apiClient.set(STORAGE_KEYS.ATHLETE_GOALS, goals),
    ]);
    return ok(undefined);
  } catch (error) {
    logger.error('Failed to save goals', { error });
    return err(storageError('Failed to save goals'));
  }
}

// ============================================================================
// ANALYTICS TRACKING SERVICE
// ============================================================================

export const analyticsTrackingService = {
  /**
   * Update skill level (called after session)
   */
  async updateSkillLevel(
    athleteId: string,
    skill: FootballSkill,
    newLevel: number,
  ): Promise<Result<void, ServiceError>> {
    try {
      if (!USE_MOCK) {
        const context = await resolveAthleteSkillUpdateApiContext(athleteId);
        if (!context.success) {
          return context;
        }
        const score = toApiSkillScore(newLevel);
        if (score === null) {
          return err(validationError('Skill level must resolve to a score from 1 to 10'));
        }
        const result = await apiFetch<unknown>(
          `/v1/athletes/${context.data.apiAthleteId}/skill-updates`,
          {
            method: 'POST',
            headers: context.data.headers,
            body: JSON.stringify({
              skillName: normalizeAnalyticsSkill(skill),
              score,
              idempotencyKey: generateId('skill-update'),
            }),
          },
        );
        if (!result.success) {
          return err(result.error);
        }
        const response = parseApiSkillUpdateResponse(
          result.data,
          context.data.apiAthleteId,
        );
        if (!response || response.score !== score) {
          return err(storageError('Athlete skill update API response did not match contract'));
        }
        return ok(undefined);
      }

      analyticsCache = await loadAnalytics();
      let analytics = analyticsCache.find((a) => a.athleteId === athleteId);

      if (!analytics) {
        // Create new analytics record
        analytics = {
          athleteId,
          period: 'MONTH',
          totalSessions: 0,
          sessionsThisPeriod: 0,
          averageSessionRating: 0,
          attendanceRate: 0,
          skills: [],
          activeGoals: [],
          completedGoals: [],
          improvementRate: 0,
          consistencyScore: 0,
          percentileRank: 50,
        };
        analyticsCache.push(analytics);
      }

      const normalizedSkill = normalizeAnalyticsSkill(skill);
      const skillProgress = analytics.skills.find((s) => s.skillName === normalizedSkill);
      const today = toDateStr(new Date());

      if (skillProgress) {
        skillProgress.previousLevel = skillProgress.currentLevel;
        skillProgress.currentLevel = newLevel;
        skillProgress.changePercent =
          skillProgress.previousLevel > 0
            ? ((newLevel - skillProgress.previousLevel) / skillProgress.previousLevel) * 100
            : 0;
        skillProgress.history.push({ date: today, level: newLevel });
      } else {
        const newSkillProgress: SkillProgress = {
          skillName: normalizedSkill,
          category: 'Technical',
          currentLevel: newLevel,
          previousLevel: 0,
          changePercent: 0,
          history: [{ date: today, level: newLevel }],
        };
        analytics.skills.push(newSkillProgress);
      }

      await apiClient.set(STORAGE_KEYS.ATHLETE_ANALYTICS, analyticsCache);
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to update skill level', { athleteId, skill, newLevel, error });
      return err(storageError('Failed to update skill level'));
    }
  },

  /**
   * Create a new goal
   */
  async createGoal(input: {
    athleteId: string;
    title: string;
    description?: string;
    category?: GoalCategory;
    targetDate?: string;
    milestones?: string[];
    createdBy: 'COACH' | 'ATHLETE' | 'PARENT';
    createdById: string;
  }): Promise<Result<Goal, ServiceError>> {
    try {
      const now = new Date().toISOString();
      const goalId = createUniqueId('goal');
      const newGoal: Goal = {
        id: goalId,
        userId: input.athleteId,
        athleteId: input.athleteId,
        title: input.title,
        description: input.description,
        category: input.category || 'OTHER',
        targetDate: input.targetDate,
        progress: 0,
        milestones: (input.milestones || []).map((title, index) => ({
          id: createUniqueId('ms'),
          goalId: goalId,
          title,
          order: index,
          isCompleted: false,
        })),
        status: 'ACTIVE',
        createdBy: input.createdBy,
        createdById: input.createdById,
        createdAt: now,
        updatedAt: now,
      };

      if (USE_MOCK) {
        goalsCache = await loadGoals();
        goalsCache.push(newGoal);
        const saveResult = await saveGoals(goalsCache);
        if (!saveResult.success) return err(saveResult.error);
        return ok(newGoal);
      }

      const context = await resolveAthleteSkillUpdateApiContext(input.athleteId);
      if (!context.success) {
        return err(context.error);
      }
      const result = await apiFetch<ApiGoalPayload>(
        `/v1/athletes/${encodeURIComponent(context.data.apiAthleteId)}/goals`,
        {
          method: 'POST',
          headers: context.data.headers,
          body: JSON.stringify({
            title: input.title,
            description: input.description,
            category: input.category ?? 'OTHER',
            targetDate: input.targetDate,
            milestones: input.milestones ?? [],
          }),
        },
      );
      if (!result.success) {
        return err(result.error);
      }
      return ok(mapApiGoalPayload(result.data));
    } catch (error) {
      logger.error('Failed to create goal', {
        athleteId: input.athleteId,
        category: input.category ?? 'OTHER',
        targetDate: input.targetDate,
        milestoneCount: input.milestones?.length ?? 0,
        createdBy: input.createdBy,
        createdById: input.createdById,
        titleLength: input.title.trim().length,
        hasDescription: (input.description?.trim().length ?? 0) > 0,
        error,
      });
      return err(storageError('Failed to create goal'));
    }
  },

  /**
   * Update goal progress
   */
  async updateGoalProgress(goalId: string, progress: number): Promise<Result<Goal, ServiceError>> {
    if (USE_MOCK) {
      goalsCache = await loadGoals();
      const goal = goalsCache.find((g) => g.id === goalId);
      if (!goal) return err(notFound('Goal', goalId));

      goal.progress = Math.min(100, Math.max(0, progress));
      goal.updatedAt = new Date().toISOString();

      if (goal.progress === 100) {
        goal.status = 'COMPLETED';
      }

      const saveResult = await saveGoals(goalsCache);
      if (!saveResult.success) return err(saveResult.error);
      return ok(goal);
    }

    const currentUserResult = await resolveSignedInApiUser('Sign in to update goal progress.');
    if (!currentUserResult.success) {
      return currentUserResult;
    }
    const result = await apiFetch<ApiGoalPayload>(`/v1/goals/${encodeURIComponent(goalId)}/progress`, {
      method: 'PATCH',
      headers: buildApiAuthHeaders({
        actingRole: deriveApiActingRole(currentUserResult.data),
      }),
      body: JSON.stringify({
        progress: Math.min(100, Math.max(0, Math.round(progress))),
      }),
    });
    if (!result.success) {
      return err(result.error);
    }
    return ok(mapApiGoalPayload(result.data));
  },

  /**
   * Complete a milestone
   */
  async completeMilestone(
    goalId: string,
    milestoneId: string,
  ): Promise<Result<Goal, ServiceError>> {
    if (USE_MOCK) {
      goalsCache = await loadGoals();
      const goal = goalsCache.find((g) => g.id === goalId);
      if (!goal) return err(notFound('Goal', goalId));

      const milestone = goal.milestones.find((m) => m.id === milestoneId);
      if (milestone) {
        milestone.isCompleted = true;
        milestone.completedAt = new Date().toISOString();
      }

      // Recalculate progress based on milestones
      const completedCount = goal.milestones.filter((m) => m.isCompleted).length;
      goal.progress = Math.round((completedCount / goal.milestones.length) * 100);
      goal.updatedAt = new Date().toISOString();

      if (goal.progress === 100) {
        goal.status = 'COMPLETED';
      }

      const saveResult = await saveGoals(goalsCache);
      if (!saveResult.success) return err(saveResult.error);
      return ok(goal);
    }

    const headersResult = await resolveGoalMutationApiHeaders('Sign in to update goal milestones.');
    if (!headersResult.success) {
      return headersResult;
    }
    const result = await apiFetch<ApiGoalPayload>(
      `/v1/goals/${encodeURIComponent(goalId)}/milestones/${encodeURIComponent(milestoneId)}`,
      {
        method: 'PATCH',
        headers: headersResult.data,
        body: JSON.stringify({
          status: 'COMPLETED',
        }),
      },
    );
    if (!result.success) {
      return err(result.error);
    }
    return ok(mapApiGoalPayload(result.data));
  },

  /**
   * Add milestone to goal
   */
  async addMilestone(goalId: string, title: string): Promise<Result<Goal, ServiceError>> {
    if (USE_MOCK) {
      goalsCache = await loadGoals();
      const goal = goalsCache.find((g) => g.id === goalId);
      if (!goal) return err(notFound('Goal', goalId));

      goal.milestones.push({
        id: createUniqueId('ms'),
        goalId: goalId,
        title,
        order: goal.milestones.length,
        isCompleted: false,
      });
      goal.updatedAt = new Date().toISOString();

      // Recalculate progress
      const completedCount = goal.milestones.filter((m) => m.isCompleted).length;
      goal.progress = Math.round((completedCount / goal.milestones.length) * 100);

      const saveResult = await saveGoals(goalsCache);
      if (!saveResult.success) return err(saveResult.error);
      return ok(goal);
    }

    const headersResult = await resolveGoalMutationApiHeaders('Sign in to update goal milestones.');
    if (!headersResult.success) {
      return headersResult;
    }
    const result = await apiFetch<ApiGoalPayload>(
      `/v1/goals/${encodeURIComponent(goalId)}/milestones`,
      {
        method: 'POST',
        headers: headersResult.data,
        body: JSON.stringify({ title }),
      },
    );
    if (!result.success) {
      return err(result.error);
    }
    return ok(mapApiGoalPayload(result.data));
  },

  /**
   * Abandon a goal
   */
  async abandonGoal(goalId: string): Promise<Result<Goal, ServiceError>> {
    if (USE_MOCK) {
      goalsCache = await loadGoals();
      const goal = goalsCache.find((g) => g.id === goalId);
      if (!goal) return err(notFound('Goal', goalId));

      goal.status = 'ABANDONED';
      goal.updatedAt = new Date().toISOString();

      const saveResult = await saveGoals(goalsCache);
      if (!saveResult.success) return err(saveResult.error);
      return ok(goal);
    }

    const headersResult = await resolveGoalMutationApiHeaders('Sign in to update goals.');
    if (!headersResult.success) {
      return headersResult;
    }
    const result = await apiFetch<ApiGoalPayload>(`/v1/goals/${encodeURIComponent(goalId)}`, {
      method: 'PATCH',
      headers: headersResult.data,
      body: JSON.stringify({
        status: 'ABANDONED',
      }),
    });
    if (!result.success) {
      return err(result.error);
    }
    return ok(mapApiGoalPayload(result.data));
  },
};
