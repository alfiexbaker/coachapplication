/**
 * Progress Goals Service
 *
 * Handles goals and milestones: CRUD operations, progress tracking,
 * milestone management, goal analytics, and helper functions.
 *
 * API Integration Notes:
 * - Goals are persisted via apiClient (AsyncStorage in dev, API in prod)
 */

import { apiClient } from '../api-client';
import { createLogger } from '@/utils/logger';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import type {
  Goal,
  GoalMilestone,
  GoalStatus,
  GoalCategory,
  GoalCreator,
  CreateGoalInput,
  UpdateGoalInput,
} from '@/constants/types';

const logger = createLogger('ProgressGoalsService');
const ENABLE_PROGRESS_DEMO_SEED =
  process.env.EXPO_PUBLIC_ENABLE_PROGRESS_DEMO_SEED === 'true' ||
  process.env.EXPO_PUBLIC_ENABLE_PROGRESS_DEMO_SEED === '1' ||
  process.env.NODE_ENV === 'test';

function createUniqueId(prefix: 'goal' | 'ms'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function emitGoalCompletedIfNeeded(previous: Goal, next: Goal): void {
  if (previous.status !== 'COMPLETED' && next.status === 'COMPLETED') {
    emitTyped(ServiceEvents.GOAL_COMPLETED, {
      goalId: next.id,
      athleteId: next.athleteId,
      title: next.title,
    });
  }
}

function ensureUniqueGoalIds(goals: Goal[]): { goals: Goal[]; changed: boolean } {
  const seenGoalIds = new Set<string>();
  let changed = false;

  const normalized = goals.map((goal) => {
    let normalizedGoalId = goal.id;
    while (seenGoalIds.has(normalizedGoalId)) {
      normalizedGoalId = createUniqueId('goal');
    }
    if (normalizedGoalId !== goal.id) {
      changed = true;
    }
    seenGoalIds.add(normalizedGoalId);

    const seenMilestoneIds = new Set<string>();
    let milestoneChanged = false;
    const normalizedMilestones = goal.milestones.map((milestone) => {
      let normalizedMilestoneId = milestone.id;
      while (seenMilestoneIds.has(normalizedMilestoneId)) {
        normalizedMilestoneId = createUniqueId('ms');
      }
      if (normalizedMilestoneId !== milestone.id) {
        changed = true;
        milestoneChanged = true;
      }
      seenMilestoneIds.add(normalizedMilestoneId);

      if (milestone.goalId !== normalizedGoalId || normalizedMilestoneId !== milestone.id) {
        changed = true;
        milestoneChanged = true;
        return {
          ...milestone,
          id: normalizedMilestoneId,
          goalId: normalizedGoalId,
        };
      }

      return milestone;
    });

    if (normalizedGoalId !== goal.id || milestoneChanged) {
      return {
        ...goal,
        id: normalizedGoalId,
        milestones: normalizedMilestones,
      };
    }

    return goal;
  });

  return { goals: normalized, changed };
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_GOALS: Goal[] = [
  {
    id: 'goal_1',
    userId: 'user1',
    athleteId: 'user1',
    title: 'Improve Sprint Speed',
    description: 'Reduce my 100m sprint time by 0.5 seconds before the end of the season.',
    category: 'CHARACTER',
    targetDate: '2026-06-30',
    status: 'ACTIVE',
    progress: 40,
    milestones: [
      {
        id: 'ms_1',
        goalId: 'goal_1',
        title: 'Complete baseline speed test',
        isCompleted: true,
        completedAt: '2026-01-05T10:00:00Z',
        order: 0,
      },
      {
        id: 'ms_2',
        goalId: 'goal_1',
        title: 'Improve starting technique',
        isCompleted: true,
        completedAt: '2026-01-10T15:00:00Z',
        order: 1,
      },
      {
        id: 'ms_3',
        goalId: 'goal_1',
        title: 'Achieve 0.2s improvement',
        isCompleted: false,
        order: 2,
      },
      {
        id: 'ms_4',
        goalId: 'goal_1',
        title: 'Maintain improvement for 3 sessions',
        isCompleted: false,
        order: 3,
      },
      {
        id: 'ms_5',
        goalId: 'goal_1',
        title: 'Achieve full 0.5s improvement',
        isCompleted: false,
        order: 4,
      },
    ],
    createdBy: 'ATHLETE',
    createdById: 'user1',
    createdAt: '2026-01-01T09:00:00Z',
    updatedAt: '2026-01-10T15:00:00Z',
  },
  {
    id: 'goal_2',
    userId: 'user1',
    athleteId: 'user1',
    title: 'Master Ball Control',
    description: 'Improve dribbling skills and first touch to elite level.',
    category: 'BALL_SKILLS',
    linkedSkill: 'Dribbling & Skills',
    targetLevel: 'Excellent',
    targetDate: '2026-05-15',
    status: 'ACTIVE',
    progress: 66,
    milestones: [
      {
        id: 'ms_6',
        goalId: 'goal_2',
        title: 'Complete 10 juggling sessions',
        isCompleted: true,
        completedAt: '2026-01-08T14:00:00Z',
        order: 0,
      },
      {
        id: 'ms_7',
        goalId: 'goal_2',
        title: 'Master inside-outside dribble',
        isCompleted: true,
        completedAt: '2026-01-09T16:00:00Z',
        order: 1,
      },
      {
        id: 'ms_8',
        goalId: 'goal_2',
        title: 'Perfect first touch control',
        isCompleted: false,
        order: 2,
      },
    ],
    createdBy: 'COACH',
    createdById: 'coach1',
    createdAt: '2026-01-02T10:00:00Z',
    updatedAt: '2026-01-09T16:00:00Z',
  },
  {
    id: 'goal_3',
    userId: 'user1',
    athleteId: 'user1',
    title: 'Build Mental Resilience',
    description: 'Develop better focus and composure during high-pressure situations.',
    category: 'CHARACTER',
    status: 'ACTIVE',
    progress: 25,
    milestones: [
      {
        id: 'ms_9',
        goalId: 'goal_3',
        title: 'Learn breathing techniques',
        isCompleted: true,
        completedAt: '2026-01-07T11:00:00Z',
        order: 0,
      },
      {
        id: 'ms_10',
        goalId: 'goal_3',
        title: 'Practice visualization daily for 2 weeks',
        isCompleted: false,
        order: 1,
      },
      {
        id: 'ms_11',
        goalId: 'goal_3',
        title: 'Apply techniques in practice match',
        isCompleted: false,
        order: 2,
      },
      {
        id: 'ms_12',
        goalId: 'goal_3',
        title: 'Demonstrate composure in competitive match',
        isCompleted: false,
        order: 3,
      },
    ],
    createdBy: 'ATHLETE',
    createdById: 'user1',
    createdAt: '2026-01-03T08:00:00Z',
    updatedAt: '2026-01-07T11:00:00Z',
  },
  {
    id: 'goal_4',
    userId: 'user1',
    athleteId: 'user1',
    title: 'Increase Endurance',
    description: 'Build stamina to maintain performance throughout full matches.',
    category: 'CHARACTER',
    targetDate: '2026-03-01',
    status: 'COMPLETED',
    progress: 100,
    milestones: [
      {
        id: 'ms_13',
        goalId: 'goal_4',
        title: 'Run 5km without stopping',
        isCompleted: true,
        completedAt: '2025-12-15T08:00:00Z',
        order: 0,
      },
      {
        id: 'ms_14',
        goalId: 'goal_4',
        title: 'Complete interval training program',
        isCompleted: true,
        completedAt: '2025-12-28T09:00:00Z',
        order: 1,
      },
      {
        id: 'ms_15',
        goalId: 'goal_4',
        title: 'Play full 90 minutes in training',
        isCompleted: true,
        completedAt: '2026-01-04T17:00:00Z',
        order: 2,
      },
    ],
    createdBy: 'COACH',
    createdById: 'coach1',
    createdAt: '2025-12-01T10:00:00Z',
    updatedAt: '2026-01-04T17:00:00Z',
  },
  {
    id: 'goal_5',
    userId: 'user2',
    athleteId: 'user2',
    title: 'Improve Tactical Awareness',
    description: 'Better understand positioning and movement off the ball.',
    category: 'GAME_SENSE',
    linkedSkill: 'Game Vision',
    targetLevel: 'Very Good',
    status: 'ACTIVE',
    progress: 50,
    milestones: [
      {
        id: 'ms_16',
        goalId: 'goal_5',
        title: 'Watch 5 match analysis videos',
        isCompleted: true,
        completedAt: '2026-01-06T19:00:00Z',
        order: 0,
      },
      {
        id: 'ms_17',
        goalId: 'goal_5',
        title: 'Practice positioning drills',
        isCompleted: false,
        order: 1,
      },
    ],
    createdBy: 'ATHLETE',
    createdById: 'user2',
    createdAt: '2026-01-04T12:00:00Z',
    updatedAt: '2026-01-06T19:00:00Z',
  },
];

// ============================================================================
// GOALS MANAGEMENT
// ============================================================================

async function getAllGoals(): Promise<Goal[]> {
  const goals = await apiClient.get<Goal[]>(STORAGE_KEYS.GOALS, []);
  // Return mock data if no goals stored
  if (goals.length === 0) {
    return ENABLE_PROGRESS_DEMO_SEED ? [...MOCK_GOALS] : [];
  }

  const normalized = ensureUniqueGoalIds(goals);
  if (normalized.changed) {
    await saveGoals(normalized.goals);
    logger.warn('goals_deduped', { total: normalized.goals.length });
  }

  return normalized.goals;
}

async function saveGoals(goals: Goal[]): Promise<void> {
  await apiClient.set(STORAGE_KEYS.GOALS, goals);
}

async function getGoalsForAthlete(
  athleteId: string,
): Promise<{ active: Goal[]; completed: Goal[] }> {
  const allGoals = await getAllGoals();
  const athleteGoals = allGoals.filter((g) => g.athleteId === athleteId);

  return {
    active: athleteGoals.filter((g) => g.status === 'ACTIVE'),
    completed: athleteGoals.filter((g) => g.status === 'COMPLETED'),
  };
}

async function createGoal(
  userId: string,
  params: CreateGoalInput | Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>,
  createdBy: GoalCreator = 'ATHLETE',
  createdById: string = userId,
): Promise<Goal> {
  const allGoals = await getAllGoals();
  const now = new Date().toISOString();
  const goalId = createUniqueId('goal');

  // Handle both old and new parameter formats
  const isCreateInput =
    'milestones' in params &&
    Array.isArray(params.milestones) &&
    typeof params.milestones[0] === 'string';

  let milestones: GoalMilestone[];

  if (isCreateInput) {
    // New format: params.milestones is string[]
    const input = params as CreateGoalInput;
    milestones = (input.milestones ?? []).map((title, index) => ({
      id: createUniqueId('ms'),
      goalId,
      title,
      isCompleted: false,
      order: index,
    }));
  } else {
    // Old format: goal object with milestone objects
    const goalParams = params as Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>;
    milestones = goalParams.milestones || [];
  }

  const newGoal: Goal = {
    id: goalId,
    userId: 'userId' in params ? params.userId : userId,
    athleteId: 'athleteId' in params ? params.athleteId : userId,
    title: params.title,
    description: params.description,
    category: params.category,
    linkedSkill: 'linkedSkill' in params ? params.linkedSkill : undefined,
    targetLevel: 'targetLevel' in params ? params.targetLevel : undefined,
    targetDate: params.targetDate,
    status: 'status' in params ? params.status : 'ACTIVE',
    progress: 'progress' in params ? params.progress : 0,
    milestones,
    createdBy: 'createdBy' in params ? params.createdBy : createdBy,
    createdById: 'createdById' in params ? params.createdById : createdById,
    createdAt: now,
    updatedAt: now,
  };

  allGoals.unshift(newGoal);
  await saveGoals(allGoals);

  logger.info('goal_created', {
    goalId: newGoal.id,
    athleteId: newGoal.athleteId,
    category: params.category,
    milestoneCount: milestones.length,
  });

  return newGoal;
}

async function getUserGoals(userId: string, status?: GoalStatus): Promise<Goal[]> {
  const goals = await getAllGoals();
  let filtered = goals.filter((g) => g.userId === userId || g.athleteId === userId);

  if (status) {
    filtered = filtered.filter((g) => g.status === status);
  }

  // Sort by status (active first), then by updated date
  return filtered.sort((a, b) => {
    if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
    if (b.status === 'ACTIVE' && a.status !== 'ACTIVE') return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

async function getGoalById(id: string): Promise<Goal | null> {
  const goals = await getAllGoals();
  return goals.find((g) => g.id === id) ?? null;
}

async function updateGoal(id: string, updates: UpdateGoalInput): Promise<Goal | null> {
  const goals = await getAllGoals();
  const goalIndex = goals.findIndex((g) => g.id === id);

  if (goalIndex === -1) {
    logger.warn('goal_not_found', { goalId: id });
    return null;
  }

  const goal = goals[goalIndex];
  const updatedGoal: Goal = {
    ...goal,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  emitGoalCompletedIfNeeded(goal, updatedGoal);

  goals[goalIndex] = updatedGoal;
  await saveGoals(goals);

  logger.info('goal_updated', {
    goalId: id,
    updates: Object.keys(updates),
  });

  return updatedGoal;
}

async function deleteGoal(id: string): Promise<boolean> {
  const goals = await getAllGoals();
  const goalIndex = goals.findIndex((g) => g.id === id);

  if (goalIndex === -1) {
    logger.warn('goal_not_found_for_delete', { goalId: id });
    return false;
  }

  goals.splice(goalIndex, 1);
  await saveGoals(goals);

  logger.info('goal_deleted', { goalId: id });
  return true;
}

async function updateGoalProgress(
  goalId: string,
  progress: number,
  completedMilestones?: string[],
): Promise<Goal | null> {
  const allGoals = await getAllGoals();
  const goalIndex = allGoals.findIndex((g) => g.id === goalId);

  if (goalIndex === -1) return null;

  const goal = allGoals[goalIndex];
  const previousGoal: Goal = { ...goal };
  goal.progress = progress;
  goal.updatedAt = new Date().toISOString();

  // Update milestones if provided
  if (completedMilestones) {
    goal.milestones = goal.milestones.map((m) => ({
      ...m,
      isCompleted: completedMilestones.includes(m.id),
      completedAt: completedMilestones.includes(m.id) ? new Date().toISOString() : m.completedAt,
    }));
  }

  // Auto-complete if progress is 100
  if (progress >= 100) {
    goal.status = 'COMPLETED';
  }

  emitGoalCompletedIfNeeded(previousGoal, goal);

  allGoals[goalIndex] = goal;
  await saveGoals(allGoals);

  logger.info('goal_progress_updated', {
    goalId,
    progress,
    status: goal.status,
  });

  return goal;
}

// ============================================================================
// MILESTONE MANAGEMENT
// ============================================================================

async function addMilestone(goalId: string, title: string): Promise<Goal | null> {
  const goals = await getAllGoals();
  const goalIndex = goals.findIndex((g) => g.id === goalId);

  if (goalIndex === -1) {
    logger.warn('goal_not_found_for_milestone', { goalId });
    return null;
  }

  const goal = goals[goalIndex];
  const maxOrder = Math.max(...goal.milestones.map((m) => m.order), -1);

  const newMilestone: GoalMilestone = {
    id: createUniqueId('ms'),
    goalId,
    title,
    isCompleted: false,
    order: maxOrder + 1,
  };

  goal.milestones.push(newMilestone);
  goal.progress = calculateGoalProgress(goal);
  goal.updatedAt = new Date().toISOString();

  goals[goalIndex] = goal;
  await saveGoals(goals);

  logger.info('milestone_added', {
    goalId,
    milestoneId: newMilestone.id,
    title,
  });

  return goal;
}

async function completeMilestone(milestoneId: string): Promise<Goal | null> {
  const goals = await getAllGoals();

  // Find the goal containing this milestone
  const goalIndex = goals.findIndex((g) => g.milestones.some((m) => m.id === milestoneId));

  if (goalIndex === -1) {
    logger.warn('milestone_not_found', { milestoneId });
    return null;
  }

  const goal = goals[goalIndex];
  const previousGoal: Goal = { ...goal };
  const milestoneIndex = goal.milestones.findIndex((m) => m.id === milestoneId);
  const milestone = goal.milestones[milestoneIndex];

  // Mark as completed
  milestone.isCompleted = true;
  milestone.completedAt = new Date().toISOString();

  // Recalculate progress
  goal.progress = calculateGoalProgress(goal);
  goal.updatedAt = new Date().toISOString();

  // Auto-complete goal if all milestones are done
  if (goal.progress === 100 && goal.status === 'ACTIVE') {
    goal.status = 'COMPLETED';
    logger.info('goal_auto_completed', { goalId: goal.id });
  }

  emitGoalCompletedIfNeeded(previousGoal, goal);

  goals[goalIndex] = goal;
  await saveGoals(goals);

  logger.info('milestone_completed', {
    milestoneId,
    goalId: goal.id,
    newProgress: goal.progress,
  });

  return goal;
}

async function uncompleteMilestone(milestoneId: string): Promise<Goal | null> {
  const goals = await getAllGoals();

  const goalIndex = goals.findIndex((g) => g.milestones.some((m) => m.id === milestoneId));

  if (goalIndex === -1) {
    logger.warn('milestone_not_found', { milestoneId });
    return null;
  }

  const goal = goals[goalIndex];
  const milestoneIndex = goal.milestones.findIndex((m) => m.id === milestoneId);
  const milestone = goal.milestones[milestoneIndex];

  // Mark as incomplete
  milestone.isCompleted = false;
  milestone.completedAt = undefined;

  // Recalculate progress
  goal.progress = calculateGoalProgress(goal);
  goal.updatedAt = new Date().toISOString();

  // Reactivate goal if it was completed
  if (goal.status === 'COMPLETED') {
    goal.status = 'ACTIVE';
    logger.info('goal_reactivated', { goalId: goal.id });
  }

  goals[goalIndex] = goal;
  await saveGoals(goals);

  logger.info('milestone_uncompleted', {
    milestoneId,
    goalId: goal.id,
    newProgress: goal.progress,
  });

  return goal;
}

async function deleteMilestone(milestoneId: string): Promise<Goal | null> {
  const goals = await getAllGoals();

  const goalIndex = goals.findIndex((g) => g.milestones.some((m) => m.id === milestoneId));

  if (goalIndex === -1) {
    logger.warn('milestone_not_found_for_delete', { milestoneId });
    return null;
  }

  const goal = goals[goalIndex];
  goal.milestones = goal.milestones.filter((m) => m.id !== milestoneId);

  // Reorder remaining milestones
  goal.milestones.forEach((m, idx) => {
    m.order = idx;
  });

  // Recalculate progress
  goal.progress = calculateGoalProgress(goal);
  goal.updatedAt = new Date().toISOString();

  goals[goalIndex] = goal;
  await saveGoals(goals);

  logger.info('milestone_deleted', {
    milestoneId,
    goalId: goal.id,
  });

  return goal;
}

// ============================================================================
// GOAL PROGRESS HELPERS
// ============================================================================

function calculateGoalProgress(goal: Goal): number {
  if (goal.milestones.length === 0) {
    return 0;
  }
  const completed = goal.milestones.filter((m) => m.isCompleted).length;
  return Math.round((completed / goal.milestones.length) * 100);
}

async function getGoalProgress(goalId: string): Promise<number> {
  const goal = await getGoalById(goalId);
  if (!goal) {
    return 0;
  }
  return calculateGoalProgress(goal);
}

async function getAthleteGoals(athleteId: string): Promise<{
  active: Goal[];
  completed: Goal[];
  paused: Goal[];
}> {
  const goals = await getUserGoals(athleteId);

  return {
    active: goals.filter((g) => g.status === 'ACTIVE'),
    completed: goals.filter((g) => g.status === 'COMPLETED'),
    paused: goals.filter((g) => g.status === 'PAUSED'),
  };
}

async function getGoalStats(userId: string): Promise<{
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  averageProgress: number;
  goalsByCategory: Record<GoalCategory, number>;
}> {
  const goals = await getUserGoals(userId);

  const activeGoals = goals.filter((g) => g.status === 'ACTIVE');
  const completedGoals = goals.filter((g) => g.status === 'COMPLETED');

  const averageProgress =
    activeGoals.length > 0
      ? Math.round(activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length)
      : 0;

  const categories: GoalCategory[] = [
    'BALL_SKILLS',
    'ATTACKING',
    'DEFENDING',
    'GAME_SENSE',
    'CHARACTER',
    'OTHER',
  ];
  const goalsByCategory = categories.reduce(
    (acc, cat) => {
      acc[cat] = goals.filter((g) => g.category === cat).length;
      return acc;
    },
    {} as Record<GoalCategory, number>,
  );

  return {
    totalGoals: goals.length,
    activeGoals: activeGoals.length,
    completedGoals: completedGoals.length,
    averageProgress,
    goalsByCategory,
  };
}

// ============================================================================
// GOAL HELPER FUNCTIONS
// ============================================================================

function getCategoryInfo(category: GoalCategory): {
  label: string;
  icon: string;
  color: string;
} {
  const categoryInfo: Record<GoalCategory, { label: string; icon: string; color: string }> = {
    BALL_SKILLS: { label: 'Ball Skills', icon: 'football', color: '#3B82F6' },
    ATTACKING: { label: 'Attacking', icon: 'flash', color: '#EF4444' },
    DEFENDING: { label: 'Defending', icon: 'shield', color: '#10B981' },
    GAME_SENSE: { label: 'Game Sense', icon: 'bulb', color: '#8B5CF6' },
    CHARACTER: { label: 'Character', icon: 'sparkles', color: '#EC4899' },
    OTHER: { label: 'Other', icon: 'star', color: '#6B7280' },
  };

  return categoryInfo[category] ?? categoryInfo.OTHER;
}

function getStatusInfo(status: GoalStatus): {
  label: string;
  color: string;
} {
  const statusInfo: Record<GoalStatus, { label: string; color: string }> = {
    ACTIVE: { label: 'Active', color: '#10B981' },
    COMPLETED: { label: 'Completed', color: '#3B82F6' },
    PAUSED: { label: 'Paused', color: '#F59E0B' },
    ABANDONED: { label: 'Abandoned', color: '#6B7280' },
  };

  return statusInfo[status] ?? statusInfo.ACTIVE;
}

function formatTargetDate(date: string | undefined): string {
  if (!date) return 'No deadline';
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function isOverdue(goal: Goal): boolean {
  if (!goal.targetDate || goal.status === 'COMPLETED') return false;
  const target = new Date(goal.targetDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return target < today;
}

async function resetToMockData(): Promise<void> {
  await saveGoals([...MOCK_GOALS]);
  logger.info('goals_reset_to_mock');
}

// ============================================================================
// EXPORTS
// ============================================================================

export const progressGoalsService = {
  // Goals - CRUD operations
  createGoal,
  getUserGoals,
  getGoalById,
  updateGoal,
  deleteGoal,
  getGoalsForAthlete,
  updateGoalProgress,

  // Milestones
  addMilestone,
  completeMilestone,
  uncompleteMilestone,
  deleteMilestone,

  // Goal progress
  getGoalProgress,
  calculateGoalProgress,

  // Goal analytics
  getAthleteGoals,
  getGoalStats,

  // Goal helpers
  getCategoryInfo,
  getStatusInfo,
  formatTargetDate,
  isOverdue,

  // Development
  resetToMockData,
};
