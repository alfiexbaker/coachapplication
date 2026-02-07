/**
 * Analytics Export Service
 *
 * Handles coach analytics data: revenue charts, retention metrics,
 * cancellation patterns, peak hours, top skills, and session stats.
 * Provides comprehensive reporting and export capabilities for coaches.
 *
 * API Integration Notes:
 * - GET /api/coaches/:id/analytics?period=MONTH - Get comprehensive analytics
 * - GET /api/coaches/:id/revenue?period=MONTH - Revenue chart data
 * - GET /api/coaches/:id/retention - Retention metrics
 * - GET /api/coaches/:id/cancellations - Cancellation patterns
 * - GET /api/coaches/:id/peak-hours - Peak hours data
 * - GET /api/coaches/:id/top-skills - Top skills taught
 * - GET /api/coaches/:id/sessions - Session statistics
 */

import { apiClient } from '../api-client';
import type {
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
import { toDateStr } from '@/utils/format';
import { api } from '@/constants/config';

import { STORAGE_KEYS } from '@/constants/storage-keys';

const logger = createLogger('AnalyticsExportService');

const USE_MOCK = api.useMock;

// ============================================================================
// HELPER FUNCTIONS
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
      date: toDateStr(date),
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

// ============================================================================
// MOCK COACH ANALYTICS DATA
// ============================================================================

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

// ============================================================================
// STORAGE HELPERS
// ============================================================================

let coachAnalyticsCache: Record<string, CoachAnalytics> = { ...MOCK_COACH_ANALYTICS };

async function loadCoachAnalytics(): Promise<Record<string, CoachAnalytics>> {
  try {
    const stored = await apiClient.get<Record<string, CoachAnalytics> | null>(STORAGE_KEYS.COACH_ANALYTICS, null);
    if (stored) return stored;
  } catch (error) {
    logger.error('Failed to load coach analytics', error);
  }
  return { ...MOCK_COACH_ANALYTICS };
}

async function saveCoachAnalytics(analytics: Record<string, CoachAnalytics>): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.COACH_ANALYTICS, analytics);
  } catch (error) {
    logger.error('Failed to save coach analytics', error);
  }
}

// ============================================================================
// ANALYTICS EXPORT SERVICE (Coach Analytics)
// ============================================================================

export const analyticsExportService = {
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
