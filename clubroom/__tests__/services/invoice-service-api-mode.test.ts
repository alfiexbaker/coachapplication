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
  it('rejects synthetic invoice upsert instead of silently no-oping', async () => {
    const [{ invoiceService }, { apiClient }] = await Promise.all([
      import('@/services/invoice-service'),
      import('@/services/api-client'),
    ]);
    const originalGet = apiClient.get;
    const originalSet = apiClient.set;
    const localInvoiceStorageCalls: string[] = [];

    apiClient.get = async <T>(key: string, fallback: T): Promise<T> => {
      if (key === 'clubroom.invoices') {
        localInvoiceStorageCalls.push(`get:${key}`);
        throw new Error('local invoice storage read should not run in API mode');
      }
      return (await originalGet.call(apiClient, key, fallback)) as T;
    };
    apiClient.set = async <T>(key: string, data: T): Promise<void> => {
      if (key === 'clubroom.invoices') {
        localInvoiceStorageCalls.push(`set:${key}`);
        throw new Error('local invoice storage write should not run in API mode');
      }
      return originalSet.call(apiClient, key, data);
    };

    try {
      await assert.rejects(
        () =>
          invoiceService.upsertInvoice({
            id: 'inv_synthetic_api',
            invoiceNumber: 'INV-SYN-API',
            userId: 'parent_api',
            bookingId: 'booking_api',
            coachId: 'coach_api',
            sessionDate: '2026-07-15T10:00:00.000Z',
            sessionType: 'Session',
            amount: 50,
            tax: 0,
            taxRate: 0,
            total: 50,
            currency: 'GBP',
            status: 'SENT',
            createdAt: '2026-07-15T10:00:00.000Z',
          }),
        /Synthetic invoice upsert is mock-only; API mode must use \/v1\/invoices\/generate/,
      );
    } finally {
      apiClient.get = originalGet;
      apiClient.set = originalSet;
    }

    assert.deepEqual(localInvoiceStorageCalls, []);
  });

  it('does not locally mutate invoice payment state when transition APIs fail', async () => {
    const [{ invoiceService }, { apiClient }] = await Promise.all([
      import('@/services/invoice-service'),
      import('@/services/api-client'),
    ]);
    const originalGet = apiClient.get;
    const originalSet = apiClient.set;
    const localInvoiceStorageCalls: string[] = [];
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];

    apiClient.get = async <T>(key: string, fallback: T): Promise<T> => {
      if (key === 'clubroom.invoices') {
        localInvoiceStorageCalls.push(`get:${key}`);
        throw new Error('local invoice storage read should not run in API mode');
      }
      return (await originalGet.call(apiClient, key, fallback)) as T;
    };
    apiClient.set = async <T>(key: string, data: T): Promise<void> => {
      if (key === 'clubroom.invoices') {
        localInvoiceStorageCalls.push(`set:${key}`);
        throw new Error('local invoice storage write should not run in API mode');
      }
      return originalSet.call(apiClient, key, data);
    };
    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      calls.push({
        method: init?.method ?? 'GET',
        path: url.pathname,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      return jsonResponse({ message: 'transition api down' }, 503);
    }) as typeof fetch;

    try {
      await assert.rejects(
        () =>
          invoiceService.markAsPaid('invc_transition', {
            manualReceipt: {
              method: 'cash',
              amountMinor: 5000,
              reference: 'cash-1',
            },
          }),
        /transition api down/i,
      );
      await assert.rejects(
        () => invoiceService.voidInvoice('invc_transition', 'duplicate'),
        /transition api down/i,
      );
      await assert.rejects(
        () => invoiceService.writeOff('invc_transition', 'goodwill'),
        /transition api down/i,
      );
      await assert.rejects(
        () => invoiceService.restoreFromWriteOff('invc_transition'),
        /transition api down/i,
      );
    } finally {
      apiClient.get = originalGet;
      apiClient.set = originalSet;
    }

    assert.deepEqual(localInvoiceStorageCalls, []);
    assert.deepEqual(calls, [
      {
        method: 'POST',
        path: '/v1/invoices/invc_transition/mark-paid',
        body: {
          manualReceipt: {
            method: 'cash',
            amountMinor: 5000,
            reference: 'cash-1',
          },
        },
      },
      {
        method: 'POST',
        path: '/v1/invoices/invc_transition/void',
        body: { reason: 'duplicate' },
      },
      {
        method: 'POST',
        path: '/v1/invoices/invc_transition/write-off',
        body: { reason: 'goodwill' },
      },
      {
        method: 'POST',
        path: '/v1/invoices/invc_transition/restore',
        body: undefined,
      },
    ]);
  });

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

      if (url.pathname === '/v1/invoices' && url.searchParams.get('coachId') === 'coach_2') {
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

  it('fails closed on invoice read failures but treats detail 404 as missing', async () => {
    const { invoiceService } = await import('@/services/invoice-service');
    const calls: Array<{ method: string; path: string }> = [];

    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      calls.push({ method, path: `${url.pathname}${url.search}` });

      if (url.pathname === '/v1/invoices/invc_down') {
        return jsonResponse({ message: 'invoice read down' }, 503);
      }
      if (url.pathname === '/v1/invoices/invc_missing') {
        return jsonResponse({ message: 'Invoice not found' }, 404);
      }
      if (url.pathname === '/v1/invoices' && url.searchParams.get('bookingId') === 'booking_down') {
        return jsonResponse({ message: 'invoice list down' }, 503);
      }

      return jsonResponse({ message: `Unhandled ${method} ${url.pathname}${url.search}` }, 500);
    }) as typeof fetch;

    await assert.rejects(() => invoiceService.getInvoiceById('invc_down'), /invoice read down/i);
    assert.equal(await invoiceService.getInvoiceById('invc_missing'), null);
    await assert.rejects(
      () => invoiceService.getInvoiceByBookingId('booking_down'),
      /invoice list down/i,
    );

    assert.deepEqual(calls, [
      { method: 'GET', path: '/v1/invoices/invc_down' },
      { method: 'GET', path: '/v1/invoices/invc_missing' },
      { method: 'GET', path: '/v1/invoices?bookingId=booking_down' },
    ]);
  });
});
