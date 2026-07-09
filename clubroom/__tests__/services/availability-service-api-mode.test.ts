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
          {
            status: method === 'POST' ? 201 : 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
      if (
        url.pathname === '/v1/coaches/delegated_coach/availability/templates/tmpl_delegated_saved'
      ) {
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
          {
            status: method === 'POST' ? 201 : 200,
            headers: { 'Content-Type': 'application/json' },
          },
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

    assert.deepEqual(
      fetchCalls.map((call) => `${call.method} ${call.path}`),
      [
        'GET /v1/coaches/delegated_coach/availability/templates',
        'GET /v1/coaches/delegated_coach/availability/overrides',
        'POST /v1/coaches/delegated_coach/availability/templates',
        'POST /v1/coaches/delegated_coach/availability/overrides',
        'DELETE /v1/coaches/delegated_coach/availability/templates/tmpl_delegated_saved',
        'GET /v1/coaches/delegated_coach/availability/overrides',
        'DELETE /v1/coaches/delegated_coach/availability/overrides/ovr_delegated',
      ],
    );

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

  it('fails closed when delegated availability reads fail in API mode', async (t) => {
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
      if (
        url.pathname === '/v1/coaches/delegated_down/availability/templates' ||
        url.pathname === '/v1/coaches/delegated_down/availability/overrides'
      ) {
        return new Response(
          JSON.stringify({
            code: 'AVAILABILITY_AUTHORITY_DOWN',
            message: 'availability authority down',
          }),
          { status: 503, headers: { 'Content-Type': 'application/json' } },
        );
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

    await assert.rejects(
      () => availabilityService.getTemplates('delegated_down'),
      /availability authority down/,
    );
    await assert.rejects(
      () => availabilityService.getOverrides('delegated_down'),
      /availability authority down/,
    );
    assert.deepEqual(
      fetchCalls.map((call) => `${call.method} ${call.path}`),
      [
        'GET /v1/coaches/delegated_down/availability/templates',
        'GET /v1/coaches/delegated_down/availability/overrides',
      ],
    );
  });

  it('loads coach schedule bookings from V1 booking authority in API mode', async (t) => {
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
    const fetchCalls: string[] = [];
    const original = {
      get: client.get,
      set: client.set,
      getCurrentUser: auth.getCurrentUser,
      fetch: globalThis.fetch,
    };

    client.get = async () => {
      throw new Error('local booking storage should not be read in API mode');
    };
    client.set = async () => {
      throw new Error('local booking storage should not be written in API mode');
    };
    auth.getCurrentUser = async () =>
      ({
        id: 'coach_schedule',
        accountType: 'COACH',
      }) as Awaited<ReturnType<typeof authService.getCurrentUser>>;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      fetchCalls.push(`${init?.method ?? 'GET'} ${url.pathname}${url.search}`);
      if (url.pathname === '/v1/bookings') {
        return new Response(
          JSON.stringify({
            bookings: [
              {
                id: 'booking_schedule_kept',
                coachUserId: 'coach_schedule',
                bookedByUserId: 'parent_schedule',
                recurringSeriesId: null,
                groupSessionId: null,
                status: 'CONFIRMED',
                scheduledAt: '2026-07-10T10:00:00.000Z',
                durationMinutes: 60,
                location: 'Pitch 1',
                serviceType: 'one_to_one',
                sessionTemplateId: null,
                objectives: ['First touch'],
                notes: null,
                priceMinor: 3000,
                currency: 'GBP',
                participants: [
                  {
                    athleteId: 'athlete_schedule',
                    guardianUserId: 'parent_schedule',
                    status: 'confirmed',
                  },
                ],
                version: 1,
                createdAt: '2026-07-08T08:00:00.000Z',
                updatedAt: '2026-07-08T08:00:00.000Z',
                cancelledAt: null,
              },
              {
                id: 'booking_schedule_other_coach',
                coachUserId: 'coach_other',
                bookedByUserId: 'parent_schedule',
                recurringSeriesId: null,
                groupSessionId: null,
                status: 'CONFIRMED',
                scheduledAt: '2026-07-10T11:00:00.000Z',
                durationMinutes: 60,
                location: 'Pitch 2',
                serviceType: 'one_to_one',
                sessionTemplateId: null,
                objectives: [],
                notes: null,
                priceMinor: 3000,
                currency: 'GBP',
                participants: [
                  {
                    athleteId: 'athlete_other',
                    guardianUserId: 'parent_schedule',
                    status: 'confirmed',
                  },
                ],
                version: 1,
                createdAt: '2026-07-08T08:00:00.000Z',
                updatedAt: '2026-07-08T08:00:00.000Z',
                cancelledAt: null,
              },
              {
                id: 'booking_schedule_outside_range',
                coachUserId: 'coach_schedule',
                bookedByUserId: 'parent_schedule',
                recurringSeriesId: null,
                groupSessionId: null,
                status: 'CONFIRMED',
                scheduledAt: '2026-08-10T10:00:00.000Z',
                durationMinutes: 60,
                location: 'Pitch 3',
                serviceType: 'one_to_one',
                sessionTemplateId: null,
                objectives: [],
                notes: null,
                priceMinor: 3000,
                currency: 'GBP',
                participants: [
                  {
                    athleteId: 'athlete_late',
                    guardianUserId: 'parent_schedule',
                    status: 'confirmed',
                  },
                ],
                version: 1,
                createdAt: '2026-07-08T08:00:00.000Z',
                updatedAt: '2026-07-08T08:00:00.000Z',
                cancelledAt: null,
              },
            ],
            total: 3,
            requestId: 'test-bookings',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
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

    const bookings = await availabilityService.getCoachBookings(
      'coach_schedule',
      '2026-07-09',
      '2026-07-12',
    );

    assert.deepEqual(
      bookings.map((booking) => booking.id),
      ['booking_schedule_kept'],
    );
    assert.deepEqual(fetchCalls, ['GET /v1/bookings']);
  });
});
