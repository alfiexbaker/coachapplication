import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { earningsReportService } from '@/services/earnings/earnings-report-service';
import type { Result, ServiceError } from '@/types/result';

function expectOk<T>(result: Result<T, ServiceError>): T {
  assert.equal(result.success, true);
  return result.data;
}

let seq = 0;

function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}_${seq}`;
}

describe('EarningsReportService', () => {
  beforeEach(async () => {
    seq = 0;
    await apiClient.set(STORAGE_KEYS.EARNINGS, {});
    await apiClient.set(STORAGE_KEYS.EARNING_TRANSACTIONS, []);
  });

  describe('getEarnings', () => {
    it('initializes a new earnings record for unknown coach', async () => {
      const coachId = nextId('coach');
      const earnings = expectOk(await earningsReportService.getEarnings(coachId));

      assert.equal(earnings.coachId, coachId);
      assert.equal(earnings.totalEarned, 0);
      assert.equal(earnings.availableBalance, 0);
      assert.equal(earnings.pendingBalance, 0);
    });
  });

  describe('recordSessionPayment', () => {
    it('creates a completed payment transaction and updates coach balances', async () => {
      const coachId = nextId('coach');
      const bookingId = nextId('booking');
      const payment = expectOk(await earningsReportService.recordSessionPayment(coachId, bookingId, 100));

      assert.ok(payment.id);
      assert.equal(payment.type, 'SESSION_PAYMENT');
      assert.equal(payment.status, 'COMPLETED');
      assert.equal(payment.bookingId, bookingId);
      assert.ok(payment.amount > 0);

      const earnings = expectOk(await earningsReportService.getEarnings(coachId));
      assert.ok(earnings.totalEarned >= payment.amount);
      assert.ok(earnings.availableBalance >= payment.amount);
      assert.equal(earnings.totalSessions, 1);
    });
  });

  describe('recordRefund', () => {
    it('creates a refund transaction and decreases total earned', async () => {
      const coachId = nextId('coach');
      const bookingId = nextId('booking');
      expectOk(await earningsReportService.recordSessionPayment(coachId, bookingId, 120));
      const before = expectOk(await earningsReportService.getEarnings(coachId));

      const refund = expectOk(await earningsReportService.recordRefund(
        coachId,
        bookingId,
        60,
        'Cancelled by parent',
      ));
      assert.equal(refund.type, 'REFUND');
      assert.ok(refund.amount < 0);

      const after = expectOk(await earningsReportService.getEarnings(coachId));
      assert.ok(after.totalEarned < before.totalEarned);
    });
  });

  describe('getTransactionHistory', () => {
    it('returns transactions sorted by createdAt descending and respects limit', async () => {
      const coachId = nextId('coach');
      expectOk(await earningsReportService.recordSessionPayment(coachId, nextId('booking'), 50));
      await new Promise((resolve) => setTimeout(resolve, 10));
      expectOk(await earningsReportService.recordSessionPayment(coachId, nextId('booking'), 80));
      await new Promise((resolve) => setTimeout(resolve, 10));
      expectOk(await earningsReportService.recordSessionPayment(coachId, nextId('booking'), 90));

      const fullHistory = expectOk(await earningsReportService.getTransactionHistory(coachId));
      assert.ok(fullHistory.length >= 3);
      if (fullHistory.length > 1) {
        const first = new Date(fullHistory[0].createdAt).getTime();
        const second = new Date(fullHistory[1].createdAt).getTime();
        assert.ok(first >= second);
      }

      const limited = expectOk(await earningsReportService.getTransactionHistory(coachId, 2));
      assert.ok(limited.length <= 2);
    });

    it('returns empty list for coach with no transactions', async () => {
      const history = expectOk(await earningsReportService.getTransactionHistory(nextId('coach')));
      assert.deepEqual(history, []);
    });
  });

  describe('getAllTransactions/resetToMockData', () => {
    it('returns all stored transactions and can reset to mock state', async () => {
      const coachId = nextId('coach');
      expectOk(await earningsReportService.recordSessionPayment(coachId, nextId('booking'), 75));

      const allBeforeReset = await earningsReportService.getAllTransactions();
      assert.ok(allBeforeReset.length >= 1);

      await earningsReportService.resetToMockData();

      const earnings = await apiClient.get(STORAGE_KEYS.EARNINGS, {});
      assert.equal(typeof earnings, 'object');
    });
  });
});
