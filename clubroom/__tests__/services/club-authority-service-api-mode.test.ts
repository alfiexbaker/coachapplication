import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('clubAuthorityService API mode', () => {
  it('loads individual club detail through /v1/clubs/:clubId', async (t) => {
    const [{ clubAuthorityService }, { authService }] = await Promise.all([
      import('@/services/club-authority-service'),
      import('@/services/auth-service'),
    ]);
    const originalFetch = global.fetch;
    const originalGetCurrentUser = authService.getCurrentUser;
    const calls: string[] = [];

    authService.getCurrentUser = async () => ({
      id: 'usr_club_admin_api',
      email: 'club.admin@example.test',
      accountType: 'COACH',
      roles: ['club_admin'],
      firstName: 'Club',
      lastName: 'Admin',
      isVerified: true,
      onboardingComplete: true,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    });
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      calls.push(`${method} ${url.pathname}`);

      if (url.pathname === '/v1/clubs/club_detail_api' && method === 'GET') {
        assert.equal((init?.headers as Record<string, string> | undefined)?.['x-acting-role'], 'club_admin');
        return new Response(
          JSON.stringify({
            club: {
              id: 'club_detail_api',
              name: 'Detail API FC',
              city: 'London',
              country: 'GB',
              tagline: 'API detail authority',
              visibility: 'private',
              joinPolicy: 'INVITE_ONLY',
              commercialMode: 'ORG_OWNED',
              inviteCode: 'DETAIL123',
              memberCount: 12,
              coachCount: 4,
              viewerMembership: {
                id: 'mem_detail_api',
                clubId: 'club_detail_api',
                userId: 'usr_club_admin_api',
                role: 'ADMIN',
                active: true,
                createdAt: '2026-07-01T00:00:00.000Z',
                updatedAt: '2026-07-01T00:00:00.000Z',
              },
              squads: [{ id: 'squad_detail_api' }],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(JSON.stringify({ message: `unexpected ${url.pathname}` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    t.after(() => {
      authService.getCurrentUser = originalGetCurrentUser;
      global.fetch = originalFetch;
    });

    const result = await clubAuthorityService.getClubById('club_detail_api');

    assert.equal(result.success, true);
    assert.equal(result.success && result.data.name, 'Detail API FC');
    assert.equal(result.success && result.data.commercialMode, 'ORG_OWNED');
    assert.deepEqual(calls, ['GET /v1/clubs/club_detail_api']);
  });

  it('preserves the viewer membership after a minimized club update response', async (t) => {
    const [{ clubAuthorityService }, { authService }, { socialFeedService }] = await Promise.all([
      import('@/services/club-authority-service'),
      import('@/services/auth-service'),
      import('@/services/social-feed-service'),
    ]);
    const originalFetch = global.fetch;
    const originalGetCurrentUser = authService.getCurrentUser;
    const userId = 'usr_club_update_api';
    const clubId = 'club_update_api';
    const membership = {
      clubId,
      userId,
      role: 'ADMIN' as const,
      status: 'active' as const,
      joinSource: 'invite' as const,
      canPostAsClub: true,
      canCreateSessions: true,
    };

    await socialFeedService.syncAuthorityClubs([
      {
        id: clubId,
        name: 'Update API FC',
        city: 'Leeds',
        memberCount: 8,
        coachCount: 3,
        squadCount: 2,
        ownerId: 'usr_club_owner_api',
        inviteCode: 'UPDATE123',
        memberships: [membership],
      },
    ]);
    authService.getCurrentUser = async () => ({
      id: userId,
      email: 'club.update@example.test',
      accountType: 'COACH',
      roles: ['club_admin'],
      firstName: 'Club',
      lastName: 'Updater',
      isVerified: true,
      onboardingComplete: true,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    });
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      assert.equal(`${method} ${url.pathname}`, `PATCH /v1/clubs/${clubId}`);
      assert.deepEqual(JSON.parse(String(init?.body)), { tagline: 'Updated by API' });
      return new Response(
        JSON.stringify({
          club: {
            id: clubId,
            name: 'Update API FC',
            city: 'Leeds',
            tagline: 'Updated by API',
            visibility: 'private',
            joinPolicy: 'INVITE_ONLY',
            commercialMode: 'ORG_OWNED',
            inviteCode: 'UPDATE123',
            memberCount: 8,
            coachCount: 3,
            viewerMembership: {
              id: 'mem_update_api',
              clubId,
              userId,
              role: 'ADMIN',
              active: true,
              createdAt: '2026-07-01T00:00:00.000Z',
              updatedAt: '2026-08-01T00:00:00.000Z',
            },
            squads: [{ id: 'squad_update_api' }],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    t.after(() => {
      authService.getCurrentUser = originalGetCurrentUser;
      global.fetch = originalFetch;
    });

    const result = await clubAuthorityService.updateClubDetails(clubId, {
      tagline: 'Updated by API',
    });

    assert.equal(result.success, true);
    assert.equal(result.success && result.data.memberCount, 8);
    assert.equal(socialFeedService.getMembership(userId, clubId)?.role, 'ADMIN');
  });

  it('surfaces individual club detail authority failures', async (t) => {
    const [{ clubAuthorityService }, { authService }] = await Promise.all([
      import('@/services/club-authority-service'),
      import('@/services/auth-service'),
    ]);
    const originalFetch = global.fetch;
    const originalGetCurrentUser = authService.getCurrentUser;
    const calls: string[] = [];

    authService.getCurrentUser = async () => ({
      id: 'usr_club_admin_api',
      email: 'club.admin@example.test',
      accountType: 'COACH',
      roles: ['club_admin'],
      firstName: 'Club',
      lastName: 'Admin',
      isVerified: true,
      onboardingComplete: true,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    });
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      calls.push(`${method} ${url.pathname}`);

      if (url.pathname === '/v1/clubs/club_down_api' && method === 'GET') {
        return new Response(JSON.stringify({ message: 'club detail API down' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ message: `unexpected ${url.pathname}` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    t.after(() => {
      authService.getCurrentUser = originalGetCurrentUser;
      global.fetch = originalFetch;
    });

    const result = await clubAuthorityService.getClubById('club_down_api');

    assert.equal(result.success, false);
    assert.match(result.success ? '' : result.error.message, /club detail API down/);
    assert.deepEqual(calls, ['GET /v1/clubs/club_down_api']);
  });
});
