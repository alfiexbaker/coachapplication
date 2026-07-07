import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('coachPaymentInstructionsService API mode', () => {
  it('uses /v1 payment instructions instead of local persistence', async () => {
    const [{ coachPaymentInstructionsService }, { apiClient }] = await Promise.all([
      import('@/services/coach-payment-instructions-service'),
      import('@/services/api-client'),
    ]);

    const originalGet = apiClient.get;
    const originalSet = apiClient.set;
    const originalFetch = globalThis.fetch;
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];
    apiClient.get = async () => {
      throw new Error('local get should not run in API mode');
    };
    apiClient.set = async () => {
      throw new Error('local set should not run in API mode');
    };
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      const body = init?.body
        ? (JSON.parse(String(init.body)) as Partial<{
            payeeName: string;
            bankTransferDetails: string;
            paymentNotes: string;
          }>)
        : undefined;
      calls.push({
        method,
        path: url.pathname,
        body,
      });

      if (url.pathname === '/v1/coaches/me/payment-instructions' && method === 'GET') {
        return new Response(
          JSON.stringify({
            instructions: {
              coachId: 'coach_api',
              payeeName: '',
              bankTransferDetails: '',
              paymentNotes: 'Use the invoice number as reference',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.pathname === '/v1/coaches/me/payment-instructions' && method === 'PATCH') {
        return new Response(
          JSON.stringify({
            instructions: {
              coachId: 'coach_api',
              payeeName: body?.payeeName ?? '',
              bankTransferDetails: body?.bankTransferDetails ?? '',
              paymentNotes: body?.paymentNotes ?? '',
              updatedAt: '2026-01-02T00:00:00.000Z',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(JSON.stringify({ message: 'unexpected request' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      const read = await coachPaymentInstructionsService.getCoachPaymentInstructions('coach_api');
      assert.equal(read.success, true);
      assert.equal(read.success && read.data.coachId, 'coach_api');
      assert.equal(read.success && read.data.bankTransferDetails, '');

      const saved = await coachPaymentInstructionsService.saveCoachPaymentInstructions({
        coachId: 'coach_api',
        payeeName: 'Coach API',
        bankTransferDetails: 'Sort code: 00-00-00',
        paymentNotes: 'Use the invoice number as reference',
      });
      assert.equal(saved.success, true);
      assert.equal(saved.success && saved.data.bankTransferDetails, 'Sort code: 00-00-00');
      assert.equal(coachPaymentInstructionsService.canSavePaymentInstructions(), true);
      assert.deepEqual(calls, [
        { method: 'GET', path: '/v1/coaches/me/payment-instructions', body: undefined },
        {
          method: 'PATCH',
          path: '/v1/coaches/me/payment-instructions',
          body: {
            payeeName: 'Coach API',
            bankTransferDetails: 'Sort code: 00-00-00',
            paymentNotes: 'Use the invoice number as reference',
          },
        },
      ]);
    } finally {
      apiClient.get = originalGet;
      apiClient.set = originalSet;
      globalThis.fetch = originalFetch;
    }
  });
});
