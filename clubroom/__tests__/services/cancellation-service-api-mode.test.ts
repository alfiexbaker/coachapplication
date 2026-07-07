import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('cancellationService API mode', () => {
  it('uses /v1 cancellation and no-show routes instead of local storage', async () => {
    const [{ cancellationService }, { apiClient }] = await Promise.all([
      import('@/services/cancellation-service'),
      import('@/services/api-client'),
    ]);

    const originalGet = apiClient.get;
    const originalSet = apiClient.set;
    const originalFetch = global.fetch;
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];

    apiClient.get = async () => {
      throw new Error('local cancellation reads should not run in API mode');
    };
    apiClient.set = async () => {
      throw new Error('local cancellation writes should not run in API mode');
    };
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ method, path: url.pathname, body });

      if (url.pathname === '/v1/cancellation-records' && method === 'GET') {
        return new Response(
          JSON.stringify({
            records: [
              {
                id: 'cancel_api_1',
                bookingId: 'booking_api_cancel',
                cancelledBy: 'parent',
                cancelledAt: '2026-07-01T10:00:00.000Z',
                reason: 'Schedule changed',
                reasonCategory: 'Schedule changed',
                note: '',
                refundAmount: 0,
                refundPercentage: 0,
                hoursBeforeSession: 2,
                coachId: 'coach_api_cancel',
                familyId: 'family_api_cancel',
              },
            ],
            total: 1,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.pathname === '/v1/cancellation-records/booking_api_cancel' && method === 'GET') {
        return new Response(
          JSON.stringify({
            record: {
              id: 'cancel_api_1',
              bookingId: 'booking_api_cancel',
              cancelledBy: 'parent',
              cancelledAt: '2026-07-01T10:00:00.000Z',
              reason: 'Schedule changed',
              reasonCategory: 'Schedule changed',
              note: '',
              refundAmount: 0,
              refundPercentage: 0,
              hoursBeforeSession: 2,
              coachId: 'coach_api_cancel',
              familyId: 'family_api_cancel',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.pathname === '/v1/families/family_api_cancel/no-shows' && method === 'GET') {
        return new Response(JSON.stringify({ familyId: 'family_api_cancel', count: 3 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname === '/v1/families/family_api_cancel/no-shows' && method === 'PATCH') {
        return new Response(
          JSON.stringify({
            familyId: 'family_api_cancel',
            action: (body as { action?: string }).action,
            count: (body as { action?: string }).action === 'record' ? 4 : 3,
            proof: {
              kind: 'group_registration',
              athleteId: 'ath_api_cancel',
              registrationId: 'gsr_api_cancel',
              groupSessionId: 'grp_api_cancel',
              date: '2026-07-03',
              replayed: false,
              clearedRecords: (body as { action?: string }).action === 'clear' ? 1 : undefined,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(JSON.stringify({ message: 'unexpected route' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      const records = await cancellationService.getCancellationRecords('coach_api_cancel');
      assert.equal(records.success, true);
      assert.equal(records.success && records.data.length, 1);

      const record = await cancellationService.getCancellationByBooking('booking_api_cancel');
      assert.equal(record.success, true);
      assert.equal(record.success && record.data?.id, 'cancel_api_1');

      const stats = await cancellationService.getCancellationStats('coach_api_cancel');
      assert.equal(stats.success, true);
      assert.equal(stats.success && stats.data.totalCancellations, 1);

      const count = await cancellationService.getNoShowCount('family_api_cancel');
      assert.equal(count.success, true);
      assert.equal(count.success && count.data, 3);

      const noProofIncrement = await cancellationService.incrementNoShow('family_api_cancel');
      assert.equal(noProofIncrement.success, false);
      assert.equal(!noProofIncrement.success && noProofIncrement.error.code, 'UNSUPPORTED');

      const increment = await cancellationService.incrementNoShow('family_api_cancel', {
        athleteId: 'ath_api_cancel',
        groupSessionRegistrationId: 'gsr_api_cancel',
        date: '2026-07-03',
        notes: 'Missed session',
      });
      assert.equal(increment.success, true);

      const noProofReset = await cancellationService.resetNoShowCount('family_api_cancel');
      assert.equal(noProofReset.success, false);
      assert.equal(!noProofReset.success && noProofReset.error.code, 'UNSUPPORTED');

      const reset = await cancellationService.resetNoShowCount('family_api_cancel', {
        athleteId: 'ath_api_cancel',
        groupSessionRegistrationId: 'gsr_api_cancel',
        date: '2026-07-03',
        notes: 'Corrected attendance',
      });
      assert.equal(reset.success, true);

      assert.deepEqual(
        calls.map((call) => `${call.method} ${call.path}`),
        [
          'GET /v1/cancellation-records',
          'GET /v1/cancellation-records/booking_api_cancel',
          'GET /v1/cancellation-records',
          'GET /v1/families/family_api_cancel/no-shows',
          'PATCH /v1/families/family_api_cancel/no-shows',
          'PATCH /v1/families/family_api_cancel/no-shows',
        ],
      );
      assert.deepEqual(calls[4]?.body, {
        action: 'record',
        athleteId: 'ath_api_cancel',
        groupSessionRegistrationId: 'gsr_api_cancel',
        date: '2026-07-03',
        notes: 'Missed session',
      });
      assert.deepEqual(calls[5]?.body, {
        action: 'clear',
        athleteId: 'ath_api_cancel',
        groupSessionRegistrationId: 'gsr_api_cancel',
        date: '2026-07-03',
        notes: 'Corrected attendance',
      });
    } finally {
      apiClient.get = originalGet;
      apiClient.set = originalSet;
      global.fetch = originalFetch;
    }
  });
});
