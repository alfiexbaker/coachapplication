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
const asNumber = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);

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
    const clubsPayload = clubs.json() as {
      clubs: Array<{
        id?: string;
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
        scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 60,
        location: 'Cancellation Authz Test Pitch',
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
    const invitePayload = inviteResponse.json() as {
      status: string;
      registrationId?: string | null;
      registrationStatus?: string | null;
      booking?: { id: string; status: string } | null;
    };
    assert.equal(invitePayload.status, 'ACCEPTED');
    assert.equal(typeof invitePayload.registrationId, 'string');
    assert.ok(['REGISTERED', 'WAITLISTED'].includes(invitePayload.registrationStatus ?? ''));
    if (invitePayload.registrationStatus === 'REGISTERED' && invitePayload.booking) {
      assert.match(invitePayload.booking?.id ?? '', /^bok_/);
    } else if (invitePayload.registrationStatus === 'WAITLISTED') {
      assert.equal(invitePayload.booking ?? null, null);
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
            asString(row.groupSessionId) === sessionId
            && asString(row.athleteId) === athleteId
            && asString(row.status) !== 'CANCELLED',
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
