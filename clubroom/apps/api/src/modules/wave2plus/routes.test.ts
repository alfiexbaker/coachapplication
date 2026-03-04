import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, beforeEach, describe, it } from 'node:test';
import { env } from '@clubroom/config';
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

function authHeaders(
  tables: SeedTables,
  userId: string,
  preferredRole?: string,
  extraHeaders?: Record<string, string>,
): Record<string, string> {
  const roles = rolesForUser(tables, userId);
  const actingRole = preferredRole ?? roles[0] ?? 'parent';
  return {
    'x-auth-user-id': userId,
    'x-auth-roles': roles.join(',') || actingRole,
    'x-acting-role': actingRole,
    ...extraHeaders,
  };
}

describe('wave2+ routes', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
    resetDbFixtureStoreForTests();
  });

  after(async () => {
    await app.close();
  });

  it('returns seed-health coverage counters for live verification', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/meta/seed-health',
    });
    assert.equal(res.statusCode, 200);

    const payload = res.json() as {
      tableCount: number;
      rowCount: number;
      emptyTables: string[];
      coverage: {
        parentsWithoutFamily: number;
        usersNotConnectedToClub: number;
        coachesWithOfferingsAndAvailability: number;
        parentsWithKids: number;
        parentsWithoutKids: number;
        standaloneMembers: number;
        clubLinkedMembers: number;
        coachesWithMultipleOfferings: number;
        coachesWithMultipleAvailabilityWindows: number;
        coachesWithAvailabilityOverrides: number;
        offeringServiceTypeCount: number;
        offeringDurationCount: number;
        availabilityWindowCount: number;
        availabilityDayCoverage: number;
        invoicePaidCount: number;
        invoiceOutstandingCount: number;
      };
    };

    assert.equal(payload.tableCount >= 89, true);
    assert.equal(payload.rowCount > 900, true);
    assert.deepEqual(payload.emptyTables, []);
    assert.equal(payload.coverage.parentsWithoutFamily >= 1, true);
    assert.equal(payload.coverage.usersNotConnectedToClub >= 1, true);
    assert.equal(payload.coverage.coachesWithOfferingsAndAvailability >= 1, true);
    assert.equal(payload.coverage.parentsWithKids >= 1, true);
    assert.equal(payload.coverage.parentsWithoutKids >= 1, true);
    assert.equal(payload.coverage.standaloneMembers >= 1, true);
    assert.equal(payload.coverage.clubLinkedMembers >= 1, true);
    assert.equal(payload.coverage.coachesWithMultipleOfferings >= 1, true);
    assert.equal(payload.coverage.coachesWithMultipleAvailabilityWindows >= 1, true);
    assert.equal(payload.coverage.coachesWithAvailabilityOverrides >= 1, true);
    assert.equal(payload.coverage.offeringServiceTypeCount >= 2, true);
    assert.equal(payload.coverage.offeringDurationCount >= 2, true);
    assert.equal(payload.coverage.availabilityWindowCount >= 8, true);
    assert.equal(payload.coverage.availabilityDayCoverage >= 5, true);
    assert.equal(payload.coverage.invoicePaidCount >= 1, true);
    assert.equal(payload.coverage.invoiceOutstandingCount >= 1, true);
  });

  it('returns 503 for seed-backed routes when API_DATA_BACKEND=db', async () => {
    const previous = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/meta/seed-health',
      });
      assert.equal(res.statusCode, 503);

      const payload = res.json() as { code: string; details?: { apiDataBackend?: string } };
      assert.equal(payload.code, 'SERVICE_UNAVAILABLE');
      assert.equal(payload.details?.apiDataBackend, 'db');
    } finally {
      env.API_DATA_BACKEND = previous;
      resetMarketplaceSeedStoreForTests();
    }
  });

  it('returns linked invoice aggregates and enforces invoice access control', async () => {
    const tables = loadTables();
    const invoice = asRows(tables.invoices)[0];
    assert.ok(invoice, 'expected seeded invoice');
    const invoiceId = asString(invoice.id) as string;
    const payerUserId = asString(invoice.payerUserId) as string;
    const coachUserId = asString(invoice.coachUserId) as string;

    const ok = await app.inject({
      method: 'GET',
      url: `/v1/invoices/${invoiceId}`,
      headers: authHeaders(tables, payerUserId, 'parent'),
    });
    assert.equal(ok.statusCode, 200);
    const okPayload = ok.json() as {
      lineItems: unknown[];
      events: unknown[];
      paymentInstructionTemplates: unknown[];
    };
    assert.equal(okPayload.lineItems.length >= 1, true);
    assert.equal(okPayload.events.length >= 1, true);
    assert.equal(okPayload.paymentInstructionTemplates.length >= 1, true);

    const outsider = asRows(tables.users).find((row) => {
      const candidateUserId = asString(row.id);
      if (!candidateUserId || candidateUserId === payerUserId || candidateUserId === coachUserId) {
        return false;
      }
      const roles = rolesForUser(tables, candidateUserId);
      return !roles.includes('club_admin') && !roles.includes('security_admin');
    });
    assert.ok(outsider, 'expected non-admin outsider for invoice access test');

    const denied = await app.inject({
      method: 'GET',
      url: `/v1/invoices/${invoiceId}`,
      headers: authHeaders(tables, asString(outsider.id) as string),
    });
    assert.equal(denied.statusCode, 403);
  });

  it('simulates invoice payment and enforces payer/admin authz', async () => {
    const tables = loadTables();
    const sentInvoice = asRows(tables.invoices).find((row) => asString(row.status) === 'SENT');
    assert.ok(sentInvoice, 'expected seeded SENT invoice');
    const invoiceId = asString(sentInvoice.id) as string;
    const payerUserId = asString(sentInvoice.payerUserId) as string;
    const totalMinor = asNumber(sentInvoice.totalMinor) as number;

    const outsider = asRows(tables.users).find((row) => {
      const candidateUserId = asString(row.id);
      if (!candidateUserId || candidateUserId === payerUserId) {
        return false;
      }
      const roles = rolesForUser(tables, candidateUserId);
      return !roles.includes('club_admin') && !roles.includes('security_admin');
    });
    assert.ok(outsider, 'expected non-admin outsider for payment auth test');

    const denied = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${invoiceId}/payments`,
      headers: authHeaders(tables, asString(outsider.id) as string),
      payload: {
        method: 'bank_transfer',
      },
    });
    assert.equal(denied.statusCode, 403);

    const invalidAmount = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${invoiceId}/payments`,
      headers: authHeaders(tables, payerUserId, 'parent'),
      payload: {
        amountMinor: totalMinor - 100,
        method: 'card',
      },
    });
    assert.equal(invalidAmount.statusCode, 400);

    const paid = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${invoiceId}/payments`,
      headers: authHeaders(tables, payerUserId, 'parent'),
      payload: {
        method: 'card',
        idempotencyKey: 'seed-payment-test-key',
      },
    });
    assert.equal(paid.statusCode, 200);
    const paidPayload = paid.json() as {
      alreadyPaid: boolean;
      invoiceStatus: string;
      payment: { amountMinor: number };
    };
    assert.equal(paidPayload.alreadyPaid, false);
    assert.equal(paidPayload.invoiceStatus, 'PAID');
    assert.equal(paidPayload.payment.amountMinor, totalMinor);

    const invoiceAfter = await app.inject({
      method: 'GET',
      url: `/v1/invoices/${invoiceId}`,
      headers: authHeaders(tables, payerUserId, 'parent'),
    });
    assert.equal(invoiceAfter.statusCode, 200);
    const invoiceAfterPayload = invoiceAfter.json() as {
      invoice: { status: string };
      events: Array<{ eventType?: string; actorUserId?: string }>;
      reconcilerEntry: { state?: string } | null;
    };
    assert.equal(invoiceAfterPayload.invoice.status, 'PAID');
    assert.equal(
      invoiceAfterPayload.events.some(
        (event) => event.eventType === 'MARKED_PAID' && event.actorUserId === payerUserId,
      ),
      true,
    );
    assert.equal(invoiceAfterPayload.reconcilerEntry?.state, 'PAID');

    const idempotent = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${invoiceId}/payments`,
      headers: authHeaders(tables, payerUserId, 'parent'),
      payload: {
        method: 'card',
      },
    });
    assert.equal(idempotent.statusCode, 200);
    const idempotentPayload = idempotent.json() as { alreadyPaid: boolean; invoiceStatus: string };
    assert.equal(idempotentPayload.alreadyPaid, true);
    assert.equal(idempotentPayload.invoiceStatus, 'PAID');
  });

  it('serves progress-goals-badges for related guardian and blocks unrelated users', async () => {
    const tables = loadTables();
    const notedAthleteId = asString(asRows(tables.sessionNotes)[0]?.athleteId);
    const guardianLink = asRows(tables.guardianChildLinks).find(
      (row) => asString(row.athleteId) === notedAthleteId,
    );
    assert.ok(guardianLink, 'expected guardian link for athlete with progress data');
    const athleteId = asString(guardianLink.athleteId) as string;
    const guardianUserId = asString(guardianLink.guardianUserId) as string;

    const parentHeaders = authHeaders(tables, guardianUserId, 'parent', {
      'x-guardian-athlete-ids': athleteId,
    });

    const progress = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/progress`,
      headers: parentHeaders,
    });
    assert.equal(progress.statusCode, 200);
    const progressPayload = progress.json() as { sessionNotes: unknown[]; skillAssessments: unknown[] };
    assert.equal(progressPayload.sessionNotes.length >= 1, true);
    assert.equal(progressPayload.skillAssessments.length >= 1, true);

    const goals = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/goals`,
      headers: parentHeaders,
    });
    assert.equal(goals.statusCode, 200);
    const goalsPayload = goals.json() as { goals: unknown[]; milestones: unknown[] };
    assert.equal(goalsPayload.goals.length >= 1, true);
    assert.equal(goalsPayload.milestones.length >= 1, true);

    const badges = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/badges`,
      headers: parentHeaders,
    });
    assert.equal(badges.statusCode, 200);
    const badgesPayload = badges.json() as { badges: unknown[]; badgeDefinitions: unknown[] };
    assert.equal(badgesPayload.badges.length >= 1, true);
    assert.equal(badgesPayload.badgeDefinitions.length >= 1, true);

    const outsiderCoach = asRows(tables.coachProfiles).find(
      (row) => asString(row.userId) !== guardianUserId,
    );
    assert.ok(outsiderCoach, 'expected outsider coach');
    const denied = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/progress`,
      headers: authHeaders(tables, asString(outsiderCoach.userId) as string, 'coach'),
    });
    assert.equal(denied.statusCode, 403);
  });

  it('returns drills, uploads, video, community, messages, and notifications for seeded users', async () => {
    const tables = loadTables();

    const drillAuthorId = asString(asRows(tables.drills)[0]?.authorUserId) as string;
    const drills = await app.inject({
      method: 'GET',
      url: `/v1/drills?coachUserId=${drillAuthorId}`,
      headers: authHeaders(tables, drillAuthorId, 'coach'),
    });
    assert.equal(drills.statusCode, 200);
    const drillsPayload = drills.json() as { drills: Array<{ assignments: unknown[] }>; total: number };
    assert.equal(drillsPayload.total >= 1, true);
    assert.equal(drillsPayload.drills[0]?.assignments.length >= 1, true);

    const uploadInit = await app.inject({
      method: 'POST',
      url: '/v1/uploads/init',
      headers: authHeaders(tables, drillAuthorId, 'coach'),
      payload: {
        kind: 'VIDEO',
        contentType: 'video/mp4',
        fileName: 'seed-demo.mp4',
        sizeBytes: 1_200_000,
        metadata: { source: 'test-suite' },
      },
    });
    assert.equal(uploadInit.statusCode, 201);
    const uploadPayload = uploadInit.json() as { uploadSessionId: string; mediaObjectId: string };
    assert.match(uploadPayload.uploadSessionId, /^ups_/);
    assert.match(uploadPayload.mediaObjectId, /^med_/);

    const videoId = asString(asRows(tables.videos)[0]?.id) as string;
    const video = await app.inject({
      method: 'GET',
      url: `/v1/videos/${videoId}`,
      headers: authHeaders(tables, drillAuthorId, 'coach'),
    });
    assert.equal(video.statusCode, 200);
    const videoPayload = video.json() as { annotations: unknown[] };
    assert.equal(videoPayload.annotations.length >= 1, true);

    const communityUserId = asString(asRows(tables.communityGroupMemberships)[0]?.userId) as string;
    const communityGroups = await app.inject({
      method: 'GET',
      url: '/v1/community-groups',
      headers: authHeaders(tables, communityUserId),
    });
    assert.equal(communityGroups.statusCode, 200);
    const communityPayload = communityGroups.json() as { groups: Array<{ id: string }> };
    assert.equal(communityPayload.groups.length >= 1, true);

    const groupId = communityPayload.groups[0]?.id;
    assert.ok(groupId, 'expected group id from community payload');
    const posts = await app.inject({
      method: 'GET',
      url: `/v1/posts?communityGroupId=${groupId}`,
      headers: authHeaders(tables, communityUserId),
    });
    assert.equal(posts.statusCode, 200);
    const postsPayload = posts.json() as { posts: unknown[] };
    assert.equal(postsPayload.posts.length >= 1, true);

    const messagingUserId = asString(asRows(tables.messageParticipants)[0]?.userId) as string;
    const threads = await app.inject({
      method: 'GET',
      url: '/v1/message-threads',
      headers: authHeaders(tables, messagingUserId),
    });
    assert.equal(threads.statusCode, 200);
    const threadsPayload = threads.json() as { threads: Array<{ messages: unknown[] }> };
    assert.equal(threadsPayload.threads.length >= 1, true);
    assert.equal(threadsPayload.threads[0]?.messages.length >= 1, true);

    const notificationUserId = asString(asRows(tables.notifications)[0]?.userId) as string;
    const notifications = await app.inject({
      method: 'GET',
      url: '/v1/me/notifications',
      headers: authHeaders(tables, notificationUserId),
    });
    assert.equal(notifications.statusCode, 200);
    const notificationsPayload = notifications.json() as {
      notifications: unknown[];
      preferences: unknown;
    };
    assert.equal(notificationsPayload.notifications.length >= 1, true);
    assert.equal(Boolean(notificationsPayload.preferences), true);
  });

  it('enforces admin access for trust-ops listings and returns data deletion requests', async () => {
    const tables = loadTables();
    const adminMembership = asRows(tables.userRoleMemberships).find((row) => {
      const role = asString(row.role);
      return role === 'club_admin' || role === 'security_admin';
    });
    assert.ok(adminMembership, 'expected seeded admin role membership');
    const adminUserId = asString(adminMembership.userId) as string;

    const accessGrants = await app.inject({
      method: 'GET',
      url: '/v1/access-grants',
      headers: authHeaders(tables, adminUserId, asString(adminMembership.role) as string),
    });
    assert.equal(accessGrants.statusCode, 200);
    const grantsPayload = accessGrants.json() as { grants: unknown[]; auditEvents: unknown[] };
    assert.equal(grantsPayload.grants.length >= 1, true);
    assert.equal(grantsPayload.auditEvents.length >= 1, true);

    const nonAdmin = asRows(tables.users).find((row) => {
      const userId = asString(row.id);
      if (!userId || userId === adminUserId) {
        return false;
      }
      const roles = rolesForUser(tables, userId);
      return !roles.includes('club_admin') && !roles.includes('security_admin');
    });
    assert.ok(nonAdmin, 'expected non-admin user');
    const denied = await app.inject({
      method: 'GET',
      url: '/v1/access-grants',
      headers: authHeaders(tables, asString(nonAdmin.id) as string),
    });
    assert.equal(denied.statusCode, 403);

    const runs = await app.inject({
      method: 'GET',
      url: '/v1/admin/retention-runs',
      headers: authHeaders(tables, adminUserId, asString(adminMembership.role) as string),
    });
    assert.equal(runs.statusCode, 200);
    const runsPayload = runs.json() as { runs: unknown[] };
    assert.equal(runsPayload.runs.length >= 1, true);

    const deletionRequest = asRows(tables.dataDeletionRequests)[0];
    assert.ok(deletionRequest, 'expected seeded data deletion request');
    const requesterUserId = asString(deletionRequest.requesterUserId) as string;
    const deletion = await app.inject({
      method: 'GET',
      url: '/v1/me/data-deletion-requests',
      headers: authHeaders(tables, requesterUserId),
    });
    assert.equal(deletion.statusCode, 200);
    const deletionPayload = deletion.json() as { requests: unknown[]; total: number };
    assert.equal(deletionPayload.total >= 1, true);
    assert.equal(deletionPayload.requests.length >= 1, true);
  });

  it('passes role smoke for coach, parent, and athlete with non-empty core sections', async () => {
    const tables = loadTables();

    const coachUserId = asString(asRows(tables.coachProfiles)[0]?.userId) as string;
    const coachProfile = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/profile',
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(coachProfile.statusCode, 200);
    const coachProfilePayload = coachProfile.json() as { availabilityTemplates: unknown[] };
    assert.equal(coachProfilePayload.availabilityTemplates.length >= 1, true);

    const coachOfferings = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/offerings',
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(coachOfferings.statusCode, 200);
    const coachOfferingsPayload = coachOfferings.json() as { offerings: unknown[] };
    assert.equal(coachOfferingsPayload.offerings.length >= 1, true);

    const parentParticipant = asRows(tables.bookingParticipants).find((row) =>
      Boolean(asString(row.guardianUserId)),
    );
    assert.ok(parentParticipant, 'expected booking participant with guardian');
    const parentUserId = asString(parentParticipant.guardianUserId) as string;
    const parentMe = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: authHeaders(tables, parentUserId, 'parent'),
    });
    assert.equal(parentMe.statusCode, 200);
    const parentPayload = parentMe.json() as { linkedFamilies: unknown[] };
    assert.equal(parentPayload.linkedFamilies.length >= 1, true);

    const parentBookings = await app.inject({
      method: 'GET',
      url: '/v1/bookings',
      headers: authHeaders(tables, parentUserId, 'parent'),
    });
    assert.equal(parentBookings.statusCode, 200);
    const parentBookingsPayload = parentBookings.json() as { bookings: unknown[] };
    assert.equal(parentBookingsPayload.bookings.length >= 1, true);

    const athleteParticipant = asRows(tables.bookingParticipants)[0];
    assert.ok(athleteParticipant, 'expected booking participant');
    const athleteId = asString(athleteParticipant.athleteId) as string;
    const athlete = asRows(tables.athletes).find((row) => asString(row.id) === athleteId);
    assert.ok(athlete, 'expected athlete for booking participant');
    const athleteUserId = asString(athlete.userId) as string;

    const athleteMe = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: authHeaders(tables, athleteUserId, 'athlete'),
    });
    assert.equal(athleteMe.statusCode, 200);
    const athletePayload = athleteMe.json() as { linkedAthletes: unknown[] };
    assert.equal(athletePayload.linkedAthletes.length >= 1, true);

    const athleteBookings = await app.inject({
      method: 'GET',
      url: '/v1/bookings',
      headers: authHeaders(tables, athleteUserId, 'athlete'),
    });
    assert.equal(athleteBookings.statusCode, 200);
    const athleteBookingsPayload = athleteBookings.json() as { bookings: unknown[] };
    assert.equal(athleteBookingsPayload.bookings.length >= 1, true);
  });

  it('covers account edge cases for parent-no-kids and member club-link state', async () => {
    const tables = loadTables();
    const guardianUserIds = new Set(
      asRows(tables.guardianChildLinks)
        .map((row) => asString(row.guardianUserId))
        .filter((userId): userId is string => Boolean(userId)),
    );
    const familyMemberUserIds = new Set(
      asRows(tables.familyMemberships)
        .map((row) => asString(row.userId))
        .filter((userId): userId is string => Boolean(userId)),
    );
    const clubMemberUserIds = new Set(
      asRows(tables.clubMemberships)
        .map((row) => asString(row.userId))
        .filter((userId): userId is string => Boolean(userId)),
    );

    const parentNoKidsUserId = asRows(tables.userRoleMemberships)
      .filter((row) => asString(row.role) === 'parent')
      .map((row) => asString(row.userId))
      .find((userId): userId is string => Boolean(userId) && !guardianUserIds.has(userId as string));
    assert.ok(parentNoKidsUserId, 'expected seeded parent user with no kids');
    const parentNoKidsId = parentNoKidsUserId as string;

    const parentNoKidsMe = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: authHeaders(tables, parentNoKidsId, 'parent'),
    });
    assert.equal(parentNoKidsMe.statusCode, 200);
    const parentNoKidsPayload = parentNoKidsMe.json() as { linkedFamilies: unknown[]; linkedAthletes: unknown[] };
    assert.equal(parentNoKidsPayload.linkedFamilies.length, 0);
    assert.equal(parentNoKidsPayload.linkedAthletes.length, 0);

    const parentNoKidsBookings = await app.inject({
      method: 'GET',
      url: '/v1/bookings',
      headers: authHeaders(tables, parentNoKidsId, 'parent'),
    });
    assert.equal(parentNoKidsBookings.statusCode, 200);
    const parentNoKidsBookingsPayload = parentNoKidsBookings.json() as { bookings: unknown[] };
    assert.equal(parentNoKidsBookingsPayload.bookings.length, 0);

    const memberUserIds = asRows(tables.userRoleMemberships)
      .filter((row) => asString(row.role) === 'member')
      .map((row) => asString(row.userId))
      .filter((userId): userId is string => Boolean(userId));

    const standaloneMemberUserId = memberUserIds.find(
      (userId) => !familyMemberUserIds.has(userId) && !clubMemberUserIds.has(userId),
    );
    assert.ok(standaloneMemberUserId, 'expected standalone member with no family and no club');
    const standaloneMemberId = standaloneMemberUserId as string;

    const standaloneMemberClubs = await app.inject({
      method: 'GET',
      url: '/v1/clubs',
      headers: authHeaders(tables, standaloneMemberId, 'member'),
    });
    assert.equal(standaloneMemberClubs.statusCode, 200);
    const standaloneMemberClubsPayload = standaloneMemberClubs.json() as { clubs: unknown[]; total: number };
    assert.equal(standaloneMemberClubsPayload.total, 0);
    assert.equal(standaloneMemberClubsPayload.clubs.length, 0);

    const clubLinkedMemberUserId = memberUserIds.find((userId) => clubMemberUserIds.has(userId));
    assert.ok(clubLinkedMemberUserId, 'expected club-linked member user');
    const clubLinkedMemberId = clubLinkedMemberUserId as string;

    const clubLinkedMemberClubs = await app.inject({
      method: 'GET',
      url: '/v1/clubs',
      headers: authHeaders(tables, clubLinkedMemberId, 'member'),
    });
    assert.equal(clubLinkedMemberClubs.statusCode, 200);
    const clubLinkedMemberClubsPayload = clubLinkedMemberClubs.json() as { total: number };
    assert.equal(clubLinkedMemberClubsPayload.total >= 1, true);
  });
});
