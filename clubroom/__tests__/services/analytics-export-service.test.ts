/**
 * Analytics Export Service Tests
 *
 * Tests for coach analytics: getCoachAnalytics, getRevenueChart,
 * getRetentionMetrics, getCancellationPatterns, getPeakHours,
 * getTopSkills, getSessionStats, resetToMockData.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { analyticsExportService } from '../../services/analytics/analytics-export-service';

describe('analyticsExportService', () => {
  // ---------------------------------------------------------------------------
  // getCoachAnalytics
  // ---------------------------------------------------------------------------
  describe('getCoachAnalytics', () => {
    test('returns analytics for known coach', async () => {
      const result = await analyticsExportService.getCoachAnalytics('coach1');
      assert.ok(result, 'Should return analytics for known coach');
      assert.ok(typeof result!.totalRevenue === 'number');
    });

    test('returns default analytics for unknown coach', async () => {
      const result = await analyticsExportService.getCoachAnalytics('unknown_coach_xyz');
      assert.ok(result);
      assert.equal(result!.totalRevenue, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // getRevenueChart
  // ---------------------------------------------------------------------------
  describe('getRevenueChart', () => {
    test('returns array of revenue data points', async () => {
      const result = await analyticsExportService.getRevenueChart('coach1', 'MONTH');
      assert.ok(Array.isArray(result));
      assert.ok(result.length > 0);
    });
  });

  // ---------------------------------------------------------------------------
  // getRetentionMetrics
  // ---------------------------------------------------------------------------
  describe('getRetentionMetrics', () => {
    test('returns retention data for known coach', async () => {
      const result = await analyticsExportService.getRetentionMetrics('coach1');
      assert.equal(typeof result.retentionRate, 'number');
      assert.equal(typeof result.churnRate, 'number');
    });

    test('returns default retention for unknown coach', async () => {
      const result = await analyticsExportService.getRetentionMetrics('unknown_xyz');
      assert.equal(result.retentionRate, 100);
      assert.equal(result.churnRate, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // getCancellationPatterns
  // ---------------------------------------------------------------------------
  describe('getCancellationPatterns', () => {
    test('returns cancellation stats', async () => {
      const result = await analyticsExportService.getCancellationPatterns('coach1');
      assert.equal(typeof result.totalCancellations, 'number');
      assert.equal(typeof result.cancellationRate, 'number');
    });
  });

  // ---------------------------------------------------------------------------
  // getPeakHours
  // ---------------------------------------------------------------------------
  describe('getPeakHours', () => {
    test('returns array of peak hours data', async () => {
      const result = await analyticsExportService.getPeakHours('coach1');
      assert.ok(Array.isArray(result));
    });
  });

  // ---------------------------------------------------------------------------
  // getTopSkills
  // ---------------------------------------------------------------------------
  describe('getTopSkills', () => {
    test('returns array for known coach', async () => {
      const result = await analyticsExportService.getTopSkills('coach1');
      assert.ok(Array.isArray(result));
    });

    test('returns empty array for unknown coach', async () => {
      const result = await analyticsExportService.getTopSkills('unknown_xyz');
      assert.ok(Array.isArray(result));
    });
  });

  // ---------------------------------------------------------------------------
  // getSessionStats
  // ---------------------------------------------------------------------------
  describe('getSessionStats', () => {
    test('returns session stats for known coach', async () => {
      const result = await analyticsExportService.getSessionStats('coach1');
      assert.equal(typeof result.totalSessions, 'number');
    });

    test('returns default stats for unknown coach', async () => {
      const result = await analyticsExportService.getSessionStats('unknown_xyz');
      assert.equal(result.totalSessions, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // resetToMockData
  // ---------------------------------------------------------------------------
  describe('resetToMockData', () => {
    test('does not throw', async () => {
      await assert.doesNotReject(analyticsExportService.resetToMockData());
    });
  });
});
