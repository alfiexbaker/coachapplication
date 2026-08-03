import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { isClubStaffRole, parseOrganizationRole } from '@clubroom/shared-contracts';
import { buildApp } from '../../app.js';
import {
  getMarketplaceSeedStore,
  resetMarketplaceSeedStoreForTests,
} from '../../lib/marketplace-seed-store.js';
import { resetCoachClubRouteStateForTests } from './routes.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

function ensureTable(tables: SeedTables, key: string): SeedRow[] {
  if (!Array.isArray(tables[key])) {
    tables[key] = [];
  }
  return tables[key];
}

function rolesForUser(tables: SeedTables, userId: string): string[] {
  return asRows(tables.userRoleMemberships)
    .filter((row) => asString(row.userId) === userId)
    .map((row) => asString(row.role))
    .filter((role): role is string => Boolean(role));
}

function authHeaders(tables: SeedTables, userId: string, actingRole = 'member') {
  const roles = rolesForUser(tables, userId);
  return {
    'x-auth-user-id': userId,
    'x-auth-roles': roles.join(',') || actingRole,
    'x-acting-role': actingRole,
  };
}

function getActors(tables: SeedTables) {
  const memberships = asRows(tables.clubMemberships).filter(
    (membership) => membership.active !== false && !asString(membership.deletedAt),
  );
  const club = asRows(tables.clubs).find(
    (candidate) => asString(candidate.visibility) !== 'public' && !asString(candidate.deletedAt),
  );
  assert.ok(club, 'expected a private seeded club');
  const clubId = asString(club.id);
  assert.ok(clubId, 'expected a club id');

  const clubMemberships = memberships.filter((membership) => asString(membership.clubId) === clubId);
  const staff = clubMemberships.find((membership) => {
    const role = parseOrganizationRole(asString(membership.role));
    return role ? isClubStaffRole(role) : false;
  });
  const member = clubMemberships.find((membership) => {
    const role = parseOrganizationRole(asString(membership.role));
    return role ? !isClubStaffRole(role) : false;
  });
  const staffUserId = asString(staff?.userId);
  const memberUserId = asString(member?.userId);
  assert.ok(staffUserId && memberUserId, 'expected staff and member club actors');
  return { clubId, staffUserId, memberUserId };
}

describe('club match detail projection boundary', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
    resetCoachClubRouteStateForTests();
  });

  after(async () => {
    await app.close();
  });

  it('derives management controls and redacts another family player note', async () => {
    const tables = getMarketplaceSeedStore().tables as SeedTables;
    const { clubId, staffUserId, memberUserId } = getActors(tables);
    const observerUserId = 'usr_match-observer-boundary';
    const visitorUserId = 'usr_match-visitor-boundary';
    const matchId = 'mat_match_detail_boundary';
    const now = '2026-08-03T12:00:00.000Z';

    ensureTable(tables, 'users').push({
      id: observerUserId,
      email: 'observer.match@example.test',
      timeZone: 'Europe/London',
      createdAt: now,
      updatedAt: now,
    });
    ensureTable(tables, 'clubMemberships').push({
      id: 'clm_match_observer_boundary',
      clubId,
      userId: observerUserId,
      role: 'MEMBER',
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    ensureTable(tables, 'matches').push({
      id: matchId,
      clubId,
      coachUserId: staffUserId,
      title: 'U14 League Fixture',
      matchType: 'LEAGUE',
      opponent: 'Boundary Town',
      isHome: true,
      date: '2026-09-12',
      kickoffTime: '10:00',
      startsAt: '2026-09-12T09:00:00.000Z',
      timeZone: 'Europe/London',
      venue: 'Riverside Pitch',
      maxPlayers: 14,
      status: 'SCHEDULED',
      players: [
        {
          athleteId: 'ath_match_detail_boundary',
          parentId: memberUserId,
          status: 'UNAVAILABLE',
          parentNote: 'Private family availability note',
        },
      ],
      createdAt: now,
      updatedAt: now,
    });

    const staff = await app.inject({
      method: 'GET',
      url: `/v1/matches/${matchId}`,
      headers: authHeaders(tables, staffUserId, 'coach'),
    });
    assert.equal(staff.statusCode, 200, staff.body);
    const staffPayload = staff.json() as {
      match: { canManageMatch: boolean; selectedPlayers: { parentNote?: string }[] };
    };
    assert.equal(staffPayload.match.canManageMatch, true);
    assert.equal(staffPayload.match.selectedPlayers[0]?.parentNote, 'Private family availability note');

    const relatedMember = await app.inject({
      method: 'GET',
      url: `/v1/matches/${matchId}`,
      headers: authHeaders(tables, memberUserId, 'parent'),
    });
    assert.equal(relatedMember.statusCode, 200);
    const relatedPayload = relatedMember.json() as {
      match: { canManageMatch: boolean; selectedPlayers: { parentNote?: string }[] };
    };
    assert.equal(relatedPayload.match.canManageMatch, false);
    assert.equal(relatedPayload.match.selectedPlayers.length, 1);
    assert.equal(relatedPayload.match.selectedPlayers[0]?.parentNote, 'Private family availability note');

    const observer = await app.inject({
      method: 'GET',
      url: `/v1/matches/${matchId}`,
      headers: authHeaders(tables, observerUserId),
    });
    assert.equal(observer.statusCode, 200);
    const observerPayload = observer.json() as {
      match: { canManageMatch: boolean; selectedPlayers: unknown[] };
    };
    assert.equal(observerPayload.match.canManageMatch, false);
    assert.equal(observerPayload.match.selectedPlayers.length, 0);

    const observerList = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/matches`,
      headers: authHeaders(tables, observerUserId),
    });
    assert.equal(observerList.statusCode, 200);
    const observerListPayload = observerList.json() as {
      matches: { id: string; selectedPlayers: unknown[] }[];
    };
    assert.equal(
      observerListPayload.matches.find((match) => match.id === matchId)?.selectedPlayers.length,
      0,
    );

    const visitor = await app.inject({
      method: 'GET',
      url: `/v1/matches/${matchId}`,
      headers: authHeaders(tables, visitorUserId),
    });
    assert.equal(visitor.statusCode, 403);

    const successfulReads = asRows(tables.auditEvents).filter(
      (event) =>
        asString(event.action) === 'club_match.read' &&
        asString(event.resourceId) === matchId &&
        asString(event.result) === 'SUCCESS',
    );
    const deniedReads = asRows(tables.auditEvents).filter(
      (event) =>
        asString(event.action) === 'club_match.read' &&
        asString(event.resourceId) === matchId &&
        asString(event.result) === 'DENY',
    );
    assert.equal(successfulReads.length, 3);
    assert.equal(deniedReads.length, 1);
  });
});
