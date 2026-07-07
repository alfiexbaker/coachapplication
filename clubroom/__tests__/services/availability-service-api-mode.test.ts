import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('availabilityService API mode', () => {
  it('does not use local availability mirrors for delegated coach access', async (t) => {
    const [{ availabilityService }, { apiClient }, { authService }] = await Promise.all([
      import('@/services/availability-service'),
      import('@/services/api-client'),
      import('@/services/auth-service'),
    ]);

    const client = apiClient as unknown as {
      get: typeof apiClient.get;
      set: typeof apiClient.set;
    };
    const auth = authService as unknown as {
      getCurrentUser: typeof authService.getCurrentUser;
    };
    const fetchCalls: Array<{ path: string; method: string }> = [];
    const original = {
      get: client.get,
      set: client.set,
      getCurrentUser: auth.getCurrentUser,
      fetch: globalThis.fetch,
    };

    client.get = async () => {
      throw new Error('local availability storage read should not be used in API mode');
    };
    client.set = async () => {
      throw new Error('local availability storage write should not be used in API mode');
    };
    auth.getCurrentUser = async () =>
      ({
        id: 'signed_in_coach',
        accountType: 'COACH',
      }) as Awaited<ReturnType<typeof authService.getCurrentUser>>;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      fetchCalls.push({ path: url.pathname, method });
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      if (url.pathname === '/v1/coaches/delegated_coach/availability/templates') {
        if (method === 'GET') {
          return new Response(
            JSON.stringify({
              templates: [
                {
                  id: 'tmpl_delegated',
                  coachId: 'delegated_coach',
                  dayOfWeek: 1,
                  startTime: '10:00',
                  endTime: '12:00',
                  isRecurring: true,
                  maxConcurrent: 1,
                  bufferMinutes: 0,
                  location: 'Pitch A',
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response(
          JSON.stringify({
            ...body,
            id: body.id ?? 'tmpl_delegated_saved',
            coachId: 'delegated_coach',
          }),
          { status: method === 'POST' ? 201 : 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.pathname === '/v1/coaches/delegated_coach/availability/templates/tmpl_delegated_saved') {
        return new Response(null, { status: method === 'DELETE' ? 204 : 405 });
      }
      if (url.pathname === '/v1/coaches/delegated_coach/availability/overrides') {
        if (method === 'GET') {
          return new Response(
            JSON.stringify({
              overrides: [
                {
                  id: 'ovr_delegated',
                  coachId: 'delegated_coach',
                  date: '2026-01-01',
                  isBlocked: true,
                  reason: 'Closed',
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response(
          JSON.stringify({
            ...body,
            id: body.id ?? (body.repeatGroupId ? `ovr_${body.date}` : 'ovr_delegated_saved'),
            coachId: 'delegated_coach',
          }),
          { status: method === 'POST' ? 201 : 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.pathname === '/v1/coaches/delegated_coach/availability/overrides/ovr_delegated') {
        return new Response(null, { status: method === 'DELETE' ? 204 : 405 });
      }
      return new Response(JSON.stringify({ message: 'unexpected route' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    t.after(() => {
      client.get = original.get;
      client.set = original.set;
      auth.getCurrentUser = original.getCurrentUser;
      globalThis.fetch = original.fetch;
    });

    assert.deepEqual(await availabilityService.getTemplates('delegated_coach'), [
      {
        id: 'tmpl_delegated',
        coachId: 'delegated_coach',
        dayOfWeek: 1,
        startTime: '10:00',
        endTime: '12:00',
        isRecurring: true,
        maxConcurrent: 1,
        bufferMinutes: 0,
        location: 'Pitch A',
      },
    ]);
    assert.deepEqual(await availabilityService.getOverrides('delegated_coach'), [
      {
        id: 'ovr_delegated',
        coachId: 'delegated_coach',
        date: '2026-01-01',
        isBlocked: true,
        reason: 'Closed',
      },
    ]);
    assert.deepEqual(await availabilityService.checkConflicts('delegated_coach', ['2026-01-01']), {
      bookingCount: 0,
      holdCount: 0,
      bookings: [],
      holds: [],
    });
    await assert.doesNotReject(() =>
      availabilityService.removeLegacyBlockedDate('delegated_coach', '2026-01-01'),
    );

    const savedTemplate = await availabilityService.saveTemplate({
      coachId: 'delegated_coach',
      dayOfWeek: 1,
      startTime: '10:00',
      endTime: '12:00',
      isRecurring: true,
      maxConcurrent: 1,
      bufferMinutes: 0,
      location: 'Pitch A',
    });
    assert.equal(savedTemplate.id, 'tmpl_delegated_saved');

    const savedOverride = await availabilityService.saveOverride({
      coachId: 'delegated_coach',
      date: '2026-01-01',
      isBlocked: true,
      reason: 'Closed',
    });
    assert.equal(savedOverride.id, 'ovr_delegated_saved');

    await availabilityService.deleteTemplate(savedTemplate.id, 'delegated_coach');
    await assert.doesNotReject(() =>
      availabilityService.unblockDate('delegated_coach', '2026-01-01'),
    );

    assert.deepEqual(fetchCalls.map((call) => `${call.method} ${call.path}`), [
      'GET /v1/coaches/delegated_coach/availability/templates',
      'GET /v1/coaches/delegated_coach/availability/overrides',
      'POST /v1/coaches/delegated_coach/availability/templates',
      'POST /v1/coaches/delegated_coach/availability/overrides',
      'DELETE /v1/coaches/delegated_coach/availability/templates/tmpl_delegated_saved',
      'GET /v1/coaches/delegated_coach/availability/overrides',
      'DELETE /v1/coaches/delegated_coach/availability/overrides/ovr_delegated',
    ]);

    const repeatedStartIndex = fetchCalls.length;
    const repeated = await availabilityService.saveRepeatedOverride({
      coachId: 'delegated_coach',
      date: '2026-01-01',
      isBlocked: false,
      customSlots: [
        {
          date: '2026-01-01',
          startTime: '10:00',
          endTime: '11:00',
          location: 'Pitch A',
        },
      ],
      repeatUntil: '2026-01-15',
    });
    assert.deepEqual(
      repeated.map((override) => override.date),
      ['2026-01-01', '2026-01-08', '2026-01-15'],
    );
    assert.deepEqual(
      fetchCalls.slice(repeatedStartIndex).map((call) => `${call.method} ${call.path}`),
      [
        'POST /v1/coaches/delegated_coach/availability/overrides',
        'POST /v1/coaches/delegated_coach/availability/overrides',
        'POST /v1/coaches/delegated_coach/availability/overrides',
      ],
    );
  });
});
