/**
 * Coach Analytics Service Tests
 *
 * Unit tests for the coach analytics service functionality including
 * getCoachAnalytics, getRevenueChart, getRetentionMetrics,
 * getCancellationPatterns, getPeakHours, and getTopSkills.
 */

import assert from 'node:assert';
import test, { describe, beforeEach } from 'node:test';

import { coachAnalyticsService } from '../../services/analytics-service';
import type {
  CoachAnalyticsPeriod,
  RevenueDataPoint,
  PeakHoursData,
  TopSkillData,
} from '../../constants/types';
import type { Result, ServiceError } from '../../types/result';

const expectOk = <T>(result: Result<T, ServiceError>): T => {
  assert.strictEqual(result.success, true);
  if (!result.success) {
    throw new Error('Expected successful result');
  }
  return result.data;
};

// Reset to mock data before each test
beforeEach(async () => {
  expectOk(await coachAnalyticsService.resetToMockData());
});

describe('Coach Analytics Service', () => {
  describe('getCoachAnalytics', () => {
    test('should return analytics for a known coach', async () => {
      const analytics = expectOk(await coachAnalyticsService.getCoachAnalytics('coach1'));
      assert.ok(analytics);
      assert.strictEqual(analytics.coachId, 'coach1');
      assert.strictEqual(analytics.coachName, 'Marcus Thompson');
      assert.ok(analytics.totalRevenue > 0);
      assert.ok(analytics.sessions);
      assert.ok(analytics.retention);
      assert.ok(analytics.cancellations);
      assert.ok(Array.isArray(analytics.peakHours));
      assert.ok(Array.isArray(analytics.topSkills));
      assert.ok(Array.isArray(analytics.revenueChart));
    });

    test('should return default analytics for unknown coach', async () => {
      const analytics = expectOk(await coachAnalyticsService.getCoachAnalytics('unknown_coach'));
      assert.ok(analytics);
      assert.strictEqual(analytics.coachId, 'unknown_coach');
      assert.strictEqual(analytics.totalRevenue, 0);
      assert.strictEqual(analytics.sessions.totalSessions, 0);
      assert.strictEqual(analytics.retention.totalActiveClients, 0);
    });

    test('should respect period parameter', async () => {
      const periods: CoachAnalyticsPeriod[] = ['WEEK', 'MONTH', 'QUARTER', 'YEAR'];

      for (const period of periods) {
        const analytics = expectOk(await coachAnalyticsService.getCoachAnalytics('coach1', period));
        assert.ok(analytics);
        assert.strictEqual(analytics.period, period);
        assert.ok(analytics.dateRange);
        assert.ok(analytics.dateRange.startDate);
        assert.ok(analytics.dateRange.endDate);
      }
    });

    test('should include all required analytics fields', async () => {
      const analytics = expectOk(await coachAnalyticsService.getCoachAnalytics('coach1'));
      assert.ok(analytics);

      // Revenue fields
      assert.ok(typeof analytics.totalRevenue === 'number');
      assert.ok(typeof analytics.revenueChange === 'number');
      assert.ok(typeof analytics.revenueChangePercent === 'number');
      assert.ok(['UP', 'DOWN', 'STABLE'].includes(analytics.revenueTrend));
      assert.ok(typeof analytics.avgRevenuePerSession === 'number');

      // Session fields
      assert.ok(typeof analytics.sessions.totalSessions === 'number');
      assert.ok(typeof analytics.sessions.sessionsChange === 'number');
      assert.ok(typeof analytics.sessions.avgSessionsPerWeek === 'number');
      assert.ok(typeof analytics.sessions.avgDuration === 'number');
      assert.ok(typeof analytics.sessions.popularSessionType === 'string');
      assert.ok(Array.isArray(analytics.sessions.bySessionType));

      // Retention fields
      assert.ok(typeof analytics.retention.newClients === 'number');
      assert.ok(typeof analytics.retention.returningClients === 'number');
      assert.ok(typeof analytics.retention.churnRate === 'number');
      assert.ok(typeof analytics.retention.retentionRate === 'number');

      // Cancellation fields
      assert.ok(typeof analytics.cancellations.totalCancellations === 'number');
      assert.ok(typeof analytics.cancellations.cancellationRate === 'number');
      assert.ok(Array.isArray(analytics.cancellations.byReason));
      assert.ok(Array.isArray(analytics.cancellations.byDayOfWeek));

      // Schedule insights
      assert.ok(analytics.busiestDay);
      assert.ok(typeof analytics.busiestDay.dayOfWeek === 'number');
      assert.ok(typeof analytics.busiestDay.dayName === 'string');
      assert.ok(analytics.busiestHour);
      assert.ok(typeof analytics.busiestHour.hour === 'number');

      // Performance metrics
      assert.ok(typeof analytics.avgRating === 'number');
      assert.ok(typeof analytics.reviewCount === 'number');

      // Timestamp
      assert.ok(analytics.computedAt);
    });

    test('should return correct trend direction based on revenue change', async () => {
      // Coach1 has positive revenue change (UP trend)
      const coach1Analytics = expectOk(await coachAnalyticsService.getCoachAnalytics('coach1'));
      assert.ok(coach1Analytics);
      assert.ok(coach1Analytics.revenueChangePercent > 0);
      assert.strictEqual(coach1Analytics.revenueTrend, 'UP');

      // Coach2 has negative revenue change (DOWN trend)
      const coach2Analytics = expectOk(await coachAnalyticsService.getCoachAnalytics('coach2'));
      assert.ok(coach2Analytics);
      assert.ok(coach2Analytics.revenueChangePercent < 0);
      assert.strictEqual(coach2Analytics.revenueTrend, 'DOWN');
    });
  });

  describe('getRevenueChart', () => {
    test('should return revenue data points', async () => {
      const revenueData = expectOk(await coachAnalyticsService.getRevenueChart('coach1', 'MONTH'));
      assert.ok(Array.isArray(revenueData));
      assert.ok(revenueData.length > 0);

      revenueData.forEach((point: RevenueDataPoint) => {
        assert.ok(point.date);
        assert.ok(typeof point.amount === 'number');
      });
    });

    test('should return different data points for different periods', async () => {
      const weekData = expectOk(await coachAnalyticsService.getRevenueChart('coach1', 'WEEK'));
      const monthData = expectOk(await coachAnalyticsService.getRevenueChart('coach1', 'MONTH'));
      const yearData = expectOk(await coachAnalyticsService.getRevenueChart('coach1', 'YEAR'));
      // Week should have 7 data points (daily)
      assert.strictEqual(weekData.length, 7);

      // Month should have 4 data points (weekly)
      assert.strictEqual(monthData.length, 4);

      // Year should have 12 data points (monthly)
      assert.strictEqual(yearData.length, 12);
    });

    test('should include session count in revenue data points', async () => {
      const revenueData = expectOk(await coachAnalyticsService.getRevenueChart('coach1', 'MONTH'));
      revenueData.forEach((point: RevenueDataPoint) => {
        assert.ok(typeof point.sessionCount === 'number');
      });
    });
  });

  describe('getRetentionMetrics', () => {
    test('should return retention metrics', async () => {
      const metrics = expectOk(await coachAnalyticsService.getRetentionMetrics('coach1'));
      assert.ok(metrics);
      assert.ok(typeof metrics.newClients === 'number');
      assert.ok(typeof metrics.returningClients === 'number');
      assert.ok(typeof metrics.churnRate === 'number');
      assert.ok(typeof metrics.retentionRate === 'number');
      assert.ok(typeof metrics.avgSessionsPerClient === 'number');
      assert.ok(typeof metrics.totalActiveClients === 'number');
      assert.ok(typeof metrics.clientsLost === 'number');
    });

    test('should return default metrics for unknown coach', async () => {
      const metrics = expectOk(await coachAnalyticsService.getRetentionMetrics('unknown_coach'));
      assert.ok(metrics);
      assert.strictEqual(metrics.newClients, 0);
      assert.strictEqual(metrics.returningClients, 0);
      assert.strictEqual(metrics.totalActiveClients, 0);
      assert.strictEqual(metrics.retentionRate, 100);
    });

    test('should have retention rate between 0 and 100', async () => {
      const metrics = expectOk(await coachAnalyticsService.getRetentionMetrics('coach1'));
      assert.ok(metrics.retentionRate >= 0);
      assert.ok(metrics.retentionRate <= 100);
      assert.ok(metrics.churnRate >= 0);
      assert.ok(metrics.churnRate <= 100);
    });
  });

  describe('getCancellationPatterns', () => {
    test('should return cancellation statistics', async () => {
      const stats = expectOk(await coachAnalyticsService.getCancellationPatterns('coach1'));
      assert.ok(stats);
      assert.ok(typeof stats.totalCancellations === 'number');
      assert.ok(typeof stats.cancellationRate === 'number');
      assert.ok(Array.isArray(stats.byReason));
      assert.ok(Array.isArray(stats.byDayOfWeek));
      assert.ok(typeof stats.avgNoticeHours === 'number');
      assert.ok(typeof stats.revenueLost === 'number');
    });

    test('should include valid cancellation reasons', async () => {
      const stats = expectOk(await coachAnalyticsService.getCancellationPatterns('coach1'));
      const validReasons = [
        'CLIENT_REQUEST',
        'WEATHER',
        'ILLNESS',
        'SCHEDULING_CONFLICT',
        'NO_SHOW',
        'COACH_CANCELLED',
        'OTHER',
      ];

      stats.byReason.forEach((reason) => {
        assert.ok(validReasons.includes(reason.reason));
        assert.ok(typeof reason.count === 'number');
        assert.ok(typeof reason.percentage === 'number');
      });
    });

    test('should include day of week breakdown with valid days', async () => {
      const stats = expectOk(await coachAnalyticsService.getCancellationPatterns('coach1'));
      stats.byDayOfWeek.forEach((day) => {
        assert.ok(day.dayOfWeek >= 0 && day.dayOfWeek <= 6);
        assert.ok(typeof day.dayName === 'string');
        assert.ok(typeof day.count === 'number');
        assert.ok(typeof day.percentage === 'number');
      });
    });
  });

  describe('getPeakHours', () => {
    test('should return peak hours data', async () => {
      const peakHours = expectOk(await coachAnalyticsService.getPeakHours('coach1'));
      assert.ok(Array.isArray(peakHours));
      assert.ok(peakHours.length > 0);
    });

    test('should have valid day and hour values', async () => {
      const peakHours = expectOk(await coachAnalyticsService.getPeakHours('coach1'));
      peakHours.forEach((data: PeakHoursData) => {
        assert.ok(data.dayOfWeek >= 0 && data.dayOfWeek <= 6);
        assert.ok(data.hour >= 0 && data.hour <= 23);
        assert.ok(typeof data.dayName === 'string');
        assert.ok(typeof data.sessionCount === 'number');
        assert.ok(typeof data.intensity === 'number');
        assert.ok(data.intensity >= 0 && data.intensity <= 1);
      });
    });

    test('should cover all days of the week', async () => {
      const peakHours = expectOk(await coachAnalyticsService.getPeakHours('coach1'));
      const daysFound = new Set(peakHours.map((d) => d.dayOfWeek));

      // Should have data for all 7 days
      for (let day = 0; day < 7; day++) {
        assert.ok(daysFound.has(day), `Missing day ${day}`);
      }
    });
  });

  describe('getTopSkills', () => {
    test('should return top skills data', async () => {
      const topSkills = expectOk(await coachAnalyticsService.getTopSkills('coach1'));
      assert.ok(Array.isArray(topSkills));
      assert.ok(topSkills.length > 0);
    });

    test('should have valid skill data structure', async () => {
      const topSkills = expectOk(await coachAnalyticsService.getTopSkills('coach1'));
      topSkills.forEach((skill: TopSkillData) => {
        assert.ok(typeof skill.skill === 'string');
        assert.ok(typeof skill.sessionCount === 'number');
        assert.ok(typeof skill.percentage === 'number');
        assert.ok(typeof skill.revenue === 'number');
      });
    });

    test('should return empty array for unknown coach', async () => {
      const topSkills = expectOk(await coachAnalyticsService.getTopSkills('unknown_coach'));
      assert.ok(Array.isArray(topSkills));
      assert.strictEqual(topSkills.length, 0);
    });

    test('should have percentages that are non-negative', async () => {
      const topSkills = expectOk(await coachAnalyticsService.getTopSkills('coach1'));
      topSkills.forEach((skill: TopSkillData) => {
        assert.ok(skill.percentage >= 0);
        assert.ok(skill.percentage <= 100);
      });
    });
  });

  describe('getSessionStats', () => {
    test('should return session statistics', async () => {
      const stats = expectOk(await coachAnalyticsService.getSessionStats('coach1'));
      assert.ok(stats);
      assert.ok(typeof stats.totalSessions === 'number');
      assert.ok(typeof stats.sessionsChange === 'number');
      assert.ok(typeof stats.sessionsChangePercent === 'number');
      assert.ok(typeof stats.avgSessionsPerWeek === 'number');
      assert.ok(typeof stats.avgDuration === 'number');
      assert.ok(typeof stats.popularSessionType === 'string');
      assert.ok(Array.isArray(stats.bySessionType));
    });

    test('should include session type breakdown', async () => {
      const stats = expectOk(await coachAnalyticsService.getSessionStats('coach1'));
      stats.bySessionType.forEach((sessionType) => {
        assert.ok(typeof sessionType.type === 'string');
        assert.ok(typeof sessionType.count === 'number');
        assert.ok(typeof sessionType.percentage === 'number');
        assert.ok(typeof sessionType.revenue === 'number');
      });
    });

    test('should return default stats for unknown coach', async () => {
      const stats = expectOk(await coachAnalyticsService.getSessionStats('unknown_coach'));
      assert.ok(stats);
      assert.strictEqual(stats.totalSessions, 0);
      assert.strictEqual(stats.popularSessionType, 'N/A');
      assert.strictEqual(stats.bySessionType.length, 0);
    });
  });

  describe('Multiple Coaches', () => {
    test('should return different data for different coaches', async () => {
      const coach1Analytics = expectOk(await coachAnalyticsService.getCoachAnalytics('coach1'));
      const coach2Analytics = expectOk(await coachAnalyticsService.getCoachAnalytics('coach2'));
      const coach3Analytics = expectOk(await coachAnalyticsService.getCoachAnalytics('coach3'));
      assert.ok(coach1Analytics);
      assert.ok(coach2Analytics);
      assert.ok(coach3Analytics);

      // Each coach should have their own ID
      assert.strictEqual(coach1Analytics.coachId, 'coach1');
      assert.strictEqual(coach2Analytics.coachId, 'coach2');
      assert.strictEqual(coach3Analytics.coachId, 'coach3');

      // Revenue should be different for each coach
      assert.notStrictEqual(coach1Analytics.totalRevenue, coach2Analytics.totalRevenue);
      assert.notStrictEqual(coach2Analytics.totalRevenue, coach3Analytics.totalRevenue);
    });
  });
});
