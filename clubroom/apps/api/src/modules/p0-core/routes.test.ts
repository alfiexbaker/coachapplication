import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, beforeEach, describe, it } from 'node:test';
import { env } from '@clubroom/config';
import { buildApp } from '../../app.js';
import { resetAuthRuntimeForTests } from '../../lib/auth-runtime.js';
import { resetCoachClubRouteStateForTests } from '../coach-club/routes.js';
import { resetDbFixtureStoreForTests } from '../../lib/db-fixture-store.js';
import {
  getMarketplaceSeedStore,
  resetMarketplaceSeedStoreForTests,
} from '../../lib/marketplace-seed-store.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;

function resolveDatasetPath(): string {
  const primary = path.resolve(
    process.cwd(),
    'docs/backend-api/test-data/marketplace/linked-dataset.json',
  );
  if (fs.existsSync(primary)) {
    return primary;
  }

  const fallback = path.resolve(
    process.cwd(),
    '../../docs/backend-api/test-data/marketplace/linked-dataset.json',
  );
  if (fs.existsSync(fallback)) {
    return fallback;
  }

  throw new Error('Unable to locate linked marketplace dataset for API tests');
}

function loadTables(): SeedTables {
  const raw = fs.readFileSync(resolveDatasetPath(), 'utf8');
  const parsed = JSON.parse(raw) as { tables: SeedTables };
  return parsed.tables;
}

function rolesForUser(tables: SeedTables, userId: string): string[] {
  return asRows(tables.userRoleMemberships)
    .filter((row) => asString(row.userId) === userId)
    .map((row) => asString(row.role))
    .filter((role): role is string => Boolean(role));
}

function passwordForRoles(roles: string[]): string {
  if (roles.includes('club_admin') || roles.includes('security_admin')) {
    return 'admin';
  }
  if (roles.includes('coach')) {
    return 'coach';
  }
  return 'user';
}

function addDaysIso(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function getFirstAvailableSlot(params: {
  app: ReturnType<typeof buildApp>;
  tables: SeedTables;
  authUserId: string;
  coachUserId: string;
  durationMinutes?: number;
  excludePendingInvites?: boolean;
  requireMaxBookings?: number;
}): Promise<{ date: string; startTime: string; endTime: string; location?: string; maxBookings: number }> {
  const durationMinutes = params.durationMinutes ?? 60;
  const searchParams = new URLSearchParams({
    start: addDaysIso(1),
    end: addDaysIso(21),
    durationMinutes: String(durationMinutes),
    applySchedulingRules: 'true',
  });
  if (params.excludePendingInvites) {
    searchParams.set('excludePendingInvites', 'true');
  }

  const res = await params.app.inject({
    method: 'GET',
    url: `/v1/coaches/${params.coachUserId}/availability/slots?${searchParams.toString()}`,
    headers: {
      'x-auth-user-id': params.authUserId,
      'x-auth-roles': rolesForUser(params.tables, params.authUserId).join(','),
      'x-acting-role': rolesForUser(params.tables, params.authUserId)[0] ?? 'parent',
    },
  });
  assert.equal(res.statusCode, 200);

  const payload = res.json() as {
    slots: Array<{
      date: string;
      startTime: string;
      endTime: string;
      isAvailable: boolean;
      location?: string;
      maxBookings: number;
    }>;
  };
  const slot = payload.slots.find((candidate) =>
    candidate.isAvailable &&
    (params.requireMaxBookings === undefined || candidate.maxBookings === params.requireMaxBookings),
  );
  assert.ok(slot, 'expected an available coach slot');
  return slot;
}

describe('p0 core routes', () => {
  const app = buildApp();

  beforeEach(() => {
    resetAuthRuntimeForTests();
    resetMarketplaceSeedStoreForTests();
    resetDbFixtureStoreForTests();
    resetCoachClubRouteStateForTests();
  });

  after(async () => {
    await app.close();
  });

  it('returns /v1/me for a seeded user with linked memberships', async () => {
    const tables = loadTables();
    const roleMembership = asRows(tables.userRoleMemberships).find(
      (row) => asString(row.role) === 'parent',
    );
    assert.ok(roleMembership, 'expected at least one parent role membership');
    const userId = asString(roleMembership.userId) as string;

    const res = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: {
        'x-auth-user-id': userId,
        'x-auth-roles': rolesForUser(tables, userId).join(','),
        'x-acting-role': 'parent',
      },
    });

    assert.equal(res.statusCode, 200);
    const payload = res.json() as {
      user: { id: string };
      roles: string[];
      linkedFamilies: unknown[];
    };
    assert.equal(payload.user.id, userId);
    assert.equal(payload.roles.includes('parent'), true);
    assert.equal(payload.linkedFamilies.length >= 1, true);
  });

  it('lists and revokes auth sessions for the authenticated user', async () => {
    const tables = loadTables();
    const roleMembership = asRows(tables.userRoleMemberships).find(
      (row) => asString(row.role) === 'parent',
    );
    assert.ok(roleMembership, 'expected seeded parent role membership');
    const userId = asString(roleMembership.userId) as string;
    const roles = rolesForUser(tables, userId);
    const user = asRows(tables.users).find((row) => asString(row.id) === userId);
    assert.ok(user, 'expected seeded user for auth session');
    const email = asString(user?.email) as string;

    const firstLogin = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email,
        password: passwordForRoles(roles),
      },
    });
    assert.equal(firstLogin.statusCode, 200);

    const secondLogin = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email,
        password: passwordForRoles(roles),
      },
    });
    assert.equal(secondLogin.statusCode, 200);
    const secondLoginPayload = secondLogin.json() as {
      tokens: { accessToken: string };
    };

    const list = await app.inject({
      method: 'GET',
      url: '/v1/me/sessions',
      headers: {
        authorization: `Bearer ${secondLoginPayload.tokens.accessToken}`,
        'x-acting-role': roles[0] ?? 'parent',
      },
    });
    assert.equal(list.statusCode, 200);
    const listPayload = list.json() as {
      sessions: Array<{
        id: string;
        current: boolean;
        issuedAt: string | null;
        revokedAt: string | null;
        device: { id: string | null; label: string | null } | null;
      }>;
      total: number;
    };
    assert.equal(listPayload.total, 2);
    const currentSession = listPayload.sessions.find((session) => session.current);
    assert.ok(currentSession, 'expected current session in list');
    const olderSession = listPayload.sessions.find((session) => !session.current);
    assert.ok(olderSession, 'expected non-current session in list');
    assert.equal(typeof olderSession?.issuedAt, 'string');

    const revokeSingle = await app.inject({
      method: 'POST',
      url: `/v1/me/sessions/${encodeURIComponent(olderSession!.id)}/revoke`,
      headers: {
        authorization: `Bearer ${secondLoginPayload.tokens.accessToken}`,
        'x-acting-role': roles[0] ?? 'parent',
      },
    });
    assert.equal(revokeSingle.statusCode, 200);
    const revokeSinglePayload = revokeSingle.json() as {
      session: { id: string; revokedAt: string | null };
      currentSessionRevoked: boolean;
    };
    assert.equal(revokeSinglePayload.session.id, olderSession!.id);
    assert.equal(typeof revokeSinglePayload.session.revokedAt, 'string');
    assert.equal(revokeSinglePayload.currentSessionRevoked, false);

    const thirdLogin = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email,
        password: passwordForRoles(roles),
      },
    });
    assert.equal(thirdLogin.statusCode, 200);
    const thirdLoginPayload = thirdLogin.json() as {
      tokens: { accessToken: string };
    };

    const currentList = await app.inject({
      method: 'GET',
      url: '/v1/me/sessions',
      headers: {
        authorization: `Bearer ${thirdLoginPayload.tokens.accessToken}`,
        'x-acting-role': roles[0] ?? 'parent',
      },
    });
    assert.equal(currentList.statusCode, 200);
    const currentListPayload = currentList.json() as {
      sessions: Array<{ id: string; current: boolean }>;
    };
    const currentRuntimeSession = currentListPayload.sessions.find((session) => session.current);
    assert.ok(currentRuntimeSession, 'expected current runtime session');

    const revokeAll = await app.inject({
      method: 'POST',
      url: '/v1/me/sessions/revoke-all',
      headers: {
        authorization: `Bearer ${thirdLoginPayload.tokens.accessToken}`,
        'x-acting-role': roles[0] ?? 'parent',
      },
    });
    assert.equal(revokeAll.statusCode, 200);
    const revokeAllPayload = revokeAll.json() as {
      revokedSessionIds: string[];
      revokedCount: number;
      retainedSessionId: string | null;
    };
    assert.equal(revokeAllPayload.revokedCount >= 1, true);
    assert.equal(revokeAllPayload.retainedSessionId, currentRuntimeSession!.id);
  });

  it('exposes runtime backend mode in /v1/meta/version', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/meta/version',
    });

    assert.equal(res.statusCode, 200);
    const payload = res.json() as {
      apiVersion: string;
      marketplaceSeedEnabled: boolean;
      apiDataBackend: string;
    };
    assert.equal(payload.apiVersion, 'v1');
    assert.equal(payload.apiDataBackend, 'seed');
    assert.equal(typeof payload.marketplaceSeedEnabled, 'boolean');
  });

  it('returns family aggregate and blocks unrelated users', async () => {
    const tables = loadTables();
    const familyMembership = asRows(tables.familyMemberships)[0];
    assert.ok(familyMembership, 'expected seeded family membership');
    const familyId = asString(familyMembership.familyId) as string;
    const memberUserId = asString(familyMembership.userId) as string;
    const nonMemberCoach = asRows(tables.coachProfiles).find(
      (row) => asString(row.userId) !== memberUserId,
    );
    assert.ok(nonMemberCoach, 'expected seeded coach profile');
    const outsiderUserId = asString(nonMemberCoach.userId) as string;

    const allowed = await app.inject({
      method: 'GET',
      url: `/v1/families/${familyId}`,
      headers: {
        'x-auth-user-id': memberUserId,
        'x-auth-roles': rolesForUser(tables, memberUserId).join(','),
        'x-acting-role': rolesForUser(tables, memberUserId)[0] ?? 'parent',
      },
    });
    assert.equal(allowed.statusCode, 200);
    const allowedPayload = allowed.json() as { athletes: unknown[] };
    assert.equal(allowedPayload.athletes.length >= 1, true);

    const denied = await app.inject({
      method: 'GET',
      url: `/v1/families/${familyId}`,
      headers: {
        'x-auth-user-id': outsiderUserId,
        'x-auth-roles': rolesForUser(tables, outsiderUserId).join(',') || 'coach',
        'x-acting-role': 'coach',
      },
    });
    assert.equal(denied.statusCode, 403);
  });

  it('serves coach profile, offerings, verification docs, and club list', async () => {
    const tables = loadTables();
    const coachProfile = asRows(tables.coachProfiles)[0];
    assert.ok(coachProfile, 'expected seeded coach profile');
    const coachUserId = asString(coachProfile.userId) as string;

    const profile = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/profile',
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
        'x-acting-role': 'coach',
      },
    });
    assert.equal(profile.statusCode, 200);

    const offerings = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/offerings',
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
        'x-acting-role': 'coach',
      },
    });
    assert.equal(offerings.statusCode, 200);
    const offeringsPayload = offerings.json() as { total: number };
    assert.equal(offeringsPayload.total >= 1, true);

    const verification = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/verifications/dbs/documents',
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
        'x-acting-role': 'coach',
      },
    });
    assert.equal(verification.statusCode, 200);

    const clubs = await app.inject({
      method: 'GET',
      url: '/v1/clubs',
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
        'x-acting-role': 'coach',
      },
    });
    assert.equal(clubs.statusCode, 200);
    const clubsPayload = clubs.json() as {
      clubs: Array<{
        id?: string;
        inviteCode?: string | null;
        viewerMembership?: { userId?: string; role?: string } | null;
        viewerGovernance: { role: string | null; canManageAssignments: boolean };
      }>;
    };
    const visibleClub = clubsPayload.clubs.find(
      (club) => club.viewerMembership?.userId === coachUserId,
    );
    assert.ok(visibleClub, 'expected a visible club membership for the seeded coach');
    assert.equal(typeof visibleClub?.viewerGovernance.canManageAssignments, 'boolean');
    if (visibleClub?.viewerMembership?.role === 'club_admin') {
      assert.equal(visibleClub.viewerGovernance.role, 'ADMIN');
    }
    if (visibleClub?.viewerMembership?.role === 'coach') {
      assert.equal(visibleClub.viewerGovernance.role, 'COACH');
    }
    assert.equal(typeof visibleClub?.inviteCode, 'string');
  });

  it('resolves join codes and joins members directly through /v1/clubs/join', async () => {
    const tables = loadTables();
    const memberUserIds = asRows(tables.userRoleMemberships)
      .filter((row) => asString(row.role) === 'member')
      .map((row) => asString(row.userId))
      .filter((userId): userId is string => Boolean(userId));
    const clubMemberUserIds = new Set(
      asRows(tables.clubMemberships)
        .map((row) => asString(row.userId))
        .filter((userId): userId is string => Boolean(userId)),
    );
    const standaloneMemberId = memberUserIds.find((userId) => !clubMemberUserIds.has(userId));
    assert.ok(standaloneMemberId, 'expected standalone member for direct join');

    const seededCoach = asRows(tables.coachProfiles)[0];
    const coachUserId = asString(seededCoach.userId) as string;
    const clubsRes = await app.inject({
      method: 'GET',
      url: '/v1/clubs',
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
        'x-acting-role': 'coach',
      },
    });
    const clubsPayload = clubsRes.json() as {
      clubs: Array<{ id: string; inviteCode: string }>;
    };
    const inviteCode = clubsPayload.clubs[0]?.inviteCode;
    assert.ok(inviteCode, 'expected primary club invite code');

    const resolveRes = await app.inject({
      method: 'GET',
      url: `/v1/clubs/join/resolve?code=${encodeURIComponent(inviteCode)}`,
      headers: {
        'x-auth-user-id': standaloneMemberId as string,
        'x-auth-roles': rolesForUser(tables, standaloneMemberId as string).join(',') || 'member',
        'x-acting-role': 'member',
      },
    });
    assert.equal(resolveRes.statusCode, 200);
    const resolvePayload = resolveRes.json() as {
      preview: { joinFlow: string; role: string; alreadyMember: boolean };
    };
    assert.equal(resolvePayload.preview.joinFlow, 'direct_join');
    assert.equal(resolvePayload.preview.role, 'MEMBER');
    assert.equal(resolvePayload.preview.alreadyMember, false);

    const joinRes = await app.inject({
      method: 'POST',
      url: '/v1/clubs/join',
      headers: {
        'x-auth-user-id': standaloneMemberId as string,
        'x-auth-roles': rolesForUser(tables, standaloneMemberId as string).join(',') || 'member',
        'x-acting-role': 'member',
      },
      payload: { code: inviteCode },
    });
    assert.equal(joinRes.statusCode, 201);
    const joinPayload = joinRes.json() as {
      outcome: string;
      membership: { role: string; clubId: string; userId: string };
    };
    assert.equal(joinPayload.outcome, 'joined');
    assert.equal(joinPayload.membership.role, 'member');
    assert.equal(joinPayload.membership.userId, standaloneMemberId);

    const joinedClubs = await app.inject({
      method: 'GET',
      url: '/v1/clubs',
      headers: {
        'x-auth-user-id': standaloneMemberId as string,
        'x-auth-roles': rolesForUser(tables, standaloneMemberId as string).join(',') || 'member',
        'x-acting-role': 'member',
      },
    });
    const joinedPayload = joinedClubs.json() as { total: number };
    assert.equal(joinedPayload.total >= 1, true);
  });

  it('creates pending staff invites from coach links and accepts them via inbox', async () => {
    const tables = loadTables();
    const clubAdminMembership = asRows(tables.clubMemberships).find(
      (row) => asString(row.role) === 'club_admin',
    );
    assert.ok(clubAdminMembership, 'expected club admin membership');
    const coachUserId = asString(clubAdminMembership.userId) as string;
    const clubsRes = await app.inject({
      method: 'GET',
      url: '/v1/clubs',
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'club_admin',
        'x-acting-role': 'club_admin',
      },
    });
    const clubsPayload = clubsRes.json() as {
      clubs: Array<{ id: string }>;
    };
    const clubId = clubsPayload.clubs[0]?.id;
    assert.ok(clubId, 'expected visible club id');

    const createInviteRes = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/invite-codes`,
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'club_admin',
        'x-acting-role': 'club_admin',
      },
      payload: { role: 'COACH' },
    });
    assert.equal(createInviteRes.statusCode, 201);
    const createInvitePayload = createInviteRes.json() as { inviteCode: { code: string } };
    const coachCode = createInvitePayload.inviteCode.code;

    const existingClubUserIds = new Set(
      asRows(tables.clubMemberships)
        .filter((row) => asString(row.clubId) === clubId)
        .map((row) => asString(row.userId))
        .filter((userId): userId is string => Boolean(userId)),
    );
    const otherCoachUserId = asRows(tables.coachProfiles)
      .map((row) => asString(row.userId))
      .filter((userId): userId is string => Boolean(userId))
      .find((userId) => userId !== coachUserId && !existingClubUserIds.has(userId));
    assert.ok(otherCoachUserId, 'expected second coach');
    const targetCoachUserId = otherCoachUserId as string;

    const joinRes = await app.inject({
      method: 'POST',
      url: '/v1/clubs/join',
      headers: {
        'x-auth-user-id': targetCoachUserId,
        'x-auth-roles': rolesForUser(tables, targetCoachUserId).join(',') || 'coach',
        'x-acting-role': 'coach',
      },
      payload: { code: coachCode },
    });
    assert.equal(joinRes.statusCode, 202);
    const joinPayload = joinRes.json() as {
      outcome: string;
      invite: { id: string; status: string; role: string };
    };
    assert.equal(joinPayload.outcome, 'invite_pending');
    assert.equal(joinPayload.invite.status, 'pending');
    assert.equal(joinPayload.invite.role, 'COACH');

    const inboxRes = await app.inject({
      method: 'GET',
      url: '/v1/clubs/invites',
      headers: {
        'x-auth-user-id': otherCoachUserId,
        'x-auth-roles': rolesForUser(tables, otherCoachUserId).join(',') || 'coach',
        'x-acting-role': 'coach',
      },
    });
    assert.equal(inboxRes.statusCode, 200);
    const inboxPayload = inboxRes.json() as {
      invites: Array<{ id: string; clubId: string }>;
    };
    assert.equal(inboxPayload.invites.length >= 1, true);

    const respondRes = await app.inject({
      method: 'POST',
      url: `/v1/clubs/invites/${inboxPayload.invites[0]?.id}/respond`,
      headers: {
        'x-auth-user-id': otherCoachUserId,
        'x-auth-roles': rolesForUser(tables, otherCoachUserId).join(',') || 'coach',
        'x-acting-role': 'coach',
      },
      payload: { response: 'accepted' },
    });
    assert.equal(respondRes.statusCode, 200);
    const respondPayload = respondRes.json() as {
      membership: { role: string; clubId: string; userId: string } | null;
      invite: { status: string };
    };
    assert.equal(respondPayload.invite.status, 'accepted');
    assert.equal(respondPayload.membership?.role, 'coach');
    assert.equal(respondPayload.membership?.userId, otherCoachUserId);
  });

  it('keeps the club authority flow working in db fixture mode', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const tables = loadTables();
      const memberUserIds = asRows(tables.userRoleMemberships)
        .filter((row) => asString(row.role) === 'member')
        .map((row) => asString(row.userId))
        .filter((userId): userId is string => Boolean(userId));

      const clubAdminMembership = asRows(tables.clubMemberships).find(
        (row) => asString(row.role) === 'club_admin',
      );
      assert.ok(clubAdminMembership, 'expected seeded club admin membership');
      const adminUserId = asString(clubAdminMembership.userId) as string;

      const clubsRes = await app.inject({
        method: 'GET',
        url: '/v1/clubs',
        headers: {
          'x-auth-user-id': adminUserId,
          'x-auth-roles': rolesForUser(tables, adminUserId).join(',') || 'club_admin',
          'x-acting-role': 'club_admin',
        },
      });
      assert.equal(clubsRes.statusCode, 200);
      const clubsPayload = clubsRes.json() as {
        clubs: Array<{ id: string; inviteCode: string }>;
      };
      const clubId = clubsPayload.clubs[0]?.id;
      const inviteCode = clubsPayload.clubs[0]?.inviteCode;
      assert.ok(clubId, 'expected db-mode club id');
      assert.ok(inviteCode, 'expected db-mode member invite code');

      const existingClubUserIds = new Set(
        asRows(tables.clubMemberships)
          .filter((row) => asString(row.clubId) === clubId)
          .map((row) => asString(row.userId))
          .filter((userId): userId is string => Boolean(userId)),
      );
      const standaloneMemberId = memberUserIds.find((userId) => !existingClubUserIds.has(userId));
      assert.ok(standaloneMemberId, 'expected standalone member for db-mode club join');

      const resolveRes = await app.inject({
        method: 'GET',
        url: `/v1/clubs/join/resolve?code=${encodeURIComponent(inviteCode)}`,
        headers: {
          'x-auth-user-id': standaloneMemberId as string,
          'x-auth-roles': rolesForUser(tables, standaloneMemberId as string).join(',') || 'member',
          'x-acting-role': 'member',
        },
      });
      assert.equal(resolveRes.statusCode, 200);
      assert.equal((resolveRes.json() as { preview: { joinFlow: string } }).preview.joinFlow, 'direct_join');

      const joinRes = await app.inject({
        method: 'POST',
        url: '/v1/clubs/join',
        headers: {
          'x-auth-user-id': standaloneMemberId as string,
          'x-auth-roles': rolesForUser(tables, standaloneMemberId as string).join(',') || 'member',
          'x-acting-role': 'member',
        },
        payload: { code: inviteCode },
      });
      assert.equal(joinRes.statusCode, 201);
      const joinPayload = joinRes.json() as { outcome: string; membership: { userId: string; role: string } };
      assert.equal(joinPayload.outcome, 'joined');
      assert.equal(joinPayload.membership.userId, standaloneMemberId);
      assert.equal(joinPayload.membership.role, 'member');

      const createCoachCodeRes = await app.inject({
        method: 'POST',
        url: `/v1/clubs/${clubId}/invite-codes`,
        headers: {
          'x-auth-user-id': adminUserId,
          'x-auth-roles': rolesForUser(tables, adminUserId).join(',') || 'club_admin',
          'x-acting-role': 'club_admin',
        },
        payload: { role: 'COACH' },
      });
      assert.equal(createCoachCodeRes.statusCode, 201);
      const coachCode = (createCoachCodeRes.json() as { inviteCode: { code: string } }).inviteCode.code;

      const targetCoachUserId = asRows(tables.coachProfiles)
        .map((row) => asString(row.userId))
        .filter((userId): userId is string => Boolean(userId))
        .find((userId) => userId !== adminUserId && !existingClubUserIds.has(userId));
      assert.ok(targetCoachUserId, 'expected second coach for db-mode invite flow');

      const staffJoinRes = await app.inject({
        method: 'POST',
        url: '/v1/clubs/join',
        headers: {
          'x-auth-user-id': targetCoachUserId as string,
          'x-auth-roles': rolesForUser(tables, targetCoachUserId as string).join(',') || 'coach',
          'x-acting-role': 'coach',
        },
        payload: { code: coachCode },
      });
      assert.equal(staffJoinRes.statusCode, 202);
      const pendingInviteId = (staffJoinRes.json() as { invite: { id: string } }).invite.id;

      const inboxRes = await app.inject({
        method: 'GET',
        url: '/v1/clubs/invites',
        headers: {
          'x-auth-user-id': targetCoachUserId as string,
          'x-auth-roles': rolesForUser(tables, targetCoachUserId as string).join(',') || 'coach',
          'x-acting-role': 'coach',
        },
      });
      assert.equal(inboxRes.statusCode, 200);
      const inboxPayload = inboxRes.json() as { invites: Array<{ id: string; clubId: string }> };
      assert.equal(inboxPayload.invites.some((invite) => invite.id === pendingInviteId && invite.clubId === clubId), true);

      const respondRes = await app.inject({
        method: 'POST',
        url: `/v1/clubs/invites/${pendingInviteId}/respond`,
        headers: {
          'x-auth-user-id': targetCoachUserId as string,
          'x-auth-roles': rolesForUser(tables, targetCoachUserId as string).join(',') || 'coach',
          'x-acting-role': 'coach',
        },
        payload: { response: 'accepted' },
      });
      assert.equal(respondRes.statusCode, 200);
      const respondPayload = respondRes.json() as {
        invite: { status: string };
        membership: { role: string; userId: string } | null;
      };
      assert.equal(respondPayload.invite.status, 'accepted');
      assert.equal(respondPayload.membership?.role, 'coach');
      assert.equal(respondPayload.membership?.userId, targetCoachUserId);
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetMarketplaceSeedStoreForTests();
      resetDbFixtureStoreForTests();
      resetCoachClubRouteStateForTests();
    }
  });

  it('allows security admins to view clubs without direct membership', async () => {
    const tables = loadTables();
    const securityAdminMembership = asRows(tables.userRoleMemberships).find(
      (row) => asString(row.role) === 'security_admin',
    );
    assert.ok(securityAdminMembership, 'expected seeded security admin role membership');
    const userId = asString(securityAdminMembership.userId) as string;

    const res = await app.inject({
      method: 'GET',
      url: '/v1/clubs',
      headers: {
        'x-auth-user-id': userId,
        'x-auth-roles': rolesForUser(tables, userId).join(',') || 'security_admin',
        'x-acting-role': 'security_admin',
      },
    });
    assert.equal(res.statusCode, 200);

    const payload = res.json() as { clubs: Array<{ id: string }> };
    assert.equal(payload.clubs.length >= 1, true);
  });

  it('creates, cancels, reopens, and lists bookings for the booked-by user', async () => {
    const tables = loadTables();
    const guardianLink = asRows(tables.guardianChildLinks)[0];
    assert.ok(guardianLink, 'expected seeded guardian-child link');
    const bookedByUserId = asString(guardianLink.guardianUserId) as string;
    const athleteId = asString(guardianLink.athleteId) as string;
    const coachOffering = asRows(tables.coachingOfferings)[0];
    assert.ok(coachOffering, 'expected seeded coaching offering');
    const coachUserId = asString(coachOffering.coachUserId) as string;
    const availableSlot = await getFirstAvailableSlot({
      app,
      tables,
      authUserId: bookedByUserId,
      coachUserId,
      requireMaxBookings: 1,
    });

    const create = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      headers: {
        'x-auth-user-id': bookedByUserId,
        'x-auth-roles': rolesForUser(tables, bookedByUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, bookedByUserId)[0] ?? 'parent',
      },
      payload: {
        coachUserId,
        athleteIds: [athleteId],
        bookedByUserId,
        scheduledAt: `${availableSlot.date}T${availableSlot.startTime}:00.000Z`,
        durationMinutes: 60,
        location: availableSlot.location ?? 'Integration Test Pitch',
        serviceType: 'one_to_one',
        objectives: ['Decision making'],
        notes: 'Created from p0 endpoint test',
        priceMinor: 4200,
        currency: 'GBP',
      },
    });
    assert.equal(create.statusCode, 201);
    const created = create.json() as { id: string; status: string };
    assert.match(created.id, /^bok_/);
    assert.equal(created.status, 'CONFIRMED');

    const listed = await app.inject({
      method: 'GET',
      url: '/v1/bookings',
      headers: {
        'x-auth-user-id': bookedByUserId,
        'x-auth-roles': rolesForUser(tables, bookedByUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, bookedByUserId)[0] ?? 'parent',
      },
    });
    assert.equal(listed.statusCode, 200);
    const listedPayload = listed.json() as { bookings: Array<{ id: string }> };
    assert.equal(
      listedPayload.bookings.some((booking) => booking.id === created.id),
      true,
    );

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/bookings/${created.id}`,
      headers: {
        'x-auth-user-id': bookedByUserId,
        'x-auth-roles': rolesForUser(tables, bookedByUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, bookedByUserId)[0] ?? 'parent',
      },
    });
    assert.equal(detail.statusCode, 200);
    const detailPayload = detail.json() as { id: string; bookedByUserId?: string };
    assert.equal(detailPayload.id, created.id);
    assert.equal(detailPayload.bookedByUserId, bookedByUserId);

    const cancelled = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${created.id}/cancel`,
      headers: {
        'x-auth-user-id': bookedByUserId,
        'x-auth-roles': rolesForUser(tables, bookedByUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, bookedByUserId)[0] ?? 'parent',
      },
      payload: {
        reason: 'Schedule change',
        note: 'Need to move the session to next week.',
      },
    });
    assert.equal(cancelled.statusCode, 200);
    const cancelledPayload = cancelled.json() as {
      id: string;
      status: string;
      cancelledAt: string | null;
    };
    assert.equal(cancelledPayload.id, created.id);
    assert.equal(cancelledPayload.status, 'CANCELLED');
    assert.equal(typeof cancelledPayload.cancelledAt, 'string');

    const cancelledAgain = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${created.id}/cancel`,
      headers: {
        'x-auth-user-id': bookedByUserId,
        'x-auth-roles': rolesForUser(tables, bookedByUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, bookedByUserId)[0] ?? 'parent',
      },
      payload: {
        reason: 'Schedule change',
      },
    });
    assert.equal(cancelledAgain.statusCode, 200);
    assert.equal((cancelledAgain.json() as { status: string }).status, 'CANCELLED');

    const reopened = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${created.id}/reopen`,
      headers: {
        'x-auth-user-id': bookedByUserId,
        'x-auth-roles': rolesForUser(tables, bookedByUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, bookedByUserId)[0] ?? 'parent',
      },
      payload: {
        note: 'Keeping the original slot after all.',
      },
    });
    assert.equal(reopened.statusCode, 200);
    const reopenedPayload = reopened.json() as {
      id: string;
      status: string;
      cancelledAt: string | null;
    };
    assert.equal(reopenedPayload.id, created.id);
    assert.equal(reopenedPayload.status, 'CONFIRMED');
    assert.equal(reopenedPayload.cancelledAt, null);

    const reopenedAgain = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${created.id}/reopen`,
      headers: {
        'x-auth-user-id': bookedByUserId,
        'x-auth-roles': rolesForUser(tables, bookedByUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, bookedByUserId)[0] ?? 'parent',
      },
      payload: {},
    });
    assert.equal(reopenedAgain.statusCode, 400);
  });

  it('allows a guardian to create a booking for a linked athlete when bookedByUserId differs from the authenticated parent', async () => {
    const tables = loadTables();
    const guardianLink = asRows(tables.guardianChildLinks)[0];
    assert.ok(guardianLink, 'expected seeded guardian-child link');
    const parentUserId = asString(guardianLink.guardianUserId) as string;
    const athleteId = asString(guardianLink.athleteId) as string;
    const athlete = asRows(tables.athletes).find((row) => asString(row.id) === athleteId);
    assert.ok(athlete, 'expected seeded athlete for guardian-child link');
    const athleteUserId = asString(athlete?.userId) as string;
    const coachOffering = asRows(tables.coachingOfferings)[0];
    assert.ok(coachOffering, 'expected seeded coaching offering');
    const coachUserId = asString(coachOffering.coachUserId) as string;
    const availableSlot = await getFirstAvailableSlot({
      app,
      tables,
      authUserId: parentUserId,
      coachUserId,
    });

    const create = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      headers: {
        'x-auth-user-id': parentUserId,
        'x-auth-roles': rolesForUser(tables, parentUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, parentUserId)[0] ?? 'parent',
      },
      payload: {
        coachUserId,
        athleteIds: [athleteId],
        bookedByUserId: athleteUserId,
        scheduledAt: `${availableSlot.date}T${availableSlot.startTime}:00.000Z`,
        durationMinutes: 60,
        location: availableSlot.location ?? 'Delegated Booking Test Pitch',
        serviceType: 'one_to_one',
        objectives: ['Decision making'],
        priceMinor: 3800,
        currency: 'GBP',
      },
    });

    assert.equal(create.statusCode, 201);
    const created = create.json() as { id: string; bookedByUserId?: string };
    assert.match(created.id, /^bok_/);
    assert.equal(created.bookedByUserId, athleteUserId);
  });

  it('rejects a direct booking when the selected slot has already been taken', async () => {
    const tables = loadTables();
    const guardianLink = asRows(tables.guardianChildLinks)[0];
    assert.ok(guardianLink, 'expected seeded guardian-child link');
    const bookedByUserId = asString(guardianLink.guardianUserId) as string;
    const athleteId = asString(guardianLink.athleteId) as string;
    const coachOffering = asRows(tables.coachingOfferings)[0];
    assert.ok(coachOffering, 'expected seeded coaching offering');
    const coachUserId = asString(coachOffering.coachUserId) as string;
    const store = getMarketplaceSeedStore();
    const date = addDaysIso(9);
    const dayOfWeek = new Date(`${date}T00:00:00.000Z`).getUTCDay();
    if (!Array.isArray(store.tables.availabilityTemplates)) {
      store.tables.availabilityTemplates = [];
    }
    store.tables.availabilityTemplates.push({
      id: 'avt_booking_conflict_test',
      coachUserId,
      dayOfWeek,
      startTimeLocal: '05:00',
      endTimeLocal: '06:15',
      maxConcurrent: 1,
      bufferMinutes: 15,
      active: true,
      location: 'Conflict Test Pitch',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUserId: coachUserId,
      updatedByUserId: coachUserId,
      version: 1,
      deletedAt: null,
      deletedByUserId: null,
    });
    const bookingPayload = {
      coachUserId,
      athleteIds: [athleteId],
      bookedByUserId,
      scheduledAt: `${date}T05:00:00.000Z`,
      durationMinutes: 60,
      location: 'Conflict Test Pitch',
      serviceType: 'one_to_one',
      objectives: ['First touch'],
      priceMinor: 4200,
      currency: 'GBP',
    };

    const first = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      headers: {
        'x-auth-user-id': bookedByUserId,
        'x-auth-roles': rolesForUser(tables, bookedByUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, bookedByUserId)[0] ?? 'parent',
      },
      payload: bookingPayload,
    });
    assert.equal(first.statusCode, 201);

    const second = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      headers: {
        'x-auth-user-id': bookedByUserId,
        'x-auth-roles': rolesForUser(tables, bookedByUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, bookedByUserId)[0] ?? 'parent',
      },
      payload: bookingPayload,
    });
    assert.equal(second.statusCode, 400);
  });

  it('denies booking cancellation for an unrelated actor', async () => {
    const tables = loadTables();
    const guardianLink = asRows(tables.guardianChildLinks)[0];
    assert.ok(guardianLink, 'expected seeded guardian-child link');
    const bookedByUserId = asString(guardianLink.guardianUserId) as string;
    const athleteId = asString(guardianLink.athleteId) as string;
    const coachOffering = asRows(tables.coachingOfferings)[0];
    assert.ok(coachOffering, 'expected seeded coaching offering');
    const coachUserId = asString(coachOffering.coachUserId) as string;
    const outsiderCoach = asRows(tables.coachProfiles).find(
      (row) => asString(row.userId) !== coachUserId,
    );
    assert.ok(outsiderCoach, 'expected a different seeded coach');
    const outsiderUserId = asString(outsiderCoach.userId) as string;
    const availableSlot = await getFirstAvailableSlot({
      app,
      tables,
      authUserId: bookedByUserId,
      coachUserId,
    });

    const create = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      headers: {
        'x-auth-user-id': bookedByUserId,
        'x-auth-roles': rolesForUser(tables, bookedByUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, bookedByUserId)[0] ?? 'parent',
      },
      payload: {
        coachUserId,
        athleteIds: [athleteId],
        bookedByUserId,
        scheduledAt: `${availableSlot.date}T${availableSlot.startTime}:00.000Z`,
        durationMinutes: 60,
        location: availableSlot.location ?? 'Cancellation Authz Test Pitch',
        serviceType: 'one_to_one',
        objectives: ['First touch'],
      },
    });
    assert.equal(create.statusCode, 201);
    const created = create.json() as { id: string };

    const denied = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${created.id}/cancel`,
      headers: {
        'x-auth-user-id': outsiderUserId,
        'x-auth-roles': rolesForUser(tables, outsiderUserId).join(',') || 'coach',
        'x-acting-role': rolesForUser(tables, outsiderUserId)[0] ?? 'coach',
      },
      payload: {
        reason: 'Not my booking',
      },
    });
    assert.equal(denied.statusCode, 403);

    const deniedDetail = await app.inject({
      method: 'GET',
      url: `/v1/bookings/${created.id}`,
      headers: {
        'x-auth-user-id': outsiderUserId,
        'x-auth-roles': rolesForUser(tables, outsiderUserId).join(',') || 'coach',
        'x-acting-role': rolesForUser(tables, outsiderUserId)[0] ?? 'coach',
      },
    });
    assert.equal(deniedDetail.statusCode, 403);
  });

  it('denies booking creation for an athlete not linked to the authenticated parent', async () => {
    const tables = loadTables();
    const guardianLink = asRows(tables.guardianChildLinks)[0];
    assert.ok(guardianLink, 'expected seeded guardian-child link');
    const bookedByUserId = asString(guardianLink.guardianUserId) as string;
    const linkedAthleteIds = new Set(
      asRows(tables.guardianChildLinks)
        .filter((row) => asString(row.guardianUserId) === bookedByUserId)
        .map((row) => asString(row.athleteId))
        .filter((athleteId): athleteId is string => Boolean(athleteId)),
    );
    const unrelatedAthlete = asRows(tables.athletes).find((row) => {
      const athleteId = asString(row.id);
      return Boolean(athleteId && !linkedAthleteIds.has(athleteId));
    });
    assert.ok(unrelatedAthlete, 'expected an athlete outside the parent scope');
    const unrelatedAthleteId = asString(unrelatedAthlete?.id) as string;
    const coachOffering = asRows(tables.coachingOfferings)[0];
    assert.ok(coachOffering, 'expected seeded coaching offering');
    const coachUserId = asString(coachOffering.coachUserId) as string;
    const availableSlot = await getFirstAvailableSlot({
      app,
      tables,
      authUserId: bookedByUserId,
      coachUserId,
    });

    const create = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      headers: {
        'x-auth-user-id': bookedByUserId,
        'x-auth-roles': rolesForUser(tables, bookedByUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, bookedByUserId)[0] ?? 'parent',
      },
      payload: {
        coachUserId,
        athleteIds: [unrelatedAthleteId],
        bookedByUserId,
        scheduledAt: `${availableSlot.date}T${availableSlot.startTime}:00.000Z`,
        durationMinutes: 60,
        location: availableSlot.location ?? 'Authz Test Pitch',
        serviceType: 'one_to_one',
        objectives: ['Decision making'],
        currency: 'GBP',
      },
    });

    assert.equal(create.statusCode, 403);
  });

  it('lists and reads visible session invites for coach and parent users', async () => {
    const tables = loadTables();
    const pendingTarget =
      asRows(tables.inviteTargets).find((row) => asString(row.status) === 'PENDING') ??
      asRows(tables.inviteTargets)[0];
    assert.ok(pendingTarget, 'expected seeded invite target');
    const inviteId = asString(pendingTarget.inviteId) as string;
    const parentUserId = asString(pendingTarget.targetUserId) as string;
    const invite = asRows(tables.invites).find((row) => asString(row.id) === inviteId);
    assert.ok(invite, 'expected seeded invite row');
    const coachUserId = asString(invite?.senderUserId) as string;

    const parentList = await app.inject({
      method: 'GET',
      url: `/v1/invites?parentUserId=${encodeURIComponent(parentUserId)}`,
      headers: {
        'x-auth-user-id': parentUserId,
        'x-auth-roles': rolesForUser(tables, parentUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, parentUserId)[0] ?? 'parent',
      },
    });
    assert.equal(parentList.statusCode, 200);
    const parentListPayload = parentList.json() as {
      invites: Array<{ id: string; parentId: string; athleteIds: string[] }>;
    };
    const parentInvite = parentListPayload.invites.find((row) => row.id === inviteId);
    assert.ok(parentInvite, 'expected invite in parent list');
    assert.equal(parentInvite?.parentId, parentUserId);
    assert.equal((parentInvite?.athleteIds.length ?? 0) >= 1, true);

    const coachList = await app.inject({
      method: 'GET',
      url: `/v1/invites?coachUserId=${encodeURIComponent(coachUserId)}`,
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
        'x-acting-role': rolesForUser(tables, coachUserId)[0] ?? 'coach',
      },
    });
    assert.equal(coachList.statusCode, 200);
    const coachListPayload = coachList.json() as {
      invites: Array<{ id: string; coachId: string; proposedSlots: Array<{ date: string }> }>;
    };
    const coachInvite = coachListPayload.invites.find((row) => row.id === inviteId);
    assert.ok(coachInvite, 'expected invite in coach list');
    assert.equal(coachInvite?.coachId, coachUserId);
    assert.equal((coachInvite?.proposedSlots.length ?? 0) >= 1, true);

    const parentDetail = await app.inject({
      method: 'GET',
      url: `/v1/invites/${inviteId}`,
      headers: {
        'x-auth-user-id': parentUserId,
        'x-auth-roles': rolesForUser(tables, parentUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, parentUserId)[0] ?? 'parent',
      },
    });
    assert.equal(parentDetail.statusCode, 200);
    const parentDetailPayload = parentDetail.json() as {
      invite: { id: string; parentId: string; coachId: string };
    };
    assert.equal(parentDetailPayload.invite.id, inviteId);
    assert.equal(parentDetailPayload.invite.parentId, parentUserId);
    assert.equal(parentDetailPayload.invite.coachId, coachUserId);

    const outsiderUserId = asRows(tables.coachProfiles)
      .map((row) => asString(row.userId))
      .filter((userId): userId is string => Boolean(userId))
      .find((userId) => userId !== coachUserId && userId !== parentUserId);
    assert.ok(outsiderUserId, 'expected unrelated coach');

    const forbiddenDetail = await app.inject({
      method: 'GET',
      url: `/v1/invites/${inviteId}`,
      headers: {
        'x-auth-user-id': outsiderUserId,
        'x-auth-roles': rolesForUser(tables, outsiderUserId as string).join(',') || 'coach',
        'x-acting-role': rolesForUser(tables, outsiderUserId as string)[0] ?? 'coach',
      },
    });
    assert.equal(forbiddenDetail.statusCode, 403);
  });

  it('creates and manages direct session invites through /v1/invites writes', async () => {
    const tables = loadTables();
    const coachProfile = asRows(tables.coachProfiles)[0];
    assert.ok(coachProfile, 'expected seeded coach profile');
    const coachUserId = asString(coachProfile.userId) as string;

    const guardianLink = asRows(tables.guardianChildLinks).find(
      (row) => asString(row.guardianUserId) && asString(row.guardianUserId) !== coachUserId,
    );
    assert.ok(guardianLink, 'expected guardian-child link');
    const parentUserId = asString(guardianLink?.guardianUserId) as string;
    const athleteId = asString(guardianLink?.athleteId) as string;

    const createInvite = async (
      focus: string,
      proposedSlot: { date: string; startTime: string; endTime: string; location?: string },
      groupId?: string,
    ) =>
      app.inject({
        method: 'POST',
        url: '/v1/invites',
        headers: {
          'x-auth-user-id': coachUserId,
          'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
          'x-acting-role': rolesForUser(tables, coachUserId)[0] ?? 'coach',
        },
        payload: {
          coachUserId,
          athleteIds: [athleteId],
          parentUserId,
          proposedSlots: [proposedSlot],
          sessionType: '1:1 Coaching',
          focus,
          notes: `${focus} session`,
          inviteType: 'CLOSED',
          priceMinor: 3500,
          durationMinutes: 60,
          ...(groupId ? { groupId } : {}),
        },
      });

    const firstSlot = await getFirstAvailableSlot({
      app,
      tables,
      authUserId: coachUserId,
      coachUserId,
      excludePendingInvites: true,
    });

    const pendingCreate = await createInvite('First Touch', firstSlot, 'grp_direct_test');
    assert.equal(pendingCreate.statusCode, 201);
    const pendingPayload = pendingCreate.json() as {
      invite: {
        id: string;
        sessionType: string;
        focus: string;
        groupId?: string;
        parentId: string;
      };
    };
    assert.equal(pendingPayload.invite.sessionType, '1:1 Coaching');
    assert.equal(pendingPayload.invite.focus, 'First Touch');
    assert.equal(pendingPayload.invite.groupId, 'grp_direct_test');
    assert.equal(pendingPayload.invite.parentId, parentUserId);

    const groupList = await app.inject({
      method: 'GET',
      url: '/v1/invites?groupId=grp_direct_test',
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
        'x-acting-role': rolesForUser(tables, coachUserId)[0] ?? 'coach',
      },
    });
    assert.equal(groupList.statusCode, 200);
    const groupListPayload = groupList.json() as {
      invites: Array<{ id: string; groupId?: string }>;
    };
    assert.equal(
      groupListPayload.invites.some((invite) => invite.id === pendingPayload.invite.id),
      true,
    );

    const remind = await app.inject({
      method: 'POST',
      url: `/v1/invites/${pendingPayload.invite.id}/remind`,
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
        'x-acting-role': rolesForUser(tables, coachUserId)[0] ?? 'coach',
      },
    });
    assert.equal(remind.statusCode, 204);

    const dismiss = await app.inject({
      method: 'POST',
      url: `/v1/invites/${pendingPayload.invite.id}/dismiss`,
      headers: {
        'x-auth-user-id': parentUserId,
        'x-auth-roles': rolesForUser(tables, parentUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, parentUserId)[0] ?? 'parent',
      },
    });
    assert.equal(dismiss.statusCode, 204);

    const parentListAfterDismiss = await app.inject({
      method: 'GET',
      url: `/v1/invites?parentUserId=${encodeURIComponent(parentUserId)}`,
      headers: {
        'x-auth-user-id': parentUserId,
        'x-auth-roles': rolesForUser(tables, parentUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, parentUserId)[0] ?? 'parent',
      },
    });
    assert.equal(parentListAfterDismiss.statusCode, 200);
    const parentListPayload = parentListAfterDismiss.json() as {
      invites: Array<{ id: string }>;
    };
    assert.equal(
      parentListPayload.invites.some((invite) => invite.id === pendingPayload.invite.id),
      false,
    );

    const acceptedSlot = await getFirstAvailableSlot({
      app,
      tables,
      authUserId: coachUserId,
      coachUserId,
      excludePendingInvites: true,
    });

    const acceptedCreate = await createInvite('Finishing', acceptedSlot);
    assert.equal(acceptedCreate.statusCode, 201);
    const acceptedPayload = acceptedCreate.json() as {
      invite: { id: string };
    };

    const acceptInvite = await app.inject({
      method: 'POST',
      url: `/v1/invites/${acceptedPayload.invite.id}/respond`,
      headers: {
        'x-auth-user-id': parentUserId,
        'x-auth-roles': rolesForUser(tables, parentUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, parentUserId)[0] ?? 'parent',
      },
      payload: {
        response: 'ACCEPTED',
        selectedSlot: acceptedSlot,
      },
    });
    assert.equal(acceptInvite.statusCode, 200);
    const acceptPayload = acceptInvite.json() as {
      invite: { id: string; status: string; bookingId?: string | null };
      bookingId?: string | null;
      booking?: { id: string } | null;
    };
    assert.equal(acceptPayload.invite.id, acceptedPayload.invite.id);
    assert.equal(acceptPayload.invite.status, 'ACCEPTED');
    assert.match(acceptPayload.bookingId ?? '', /^bok_/);
    assert.equal(acceptPayload.bookingId, acceptPayload.booking?.id ?? acceptPayload.bookingId);

    const createdBooking = await app.inject({
      method: 'GET',
      url: `/v1/bookings/${acceptPayload.bookingId}`,
      headers: {
        'x-auth-user-id': parentUserId,
        'x-auth-roles': rolesForUser(tables, parentUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, parentUserId)[0] ?? 'parent',
      },
    });
    assert.equal(createdBooking.statusCode, 200);

    const cancelledSlot = await getFirstAvailableSlot({
      app,
      tables,
      authUserId: coachUserId,
      coachUserId,
      excludePendingInvites: true,
    });

    const cancelledCreate = await createInvite('Passing', cancelledSlot);
    assert.equal(cancelledCreate.statusCode, 201);
    const cancelledPayload = cancelledCreate.json() as {
      invite: { id: string };
    };

    const cancelInvite = await app.inject({
      method: 'DELETE',
      url: `/v1/invites/${cancelledPayload.invite.id}`,
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
        'x-acting-role': rolesForUser(tables, coachUserId)[0] ?? 'coach',
      },
    });
    assert.equal(cancelInvite.statusCode, 204);

    const cancelledDetail = await app.inject({
      method: 'GET',
      url: `/v1/invites/${cancelledPayload.invite.id}`,
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
        'x-acting-role': rolesForUser(tables, coachUserId)[0] ?? 'coach',
      },
    });
    assert.equal(cancelledDetail.statusCode, 200);
    const cancelledDetailPayload = cancelledDetail.json() as {
      invite: { status: string };
    };
    assert.equal(cancelledDetailPayload.invite.status, 'EXPIRED');
  });

  it('rejects a direct session invite that reuses a still-held pending slot', async () => {
    const tables = loadTables();
    const coachProfile = asRows(tables.coachProfiles)[0];
    assert.ok(coachProfile, 'expected seeded coach profile');
    const coachUserId = asString(coachProfile.userId) as string;
    const guardianLink = asRows(tables.guardianChildLinks).find(
      (row) => asString(row.guardianUserId) && asString(row.guardianUserId) !== coachUserId,
    );
    assert.ok(guardianLink, 'expected guardian-child link');
    const parentUserId = asString(guardianLink?.guardianUserId) as string;
    const athleteId = asString(guardianLink?.athleteId) as string;
    const proposedSlot = await getFirstAvailableSlot({
      app,
      tables,
      authUserId: coachUserId,
      coachUserId,
      excludePendingInvites: true,
    });
    const payload = {
      coachUserId,
      athleteIds: [athleteId],
      parentUserId,
      proposedSlots: [proposedSlot],
      sessionType: '1:1 Coaching',
      focus: 'Ball mastery',
      notes: 'Ball mastery session',
      inviteType: 'CLOSED',
      priceMinor: 3500,
      durationMinutes: 60,
    };

    const first = await app.inject({
      method: 'POST',
      url: '/v1/invites',
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
        'x-acting-role': rolesForUser(tables, coachUserId)[0] ?? 'coach',
      },
      payload,
    });
    assert.equal(first.statusCode, 201);

    const second = await app.inject({
      method: 'POST',
      url: '/v1/invites',
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
        'x-acting-role': rolesForUser(tables, coachUserId)[0] ?? 'coach',
      },
      payload,
    });
    assert.equal(second.statusCode, 400);
  });

  it('responds to invites and creates/updates event RSVPs', async () => {
    const tables = loadTables();
    const target =
      asRows(tables.inviteTargets).find((row) => asString(row.status) === 'PENDING') ??
      asRows(tables.inviteTargets)[0];
    assert.ok(target, 'expected seeded invite target');
    const inviteId = asString(target.inviteId) as string;
    const targetUserId = asString(target.targetUserId) as string;

    const inviteResponse = await app.inject({
      method: 'POST',
      url: `/v1/invites/${inviteId}/respond`,
      headers: {
        'x-auth-user-id': targetUserId,
        'x-auth-roles': rolesForUser(tables, targetUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, targetUserId)[0] ?? 'parent',
      },
      payload: {
        response: 'ACCEPTED',
      },
    });
    assert.equal(inviteResponse.statusCode, 200);
    const invitePayload = inviteResponse.json() as {
      invite: { id: string; status: string; parentId: string };
      status: string;
      bookingId?: string | null;
      registrationId?: string | null;
      registrationStatus?: string | null;
      booking?: { id: string; status: string } | null;
    };
    assert.equal(invitePayload.status, 'ACCEPTED');
    assert.equal(invitePayload.invite.id, inviteId);
    assert.equal(invitePayload.invite.parentId, targetUserId);
    assert.equal(invitePayload.invite.status, 'ACCEPTED');
    assert.equal(typeof invitePayload.registrationId, 'string');
    assert.ok(['REGISTERED', 'WAITLISTED'].includes(invitePayload.registrationStatus ?? ''));
    if (invitePayload.registrationStatus === 'REGISTERED' && invitePayload.booking) {
      assert.match(invitePayload.booking?.id ?? '', /^bok_/);
      assert.equal(invitePayload.bookingId, invitePayload.booking.id);
    } else if (invitePayload.registrationStatus === 'WAITLISTED') {
      assert.equal(invitePayload.booking ?? null, null);
      assert.equal(invitePayload.bookingId ?? null, null);
    }

    const memberClubMembership = asRows(tables.clubMemberships)[0];
    assert.ok(memberClubMembership, 'expected seeded club membership');
    const clubId = asString(memberClubMembership.clubId) as string;
    const memberUserId = asString(memberClubMembership.userId) as string;
    const clubEvent = asRows(tables.clubEvents).find((row) => asString(row.clubId) === clubId);
    assert.ok(clubEvent, 'expected seeded event for member club');
    const eventId = asString(clubEvent.id) as string;

    const rsvp = await app.inject({
      method: 'POST',
      url: `/v1/events/${eventId}/rsvp`,
      headers: {
        'x-auth-user-id': memberUserId,
        'x-auth-roles': rolesForUser(tables, memberUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, memberUserId)[0] ?? 'parent',
      },
      payload: {
        status: 'GOING',
        guestCount: 1,
      },
    });
    assert.equal(rsvp.statusCode, 200);
    const rsvpPayload = rsvp.json() as { rsvp: { status: string; guestCount: number } };
    assert.equal(rsvpPayload.rsvp.status, 'GOING');
    assert.equal(rsvpPayload.rsvp.guestCount, 1);
  });

  it('registers a visible athlete for a group session and creates a linked booking', async () => {
    const tables = loadTables();
    const guardianLinks = asRows(tables.guardianChildLinks);
    const sessions = asRows(tables.groupSessions);
    const registrations = asRows(tables.groupSessionRegistrations);

    let selection:
      | {
          parentUserId: string;
          athleteId: string;
          sessionId: string;
        }
      | undefined;

    for (const guardianLink of guardianLinks) {
      const parentUserId = asString(guardianLink.guardianUserId);
      const athleteId = asString(guardianLink.athleteId);
      if (!parentUserId || !athleteId) {
        continue;
      }

      for (const session of sessions) {
        const sessionId = asString(session.id);
        const currentParticipants = asNumber(session.currentParticipants) ?? 0;
        const maxParticipants = asNumber(session.maxParticipants) ?? 0;
        const alreadyRegistered = registrations.some(
          (row) =>
            asString(row.groupSessionId) === sessionId &&
            asString(row.athleteId) === athleteId &&
            asString(row.status) !== 'CANCELLED',
        );

        if (sessionId && currentParticipants < maxParticipants && !alreadyRegistered) {
          selection = { parentUserId, athleteId, sessionId };
          break;
        }
      }

      if (selection) {
        break;
      }
    }

    assert.ok(selection, 'expected a visible athlete/session pair with available capacity');

    const response = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${selection?.sessionId}/register`,
      headers: {
        'x-auth-user-id': selection?.parentUserId,
        'x-auth-roles': rolesForUser(tables, selection?.parentUserId ?? '').join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, selection?.parentUserId ?? '')[0] ?? 'parent',
      },
      payload: {
        athleteId: selection?.athleteId,
        parentUserId: selection?.parentUserId,
      },
    });

    assert.equal(response.statusCode, 200);
    const payload = response.json() as {
      registration: {
        athleteId: string;
        parentUserId: string;
        status: string;
      };
      booking?: { id: string; status: string } | null;
      sessionStatus: string;
    };

    assert.equal(payload.registration.athleteId, selection?.athleteId);
    assert.equal(payload.registration.parentUserId, selection?.parentUserId);
    assert.equal(payload.registration.status, 'REGISTERED');
    assert.ok(['PUBLISHED', 'FULL'].includes(payload.sessionStatus));
    assert.match(payload.booking?.id ?? '', /^bok_/);
    assert.equal(payload.booking?.status, 'CONFIRMED');
  });
});
