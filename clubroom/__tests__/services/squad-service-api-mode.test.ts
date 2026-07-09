import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import type { ClubSquad, SquadMember } from '@/constants/types';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

function makeSquad(overrides: Partial<ClubSquad> = {}): ClubSquad {
  return {
    id: 'squad_api',
    clubId: 'club_api',
    name: 'API Squad',
    level: 'U14',
    memberCount: 1,
    primaryCoach: 'coach_api',
    meetLocation: 'Pitch 1',
    ...overrides,
  };
}

function makeMember(overrides: Partial<SquadMember> = {}): SquadMember {
  return {
    id: 'sm_api',
    squadId: 'squad_api',
    athleteId: 'ath_api',
    parentId: 'parent_api',
    status: 'ACTIVE',
    joinedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('squadService API mode', () => {
  it('does not initialize squad member fixtures as API-mode cache', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'services/squad-service.ts'), 'utf8');

    assert.doesNotMatch(source, /let membersCache:[^=]+=\s*\[\.\.\.MOCK_SQUAD_MEMBERS\];/);
    assert.doesNotMatch(source, /return\s+\[\.\.\.MOCK_SQUAD_MEMBERS\];/);
    assert.ok(source.includes('USE_MOCK ? [...MOCK_SQUAD_MEMBERS] : []'));
  });

  it('uses /v1 squad contracts instead of local squad member storage', async (t) => {
    const [{ squadService }, { apiClient }] = await Promise.all([
      import('@/services/squad-service'),
      import('@/services/api-client'),
    ]);

    const originalGet = apiClient.get;
    const originalFetch = global.fetch;
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];

    apiClient.get = async () => {
      throw new Error('local squad member storage should not run in API mode');
    };

    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      calls.push({
        method,
        path: url.pathname,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });

      const json = (payload: unknown, status = 200) =>
        new Response(JSON.stringify(payload), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });

      if (url.pathname === '/v1/clubs/club_api/squads' && method === 'GET') {
        return json({ squads: [makeSquad()], total: 1 });
      }
      if (url.pathname === '/v1/squads/squad_api' && method === 'GET') {
        return json({ squad: makeSquad() });
      }
      if (url.pathname === '/v1/clubs/club_api/squads' && method === 'POST') {
        return json({ squad: makeSquad({ id: 'squad_created', name: 'Created Squad' }) }, 201);
      }
      if (url.pathname === '/v1/clubs/club_api/squads/squad_api' && method === 'PATCH') {
        return json({ squad: makeSquad({ name: 'Updated Squad' }) });
      }
      if (url.pathname === '/v1/clubs/club_api/squads/squad_api' && method === 'DELETE') {
        return new Response(null, { status: 204 });
      }
      if (url.pathname === '/v1/squads/squad_api/members' && method === 'GET') {
        return json({ members: [makeMember()], total: 1 });
      }

      return json({ message: 'unexpected route' }, 404);
    }) as typeof fetch;

    t.after(() => {
      apiClient.get = originalGet;
      global.fetch = originalFetch;
    });

    assert.deepEqual(
      (await squadService.getSquads('club_api')).map((squad) => squad.id),
      ['squad_api'],
    );
    assert.equal((await squadService.getSquad('squad_api'))?.id, 'squad_api');
    assert.equal(
      (
        await squadService.createSquad({
          clubId: 'club_api',
          name: 'Created Squad',
          level: 'U14',
        })
      ).id,
      'squad_created',
    );
    assert.equal(
      (
        await squadService.updateSquad('club_api', 'squad_api', {
          name: 'Updated Squad',
        })
      ).name,
      'Updated Squad',
    );
    await squadService.deleteSquad('club_api', 'squad_api');
    assert.deepEqual(
      (await squadService.getSquadMembers('squad_api')).map((member) => member.id),
      ['sm_api'],
    );

    assert.deepEqual(
      calls.map((call) => `${call.method} ${call.path}`),
      [
        'GET /v1/clubs/club_api/squads',
        'GET /v1/squads/squad_api',
        'POST /v1/clubs/club_api/squads',
        'PATCH /v1/clubs/club_api/squads/squad_api',
        'DELETE /v1/clubs/club_api/squads/squad_api',
        'GET /v1/squads/squad_api/members',
      ],
    );
  });

  it('fails closed on squad API read failures', async (t) => {
    const [{ squadService }] = await Promise.all([import('@/services/squad-service')]);

    const originalFetch = global.fetch;
    const calls: string[] = [];

    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      calls.push(`${method} ${url.pathname}`);

      if (url.pathname === '/v1/clubs/club_api/squads' && method === 'GET') {
        return new Response(JSON.stringify({ message: 'club squads unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.pathname === '/v1/squads/squad_api' && method === 'GET') {
        return new Response(JSON.stringify({ message: 'squad detail unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.pathname === '/v1/squads/squad_missing' && method === 'GET') {
        return new Response(JSON.stringify({ message: 'squad missing' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ message: 'unexpected route' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    t.after(() => {
      global.fetch = originalFetch;
    });

    await assert.rejects(() => squadService.getSquads('club_api'), /club squads unavailable/);
    await assert.rejects(() => squadService.getSquad('squad_api'), /squad detail unavailable/);
    assert.equal(await squadService.getSquad('squad_missing'), null);
    assert.deepEqual(calls, [
      'GET /v1/clubs/club_api/squads',
      'GET /v1/squads/squad_api',
      'GET /v1/squads/squad_missing',
    ]);
  });
});
