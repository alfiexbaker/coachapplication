import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { payoutService } from '@/services/earnings/payout-service';

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('payoutService API mode', () => {
  it('returns simulated /v1 payout method and withdrawal results', async () => {
    const coachId = 'coach_live_test';
    const payoutMethod = {
      id: 'pm_live_test',
      coachId,
      type: 'BANK_ACCOUNT' as const,
      isDefault: true,
      isVerified: true,
      bankName: 'Test Bank',
      accountLastFour: '1234',
      nickname: 'Main',
      createdAt: '2026-06-23T09:00:00.000Z',
      verifiedAt: '2026-06-23T09:00:00.000Z',
    };
    const pendingWithdrawal = {
      id: 'wd_live_test',
      coachId,
      amount: 50,
      currency: 'GBP',
      fee: 0,
      netAmount: 50,
      payoutMethodId: payoutMethod.id,
      payoutMethod: 'BANK_ACCOUNT' as const,
      status: 'PENDING' as const,
      requestedAt: '2026-06-23T09:01:00.000Z',
    };
    const completedWithdrawal = {
      ...pendingWithdrawal,
      status: 'COMPLETED' as const,
      processedAt: '2026-06-23T09:02:00.000Z',
      completedAt: '2026-06-23T09:02:00.000Z',
      reference: 'SIM-WD-2026-TEST',
    };
    const cancelledWithdrawal = {
      ...pendingWithdrawal,
      id: 'wd_cancel_test',
      status: 'CANCELLED' as const,
    };

    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (url.endsWith('/v1/coaches/me/payout-methods') && method === 'POST') {
        return jsonResponse({
          payoutMethod,
          payoutMethods: [payoutMethod],
          total: 1,
          provider: 'simulated',
          providerConfigured: false,
          requestId: 'req_add',
        });
      }
      if (url.endsWith('/v1/coaches/me/payout-methods') && method === 'GET') {
        return jsonResponse({
          payoutMethods: [payoutMethod],
          total: 1,
          provider: 'simulated',
          providerConfigured: false,
          requestId: 'req_list',
        });
      }
      if (url.endsWith(`/v1/coaches/me/payout-methods/${payoutMethod.id}/default`)) {
        return jsonResponse({
          payoutMethod,
          payoutMethods: [payoutMethod],
          total: 1,
          provider: 'simulated',
          providerConfigured: false,
          requestId: 'req_default',
        });
      }
      if (url.endsWith(`/v1/coaches/me/payout-methods/${payoutMethod.id}`)) {
        return jsonResponse({
          payoutMethods: [],
          total: 0,
          provider: 'simulated',
          providerConfigured: false,
          requestId: 'req_delete',
        });
      }
      if (url.endsWith('/v1/coaches/me/withdrawals') && method === 'POST') {
        return jsonResponse({
          withdrawal: pendingWithdrawal,
          withdrawals: [pendingWithdrawal],
          total: 1,
          status: 'all',
          provider: 'simulated',
          providerConfigured: false,
          requestId: 'req_withdraw',
        });
      }
      if (url.endsWith('/v1/coaches/me/withdrawals?status=pending')) {
        return jsonResponse({
          withdrawals: [pendingWithdrawal],
          total: 1,
          status: 'pending',
          provider: 'simulated',
          providerConfigured: false,
          requestId: 'req_pending',
        });
      }
      if (url.endsWith('/v1/coaches/me/withdrawals') && method === 'GET') {
        return jsonResponse({
          withdrawals: [completedWithdrawal, cancelledWithdrawal],
          total: 2,
          status: 'all',
          provider: 'simulated',
          providerConfigured: false,
          requestId: 'req_history',
        });
      }
      if (url.endsWith(`/v1/coaches/me/withdrawals/${pendingWithdrawal.id}/complete`)) {
        return jsonResponse({
          withdrawal: completedWithdrawal,
          withdrawals: [completedWithdrawal],
          total: 1,
          status: 'all',
          provider: 'simulated',
          providerConfigured: false,
          requestId: 'req_complete',
        });
      }
      if (url.endsWith(`/v1/coaches/me/withdrawals/${cancelledWithdrawal.id}/cancel`)) {
        return jsonResponse({
          withdrawal: cancelledWithdrawal,
          withdrawals: [cancelledWithdrawal],
          total: 1,
          status: 'all',
          provider: 'simulated',
          providerConfigured: false,
          requestId: 'req_cancel',
        });
      }
      return jsonResponse({ message: `Unhandled ${method} ${url}` }, 500);
    }) as typeof fetch;

    const added = await payoutService.addPayoutMethod(coachId, {
      type: 'BANK_ACCOUNT',
      isDefault: true,
      bankName: 'Test Bank',
      accountLastFour: '1234',
      sortCode: '12-34-56',
    });
    assert.equal(added.success, true);
    assert.equal(added.success && added.data.id, payoutMethod.id);

    const listed = await payoutService.getPayoutMethods(coachId);
    assert.equal(listed.success, true);
    assert.equal(listed.success && listed.data.length, 1);

    const defaulted = await payoutService.setDefaultPayoutMethod(coachId, payoutMethod.id);
    assert.equal(defaulted.success, true);
    assert.equal(defaulted.success && defaulted.data.isDefault, true);

    const requested = await payoutService.requestWithdrawal(coachId, 50, payoutMethod.id);
    assert.equal(requested.success, true);
    assert.equal(requested.success && requested.data.status, 'PENDING');

    const pending = await payoutService.getPendingWithdrawals(coachId);
    assert.equal(pending.success, true);
    assert.equal(pending.success && pending.data[0]?.id, pendingWithdrawal.id);

    const completed = await payoutService.completeWithdrawal(pendingWithdrawal.id);
    assert.equal(completed.success, true);
    assert.equal(completed.success && completed.data.status, 'COMPLETED');

    const cancelled = await payoutService.cancelWithdrawal(cancelledWithdrawal.id);
    assert.equal(cancelled.success, true);

    const history = await payoutService.getWithdrawalHistory(coachId);
    assert.equal(history.success, true);
    assert.equal(history.success && history.data.length, 2);

    const removed = await payoutService.removePayoutMethod(coachId, payoutMethod.id);
    assert.equal(removed.success, true);
  });
});
