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

describe('invoiceService API mode', () => {
  it('uses coach self invoices endpoint for self-scoped coach filters', async () => {
    const { invoiceService } = await import('@/services/invoice-service');
    const calls: Array<{ method: string; path: string }> = [];

    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      calls.push({
        method,
        path: `${url.pathname}${url.search}`,
      });

      if (
        url.pathname === '/v1/coaches/me/invoices' &&
        url.searchParams.get('status') === 'PAID,SENT' &&
        !url.searchParams.has('coachId')
      ) {
        return jsonResponse({
          invoices: [
            {
              id: 'invc_self_1',
              invoiceNumber: 'INV-SELF-1',
              userId: 'parent_1',
              coachId: 'coach_1',
              bookingId: 'booking_1',
              sessionDate: '2026-07-01T10:00:00.000Z',
              amount: 50,
              tax: 0,
              taxRate: 0,
              total: 50,
              currency: 'GBP',
              status: 'PAID',
              createdAt: '2026-07-01T11:00:00.000Z',
            },
          ],
          total: 1,
          requestId: 'req_self',
        });
      }

      if (
        url.pathname === '/v1/invoices' &&
        url.searchParams.get('coachId') === 'coach_2'
      ) {
        return jsonResponse({
          invoices: [],
          total: 0,
          requestId: 'req_general',
        });
      }

      return jsonResponse({ message: `Unhandled ${method} ${url.pathname}${url.search}` }, 500);
    }) as typeof fetch;

    const selfInvoices = await invoiceService.getInvoicesFiltered('coach_1', {
      coachId: 'coach_1',
      status: ['PAID', 'SENT'],
    });
    assert.deepEqual(
      selfInvoices.map((invoice) => invoice.id),
      ['invc_self_1'],
    );

    const otherInvoices = await invoiceService.getInvoicesFiltered('coach_1', {
      coachId: 'coach_2',
    });
    assert.deepEqual(otherInvoices, []);

    assert.deepEqual(calls, [
      {
        method: 'GET',
        path: '/v1/coaches/me/invoices?status=PAID%2CSENT',
      },
      {
        method: 'GET',
        path: '/v1/invoices?coachId=coach_2',
      },
    ]);
  });
});
