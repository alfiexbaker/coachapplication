/**
 * Analytics Service
 *
 * Provides detailed analytics for athletes and coaches.
 * Tracks progress, skills, goals, and performance metrics.
 *
 * API Integration Notes:
 * - GET /api/athletes/:id/analytics?period=MONTH - Get analytics
 * - GET /api/athletes/:id/skills/history - Skill progression
 * - POST /api/athletes/:id/goals - Create goal
 * - PATCH /api/goals/:id/progress - Update progress
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AthleteAnalytics, SkillProgress, Goal, GoalMilestone, FootballObjective } from '@/constants/types';

const ANALYTICS_STORAGE_KEY = 'athlete_analytics';
const GOALS_STORAGE_KEY = 'athlete_goals';
const USE_MOCK = true;

// Mock analytics data
const MOCK_ANALYTICS: AthleteAnalytics[] = [
  {
    athleteId: 'athlete_1',
    athleteName: 'Tom Baker',
    period: 'MONTH',
    totalSessions: 24,
    sessionsThisPeriod: 8,
    averageSessionRating: 4.5,
    attendanceRate: 95,
    skills: [
      {
        skillName: 'Dribbling',
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
        skillName: 'Defending',
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
        skillName: 'Conditioning',
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
    athleteId: 'athlete_1',
    title: 'Master weak foot finishing',
    description: 'Be confident shooting with left foot from inside the box',
    targetDate: '2026-03-01',
    progress: 45,
    milestones: [
      { id: 'ms_1', title: 'Complete 5 weak foot drills', isCompleted: true, completedAt: '2025-12-15' },
      { id: 'ms_2', title: 'Score 3 goals in training with weak foot', isCompleted: true, completedAt: '2026-01-05' },
      { id: 'ms_3', title: 'Score weak foot goal in match', isCompleted: false },
      { id: 'ms_4', title: 'Consistent accuracy from 15 yards', isCompleted: false },
    ],
    status: 'ACTIVE',
    createdBy: 'COACH',
    createdById: 'coach_1',
    createdAt: '2025-11-01T10:00:00Z',
    updatedAt: '2026-01-05T14:00:00Z',
  },
  {
    id: 'goal_2',
    athleteId: 'athlete_1',
    title: 'Improve first touch under pressure',
    description: 'Control the ball cleanly when defenders are close',
    targetDate: '2026-02-15',
    progress: 70,
    milestones: [
      { id: 'ms_5', title: 'Practice receiving drills for 4 weeks', isCompleted: true, completedAt: '2025-12-20' },
      { id: 'ms_6', title: 'Demonstrate in 1v1 scenarios', isCompleted: true, completedAt: '2026-01-03' },
      { id: 'ms_7', title: 'Apply in match situations', isCompleted: false },
    ],
    status: 'ACTIVE',
    createdBy: 'COACH',
    createdById: 'coach_1',
    createdAt: '2025-11-15T09:00:00Z',
    updatedAt: '2026-01-03T16:00:00Z',
  },
  {
    id: 'goal_3',
    athleteId: 'athlete_1',
    title: 'Complete 10 consecutive sessions',
    description: 'Build consistency and commitment',
    targetDate: '2025-12-31',
    progress: 100,
    milestones: [
      { id: 'ms_8', title: '5 sessions', isCompleted: true, completedAt: '2025-11-20' },
      { id: 'ms_9', title: '8 sessions', isCompleted: true, completedAt: '2025-12-10' },
      { id: 'ms_10', title: '10 sessions', isCompleted: true, completedAt: '2025-12-28' },
    ],
    status: 'COMPLETED',
    createdBy: 'ATHLETE',
    createdById: 'athlete_1',
    createdAt: '2025-10-15T11:00:00Z',
    updatedAt: '2025-12-28T17:00:00Z',
  },
];

let analyticsCache: AthleteAnalytics[] = [...MOCK_ANALYTICS];
let goalsCache: Goal[] = [...MOCK_GOALS];

async function loadAnalytics(): Promise<AthleteAnalytics[]> {
  try {
    const stored = await AsyncStorage.getItem(ANALYTICS_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (error) {
    console.error('[AnalyticsService] Failed to load analytics:', error);
  }
  return [...MOCK_ANALYTICS];
}

async function loadGoals(): Promise<Goal[]> {
  try {
    const stored = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (error) {
    console.error('[AnalyticsService] Failed to load goals:', error);
  }
  return [...MOCK_GOALS];
}

async function saveGoals(goals: Goal[]): Promise<void> {
  try {
    await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
  } catch (error) {
    console.error('[AnalyticsService] Failed to save goals:', error);
  }
}

export type AnalyticsPeriod = 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR' | 'ALL';

export const analyticsService = {
  /**
   * Get analytics for an athlete
   */
  async getAthleteAnalytics(athleteId: string, period: AnalyticsPeriod = 'MONTH'): Promise<AthleteAnalytics | null> {
    if (USE_MOCK) {
      analyticsCache = await loadAnalytics();
      goalsCache = await loadGoals();

      const analytics = analyticsCache.find((a) => a.athleteId === athleteId);
      if (analytics) {
        // Attach goals
        analytics.activeGoals = goalsCache.filter(
          (g) => g.athleteId === athleteId && g.status === 'ACTIVE'
        );
        analytics.completedGoals = goalsCache.filter(
          (g) => g.athleteId === athleteId && g.status === 'COMPLETED'
        );
        analytics.period = period;
        return analytics;
      }

      // Return mock analytics for any athlete
      return {
        athleteId,
        athleteName: 'Athlete',
        period,
        totalSessions: 0,
        sessionsThisPeriod: 0,
        averageSessionRating: 0,
        attendanceRate: 0,
        skills: [],
        activeGoals: goalsCache.filter((g) => g.athleteId === athleteId && g.status === 'ACTIVE'),
        completedGoals: goalsCache.filter((g) => g.athleteId === athleteId && g.status === 'COMPLETED'),
        improvementRate: 0,
        consistencyScore: 0,
        percentileRank: 50,
      };
    }

    const response = await fetch(`/api/athletes/${athleteId}/analytics?period=${period}`);
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Get skill progression history for an athlete
   */
  async getSkillHistory(athleteId: string, skillName?: string): Promise<SkillProgress[]> {
    if (USE_MOCK) {
      analyticsCache = await loadAnalytics();
      const analytics = analyticsCache.find((a) => a.athleteId === athleteId);
      if (!analytics) return [];

      if (skillName) {
        const skill = analytics.skills.find((s) => s.skillName === skillName);
        return skill ? [skill] : [];
      }

      return analytics.skills;
    }

    let url = `/api/athletes/${athleteId}/skills/history`;
    if (skillName) url += `?skill=${encodeURIComponent(skillName)}`;

    const response = await fetch(url);
    return response.json();
  },

  /**
   * Get all goals for an athlete
   */
  async getAthleteGoals(athleteId: string, status?: Goal['status']): Promise<Goal[]> {
    if (USE_MOCK) {
      goalsCache = await loadGoals();
      let filtered = goalsCache.filter((g) => g.athleteId === athleteId);
      if (status) {
        filtered = filtered.filter((g) => g.status === status);
      }
      return filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    let url = `/api/athletes/${athleteId}/goals`;
    if (status) url += `?status=${status}`;

    const response = await fetch(url);
    return response.json();
  },

  /**
   * Create a new goal
   */
  async createGoal(input: {
    athleteId: string;
    title: string;
    description?: string;
    targetDate?: string;
    milestones?: string[];
    createdBy: 'COACH' | 'ATHLETE' | 'PARENT';
    createdById: string;
  }): Promise<Goal> {
    const now = new Date().toISOString();
    const newGoal: Goal = {
      id: `goal_${Date.now()}`,
      athleteId: input.athleteId,
      title: input.title,
      description: input.description,
      targetDate: input.targetDate,
      progress: 0,
      milestones: (input.milestones || []).map((title, index) => ({
        id: `ms_${Date.now()}_${index}`,
        title,
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
      await saveGoals(goalsCache);
      return newGoal;
    }

    const response = await fetch(`/api/athletes/${input.athleteId}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newGoal),
    });
    return response.json();
  },

  /**
   * Update goal progress
   */
  async updateGoalProgress(goalId: string, progress: number): Promise<Goal> {
    if (USE_MOCK) {
      goalsCache = await loadGoals();
      const goal = goalsCache.find((g) => g.id === goalId);
      if (!goal) throw new Error('Goal not found');

      goal.progress = Math.min(100, Math.max(0, progress));
      goal.updatedAt = new Date().toISOString();

      if (goal.progress === 100) {
        goal.status = 'COMPLETED';
      }

      await saveGoals(goalsCache);
      return goal;
    }

    const response = await fetch(`/api/goals/${goalId}/progress`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress }),
    });
    return response.json();
  },

  /**
   * Complete a milestone
   */
  async completeMilestone(goalId: string, milestoneId: string): Promise<Goal> {
    if (USE_MOCK) {
      goalsCache = await loadGoals();
      const goal = goalsCache.find((g) => g.id === goalId);
      if (!goal) throw new Error('Goal not found');

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

      await saveGoals(goalsCache);
      return goal;
    }

    const response = await fetch(`/api/goals/${goalId}/milestones/${milestoneId}/complete`, {
      method: 'PATCH',
    });
    return response.json();
  },

  /**
   * Add milestone to goal
   */
  async addMilestone(goalId: string, title: string): Promise<Goal> {
    if (USE_MOCK) {
      goalsCache = await loadGoals();
      const goal = goalsCache.find((g) => g.id === goalId);
      if (!goal) throw new Error('Goal not found');

      goal.milestones.push({
        id: `ms_${Date.now()}`,
        title,
        isCompleted: false,
      });
      goal.updatedAt = new Date().toISOString();

      // Recalculate progress
      const completedCount = goal.milestones.filter((m) => m.isCompleted).length;
      goal.progress = Math.round((completedCount / goal.milestones.length) * 100);

      await saveGoals(goalsCache);
      return goal;
    }

    const response = await fetch(`/api/goals/${goalId}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    return response.json();
  },

  /**
   * Abandon a goal
   */
  async abandonGoal(goalId: string): Promise<Goal> {
    if (USE_MOCK) {
      goalsCache = await loadGoals();
      const goal = goalsCache.find((g) => g.id === goalId);
      if (!goal) throw new Error('Goal not found');

      goal.status = 'ABANDONED';
      goal.updatedAt = new Date().toISOString();

      await saveGoals(goalsCache);
      return goal;
    }

    const response = await fetch(`/api/goals/${goalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ABANDONED' }),
    });
    return response.json();
  },

  /**
   * Update skill level (called after session)
   */
  async updateSkillLevel(
    athleteId: string,
    skill: FootballObjective,
    newLevel: number
  ): Promise<void> {
    if (USE_MOCK) {
      analyticsCache = await loadAnalytics();
      let analytics = analyticsCache.find((a) => a.athleteId === athleteId);

      if (!analytics) {
        // Create new analytics record
        analytics = {
          athleteId,
          athleteName: 'Athlete',
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

      let skillProgress = analytics.skills.find((s) => s.skillName === skill);
      const today = new Date().toISOString().split('T')[0];

      if (skillProgress) {
        skillProgress.previousLevel = skillProgress.currentLevel;
        skillProgress.currentLevel = newLevel;
        skillProgress.changePercent = skillProgress.previousLevel > 0
          ? ((newLevel - skillProgress.previousLevel) / skillProgress.previousLevel) * 100
          : 0;
        skillProgress.history.push({ date: today, level: newLevel });
      } else {
        skillProgress = {
          skillName: skill,
          category: 'Technical',
          currentLevel: newLevel,
          previousLevel: 0,
          changePercent: 0,
          history: [{ date: today, level: newLevel }],
        };
        analytics.skills.push(skillProgress);
      }

      await AsyncStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(analyticsCache));
    }
  },

  /**
   * Get comparison stats (for radar chart)
   */
  async getSkillComparison(athleteId: string): Promise<{
    skills: { name: string; athleteLevel: number; averageLevel: number }[];
  }> {
    const analytics = await this.getAthleteAnalytics(athleteId);
    if (!analytics) {
      return { skills: [] };
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

    return {
      skills: analytics.skills.map((s) => ({
        name: s.skillName,
        athleteLevel: s.currentLevel,
        averageLevel: averageLevels[s.skillName] || 50,
      })),
    };
  },
};
