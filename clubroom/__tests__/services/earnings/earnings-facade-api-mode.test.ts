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

describe('earningsService facade API mode', () => {
  it('surfaces finance API failures instead of returning empty money state', async () => {
    const { earningsService } = await import('@/services/earnings');
    const calls: string[] = [];

    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      calls.push(`${init?.method ?? 'GET'} ${url.pathname}${url.search}`);
      return jsonResponse({ message: `Finance API unavailable: ${url.pathname}` }, 503);
    }) as typeof fetch;

    await assert.rejects(
      () => earningsService.getEarnings('coach_api_money'),
      /Finance API unavailable: \/v1\/coaches\/me\/earnings/,
    );
    await assert.rejects(
      () => earningsService.calculateEarningsFromBookings('coach_api_money'),
      /Finance API unavailable: \/v1\/coaches\/me\/earnings/,
    );
    await assert.rejects(
      () => earningsService.getPayoutMethods('coach_api_money'),
      /Finance API unavailable: \/v1\/coaches\/me\/payout-methods/,
    );
    await assert.rejects(
      () => earningsService.getPendingWithdrawals('coach_api_money'),
      /Finance API unavailable: \/v1\/coaches\/me\/withdrawals/,
    );
    await assert.rejects(
      () => earningsService.getWithdrawalHistory('coach_api_money'),
      /Finance API unavailable: \/v1\/coaches\/me\/withdrawals/,
    );
    await assert.rejects(
      () => earningsService.getTransactionHistory('coach_api_money', 2),
      /Finance API unavailable: \/v1\/coaches\/me\/earnings/,
    );

    assert.deepEqual(calls, [
      'GET /v1/coaches/me/earnings',
      'GET /v1/coaches/me/earnings',
      'GET /v1/coaches/me/payout-methods',
      'GET /v1/coaches/me/withdrawals?status=pending',
      'GET /v1/coaches/me/withdrawals',
      'GET /v1/coaches/me/earnings?limit=2',
    ]);
  });
});
