import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('inviteRsvpService API mode', () => {
  it('uses /v1 invite RSVP contracts instead of local response state', async (t) => {
    const [{ inviteRsvpService }, { authService }] = await Promise.all([
      import('@/services/invite/invite-rsvp-service'),
      import('@/services/auth-service'),
    ]);

    const originalGetCurrentUser = authService.getCurrentUser;
    const originalFetch = global.fetch;
    const calls: Array<{ method: string; path: string; search: string; body?: unknown }> = [];

    authService.getCurrentUser = async () =>
      ({
        id: 'parent_invite_api',
        accountType: 'PARENT',
      }) as Awaited<ReturnType<typeof authService.getCurrentUser>>;

    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      const parsedBody = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({
        method,
        path: url.pathname,
        search: url.search,
        body: parsedBody,
      });

      const response = {
        id: 'invite_rsvp_api_1',
        inviteId: 'invite_api_1',
        userId: 'parent_invite_api',
        userName: 'API Parent',
        childId: 'ath_invite_api',
        childName: 'API Athlete',
        status: 'going',
        respondedAt: '2026-01-01T00:00:00.000Z',
      };
      const counts = { going: 1, maybe: 0, cantGo: 0 };

      const json = (payload: unknown, status = 200) =>
        new Response(JSON.stringify(payload), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });

      if (url.pathname === '/v1/invites/invite_api_1/rsvps' && method === 'POST') {
        return json(
          {
            inviteId: 'invite_api_1',
            response,
            responses: [response],
            counts,
            requestId: 'req_invite_rsvp_post',
          },
          201,
        );
      }

      if (url.pathname === '/v1/invites/invite_api_1/rsvps' && method === 'GET') {
        return json({
          inviteId: 'invite_api_1',
          responses: [response],
          counts,
          total: 1,
          requestId: 'req_invite_rsvp_get',
        });
      }

      if (url.pathname === '/v1/invite-rsvps/invite_rsvp_api_1' && method === 'PATCH') {
        return json({
          inviteId: 'invite_api_1',
          response: {
            ...response,
            status: 'maybe',
          },
          responses: [
            {
              ...response,
              status: 'maybe',
            },
          ],
          counts: { going: 0, maybe: 1, cantGo: 0 },
          requestId: 'req_invite_rsvp_patch',
        });
      }

      return json({ message: 'unexpected route' }, 404);
    }) as typeof fetch;

    t.after(() => {
      authService.getCurrentUser = originalGetCurrentUser;
      global.fetch = originalFetch;
    });

    const created = await inviteRsvpService.respondToInvite(
      'invite_api_1',
      'ignored_in_api_mode',
      'API Parent',
      'going',
      'ath_invite_api',
      'API Athlete',
    );
    assert.equal(created.success, true);
    assert.equal(created.success && created.data.id, 'invite_rsvp_api_1');

    const responses = await inviteRsvpService.getResponses('invite_api_1');
    assert.equal(responses.success, true);
    assert.equal(responses.success && responses.data.length, 1);

    const counts = await inviteRsvpService.getCounts('invite_api_1');
    assert.equal(counts.success, true);
    assert.deepEqual(counts.success && counts.data, { going: 1, maybe: 0, cantGo: 0 });

    const going = await inviteRsvpService.getRespondents('invite_api_1', 'going');
    assert.equal(going.success, true);
    assert.equal(going.success && going.data[0]?.status, 'going');

    const updated = await inviteRsvpService.updateResponse('invite_rsvp_api_1', 'maybe');
    assert.equal(updated.success, true);
    assert.equal(updated.success && updated.data.status, 'maybe');

    assert.deepEqual(
      calls.map((call) => `${call.method} ${call.path}${call.search}`),
      [
        'POST /v1/invites/invite_api_1/rsvps',
        'GET /v1/invites/invite_api_1/rsvps',
        'GET /v1/invites/invite_api_1/rsvps',
        'GET /v1/invites/invite_api_1/rsvps?status=going',
        'PATCH /v1/invite-rsvps/invite_rsvp_api_1',
      ],
    );
  });
});
