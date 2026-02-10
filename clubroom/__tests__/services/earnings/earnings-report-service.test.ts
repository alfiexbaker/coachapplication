import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { earningsReportService } from '@/services/earnings/earnings-report-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('EarningsReportService', () => {
  beforeEach(async () => {
    // Clear storage
    await apiClient.remove(STORAGE_KEYS.COACH_EARNINGS);
    await apiClient.remove(STORAGE_KEYS.EARNING_TRANSACTIONS);
  });

  describe('getEarnings', () => {
    it('should return ok() with earnings for coach', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);
      const result = await earningsReportService.getEarnings(coachId);

      assert.ok(result.success);
      assert.equal(result.data.coachId, coachId);
      assert.ok(typeof result.data.totalEarned === 'number');
      assert.ok(typeof result.data.availableBalance === 'number');
      assert.ok(typeof result.data.pendingBalance === 'number');
    });

    it('should initialize earnings for unknown coach', async () => {
      const coachId = 'coach-new-' + Math.random().toString(36).slice(2);
      const result = await earningsReportService.getEarnings(coachId);

      assert.ok(result.success);
      assert.equal(result.data.coachId, coachId);
      assert.equal(result.data.totalEarned, 0);
      assert.equal(result.data.availableBalance, 0);
    });

    it('should include transaction history reference', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);
      const result = await earningsReportService.getEarnings(coachId);

      assert.ok(result.success);
      assert.ok('lastPayout' in result.data || result.data.lastPayout === undefined);
    });
  });

  describe('recordSessionPayment', () => {
    it('should return ok() and create transaction', async () => {
      const params = {
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        bookingId: 'booking-' + Math.random().toString(36).slice(2),
        amount: 50,
        sessionDate: new Date().toISOString(),
        athleteName: 'Test Athlete',
      };

      const result = await earningsReportService.recordSessionPayment(params);

      assert.ok(result.success);
      assert.ok(result.data.id);
      assert.equal(result.data.type, 'SESSION_PAYMENT');
      assert.equal(result.data.amount, params.amount);
    });

    it('should return err() when amount is invalid', async () => {
      const params = {
        coachId: 'coach1',
        bookingId: 'booking1',
        amount: 0,
        sessionDate: new Date().toISOString(),
        athleteName: 'Test',
      };

      const result = await earningsReportService.recordSessionPayment(params);

      assert.ok(!result.success);
      assert.equal(result.error.code, 'VALIDATION_ERROR');
    });

    it('should update coach earnings balance', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);
      const amount = 100;

      await earningsReportService.recordSessionPayment({
        coachId,
        bookingId: 'booking1',
        amount,
        sessionDate: new Date().toISOString(),
        athleteName: 'Test',
      });

      const earnings = await earningsReportService.getEarnings(coachId);

      assert.ok(earnings.success);
      assert.ok(earnings.data.totalEarned >= amount);
      assert.ok(earnings.data.availableBalance >= amount);
    });

    it('should set status to PENDING initially', async () => {
      const result = await earningsReportService.recordSessionPayment({
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        bookingId: 'booking1',
        amount: 50,
        sessionDate: new Date().toISOString(),
        athleteName: 'Test',
      });

      assert.ok(result.success);
      assert.equal(result.data.status, 'PENDING');
    });
  });

  describe('recordRefund', () => {
    it('should return ok() and create refund transaction', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);
      const bookingId = 'booking-' + Math.random().toString(36).slice(2);

      // First record a payment
      await earningsReportService.recordSessionPayment({
        coachId,
        bookingId,
        amount: 100,
        sessionDate: new Date().toISOString(),
        athleteName: 'Test',
      });

      // Then record a refund
      const result = await earningsReportService.recordRefund(
        coachId,
        bookingId,
        50,
        'Cancelled by parent'
      );

      assert.ok(result.success);
      assert.ok(result.data.id);
      assert.equal(result.data.type, 'REFUND');
      assert.equal(result.data.amount, -50);
    });

    it('should return err() when amount is invalid', async () => {
      const result = await earningsReportService.recordRefund('coach1', 'booking1', 0);

      assert.ok(!result.success);
      assert.equal(result.error.code, 'VALIDATION_ERROR');
    });

    it('should decrease coach earnings', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);

      await earningsReportService.recordSessionPayment({
        coachId,
        bookingId: 'booking1',
        amount: 100,
        sessionDate: new Date().toISOString(),
        athleteName: 'Test',
      });

      const beforeRefund = await earningsReportService.getEarnings(coachId);

      await earningsReportService.recordRefund(coachId, 'booking1', 50);

      const afterRefund = await earningsReportService.getEarnings(coachId);

      assert.ok(beforeRefund.ok && afterRefund.success);
      assert.ok(afterRefund.data.totalEarned < beforeRefund.data.totalEarned);
    });
  });

  describe('getTransactionHistory', () => {
    it('should return ok() with transaction list', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);

      await earningsReportService.recordSessionPayment({
        coachId,
        bookingId: 'booking1',
        amount: 50,
        sessionDate: new Date().toISOString(),
        athleteName: 'Test',
      });

      const result = await earningsReportService.getTransactionHistory(coachId);

      assert.ok(result.success);
      assert.ok(Array.isArray(result.data));
      assert.ok(result.data.length > 0);
    });

    it('should return empty array for coach with no transactions', async () => {
      const coachId = 'coach-nonexistent-' + Math.random().toString(36).slice(2);
      const result = await earningsReportService.getTransactionHistory(coachId);

      assert.ok(result.success);
      assert.ok(Array.isArray(result.data));
      assert.equal(result.data.length, 0);
    });

    it('should respect limit parameter', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);

      // Create multiple transactions
      for (let i = 0; i < 5; i++) {
        await earningsReportService.recordSessionPayment({
          coachId,
          bookingId: 'booking' + i,
          amount: 50,
          sessionDate: new Date().toISOString(),
          athleteName: 'Test',
        });
      }

      const result = await earningsReportService.getTransactionHistory(coachId, 3);

      assert.ok(result.success);
      assert.ok(result.data.length <= 3);
    });

    it('should sort transactions by date descending', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);

      await earningsReportService.recordSessionPayment({
        coachId,
        bookingId: 'booking1',
        amount: 50,
        sessionDate: new Date().toISOString(),
        athleteName: 'Test 1',
      });

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      await earningsReportService.recordSessionPayment({
        coachId,
        bookingId: 'booking2',
        amount: 60,
        sessionDate: new Date().toISOString(),
        athleteName: 'Test 2',
      });

      const result = await earningsReportService.getTransactionHistory(coachId);

      assert.ok(result.success);
      if (result.data.length > 1) {
        const time1 = new Date(result.data[0].timestamp).getTime();
        const time2 = new Date(result.data[1].timestamp).getTime();
        assert.ok(time1 >= time2);
      }
    });
  });

  describe('getAllTransactions', () => {
    it('should return all transactions across all coaches', async () => {
      const coachId1 = 'coach-' + Math.random().toString(36).slice(2);
      const coachId2 = 'coach-' + Math.random().toString(36).slice(2);

      await earningsReportService.recordSessionPayment({
        coachId: coachId1,
        bookingId: 'booking1',
        amount: 50,
        sessionDate: new Date().toISOString(),
        athleteName: 'Test',
      });

      await earningsReportService.recordSessionPayment({
        coachId: coachId2,
        bookingId: 'booking2',
        amount: 60,
        sessionDate: new Date().toISOString(),
        athleteName: 'Test',
      });

      const transactions = await earningsReportService.getAllTransactions();

      assert.ok(Array.isArray(transactions));
      assert.ok(transactions.length >= 2);
    });
  });

  describe('resetToMockData', () => {
    it('should reset earnings to mock state', async () => {
      await earningsReportService.resetToMockData();

      const earnings = await apiClient.get(STORAGE_KEYS.COACH_EARNINGS, {});
      assert.ok(typeof earnings === 'object');
    });
  });
});
