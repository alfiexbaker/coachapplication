import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { analyticsExportService } from '@/services/analytics/analytics-export-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('AnalyticsExportService', () => {
  beforeEach(async () => {
    // Clear storage
    await apiClient.remove(STORAGE_KEYS.COACH_ANALYTICS);
  });

  describe('getCoachAnalytics', () => {
    it('should return analytics for known coach', async () => {
      const analytics = await analyticsExportService.getCoachAnalytics('coach1', 'MONTH');

      assert.ok(analytics);
      assert.equal(analytics.coachId, 'coach1');
      assert.equal(analytics.period, 'MONTH');
      assert.ok(analytics.totalRevenue > 0);
      assert.ok(Array.isArray(analytics.revenueChart));
      assert.ok(analytics.revenueChart.length > 0);
    });

    it('should return default analytics for unknown coach', async () => {
      const coachId = 'test-unknown-' + Math.random().toString(36).slice(2);
      const analytics = await analyticsExportService.getCoachAnalytics(coachId, 'WEEK');

      assert.ok(analytics);
      assert.equal(analytics.coachId, coachId);
      assert.equal(analytics.period, 'WEEK');
      assert.equal(analytics.totalRevenue, 0);
    });

    it('should update period and date range dynamically', async () => {
      const week = await analyticsExportService.getCoachAnalytics('coach1', 'WEEK');
      const month = await analyticsExportService.getCoachAnalytics('coach1', 'MONTH');

      assert.ok(week);
      assert.ok(month);
      assert.equal(week.period, 'WEEK');
      assert.equal(month.period, 'MONTH');
      assert.notDeepEqual(week.dateRange, month.dateRange);
    });

    it('should regenerate revenue chart for different periods', async () => {
      const weekAnalytics = await analyticsExportService.getCoachAnalytics('coach1', 'WEEK');
      const yearAnalytics = await analyticsExportService.getCoachAnalytics('coach1', 'YEAR');

      assert.ok(weekAnalytics);
      assert.ok(yearAnalytics);
      assert.ok(weekAnalytics.revenueChart.length < yearAnalytics.revenueChart.length);
    });
  });

  describe('getRevenueChart', () => {
    it('should return revenue data points', async () => {
      const chart = await analyticsExportService.getRevenueChart('coach1', 'MONTH');

      assert.ok(Array.isArray(chart));
      assert.ok(chart.length > 0);
      assert.ok(chart[0].date);
      assert.ok(typeof chart[0].amount === 'number');
      assert.ok(typeof chart[0].sessionCount === 'number');
    });

    it('should return mock data for unknown coach', async () => {
      const coachId = 'test-unknown-' + Math.random().toString(36).slice(2);
      const chart = await analyticsExportService.getRevenueChart(coachId, 'WEEK');

      assert.ok(Array.isArray(chart));
      assert.ok(chart.length > 0);
    });

    it('should vary data points by period', async () => {
      const weekChart = await analyticsExportService.getRevenueChart('coach1', 'WEEK');
      const yearChart = await analyticsExportService.getRevenueChart('coach1', 'YEAR');

      assert.ok(weekChart.length < yearChart.length);
    });
  });

  describe('getRetentionMetrics', () => {
    it('should return retention data for known coach', async () => {
      const retention = await analyticsExportService.getRetentionMetrics('coach1');

      assert.ok(retention);
      assert.ok(typeof retention.newClients === 'number');
      assert.ok(typeof retention.returningClients === 'number');
      assert.ok(typeof retention.churnRate === 'number');
      assert.ok(typeof retention.retentionRate === 'number');
    });

    it('should return default retention for unknown coach', async () => {
      const coachId = 'test-unknown-' + Math.random().toString(36).slice(2);
      const retention = await analyticsExportService.getRetentionMetrics(coachId);

      assert.ok(retention);
      assert.equal(retention.newClients, 0);
      assert.equal(retention.retentionRate, 100);
    });
  });

  describe('getCancellationPatterns', () => {
    it('should return cancellation stats for known coach', async () => {
      const stats = await analyticsExportService.getCancellationPatterns('coach1');

      assert.ok(stats);
      assert.ok(typeof stats.totalCancellations === 'number');
      assert.ok(typeof stats.cancellationRate === 'number');
      assert.ok(Array.isArray(stats.byReason));
      assert.ok(Array.isArray(stats.byDayOfWeek));
    });

    it('should return empty stats for unknown coach', async () => {
      const coachId = 'test-unknown-' + Math.random().toString(36).slice(2);
      const stats = await analyticsExportService.getCancellationPatterns(coachId);

      assert.ok(stats);
      assert.equal(stats.totalCancellations, 0);
      assert.equal(stats.byReason.length, 0);
    });
  });

  describe('getPeakHours', () => {
    it('should return peak hours heatmap data', async () => {
      const peakHours = await analyticsExportService.getPeakHours('coach1');

      assert.ok(Array.isArray(peakHours));
      assert.ok(peakHours.length > 0);
      assert.ok(typeof peakHours[0].dayOfWeek === 'number');
      assert.ok(typeof peakHours[0].hour === 'number');
      assert.ok(typeof peakHours[0].sessionCount === 'number');
      assert.ok(typeof peakHours[0].intensity === 'number');
    });

    it('should return generated peak hours for unknown coach', async () => {
      const coachId = 'test-unknown-' + Math.random().toString(36).slice(2);
      const peakHours = await analyticsExportService.getPeakHours(coachId);

      assert.ok(Array.isArray(peakHours));
      assert.ok(peakHours.length > 0);
    });
  });

  describe('getTopSkills', () => {
    it('should return top skills for known coach', async () => {
      const skills = await analyticsExportService.getTopSkills('coach1');

      assert.ok(Array.isArray(skills));
      assert.ok(skills.length > 0);
      assert.ok(skills[0].skill);
      assert.ok(typeof skills[0].sessionCount === 'number');
      assert.ok(typeof skills[0].percentage === 'number');
      assert.ok(typeof skills[0].revenue === 'number');
    });

    it('should return empty array for unknown coach', async () => {
      const coachId = 'test-unknown-' + Math.random().toString(36).slice(2);
      const skills = await analyticsExportService.getTopSkills(coachId);

      assert.ok(Array.isArray(skills));
    });

    it('should sort skills by session count descending', async () => {
      const skills = await analyticsExportService.getTopSkills('coach1');

      if (skills.length > 1) {
        assert.ok(skills[0].sessionCount >= skills[1].sessionCount);
      }
    });
  });

  describe('getSessionStats', () => {
    it('should return session statistics for known coach', async () => {
      const stats = await analyticsExportService.getSessionStats('coach1');

      assert.ok(stats);
      assert.ok(typeof stats.totalSessions === 'number');
      assert.ok(typeof stats.avgSessionsPerWeek === 'number');
      assert.ok(Array.isArray(stats.bySessionType));
    });

    it('should return default stats for unknown coach', async () => {
      const coachId = 'test-unknown-' + Math.random().toString(36).slice(2);
      const stats = await analyticsExportService.getSessionStats(coachId);

      assert.ok(stats);
      assert.equal(stats.totalSessions, 0);
    });
  });

  describe('resetToMockData', () => {
    it('should reset analytics to mock data', async () => {
      await analyticsExportService.resetToMockData();

      const analytics = await analyticsExportService.getCoachAnalytics('coach1', 'MONTH');
      assert.ok(analytics);
      assert.equal(analytics.coachId, 'coach1');
    });
  });
});
