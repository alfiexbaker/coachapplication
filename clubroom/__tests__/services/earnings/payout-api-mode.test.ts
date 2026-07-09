import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

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
    const [{ payoutService }, { apiClient }] = await Promise.all([
      import('@/services/earnings/payout-service'),
      import('@/services/api-client'),
    ]);
    const client = apiClient as unknown as {
      get: typeof apiClient.get;
      set: typeof apiClient.set;
      remove: typeof apiClient.remove;
    };
    const originalClient = {
      get: client.get,
      set: client.set,
      remove: client.remove,
    };
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
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];

    client.get = async () => {
      throw new Error('local payout reads should not run in API mode');
    };
    client.set = async () => {
      throw new Error('local payout writes should not run in API mode');
    };
    client.remove = async () => {
      throw new Error('local payout deletes should not run in API mode');
    };

    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ method, path: `${url.pathname}${url.search}`, body });
      if (url.pathname === '/v1/coaches/me/payout-methods' && method === 'POST') {
        return jsonResponse({
          payoutMethod,
          payoutMethods: [payoutMethod],
          total: 1,
          provider: 'simulated',
          providerConfigured: false,
          requestId: 'req_add',
        });
      }
      if (url.pathname === '/v1/coaches/me/payout-methods' && method === 'GET') {
        return jsonResponse({
          payoutMethods: [payoutMethod],
          total: 1,
          provider: 'simulated',
          providerConfigured: false,
          requestId: 'req_list',
        });
      }
      if (url.pathname === `/v1/coaches/me/payout-methods/${payoutMethod.id}/default`) {
        return jsonResponse({
          payoutMethod,
          payoutMethods: [payoutMethod],
          total: 1,
          provider: 'simulated',
          providerConfigured: false,
          requestId: 'req_default',
        });
      }
      if (url.pathname === `/v1/coaches/me/payout-methods/${payoutMethod.id}`) {
        return jsonResponse({
          payoutMethods: [],
          total: 0,
          provider: 'simulated',
          providerConfigured: false,
          requestId: 'req_delete',
        });
      }
      if (url.pathname === '/v1/coaches/me/withdrawals' && method === 'POST') {
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
      if (
        url.pathname === '/v1/coaches/me/withdrawals' &&
        url.searchParams.get('status') === 'pending'
      ) {
        return jsonResponse({
          withdrawals: [pendingWithdrawal],
          total: 1,
          status: 'pending',
          provider: 'simulated',
          providerConfigured: false,
          requestId: 'req_pending',
        });
      }
      if (url.pathname === '/v1/coaches/me/withdrawals' && method === 'GET') {
        return jsonResponse({
          withdrawals: [completedWithdrawal, cancelledWithdrawal],
          total: 2,
          status: 'all',
          provider: 'simulated',
          providerConfigured: false,
          requestId: 'req_history',
        });
      }
      if (url.pathname === `/v1/coaches/me/withdrawals/${pendingWithdrawal.id}/complete`) {
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
      if (url.pathname === `/v1/coaches/me/withdrawals/${cancelledWithdrawal.id}/cancel`) {
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
      return jsonResponse({ message: `Unhandled ${method} ${url.pathname}${url.search}` }, 500);
    }) as typeof fetch;

    try {
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
    } finally {
      client.get = originalClient.get;
      client.set = originalClient.set;
      client.remove = originalClient.remove;
    }

    assert.deepEqual(
      calls.map((call) => `${call.method} ${call.path}`),
      [
        'POST /v1/coaches/me/payout-methods',
        'GET /v1/coaches/me/payout-methods',
        'PATCH /v1/coaches/me/payout-methods/pm_live_test/default',
        'POST /v1/coaches/me/withdrawals',
        'GET /v1/coaches/me/withdrawals?status=pending',
        'POST /v1/coaches/me/withdrawals/wd_live_test/complete',
        'POST /v1/coaches/me/withdrawals/wd_cancel_test/cancel',
        'GET /v1/coaches/me/withdrawals',
        'DELETE /v1/coaches/me/payout-methods/pm_live_test',
      ],
    );
    assert.deepEqual(calls[3]?.body, {
      amount: 50,
      payoutMethodId: payoutMethod.id,
    });
  });

  it('fails closed when payout API responses are not explicitly simulated', async () => {
    const { payoutService } = await import('@/services/earnings/payout-service');
    const calls: Array<{ method: string; path: string }> = [];

    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      calls.push({ method, path: `${url.pathname}${url.search}` });

      if (url.pathname === '/v1/coaches/me/payout-methods') {
        return jsonResponse({
          payoutMethods: [],
          total: 0,
          provider: 'stripe',
          providerConfigured: true,
          requestId: 'req_real_provider',
        });
      }
      if (url.pathname === '/v1/coaches/me/withdrawals/wd_missing_provider/complete') {
        return jsonResponse({
          withdrawal: {
            id: 'wd_missing_provider',
            coachId: 'coach_live_test',
            amount: 50,
            currency: 'GBP',
            fee: 0,
            netAmount: 50,
            payoutMethodId: 'pm_live_test',
            payoutMethod: 'BANK_ACCOUNT',
            status: 'COMPLETED',
            requestedAt: '2026-06-23T09:01:00.000Z',
            completedAt: '2026-06-23T09:02:00.000Z',
          },
          withdrawals: [],
          total: 1,
          status: 'all',
          providerConfigured: false,
          requestId: 'req_missing_provider',
        });
      }

      return jsonResponse({ message: `Unhandled ${method} ${url.pathname}${url.search}` }, 500);
    }) as typeof fetch;

    const methods = await payoutService.getPayoutMethods('coach_live_test');
    assert.equal(methods.success, false);
    assert.match(
      methods.success ? '' : methods.error.message,
      /explicit simulated payout provider response/i,
    );

    const completed = await payoutService.completeWithdrawal('wd_missing_provider');
    assert.equal(completed.success, false);
    assert.match(
      completed.success ? '' : completed.error.message,
      /explicit simulated payout provider response/i,
    );

    assert.deepEqual(calls, [
      { method: 'GET', path: '/v1/coaches/me/payout-methods' },
      { method: 'POST', path: '/v1/coaches/me/withdrawals/wd_missing_provider/complete' },
    ]);
  });
});
