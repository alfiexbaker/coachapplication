import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import type { Match } from '@/constants/types';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match_api_1',
    clubId: 'club_api_1',
    squadId: 'squad_api_1',
    coachId: 'coach_api_1',
    title: 'U12 League Fixture',
    matchType: 'LEAGUE',
    opponent: 'Riverside FC',
    isHome: true,
    date: '2026-07-30',
    kickoffTime: '10:30',
    meetTime: '09:45',
    venue: 'Main Pitch',
    address: '1 Match Way',
    maxPlayers: 14,
    selectedPlayers: [
      {
        athleteId: 'athlete_api_1',
        parentId: 'parent_api_1',
        status: 'INVITED',
      },
    ],
    status: 'SCHEDULED',
    createdAt: '2026-07-01T10:00:00.000Z',
    notes: 'Bring boots.',
    ...overrides,
  };
}

describe('matchService API mode', () => {
  it('does not initialize match fixtures as API-mode cache', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'services/match-service.ts'), 'utf8');

    assert.doesNotMatch(source, /let matchesCache:[^=]+=\s*\[\.\.\.MOCK_MATCHES\];/);
    assert.ok(source.includes('USE_MOCK ? [...MOCK_MATCHES] : []'));
  });

  it('uses /v1 match routes instead of local MATCHES storage', async (t) => {
    const [{ matchService }, { apiClient }, { authService }] = await Promise.all([
      import('@/services/match-service'),
      import('@/services/api-client'),
      import('@/services/auth-service'),
    ]);

    const client = apiClient as unknown as {
      get: typeof apiClient.get;
      set: typeof apiClient.set;
      remove: typeof apiClient.remove;
    };
    const auth = authService as unknown as {
      getCurrentUser: typeof authService.getCurrentUser;
      getTokens: typeof authService.getTokens;
    };
    const original = {
      fetch: globalThis.fetch,
      get: client.get,
      set: client.set,
      remove: client.remove,
      getCurrentUser: auth.getCurrentUser,
      getTokens: auth.getTokens,
    };
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];

    client.get = async () => {
      throw new Error('local match reads should not run in API mode');
    };
    client.set = async () => {
      throw new Error('local match writes should not run in API mode');
    };
    client.remove = async () => {
      throw new Error('local match deletes should not run in API mode');
    };
    auth.getCurrentUser = async () => ({
      id: 'coach_api_1',
      email: 'coach@example.test',
      accountType: 'COACH',
      firstName: 'API',
      lastName: 'Coach',
      isVerified: true,
      onboardingComplete: true,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    });
    auth.getTokens = async () => null;
    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ method, path: url.pathname, body });

      if (url.pathname === '/v1/clubs/club_api_1/matches' && method === 'GET') {
        return jsonResponse({
          clubId: 'club_api_1',
          matches: [makeMatch()],
          total: 1,
          requestId: 'req_matches_list',
        });
      }

      if (url.pathname === '/v1/matches/match_api_1' && method === 'GET') {
        return jsonResponse({
          match: makeMatch(),
          requestId: 'req_match_detail',
        });
      }

      if (url.pathname === '/v1/me/matches' && method === 'GET') {
        return jsonResponse({
          matches: [makeMatch()],
          total: 1,
          requestId: 'req_parent_matches',
        });
      }

      if (url.pathname === '/v1/clubs/club_api_1/matches' && method === 'POST') {
        return jsonResponse(
          {
            match: makeMatch({
              id: 'match_api_created',
              title: (body as { title?: string }).title ?? 'Created Fixture',
              selectedPlayers: [],
            }),
            requestId: 'req_match_create',
          },
          201,
        );
      }

      if (url.pathname === '/v1/matches/match_api_1/players/invite' && method === 'POST') {
        return jsonResponse({
          match: makeMatch({
            selectedPlayers: [
              {
                athleteId: 'athlete_api_2',
                parentId: 'parent_api_2',
                status: 'INVITED',
              },
            ],
          }),
          requestId: 'req_match_invite',
        });
      }

      if (url.pathname === '/v1/matches/match_api_1/players/respond' && method === 'POST') {
        return jsonResponse({
          match: makeMatch({
            selectedPlayers: [
              {
                athleteId: 'athlete_api_1',
                parentId: 'parent_api_1',
                status: (body as { status?: 'AVAILABLE' | 'UNAVAILABLE' }).status ?? 'AVAILABLE',
                responseAt: '2026-07-02T10:00:00.000Z',
              },
            ],
          }),
          requestId: 'req_match_respond',
        });
      }

      if (url.pathname === '/v1/matches/match_api_1/lineup' && method === 'PATCH') {
        return jsonResponse({
          match: makeMatch({
            status: 'LINEUP_SET',
            selectedPlayers: [
              {
                athleteId: 'athlete_api_1',
                parentId: 'parent_api_1',
                status: 'SELECTED',
                position: 'Forward',
                jerseyNumber: 9,
              },
            ],
          }),
          requestId: 'req_match_lineup',
        });
      }

      if (url.pathname === '/v1/matches/match_api_1/result' && method === 'PATCH') {
        return jsonResponse({
          match: makeMatch({
            status: 'COMPLETED',
            result: (body as { result?: { home: number; away: number } }).result,
          }),
          requestId: 'req_match_result',
        });
      }

      if (url.pathname === '/v1/matches/match_api_1/status' && method === 'PATCH') {
        return jsonResponse({
          match: makeMatch({
            status: (body as { status?: Match['status'] }).status ?? 'CANCELLED',
          }),
          requestId: 'req_match_status',
        });
      }

      return jsonResponse({ message: `Unhandled ${method} ${url.pathname}` }, 500);
    }) as typeof fetch;

    t.after(() => {
      globalThis.fetch = original.fetch;
      client.get = original.get;
      client.set = original.set;
      client.remove = original.remove;
      auth.getCurrentUser = original.getCurrentUser;
      auth.getTokens = original.getTokens;
    });

    assert.equal((await matchService.getClubMatches('club_api_1')).length, 1);
    assert.equal((await matchService.getMatch('match_api_1'))?.id, 'match_api_1');
    assert.equal(
      (
        await matchService.createMatch({
          clubId: 'club_api_1',
          clubName: 'Club API',
          squadId: 'squad_api_1',
          squadName: 'U12',
          coachId: 'coach_api_1',
          coachName: 'API Coach',
          title: 'Created Fixture',
          matchType: 'CUP',
          opponent: 'Cup FC',
          isHome: false,
          date: '2026-08-01',
          kickoffTime: '12:00',
          venue: 'Away Pitch',
          maxPlayers: 12,
          notes: 'Cup game.',
        })
      ).id,
      'match_api_created',
    );
    assert.equal(
      (
        await matchService.invitePlayers({
          matchId: 'match_api_1',
          players: [
            {
              athleteId: 'athlete_api_2',
              athleteName: 'Athlete API',
              parentId: 'parent_api_2',
              parentName: 'Parent API',
            },
          ],
        })
      ).success,
      true,
    );
    assert.equal(
      (
        await matchService.respondToMatch({
          matchId: 'match_api_1',
          athleteId: 'athlete_api_1',
          parentId: 'parent_api_1',
          status: 'AVAILABLE',
          note: 'Available.',
        })
      ).success,
      true,
    );
    assert.equal(
      (
        await matchService.setLineup({
          matchId: 'match_api_1',
          lineup: [{ athleteId: 'athlete_api_1', position: 'Forward', jerseyNumber: 9 }],
        })
      ).success,
      true,
    );
    assert.equal(
      (await matchService.recordResult('match_api_1', { home: 2, away: 1 })).success,
      true,
    );
    assert.equal((await matchService.cancelMatch('match_api_1')).success, true);
    auth.getCurrentUser = async () => ({
      id: 'parent_api_1',
      email: 'parent@example.test',
      accountType: 'PARENT',
      firstName: 'API',
      lastName: 'Parent',
      isVerified: true,
      onboardingComplete: true,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    });
    const parentMatches = await matchService.getMatchesForParent('parent_api_1');
    assert.equal(parentMatches.length, 1);
    assert.equal(parentMatches[0]?.id, 'match_api_1');

    assert.deepEqual(
      calls.map((call) => `${call.method} ${call.path}`),
      [
        'GET /v1/clubs/club_api_1/matches',
        'GET /v1/matches/match_api_1',
        'POST /v1/clubs/club_api_1/matches',
        'POST /v1/matches/match_api_1/players/invite',
        'POST /v1/matches/match_api_1/players/respond',
        'PATCH /v1/matches/match_api_1/lineup',
        'PATCH /v1/matches/match_api_1/result',
        'PATCH /v1/matches/match_api_1/status',
        'GET /v1/me/matches',
      ],
    );
    assert.deepEqual(calls[2]?.body, {
      squadId: 'squad_api_1',
      title: 'Created Fixture',
      matchType: 'CUP',
      opponent: 'Cup FC',
      isHome: false,
      date: '2026-08-01',
      kickoffTime: '12:00',
      venue: 'Away Pitch',
      maxPlayers: 12,
      notes: 'Cup game.',
    });
    assert.deepEqual(calls[6]?.body, { result: { home: 2, away: 1 } });
    assert.deepEqual(calls[7]?.body, { status: 'CANCELLED' });
  });

  it('preserves match-detail not found but fails closed on API errors', async (t) => {
    const [{ matchService }, { authService }] = await Promise.all([
      import('@/services/match-service'),
      import('@/services/auth-service'),
    ]);

    const auth = authService as unknown as {
      getCurrentUser: typeof authService.getCurrentUser;
      getTokens: typeof authService.getTokens;
    };
    const original = {
      fetch: globalThis.fetch,
      getCurrentUser: auth.getCurrentUser,
      getTokens: auth.getTokens,
    };
    const calls: string[] = [];

    auth.getCurrentUser = async () => ({
      id: 'coach_api_1',
      email: 'coach@example.test',
      accountType: 'COACH',
      firstName: 'API',
      lastName: 'Coach',
      isVerified: true,
      onboardingComplete: true,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    });
    auth.getTokens = async () => null;
    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      calls.push(`${init?.method ?? 'GET'} ${url.pathname}`);

      if (url.pathname === '/v1/matches/missing_match') {
        return jsonResponse({ code: 'NOT_FOUND', message: 'Match not found.' }, 404);
      }

      if (url.pathname === '/v1/matches/api_down') {
        return jsonResponse({ code: 'API_ERROR', message: 'Match API unavailable.' }, 500);
      }

      return jsonResponse({ message: `Unhandled ${url.pathname}` }, 500);
    }) as typeof fetch;

    t.after(() => {
      globalThis.fetch = original.fetch;
      auth.getCurrentUser = original.getCurrentUser;
      auth.getTokens = original.getTokens;
    });

    assert.equal(await matchService.getMatch('missing_match'), null);
    await assert.rejects(() => matchService.getMatch('api_down'), /Match API unavailable/);

    auth.getCurrentUser = async () => null;
    await assert.rejects(() => matchService.getMatch('missing_auth'), /Sign in to view match details/);
    assert.deepEqual(calls, ['GET /v1/matches/missing_match', 'GET /v1/matches/api_down']);
  });
});
