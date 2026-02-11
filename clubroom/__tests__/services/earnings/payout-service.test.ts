import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { payoutService } from '@/services/earnings/payout-service';
import { earningsReportService } from '@/services/earnings/earnings-report-service';
import type { PayoutMethod } from '@/constants/types';
import type { Result, ServiceError } from '@/types/result';

function expectOk<T>(result: Result<T, ServiceError>): T {
  assert.equal(result.success, true);
  return result.data;
}

function expectErr(result: Result<unknown, ServiceError>, code: ServiceError['code']): ServiceError {
  assert.equal(result.success, false);
  return result.error.code === code ? result.error : assert.fail(`Expected error code ${code}`);
}

let seq = 0;

function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}_${seq}`;
}

async function verifyMethod(methodId: string) {
  const methods = await apiClient.get<PayoutMethod[]>(STORAGE_KEYS.PAYOUT_METHODS, []);
  const updated = methods.map((method) =>
    method.id === methodId
      ? { ...method, isVerified: true, verifiedAt: new Date().toISOString() }
      : method
  );
  await apiClient.set(STORAGE_KEYS.PAYOUT_METHODS, updated);
}

async function addVerifiedBankMethod(coachId: string, isDefault = true) {
  const method = expectOk(await payoutService.addPayoutMethod(coachId, {
    type: 'BANK_ACCOUNT',
    isDefault,
    bankName: 'Barclays',
    accountLastFour: '1234',
    sortCode: '12-34-56',
    nickname: 'Primary',
  }));
  await verifyMethod(method.id);
  return method.id;
}

describe('PayoutService', () => {
  beforeEach(async () => {
    seq = 0;
    await apiClient.set(STORAGE_KEYS.PAYOUT_METHODS, []);
    await apiClient.set(STORAGE_KEYS.WITHDRAWALS, []);
    await apiClient.set(STORAGE_KEYS.EARNING_TRANSACTIONS, []);
    await apiClient.set(STORAGE_KEYS.EARNINGS, {});
  });

  describe('addPayoutMethod/getPayoutMethods', () => {
    it('adds payout methods and returns coach-specific list', async () => {
      const coachId = nextId('coach');

      const method = expectOk(await payoutService.addPayoutMethod(coachId, {
        type: 'PAYPAL',
        isDefault: true,
        paypalEmail: 'coach@example.com',
        nickname: 'PayPal',
      }));

      assert.ok(method.id);
      assert.equal(method.coachId, coachId);
      assert.equal(method.type, 'PAYPAL');
      assert.equal(method.isDefault, true);

      const methods = expectOk(await payoutService.getPayoutMethods(coachId));
      assert.equal(methods.length, 1);
      assert.equal(methods[0].id, method.id);
    });

    it('filters methods by coach id', async () => {
      const coachA = nextId('coach');
      const coachB = nextId('coach');
      expectOk(await payoutService.addPayoutMethod(coachA, {
        type: 'PAYPAL',
        isDefault: true,
        paypalEmail: 'a@example.com',
      }));
      expectOk(await payoutService.addPayoutMethod(coachB, {
        type: 'PAYPAL',
        isDefault: true,
        paypalEmail: 'b@example.com',
      }));

      const methodsA = expectOk(await payoutService.getPayoutMethods(coachA));
      assert.equal(methodsA.length, 1);
      assert.equal(methodsA[0].coachId, coachA);
    });
  });

  describe('removePayoutMethod', () => {
    it('removes a non-default method', async () => {
      const coachId = nextId('coach');
      await addVerifiedBankMethod(coachId, true);
      const removable = expectOk(await payoutService.addPayoutMethod(coachId, {
        type: 'PAYPAL',
        isDefault: false,
        paypalEmail: 'remove-me@example.com',
      }));

      const removed = expectOk(await payoutService.removePayoutMethod(coachId, removable.id));
      assert.equal(removed, true);

      const methods = expectOk(await payoutService.getPayoutMethods(coachId));
      assert.ok(!methods.some((method) => method.id === removable.id));
    });

    it('rejects removing a default method', async () => {
      const coachId = nextId('coach');
      const defaultId = await addVerifiedBankMethod(coachId, true);

      const result = await payoutService.removePayoutMethod(coachId, defaultId);
      expectErr(result, 'VALIDATION');
    });
  });

  describe('setDefaultPayoutMethod', () => {
    it('sets a verified method as default', async () => {
      const coachId = nextId('coach');
      const firstId = await addVerifiedBankMethod(coachId, true);
      const second = expectOk(await payoutService.addPayoutMethod(coachId, {
        type: 'PAYPAL',
        isDefault: false,
        paypalEmail: 'new-default@example.com',
      }));
      await verifyMethod(second.id);

      const updated = expectOk(await payoutService.setDefaultPayoutMethod(coachId, second.id));
      assert.equal(updated.id, second.id);
      assert.equal(updated.isDefault, true);

      const methods = expectOk(await payoutService.getPayoutMethods(coachId));
      const first = methods.find((method) => method.id === firstId);
      const newer = methods.find((method) => method.id === second.id);
      assert.equal(first?.isDefault, false);
      assert.equal(newer?.isDefault, true);
    });
  });

  describe('withdrawals', () => {
    it('creates a pending withdrawal and returns it in history/pending', async () => {
      const coachId = nextId('coach');
      const payoutMethodId = await addVerifiedBankMethod(coachId, true);
      expectOk(await earningsReportService.recordSessionPayment(coachId, nextId('booking'), 200));

      const withdrawal = expectOk(await payoutService.requestWithdrawal(coachId, 50, payoutMethodId));
      assert.equal(withdrawal.coachId, coachId);
      assert.equal(withdrawal.amount, 50);
      assert.equal(withdrawal.status, 'PENDING');

      const history = expectOk(await payoutService.getWithdrawalHistory(coachId));
      assert.ok(history.some((item) => item.id === withdrawal.id));

      const pending = expectOk(await payoutService.getPendingWithdrawals(coachId));
      assert.ok(pending.some((item) => item.id === withdrawal.id));
    });

    it('cancels a pending withdrawal', async () => {
      const coachId = nextId('coach');
      const payoutMethodId = await addVerifiedBankMethod(coachId, true);
      expectOk(await earningsReportService.recordSessionPayment(coachId, nextId('booking'), 300));
      const withdrawal = expectOk(await payoutService.requestWithdrawal(coachId, 80, payoutMethodId));

      expectOk(await payoutService.cancelWithdrawal(withdrawal.id));

      const history = expectOk(await payoutService.getWithdrawalHistory(coachId));
      const cancelled = history.find((item) => item.id === withdrawal.id);
      assert.equal(cancelled?.status, 'CANCELLED');
    });
  });
});
