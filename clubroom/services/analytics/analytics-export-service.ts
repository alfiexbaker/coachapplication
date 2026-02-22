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
  EarningTransaction,
  Booking,
} from '@/constants/types';
import { DAY_NAMES } from '@/constants/booking-types';
import type { SessionFeedback } from '@/services/progress/progress-feedback-service';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';
import { api } from '@/constants/config';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  storageError,
  networkError,
} from '@/types/result';

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
function generateMockRevenueChart(
  period: CoachAnalyticsPeriod,
  baseRevenue: number,
): RevenueDataPoint[] {
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
    coachName: 'Jess Okafor',
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
    const stored = await apiClient.get<Record<string, CoachAnalytics> | null>(
      STORAGE_KEYS.COACH_ANALYTICS,
      null,
    );
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
// REAL DATA BUILDER
// ============================================================================

/**
 * Build CoachAnalytics from real EARNING_TRANSACTIONS, BOOKINGS, and SESSION_FEEDBACK.
 * Returns null if no real data exists for this coach.
 */
async function buildRealCoachAnalytics(
  coachId: string,
  period: CoachAnalyticsPeriod,
): Promise<CoachAnalytics | null> {
  const [transactions, bookings, feedback] = await Promise.all([
    apiClient.get<EarningTransaction[]>(STORAGE_KEYS.EARNING_TRANSACTIONS, []),
    apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []),
    apiClient.get<SessionFeedback[]>(STORAGE_KEYS.SESSION_FEEDBACK, []),
  ]);

  const coachTxns = transactions.filter(
    (t) => t.coachId === coachId && t.type === 'SESSION_PAYMENT' && t.status === 'COMPLETED',
  );
  const coachBookings = bookings.filter((b) => b.coachId === coachId);
  const coachFeedback = feedback.filter((f) => f.coachId === coachId);

  // If no real transactions or bookings, return null to fall back to mock
  if (coachTxns.length === 0 && coachBookings.length === 0 && coachFeedback.length === 0) {
    return null;
  }

  const dateRange = getDateRangeForPeriod(period);
  const totalRevenue = coachTxns.reduce((sum, t) => sum + t.amount, 0);
  const completedBookings = coachBookings.filter((b) => b.status === 'COMPLETED');
  const totalSessions = completedBookings.length || coachTxns.length;

  // Build revenue chart from real transactions
  const revenueChart: RevenueDataPoint[] = [];
  const txnsByDate = new Map<string, { amount: number; count: number }>();
  for (const txn of coachTxns) {
    const date = txn.createdAt?.split('T')[0] || txn.sessionDate || '';
    if (!date) continue;
    const existing = txnsByDate.get(date) || { amount: 0, count: 0 };
    existing.amount += txn.amount;
    existing.count += 1;
    txnsByDate.set(date, existing);
  }
  for (const [date, data] of txnsByDate) {
    revenueChart.push({ date, amount: data.amount, sessionCount: data.count });
  }
  revenueChart.sort((a, b) => a.date.localeCompare(b.date));

  // Calculate average rating from feedback
  const avgRating = coachFeedback.length > 0
    ? Math.round(
        (coachFeedback.reduce((sum, f) => sum + f.overallPerformance, 0) / coachFeedback.length) * 10,
      ) / 10
    : 0;

  // Build top skills from feedback
  const skillCounts = new Map<string, { count: number; revenue: number }>();
  for (const fb of coachFeedback) {
    for (const skill of fb.skillsWorkedOn) {
      const existing = skillCounts.get(skill) || { count: 0, revenue: 0 };
      existing.count += 1;
      skillCounts.set(skill, existing);
    }
  }
  const topSkills: TopSkillData[] = [...skillCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([skill, data]) => ({
      skill,
      sessionCount: data.count,
      percentage: totalSessions > 0 ? Math.round((data.count / totalSessions) * 100) : 0,
      revenue: Math.round((data.count / Math.max(1, coachFeedback.length)) * totalRevenue),
    }));

  // Unique athletes = clients
  const uniqueAthletes = new Set(coachBookings.map((b) => b.athleteId || b.athleteIds?.[0]).filter(Boolean));

  const coachName = coachBookings[0]?.coachName || 'Coach';

  return {
    coachId,
    coachName,
    period,
    dateRange,
    totalRevenue: Math.round(totalRevenue),
    revenueChange: 0,
    revenueChangePercent: 0,
    revenueTrend: 'STABLE',
    revenueChart,
    avgRevenuePerSession: totalSessions > 0 ? Math.round(totalRevenue / totalSessions) : 0,
    sessions: {
      totalSessions,
      sessionsChange: 0,
      sessionsChangePercent: 0,
      avgSessionsPerWeek: Math.round(totalSessions / 4),
      avgDuration: 60,
      popularSessionType: '1-on-1 Coaching',
      bySessionType: [
        { type: '1-on-1 Coaching', count: totalSessions, percentage: 100, revenue: totalRevenue },
      ],
    },
    retention: {
      newClients: uniqueAthletes.size,
      returningClients: 0,
      churnRate: 0,
      retentionRate: 100,
      avgSessionsPerClient: uniqueAthletes.size > 0 ? Math.round(totalSessions / uniqueAthletes.size * 10) / 10 : 0,
      totalActiveClients: uniqueAthletes.size,
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
    topSkills,
    avgRating,
    ratingChange: 0,
    reviewCount: coachFeedback.length,
    computedAt: new Date().toISOString(),
  };
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
    period: CoachAnalyticsPeriod = 'MONTH',
  ): Promise<Result<CoachAnalytics | null, ServiceError>> {
    try {
      if (USE_MOCK) {
        // Try real data first (from actual session completions + earnings)
        const realAnalytics = await buildRealCoachAnalytics(coachId, period);
        if (realAnalytics) {
          return ok(realAnalytics);
        }

        // Fall back to cached/mock data
        coachAnalyticsCache = await loadCoachAnalytics();
        const analytics = coachAnalyticsCache[coachId];

        if (analytics) {
          // Update period and date range
          const dateRange = getDateRangeForPeriod(period);
          return ok({
            ...analytics,
            period,
            dateRange,
            revenueChart: generateMockRevenueChart(period, analytics.totalRevenue),
            computedAt: new Date().toISOString(),
          });
        }

        // Return default analytics for unknown coach
        return ok({
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
        });
      }

      const response = await fetch(`/api/coaches/${coachId}/analytics?period=${period}`);
      if (!response.ok) return ok(null);
      return ok(await response.json());
    } catch (error) {
      logger.error('Failed to get coach analytics', { coachId, period, error });
      return err(networkError('Failed to load coach analytics'));
    }
  },

  /**
   * Get revenue chart data for a specific period
   */
  async getRevenueChart(
    coachId: string,
    period: CoachAnalyticsPeriod = 'MONTH',
  ): Promise<Result<RevenueDataPoint[], ServiceError>> {
    try {
      if (USE_MOCK) {
        coachAnalyticsCache = await loadCoachAnalytics();
        const analytics = coachAnalyticsCache[coachId];
        const baseRevenue = analytics?.totalRevenue || 1000;
        return ok(generateMockRevenueChart(period, baseRevenue));
      }

      const response = await fetch(`/api/coaches/${coachId}/revenue?period=${period}`);
      if (!response.ok) {
        return err(networkError('Failed to load revenue chart'));
      }
      return ok(await response.json());
    } catch (error) {
      logger.error('Failed to get revenue chart', { coachId, period, error });
      return err(storageError('Failed to load revenue chart'));
    }
  },

  /**
   * Get retention metrics for a coach
   */
  async getRetentionMetrics(coachId: string): Promise<Result<RetentionMetrics, ServiceError>> {
    try {
      if (USE_MOCK) {
        coachAnalyticsCache = await loadCoachAnalytics();
        const analytics = coachAnalyticsCache[coachId];
        return ok(
          analytics?.retention || {
            newClients: 0,
            returningClients: 0,
            churnRate: 0,
            retentionRate: 100,
            avgSessionsPerClient: 0,
            totalActiveClients: 0,
            clientsLost: 0,
          },
        );
      }

      const response = await fetch(`/api/coaches/${coachId}/retention`);
      if (!response.ok) {
        return err(networkError('Failed to load retention metrics'));
      }
      return ok(await response.json());
    } catch (error) {
      logger.error('Failed to get retention metrics', { coachId, error });
      return err(storageError('Failed to load retention metrics'));
    }
  },

  /**
   * Get cancellation patterns and statistics
   */
  async getCancellationPatterns(coachId: string): Promise<Result<CancellationStats, ServiceError>> {
    try {
      if (USE_MOCK) {
        coachAnalyticsCache = await loadCoachAnalytics();
        const analytics = coachAnalyticsCache[coachId];
        return ok(
          analytics?.cancellations || {
            totalCancellations: 0,
            cancellationRate: 0,
            byReason: [],
            byDayOfWeek: [],
            avgNoticeHours: 0,
            revenueLost: 0,
          },
        );
      }

      const response = await fetch(`/api/coaches/${coachId}/cancellations`);
      if (!response.ok) {
        return err(networkError('Failed to load cancellation patterns'));
      }
      return ok(await response.json());
    } catch (error) {
      logger.error('Failed to get cancellation patterns', { coachId, error });
      return err(storageError('Failed to load cancellation patterns'));
    }
  },

  /**
   * Get peak hours data for heatmap visualization
   */
  async getPeakHours(coachId: string): Promise<Result<PeakHoursData[], ServiceError>> {
    try {
      if (USE_MOCK) {
        coachAnalyticsCache = await loadCoachAnalytics();
        const analytics = coachAnalyticsCache[coachId];
        return ok(analytics?.peakHours || generateMockPeakHours());
      }

      const response = await fetch(`/api/coaches/${coachId}/peak-hours`);
      if (!response.ok) {
        return err(networkError('Failed to load peak hours'));
      }
      return ok(await response.json());
    } catch (error) {
      logger.error('Failed to get peak hours', { coachId, error });
      return err(storageError('Failed to load peak hours'));
    }
  },

  /**
   * Get top skills taught by the coach
   */
  async getTopSkills(coachId: string): Promise<Result<TopSkillData[], ServiceError>> {
    try {
      if (USE_MOCK) {
        coachAnalyticsCache = await loadCoachAnalytics();
        const analytics = coachAnalyticsCache[coachId];
        return ok(analytics?.topSkills || []);
      }

      const response = await fetch(`/api/coaches/${coachId}/top-skills`);
      if (!response.ok) {
        return err(networkError('Failed to load top skills'));
      }
      return ok(await response.json());
    } catch (error) {
      logger.error('Failed to get top skills', { coachId, error });
      return err(storageError('Failed to load top skills'));
    }
  },

  /**
   * Get session statistics
   */
  async getSessionStats(coachId: string): Promise<Result<SessionStats, ServiceError>> {
    try {
      if (USE_MOCK) {
        coachAnalyticsCache = await loadCoachAnalytics();
        const analytics = coachAnalyticsCache[coachId];
        return ok(
          analytics?.sessions || {
            totalSessions: 0,
            sessionsChange: 0,
            sessionsChangePercent: 0,
            avgSessionsPerWeek: 0,
            avgDuration: 0,
            popularSessionType: 'N/A',
            bySessionType: [],
          },
        );
      }

      const response = await fetch(`/api/coaches/${coachId}/sessions`);
      if (!response.ok) {
        return err(networkError('Failed to load session stats'));
      }
      return ok(await response.json());
    } catch (error) {
      logger.error('Failed to get session stats', { coachId, error });
      return err(storageError('Failed to load session stats'));
    }
  },

  /**
   * Reset to mock data (useful for testing)
   */
  async resetToMockData(): Promise<Result<void, ServiceError>> {
    try {
      coachAnalyticsCache = { ...MOCK_COACH_ANALYTICS };
      await saveCoachAnalytics(coachAnalyticsCache);
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to reset coach analytics mock data', error);
      return err(storageError('Failed to reset analytics data'));
    }
  },
};
