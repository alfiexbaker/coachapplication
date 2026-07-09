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
    id: 'parent_api_event_rsvp',
    email: 'event.rsvp.parent@example.com',
    accountType: 'PARENT',
    appRole: 'USER',
    firstName: 'Event',
    lastName: 'Parent',
    isVerified: true,
    onboardingComplete: true,
    createdAt: '2026-07-07T12:00:00.000Z',
    updatedAt: '2026-07-07T12:00:00.000Z',
  });
  registerApiAuthService({
    getTokens: async () => ({
      accessToken: 'event-rsvp-api-token',
      refreshToken: 'event-rsvp-refresh-token',
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
    throw new Error('event RSVP local reads should not run in API mode');
  };
  client.set = async () => {
    throw new Error('event RSVP local writes should not run in API mode');
  };
  client.remove = async () => {
    throw new Error('event RSVP local removes should not run in API mode');
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

describe('eventRsvpService API mode', () => {
  it('surfaces /v1 RSVP read failures instead of empty RSVP state', async () => {
    const restoreUser = await setupApiModeUser();
    const restoreStorage = await trapGenericStorage();
    const { eventRsvpService } = await import('@/services/event/event-rsvp-service');
    const calls: Array<{ method: string; path: string }> = [];
    const userId = 'parent_api_event_rsvp';

    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      calls.push({ method, path: url.pathname });

      if (url.pathname === `/v1/events/event_empty/rsvps/${userId}` && method === 'GET') {
        return jsonResponse({ rsvp: null });
      }
      return jsonResponse({ message: 'event RSVPs down' }, 503);
    }) as typeof fetch;

    try {
      await assert.rejects(
        () => eventRsvpService.getEventAttendees('event_api_rsvp'),
        /event RSVPs down/i,
      );
      await assert.rejects(
        () => eventRsvpService.getEventRSVPs('event_api_rsvp'),
        /event RSVPs down/i,
      );
      await assert.rejects(
        () => eventRsvpService.getUserEventRSVP('event_api_rsvp', userId),
        /event RSVPs down/i,
      );
      assert.equal(await eventRsvpService.getUserEventRSVP('event_empty', userId), null);
    } finally {
      restoreStorage();
      restoreUser();
    }

    assert.deepEqual(calls, [
      { method: 'GET', path: '/v1/events/event_api_rsvp/rsvps' },
      { method: 'GET', path: '/v1/events/event_api_rsvp/rsvps' },
      { method: 'GET', path: `/v1/events/event_api_rsvp/rsvps/${userId}` },
      { method: 'GET', path: `/v1/events/event_empty/rsvps/${userId}` },
    ]);
  });

  it('uses /v1 RSVP authority and keeps unsupported update-by-id fail-closed', async () => {
    const restoreUser = await setupApiModeUser();
    const restoreStorage = await trapGenericStorage();
    const { eventRsvpService } = await import('@/services/event/event-rsvp-service');
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];
    const eventId = 'event_api_rsvp';
    const userId = 'parent_api_event_rsvp';
    const apiRsvp = {
      id: 'rsvp_api_1',
      clubEventId: eventId,
      userId,
      status: 'GOING' as const,
      guestCount: 1,
      notes: 'API note',
      respondedAt: '2026-07-07T12:10:00.000Z',
      updatedAt: '2026-07-07T12:10:00.000Z',
    };

    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ method, path: `${url.pathname}${url.search}`, body });

      if (url.pathname === `/v1/events/${eventId}/rsvp` && method === 'POST') {
        return jsonResponse({
          rsvp: {
            ...apiRsvp,
            status: body.status,
            guestCount: body.guestCount,
            notes: body.notes ?? apiRsvp.notes,
          },
        });
      }
      if (url.pathname === `/v1/events/${eventId}/rsvps` && method === 'GET') {
        return jsonResponse({ rsvps: [apiRsvp] });
      }
      if (url.pathname === `/v1/events/${eventId}/rsvps/${userId}` && method === 'GET') {
        return jsonResponse({ rsvp: apiRsvp });
      }
      if (url.pathname === `/v1/events/${eventId}/rsvps/remind` && method === 'POST') {
        return jsonResponse({ reminderCount: 3 });
      }
      return jsonResponse({ message: `Unhandled ${method} ${url.pathname}` }, 500);
    }) as typeof fetch;

    try {
      const simple = await eventRsvpService.rsvp(
        eventId,
        userId,
        'Event Parent',
        'PARENT',
        'GOING',
        1,
      );
      assert.equal(simple.success, true);
      assert.equal(simple.success && simple.data.status, 'GOING');

      const saved = await eventRsvpService.submitRSVP({
        eventId,
        userId,
        userRole: 'PARENT',
        status: 'MAYBE',
        guestCount: 2,
        note: 'Maybe one guest',
      });
      assert.equal(saved.id, apiRsvp.id);
      assert.equal(saved.status, 'MAYBE');
      assert.equal(saved.guestCount, 2);

      const attendees = await eventRsvpService.getEventAttendees(eventId);
      assert.deepEqual(attendees.map((attendee) => [attendee.userId, attendee.status]), [
        [userId, 'GOING'],
      ]);

      const rsvps = await eventRsvpService.getEventRSVPs(eventId);
      assert.deepEqual(rsvps.map((rsvp) => rsvp.id), [apiRsvp.id]);

      const userRsvp = await eventRsvpService.getUserEventRSVP(eventId, userId);
      assert.equal(userRsvp?.id, apiRsvp.id);

      const reminder = await eventRsvpService.sendReminderToMaybes(eventId);
      assert.equal(reminder.success, true);
      assert.equal(reminder.success && reminder.data, 3);

      const unsupported = await eventRsvpService.updateRSVP(apiRsvp.id, 'NOT_GOING', 0);
      assert.equal(unsupported.success, false);
      if (!unsupported.success) {
        assert.equal(unsupported.error.code, 'UNSUPPORTED');
        assert.match(unsupported.error.message, /Updating event RSVPs/i);
      }
    } finally {
      restoreStorage();
      restoreUser();
    }

    assert.deepEqual(
      calls.map((call) => `${call.method} ${call.path}`),
      [
        'POST /v1/events/event_api_rsvp/rsvp',
        'POST /v1/events/event_api_rsvp/rsvp',
        'GET /v1/events/event_api_rsvp/rsvps',
        'GET /v1/events/event_api_rsvp/rsvps',
        'GET /v1/events/event_api_rsvp/rsvps/parent_api_event_rsvp',
        'POST /v1/events/event_api_rsvp/rsvps/remind',
      ],
    );
    assert.deepEqual(calls[0]?.body, {
      status: 'GOING',
      guestCount: 1,
    });
    assert.deepEqual(calls[1]?.body, {
      status: 'MAYBE',
      guestCount: 2,
      notes: 'Maybe one guest',
    });
  });
});
