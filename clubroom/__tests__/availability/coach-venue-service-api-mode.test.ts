import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

const COACH_ID = 'coach_venue_api_test';

describe('coachVenueService API mode', () => {
  it('loads live venues without local storage or default seeding', async (t) => {
    const [{ apiClient }, { coachVenueService }] = await Promise.all([
      import('@/services/api-client'),
      import('@/services/coach-venue-service'),
    ]);
    const client = apiClient as unknown as {
      get: typeof apiClient.get;
      set: typeof apiClient.set;
    };
    const calls: Array<{ path: string; method: string; body: unknown }> = [];
    const originalGet = client.get;
    const originalSet = client.set;
    const originalFetch = globalThis.fetch;
    client.get = async () => {
      throw new Error('coach venues should not read local storage in API mode');
    };
    client.set = async () => {
      throw new Error('coach venues should not write local storage in API mode');
    };
    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input), 'http://localhost');
      calls.push({
        path: url.pathname,
        method: init?.method ?? 'GET',
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      return new Response(
        JSON.stringify({
          venues: [
            {
              id: 'loc_live',
              coachId: COACH_ID,
              label: 'Main Pitch',
              isDefault: false,
              createdAt: '2026-07-01T00:00:00.000Z',
              updatedAt: '2026-07-01T00:00:00.000Z',
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }) as typeof fetch;
    t.after(() => {
      client.get = originalGet;
      client.set = originalSet;
      globalThis.fetch = originalFetch;
    });

    const venues = await coachVenueService.ensureDefaultVenues(COACH_ID);

    assert.deepEqual(
      venues.map((venue) => venue.label),
      ['Main Pitch'],
    );
    assert.deepEqual(calls, [
      {
        path: '/v1/coaches/me/venues',
        method: 'GET',
        body: null,
      },
    ]);
  });

  it('saves and archives through v1 routes in API mode', async (t) => {
    const [{ apiClient }, { coachVenueService }] = await Promise.all([
      import('@/services/api-client'),
      import('@/services/coach-venue-service'),
    ]);
    const client = apiClient as unknown as {
      set: typeof apiClient.set;
    };
    const calls: Array<{ path: string; method: string; body: unknown }> = [];
    const originalSet = client.set;
    const originalFetch = globalThis.fetch;
    client.set = async () => {
      throw new Error('coach venues should not write local storage in API mode');
    };
    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input), 'http://localhost');
      calls.push({
        path: url.pathname,
        method: init?.method ?? 'GET',
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      if ((init?.method ?? 'GET') === 'DELETE') {
        return new Response(null, { status: 204 });
      }
      return new Response(
        JSON.stringify({
          venue: {
            id: url.pathname.endsWith('/loc_existing') ? 'loc_existing' : 'loc_created',
            coachId: COACH_ID,
            label: init?.body ? JSON.parse(String(init.body)).label : 'Venue',
            isDefault: false,
            createdAt: '2026-07-01T00:00:00.000Z',
            updatedAt: '2026-07-01T00:00:00.000Z',
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }) as typeof fetch;
    t.after(() => {
      client.set = originalSet;
      globalThis.fetch = originalFetch;
    });

    const created = await coachVenueService.saveVenue({
      coachId: COACH_ID,
      label: 'New live pitch',
    });
    const updated = await coachVenueService.saveVenue({
      id: 'loc_existing',
      coachId: COACH_ID,
      label: 'Updated live pitch',
    });
    await coachVenueService.deleteVenue('loc_existing');

    assert.equal(created.id, 'loc_created');
    assert.equal(updated.id, 'loc_existing');
    assert.deepEqual(calls, [
      {
        path: '/v1/coaches/me/venues',
        method: 'POST',
        body: { label: 'New live pitch' },
      },
      {
        path: '/v1/coaches/me/venues/loc_existing',
        method: 'PATCH',
        body: { label: 'Updated live pitch' },
      },
      {
        path: '/v1/coaches/me/venues/loc_existing',
        method: 'DELETE',
        body: null,
      },
    ]);
  });
});
