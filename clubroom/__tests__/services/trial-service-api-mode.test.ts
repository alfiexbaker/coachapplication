import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('trialService API mode', () => {
  it('uses v1 trial routes without local trial storage', async (t) => {
    const [{ trialService }, { apiClient }] = await Promise.all([
      import('@/services/trial-service'),
      import('@/services/api-client'),
    ]);

    const client = apiClient as unknown as {
      get: typeof apiClient.get;
      set: typeof apiClient.set;
    };
    const fetchCalls: Array<{ path: string; method: string; search: string }> = [];
    const original = {
      get: client.get,
      set: client.set,
      fetch: globalThis.fetch,
    };

    client.get = async () => {
      throw new Error('local trial storage read should not be used in API mode');
    };
    client.set = async () => {
      throw new Error('local trial storage write should not be used in API mode');
    };
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      fetchCalls.push({ path: url.pathname, method, search: url.search });

      if (url.pathname === '/v1/coaches/coach_live/trial-offering') {
        if (method === 'GET' || method === 'PUT') {
          return new Response(
            JSON.stringify({
              offering: {
                id: 'trial_live',
                coachId: 'coach_live',
                enabled: true,
                trialPrice: 10,
                normalPrice: 50,
                durationMinutes: 60,
                limitPerFamily: 1,
                description: body.description ?? 'Live trial',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        if (method === 'DELETE') {
          return new Response(null, { status: 204 });
        }
      }

      if (url.pathname === '/v1/trial-offerings') {
        return new Response(
          JSON.stringify({
            offerings: [
              {
                id: 'trial_live',
                coachId: 'coach_live',
                enabled: true,
                trialPrice: 10,
                normalPrice: 50,
                durationMinutes: 60,
                limitPerFamily: 1,
                description: 'Live trial',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.pathname === '/v1/coaches/coach_live/trial-usages') {
        const usage = {
          id: 'tu_live',
          coachId: 'coach_live',
          parentId: body.parentId ?? url.searchParams.get('parentId') ?? 'parent_live',
          familyId: body.familyId ?? 'family_live',
          bookingId: body.bookingId ?? 'booking_live',
          usedAt: '2026-01-02T00:00:00.000Z',
        };
        if (method === 'POST') {
          return new Response(JSON.stringify({ usage, replay: false }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ usages: [usage], total: 1 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname === '/v1/coaches/coach_live/trial-conversions') {
        const conversion = {
          id: 'tc_live',
          coachId: 'coach_live',
          parentId: body.parentId ?? 'parent_live',
          trialBookingId:
            body.trialBookingId ?? url.searchParams.get('trialBookingId') ?? 'trial_booking_live',
          regularBookingId: body.regularBookingId ?? 'regular_booking_live',
          convertedAt: '2026-01-03T00:00:00.000Z',
        };
        if (method === 'POST') {
          return new Response(JSON.stringify({ conversion, replay: false }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ conversions: [conversion], total: 1 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ message: 'unexpected route' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    t.after(() => {
      client.get = original.get;
      client.set = original.set;
      globalThis.fetch = original.fetch;
    });

    assert.equal((await trialService.getTrialOffering('coach_live'))?.id, 'trial_live');
    assert.equal((await trialService.getActiveTrialOfferings()).length, 1);
    assert.equal(await trialService.getTrialUsageCount('coach_live', 'parent_live'), 1);
    assert.equal(await trialService.isTrialEligible('coach_live', 'parent_live'), false);
    assert.equal((await trialService.getCoachTrialUsages('coach_live'))[0]?.id, 'tu_live');
    assert.equal((await trialService.getCoachConversions('coach_live'))[0]?.id, 'tc_live');
    assert.equal(await trialService.isTrialConverted('trial_booking_live', 'coach_live'), true);
    await assert.rejects(
      () => trialService.isTrialConverted('trial_booking_live'),
      /coachId is required/,
    );

    assert.equal(
      (
        await trialService.upsertTrialOffering('coach_live', {
          enabled: true,
          trialPrice: 10,
          normalPrice: 50,
          durationMinutes: 60,
          limitPerFamily: 1,
          description: 'Live trial',
        })
      ).id,
      'trial_live',
    );
    await assert.doesNotReject(() => trialService.deleteTrialOffering('coach_live'));
    assert.equal(
      (await trialService.recordTrialUsage('coach_live', 'parent_live', 'booking_live')).id,
      'tu_live',
    );
    assert.equal(
      (
        await trialService.recordConversion(
          'coach_live',
          'parent_live',
          'trial_booking_live',
          'regular_booking_live',
        )
      ).id,
      'tc_live',
    );
    assert.deepEqual(fetchCalls.map((call) => `${call.method} ${call.path}${call.search}`), [
      'GET /v1/coaches/coach_live/trial-offering',
      'GET /v1/trial-offerings',
      'GET /v1/coaches/coach_live/trial-usages?parentId=parent_live',
      'GET /v1/coaches/coach_live/trial-offering',
      'GET /v1/coaches/coach_live/trial-usages?parentId=parent_live',
      'GET /v1/coaches/coach_live/trial-usages',
      'GET /v1/coaches/coach_live/trial-conversions',
      'GET /v1/coaches/coach_live/trial-conversions?trialBookingId=trial_booking_live',
      'PUT /v1/coaches/coach_live/trial-offering',
      'DELETE /v1/coaches/coach_live/trial-offering',
      'POST /v1/coaches/coach_live/trial-usages',
      'POST /v1/coaches/coach_live/trial-conversions',
    ]);
  });
});
