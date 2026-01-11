import { storageService } from './storage-service';
import { badgeService } from './badge-service';
import { createLogger } from '@/utils/logger';
import type { FootballObjective, Goal, GoalMilestone, SkillProgress } from '@/constants/types';

const logger = createLogger('ProgressService');

// Storage keys
const SKILL_LEVELS_KEY = 'progress.skill_levels';
const SESSION_FEEDBACK_KEY = 'progress.session_feedback';
const GOALS_KEY = 'progress.goals';

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
  history: Array<{ date: string; level: number; coachId: string }>;
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
  skillRatings: Array<{ skill: string; rating: number; previousRating?: number }>;
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
  recentBadges: Array<{
    id: string;
    label: string;
    awardedAt: string;
    category?: string;
  }>;
  // Progression
  currentLevel: { level: number; name: string };
  totalPoints: number;
  progressToNextLevel: number;
}

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
  skillUpdates: Array<{ skill: string; level: number }>,
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
// GOALS MANAGEMENT
// ============================================================================

async function getAllGoals(): Promise<Goal[]> {
  return storageService.getItem<Goal[]>(GOALS_KEY, []);
}

async function getGoalsForAthlete(athleteId: string): Promise<{ active: Goal[]; completed: Goal[] }> {
  const allGoals = await getAllGoals();
  const athleteGoals = allGoals.filter(g => g.athleteId === athleteId);

  return {
    active: athleteGoals.filter(g => g.status === 'ACTIVE'),
    completed: athleteGoals.filter(g => g.status === 'COMPLETED'),
  };
}

async function createGoal(goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Goal> {
  const allGoals = await getAllGoals();

  const newGoal: Goal = {
    ...goal,
    id: `goal_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  allGoals.unshift(newGoal);
  await storageService.setItem(GOALS_KEY, allGoals);

  logger.info('goal_created', {
    goalId: newGoal.id,
    athleteId: goal.athleteId,
    createdBy: goal.createdBy,
  });

  return newGoal;
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
  await storageService.setItem(GOALS_KEY, allGoals);

  return goal;
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

  // Goals
  getGoalsForAthlete,
  createGoal,
  updateGoalProgress,

  // Comprehensive progress
  getAthleteProgress,
};
