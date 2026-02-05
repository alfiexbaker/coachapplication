import { storageService } from './storage-service';
import { badgeService } from './badge-service';
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

const logger = createLogger('ProgressService');

// Storage keys
const SKILL_LEVELS_KEY = 'progress.skill_levels';
const SESSION_FEEDBACK_KEY = 'progress.session_feedback';
const GOALS_KEY = 'progress.goals';
const SESSION_NOTES_KEY = 'progress.session_notes';

// ============================================================================
// TYPES
// ============================================================================

export interface SkillLevel {
  skill: string;
  level: number; // 1-10
  previousLevel?: number;
  lastUpdated: string;
  updatedBy: string; // coachId
  trend: 'improving' | 'steady' | 'declining';
  history: { date: string; level: number; coachId: string }[];
}

export interface AthleteSkillLevels {
  athleteId: string;
  skills: Record<string, SkillLevel>;
  lastUpdated: string;
}

export interface SessionFeedback {
  id: string;
  sessionId: string;
  bookingId?: string;
  coachId: string;
  coachName: string;
  athleteId: string;
  athleteName: string;
  createdAt: string;
  // Coach-visible fields
  privateNotes?: string;
  // Parent/Athlete-visible fields
  publicSummary: string;
  skillsWorkedOn: string[];
  skillRatings: { skill: string; rating: number; previousRating?: number }[];
  improvements: string;
  homework: string;
  effortRating: number; // 1-5
  overallPerformance: number; // 1-5
  videoClipUrls?: string[];
  badgeAwarded?: string;
  // Visibility
  visibility: 'coach_only' | 'parent' | 'athlete';
}

export interface AthleteProgress {
  athleteId: string;
  athleteName: string;
  // Overview metrics
  totalSessions: number;
  sessionsThisMonth: number;
  averagePerformance: number;
  averageEffort: number;
  attendanceRate: number;
  // Skill levels
  skills: SkillLevel[];
  // Trend analysis
  overallTrend: 'improving' | 'steady' | 'declining';
  improvementRate: number; // percentage
  // Goals
  activeGoals: Goal[];
  completedGoals: Goal[];
  // Recent feedback
  recentFeedback: SessionFeedback[];
  // Badge summary
  totalBadges: number;
  recentBadges: {
    id: string;
    label: string;
    awardedAt: string;
    category?: string;
  }[];
  // Progression
  currentLevel: { level: number; name: string };
  totalPoints: number;
  progressToNextLevel: number;
}

export type SessionNoteFields = {
  summary: string;
  focus: string[];
  improvements: string;
  homework: string;
  effort: number;
  attendance: string;
};

export type SessionNoteRecord = SessionNoteFields & {
  updatedAt: string;
};

// ============================================================================
// SKILL LEVEL MANAGEMENT
// ============================================================================

async function getAllSkillLevels(): Promise<Record<string, AthleteSkillLevels>> {
  return storageService.getItem<Record<string, AthleteSkillLevels>>(SKILL_LEVELS_KEY, {});
}

async function getAthleteSkillLevels(athleteId: string): Promise<AthleteSkillLevels | null> {
  const allLevels = await getAllSkillLevels();
  return allLevels[athleteId] ?? null;
}

async function updateSkillLevel(
  athleteId: string,
  skill: string,
  newLevel: number,
  coachId: string
): Promise<SkillLevel> {
  const allLevels = await getAllSkillLevels();
  const athleteData = allLevels[athleteId] ?? {
    athleteId,
    skills: {},
    lastUpdated: new Date().toISOString(),
  };

  const existingSkill = athleteData.skills[skill];
  const previousLevel = existingSkill?.level ?? 0;
  const history = existingSkill?.history ?? [];

  // Add to history
  history.push({
    date: new Date().toISOString(),
    level: newLevel,
    coachId,
  });

  // Keep only last 20 entries
  const trimmedHistory = history.slice(-20);

  // Calculate trend based on last 3 entries
  let trend: 'improving' | 'steady' | 'declining' = 'steady';
  if (trimmedHistory.length >= 2) {
    const recentLevels = trimmedHistory.slice(-3).map(h => h.level);
    const avgRecent = recentLevels.reduce((a, b) => a + b, 0) / recentLevels.length;
    const firstLevel = recentLevels[0];
    if (avgRecent > firstLevel + 0.3) trend = 'improving';
    else if (avgRecent < firstLevel - 0.3) trend = 'declining';
  }

  const updatedSkill: SkillLevel = {
    skill,
    level: newLevel,
    previousLevel,
    lastUpdated: new Date().toISOString(),
    updatedBy: coachId,
    trend,
    history: trimmedHistory,
  };

  athleteData.skills[skill] = updatedSkill;
  athleteData.lastUpdated = new Date().toISOString();
  allLevels[athleteId] = athleteData;

  await storageService.setItem(SKILL_LEVELS_KEY, allLevels);

  logger.info('skill_level_updated', {
    athleteId,
    skill,
    previousLevel,
    newLevel,
    trend,
  });

  return updatedSkill;
}

async function updateMultipleSkillLevels(
  athleteId: string,
  skillUpdates: { skill: string; level: number }[],
  coachId: string
): Promise<SkillLevel[]> {
  const results: SkillLevel[] = [];
  for (const update of skillUpdates) {
    const result = await updateSkillLevel(athleteId, update.skill, update.level, coachId);
    results.push(result);
  }
  return results;
}

// ============================================================================
// SESSION FEEDBACK MANAGEMENT
// ============================================================================

async function getAllSessionFeedback(): Promise<SessionFeedback[]> {
  return storageService.getItem<SessionFeedback[]>(SESSION_FEEDBACK_KEY, []);
}

async function addSessionFeedback(feedback: Omit<SessionFeedback, 'id' | 'createdAt'>): Promise<SessionFeedback> {
  const allFeedback = await getAllSessionFeedback();

  const newFeedback: SessionFeedback = {
    ...feedback,
    id: `feedback_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  // Update skill levels based on ratings
  if (feedback.skillRatings && feedback.skillRatings.length > 0) {
    await updateMultipleSkillLevels(
      feedback.athleteId,
      feedback.skillRatings.map(r => ({ skill: r.skill, level: r.rating })),
      feedback.coachId
    );
  }

  allFeedback.unshift(newFeedback);
  await storageService.setItem(SESSION_FEEDBACK_KEY, allFeedback);

  logger.info('session_feedback_added', {
    feedbackId: newFeedback.id,
    sessionId: feedback.sessionId,
    athleteId: feedback.athleteId,
    coachId: feedback.coachId,
    skillCount: feedback.skillRatings?.length ?? 0,
  });

  return newFeedback;
}

async function getSessionFeedback(sessionId: string): Promise<SessionFeedback | null> {
  const allFeedback = await getAllSessionFeedback();
  return allFeedback.find(f => f.sessionId === sessionId) ?? null;
}

async function getFeedbackForAthlete(
  athleteId: string,
  viewerRole: 'coach' | 'parent' | 'athlete',
  limit?: number
): Promise<SessionFeedback[]> {
  const allFeedback = await getAllSessionFeedback();
  let filtered = allFeedback.filter(f => f.athleteId === athleteId);

  // Filter based on visibility
  if (viewerRole === 'parent') {
    filtered = filtered.filter(f => f.visibility !== 'coach_only');
    // Remove private notes for parents
    filtered = filtered.map(f => ({ ...f, privateNotes: undefined }));
  } else if (viewerRole === 'athlete') {
    filtered = filtered.filter(f => f.visibility === 'athlete');
    // Remove private notes for athletes
    filtered = filtered.map(f => ({ ...f, privateNotes: undefined }));
  }

  if (limit) {
    filtered = filtered.slice(0, limit);
  }

  return filtered;
}

// ============================================================================
// SESSION NOTES MANAGEMENT
// ============================================================================

async function getAllSessionNotes(): Promise<Record<string, SessionNoteRecord>> {
  return storageService.getItem<Record<string, SessionNoteRecord>>(SESSION_NOTES_KEY, {});
}

async function getSessionNote(bookingId: string): Promise<SessionNoteRecord | null> {
  const notes = await getAllSessionNotes();
  return notes[bookingId] ?? null;
}

async function saveSessionNote(
  bookingId: string,
  payload: SessionNoteFields
): Promise<SessionNoteRecord> {
  const existing = await getAllSessionNotes();
  const record: SessionNoteRecord = {
    ...payload,
    updatedAt: new Date().toISOString(),
  };

  await storageService.setItem(SESSION_NOTES_KEY, { ...existing, [bookingId]: record });

  logger.info('session_note_saved', {
    bookingId,
    focusAreas: payload.focus.length,
  });

  return record;
}

// ============================================================================
// GOALS MANAGEMENT
// ============================================================================

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

async function getAllGoals(): Promise<Goal[]> {
  const goals = await storageService.getItem<Goal[]>(GOALS_KEY, []);
  // Return mock data if no goals stored
  if (goals.length === 0) {
    return [...MOCK_GOALS];
  }
  return goals;
}

async function saveGoals(goals: Goal[]): Promise<void> {
  await storageService.setItem(GOALS_KEY, goals);
}

async function getGoalsForAthlete(athleteId: string): Promise<{ active: Goal[]; completed: Goal[] }> {
  const allGoals = await getAllGoals();
  const athleteGoals = allGoals.filter(g => g.athleteId === athleteId);

  return {
    active: athleteGoals.filter(g => g.status === 'ACTIVE'),
    completed: athleteGoals.filter(g => g.status === 'COMPLETED'),
  };
}

async function createGoal(
  userId: string,
  params: CreateGoalInput | Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>,
  createdBy: GoalCreator = 'ATHLETE',
  createdById: string = userId
): Promise<Goal> {
  const allGoals = await getAllGoals();
  const now = new Date().toISOString();
  const goalId = `goal_${Date.now()}`;

  // Handle both old and new parameter formats
  const isCreateInput = 'milestones' in params && Array.isArray(params.milestones) &&
    typeof params.milestones[0] === 'string';

  let milestones: GoalMilestone[];

  if (isCreateInput) {
    // New format: params.milestones is string[]
    const input = params as CreateGoalInput;
    milestones = (input.milestones ?? []).map((title, index) => ({
      id: `ms_${Date.now()}_${index}`,
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

async function getGoalById(id: string): Promise<Goal | null> {
  const goals = await getAllGoals();
  return goals.find(g => g.id === id) ?? null;
}

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

async function updateGoalProgress(
  goalId: string,
  progress: number,
  completedMilestones?: string[]
): Promise<Goal | null> {
  const allGoals = await getAllGoals();
  const goalIndex = allGoals.findIndex(g => g.id === goalId);

  if (goalIndex === -1) return null;

  const goal = allGoals[goalIndex];
  goal.progress = progress;
  goal.updatedAt = new Date().toISOString();

  // Update milestones if provided
  if (completedMilestones) {
    goal.milestones = goal.milestones.map(m => ({
      ...m,
      isCompleted: completedMilestones.includes(m.id),
      completedAt: completedMilestones.includes(m.id) ? new Date().toISOString() : m.completedAt,
    }));
  }

  // Auto-complete if progress is 100
  if (progress >= 100) {
    goal.status = 'COMPLETED';
  }

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

function calculateGoalProgress(goal: Goal): number {
  if (goal.milestones.length === 0) {
    return 0;
  }
  const completed = goal.milestones.filter(m => m.isCompleted).length;
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
    active: goals.filter(g => g.status === 'ACTIVE'),
    completed: goals.filter(g => g.status === 'COMPLETED'),
    paused: goals.filter(g => g.status === 'PAUSED'),
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

// ============================================================================
// GOAL HELPER FUNCTIONS
// ============================================================================

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
// COMPREHENSIVE PROGRESS DATA
// ============================================================================

async function getAthleteProgress(
  athleteId: string,
  viewerRole: 'coach' | 'parent' | 'athlete' = 'parent'
): Promise<AthleteProgress> {
  // Fetch all data in parallel
  const [
    skillLevels,
    feedback,
    goals,
    badgeProgress,
    badges,
  ] = await Promise.all([
    getAthleteSkillLevels(athleteId),
    getFeedbackForAthlete(athleteId, viewerRole, 10),
    getGoalsForAthlete(athleteId),
    badgeService.getProgressToNextLevel(athleteId),
    badgeService.listAwardsForAthlete(athleteId),
  ]);

  // Convert skills to array
  const skills = skillLevels
    ? Object.values(skillLevels.skills)
    : [];

  // Calculate metrics from feedback
  const totalSessions = feedback.length;
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sessionsThisMonth = feedback.filter(
    f => new Date(f.createdAt) >= monthAgo
  ).length;

  const avgPerformance = feedback.length > 0
    ? feedback.reduce((sum, f) => sum + f.overallPerformance, 0) / feedback.length
    : 0;

  const avgEffort = feedback.length > 0
    ? feedback.reduce((sum, f) => sum + f.effortRating, 0) / feedback.length
    : 0;

  // Calculate overall trend
  const improvingSkills = skills.filter(s => s.trend === 'improving').length;
  const decliningSkills = skills.filter(s => s.trend === 'declining').length;
  let overallTrend: 'improving' | 'steady' | 'declining' = 'steady';
  if (improvingSkills > decliningSkills + 1) overallTrend = 'improving';
  else if (decliningSkills > improvingSkills + 1) overallTrend = 'declining';

  // Calculate improvement rate
  const improvementRate = skills.length > 0
    ? Math.round((improvingSkills / skills.length) * 100)
    : 0;

  // Filter badges for visibility
  const visibleBadges = viewerRole === 'coach'
    ? badges
    : badges.filter(b => b.visibility !== 'coach_only');

  return {
    athleteId,
    athleteName: '', // Will be filled by caller
    totalSessions,
    sessionsThisMonth,
    averagePerformance: Math.round(avgPerformance * 10) / 10,
    averageEffort: Math.round(avgEffort * 10) / 10,
    attendanceRate: 100, // Would calculate from actual session data
    skills,
    overallTrend,
    improvementRate,
    activeGoals: goals.active,
    completedGoals: goals.completed,
    recentFeedback: feedback.slice(0, 5),
    totalBadges: visibleBadges.length,
    recentBadges: visibleBadges.slice(0, 5).map(b => ({
      id: b.id,
      label: b.badgeLabel,
      awardedAt: b.awardedAt,
      category: b.badgeCategory,
    })),
    currentLevel: badgeProgress.currentLevel,
    totalPoints: badgeProgress.totalPoints,
    progressToNextLevel: badgeProgress.progressPercent,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const progressService = {
  // Skill levels
  getAthleteSkillLevels,
  updateSkillLevel,
  updateMultipleSkillLevels,

  // Session feedback
  addSessionFeedback,
  getSessionFeedback,
  getFeedbackForAthlete,

  // Session notes
  getSessionNote,
  saveSessionNote,

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

  // Comprehensive progress
  getAthleteProgress,
};
