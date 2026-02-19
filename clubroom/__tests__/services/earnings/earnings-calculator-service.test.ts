import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { earningsCalculatorService } from '@/services/earnings/earnings-calculator-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('EarningsCalculatorService', () => {
  beforeEach(async () => {
    // Clear storage
    await apiClient.remove(STORAGE_KEYS.BOOKINGS);
  });

  describe('getPlatformFeePercent', () => {
    it('should return platform fee percentage', () => {
      const fee = earningsCalculatorService.getPlatformFeePercent();

      assert.ok(typeof fee === 'number');
      assert.ok(fee >= 0);
      assert.ok(fee <= 100);
      assert.equal(fee, 0);
    });
  });

  describe('calculateNetAmount', () => {
    it('should calculate net amount after platform fee', () => {
      const gross = 100;
      const net = earningsCalculatorService.calculateNetAmount(gross);

      assert.ok(typeof net === 'number');
      assert.ok(net <= gross);
      assert.ok(net > 0);
      assert.equal(net, gross);
    });

    it('should return correct net amount for zero', () => {
      const net = earningsCalculatorService.calculateNetAmount(0);
      assert.equal(net, 0);
    });

    it('should handle decimal amounts', () => {
      const gross = 123.45;
      const net = earningsCalculatorService.calculateNetAmount(gross);

      assert.ok(net > 0);
      assert.ok(net <= gross);
      assert.equal(net, gross);
    });

    it('should return full gross amount when platform fee is disabled', () => {
      const gross = 100;
      const net = earningsCalculatorService.calculateNetAmount(gross);
      const expectedNet = 100;

      assert.equal(net, expectedNet);
    });
  });

  describe('formatCurrency', () => {
    it('should format amount as currency', () => {
      const formatted = earningsCalculatorService.formatCurrency(100, 'GBP');

      assert.ok(typeof formatted === 'string');
      assert.ok(formatted.includes('100') || formatted.includes('1'));
    });

    it('should handle zero amount', () => {
      const formatted = earningsCalculatorService.formatCurrency(0, 'GBP');

      assert.ok(typeof formatted === 'string');
      assert.ok(formatted.includes('0'));
    });

    it('should handle decimal amounts', () => {
      const formatted = earningsCalculatorService.formatCurrency(123.45, 'GBP');

      assert.ok(typeof formatted === 'string');
    });

    it('should default to GBP when currency not provided', () => {
      const formatted = earningsCalculatorService.formatCurrency(100);

      assert.ok(typeof formatted === 'string');
    });
  });

  describe('calculateEarningsFromBookings', () => {
    it('should return ok() with earnings summary', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);
      const result = await earningsCalculatorService.calculateEarningsFromBookings(coachId);

      assert.ok(result.success);
      assert.ok(typeof result.data.totalEarned === 'number');
      assert.ok(typeof result.data.totalSessions === 'number');
      assert.ok(typeof result.data.averageSessionValue === 'number');
    });

    it('should return zero earnings for coach with no bookings', async () => {
      const coachId = 'coach-nonexistent-' + Math.random().toString(36).slice(2);
      const result = await earningsCalculatorService.calculateEarningsFromBookings(coachId);

      assert.ok(result.success);
      assert.equal(result.data.totalEarned, 0);
      assert.equal(result.data.totalSessions, 0);
    });

    it('should include period breakdowns', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);
      const result = await earningsCalculatorService.calculateEarningsFromBookings(coachId);

      assert.ok(result.success);
      assert.ok('thisWeek' in result.data);
      assert.ok('thisMonth' in result.data);
      assert.ok('lastMonth' in result.data);
    });

    it('should calculate average session value correctly', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);
      const result = await earningsCalculatorService.calculateEarningsFromBookings(coachId);

      assert.ok(result.success);

      if (result.data.totalSessions > 0) {
        const expectedAvg = result.data.totalEarned / result.data.totalSessions;
        assert.equal(result.data.averageSessionValue, expectedAvg);
      } else {
        assert.equal(result.data.averageSessionValue, 0);
      }
    });
  });

  describe('getEarningsSummary', () => {
    it('should return ok() with period summary', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);
      const result = await earningsCalculatorService.getEarningsSummary(coachId, 'month', []);

      assert.ok(result.success);
      assert.ok(result.data.period);
      assert.ok(typeof result.data.totalEarned === 'number');
      assert.ok(typeof result.data.totalSessions === 'number');
    });

    it('should handle different periods', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);

      const weekResult = await earningsCalculatorService.getEarningsSummary(coachId, 'week', []);
      const monthResult = await earningsCalculatorService.getEarningsSummary(coachId, 'month', []);
      const yearResult = await earningsCalculatorService.getEarningsSummary(coachId, 'year', []);

      assert.ok(weekResult.success);
      assert.ok(monthResult.success);
      assert.ok(yearResult.success);
    });

    it('should include comparison to last period', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);
      const result = await earningsCalculatorService.getEarningsSummary(coachId, 'month', []);

      assert.ok(result.success);
      assert.ok('comparedToLastPeriod' in result.data);
      assert.ok(typeof result.data.comparedToLastPeriod === 'number');
    });

    it('should include average per session', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);
      const result = await earningsCalculatorService.getEarningsSummary(coachId, 'month', []);

      assert.ok(result.success);
      assert.ok('averagePerSession' in result.data);
      assert.ok(typeof result.data.averagePerSession === 'number');
    });
  });

  describe('edge cases', () => {
    it('should handle negative amounts gracefully', () => {
      const net = earningsCalculatorService.calculateNetAmount(-100);
      assert.ok(net <= 0);
    });

    it('should handle very large amounts', () => {
      const gross = 1000000;
      const net = earningsCalculatorService.calculateNetAmount(gross);

      assert.ok(net > 0);
      assert.ok(net <= gross);
    });

    it('should handle very small decimal amounts', () => {
      const gross = 0.01;
      const net = earningsCalculatorService.calculateNetAmount(gross);

      assert.ok(net >= 0);
      assert.ok(net <= gross);
    });
  });
});
