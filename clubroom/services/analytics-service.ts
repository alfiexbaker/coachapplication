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
import type {
  AthleteAnalytics,
  SkillProgress,
  Goal,
  FootballObjective,
  CoachAnalytics,
  CoachAnalyticsPeriod,
  AnalyticsDateRange,
  RevenueDataPoint,
  RetentionMetrics,
  CancellationStats,
  SessionStats,
  PeakHoursData,
  TopSkillData,
} from '@/constants/types';
import { DAY_NAMES } from '@/constants/booking-types';
import { createLogger } from '@/utils/logger';
import { api } from '@/constants/config';

const logger = createLogger('AnalyticsService');

const ANALYTICS_STORAGE_KEY = 'athlete_analytics';
const GOALS_STORAGE_KEY = 'athlete_goals';
const COACH_ANALYTICS_STORAGE_KEY = 'coach_analytics';

// Use centralized config for mock mode
const USE_MOCK = api.useMock;


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
    userId: 'athlete_1',
    athleteId: 'athlete_1',
    title: 'Master weak foot finishing',
    description: 'Be confident shooting with left foot from inside the box',
    category: 'TECHNIQUE',
    targetDate: '2026-03-01',
    progress: 45,
    milestones: [
      { id: 'ms_1', goalId: 'goal_1', title: 'Complete 5 weak foot drills', isCompleted: true, completedAt: '2025-12-15', order: 0 },
      { id: 'ms_2', goalId: 'goal_1', title: 'Score 3 goals in training with weak foot', isCompleted: true, completedAt: '2026-01-05', order: 1 },
      { id: 'ms_3', goalId: 'goal_1', title: 'Score weak foot goal in match', isCompleted: false, order: 2 },
      { id: 'ms_4', goalId: 'goal_1', title: 'Consistent accuracy from 15 yards', isCompleted: false, order: 3 },
    ],
    status: 'ACTIVE',
    createdBy: 'COACH',
    createdById: 'coach_1',
    createdAt: '2025-11-01T10:00:00Z',
    updatedAt: '2026-01-05T14:00:00Z',
  },
  {
    id: 'goal_2',
    userId: 'athlete_1',
    athleteId: 'athlete_1',
    title: 'Improve first touch under pressure',
    description: 'Control the ball cleanly when defenders are close',
    category: 'TECHNIQUE',
    targetDate: '2026-02-15',
    progress: 70,
    milestones: [
      { id: 'ms_5', goalId: 'goal_2', title: 'Practice receiving drills for 4 weeks', isCompleted: true, completedAt: '2025-12-20', order: 0 },
      { id: 'ms_6', goalId: 'goal_2', title: 'Demonstrate in 1v1 scenarios', isCompleted: true, completedAt: '2026-01-03', order: 1 },
      { id: 'ms_7', goalId: 'goal_2', title: 'Apply in match situations', isCompleted: false, order: 2 },
    ],
    status: 'ACTIVE',
    createdBy: 'COACH',
    createdById: 'coach_1',
    createdAt: '2025-11-15T09:00:00Z',
    updatedAt: '2026-01-03T16:00:00Z',
  },
  {
    id: 'goal_3',
    userId: 'athlete_1',
    athleteId: 'athlete_1',
    title: 'Complete 10 consecutive sessions',
    description: 'Build consistency and commitment',
    category: 'FITNESS',
    targetDate: '2025-12-31',
    progress: 100,
    milestones: [
      { id: 'ms_8', goalId: 'goal_3', title: '5 sessions', isCompleted: true, completedAt: '2025-11-20', order: 0 },
      { id: 'ms_9', goalId: 'goal_3', title: '8 sessions', isCompleted: true, completedAt: '2025-12-10', order: 1 },
      { id: 'ms_10', goalId: 'goal_3', title: '10 sessions', isCompleted: true, completedAt: '2025-12-28', order: 2 },
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
    logger.error('Failed to load analytics', error);
  }
  return [...MOCK_ANALYTICS];
}

async function loadGoals(): Promise<Goal[]> {
  try {
    const stored = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (error) {
    logger.error('Failed to load goals', error);
  }
  return [...MOCK_GOALS];
}

async function saveGoals(goals: Goal[]): Promise<void> {
  try {
    await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
  } catch (error) {
    logger.error('Failed to save goals', error);
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
    category?: 'SPEED' | 'TECHNIQUE' | 'FITNESS' | 'TACTICAL' | 'MENTAL' | 'OTHER';
    targetDate?: string;
    milestones?: string[];
    createdBy: 'COACH' | 'ATHLETE' | 'PARENT';
    createdById: string;
  }): Promise<Goal> {
    const now = new Date().toISOString();
    const goalId = `goal_${Date.now()}`;
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
        id: `ms_${Date.now()}_${index}`,
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
        goalId: goalId,
        title,
        order: goal.milestones.length,
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

// ============================================================================
// COACH ANALYTICS SERVICE
// ============================================================================

/**
 * Helper to get date range based on period
 */
function getDateRangeForPeriod(period: CoachAnalyticsPeriod): AnalyticsDateRange {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'WEEK':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case 'MONTH':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'QUARTER':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'YEAR':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'ALL':
    default:
      startDate = new Date(2020, 0, 1);
      break;
  }

  return {
    startDate: startDate.toISOString(),
    endDate: now.toISOString(),
  };
}


/**
 * Generate mock revenue chart data
 */
function generateMockRevenueChart(period: CoachAnalyticsPeriod, baseRevenue: number): RevenueDataPoint[] {
  const points: RevenueDataPoint[] = [];
  const now = new Date();
  let dataPoints: number;
  let intervalDays: number;

  switch (period) {
    case 'WEEK':
      dataPoints = 7;
      intervalDays = 1;
      break;
    case 'MONTH':
      dataPoints = 4;
      intervalDays = 7;
      break;
    case 'QUARTER':
      dataPoints = 12;
      intervalDays = 7;
      break;
    case 'YEAR':
      dataPoints = 12;
      intervalDays = 30;
      break;
    default:
      dataPoints = 6;
      intervalDays = 30;
  }

  for (let i = dataPoints - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i * intervalDays);
    const variance = 0.7 + Math.random() * 0.6;
    const amount = Math.round((baseRevenue / dataPoints) * variance);
    const sessionCount = Math.round(amount / 50);
    points.push({
      date: date.toISOString().split('T')[0],
      amount,
      sessionCount,
    });
  }

  return points;
}

/**
 * Generate mock peak hours data
 */
function generateMockPeakHours(): PeakHoursData[] {
  const peakHours: PeakHoursData[] = [];
  const peakPattern: Record<number, number[]> = {
    0: [9, 10, 11], // Sunday
    1: [16, 17, 18, 19], // Monday
    2: [16, 17, 18, 19], // Tuesday
    3: [16, 17, 18, 19], // Wednesday
    4: [16, 17, 18, 19], // Thursday
    5: [16, 17, 18], // Friday
    6: [9, 10, 11, 14, 15], // Saturday
  };

  for (let day = 0; day < 7; day++) {
    for (let hour = 6; hour < 21; hour++) {
      const isPeak = peakPattern[day]?.includes(hour);
      const sessionCount = isPeak ? Math.floor(Math.random() * 4) + 2 : Math.random() > 0.7 ? 1 : 0;
      const maxSessions = 5;
      peakHours.push({
        dayOfWeek: day,
        dayName: DAY_NAMES[day],
        hour,
        sessionCount,
        intensity: sessionCount / maxSessions,
      });
    }
  }

  return peakHours;
}

/**
 * Mock coach analytics data
 */
const MOCK_COACH_ANALYTICS: Record<string, CoachAnalytics> = {
  coach1: {
    coachId: 'coach1',
    coachName: 'Marcus Thompson',
    period: 'MONTH',
    dateRange: getDateRangeForPeriod('MONTH'),
    totalRevenue: 2340,
    revenueChange: 280,
    revenueChangePercent: 13.6,
    revenueTrend: 'UP',
    revenueChart: generateMockRevenueChart('MONTH', 2340),
    projectedRevenue: 2650,
    avgRevenuePerSession: 52,
    sessions: {
      totalSessions: 45,
      sessionsChange: 5,
      sessionsChangePercent: 12.5,
      avgSessionsPerWeek: 11,
      avgDuration: 60,
      popularSessionType: '1-on-1 Coaching',
      bySessionType: [
        { type: '1-on-1 Coaching', count: 32, percentage: 71, revenue: 1920 },
        { type: 'Group Training', count: 10, percentage: 22, revenue: 350 },
        { type: 'Assessment', count: 3, percentage: 7, revenue: 70 },
      ],
    },
    retention: {
      newClients: 4,
      returningClients: 18,
      churnRate: 8.5,
      retentionRate: 91.5,
      avgSessionsPerClient: 2.5,
      totalActiveClients: 22,
      clientsLost: 2,
    },
    cancellations: {
      totalCancellations: 4,
      cancellationRate: 8.2,
      byReason: [
        { reason: 'CLIENT_REQUEST', count: 2, percentage: 50 },
        { reason: 'WEATHER', count: 1, percentage: 25 },
        { reason: 'ILLNESS', count: 1, percentage: 25 },
      ],
      byDayOfWeek: [
        { dayOfWeek: 1, dayName: 'Monday', count: 1, percentage: 25 },
        { dayOfWeek: 3, dayName: 'Wednesday', count: 2, percentage: 50 },
        { dayOfWeek: 5, dayName: 'Friday', count: 1, percentage: 25 },
      ],
      avgNoticeHours: 18,
      revenueLost: 180,
    },
    peakHours: generateMockPeakHours(),
    busiestDay: { dayOfWeek: 6, dayName: 'Saturday', sessionCount: 12 },
    busiestHour: { hour: 17, sessionCount: 8 },
    topSkills: [
      { skill: 'Dribbling', sessionCount: 18, percentage: 40, revenue: 936 },
      { skill: 'Finishing', sessionCount: 12, percentage: 27, revenue: 624 },
      { skill: 'Passing', sessionCount: 10, percentage: 22, revenue: 520 },
      { skill: 'Defending', sessionCount: 5, percentage: 11, revenue: 260 },
    ],
    avgRating: 4.8,
    ratingChange: 0.1,
    reviewCount: 12,
    computedAt: new Date().toISOString(),
  },
  coach2: {
    coachId: 'coach2',
    coachName: 'Sarah Mitchell',
    period: 'MONTH',
    dateRange: getDateRangeForPeriod('MONTH'),
    totalRevenue: 1890,
    revenueChange: -120,
    revenueChangePercent: -6.0,
    revenueTrend: 'DOWN',
    revenueChart: generateMockRevenueChart('MONTH', 1890),
    projectedRevenue: 1750,
    avgRevenuePerSession: 47,
    sessions: {
      totalSessions: 40,
      sessionsChange: -3,
      sessionsChangePercent: -7.0,
      avgSessionsPerWeek: 10,
      avgDuration: 55,
      popularSessionType: '1-on-1 Coaching',
      bySessionType: [
        { type: '1-on-1 Coaching', count: 28, percentage: 70, revenue: 1400 },
        { type: 'Group Training', count: 8, percentage: 20, revenue: 360 },
        { type: 'Assessment', count: 4, percentage: 10, revenue: 130 },
      ],
    },
    retention: {
      newClients: 2,
      returningClients: 16,
      churnRate: 15.0,
      retentionRate: 85.0,
      avgSessionsPerClient: 2.2,
      totalActiveClients: 18,
      clientsLost: 3,
    },
    cancellations: {
      totalCancellations: 6,
      cancellationRate: 13.0,
      byReason: [
        { reason: 'CLIENT_REQUEST', count: 3, percentage: 50 },
        { reason: 'NO_SHOW', count: 2, percentage: 33 },
        { reason: 'SCHEDULING_CONFLICT', count: 1, percentage: 17 },
      ],
      byDayOfWeek: [
        { dayOfWeek: 1, dayName: 'Monday', count: 2, percentage: 33 },
        { dayOfWeek: 2, dayName: 'Tuesday', count: 1, percentage: 17 },
        { dayOfWeek: 4, dayName: 'Thursday', count: 3, percentage: 50 },
      ],
      avgNoticeHours: 12,
      revenueLost: 270,
    },
    peakHours: generateMockPeakHours(),
    busiestDay: { dayOfWeek: 6, dayName: 'Saturday', sessionCount: 10 },
    busiestHour: { hour: 16, sessionCount: 7 },
    topSkills: [
      { skill: 'Goalkeeping', sessionCount: 20, percentage: 50, revenue: 945 },
      { skill: 'Defending', sessionCount: 12, percentage: 30, revenue: 567 },
      { skill: 'Conditioning', sessionCount: 8, percentage: 20, revenue: 378 },
    ],
    avgRating: 4.6,
    ratingChange: -0.1,
    reviewCount: 8,
    computedAt: new Date().toISOString(),
  },
  coach3: {
    coachId: 'coach3',
    coachName: 'Emma Williams',
    period: 'MONTH',
    dateRange: getDateRangeForPeriod('MONTH'),
    totalRevenue: 1450,
    revenueChange: 450,
    revenueChangePercent: 45.0,
    revenueTrend: 'UP',
    revenueChart: generateMockRevenueChart('MONTH', 1450),
    projectedRevenue: 1800,
    avgRevenuePerSession: 45,
    sessions: {
      totalSessions: 32,
      sessionsChange: 10,
      sessionsChangePercent: 45.5,
      avgSessionsPerWeek: 8,
      avgDuration: 50,
      popularSessionType: 'Group Training',
      bySessionType: [
        { type: '1-on-1 Coaching', count: 12, percentage: 37, revenue: 600 },
        { type: 'Group Training', count: 18, percentage: 56, revenue: 720 },
        { type: 'Assessment', count: 2, percentage: 7, revenue: 130 },
      ],
    },
    retention: {
      newClients: 8,
      returningClients: 12,
      churnRate: 5.0,
      retentionRate: 95.0,
      avgSessionsPerClient: 1.6,
      totalActiveClients: 20,
      clientsLost: 1,
    },
    cancellations: {
      totalCancellations: 2,
      cancellationRate: 5.9,
      byReason: [
        { reason: 'WEATHER', count: 1, percentage: 50 },
        { reason: 'ILLNESS', count: 1, percentage: 50 },
      ],
      byDayOfWeek: [
        { dayOfWeek: 0, dayName: 'Sunday', count: 1, percentage: 50 },
        { dayOfWeek: 6, dayName: 'Saturday', count: 1, percentage: 50 },
      ],
      avgNoticeHours: 24,
      revenueLost: 90,
    },
    peakHours: generateMockPeakHours(),
    busiestDay: { dayOfWeek: 0, dayName: 'Sunday', sessionCount: 8 },
    busiestHour: { hour: 10, sessionCount: 5 },
    topSkills: [
      { skill: 'Conditioning', sessionCount: 14, percentage: 44, revenue: 638 },
      { skill: 'Passing', sessionCount: 10, percentage: 31, revenue: 456 },
      { skill: 'Dribbling', sessionCount: 8, percentage: 25, revenue: 356 },
    ],
    avgRating: 4.9,
    ratingChange: 0.2,
    reviewCount: 15,
    computedAt: new Date().toISOString(),
  },
};

let coachAnalyticsCache: Record<string, CoachAnalytics> = { ...MOCK_COACH_ANALYTICS };

async function loadCoachAnalytics(): Promise<Record<string, CoachAnalytics>> {
  try {
    const stored = await AsyncStorage.getItem(COACH_ANALYTICS_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (error) {
    logger.error('Failed to load coach analytics', error);
  }
  return { ...MOCK_COACH_ANALYTICS };
}

async function saveCoachAnalytics(analytics: Record<string, CoachAnalytics>): Promise<void> {
  try {
    await AsyncStorage.setItem(COACH_ANALYTICS_STORAGE_KEY, JSON.stringify(analytics));
  } catch (error) {
    logger.error('Failed to save coach analytics', error);
  }
}

/**
 * Coach Analytics Service
 * Provides comprehensive analytics for coaches including revenue, sessions,
 * retention, cancellation patterns, and peak hours.
 */
export const coachAnalyticsService = {
  /**
   * Get comprehensive analytics for a coach
   */
  async getCoachAnalytics(
    coachId: string,
    period: CoachAnalyticsPeriod = 'MONTH'
  ): Promise<CoachAnalytics | null> {
    if (USE_MOCK) {
      coachAnalyticsCache = await loadCoachAnalytics();
      const analytics = coachAnalyticsCache[coachId];

      if (analytics) {
        // Update period and date range
        const dateRange = getDateRangeForPeriod(period);
        return {
          ...analytics,
          period,
          dateRange,
          revenueChart: generateMockRevenueChart(period, analytics.totalRevenue),
          computedAt: new Date().toISOString(),
        };
      }

      // Return default analytics for unknown coach
      return {
        coachId,
        coachName: 'Coach',
        period,
        dateRange: getDateRangeForPeriod(period),
        totalRevenue: 0,
        revenueChange: 0,
        revenueChangePercent: 0,
        revenueTrend: 'STABLE',
        revenueChart: [],
        avgRevenuePerSession: 0,
        sessions: {
          totalSessions: 0,
          sessionsChange: 0,
          sessionsChangePercent: 0,
          avgSessionsPerWeek: 0,
          avgDuration: 0,
          popularSessionType: 'N/A',
          bySessionType: [],
        },
        retention: {
          newClients: 0,
          returningClients: 0,
          churnRate: 0,
          retentionRate: 100,
          avgSessionsPerClient: 0,
          totalActiveClients: 0,
          clientsLost: 0,
        },
        cancellations: {
          totalCancellations: 0,
          cancellationRate: 0,
          byReason: [],
          byDayOfWeek: [],
          avgNoticeHours: 0,
          revenueLost: 0,
        },
        peakHours: [],
        busiestDay: { dayOfWeek: 6, dayName: 'Saturday', sessionCount: 0 },
        busiestHour: { hour: 17, sessionCount: 0 },
        topSkills: [],
        avgRating: 0,
        ratingChange: 0,
        reviewCount: 0,
        computedAt: new Date().toISOString(),
      };
    }

    const response = await fetch(`/api/coaches/${coachId}/analytics?period=${period}`);
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Get revenue chart data for a specific period
   */
  async getRevenueChart(
    coachId: string,
    period: CoachAnalyticsPeriod = 'MONTH'
  ): Promise<RevenueDataPoint[]> {
    if (USE_MOCK) {
      coachAnalyticsCache = await loadCoachAnalytics();
      const analytics = coachAnalyticsCache[coachId];
      const baseRevenue = analytics?.totalRevenue || 1000;
      return generateMockRevenueChart(period, baseRevenue);
    }

    const response = await fetch(`/api/coaches/${coachId}/revenue?period=${period}`);
    return response.json();
  },

  /**
   * Get retention metrics for a coach
   */
  async getRetentionMetrics(coachId: string): Promise<RetentionMetrics> {
    if (USE_MOCK) {
      coachAnalyticsCache = await loadCoachAnalytics();
      const analytics = coachAnalyticsCache[coachId];
      return analytics?.retention || {
        newClients: 0,
        returningClients: 0,
        churnRate: 0,
        retentionRate: 100,
        avgSessionsPerClient: 0,
        totalActiveClients: 0,
        clientsLost: 0,
      };
    }

    const response = await fetch(`/api/coaches/${coachId}/retention`);
    return response.json();
  },

  /**
   * Get cancellation patterns and statistics
   */
  async getCancellationPatterns(coachId: string): Promise<CancellationStats> {
    if (USE_MOCK) {
      coachAnalyticsCache = await loadCoachAnalytics();
      const analytics = coachAnalyticsCache[coachId];
      return analytics?.cancellations || {
        totalCancellations: 0,
        cancellationRate: 0,
        byReason: [],
        byDayOfWeek: [],
        avgNoticeHours: 0,
        revenueLost: 0,
      };
    }

    const response = await fetch(`/api/coaches/${coachId}/cancellations`);
    return response.json();
  },

  /**
   * Get peak hours data for heatmap visualization
   */
  async getPeakHours(coachId: string): Promise<PeakHoursData[]> {
    if (USE_MOCK) {
      coachAnalyticsCache = await loadCoachAnalytics();
      const analytics = coachAnalyticsCache[coachId];
      return analytics?.peakHours || generateMockPeakHours();
    }

    const response = await fetch(`/api/coaches/${coachId}/peak-hours`);
    return response.json();
  },

  /**
   * Get top skills taught by the coach
   */
  async getTopSkills(coachId: string): Promise<TopSkillData[]> {
    if (USE_MOCK) {
      coachAnalyticsCache = await loadCoachAnalytics();
      const analytics = coachAnalyticsCache[coachId];
      return analytics?.topSkills || [];
    }

    const response = await fetch(`/api/coaches/${coachId}/top-skills`);
    return response.json();
  },

  /**
   * Get session statistics
   */
  async getSessionStats(coachId: string): Promise<SessionStats> {
    if (USE_MOCK) {
      coachAnalyticsCache = await loadCoachAnalytics();
      const analytics = coachAnalyticsCache[coachId];
      return analytics?.sessions || {
        totalSessions: 0,
        sessionsChange: 0,
        sessionsChangePercent: 0,
        avgSessionsPerWeek: 0,
        avgDuration: 0,
        popularSessionType: 'N/A',
        bySessionType: [],
      };
    }

    const response = await fetch(`/api/coaches/${coachId}/sessions`);
    return response.json();
  },

  /**
   * Reset to mock data (useful for testing)
   */
  async resetToMockData(): Promise<void> {
    coachAnalyticsCache = { ...MOCK_COACH_ANALYTICS };
    await saveCoachAnalytics(coachAnalyticsCache);
  },
};
