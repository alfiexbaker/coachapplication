/**
 * Goal Service
 *
 * Handles goal and milestone management for athletes.
 * Athletes can set specific training goals, track milestones towards goals,
 * and coaches can view athlete goals when planning sessions.
 *
 * API Integration Notes:
 * - POST /api/goals - Create goal
 * - GET /api/goals?userId=X - Get user goals
 * - GET /api/goals/:id - Get goal details
 * - PATCH /api/goals/:id - Update goal
 * - DELETE /api/goals/:id - Delete goal
 * - POST /api/goals/:id/milestones - Add milestone
 * - PATCH /api/milestones/:id/complete - Complete milestone
 */

import { storageService } from './storage-service';
import { createLogger } from '@/utils/logger';
import type {
  Goal,
  GoalMilestone,
  GoalStatus,
  GoalCategory,
  GoalCreator,
  CreateGoalInput,
  UpdateGoalInput,
} from '@/constants/types';

const logger = createLogger('GoalService');

// Storage key for goals
const GOALS_STORAGE_KEY = 'goals.all';

// Mock data for demonstration
const MOCK_GOALS: Goal[] = [
  {
    id: 'goal_1',
    userId: 'user1',
    athleteId: 'user1',
    title: 'Improve Sprint Speed',
    description: 'Reduce my 100m sprint time by 0.5 seconds before the end of the season.',
    category: 'SPEED',
    targetDate: '2026-06-30',
    status: 'ACTIVE',
    progress: 40,
    milestones: [
      { id: 'ms_1', goalId: 'goal_1', title: 'Complete baseline speed test', isCompleted: true, completedAt: '2026-01-05T10:00:00Z', order: 0 },
      { id: 'ms_2', goalId: 'goal_1', title: 'Improve starting technique', isCompleted: true, completedAt: '2026-01-10T15:00:00Z', order: 1 },
      { id: 'ms_3', goalId: 'goal_1', title: 'Achieve 0.2s improvement', isCompleted: false, order: 2 },
      { id: 'ms_4', goalId: 'goal_1', title: 'Maintain improvement for 3 sessions', isCompleted: false, order: 3 },
      { id: 'ms_5', goalId: 'goal_1', title: 'Achieve full 0.5s improvement', isCompleted: false, order: 4 },
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
    category: 'TECHNIQUE',
    targetDate: '2026-05-15',
    status: 'ACTIVE',
    progress: 66,
    milestones: [
      { id: 'ms_6', goalId: 'goal_2', title: 'Complete 10 juggling sessions', isCompleted: true, completedAt: '2026-01-08T14:00:00Z', order: 0 },
      { id: 'ms_7', goalId: 'goal_2', title: 'Master inside-outside dribble', isCompleted: true, completedAt: '2026-01-09T16:00:00Z', order: 1 },
      { id: 'ms_8', goalId: 'goal_2', title: 'Perfect first touch control', isCompleted: false, order: 2 },
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
    category: 'MENTAL',
    status: 'ACTIVE',
    progress: 25,
    milestones: [
      { id: 'ms_9', goalId: 'goal_3', title: 'Learn breathing techniques', isCompleted: true, completedAt: '2026-01-07T11:00:00Z', order: 0 },
      { id: 'ms_10', goalId: 'goal_3', title: 'Practice visualization daily for 2 weeks', isCompleted: false, order: 1 },
      { id: 'ms_11', goalId: 'goal_3', title: 'Apply techniques in practice match', isCompleted: false, order: 2 },
      { id: 'ms_12', goalId: 'goal_3', title: 'Demonstrate composure in competitive match', isCompleted: false, order: 3 },
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
    category: 'FITNESS',
    targetDate: '2026-03-01',
    status: 'COMPLETED',
    progress: 100,
    milestones: [
      { id: 'ms_13', goalId: 'goal_4', title: 'Run 5km without stopping', isCompleted: true, completedAt: '2025-12-15T08:00:00Z', order: 0 },
      { id: 'ms_14', goalId: 'goal_4', title: 'Complete interval training program', isCompleted: true, completedAt: '2025-12-28T09:00:00Z', order: 1 },
      { id: 'ms_15', goalId: 'goal_4', title: 'Play full 90 minutes in training', isCompleted: true, completedAt: '2026-01-04T17:00:00Z', order: 2 },
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
    category: 'TACTICAL',
    status: 'ACTIVE',
    progress: 50,
    milestones: [
      { id: 'ms_16', goalId: 'goal_5', title: 'Watch 5 match analysis videos', isCompleted: true, completedAt: '2026-01-06T19:00:00Z', order: 0 },
      { id: 'ms_17', goalId: 'goal_5', title: 'Practice positioning drills', isCompleted: false, order: 1 },
    ],
    createdBy: 'ATHLETE',
    createdById: 'user2',
    createdAt: '2026-01-04T12:00:00Z',
    updatedAt: '2026-01-06T19:00:00Z',
  },
];

/**
 * Get all goals from storage
 */
async function getAllGoals(): Promise<Goal[]> {
  const goals = await storageService.getItem<Goal[]>(GOALS_STORAGE_KEY, []);
  // Return mock data if no goals stored
  if (goals.length === 0) {
    return [...MOCK_GOALS];
  }
  return goals;
}

/**
 * Save all goals to storage
 */
async function saveGoals(goals: Goal[]): Promise<void> {
  await storageService.setItem(GOALS_STORAGE_KEY, goals);
}

/**
 * Create a new goal for a user
 * @param userId - The user ID of the athlete
 * @param params - Goal creation parameters
 * @param createdBy - Who is creating the goal
 * @param createdById - User ID of the creator
 * @returns The created goal
 */
async function createGoal(
  userId: string,
  params: CreateGoalInput,
  createdBy: GoalCreator = 'ATHLETE',
  createdById: string = userId
): Promise<Goal> {
  const goals = await getAllGoals();
  const now = new Date().toISOString();
  const goalId = `goal_${Date.now()}`;

  // Create milestones from provided titles
  const milestones: GoalMilestone[] = (params.milestones ?? []).map((title, index) => ({
    id: `ms_${Date.now()}_${index}`,
    goalId,
    title,
    isCompleted: false,
    order: index,
  }));

  const newGoal: Goal = {
    id: goalId,
    userId,
    athleteId: userId,
    title: params.title,
    description: params.description,
    category: params.category,
    targetDate: params.targetDate,
    status: 'ACTIVE',
    progress: 0,
    milestones,
    createdBy,
    createdById,
    createdAt: now,
    updatedAt: now,
  };

  goals.unshift(newGoal);
  await saveGoals(goals);

  logger.info('goal_created', {
    goalId: newGoal.id,
    userId,
    category: params.category,
    milestoneCount: milestones.length,
  });

  return newGoal;
}

/**
 * Get all goals for a specific user
 * @param userId - The user ID of the athlete
 * @param status - Optional status filter
 * @returns Array of goals
 */
async function getUserGoals(userId: string, status?: GoalStatus): Promise<Goal[]> {
  const goals = await getAllGoals();
  let filtered = goals.filter(g => g.userId === userId || g.athleteId === userId);

  if (status) {
    filtered = filtered.filter(g => g.status === status);
  }

  // Sort by status (active first), then by updated date
  return filtered.sort((a, b) => {
    if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
    if (b.status === 'ACTIVE' && a.status !== 'ACTIVE') return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

/**
 * Get a single goal by ID
 * @param id - The goal ID
 * @returns The goal or null if not found
 */
async function getGoalById(id: string): Promise<Goal | null> {
  const goals = await getAllGoals();
  return goals.find(g => g.id === id) ?? null;
}

/**
 * Update an existing goal
 * @param id - The goal ID
 * @param updates - The fields to update
 * @returns The updated goal or null if not found
 */
async function updateGoal(id: string, updates: UpdateGoalInput): Promise<Goal | null> {
  const goals = await getAllGoals();
  const goalIndex = goals.findIndex(g => g.id === id);

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

  goals[goalIndex] = updatedGoal;
  await saveGoals(goals);

  logger.info('goal_updated', {
    goalId: id,
    updates: Object.keys(updates),
  });

  return updatedGoal;
}

/**
 * Delete a goal
 * @param id - The goal ID
 * @returns True if deleted, false if not found
 */
async function deleteGoal(id: string): Promise<boolean> {
  const goals = await getAllGoals();
  const goalIndex = goals.findIndex(g => g.id === id);

  if (goalIndex === -1) {
    logger.warn('goal_not_found_for_delete', { goalId: id });
    return false;
  }

  goals.splice(goalIndex, 1);
  await saveGoals(goals);

  logger.info('goal_deleted', { goalId: id });
  return true;
}

/**
 * Add a milestone to a goal
 * @param goalId - The goal ID
 * @param title - The milestone title
 * @returns The updated goal or null if goal not found
 */
async function addMilestone(goalId: string, title: string): Promise<Goal | null> {
  const goals = await getAllGoals();
  const goalIndex = goals.findIndex(g => g.id === goalId);

  if (goalIndex === -1) {
    logger.warn('goal_not_found_for_milestone', { goalId });
    return null;
  }

  const goal = goals[goalIndex];
  const maxOrder = Math.max(...goal.milestones.map(m => m.order), -1);

  const newMilestone: GoalMilestone = {
    id: `ms_${Date.now()}`,
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

/**
 * Complete a milestone
 * @param milestoneId - The milestone ID
 * @returns The updated goal or null if milestone not found
 */
async function completeMilestone(milestoneId: string): Promise<Goal | null> {
  const goals = await getAllGoals();

  // Find the goal containing this milestone
  const goalIndex = goals.findIndex(g =>
    g.milestones.some(m => m.id === milestoneId)
  );

  if (goalIndex === -1) {
    logger.warn('milestone_not_found', { milestoneId });
    return null;
  }

  const goal = goals[goalIndex];
  const milestoneIndex = goal.milestones.findIndex(m => m.id === milestoneId);
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

  goals[goalIndex] = goal;
  await saveGoals(goals);

  logger.info('milestone_completed', {
    milestoneId,
    goalId: goal.id,
    newProgress: goal.progress,
  });

  return goal;
}

/**
 * Uncomplete a milestone (toggle back to incomplete)
 * @param milestoneId - The milestone ID
 * @returns The updated goal or null if milestone not found
 */
async function uncompleteMilestone(milestoneId: string): Promise<Goal | null> {
  const goals = await getAllGoals();

  const goalIndex = goals.findIndex(g =>
    g.milestones.some(m => m.id === milestoneId)
  );

  if (goalIndex === -1) {
    logger.warn('milestone_not_found', { milestoneId });
    return null;
  }

  const goal = goals[goalIndex];
  const milestoneIndex = goal.milestones.findIndex(m => m.id === milestoneId);
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

/**
 * Delete a milestone from a goal
 * @param milestoneId - The milestone ID
 * @returns The updated goal or null if milestone not found
 */
async function deleteMilestone(milestoneId: string): Promise<Goal | null> {
  const goals = await getAllGoals();

  const goalIndex = goals.findIndex(g =>
    g.milestones.some(m => m.id === milestoneId)
  );

  if (goalIndex === -1) {
    logger.warn('milestone_not_found_for_delete', { milestoneId });
    return null;
  }

  const goal = goals[goalIndex];
  goal.milestones = goal.milestones.filter(m => m.id !== milestoneId);

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

/**
 * Calculate goal progress based on completed milestones
 * @param goal - The goal to calculate progress for
 * @returns Progress percentage (0-100)
 */
function calculateGoalProgress(goal: Goal): number {
  if (goal.milestones.length === 0) {
    return 0;
  }
  const completed = goal.milestones.filter(m => m.isCompleted).length;
  return Math.round((completed / goal.milestones.length) * 100);
}

/**
 * Get goal progress information
 * @param goalId - The goal ID
 * @returns Progress percentage
 */
async function getGoalProgress(goalId: string): Promise<number> {
  const goal = await getGoalById(goalId);
  if (!goal) {
    return 0;
  }
  return calculateGoalProgress(goal);
}

/**
 * Get all goals for an athlete (for coaches to view)
 * @param athleteId - The athlete's user ID
 * @returns Object with active and completed goals
 */
async function getAthleteGoals(athleteId: string): Promise<{
  active: Goal[];
  completed: Goal[];
  paused: Goal[];
}> {
  const goals = await getUserGoals(athleteId);

  return {
    active: goals.filter(g => g.status === 'ACTIVE'),
    completed: goals.filter(g => g.status === 'COMPLETED'),
    paused: goals.filter(g => g.status === 'PAUSED'),
  };
}

/**
 * Get summary statistics for a user's goals
 * @param userId - The user ID
 * @returns Summary statistics
 */
async function getGoalStats(userId: string): Promise<{
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  averageProgress: number;
  goalsByCategory: Record<GoalCategory, number>;
}> {
  const goals = await getUserGoals(userId);

  const activeGoals = goals.filter(g => g.status === 'ACTIVE');
  const completedGoals = goals.filter(g => g.status === 'COMPLETED');

  const averageProgress = activeGoals.length > 0
    ? Math.round(activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length)
    : 0;

  const categories: GoalCategory[] = ['SPEED', 'TECHNIQUE', 'FITNESS', 'TACTICAL', 'MENTAL', 'OTHER'];
  const goalsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = goals.filter(g => g.category === cat).length;
    return acc;
  }, {} as Record<GoalCategory, number>);

  return {
    totalGoals: goals.length,
    activeGoals: activeGoals.length,
    completedGoals: completedGoals.length,
    averageProgress,
    goalsByCategory,
  };
}

/**
 * Get display information for goal categories
 */
function getCategoryInfo(category: GoalCategory): {
  label: string;
  icon: string;
  color: string;
} {
  const categoryInfo: Record<GoalCategory, { label: string; icon: string; color: string }> = {
    SPEED: { label: 'Speed', icon: 'flash', color: '#F59E0B' },
    TECHNIQUE: { label: 'Technique', icon: 'football', color: '#3B82F6' },
    FITNESS: { label: 'Fitness', icon: 'fitness', color: '#10B981' },
    TACTICAL: { label: 'Tactical', icon: 'bulb', color: '#8B5CF6' },
    MENTAL: { label: 'Mental', icon: 'brain', color: '#EC4899' },
    OTHER: { label: 'Other', icon: 'star', color: '#6B7280' },
  };

  return categoryInfo[category] ?? categoryInfo.OTHER;
}

/**
 * Get display information for goal status
 */
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

/**
 * Format a target date for display
 */
function formatTargetDate(date: string | undefined): string {
  if (!date) return 'No deadline';
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Check if a goal's target date has passed
 */
function isOverdue(goal: Goal): boolean {
  if (!goal.targetDate || goal.status === 'COMPLETED') return false;
  const target = new Date(goal.targetDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return target < today;
}

/**
 * Reset goals to mock data (for development/testing)
 */
async function resetToMockData(): Promise<void> {
  await saveGoals([...MOCK_GOALS]);
  logger.info('goals_reset_to_mock');
}

// Export the service
export const goalService = {
  // CRUD operations
  createGoal,
  getUserGoals,
  getGoalById,
  updateGoal,
  deleteGoal,

  // Milestone operations
  addMilestone,
  completeMilestone,
  uncompleteMilestone,
  deleteMilestone,

  // Progress
  getGoalProgress,
  calculateGoalProgress,

  // Coach/athlete views
  getAthleteGoals,
  getGoalStats,

  // Helpers
  getCategoryInfo,
  getStatusInfo,
  formatTargetDate,
  isOverdue,

  // Development
  resetToMockData,
};
