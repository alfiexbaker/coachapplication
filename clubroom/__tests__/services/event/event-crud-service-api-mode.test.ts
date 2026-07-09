import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function setupApiModeUser() {
  const [{ authService }, { registerApiAuthService }, { ok }] = await Promise.all([
    import('@/services/auth-service'),
    import('@/services/auth-service-registry'),
    import('@/types/result'),
  ]);
  const originalGetCurrentUser = authService.getCurrentUser;

  authService.getCurrentUser = async () => ({
    id: 'club_admin_api_events',
    email: 'events.admin@example.com',
    accountType: 'COACH',
    appRole: 'USER',
    roles: ['club_admin'],
    firstName: 'Events',
    lastName: 'Admin',
    isVerified: true,
    onboardingComplete: true,
    createdAt: '2026-07-07T12:00:00.000Z',
    updatedAt: '2026-07-07T12:00:00.000Z',
  });
  registerApiAuthService({
    getTokens: async () => ({
      accessToken: 'event-api-token',
      refreshToken: 'event-refresh-token',
      expiresAt: Date.now() + 3_600_000,
    }),
    refreshToken: async () => ok(undefined),
    logout: async () => {},
  });

  return () => {
    authService.getCurrentUser = originalGetCurrentUser;
  };
}

async function trapGenericStorage() {
  const { apiClient } = await import('@/services/api-client');
  const client = apiClient as unknown as {
    get: typeof apiClient.get;
    set: typeof apiClient.set;
    remove: typeof apiClient.remove;
  };
  const original = {
    get: client.get,
    set: client.set,
    remove: client.remove,
  };

  client.get = async () => {
    throw new Error('club event local reads should not run in API mode');
  };
  client.set = async () => {
    throw new Error('club event local writes should not run in API mode');
  };
  client.remove = async () => {
    throw new Error('club event local removes should not run in API mode');
  };

  return () => {
    client.get = original.get;
    client.set = original.set;
    client.remove = original.remove;
  };
}

afterEach(async () => {
  globalThis.fetch = originalFetch;
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.clear();
});

describe('eventCrudService API mode', () => {
  it('surfaces /v1 read failures instead of empty event state', async () => {
    const restoreUser = await setupApiModeUser();
    const restoreStorage = await trapGenericStorage();
    const { eventCrudService } = await import('@/services/event/event-crud-service');
    const calls: Array<{ method: string; path: string }> = [];

    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      calls.push({ method, path: url.pathname });

      if (url.pathname === '/v1/events/event_missing' && method === 'GET') {
        return jsonResponse({ message: 'event missing' }, 404);
      }
      return jsonResponse({ message: 'events down' }, 503);
    }) as typeof fetch;

    try {
      await assert.rejects(() => eventCrudService.getAllClubEvents('club_api_1'), /events down/i);
      await assert.rejects(() => eventCrudService.getUpcomingEvents('club_api_1'), /events down/i);
      await assert.rejects(() => eventCrudService.getEvent('event_api_1'), /events down/i);
      assert.equal(await eventCrudService.getEvent('event_missing'), null);
    } finally {
      restoreStorage();
      restoreUser();
    }

    assert.deepEqual(calls, [
      { method: 'GET', path: '/v1/clubs/club_api_1/events' },
      { method: 'GET', path: '/v1/clubs/club_api_1/events' },
      { method: 'GET', path: '/v1/events/event_api_1' },
      { method: 'GET', path: '/v1/events/event_missing' },
    ]);
  });

  it('uses /v1 event authority for CRUD and invite fan-out without local storage', async () => {
    const restoreUser = await setupApiModeUser();
    const restoreStorage = await trapGenericStorage();
    const { eventCrudService } = await import('@/services/event/event-crud-service');
    const calls: Array<{
      method: string;
      path: string;
      body?: unknown;
      headers?: RequestInit['headers'];
    }> = [];
    const event = {
      id: 'event_api_1',
      clubId: 'club_api_1',
      createdBy: 'club_admin_api_events',
      title: 'API Season Awards',
      description: 'Backend-owned event',
      eventType: 'PRESENTATION' as const,
      date: '2026-08-20',
      startTime: '18:00',
      endTime: '20:00',
      venue: 'Clubhouse',
      address: '1 Club Way',
      isVirtual: false,
      targetAudience: 'ALL' as const,
      price: 0,
      currency: 'GBP',
      rsvpRequired: true,
      attendees: [],
      status: 'DRAFT' as const,
      createdAt: '2026-07-07T12:05:00.000Z',
    };

    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ method, path: `${url.pathname}${url.search}`, body, headers: init?.headers });

      if (url.pathname === '/v1/clubs/club_api_1/events' && method === 'POST') {
        return jsonResponse({ event });
      }
      if (url.pathname === '/v1/clubs/club_api_1/events' && method === 'GET') {
        return jsonResponse({ events: [{ ...event, status: 'PUBLISHED' }], total: 1 });
      }
      if (url.pathname === '/v1/events/event_api_1' && method === 'GET') {
        return jsonResponse({ event: { ...event, status: 'PUBLISHED' } });
      }
      if (url.pathname === '/v1/events/event_api_1' && method === 'PATCH') {
        return jsonResponse({ event: { ...event, status: body.status } });
      }
      if (url.pathname === '/v1/events/event_api_1/invites/club' && method === 'POST') {
        return jsonResponse({ eventId: event.id, inviteCount: 12 });
      }
      if (url.pathname === '/v1/events/event_api_1/invites/squads' && method === 'POST') {
        return jsonResponse({
          eventId: event.id,
          squadIds: body.squadIds,
          inviteCount: 8,
          targetAthleteCount: 8,
        });
      }
      if (url.pathname === '/v1/events/event_api_1/invites/athletes' && method === 'POST') {
        return jsonResponse({
          eventId: event.id,
          athleteIds: body.athleteIds,
          inviteCount: 2,
          targetAthleteCount: 2,
        });
      }
      return jsonResponse({ message: `Unhandled ${method} ${url.pathname}` }, 500);
    }) as typeof fetch;

    try {
      const created = await eventCrudService.createEvent({
        clubId: 'club_api_1',
        clubName: 'API Club',
        createdBy: 'club_admin_api_events',
        createdByName: 'Events Admin',
        title: event.title,
        description: event.description,
        eventType: event.eventType,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        venue: event.venue,
        address: event.address,
        targetAudience: event.targetAudience,
        price: 0,
        currency: 'GBP',
        rsvpRequired: true,
      });
      assert.equal(created.id, event.id);

      const allEvents = await eventCrudService.getAllClubEvents('club_api_1');
      assert.deepEqual(allEvents.map((item) => item.id), [event.id]);

      const upcoming = await eventCrudService.getUpcomingEvents('club_api_1');
      assert.deepEqual(upcoming.map((item) => item.id), [event.id]);

      const detail = await eventCrudService.getEvent(event.id);
      assert.equal(detail?.id, event.id);

      const published = await eventCrudService.publishEvent(event.id);
      assert.equal(published.success, true);
      assert.equal(published.success && published.data.status, 'PUBLISHED');

      await eventCrudService.inviteClub(event.id);
      const squadInvite = await eventCrudService.inviteSquads(event.id, ['squad_api_1'], {
        excludeAthleteIds: ['ath_skip_1'],
      });
      assert.equal(squadInvite?.inviteCount, 8);
      const athleteInvite = await eventCrudService.inviteAthletes(event.id, ['ath_api_1']);
      assert.equal(athleteInvite?.inviteCount, 2);

      const cancelled = await eventCrudService.cancelEvent(event.id);
      assert.equal(cancelled.success, true);
      assert.equal(cancelled.success && cancelled.data.status, 'CANCELLED');
    } finally {
      restoreStorage();
      restoreUser();
    }

    assert.deepEqual(
      calls.map((call) => `${call.method} ${call.path}`),
      [
        'POST /v1/clubs/club_api_1/events',
        'GET /v1/clubs/club_api_1/events',
        'GET /v1/clubs/club_api_1/events',
        'GET /v1/events/event_api_1',
        'PATCH /v1/events/event_api_1',
        'POST /v1/events/event_api_1/invites/club',
        'POST /v1/events/event_api_1/invites/squads',
        'POST /v1/events/event_api_1/invites/athletes',
        'PATCH /v1/events/event_api_1',
      ],
    );
    const createBody = calls[0]?.body as { title?: string };
    assert.equal(createBody.title, event.title);
    assert.equal((calls[0]?.headers as Record<string, string>)['x-acting-role'], 'club_admin');
    assert.equal(
      (calls[0]?.headers as Record<string, string>).Authorization,
      'Bearer event-api-token',
    );
    assert.deepEqual(calls[6]?.body, {
      squadIds: ['squad_api_1'],
      excludeAthleteIds: ['ath_skip_1'],
    });
    assert.deepEqual(calls[7]?.body, { athleteIds: ['ath_api_1'] });
  });
});
