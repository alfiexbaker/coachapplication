import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, beforeEach, describe, it } from 'node:test';
import { buildApp } from '../../app.js';
import { resetDbFixtureStoreForTests } from '../../lib/db-fixture-store.js';
import { resetMarketplaceSeedStoreForTests } from '../../lib/marketplace-seed-store.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

function resolveDatasetPath(): string {
  const primary = path.resolve(process.cwd(), 'docs/backend-api/test-data/marketplace/linked-dataset.json');
  if (fs.existsSync(primary)) {
    return primary;
  }

  const fallback = path.resolve(process.cwd(), '../../docs/backend-api/test-data/marketplace/linked-dataset.json');
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

describe('p0 core routes', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
    resetDbFixtureStoreForTests();
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
  });

  it('creates bookings and lists them for the booked-by user', async () => {
    const tables = loadTables();
    const guardianLink = asRows(tables.guardianChildLinks)[0];
    assert.ok(guardianLink, 'expected seeded guardian-child link');
    const bookedByUserId = asString(guardianLink.guardianUserId) as string;
    const athleteId = asString(guardianLink.athleteId) as string;
    const coachOffering = asRows(tables.coachingOfferings)[0];
    assert.ok(coachOffering, 'expected seeded coaching offering');
    const coachUserId = asString(coachOffering.coachUserId) as string;

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
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 60,
        location: 'Integration Test Pitch',
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
    assert.equal(listedPayload.bookings.some((booking) => booking.id === created.id), true);
  });

  it('responds to invites and creates/updates event RSVPs', async () => {
    const tables = loadTables();
    const target = asRows(tables.inviteTargets).find((row) => asString(row.status) === 'PENDING')
      ?? asRows(tables.inviteTargets)[0];
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
    const invitePayload = inviteResponse.json() as { status: string };
    assert.equal(invitePayload.status, 'ACCEPTED');

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
});
