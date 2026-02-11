import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { analyticsService, coachAnalyticsService } from '@/services/analytics-service';
import { analyticsQueryService } from '@/services/analytics/analytics-query-service';
import { analyticsExportService } from '@/services/analytics/analytics-export-service';
import { err, ok, storageError } from '@/types/result';

describe('analyticsService facade', () => {
  it('delegates getAthleteAnalytics success result', async () => {
    const queryInternals = analyticsQueryService as unknown as {
      getAthleteAnalytics: (...args: unknown[]) => Promise<unknown>;
    };
    const original = queryInternals.getAthleteAnalytics;
    const sample = {
      athleteId: 'athlete_test_1',
      period: 'WEEK',
      totalSessions: 4,
      sessionsThisPeriod: 3,
      attendanceRate: 75,
      averageSessionRating: 4.3,
      skills: [],
      activeGoals: 0,
      completedGoals: 0,
      improvementRate: 10,
      consistencyScore: 80,
      percentileRank: 70,
    };
    queryInternals.getAthleteAnalytics = async () => ok(sample);

    try {
      const result = await analyticsService.getAthleteAnalytics('athlete_test_1', 'WEEK');
      assert.equal(result.success, true);
      if (!result.success || !result.data) return;

      assert.equal(result.data.athleteId, 'athlete_test_1');
      assert.equal(result.data.sessionsThisPeriod, 3);
    } finally {
      queryInternals.getAthleteAnalytics = original;
    }
  });

  it('delegates getAthleteAnalytics error result', async () => {
    const queryInternals = analyticsQueryService as unknown as {
      getAthleteAnalytics: (...args: unknown[]) => Promise<unknown>;
    };
    const original = queryInternals.getAthleteAnalytics;
    queryInternals.getAthleteAnalytics = async () => err(storageError('forced analytics failure'));

    try {
      const result = await analyticsService.getAthleteAnalytics('athlete_err', 'MONTH');
      assert.equal(result.success, false);
      if (result.success) return;

      assert.equal(result.error.code, 'STORAGE');
    } finally {
      queryInternals.getAthleteAnalytics = original;
    }
  });

  it('delegates coach analytics export methods', async () => {
    const exportInternals = analyticsExportService as unknown as {
      getRevenueChart: (...args: unknown[]) => Promise<unknown>;
    };
    const original = exportInternals.getRevenueChart;
    exportInternals.getRevenueChart = async () => ok([
      { date: '2026-01-01', amount: 100, sessionCount: 2 },
      { date: '2026-02-01', amount: 200, sessionCount: 3 },
    ]);

    try {
      const result = await coachAnalyticsService.getRevenueChart('coach_1', 'MONTH');
      assert.equal(result.success, true);
      if (!result.success) return;

      assert.equal(result.data.length, 2);
      assert.equal(result.data[0].amount, 100);
    } finally {
      exportInternals.getRevenueChart = original;
    }
  });
});
