import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { after, beforeEach, describe, it } from 'node:test';
import { env } from '@clubroom/config';
import { buildApp } from '../../app.js';
import { getDbFixtureStore, resetDbFixtureStoreForTests } from '../../lib/db-fixture-store.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { resetMarketplaceSeedStoreForTests } from '../../lib/marketplace-seed-store.js';
import { recordUploadMalwareScanResult } from '../../lib/storage-runtime.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;
const asRecord = (value: unknown): SeedRow | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as SeedRow) : undefined;
const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
const tokenFromHostedUrl = (value: string): string =>
  new URL(value, 'http://clubroom.test').searchParams.get('token') ?? '';

function ensureRows(tables: SeedTables, key: string): SeedRow[] {
  if (!Array.isArray(tables[key])) {
    tables[key] = [];
  }
  return tables[key];
}

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

function findBillableBookingWithoutInvoice(tables: SeedTables): SeedRow | undefined {
  const invoicedBookingIds = new Set(
    asRows(tables.invoices)
      .map((row) => asString(row.bookingId))
      .filter((bookingId): bookingId is string => Boolean(bookingId)),
  );

  return asRows(tables.bookings).find((row) => {
    const bookingId = asString(row.id);
    if (!bookingId || invoicedBookingIds.has(bookingId) || asString(row.deletedAt)) {
      return false;
    }
    if ((asNumber(row.priceMinor) ?? 0) <= 0) {
      return false;
    }
    return asRows(tables.bookingParticipants).some(
      (participant) =>
        asString(participant.bookingId) === bookingId &&
        !asString(participant.deletedAt) &&
        Boolean(asString(participant.athleteId)),
    );
  });
}

function prepareCancellableBillableBookingWithoutInvoice(tables: SeedTables): SeedRow | undefined {
  const booking = findBillableBookingWithoutInvoice(tables);
  if (!booking) {
    return undefined;
  }
  const scheduledAt = new Date();
  scheduledAt.setUTCDate(scheduledAt.getUTCDate() + 14);
  scheduledAt.setUTCHours(18, 0, 0, 0);
  booking.status = 'CONFIRMED';
  booking.scheduledAt = scheduledAt.toISOString();
  booking.cancelledByUserId = null;
  booking.cancelledAt = null;
  booking.cancelReason = null;
  booking.version = 1;
  return booking;
}

function findUnprivilegedUserId(tables: SeedTables, excludedUserIds: Set<string>): string {
  const userId = asRows(tables.users)
    .map((row) => asString(row.id))
    .find((candidateUserId): candidateUserId is string => {
      if (!candidateUserId || excludedUserIds.has(candidateUserId)) {
        return false;
      }
      const roles = rolesForUser(tables, candidateUserId);
      return !roles.includes('club_admin') && !roles.includes('security_admin');
    });
  assert.ok(userId, 'expected non-admin outsider user');
  return userId;
}

function findNonPrivilegedUserId(tables: SeedTables, excludedUserIds: Set<string>): string {
  const userId = asRows(tables.users)
    .map((row) => asString(row.id))
    .find((candidateUserId): candidateUserId is string => {
      if (!candidateUserId || excludedUserIds.has(candidateUserId)) {
        return false;
      }
      const roles = rolesForUser(tables, candidateUserId);
      return (
        !roles.includes('club_admin') &&
        !roles.includes('admin') &&
        !roles.includes('security_admin')
      );
    });
  assert.ok(userId, 'expected non-privileged user');
  return userId;
}

function mutableRows(tables: SeedTables, tableName: string): SeedRow[] {
  if (!Array.isArray(tables[tableName])) {
    tables[tableName] = [];
  }
  return tables[tableName] as SeedRow[];
}

function findUserWithoutAthleteHealthAccess(
  tables: SeedTables,
  athleteId: string,
  excludedUserIds = new Set<string>(),
): string {
  const athleteUserId = athleteId.startsWith('ath_') ? `usr_${athleteId.slice(4)}` : athleteId;
  const guardianUserIds = new Set(
    asRows(tables.guardianChildLinks)
      .filter((row) => asString(row.athleteId) === athleteId)
      .map((row) => asString(row.guardianUserId))
      .filter((userId): userId is string => Boolean(userId)),
  );
  const relatedCoachUserIds = new Set<string>();
  const athleteBookingIds = new Set(
    asRows(tables.bookingParticipants)
      .filter(
        (participant) =>
          asString(participant.athleteId) === athleteId && !asString(participant.deletedAt),
      )
      .map((participant) => asString(participant.bookingId))
      .filter((bookingId): bookingId is string => Boolean(bookingId)),
  );
  for (const booking of asRows(tables.bookings)) {
    const bookingId = asString(booking.id);
    const coachUserId = asString(booking.coachUserId);
    if (
      bookingId &&
      coachUserId &&
      athleteBookingIds.has(bookingId) &&
      !asString(booking.deletedAt)
    ) {
      relatedCoachUserIds.add(coachUserId);
    }
  }
  const athleteGroupSessionIds = new Set(
    asRows(tables.groupSessionRegistrations)
      .filter(
        (registration) =>
          asString(registration.athleteId) === athleteId && !asString(registration.deletedAt),
      )
      .map((registration) => asString(registration.groupSessionId))
      .filter((sessionId): sessionId is string => Boolean(sessionId)),
  );
  for (const session of asRows(tables.groupSessions)) {
    const sessionId = asString(session.id);
    const coachUserId = asString(session.coachUserId);
    if (
      sessionId &&
      coachUserId &&
      athleteGroupSessionIds.has(sessionId) &&
      !asString(session.deletedAt)
    ) {
      relatedCoachUserIds.add(coachUserId);
    }
  }
  const athleteSquadIds = new Set(
    asRows(tables.squadMemberships)
      .filter(
        (membership) =>
          asString(membership.athleteId) === athleteId && !asString(membership.deletedAt),
      )
      .map((membership) => asString(membership.squadId))
      .filter((squadId): squadId is string => Boolean(squadId)),
  );
  for (const squad of asRows(tables.squads)) {
    const squadId = asString(squad.id);
    const ownerCoachUserId = asString(squad.ownerCoachUserId);
    if (squadId && ownerCoachUserId && athleteSquadIds.has(squadId) && !asString(squad.deletedAt)) {
      relatedCoachUserIds.add(ownerCoachUserId);
    }
  }

  const userId = asRows(tables.users)
    .map((row) => asString(row.id))
    .find((candidateUserId): candidateUserId is string => {
      if (
        !candidateUserId ||
        candidateUserId === athleteUserId ||
        excludedUserIds.has(candidateUserId) ||
        guardianUserIds.has(candidateUserId) ||
        relatedCoachUserIds.has(candidateUserId)
      ) {
        return false;
      }
      const roles = rolesForUser(tables, candidateUserId);
      return (
        !roles.includes('club_admin') &&
        !roles.includes('admin') &&
        !roles.includes('security_admin')
      );
    });
  assert.ok(userId, 'expected user without athlete health access');
  return userId;
}

function findPrivilegedAdminUserId(
  tables: SeedTables,
  excludedUserIds = new Set<string>(),
): string {
  const userId = asRows(tables.users)
    .map((row) => asString(row.id))
    .find((candidateUserId): candidateUserId is string => {
      if (!candidateUserId || excludedUserIds.has(candidateUserId)) {
        return false;
      }
      const roles = rolesForUser(tables, candidateUserId);
      return (
        roles.includes('club_admin') || roles.includes('admin') || roles.includes('security_admin')
      );
    });
  assert.ok(userId, 'expected privileged admin user');
  return userId;
}

const STAFF_POST_ROLES = new Set(['ADMIN', 'CLUB_ADMIN', 'COACH', 'HEAD_COACH', 'OWNER', 'STAFF']);

function isActiveMembership(row: SeedRow): boolean {
  return asString(row.deletedAt) == null && row.active !== false;
}

function normalizedRole(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

function canStaffPost(value: unknown): boolean {
  return STAFF_POST_ROLES.has(normalizedRole(value));
}

function findClubPostActors(tables: SeedTables): {
  clubId: string;
  staffUserId: string;
  staffRole: string;
  memberUserId: string;
  memberUserIds: Set<string>;
} {
  for (const staffMembership of asRows(tables.clubMemberships)) {
    const clubId = asString(staffMembership.clubId);
    const staffUserId = asString(staffMembership.userId);
    if (
      !clubId ||
      !staffUserId ||
      !isActiveMembership(staffMembership) ||
      !canStaffPost(staffMembership.role)
    ) {
      continue;
    }

    const clubMembers = asRows(tables.clubMemberships).filter(
      (row) =>
        asString(row.clubId) === clubId && isActiveMembership(row) && Boolean(asString(row.userId)),
    );
    const memberMembership = clubMembers.find((row) => !canStaffPost(row.role));
    const memberUserId = asString(memberMembership?.userId);
    if (!memberUserId) {
      continue;
    }

    return {
      clubId,
      staffUserId,
      staffRole: normalizedRole(staffMembership.role).toLowerCase(),
      memberUserId,
      memberUserIds: new Set(
        clubMembers
          .map((row) => asString(row.userId))
          .filter((userId): userId is string => Boolean(userId)),
      ),
    };
  }

  throw new Error('expected club with active staff and member actors');
}

function squadCommunityGroupEligibleUserIds(tables: SeedTables, squadId: string): Set<string> {
  const squad = asRows(tables.squads).find(
    (row) => asString(row.id) === squadId && !asString(row.deletedAt),
  );
  const eligibleUserIds = new Set<string>();
  const ownerCoachUserId = asString(squad?.ownerCoachUserId);
  if (ownerCoachUserId) {
    eligibleUserIds.add(ownerCoachUserId);
  }
  const athleteIds = new Set(
    asRows(tables.squadMemberships)
      .filter((membership) => {
        const status = asString(membership.status)?.toLowerCase();
        return (
          asString(membership.squadId) === squadId &&
          !asString(membership.deletedAt) &&
          (!status || status === 'active')
        );
      })
      .map((membership) => asString(membership.athleteId))
      .filter((athleteId): athleteId is string => Boolean(athleteId)),
  );
  for (const athlete of asRows(tables.athletes)) {
    const athleteId = asString(athlete.id);
    if (
      athleteId &&
      athleteIds.has(athleteId) &&
      asString(athlete.status)?.toLowerCase() !== 'inactive' &&
      !asString(athlete.deletedAt)
    ) {
      const userId = asString(athlete.userId);
      if (userId) {
        eligibleUserIds.add(userId);
      }
    }
  }
  for (const link of asRows(tables.guardianChildLinks)) {
    const athleteId = asString(link.athleteId);
    const guardianUserId = asString(link.guardianUserId);
    if (athleteId && guardianUserId && athleteIds.has(athleteId) && !asString(link.deletedAt)) {
      eligibleUserIds.add(guardianUserId);
    }
  }
  return eligibleUserIds;
}

function findSquadGroupMemberUserId(
  tables: SeedTables,
  squadId: string,
  candidateUserIds: Set<string>,
): string {
  const eligibleUserIds = squadCommunityGroupEligibleUserIds(tables, squadId);
  const userId = [...candidateUserIds].find((candidate) => eligibleUserIds.has(candidate));
  assert.ok(userId, 'expected a squad-linked club member for community group tests');
  return userId;
}

function findNonSquadClubMemberUserId(
  tables: SeedTables,
  squadId: string,
  candidateUserIds: Set<string>,
  excludedUserIds: Set<string>,
): string {
  const eligibleUserIds = squadCommunityGroupEligibleUserIds(tables, squadId);
  const userId = [...candidateUserIds].find(
    (candidate) => !eligibleUserIds.has(candidate) && !excludedUserIds.has(candidate),
  );
  assert.ok(userId, 'expected a non-squad club member for community group denial tests');
  return userId;
}

function findDirectMessageThreadActors(tables: SeedTables): {
  threadId: string;
  senderUserId: string;
  otherUserId: string;
  existingMessageId: string;
  participantUserIds: Set<string>;
} {
  for (const thread of asRows(tables.messageThreads)) {
    const threadId = asString(thread.id);
    if (!threadId || asString(thread.threadType) !== 'DIRECT' || asString(thread.deletedAt)) {
      continue;
    }

    const participants = asRows(tables.messageParticipants).filter(
      (row) => asString(row.messageThreadId) === threadId && asString(row.leftAt) == null,
    );
    const participantUserIds = participants
      .map((row) => asString(row.userId))
      .filter((userId): userId is string => Boolean(userId));
    if (participantUserIds.length < 2) {
      continue;
    }

    const messages = asRows(tables.messages).filter(
      (row) => asString(row.messageThreadId) === threadId && !asString(row.deletedAt),
    );
    const existingMessage = messages.find(
      (row) => asString(row.senderUserId) === participantUserIds[0],
    );
    const existingMessageId = asString(existingMessage?.id);
    if (!existingMessageId) {
      continue;
    }

    return {
      threadId,
      senderUserId: participantUserIds[0] as string,
      otherUserId: participantUserIds[1] as string,
      existingMessageId,
      participantUserIds: new Set(participantUserIds),
    };
  }

  throw new Error('expected direct message thread with participants and messages');
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

function auditEventsFor(
  tables: SeedTables,
  filters: { action?: string; resourceId?: string; result?: string },
): SeedRow[] {
  return asRows(tables.auditEvents).filter((row) => {
    if (filters.action && asString(row.action) !== filters.action) {
      return false;
    }
    if (filters.resourceId && asString(row.resourceId) !== filters.resourceId) {
      return false;
    }
    if (filters.result && asString(row.result) !== filters.result) {
      return false;
    }
    return true;
  });
}

async function withStorageEnv(run: () => Promise<void>): Promise<void> {
  const previousEndpoint = env.S3_ENDPOINT;
  const previousBucket = env.S3_BUCKET_PRIVATE;
  const previousRegion = env.S3_REGION;
  const previousAccessKey = env.S3_ACCESS_KEY_ID;
  const previousSecret = env.S3_SECRET_ACCESS_KEY;

  env.S3_ENDPOINT = 'https://storage.clubroom.test';
  env.S3_BUCKET_PRIVATE = 'clubroom-private';
  env.S3_REGION = 'eu-west-2';
  env.S3_ACCESS_KEY_ID = 'clubroom-access';
  env.S3_SECRET_ACCESS_KEY = 'clubroom-secret';

  try {
    await run();
  } finally {
    env.S3_ENDPOINT = previousEndpoint;
    env.S3_BUCKET_PRIVATE = previousBucket;
    env.S3_REGION = previousRegion;
    env.S3_ACCESS_KEY_ID = previousAccessKey;
    env.S3_SECRET_ACCESS_KEY = previousSecret;
  }
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
    const tables = loadTables();
    const adminUserId = asRows(tables.users)
      .map((row) => asString(row.id))
      .find((userId): userId is string => {
        if (!userId) {
          return false;
        }
        const roles = rolesForUser(tables, userId);
        return (
          roles.includes('security_admin') ||
          roles.includes('admin') ||
          roles.includes('club_admin')
        );
      });
    assert.ok(adminUserId, 'expected privileged admin user');
    const coachUserId = asString(asRows(tables.coachProfiles)[0]?.userId) as string;

    const unauthenticated = await app.inject({
      method: 'GET',
      url: '/v1/meta/seed-health',
    });
    assert.equal(unauthenticated.statusCode, 403);

    const deniedCoach = await app.inject({
      method: 'GET',
      url: '/v1/meta/seed-health',
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(deniedCoach.statusCode, 403);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/meta/seed-health',
      headers: authHeaders(tables, adminUserId),
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
      const tables = loadTables();
      const adminUserId = asRows(tables.users)
        .map((row) => asString(row.id))
        .find((userId): userId is string => {
          if (!userId) {
            return false;
          }
          const roles = rolesForUser(tables, userId);
          return (
            roles.includes('security_admin') ||
            roles.includes('admin') ||
            roles.includes('club_admin')
          );
        });
      assert.ok(adminUserId, 'expected privileged admin user');
      const res = await app.inject({
        method: 'GET',
        url: '/v1/meta/seed-health',
        headers: authHeaders(tables, adminUserId),
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
      invoice: { id: string; coachId: string; userId: string; total: number; status: string };
      lineItems: unknown[];
      events: unknown[];
      paymentInstructionTemplates: unknown[];
    };
    assert.equal(okPayload.invoice.id, invoiceId);
    assert.equal(okPayload.invoice.coachId, coachUserId);
    assert.equal(okPayload.invoice.userId, payerUserId);
    assert.equal(typeof okPayload.invoice.total, 'number');
    assert.equal(okPayload.invoice.status, asString(invoice.status));
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

  it('lists accessible invoices with filters in app invoice shape', async () => {
    const tables = loadTables();
    const sentInvoice = asRows(tables.invoices).find((row) => asString(row.status) === 'SENT');
    assert.ok(sentInvoice, 'expected seeded SENT invoice');
    const coachUserId = asString(sentInvoice.coachUserId) as string;
    const bookingId = asString(sentInvoice.bookingId) as string;

    const list = await app.inject({
      method: 'GET',
      url: `/v1/invoices?status=SENT&coachId=${coachUserId}`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(list.statusCode, 200);

    const payload = list.json() as {
      total: number;
      invoices: Array<{
        id: string;
        coachId: string;
        userId: string;
        bookingId: string;
        total: number;
        status: string;
      }>;
    };
    assert.equal(payload.total >= 1, true);
    assert.equal(
      payload.invoices.every((invoice) => invoice.coachId === coachUserId),
      true,
    );
    assert.equal(
      payload.invoices.every((invoice) => invoice.status === 'SENT'),
      true,
    );
    assert.equal(
      payload.invoices.every((invoice) => typeof invoice.total === 'number'),
      true,
    );
    assert.equal(
      payload.invoices.every((invoice) => Boolean(invoice.userId)),
      true,
    );

    const bookingLookup = await app.inject({
      method: 'GET',
      url: `/v1/invoices?bookingId=${bookingId}`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(bookingLookup.statusCode, 200);
    const bookingPayload = bookingLookup.json() as { invoices: Array<{ bookingId: string }> };
    assert.equal(bookingPayload.invoices.length, 1);
    assert.equal(bookingPayload.invoices[0]?.bookingId, bookingId);
  });

  it('creates a hosted invoice payment session and only marks paid after backend confirmation', async () => {
    const tables = loadTables();
    const sentInvoice = asRows(tables.invoices).find((row) => asString(row.status) === 'SENT');
    assert.ok(sentInvoice, 'expected seeded SENT invoice');
    const invoiceId = asString(sentInvoice.id) as string;
    const coachUserId = asString(sentInvoice.coachUserId) as string;
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
        idempotencyKey: 'unauthorized-payment-attempt',
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

    const sessionCreated = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${invoiceId}/payments`,
      headers: authHeaders(tables, payerUserId, 'parent'),
      payload: {
        method: 'card',
        idempotencyKey: 'seed-payment-test-key',
      },
    });
    assert.equal(sessionCreated.statusCode, 201);
    const sessionPayload = sessionCreated.json() as {
      invoiceStatus: string;
      paymentSession: {
        attemptId: string;
        status: string;
        amountMinor: number;
        nextAction: { type: string; url?: string };
      };
    };
    assert.equal(sessionPayload.invoiceStatus, 'SENT');
    assert.equal(sessionPayload.paymentSession.status, 'ACTION_REQUIRED');
    assert.equal(sessionPayload.paymentSession.amountMinor, totalMinor);
    assert.equal(sessionPayload.paymentSession.nextAction.type, 'open_url');
    assert.equal(Boolean(sessionPayload.paymentSession.attemptId), true);
    assert.equal(
      sessionPayload.paymentSession.nextAction.url?.includes(
        `/v1/payment-attempts/${sessionPayload.paymentSession.attemptId}/hosted`,
      ),
      true,
    );

    const invoiceBeforeComplete = await app.inject({
      method: 'GET',
      url: `/v1/invoices/${invoiceId}`,
      headers: authHeaders(tables, payerUserId, 'parent'),
    });
    assert.equal(invoiceBeforeComplete.statusCode, 200);
    const invoiceBeforePayload = invoiceBeforeComplete.json() as {
      invoice: { status: string };
      events: Array<{ eventType?: string; actorUserId?: string }>;
      paymentAttempts: Array<{ id: string; status: string }>;
    };
    assert.equal(invoiceBeforePayload.invoice.status, 'SENT');
    assert.equal(
      invoiceBeforePayload.events.some(
        (event) =>
          event.eventType === 'PAYMENT_SESSION_CREATED' && event.actorUserId === payerUserId,
      ),
      true,
    );
    assert.equal(
      invoiceBeforePayload.paymentAttempts.some(
        (attempt) =>
          attempt.id === sessionPayload.paymentSession.attemptId &&
          attempt.status === 'ACTION_REQUIRED',
      ),
      true,
    );

    const token = tokenFromHostedUrl(sessionPayload.paymentSession.nextAction.url ?? '');
    assert.equal(Boolean(token), true);

    const completed = await app.inject({
      method: 'POST',
      url: `/v1/payment-attempts/${sessionPayload.paymentSession.attemptId}/simulated-complete`,
      payload: { token },
    });
    assert.equal(completed.statusCode, 200);
    const completedPayload = completed.json() as {
      invoiceStatus: string;
      alreadyCompleted: boolean;
    };
    assert.equal(completedPayload.invoiceStatus, 'PAID');
    assert.equal(completedPayload.alreadyCompleted, false);

    const invoiceAfter = await app.inject({
      method: 'GET',
      url: `/v1/invoices/${invoiceId}`,
      headers: authHeaders(tables, payerUserId, 'parent'),
    });
    assert.equal(invoiceAfter.statusCode, 200);
    const invoiceAfterPayload = invoiceAfter.json() as {
      invoice: { status: string };
      events: Array<{ eventType?: string; actorUserId?: string }>;
      paymentAttempts: Array<{ id: string; status: string; confirmedAt?: string | null }>;
      reconcilerEntry: { state?: string } | null;
    };
    assert.equal(invoiceAfterPayload.invoice.status, 'PAID');
    assert.equal(
      invoiceAfterPayload.events.some(
        (event) => event.eventType === 'MARKED_PAID' && event.actorUserId === payerUserId,
      ),
      true,
    );
    assert.equal(
      invoiceAfterPayload.paymentAttempts.some(
        (attempt) =>
          attempt.id === sessionPayload.paymentSession.attemptId &&
          attempt.status === 'COMPLETED' &&
          Boolean(attempt.confirmedAt),
      ),
      true,
    );
    assert.equal(invoiceAfterPayload.reconcilerEntry?.state, 'PAID');

    const idempotentComplete = await app.inject({
      method: 'POST',
      url: `/v1/payment-attempts/${sessionPayload.paymentSession.attemptId}/simulated-complete`,
      payload: { token },
    });
    assert.equal(idempotentComplete.statusCode, 200);
    const idempotentPayload = idempotentComplete.json() as {
      alreadyCompleted: boolean;
      invoiceStatus: string;
    };
    assert.equal(idempotentPayload.alreadyCompleted, true);
    assert.equal(idempotentPayload.invoiceStatus, 'PAID');

    const providerMarkUnpaid = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${invoiceId}/mark-unpaid`,
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: { reason: 'Trying to undo provider-confirmed payment manually' },
    });
    assert.equal(providerMarkUnpaid.statusCode, 400);
  });

  it('records structured manual receipts and cancels active hosted attempts', async () => {
    const tables = loadTables();
    const sentInvoice = asRows(tables.invoices).find((row) => asString(row.status) === 'SENT');
    assert.ok(sentInvoice, 'expected seeded SENT invoice');
    const invoiceId = asString(sentInvoice.id) as string;
    const coachUserId = asString(sentInvoice.coachUserId) as string;
    const payerUserId = asString(sentInvoice.payerUserId) as string;
    const totalMinor = asNumber(sentInvoice.totalMinor) as number;

    const sessionCreated = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${invoiceId}/payments`,
      headers: authHeaders(tables, payerUserId, 'parent'),
      payload: {
        method: 'card',
        idempotencyKey: 'manual-receipt-cancels-hosted-attempt',
      },
    });
    assert.equal(sessionCreated.statusCode, 201);
    const sessionPayload = sessionCreated.json() as {
      paymentSession: {
        attemptId: string;
        nextAction: { url?: string };
      };
    };
    const token = tokenFromHostedUrl(sessionPayload.paymentSession.nextAction.url ?? '');
    assert.equal(Boolean(token), true);

    const invalidManualReceipt = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${invoiceId}/mark-paid`,
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        method: 'cash',
        amountMinor: totalMinor - 1,
        reason: 'Cash short count',
      },
    });
    assert.equal(invalidManualReceipt.statusCode, 400);

    const markPaid = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${invoiceId}/mark-paid`,
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        method: 'bank_transfer',
        amountMinor: totalMinor,
        receivedAt: '2026-07-03T10:15:00.000Z',
        reference: 'BANK-REF-123',
        note: 'Matched against bank feed',
        reason: 'Bank transfer received',
      },
    });
    assert.equal(markPaid.statusCode, 200);

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/invoices/${invoiceId}`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(detail.statusCode, 200);
    const detailPayload = detail.json() as {
      invoice: { status: string };
      events: Array<{
        eventType?: string;
        metadataJson?: {
          source?: string;
          manualReceipt?: {
            method?: string;
            amountMinor?: number;
            receivedAt?: string;
            receivedByUserId?: string;
            reference?: string | null;
            note?: string | null;
          };
          canceledPaymentAttemptIds?: string[];
        };
      }>;
      paymentAttempts: Array<{ id: string; status: string; canceledAt?: string | null }>;
    };
    assert.equal(detailPayload.invoice.status, 'PAID');
    assert.equal(
      detailPayload.events.some(
        (event) =>
          event.eventType === 'MARKED_PAID' &&
          event.metadataJson?.source === 'manual-receipt' &&
          event.metadataJson.manualReceipt?.method === 'bank_transfer' &&
          event.metadataJson.manualReceipt.amountMinor === totalMinor &&
          event.metadataJson.manualReceipt.receivedAt === '2026-07-03T10:15:00.000Z' &&
          event.metadataJson.manualReceipt.receivedByUserId === coachUserId &&
          event.metadataJson.manualReceipt.reference === 'BANK-REF-123' &&
          event.metadataJson.manualReceipt.note === 'Matched against bank feed' &&
          event.metadataJson.canceledPaymentAttemptIds?.includes(
            sessionPayload.paymentSession.attemptId,
          ),
      ),
      true,
    );
    assert.equal(
      detailPayload.paymentAttempts.some(
        (attempt) =>
          attempt.id === sessionPayload.paymentSession.attemptId &&
          attempt.status === 'CANCELED' &&
          Boolean(attempt.canceledAt),
      ),
      true,
    );

    const completeCanceledAttempt = await app.inject({
      method: 'POST',
      url: `/v1/payment-attempts/${sessionPayload.paymentSession.attemptId}/simulated-complete`,
      payload: { token },
    });
    assert.equal(completeCanceledAttempt.statusCode, 400);
  });

  it('rejects simulated completion for non-simulated payment attempts', async () => {
    const tables = getMarketplaceSeedStore().tables as SeedTables;
    const sentInvoice = asRows(tables.invoices).find((row) => asString(row.status) === 'SENT');
    assert.ok(sentInvoice, 'expected seeded SENT invoice');
    const invoiceId = asString(sentInvoice.id) as string;
    const payerUserId = asString(sentInvoice.payerUserId) as string;

    const sessionCreated = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${invoiceId}/payments`,
      headers: authHeaders(tables, payerUserId, 'parent'),
      payload: {
        method: 'card',
        idempotencyKey: 'future-provider-simulated-complete-deny',
      },
    });
    assert.equal(sessionCreated.statusCode, 201);
    const sessionPayload = sessionCreated.json() as {
      paymentSession: { attemptId: string; nextAction: { url?: string } };
    };
    const token = tokenFromHostedUrl(sessionPayload.paymentSession.nextAction.url ?? '');
    assert.equal(Boolean(token), true);

    const attemptRow = asRows(tables.paymentAttempts).find(
      (row) => asString(row.id) === sessionPayload.paymentSession.attemptId,
    );
    assert.ok(attemptRow, 'expected payment attempt row');
    attemptRow.provider = 'stripe';

    const completed = await app.inject({
      method: 'POST',
      url: `/v1/payment-attempts/${sessionPayload.paymentSession.attemptId}/simulated-complete`,
      payload: { token },
    });
    assert.equal(completed.statusCode, 400);

    const storedInvoice = asRows(tables.invoices).find((row) => asString(row.id) === invoiceId);
    assert.equal(asString(storedInvoice?.status), 'SENT');
    assert.equal(asString(attemptRow.status), 'ACTION_REQUIRED');
    assert.equal(asString(attemptRow.confirmedAt), undefined);
  });

  it('allows club owner and admin finance actors to reconcile club-linked invoices', async () => {
    const tables = getMarketplaceSeedStore().tables;
    const clubId = asString(asRows(tables.clubs)[0]?.id) as string;
    assert.ok(clubId, 'expected seeded club');
    const coachUserId = asString(
      asRows(tables.clubMemberships).find(
        (row) => asString(row.clubId) === clubId && asString(row.role) === 'coach',
      )?.userId,
    ) as string;
    assert.ok(coachUserId, 'expected seeded club coach');

    const excludedUserIds = new Set([coachUserId]);
    const payerUserId = findNonPrivilegedUserId(tables, excludedUserIds);
    excludedUserIds.add(payerUserId);
    const ownerUserId = findNonPrivilegedUserId(tables, excludedUserIds);
    excludedUserIds.add(ownerUserId);
    const adminUserId = findNonPrivilegedUserId(tables, excludedUserIds);
    excludedUserIds.add(adminUserId);
    const assistantUserId = findNonPrivilegedUserId(tables, excludedUserIds);
    excludedUserIds.add(assistantUserId);
    const memberUserId = findNonPrivilegedUserId(tables, excludedUserIds);

    const now = '2026-07-03T12:00:00.000Z';
    const groupSessionId = 'gse_invoice_finance_auth';
    const bookingId = 'bok_invoice_finance_auth';
    const invoiceId = 'inv_invoice_finance_auth';
    const totalMinor = 1800;

    mutableRows(tables, 'clubMemberships').push(
      {
        id: 'cmb_invoice_finance_owner',
        clubId,
        userId: ownerUserId,
        role: 'OWNER',
        active: true,
        createdByUserId: ownerUserId,
        updatedByUserId: ownerUserId,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
      {
        id: 'cmb_invoice_finance_admin',
        clubId,
        userId: adminUserId,
        role: 'ADMIN',
        active: true,
        createdByUserId: ownerUserId,
        updatedByUserId: ownerUserId,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
      {
        id: 'cmb_invoice_finance_assistant',
        clubId,
        userId: assistantUserId,
        role: 'ASSISTANT',
        active: true,
        createdByUserId: ownerUserId,
        updatedByUserId: ownerUserId,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
      {
        id: 'cmb_invoice_finance_member',
        clubId,
        userId: memberUserId,
        role: 'MEMBER',
        active: true,
        createdByUserId: ownerUserId,
        updatedByUserId: ownerUserId,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    );
    mutableRows(tables, 'groupSessions').push({
      id: groupSessionId,
      clubId,
      coachUserId,
      title: 'Wednesday academy block',
      sessionType: 'Group Session',
      maxParticipants: 12,
      currentParticipants: 1,
      status: 'PUBLISHED',
      scheduleJson: [],
      createdByUserId: ownerUserId,
      updatedByUserId: ownerUserId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    mutableRows(tables, 'bookings').push({
      id: bookingId,
      coachUserId,
      bookedByUserId: payerUserId,
      clubId: null,
      groupSessionId,
      status: 'CONFIRMED',
      scheduledAt: now,
      durationMinutes: 60,
      location: 'Tom School Pitch',
      serviceType: 'Group Session',
      priceMinor: totalMinor,
      currency: 'GBP',
      createdByUserId: payerUserId,
      updatedByUserId: payerUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    mutableRows(tables, 'invoices').push({
      id: invoiceId,
      invoiceNumber: 'INV-CLUB-FINANCE-AUTH',
      bookingId,
      coachUserId,
      payerUserId,
      status: 'SENT',
      sessionDate: now,
      sessionType: 'Group Session',
      sessionLocation: 'Tom School Pitch',
      sessionDurationMinutes: 60,
      subtotalMinor: totalMinor,
      taxMinor: 0,
      taxRatePercent: 0,
      totalMinor,
      currency: 'GBP',
      dueDate: '2026-07-10T12:00:00.000Z',
      createdByUserId: coachUserId,
      updatedByUserId: coachUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    mutableRows(tables, 'invoiceLineItems').push({
      id: 'ili_invoice_finance_auth',
      invoiceId,
      description: 'Wednesday academy block',
      quantity: 1,
      unitAmountMinor: totalMinor,
      lineSubtotalMinor: totalMinor,
      taxRatePercent: 0,
      taxMinor: 0,
      totalMinor,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    });

    for (const deniedUserId of [assistantUserId, memberUserId]) {
      const denied = await app.inject({
        method: 'POST',
        url: `/v1/invoices/${invoiceId}/mark-paid`,
        headers: authHeaders(tables, deniedUserId),
        payload: {
          method: 'cash',
          amountMinor: totalMinor,
          reason: 'Trying to reconcile outside finance role',
        },
      });
      assert.equal(denied.statusCode, 403);
    }

    const assistantList = await app.inject({
      method: 'GET',
      url: `/v1/invoices?bookingId=${bookingId}`,
      headers: authHeaders(tables, assistantUserId),
    });
    assert.equal(assistantList.statusCode, 200);
    const assistantListPayload = assistantList.json() as {
      invoices: Array<{ id: string }>;
      total: number;
    };
    assert.equal(
      assistantListPayload.invoices.some((invoice) => invoice.id === invoiceId),
      false,
    );

    const ownerList = await app.inject({
      method: 'GET',
      url: `/v1/invoices?bookingId=${bookingId}`,
      headers: authHeaders(tables, ownerUserId),
    });
    assert.equal(ownerList.statusCode, 200);
    const ownerListPayload = ownerList.json() as {
      invoices: Array<{ id: string; bookingId: string }>;
      total: number;
    };
    assert.equal(
      ownerListPayload.invoices.some((invoice) => invoice.id === invoiceId),
      true,
    );

    const ownerDetail = await app.inject({
      method: 'GET',
      url: `/v1/invoices/${invoiceId}`,
      headers: authHeaders(tables, ownerUserId),
    });
    assert.equal(ownerDetail.statusCode, 200);

    const ownerMarkPaid = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${invoiceId}/mark-paid`,
      headers: authHeaders(tables, ownerUserId),
      payload: {
        method: 'cash',
        amountMinor: totalMinor,
        receivedAt: now,
        reason: 'Cash received by provider owner',
      },
    });
    assert.equal(ownerMarkPaid.statusCode, 200);
    const paidPayload = ownerMarkPaid.json() as {
      invoice: { status: string };
      events: Array<{
        eventType?: string;
        metadataJson?: { manualReceipt?: { receivedByUserId?: string } };
      }>;
    };
    assert.equal(paidPayload.invoice.status, 'PAID');
    assert.equal(
      paidPayload.events.some(
        (event) =>
          event.eventType === 'MARKED_PAID' &&
          event.metadataJson?.manualReceipt?.receivedByUserId === ownerUserId,
      ),
      true,
    );

    const adminMarkUnpaid = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${invoiceId}/mark-unpaid`,
      headers: authHeaders(tables, adminUserId),
      payload: {
        reason: 'Provider admin corrected manual reconciliation',
      },
    });
    assert.equal(adminMarkUnpaid.statusCode, 200);
    const unpaidPayload = adminMarkUnpaid.json() as { invoice: { status: string } };
    assert.equal(unpaidPayload.invoice.status, 'SENT');
  });

  it('allows security admins to create and confirm payer payment sessions', async () => {
    const tables = loadTables();
    const securityAdminMembership = asRows(tables.userRoleMemberships).find(
      (row) => asString(row.role) === 'security_admin',
    );
    assert.ok(securityAdminMembership, 'expected seeded security admin role membership');
    const adminUserId = asString(securityAdminMembership.userId) as string;
    const sentInvoice = asRows(tables.invoices).find((row) => asString(row.status) === 'SENT');
    assert.ok(sentInvoice, 'expected seeded SENT invoice');
    const invoiceId = asString(sentInvoice.id) as string;

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/invoices/${invoiceId}`,
      headers: authHeaders(tables, adminUserId, 'security_admin'),
    });
    assert.equal(detail.statusCode, 200);

    const pay = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${invoiceId}/payments`,
      headers: authHeaders(tables, adminUserId, 'security_admin'),
      payload: {
        method: 'bank_transfer',
        idempotencyKey: 'security-admin-payment-test',
      },
    });
    assert.equal(pay.statusCode, 201);
    const payPayload = pay.json() as {
      invoiceStatus: string;
      paymentSession: { attemptId: string; nextAction: { url?: string } };
    };
    assert.equal(payPayload.invoiceStatus, 'SENT');

    const token = tokenFromHostedUrl(payPayload.paymentSession.nextAction.url ?? '');
    assert.equal(Boolean(token), true);

    const complete = await app.inject({
      method: 'POST',
      url: `/v1/payment-attempts/${payPayload.paymentSession.attemptId}/simulated-complete`,
      payload: { token },
    });
    assert.equal(complete.statusCode, 200);
    const completePayload = complete.json() as { invoiceStatus: string; alreadyCompleted: boolean };
    assert.equal(completePayload.invoiceStatus, 'PAID');
    assert.equal(completePayload.alreadyCompleted, false);
  });

  it('allowlists hosted payment return URLs for app deep links and rejects mismatches', async () => {
    const tables = loadTables();
    const sentInvoice = asRows(tables.invoices).find((row) => asString(row.status) === 'SENT');
    assert.ok(sentInvoice, 'expected seeded SENT invoice');
    const invoiceId = asString(sentInvoice.id) as string;
    const payerUserId = asString(sentInvoice.payerUserId) as string;
    const previousAllowlist = env.API_PAYMENT_ALLOWED_RETURN_ORIGINS;
    env.API_PAYMENT_ALLOWED_RETURN_ORIGINS = 'clubroom://invoices,https://clubroom.app';

    try {
      const allowed = await app.inject({
        method: 'POST',
        url: `/v1/invoices/${invoiceId}/payments`,
        headers: authHeaders(tables, payerUserId, 'parent'),
        payload: {
          method: 'card',
          idempotencyKey: 'allowlisted-return-url-test',
          returnUrl: `clubroom://invoices/${invoiceId}`,
          cancelUrl: `clubroom://invoices/${invoiceId}`,
        },
      });
      assert.equal(allowed.statusCode, 201);

      const rejected = await app.inject({
        method: 'POST',
        url: `/v1/invoices/${invoiceId}/payments`,
        headers: authHeaders(tables, payerUserId, 'parent'),
        payload: {
          method: 'card',
          idempotencyKey: 'rejected-return-url-test',
          returnUrl: `clubroom://settings/${invoiceId}`,
          cancelUrl: `clubroom://settings/${invoiceId}`,
        },
      });
      assert.equal(rejected.statusCode, 503);
    } finally {
      env.API_PAYMENT_ALLOWED_RETURN_ORIGINS = previousAllowlist;
    }
  });

  it('generates missing invoices idempotently for billable bookings', async () => {
    const tables = loadTables();
    const booking = findBillableBookingWithoutInvoice(tables);
    assert.ok(booking, 'expected billable booking without existing invoice');
    const bookingId = asString(booking.id) as string;
    const coachUserId = asString(booking.coachUserId) as string;

    const created = await app.inject({
      method: 'POST',
      url: '/v1/invoices/generate',
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        bookingId,
      },
    });
    assert.equal(created.statusCode, 201);
    const createdPayload = created.json() as {
      invoice: { id: string; bookingId: string; coachId: string; status: string };
      lineItems: unknown[];
      events: Array<{ eventType?: string }>;
    };
    assert.equal(createdPayload.invoice.bookingId, bookingId);
    assert.equal(createdPayload.invoice.coachId, coachUserId);
    assert.equal(createdPayload.invoice.status, 'SENT');
    assert.equal(createdPayload.lineItems.length >= 1, true);
    assert.equal(createdPayload.events.length >= 1, true);

    const idempotent = await app.inject({
      method: 'POST',
      url: '/v1/invoices/generate',
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        bookingId,
      },
    });
    assert.equal(idempotent.statusCode, 200);
    const idempotentPayload = idempotent.json() as { invoice: { id: string; bookingId: string } };
    assert.equal(idempotentPayload.invoice.id, createdPayload.invoice.id);
    assert.equal(idempotentPayload.invoice.bookingId, bookingId);
  });

  it('reconciles db-mode invoice money state against authoritative booking state', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const authTables = loadTables();
      const fixtureStore = getDbFixtureStore();
      const booking = findBillableBookingWithoutInvoice(fixtureStore.tables);
      assert.ok(booking, 'expected db-fixture billable booking without existing invoice');
      const bookingId = asString(booking.id) as string;
      const coachUserId = asString(booking.coachUserId) as string;

      const generated = await app.inject({
        method: 'POST',
        url: '/v1/invoices/generate',
        headers: authHeaders(authTables, coachUserId, 'coach'),
        payload: {
          bookingId,
          notes: 'DB-mode booking-linked invoice proof',
        },
      });
      assert.equal(generated.statusCode, 201);
      const generatedPayload = generated.json() as {
        invoice: { id: string; bookingId: string; coachId: string; status: string };
      };
      assert.equal(generatedPayload.invoice.bookingId, bookingId);
      assert.equal(generatedPayload.invoice.coachId, coachUserId);
      assert.equal(generatedPayload.invoice.status, 'SENT');

      const storedGenerated = asRows(getDbFixtureStore().tables.invoices).find(
        (row) => asString(row.id) === generatedPayload.invoice.id,
      );
      assert.equal(asString(storedGenerated?.bookingId), bookingId);

      const markedPaid = await app.inject({
        method: 'POST',
        url: `/v1/invoices/${generatedPayload.invoice.id}/mark-paid`,
        headers: authHeaders(authTables, coachUserId, 'coach'),
        payload: { reason: 'Bank transfer received' },
      });
      assert.equal(markedPaid.statusCode, 200);
      const markedPaidPayload = markedPaid.json() as {
        invoice: { bookingId: string; status: string; paidAt?: string };
        events: Array<{ eventType?: string; metadataJson?: { bookingId?: string } }>;
        reconcilerEntry: { state?: string } | null;
      };
      assert.equal(markedPaidPayload.invoice.bookingId, bookingId);
      assert.equal(markedPaidPayload.invoice.status, 'PAID');
      assert.equal(Boolean(markedPaidPayload.invoice.paidAt), true);
      assert.equal(markedPaidPayload.reconcilerEntry?.state, 'PAID');
      assert.equal(
        markedPaidPayload.events.some(
          (event) =>
            event.eventType === 'MARKED_PAID' && event.metadataJson?.bookingId === bookingId,
        ),
        true,
      );

      const markedUnpaid = await app.inject({
        method: 'POST',
        url: `/v1/invoices/${generatedPayload.invoice.id}/mark-unpaid`,
        headers: authHeaders(authTables, coachUserId, 'coach'),
        payload: { reason: 'Payment disputed before provider cutover' },
      });
      assert.equal(markedUnpaid.statusCode, 200);
      const markedUnpaidPayload = markedUnpaid.json() as {
        invoice: { status: string };
        reconcilerEntry: { state?: string } | null;
      };
      assert.equal(markedUnpaidPayload.invoice.status, 'SENT');
      assert.equal(markedUnpaidPayload.reconcilerEntry?.state, 'OUTSTANDING');

      const writtenOff = await app.inject({
        method: 'POST',
        url: `/v1/invoices/${generatedPayload.invoice.id}/write-off`,
        headers: authHeaders(authTables, coachUserId, 'coach'),
        payload: { reason: 'Goodwill adjustment before Stripe refunds exist' },
      });
      assert.equal(writtenOff.statusCode, 200);
      assert.equal(
        (writtenOff.json() as { invoice: { status: string } }).invoice.status,
        'WRITTEN_OFF',
      );

      const restored = await app.inject({
        method: 'POST',
        url: `/v1/invoices/${generatedPayload.invoice.id}/restore`,
        headers: authHeaders(authTables, coachUserId, 'coach'),
      });
      assert.equal(restored.statusCode, 200);
      assert.equal((restored.json() as { invoice: { status: string } }).invoice.status, 'SENT');

      const voided = await app.inject({
        method: 'POST',
        url: `/v1/invoices/${generatedPayload.invoice.id}/void`,
        headers: authHeaders(authTables, coachUserId, 'coach'),
        payload: { reason: 'Session cancelled before payment' },
      });
      assert.equal(voided.statusCode, 200);
      const voidedPayload = voided.json() as {
        invoice: { bookingId: string; status: string; voidReason?: string };
        reconcilerEntry: { state?: string } | null;
      };
      assert.equal(voidedPayload.invoice.bookingId, bookingId);
      assert.equal(voidedPayload.invoice.status, 'VOID');
      assert.equal(voidedPayload.invoice.voidReason, 'Session cancelled before payment');
      assert.equal(voidedPayload.reconcilerEntry?.state, 'VOID');

      const storedFinal = asRows(getDbFixtureStore().tables.invoices).find(
        (row) => asString(row.id) === generatedPayload.invoice.id,
      );
      assert.equal(asString(storedFinal?.bookingId), bookingId);
      assert.equal(asString(storedFinal?.status), 'VOID');
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetMarketplaceSeedStoreForTests();
      resetDbFixtureStoreForTests();
    }
  });

  it('rejects db-mode payment and reconciler changes when the linked booking is stale', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const authTables = loadTables();
      const fixtureStore = getDbFixtureStore();
      const booking = findBillableBookingWithoutInvoice(fixtureStore.tables);
      assert.ok(booking, 'expected db-fixture billable booking without existing invoice');
      const bookingId = asString(booking.id) as string;
      const coachUserId = asString(booking.coachUserId) as string;

      const generated = await app.inject({
        method: 'POST',
        url: '/v1/invoices/generate',
        headers: authHeaders(authTables, coachUserId, 'coach'),
        payload: {
          bookingId,
        },
      });
      assert.equal(generated.statusCode, 201);
      const generatedPayload = generated.json() as {
        invoice: { id: string; userId?: string; bookingId: string; status: string };
      };
      assert.equal(generatedPayload.invoice.bookingId, bookingId);
      assert.equal(generatedPayload.invoice.status, 'SENT');

      const payerUserId = generatedPayload.invoice.userId;
      assert.ok(payerUserId, 'expected generated invoice to resolve a payer');
      fixtureStore.tables.bookings = asRows(fixtureStore.tables.bookings).filter(
        (row) => asString(row.id) !== bookingId,
      );

      const markedPaid = await app.inject({
        method: 'POST',
        url: `/v1/invoices/${generatedPayload.invoice.id}/mark-paid`,
        headers: authHeaders(authTables, coachUserId, 'coach'),
        payload: { reason: 'Should not bypass booking authority' },
      });
      assert.equal(markedPaid.statusCode, 400);
      assert.match(markedPaid.body, /booking link is no longer authoritative/i);

      const paymentSession = await app.inject({
        method: 'POST',
        url: `/v1/invoices/${generatedPayload.invoice.id}/payments`,
        headers: authHeaders(authTables, payerUserId, 'parent'),
        payload: {
          method: 'card',
          idempotencyKey: 'stale-booking-link-test',
        },
      });
      assert.equal(paymentSession.statusCode, 400);
      assert.match(paymentSession.body, /booking link is no longer authoritative/i);

      const storedInvoice = asRows(getDbFixtureStore().tables.invoices).find(
        (row) => asString(row.id) === generatedPayload.invoice.id,
      );
      assert.equal(asString(storedInvoice?.status), 'SENT');
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetMarketplaceSeedStoreForTests();
      resetDbFixtureStoreForTests();
    }
  });

  it('voids open booking invoices on cancellation and restores them on booking reopen', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const authTables = loadTables();
      const fixtureStore = getDbFixtureStore();
      const booking = prepareCancellableBillableBookingWithoutInvoice(fixtureStore.tables);
      assert.ok(booking, 'expected db-fixture billable booking without existing invoice');
      const bookingId = asString(booking.id) as string;
      const coachUserId = asString(booking.coachUserId) as string;

      const generated = await app.inject({
        method: 'POST',
        url: '/v1/invoices/generate',
        headers: authHeaders(authTables, coachUserId, 'coach'),
        payload: { bookingId },
      });
      assert.equal(generated.statusCode, 201);
      const generatedPayload = generated.json() as {
        invoice: { id: string; userId?: string; status: string };
      };
      const invoiceId = generatedPayload.invoice.id;
      const payerUserId = generatedPayload.invoice.userId;
      assert.ok(payerUserId, 'expected generated invoice to resolve a payer');
      assert.equal(generatedPayload.invoice.status, 'SENT');

      const payment = await app.inject({
        method: 'POST',
        url: `/v1/invoices/${invoiceId}/payments`,
        headers: authHeaders(authTables, payerUserId, 'parent'),
        payload: {
          method: 'card',
          idempotencyKey: 'booking-cancel-voids-open-invoice',
        },
      });
      assert.equal(payment.statusCode, 201);
      const paymentPayload = payment.json() as {
        paymentSession: { attemptId: string; nextAction: { url?: string } };
      };
      const token = tokenFromHostedUrl(paymentPayload.paymentSession.nextAction.url ?? '');
      assert.equal(Boolean(token), true);

      const cancelled = await app.inject({
        method: 'POST',
        url: `/v1/bookings/${bookingId}/cancel`,
        headers: authHeaders(authTables, coachUserId, 'coach'),
        payload: {
          reason: 'Weather cancellation',
          expectedVersion: asNumber(booking.version) ?? 1,
          idempotencyKey: 'booking-cancel-voids-open-invoice-key',
        },
      });
      assert.equal(cancelled.statusCode, 200);
      const cancelledPayload = cancelled.json() as { status: string; version: number };
      assert.equal(cancelledPayload.status, 'CANCELLED');

      const invoiceAfterCancel = await app.inject({
        method: 'GET',
        url: `/v1/invoices/${invoiceId}`,
        headers: authHeaders(authTables, coachUserId, 'coach'),
      });
      assert.equal(invoiceAfterCancel.statusCode, 200);
      const cancelDetail = invoiceAfterCancel.json() as {
        invoice: { status: string; voidReason?: string };
        events: Array<{
          eventType?: string;
          metadataJson?: { source?: string; bookingId?: string };
        }>;
        paymentAttempts: Array<{ id: string; status: string }>;
        reconcilerEntry: { state?: string } | null;
      };
      assert.equal(cancelDetail.invoice.status, 'VOID');
      assert.equal(cancelDetail.invoice.voidReason, 'Weather cancellation');
      assert.equal(cancelDetail.reconcilerEntry?.state, 'VOID');
      assert.equal(
        cancelDetail.events.some(
          (event) =>
            event.eventType === 'VOIDED' &&
            event.metadataJson?.source === 'booking-cancellation' &&
            event.metadataJson?.bookingId === bookingId,
        ),
        true,
      );
      assert.equal(
        cancelDetail.paymentAttempts.some(
          (attempt) =>
            attempt.id === paymentPayload.paymentSession.attemptId && attempt.status === 'CANCELED',
        ),
        true,
      );

      const completedCancelledAttempt = await app.inject({
        method: 'POST',
        url: `/v1/payment-attempts/${paymentPayload.paymentSession.attemptId}/simulated-complete`,
        payload: { token },
      });
      assert.equal(completedCancelledAttempt.statusCode, 400);
      assert.match(completedCancelledAttempt.body, /payment attempt is not payable/i);

      const reopened = await app.inject({
        method: 'POST',
        url: `/v1/bookings/${bookingId}/reopen`,
        headers: authHeaders(authTables, coachUserId, 'coach'),
        payload: {
          expectedVersion: cancelledPayload.version,
          idempotencyKey: 'booking-reopen-restores-open-invoice-key',
        },
      });
      assert.equal(reopened.statusCode, 200);

      const invoiceAfterReopen = await app.inject({
        method: 'GET',
        url: `/v1/invoices/${invoiceId}`,
        headers: authHeaders(authTables, coachUserId, 'coach'),
      });
      assert.equal(invoiceAfterReopen.statusCode, 200);
      const reopenDetail = invoiceAfterReopen.json() as {
        invoice: { status: string; voidReason?: string };
        events: Array<{
          eventType?: string;
          metadataJson?: { source?: string; bookingId?: string };
        }>;
        reconcilerEntry: { state?: string } | null;
      };
      assert.equal(reopenDetail.invoice.status, 'SENT');
      assert.equal(reopenDetail.invoice.voidReason, undefined);
      assert.equal(reopenDetail.reconcilerEntry?.state, 'OUTSTANDING');
      assert.equal(
        reopenDetail.events.some(
          (event) =>
            event.eventType === 'RESTORED' &&
            event.metadataJson?.source === 'booking-reopen' &&
            event.metadataJson?.bookingId === bookingId,
        ),
        true,
      );
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetMarketplaceSeedStoreForTests();
      resetDbFixtureStoreForTests();
    }
  });

  it('requires backend refund authority before cancelling a booking with a paid invoice', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const authTables = loadTables();
      const fixtureStore = getDbFixtureStore();
      const booking = prepareCancellableBillableBookingWithoutInvoice(fixtureStore.tables);
      assert.ok(booking, 'expected db-fixture billable booking without existing invoice');
      const bookingId = asString(booking.id) as string;
      const coachUserId = asString(booking.coachUserId) as string;

      const generated = await app.inject({
        method: 'POST',
        url: '/v1/invoices/generate',
        headers: authHeaders(authTables, coachUserId, 'coach'),
        payload: { bookingId },
      });
      assert.equal(generated.statusCode, 201);
      const generatedPayload = generated.json() as {
        invoice: { id: string; status: string; userId?: string; totalMinor?: number };
      };
      const invoiceId = generatedPayload.invoice.id;
      const payerUserId = generatedPayload.invoice.userId;
      assert.ok(payerUserId, 'expected generated invoice to resolve a payer');

      const paid = await app.inject({
        method: 'POST',
        url: `/v1/invoices/${invoiceId}/mark-paid`,
        headers: authHeaders(authTables, coachUserId, 'coach'),
        payload: { reason: 'Bank transfer received before cancellation' },
      });
      assert.equal(paid.statusCode, 200);

      const cancelled = await app.inject({
        method: 'POST',
        url: `/v1/bookings/${bookingId}/cancel`,
        headers: authHeaders(authTables, coachUserId, 'coach'),
        payload: {
          reason: 'Cannot fulfil session',
          expectedVersion: asNumber(booking.version) ?? 1,
          idempotencyKey: 'paid-invoice-cancel-hard-wall',
        },
      });
      assert.equal(cancelled.statusCode, 400);
      assert.match(cancelled.body, /refund workflow before cancellation/i);

      const refundDeniedForPayer = await app.inject({
        method: 'POST',
        url: `/v1/invoices/${invoiceId}/refunds`,
        headers: authHeaders(authTables, payerUserId, 'parent'),
        payload: {
          reason: 'Parent cannot approve their own refund',
          verificationCode: '000000',
          idempotencyKey: 'paid-invoice-refund-denied-payer',
        },
      });
      assert.equal(refundDeniedForPayer.statusCode, 403);

      const refundDeniedBadCode = await app.inject({
        method: 'POST',
        url: `/v1/invoices/${invoiceId}/refunds`,
        headers: authHeaders(authTables, coachUserId, 'coach'),
        payload: {
          reason: 'Coach approved cancellation refund',
          verificationCode: '111111',
          idempotencyKey: 'paid-invoice-refund-bad-code',
        },
      });
      assert.equal(refundDeniedBadCode.statusCode, 400);
      assert.match(refundDeniedBadCode.body, /verification code is invalid/i);

      const refundDeniedPartialAmount = await app.inject({
        method: 'POST',
        url: `/v1/invoices/${invoiceId}/refunds`,
        headers: authHeaders(authTables, coachUserId, 'coach'),
        payload: {
          reason: 'Partial refund cannot unlock booking cancellation',
          verificationCode: '000000',
          idempotencyKey: 'paid-invoice-refund-partial',
          amountMinor: Math.max(1, (generatedPayload.invoice.totalMinor ?? 0) - 1),
        },
      });
      assert.equal(refundDeniedPartialAmount.statusCode, 400);
      assert.match(refundDeniedPartialAmount.body, /must match the paid invoice total/i);

      const refunded = await app.inject({
        method: 'POST',
        url: `/v1/invoices/${invoiceId}/refunds`,
        headers: authHeaders(authTables, coachUserId, 'coach'),
        payload: {
          reason: 'Coach approved cancellation refund',
          verificationCode: '000000',
          idempotencyKey: 'paid-invoice-refund-approved',
        },
      });
      assert.equal(refunded.statusCode, 201);
      const refundedPayload = refunded.json() as {
        invoice: { status: string; voidReason?: string };
        refund: {
          eventType?: string;
          metadataJson?: { source?: string; status?: string; idempotencyKey?: string };
        };
        reconcilerEntry: { state?: string } | null;
      };
      assert.equal(refundedPayload.invoice.status, 'VOID');
      assert.equal(refundedPayload.invoice.voidReason, 'Coach approved cancellation refund');
      assert.equal(refundedPayload.refund.eventType, 'VOIDED');
      assert.equal(refundedPayload.refund.metadataJson?.source, 'invoice-refund');
      assert.equal(refundedPayload.refund.metadataJson?.status, 'APPROVED');
      assert.equal(
        refundedPayload.refund.metadataJson?.idempotencyKey,
        'paid-invoice-refund-approved',
      );
      assert.equal(refundedPayload.reconcilerEntry?.state, 'VOID');

      const idempotentRefund = await app.inject({
        method: 'POST',
        url: `/v1/invoices/${invoiceId}/refunds`,
        headers: authHeaders(authTables, coachUserId, 'coach'),
        payload: {
          reason: 'Coach approved cancellation refund',
          verificationCode: '000000',
          idempotencyKey: 'paid-invoice-refund-approved',
        },
      });
      assert.equal(idempotentRefund.statusCode, 200);
      assert.equal((idempotentRefund.json() as { reused: boolean }).reused, true);

      const cancelledAfterRefund = await app.inject({
        method: 'POST',
        url: `/v1/bookings/${bookingId}/cancel`,
        headers: authHeaders(authTables, coachUserId, 'coach'),
        payload: {
          reason: 'Cannot fulfil session',
          expectedVersion: asNumber(booking.version) ?? 1,
          idempotencyKey: 'paid-invoice-cancel-after-refund',
        },
      });
      assert.equal(cancelledAfterRefund.statusCode, 200);
      assert.equal((cancelledAfterRefund.json() as { status: string }).status, 'CANCELLED');

      const storedBooking = asRows(getDbFixtureStore().tables.bookings).find(
        (row) => asString(row.id) === bookingId,
      );
      const storedInvoice = asRows(getDbFixtureStore().tables.invoices).find(
        (row) => asString(row.id) === invoiceId,
      );
      assert.equal(asString(storedBooking?.status), 'CANCELLED');
      assert.equal(asString(storedInvoice?.status), 'VOID');
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetMarketplaceSeedStoreForTests();
      resetDbFixtureStoreForTests();
    }
  });

  it('queues reminders through the backend for authoritative invoices', async () => {
    const tables = loadTables();
    const sentInvoice = asRows(tables.invoices).find((row) => asString(row.status) === 'SENT');
    assert.ok(sentInvoice, 'expected seeded SENT invoice');
    const invoiceId = asString(sentInvoice.id) as string;
    const coachUserId = asString(sentInvoice.coachUserId) as string;
    const payerUserId = asString(sentInvoice.payerUserId) as string;

    const denied = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${invoiceId}/reminders`,
      headers: authHeaders(tables, payerUserId, 'parent'),
      payload: {
        recipientEmail: 'payer@example.com',
      },
    });
    assert.equal(denied.statusCode, 403);

    const previousWebhookUrl = env.API_PASSWORD_RESET_EMAIL_WEBHOOK_URL;
    const previousBrevoKey = env.API_PASSWORD_RESET_BREVO_API_KEY;
    const previousSmtpHost = env.API_PASSWORD_RESET_SMTP_HOST;
    const previousSmtpUsername = env.API_PASSWORD_RESET_SMTP_USERNAME;
    const previousSmtpPassword = env.API_PASSWORD_RESET_SMTP_PASSWORD;
    const previousDevOutbox = env.API_PASSWORD_RESET_DEV_OUTBOX;
    env.API_PASSWORD_RESET_EMAIL_WEBHOOK_URL = undefined;
    env.API_PASSWORD_RESET_BREVO_API_KEY = undefined;
    env.API_PASSWORD_RESET_SMTP_HOST = undefined;
    env.API_PASSWORD_RESET_SMTP_USERNAME = undefined;
    env.API_PASSWORD_RESET_SMTP_PASSWORD = undefined;
    env.API_PASSWORD_RESET_DEV_OUTBOX = false;

    const reminded = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${invoiceId}/reminders`,
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        recipientEmail: 'payer@example.com',
        message: 'Please pay through the secure hosted payment page.',
      },
    });
    env.API_PASSWORD_RESET_EMAIL_WEBHOOK_URL = previousWebhookUrl;
    env.API_PASSWORD_RESET_BREVO_API_KEY = previousBrevoKey;
    env.API_PASSWORD_RESET_SMTP_HOST = previousSmtpHost;
    env.API_PASSWORD_RESET_SMTP_USERNAME = previousSmtpUsername;
    env.API_PASSWORD_RESET_SMTP_PASSWORD = previousSmtpPassword;
    env.API_PASSWORD_RESET_DEV_OUTBOX = previousDevOutbox;
    assert.equal(reminded.statusCode, 200);
    const remindedPayload = reminded.json() as {
      invoice: { id: string; status: string; sentAt?: string };
      reminder: { id?: string; deliveryStatus?: string; channel?: string };
      sentAt: string;
    };
    assert.equal(remindedPayload.invoice.id, invoiceId);
    assert.equal(remindedPayload.invoice.status, 'SENT');
    assert.equal(remindedPayload.reminder.deliveryStatus, 'skipped');
    assert.equal(remindedPayload.reminder.channel, 'email');
    assert.equal(Boolean(remindedPayload.sentAt), true);
    const storedReminder = asRows(getMarketplaceSeedStore().tables.paymentReminders).find(
      (row) => asString(row.id) === remindedPayload.reminder.id,
    );
    assert.equal(asString(storedReminder?.deliveryStatus), 'skipped');
    assert.equal(
      JSON.stringify(asRecord(storedReminder?.metadataJson)).includes('payer@example.com'),
      false,
    );
    assert.equal(asString(asRecord(storedReminder?.metadataJson)?.recipientEmailDomain), 'example.com');

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/invoices/${invoiceId}`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(detail.statusCode, 200);
    const detailPayload = detail.json() as {
      invoice: { status: string };
      events: Array<{ eventType?: string }>;
    };
    assert.equal(detailPayload.invoice.status, 'SENT');
    assert.equal(
      detailPayload.events.some((event) => event.eventType === 'REMINDER_SENT'),
      true,
    );
  });

  it('delivers invoice reminders through the configured webhook without raw email metadata', async () => {
    const tables = loadTables();
    const sentInvoice = asRows(tables.invoices).find((row) => asString(row.status) === 'SENT');
    assert.ok(sentInvoice, 'expected seeded SENT invoice');
    const invoiceId = asString(sentInvoice.id) as string;
    const coachUserId = asString(sentInvoice.coachUserId) as string;
    const recipientEmail = 'payer@example.com';
    const deliveries: Array<{ authorization?: string; body: Record<string, unknown> }> = [];
    const deliveryServer = http.createServer((req, res) => {
      let raw = '';
      req.setEncoding('utf8');
      req.on('data', (chunk) => {
        raw += chunk;
      });
      req.on('end', () => {
        deliveries.push({
          authorization: req.headers.authorization,
          body: raw ? (JSON.parse(raw) as Record<string, unknown>) : {},
        });
        res.statusCode = 202;
        res.end('accepted');
      });
    });

    await new Promise<void>((resolve) => deliveryServer.listen(0, '127.0.0.1', resolve));
    const address = deliveryServer.address() as AddressInfo;
    const previousWebhookUrl = env.API_PASSWORD_RESET_EMAIL_WEBHOOK_URL;
    const previousWebhookSecret = env.API_PASSWORD_RESET_EMAIL_WEBHOOK_SECRET;
    const previousFrom = env.API_PASSWORD_RESET_EMAIL_FROM;
    env.API_PASSWORD_RESET_EMAIL_WEBHOOK_URL = `http://127.0.0.1:${address.port}/invoice-reminder`;
    env.API_PASSWORD_RESET_EMAIL_WEBHOOK_SECRET = 'invoice-webhook-secret';
    env.API_PASSWORD_RESET_EMAIL_FROM = 'Clubroom Billing <billing@clubroom.test>';

    try {
      const reminded = await app.inject({
        method: 'POST',
        url: `/v1/invoices/${invoiceId}/reminders`,
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: {
          recipientEmail,
          message: 'Please pay through the secure hosted payment page.',
        },
      });
      assert.equal(reminded.statusCode, 200);
      const remindedPayload = reminded.json() as {
        reminder: { id?: string; deliveryStatus?: string; metadataJson?: Record<string, unknown> };
      };
      assert.equal(remindedPayload.reminder.deliveryStatus, 'sent');
      assert.equal(deliveries.length, 1);
      assert.equal(deliveries[0]?.authorization, 'Bearer invoice-webhook-secret');
      assert.equal(deliveries[0]?.body.type, 'invoice_reminder');
      assert.equal(deliveries[0]?.body.to, recipientEmail);
      assert.equal(deliveries[0]?.body.from, 'Clubroom Billing <billing@clubroom.test>');

      const storedReminder = asRows(getMarketplaceSeedStore().tables.paymentReminders).find(
        (row) => asString(row.id) === remindedPayload.reminder.id,
      );
      assert.equal(asString(storedReminder?.deliveryStatus), 'sent');
      assert.equal(JSON.stringify(storedReminder).includes(recipientEmail), false);
      assert.equal(asString(asRecord(storedReminder?.metadataJson)?.deliveryProvider), 'webhook');
      const reminderAudit = asRows(getMarketplaceSeedStore().tables.auditEvents).find(
        (row) => asString(row.action) === 'invoice.reminder' && asString(row.resourceId) === invoiceId,
      );
      assert.equal(JSON.stringify(reminderAudit).includes(recipientEmail), false);
      assert.equal(asString(asRecord(reminderAudit?.metadataJson)?.deliveryStatus), 'sent');
    } finally {
      env.API_PASSWORD_RESET_EMAIL_WEBHOOK_URL = previousWebhookUrl;
      env.API_PASSWORD_RESET_EMAIL_WEBHOOK_SECRET = previousWebhookSecret;
      env.API_PASSWORD_RESET_EMAIL_FROM = previousFrom;
      await new Promise<void>((resolve, reject) => {
        deliveryServer.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it('lets a coach reconcile invoice status transitions through v1 routes', async () => {
    const tables = loadTables();
    const sentInvoice = asRows(tables.invoices).find((row) => asString(row.status) === 'SENT');
    assert.ok(sentInvoice, 'expected seeded SENT invoice');
    const invoiceId = asString(sentInvoice.id) as string;
    const coachUserId = asString(sentInvoice.coachUserId) as string;
    const payerUserId = asString(sentInvoice.payerUserId) as string;

    const denied = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${invoiceId}/mark-paid`,
      headers: authHeaders(tables, payerUserId, 'parent'),
    });
    assert.equal(denied.statusCode, 403);

    const markPaid = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${invoiceId}/mark-paid`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(markPaid.statusCode, 200);
    const markPaidPayload = markPaid.json() as { invoice: { status: string; paidAt?: string } };
    assert.equal(markPaidPayload.invoice.status, 'PAID');
    assert.equal(Boolean(markPaidPayload.invoice.paidAt), true);

    const markUnpaid = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${invoiceId}/mark-unpaid`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(markUnpaid.statusCode, 200);
    const markUnpaidPayload = markUnpaid.json() as { invoice: { status: string } };
    assert.equal(markUnpaidPayload.invoice.status, 'SENT');

    const writeOff = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${invoiceId}/write-off`,
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: { reason: 'Coach waived payment' },
    });
    assert.equal(writeOff.statusCode, 200);
    const writeOffPayload = writeOff.json() as { invoice: { status: string; voidReason?: string } };
    assert.equal(writeOffPayload.invoice.status, 'WRITTEN_OFF');
    assert.equal(writeOffPayload.invoice.voidReason, 'Coach waived payment');

    const restore = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${invoiceId}/restore`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(restore.statusCode, 200);
    const restorePayload = restore.json() as { invoice: { status: string } };
    assert.equal(restorePayload.invoice.status, 'SENT');

    const voided = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${invoiceId}/void`,
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: { reason: 'Session cancelled by coach' },
    });
    assert.equal(voided.statusCode, 200);
    const voidPayload = voided.json() as {
      invoice: { status: string; voidReason?: string; voidedAt?: string };
    };
    assert.equal(voidPayload.invoice.status, 'VOID');
    assert.equal(voidPayload.invoice.voidReason, 'Session cancelled by coach');
    assert.equal(Boolean(voidPayload.invoice.voidedAt), true);

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/invoices/${invoiceId}`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(detail.statusCode, 200);
    const detailPayload = detail.json() as {
      invoice: { status: string };
      events: Array<{ eventType?: string }>;
      reconcilerEntry: { state?: string } | null;
    };
    assert.equal(detailPayload.invoice.status, 'VOID');
    assert.equal(detailPayload.reconcilerEntry?.state, 'VOID');
    assert.equal(
      detailPayload.events.some((event) => event.eventType === 'MARKED_UNPAID'),
      true,
    );
    assert.equal(
      detailPayload.events.some((event) => event.eventType === 'WRITTEN_OFF'),
      true,
    );
    assert.equal(
      detailPayload.events.some((event) => event.eventType === 'RESTORED'),
      true,
    );
    assert.equal(
      detailPayload.events.some((event) => event.eventType === 'VOIDED'),
      true,
    );
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
    const progressPayload = progress.json() as {
      sessionNotes: unknown[];
      skillAssessments: unknown[];
    };
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

    const sessionBadge = asRows(tables.athleteBadges).find(
      (row) => asString(row.athleteId) === athleteId && Boolean(asString(row.bookingId)),
    );
    assert.ok(sessionBadge, 'expected booking-linked badge award');
    const badgeSessionId = asString(sessionBadge.bookingId) as string;
    const sessionBadges = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${badgeSessionId}/badges`,
      headers: parentHeaders,
    });
    assert.equal(sessionBadges.statusCode, 200);
    const sessionBadgesPayload = sessionBadges.json() as {
      badges: Array<{ id: string }>;
      badgeDefinitions: unknown[];
    };
    assert.equal(
      sessionBadgesPayload.badges.some((badge) => badge.id === asString(sessionBadge.id)),
      true,
    );
    assert.equal(sessionBadgesPayload.badgeDefinitions.length >= 1, true);

    const analytics = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/analytics?period=ALL`,
      headers: parentHeaders,
    });
    assert.equal(analytics.statusCode, 200);
    const analyticsPayload = analytics.json() as {
      analytics: {
        athleteId: string;
        period: string;
        totalSessions: number;
        sessionsThisPeriod: number;
        averageSessionRating: number;
        skills: Array<{ skillName?: string; averageLevel?: number; history?: unknown[] }>;
        activeGoals: unknown[];
        completedGoals: unknown[];
        percentileRank: number;
      };
    };
    assert.equal(analyticsPayload.analytics.athleteId, athleteId);
    assert.equal(analyticsPayload.analytics.period, 'ALL');
    assert.equal(analyticsPayload.analytics.totalSessions >= 1, true);
    assert.equal(analyticsPayload.analytics.sessionsThisPeriod >= 1, true);
    assert.equal(analyticsPayload.analytics.averageSessionRating > 0, true);
    assert.equal(analyticsPayload.analytics.skills.length >= 1, true);
    assert.equal(
      analyticsPayload.analytics.skills.every((skill) => typeof skill.averageLevel === 'number'),
      true,
    );
    assert.equal(
      analyticsPayload.analytics.activeGoals.length +
        analyticsPayload.analytics.completedGoals.length >=
        1,
      true,
    );
    assert.equal(analyticsPayload.analytics.percentileRank >= 1, true);

    const skillHistory = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/skills/history`,
      headers: parentHeaders,
    });
    assert.equal(skillHistory.statusCode, 200);
    const skillHistoryPayload = skillHistory.json() as {
      skills: Array<{ skillName?: string; history?: unknown[] }>;
    };
    assert.equal(skillHistoryPayload.skills.length >= 1, true);
    assert.equal((skillHistoryPayload.skills[0]?.history?.length ?? 0) >= 1, true);
    const firstSkillName = skillHistoryPayload.skills[0]?.skillName;
    assert.ok(firstSkillName, 'expected first skill history name');

    const filteredSkillHistory = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/skills/history?skillName=${encodeURIComponent(firstSkillName)}`,
      headers: parentHeaders,
    });
    assert.equal(filteredSkillHistory.statusCode, 200);
    const filteredSkillHistoryPayload = filteredSkillHistory.json() as {
      skills: Array<{ skillName?: string }>;
    };
    assert.equal(filteredSkillHistoryPayload.skills.length, 1);
    assert.equal(filteredSkillHistoryPayload.skills[0]?.skillName, firstSkillName);

    const squadActivity = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/squad-activity?lookbackDays=365&limit=20`,
      headers: parentHeaders,
    });
    assert.equal(squadActivity.statusCode, 200);
    const squadActivityPayload = squadActivity.json() as {
      squadIds: string[];
      items: Array<{
        type?: string;
        athleteId?: string;
        detail?: string;
      }>;
      summary: {
        totalItems: number;
        peerCount: number;
      };
    };
    assert.equal(squadActivityPayload.squadIds.length >= 1, true);
    assert.equal(squadActivityPayload.items.length >= 1, true);
    assert.equal(
      squadActivityPayload.summary.totalItems >= squadActivityPayload.items.length,
      true,
    );
    assert.equal(squadActivityPayload.summary.peerCount >= 0, true);
    assert.equal(
      squadActivityPayload.items.some((item) => item.type === 'session_completed'),
      true,
    );
    assert.equal(
      squadActivityPayload.items.some((item) => item.athleteId === athleteId),
      true,
    );
    assert.equal(
      squadActivityPayload.items.some((item) => /private|encrypted/i.test(item.detail ?? '')),
      false,
    );

    const relatedBookingParticipant = asRows(tables.bookingParticipants).find(
      (participant) =>
        asString(participant.athleteId) === athleteId && !asString(participant.deletedAt),
    );
    assert.ok(relatedBookingParticipant, 'expected athlete booking participant');
    const relatedBookingId = asString(relatedBookingParticipant.bookingId) as string;
    const relatedBooking = asRows(tables.bookings).find(
      (booking) => asString(booking.id) === relatedBookingId && !asString(booking.deletedAt),
    );
    assert.ok(relatedBooking, 'expected athlete booking');
    const relatedCoachUserId = asString(relatedBooking.coachUserId) as string;
    assert.ok(relatedCoachUserId, 'expected related coach user id');
    const coachHeaders = authHeaders(tables, relatedCoachUserId, 'coach', {
      'x-coach-athlete-ids': athleteId,
      'x-coach-verified': '1',
    });

    const skillUpdate = await app.inject({
      method: 'POST',
      url: `/v1/athletes/${athleteId}/skill-updates`,
      headers: coachHeaders,
      payload: {
        skillName: 'Passing',
        score: 8,
        bookingId: relatedBookingId,
        notes: 'Cleaner tempo in possession.',
      },
    });
    assert.equal(skillUpdate.statusCode, 201);
    const skillUpdatePayload = skillUpdate.json() as {
      skillAssessment: SeedRow;
      skillDefinition: SeedRow;
      previousScore: number | null;
      score: number;
    };
    assert.match(asString(skillUpdatePayload.skillAssessment.id) ?? '', /^ska_/);
    assert.equal(asString(skillUpdatePayload.skillAssessment.athleteId), athleteId);
    assert.equal(asString(skillUpdatePayload.skillDefinition.name), 'Passing');
    assert.equal(skillUpdatePayload.score, 8);
    assert.equal(typeof skillUpdatePayload.previousScore === 'number', true);

    const badgeAward = await app.inject({
      method: 'POST',
      url: `/v1/athletes/${athleteId}/badge-awards`,
      headers: coachHeaders,
      payload: {
        badgeId: 'badge_api_route_focus',
        badgeLabel: 'API Route Focus',
        badgeCategory: 'technical',
        badgeTier: 1,
        badgePointValue: 10,
        sessionId: relatedBookingId,
        reason: 'Strong focus during route cutover verification.',
        note: 'Kept tempo and scanning tidy.',
        visibility: 'supporters',
        context: 'session',
      },
    });
    assert.equal(badgeAward.statusCode, 201);
    const badgeAwardPayload = badgeAward.json() as {
      badge: SeedRow;
      badgeDefinition: SeedRow;
    };
    const badgeAwardId = asString(badgeAwardPayload.badge.id) as string;
    assert.match(badgeAwardId, /^aba_/);
    assert.equal(asString(badgeAwardPayload.badge.athleteId), athleteId);
    assert.equal(asString(badgeAwardPayload.badge.awardedByUserId), relatedCoachUserId);
    assert.equal(asString(badgeAwardPayload.badge.bookingId), relatedBookingId);
    assert.equal(asString(badgeAwardPayload.badgeDefinition.name), 'API Route Focus');

    const cooldownDenied = await app.inject({
      method: 'POST',
      url: `/v1/athletes/${athleteId}/badge-awards`,
      headers: coachHeaders,
      payload: {
        badgeId: 'badge_api_route_second',
        badgeLabel: 'API Route Second',
        badgeCategory: 'technical',
        sessionId: relatedBookingId,
        reason: 'Second badge without override should be blocked.',
        visibility: 'supporters',
      },
    });
    assert.equal(cooldownDenied.statusCode, 400);

    const overrideAward = await app.inject({
      method: 'POST',
      url: `/v1/athletes/${athleteId}/badge-awards`,
      headers: coachHeaders,
      payload: {
        badgeId: 'badge_api_route_second',
        badgeLabel: 'API Route Second',
        badgeCategory: 'technical',
        sessionId: relatedBookingId,
        reason: 'Override records why a second badge was justified.',
        visibility: 'supporters',
        overrideCooldown: true,
        overrideNote: 'Coach explicitly justified the second award.',
      },
    });
    assert.equal(overrideAward.statusCode, 201);

    const parentBadgeDenied = await app.inject({
      method: 'POST',
      url: `/v1/athletes/${athleteId}/badge-awards`,
      headers: parentHeaders,
      payload: {
        badgeId: 'badge_parent_denied',
        badgeLabel: 'Parent Denied',
        badgeCategory: 'technical',
        reason: 'Parents cannot award coach badges.',
        visibility: 'supporters',
      },
    });
    assert.equal(parentBadgeDenied.statusCode, 403);

    const seenBadge = await app.inject({
      method: 'POST',
      url: `/v1/badge-awards/${badgeAwardId}/seen`,
      headers: parentHeaders,
    });
    assert.equal(seenBadge.statusCode, 200);
    const seenBadgePayload = seenBadge.json() as { badge: SeedRow };
    assert.equal(seenBadgePayload.badge.seenByParent, true);
    assert.equal(typeof asString(seenBadgePayload.badge.seenAt), 'string');

    const sharedBadge = await app.inject({
      method: 'POST',
      url: `/v1/badge-awards/${badgeAwardId}/share`,
      headers: parentHeaders,
    });
    assert.equal(sharedBadge.statusCode, 200);
    const sharedBadgePayload = sharedBadge.json() as { badge: SeedRow };
    assert.equal(sharedBadgePayload.badge.shared, true);

    const feedPostBadge = await app.inject({
      method: 'POST',
      url: `/v1/badge-awards/${badgeAwardId}/feed-post`,
      headers: parentHeaders,
      payload: {
        note: 'Parent shared the badge to eligible club feeds.',
      },
    });
    assert.equal(feedPostBadge.statusCode, 200);
    const feedPostBadgePayload = feedPostBadge.json() as {
      badge: SeedRow;
      postIds?: string[];
      createdPostCount?: number;
    };
    assert.equal(feedPostBadgePayload.badge.shared, true);
    assert.equal(Array.isArray(feedPostBadgePayload.postIds), true);
    assert.equal(typeof feedPostBadgePayload.createdPostCount, 'number');

    const allSeen = await app.inject({
      method: 'POST',
      url: `/v1/athletes/${athleteId}/badge-awards/seen`,
      headers: parentHeaders,
    });
    assert.equal(allSeen.statusCode, 200);
    const allSeenPayload = allSeen.json() as { badges: SeedRow[]; seenCount: number };
    assert.equal(typeof allSeenPayload.seenCount, 'number');
    assert.equal(
      allSeenPayload.badges.some(
        (badge) => asString(badge.id) === badgeAwardId && badge.seenByParent === true,
      ),
      true,
    );

    const badgesAfterActions = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/badges`,
      headers: parentHeaders,
    });
    assert.equal(badgesAfterActions.statusCode, 200);
    const badgesAfterActionsPayload = badgesAfterActions.json() as { badges: SeedRow[] };
    const updatedBadge = badgesAfterActionsPayload.badges.find(
      (badge) => asString(badge.id) === badgeAwardId,
    );
    assert.equal(updatedBadge?.seenByParent, true);
    assert.equal(updatedBadge?.shared, true);

    const updatedSkillHistory = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/skills/history?skillName=Passing`,
      headers: parentHeaders,
    });
    assert.equal(updatedSkillHistory.statusCode, 200);
    const updatedSkillHistoryPayload = updatedSkillHistory.json() as {
      skills: Array<{ skillName?: string; history?: Array<{ level?: number }> }>;
    };
    assert.equal(updatedSkillHistoryPayload.skills.length, 1);
    assert.equal(
      updatedSkillHistoryPayload.skills[0]?.history?.some((entry) => entry.level === 80),
      true,
    );

    const outsiderCoach = asRows(tables.coachProfiles).find((row) => {
      const coachUserId = asString(row.userId);
      if (!coachUserId || coachUserId === guardianUserId) {
        return false;
      }
      const coachBookings = asRows(tables.bookings)
        .filter(
          (booking) =>
            asString(booking.coachUserId) === coachUserId && !asString(booking.deletedAt),
        )
        .map((booking) => asString(booking.id))
        .filter((bookingId): bookingId is string => Boolean(bookingId));
      const hasBookingRelationship = asRows(tables.bookingParticipants).some(
        (participant) =>
          !asString(participant.deletedAt) &&
          asString(participant.athleteId) === athleteId &&
          coachBookings.includes(asString(participant.bookingId) ?? ''),
      );
      const coachSessions = asRows(tables.groupSessions)
        .filter(
          (session) =>
            asString(session.coachUserId) === coachUserId && !asString(session.deletedAt),
        )
        .map((session) => asString(session.id))
        .filter((sessionId): sessionId is string => Boolean(sessionId));
      const hasGroupRelationship = asRows(tables.groupSessionRegistrations).some(
        (registration) =>
          !asString(registration.deletedAt) &&
          asString(registration.athleteId) === athleteId &&
          coachSessions.includes(asString(registration.groupSessionId) ?? ''),
      );
      const ownedSquads = asRows(tables.squads)
        .filter(
          (squad) => asString(squad.ownerCoachUserId) === coachUserId && !asString(squad.deletedAt),
        )
        .map((squad) => asString(squad.id))
        .filter((squadId): squadId is string => Boolean(squadId));
      const hasSquadRelationship = asRows(tables.squadMemberships).some(
        (membership) =>
          !asString(membership.deletedAt) &&
          asString(membership.athleteId) === athleteId &&
          ownedSquads.includes(asString(membership.squadId) ?? ''),
      );
      return !hasBookingRelationship && !hasGroupRelationship && !hasSquadRelationship;
    });
    assert.ok(outsiderCoach, 'expected outsider coach');
    const denied = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/progress`,
      headers: authHeaders(tables, asString(outsiderCoach.userId) as string, 'coach'),
    });
    assert.equal(denied.statusCode, 403);

    const deniedAnalytics = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/analytics?period=ALL`,
      headers: authHeaders(tables, asString(outsiderCoach.userId) as string, 'coach'),
    });
    assert.equal(deniedAnalytics.statusCode, 403);

    const deniedBadges = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/badges`,
      headers: authHeaders(tables, asString(outsiderCoach.userId) as string, 'coach'),
    });
    assert.equal(deniedBadges.statusCode, 403);

    const deniedSessionBadges = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${badgeSessionId}/badges`,
      headers: authHeaders(tables, asString(outsiderCoach.userId) as string, 'coach'),
    });
    assert.equal(deniedSessionBadges.statusCode, 403);

    const deniedSquadActivity = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/squad-activity?lookbackDays=365`,
      headers: authHeaders(tables, asString(outsiderCoach.userId) as string, 'coach'),
    });
    assert.equal(deniedSquadActivity.statusCode, 403);

    const deniedSkillUpdate = await app.inject({
      method: 'POST',
      url: `/v1/athletes/${athleteId}/skill-updates`,
      headers: authHeaders(tables, asString(outsiderCoach.userId) as string, 'coach'),
      payload: {
        skillName: 'Passing',
        score: 7,
      },
    });
    assert.equal(deniedSkillUpdate.statusCode, 403);

    const liveTables = getMarketplaceSeedStore().tables;
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'athlete_analytics.read',
        resourceId: athleteId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'athlete_badges.read',
        resourceId: athleteId,
        result: 'SUCCESS',
      }).length,
      2,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'session_badges.read',
        resourceId: badgeSessionId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'session_badges.read',
        resourceId: badgeSessionId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'athlete_badges.read',
        resourceId: athleteId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'athlete_squad_activity.read',
        resourceId: athleteId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'athlete_squad_activity.read',
        resourceId: athleteId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'athlete_skill_history.read',
        resourceId: athleteId,
        result: 'SUCCESS',
      }).length >= 2,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'athlete_skill_update.create',
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'athlete_skill_update.create',
        resourceId: athleteId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'athlete_badge_award.create',
        result: 'SUCCESS',
      }).length,
      2,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'athlete_badge_award.create',
        resourceId: athleteId,
        result: 'DENY',
      }).length,
      2,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'athlete_badge_award.seen',
        resourceId: badgeAwardId,
        result: 'SUCCESS',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'athlete_badge_award.share',
        resourceId: badgeAwardId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'athlete_badge_award.feed_post',
        resourceId: badgeAwardId,
        result: 'SUCCESS',
      }).length,
      1,
    );
  });

  it('stores coach SEN observations through audited v1 authority and soft-removes them', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables;
    const participant = asRows(tables.bookingParticipants).find(
      (row) => Boolean(asString(row.athleteId)) && !asString(row.deletedAt),
    );
    assert.ok(participant, 'expected a booking participant with an athlete');
    const athleteId = asString(participant.athleteId) as string;
    const booking = asRows(tables.bookings).find(
      (row) => asString(row.id) === asString(participant.bookingId) && !asString(row.deletedAt),
    );
    assert.ok(booking, 'expected booking for athlete participant');
    const coachUserId = asString(booking.coachUserId) as string;
    const coachHeaders = authHeaders(tables, coachUserId, 'coach', {
      'x-coach-athlete-ids': athleteId,
      'x-coach-verified': '1',
    });

    const created = await app.inject({
      method: 'POST',
      url: `/v1/athletes/${athleteId}/coach-observations`,
      headers: coachHeaders,
      payload: {
        text: 'Needs visual instructions before new pressure drills.',
        category: 'COMMUNICATION',
        isPrivate: true,
      },
    });
    assert.equal(created.statusCode, 201);
    const createdPayload = created.json() as {
      observation: {
        id: string;
        athleteId: string;
        coachId: string;
        text: string;
        category: string;
        isPrivate: boolean;
      };
    };
    assert.match(createdPayload.observation.id, /^snt_/);
    assert.equal(createdPayload.observation.athleteId, athleteId);
    assert.equal(createdPayload.observation.coachId, coachUserId);
    assert.equal(createdPayload.observation.category, 'COMMUNICATION');
    assert.equal(createdPayload.observation.isPrivate, true);

    const guardianLink = asRows(tables.guardianChildLinks).find(
      (row) => asString(row.athleteId) === athleteId,
    );
    assert.ok(guardianLink, 'expected guardian link for athlete');
    const guardianDenied = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/coach-observations`,
      headers: authHeaders(tables, asString(guardianLink.guardianUserId) as string, 'parent', {
        'x-guardian-athlete-ids': athleteId,
      }),
    });
    assert.equal(guardianDenied.statusCode, 403);

    const listed = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/coach-observations`,
      headers: coachHeaders,
    });
    assert.equal(listed.statusCode, 200);
    const listedPayload = listed.json() as {
      observations: Array<{ id: string; text: string }>;
      total: number;
    };
    assert.equal(listedPayload.total, 1);
    assert.equal(listedPayload.observations[0]?.id, createdPayload.observation.id);

    const updated = await app.inject({
      method: 'PATCH',
      url: `/v1/coach-observations/${createdPayload.observation.id}`,
      headers: coachHeaders,
      payload: {
        text: 'Use visual instructions before pressure drills.',
        category: 'PROGRESS',
      },
    });
    assert.equal(updated.statusCode, 200);
    const updatedPayload = updated.json() as {
      observation: { text: string; category: string; isPrivate: boolean };
    };
    assert.equal(
      updatedPayload.observation.text,
      'Use visual instructions before pressure drills.',
    );
    assert.equal(updatedPayload.observation.category, 'PROGRESS');
    assert.equal(updatedPayload.observation.isPrivate, true);

    const removed = await app.inject({
      method: 'DELETE',
      url: `/v1/coach-observations/${createdPayload.observation.id}`,
      headers: coachHeaders,
    });
    assert.equal(removed.statusCode, 200);
    assert.equal((removed.json() as { removed: boolean }).removed, true);

    const afterRemove = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/coach-observations`,
      headers: coachHeaders,
    });
    assert.equal(afterRemove.statusCode, 200);
    assert.equal((afterRemove.json() as { total: number }).total, 0);

    const sessionNote = asRows(tables.sessionNotes).find(
      (row) => asString(row.id) === createdPayload.observation.id,
    );
    assert.ok(sessionNote, 'expected soft-removed SessionNote row');
    assert.equal(Boolean(asString(sessionNote.deletedAt)), true);
    assert.equal(asString(sessionNote.deletedByUserId), coachUserId);

    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_observation.create',
        resourceId: createdPayload.observation.id,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_observation.read',
        resourceId: athleteId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_observation.remove',
        resourceId: createdPayload.observation.id,
        result: 'SUCCESS',
      }).length,
      1,
    );
  });

  it('persists session media through backend authority and audits denied removal', async () => {
    const tables = loadTables();
    const store = getMarketplaceSeedStore();
    const guardianLink = asRows(tables.guardianChildLinks).find(
      (link) => Boolean(asString(link.athleteId)) && Boolean(asString(link.guardianUserId)),
    );
    assert.ok(guardianLink, 'expected guardian link for session media');
    const athleteId = asString(guardianLink.athleteId) as string;
    const guardianUserId = asString(guardianLink.guardianUserId) as string;
    const bookingParticipant = asRows(tables.bookingParticipants).find(
      (participant) =>
        asString(participant.athleteId) === athleteId && !asString(participant.deletedAt),
    );
    assert.ok(bookingParticipant, 'expected athlete booking participant');
    const sessionId = asString(bookingParticipant.bookingId) as string;
    const booking = asRows(tables.bookings).find((row) => asString(row.id) === sessionId);
    assert.ok(booking, 'expected athlete booking');
    const coachUserId = asString(booking.coachUserId) as string;
    const outsiderUserId = findUserWithoutAthleteHealthAccess(
      tables,
      athleteId,
      new Set([guardianUserId, coachUserId]),
    );
    const now = new Date().toISOString();

    store.tables.childConsents ??= [];
    store.tables.childConsents.push(
      {
        id: 'cc_session_media_photo',
        athleteId,
        consentType: 'PHOTO',
        granted: true,
        grantedByUserId: guardianUserId,
        grantedAt: now,
        expiresAt: null,
        revokedAt: null,
        createdAt: now,
      },
      {
        id: 'cc_session_media_video',
        athleteId,
        consentType: 'VIDEO',
        granted: true,
        grantedByUserId: guardianUserId,
        grantedAt: now,
        expiresAt: null,
        revokedAt: null,
        createdAt: now,
      },
    );
    store.tables.mediaObjects ??= [];
    store.tables.mediaObjects.push(
      {
        id: 'med_session_media_photo',
        ownerUserId: coachUserId,
        kind: 'IMAGE',
        status: 'AVAILABLE',
        storageKey: 'test/session-media/photo.jpg',
        bucketName: 'clubroom-private',
        contentType: 'image/jpeg',
        sizeBytes: 1234,
        visibilityScope: 'private',
        consentRequired: true,
        createdByUserId: coachUserId,
        updatedByUserId: coachUserId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'med_session_media_thumb',
        ownerUserId: coachUserId,
        kind: 'IMAGE',
        status: 'AVAILABLE',
        storageKey: 'test/session-media/thumb.jpg',
        bucketName: 'clubroom-private',
        contentType: 'image/jpeg',
        sizeBytes: 456,
        visibilityScope: 'private',
        consentRequired: true,
        createdByUserId: coachUserId,
        updatedByUserId: coachUserId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'med_session_media_document',
        ownerUserId: coachUserId,
        kind: 'DOCUMENT',
        status: 'AVAILABLE',
        storageKey: 'test/session-media/document.pdf',
        bucketName: 'clubroom-private',
        contentType: 'application/pdf',
        sizeBytes: 789,
        visibilityScope: 'private',
        consentRequired: true,
        createdByUserId: coachUserId,
        updatedByUserId: coachUserId,
        createdAt: now,
        updatedAt: now,
      },
    );

    const coachHeaders = authHeaders(tables, coachUserId, 'coach', {
      'x-coach-athlete-ids': athleteId,
      'x-coach-verified': '1',
    });
    const parentHeaders = authHeaders(tables, guardianUserId, 'parent', {
      'x-guardian-athlete-ids': athleteId,
    });

    const deniedSave = await app.inject({
      method: 'PUT',
      url: '/v1/session-media',
      headers: authHeaders(tables, outsiderUserId, 'coach'),
      payload: {
        sessionId,
        athleteId,
        coachId: outsiderUserId,
        photos: [
          {
            kind: 'photo',
            mediaObjectId: 'med_session_media_photo',
            thumbnailMediaObjectId: 'med_session_media_thumb',
            width: 800,
            height: 600,
            capturedAt: now,
          },
        ],
      },
    });
    assert.equal(deniedSave.statusCode, 403);

    const wrongKindSave = await app.inject({
      method: 'PUT',
      url: '/v1/session-media',
      headers: coachHeaders,
      payload: {
        sessionId,
        athleteId,
        coachId: coachUserId,
        photos: [
          {
            kind: 'photo',
            mediaObjectId: 'med_session_media_document',
            width: 800,
            height: 600,
            capturedAt: now,
          },
        ],
      },
    });
    assert.equal(wrongKindSave.statusCode, 400);

    const saved = await app.inject({
      method: 'PUT',
      url: '/v1/session-media',
      headers: coachHeaders,
      payload: {
        sessionId,
        athleteId,
        coachId: coachUserId,
        photos: [
          {
            kind: 'photo',
            mediaObjectId: 'med_session_media_photo',
            thumbnailMediaObjectId: 'med_session_media_thumb',
            width: 800,
            height: 600,
            capturedAt: now,
          },
        ],
        video: null,
      },
    });
    assert.equal(saved.statusCode, 200);
    const media = saved.json() as { media: SeedRow };
    const assetId = asString(asRows(media.media.photos)[0]?.id) as string;
    assert.ok(assetId, 'expected saved media asset id');

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/session-media?sessionId=${sessionId}&athleteId=${athleteId}`,
      headers: parentHeaders,
    });
    assert.equal(detail.statusCode, 200);
    assert.equal(asRows((detail.json() as { media: SeedRow }).media.photos).length, 1);

    const deniedRemove = await app.inject({
      method: 'DELETE',
      url: `/v1/session-media/assets/${assetId}`,
      headers: authHeaders(tables, outsiderUserId, 'coach'),
    });
    assert.equal(deniedRemove.statusCode, 403);

    const stillThere = await app.inject({
      method: 'GET',
      url: `/v1/session-media?sessionId=${sessionId}&athleteId=${athleteId}`,
      headers: parentHeaders,
    });
    assert.equal(asRows((stillThere.json() as { media: SeedRow }).media.photos).length, 1);

    const removed = await app.inject({
      method: 'DELETE',
      url: `/v1/session-media/assets/${assetId}`,
      headers: coachHeaders,
    });
    assert.equal(removed.statusCode, 200);
    assert.equal((removed.json() as { media: SeedRow | null }).media, null);

    const liveTables = getMarketplaceSeedStore().tables;
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'session_media.save',
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'session_media.save',
        result: 'DENY',
      }).length,
      2,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'session_media.remove',
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'session_media.remove',
        result: 'SUCCESS',
      }).length,
      1,
    );
  });

  it('persists session feedback through backend authority and audits denied writes', async () => {
    const tables = loadTables();
    const guardianLink = asRows(tables.guardianChildLinks).find(
      (link) => Boolean(asString(link.athleteId)) && Boolean(asString(link.guardianUserId)),
    );
    assert.ok(guardianLink, 'expected guardian link for session feedback');
    const athleteId = asString(guardianLink.athleteId) as string;
    const guardianUserId = asString(guardianLink.guardianUserId) as string;
    const bookingParticipant = asRows(tables.bookingParticipants).find(
      (participant) =>
        asString(participant.athleteId) === athleteId && !asString(participant.deletedAt),
    );
    assert.ok(bookingParticipant, 'expected athlete booking participant');
    const bookingId = asString(bookingParticipant.bookingId) as string;
    const booking = asRows(tables.bookings).find((row) => asString(row.id) === bookingId);
    assert.ok(booking, 'expected athlete booking');
    const coachUserId = asString(booking.coachUserId) as string;
    const coachHeaders = authHeaders(tables, coachUserId, 'coach', {
      'x-coach-athlete-ids': athleteId,
      'x-coach-verified': '1',
    });
    const parentHeaders = authHeaders(tables, guardianUserId, 'parent', {
      'x-guardian-athlete-ids': athleteId,
    });
    const outsiderUserId = findUserWithoutAthleteHealthAccess(
      tables,
      athleteId,
      new Set([guardianUserId, coachUserId]),
    );

    const denied = await app.inject({
      method: 'POST',
      url: '/v1/session-feedback',
      headers: authHeaders(tables, outsiderUserId, 'coach'),
      payload: {
        sessionId: bookingId,
        bookingId,
        coachId: outsiderUserId,
        coachName: 'Outsider Coach',
        athleteId,
        athleteName: 'Linked Athlete',
        publicSummary: 'Should not save.',
        effortRating: 3,
        overallPerformance: 3,
        visibility: 'parent',
      },
    });
    assert.equal(denied.statusCode, 403);

    const saved = await app.inject({
      method: 'POST',
      url: '/v1/session-feedback',
      headers: coachHeaders,
      payload: {
        sessionId: bookingId,
        bookingId,
        coachId: coachUserId,
        coachName: 'Coach Feedback',
        athleteId,
        athleteName: 'Linked Athlete',
        privateNotes: 'Coach-only detail',
        publicSummary: 'Strong receiving angles.',
        skillsWorkedOn: ['First touch', 'Scanning'],
        skillRatings: [{ skill: 'First touch', rating: 4 }],
        improvements: 'Open hips earlier.',
        homework: 'Wall passes before next session.',
        effortRating: 4,
        overallPerformance: 4,
        visibility: 'parent',
      },
    });
    assert.equal(saved.statusCode, 200);
    const savedPayload = saved.json() as { feedback: SeedRow };
    assert.equal(asString(savedPayload.feedback.sessionId), bookingId);
    assert.equal(asString(savedPayload.feedback.publicSummary), 'Strong receiving angles.');

    const listed = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/session-feedback?viewerRole=parent`,
      headers: parentHeaders,
    });
    assert.equal(listed.statusCode, 200);
    const listPayload = listed.json() as { feedback: SeedRow[] };
    const listedFeedback = listPayload.feedback.find(
      (entry) => asString(entry.sessionId) === bookingId,
    );
    assert.ok(listedFeedback, 'expected feedback in athlete list');
    assert.equal(asString(listedFeedback.privateNotes), undefined);
    assert.equal(asString(listedFeedback.homework), 'Wall passes before next session.');

    const feedbackTaskId = `practice_task_drill_dra_feedback_${asString(savedPayload.feedback.id)}`;
    const practiceTasks = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/practice-tasks?viewerRole=parent`,
      headers: parentHeaders,
    });
    assert.equal(practiceTasks.statusCode, 200);
    const practiceTasksPayload = practiceTasks.json() as {
      tasks: Array<{
        id?: string;
        description?: string;
        source?: string;
        status?: string;
      }>;
    };
    const homeworkTask = practiceTasksPayload.tasks.find((task) => task.id === feedbackTaskId);
    assert.ok(homeworkTask, 'expected feedback homework to create a practice task');
    assert.equal(homeworkTask.source, 'drill_assignment');
    assert.equal(homeworkTask.description, 'Wall passes before next session.');
    assert.equal(homeworkTask.status, 'pending');

    const completedHomework = await app.inject({
      method: 'POST',
      url: `/v1/practice-tasks/${feedbackTaskId}/completion`,
      headers: parentHeaders,
      payload: {
        completed: true,
        completionNote: 'Done after school.',
      },
    });
    assert.equal(completedHomework.statusCode, 200);
    const completedHomeworkPayload = completedHomework.json() as {
      task: {
        id?: string;
        completionNote?: string;
        completedByUserId?: string;
        status?: string;
      };
    };
    assert.equal(completedHomeworkPayload.task.id, feedbackTaskId);
    assert.equal(completedHomeworkPayload.task.status, 'completed');
    assert.equal(completedHomeworkPayload.task.completionNote, 'Done after school.');
    assert.equal(completedHomeworkPayload.task.completedByUserId, guardianUserId);

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/session-feedback?sessionId=${bookingId}&viewerRole=parent`,
      headers: parentHeaders,
    });
    assert.equal(detail.statusCode, 200);
    assert.equal(
      asString((detail.json() as { feedback: SeedRow | null }).feedback?.publicSummary),
      'Strong receiving angles.',
    );

    const liveTables = getMarketplaceSeedStore().tables;
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'session_feedback.save',
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'session_feedback.save',
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'session_feedback.read',
        result: 'SUCCESS',
      }).length >= 2,
      true,
    );
  });

  it('mutates athlete goals through backend authority and audits writes', async () => {
    const tables = loadTables();
    const guardianLink = asRows(tables.guardianChildLinks).find(
      (link) => Boolean(asString(link.athleteId)) && Boolean(asString(link.guardianUserId)),
    );
    assert.ok(guardianLink, 'expected guardian link for goal CRUD');
    const athleteId = asString(guardianLink.athleteId) as string;
    const guardianUserId = asString(guardianLink.guardianUserId) as string;
    const athleteUserId = athleteId.startsWith('ath_') ? `usr_${athleteId.slice(4)}` : athleteId;
    const parentHeaders = authHeaders(tables, guardianUserId, 'parent', {
      'x-guardian-athlete-ids': athleteId,
    });

    const created = await app.inject({
      method: 'POST',
      url: `/v1/athletes/${athleteId}/goals`,
      headers: parentHeaders,
      payload: {
        title: 'Improve first touch',
        description: 'Keep first touch clean under match pressure.',
        category: 'BALL_SKILLS',
        targetDate: '2026-09-01',
        milestones: ['Complete first-touch baseline', 'Review coach feedback'],
      },
    });
    assert.equal(created.statusCode, 201);
    const createdPayload = created.json() as {
      goal: SeedRow;
      milestones: SeedRow[];
    };
    const goalId = asString(createdPayload.goal.id) as string;
    assert.match(goalId, /^gol_/);
    assert.equal(asString(createdPayload.goal.athleteId), athleteId);
    assert.equal(asString(createdPayload.goal.ownerUserId), athleteUserId);
    assert.equal(asString(createdPayload.goal.status), 'ACTIVE');
    assert.equal(createdPayload.milestones.length, 2);

    const read = await app.inject({
      method: 'GET',
      url: `/v1/goals/${goalId}`,
      headers: parentHeaders,
    });
    assert.equal(read.statusCode, 200);
    const readPayload = read.json() as { goal: SeedRow; milestones: SeedRow[] };
    assert.equal(asString(readPayload.goal.id), goalId);
    assert.equal(readPayload.milestones.length, 2);

    const firstMilestoneId = asString(readPayload.milestones[0]?.id) as string;
    const progressUpdated = await app.inject({
      method: 'PATCH',
      url: `/v1/goals/${goalId}/progress`,
      headers: parentHeaders,
      payload: {
        progress: 50,
        completedMilestoneIds: [firstMilestoneId],
      },
    });
    assert.equal(progressUpdated.statusCode, 200);
    const progressPayload = progressUpdated.json() as { goal: SeedRow; milestones: SeedRow[] };
    assert.equal(asNumber(progressPayload.goal.progress), 50);
    assert.equal(
      progressPayload.milestones.some(
        (milestone) =>
          asString(milestone.id) === firstMilestoneId &&
          asString(milestone.status) === 'COMPLETED' &&
          Boolean(asString(milestone.completedAt)),
      ),
      true,
    );

    const patched = await app.inject({
      method: 'PATCH',
      url: `/v1/goals/${goalId}`,
      headers: parentHeaders,
      payload: {
        title: 'Improve first touch under pressure',
        status: 'COMPLETED',
      },
    });
    assert.equal(patched.statusCode, 200);
    const patchedPayload = patched.json() as { goal: SeedRow };
    assert.equal(asString(patchedPayload.goal.title), 'Improve first touch under pressure');
    assert.equal(asString(patchedPayload.goal.status), 'COMPLETED');

    const outsiderUserId = findUserWithoutAthleteHealthAccess(
      tables,
      athleteId,
      new Set([guardianUserId, athleteUserId]),
    );

    const milestoneCreated = await app.inject({
      method: 'POST',
      url: `/v1/goals/${goalId}/milestones`,
      headers: parentHeaders,
      payload: {
        title: 'Complete pressure receiving drill',
        dueDate: '2026-09-15',
      },
    });
    assert.equal(milestoneCreated.statusCode, 201);
    const milestoneCreatedPayload = milestoneCreated.json() as {
      milestone: SeedRow;
      milestones: SeedRow[];
    };
    const addedMilestoneId = asString(milestoneCreatedPayload.milestone.id) as string;
    assert.match(addedMilestoneId, /^glm_/);
    assert.equal(asString(milestoneCreatedPayload.milestone.status), 'PENDING');
    assert.equal(milestoneCreatedPayload.milestones.length, 3);

    const milestonePatched = await app.inject({
      method: 'PATCH',
      url: `/v1/goals/${goalId}/milestones/${addedMilestoneId}`,
      headers: parentHeaders,
      payload: {
        title: 'Complete pressure receiving drill twice',
        status: 'COMPLETED',
      },
    });
    assert.equal(milestonePatched.statusCode, 200);
    const milestonePatchedPayload = milestonePatched.json() as { milestone: SeedRow };
    assert.equal(
      asString(milestonePatchedPayload.milestone.title),
      'Complete pressure receiving drill twice',
    );
    assert.equal(asString(milestonePatchedPayload.milestone.status), 'COMPLETED');
    assert.ok(asString(milestonePatchedPayload.milestone.completedAt));

    const milestoneReopened = await app.inject({
      method: 'PATCH',
      url: `/v1/milestones/${addedMilestoneId}`,
      headers: parentHeaders,
      payload: {
        status: 'PENDING',
      },
    });
    assert.equal(milestoneReopened.statusCode, 200);
    const milestoneReopenedPayload = milestoneReopened.json() as { milestone: SeedRow };
    assert.equal(asString(milestoneReopenedPayload.milestone.status), 'PENDING');
    assert.equal(asString(milestoneReopenedPayload.milestone.completedAt), undefined);

    const denied = await app.inject({
      method: 'PATCH',
      url: `/v1/goals/${goalId}`,
      headers: authHeaders(tables, outsiderUserId),
      payload: {
        status: 'ABANDONED',
      },
    });
    assert.equal(denied.statusCode, 403);

    const deniedProgress = await app.inject({
      method: 'PATCH',
      url: `/v1/goals/${goalId}/progress`,
      headers: authHeaders(tables, outsiderUserId),
      payload: {
        progress: 25,
      },
    });
    assert.equal(deniedProgress.statusCode, 403);

    const deniedMilestone = await app.inject({
      method: 'PATCH',
      url: `/v1/milestones/${addedMilestoneId}`,
      headers: authHeaders(tables, outsiderUserId),
      payload: {
        status: 'COMPLETED',
      },
    });
    assert.equal(deniedMilestone.statusCode, 403);

    const milestoneDeleted = await app.inject({
      method: 'DELETE',
      url: `/v1/milestones/${addedMilestoneId}`,
      headers: parentHeaders,
    });
    assert.equal(milestoneDeleted.statusCode, 200);
    const milestoneDeletedPayload = milestoneDeleted.json() as { milestones: SeedRow[] };
    assert.equal(
      milestoneDeletedPayload.milestones.some(
        (milestone) => asString(milestone.id) === addedMilestoneId,
      ),
      false,
    );

    const afterMilestoneDelete = await app.inject({
      method: 'GET',
      url: `/v1/goals/${goalId}`,
      headers: parentHeaders,
    });
    assert.equal(afterMilestoneDelete.statusCode, 200);
    const afterMilestoneDeletePayload = afterMilestoneDelete.json() as { milestones: SeedRow[] };
    assert.equal(
      afterMilestoneDeletePayload.milestones.some(
        (milestone) => asString(milestone.id) === addedMilestoneId,
      ),
      false,
    );

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/v1/goals/${goalId}`,
      headers: parentHeaders,
    });
    assert.equal(deleted.statusCode, 204);

    const missing = await app.inject({
      method: 'GET',
      url: `/v1/goals/${goalId}`,
      headers: parentHeaders,
    });
    assert.equal(missing.statusCode, 404);

    const liveTables = getMarketplaceSeedStore().tables;
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'athlete_goal.create',
        resourceId: goalId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'athlete_goal.read',
        resourceId: goalId,
        result: 'SUCCESS',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'athlete_goal.update',
        resourceId: goalId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'athlete_goal.progress_update',
        resourceId: goalId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'athlete_goal.progress_update',
        resourceId: goalId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'athlete_goal.archive',
        resourceId: goalId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'athlete_goal_milestone.create',
        resourceId: addedMilestoneId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'athlete_goal_milestone.update',
        resourceId: addedMilestoneId,
        result: 'SUCCESS',
      }).length,
      2,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'athlete_goal_milestone.archive',
        resourceId: addedMilestoneId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    const storedGoal = asRows(liveTables.goals).find((goal) => asString(goal.id) === goalId);
    assert.ok(asString(storedGoal?.deletedAt), 'expected deleted goal to be soft deleted');
    const storedMilestone = asRows(liveTables.goalMilestones).find(
      (milestone) => asString(milestone.id) === addedMilestoneId,
    );
    assert.ok(
      asString(storedMilestone?.deletedAt),
      'expected deleted milestone to be soft deleted',
    );
  });

  it('persists athlete practice logs through /v1 authority and denies outsiders', async () => {
    const tables = loadTables();
    const guardianLink = asRows(tables.guardianChildLinks).find(
      (row) => asString(row.athleteId) && asString(row.guardianUserId),
    );
    assert.ok(guardianLink, 'expected guardian child link');
    const athleteId = asString(guardianLink.athleteId) as string;
    const guardianUserId = asString(guardianLink.guardianUserId) as string;
    const parentHeaders = authHeaders(tables, guardianUserId, 'parent', {
      'x-guardian-athlete-ids': athleteId,
    });

    const created = await app.inject({
      method: 'POST',
      url: `/v1/athletes/${athleteId}/practice-logs`,
      headers: parentHeaders,
      payload: {
        minutes: 25,
        note: 'Wall passing and ball mastery.',
        dateKey: '2026-07-01',
      },
    });
    assert.equal(created.statusCode, 201);
    const createdPayload = created.json() as {
      log: {
        id: string;
        athleteId: string;
        authorUserId: string;
        dateKey: string;
        minutes: number;
        note?: string;
      };
    };
    assert.equal(createdPayload.log.athleteId, athleteId);
    assert.equal(createdPayload.log.authorUserId, guardianUserId);
    assert.equal(createdPayload.log.dateKey, '2026-07-01');
    assert.equal(createdPayload.log.minutes, 25);
    assert.equal(createdPayload.log.note, 'Wall passing and ball mastery.');

    const updated = await app.inject({
      method: 'POST',
      url: `/v1/athletes/${athleteId}/practice-logs`,
      headers: parentHeaders,
      payload: {
        minutes: 15,
        dateKey: '2026-07-01',
      },
    });
    assert.equal(updated.statusCode, 201);
    assert.equal((updated.json() as { log: { minutes: number } }).log.minutes, 40);

    const listed = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/practice-logs?since=2026-07-01`,
      headers: parentHeaders,
    });
    assert.equal(listed.statusCode, 200);
    const listedPayload = listed.json() as {
      athleteId: string;
      total: number;
      logs: Array<{ id: string; minutes: number }>;
    };
    assert.equal(listedPayload.athleteId, athleteId);
    assert.equal(listedPayload.total, 1);
    assert.equal(listedPayload.logs[0]?.id, createdPayload.log.id);
    assert.equal(listedPayload.logs[0]?.minutes, 40);

    const todayCreated = await app.inject({
      method: 'POST',
      url: `/v1/athletes/${athleteId}/practice-logs`,
      headers: parentHeaders,
      payload: {
        minutes: 10,
      },
    });
    assert.equal(todayCreated.statusCode, 201);
    const today = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/practice-logs/today`,
      headers: parentHeaders,
    });
    assert.equal(today.statusCode, 200);
    assert.equal((today.json() as { log: { minutes: number } | null }).log?.minutes, 10);

    const outsiderUserId = findUserWithoutAthleteHealthAccess(
      tables,
      athleteId,
      new Set([guardianUserId]),
    );
    const denied = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/practice-logs`,
      headers: authHeaders(tables, outsiderUserId, 'parent'),
    });
    assert.equal(denied.statusCode, 403);

    const liveTables = getMarketplaceSeedStore().tables as SeedTables;
    assert.equal(
      asRows(liveTables.practiceLogs).filter((row) => asString(row.athleteId) === athleteId).length,
      2,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'practice_logs.write',
        result: 'SUCCESS',
      }).length,
      3,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'practice_logs.read',
        resourceId: athleteId,
        result: 'DENY',
      }).length,
      1,
    );
  });

  it('persists progress challenge state through /v1 authority and denies outsiders', async () => {
    const tables = loadTables();
    const guardianLink = asRows(tables.guardianChildLinks).find(
      (row) => asString(row.athleteId) && asString(row.guardianUserId),
    );
    assert.ok(guardianLink, 'expected guardian child link');
    const athleteId = asString(guardianLink.athleteId) as string;
    const guardianUserId = asString(guardianLink.guardianUserId) as string;
    const parentHeaders = authHeaders(tables, guardianUserId, 'parent', {
      'x-guardian-athlete-ids': athleteId,
    });
    const challengeId = 'progress_challenge_api_test';
    const challengeBody = {
      type: 'journal',
      title: 'Reflect on practice',
      description: 'Log three practice notes this week.',
      targetValue: 3,
      currentValue: 1,
      progress: 33,
      rewardBadgeId: 'badge_reflection',
      rewardLabel: 'Reflection badge',
      status: 'active',
      assignedAt: '2026-07-03T09:00:00.000Z',
      expiresAt: '2026-07-10T09:00:00.000Z',
      completedAt: null,
    };

    const emptyActive = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/progress-challenge`,
      headers: parentHeaders,
    });
    assert.equal(emptyActive.statusCode, 200);
    assert.equal((emptyActive.json() as { challenge: unknown }).challenge, null);

    const upserted = await app.inject({
      method: 'PUT',
      url: `/v1/athletes/${athleteId}/progress-challenges/${challengeId}`,
      headers: parentHeaders,
      payload: challengeBody,
    });
    assert.equal(upserted.statusCode, 200);
    assert.equal((upserted.json() as { challenge: { id: string } }).challenge.id, challengeId);

    const active = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/progress-challenge`,
      headers: parentHeaders,
    });
    assert.equal(active.statusCode, 200);
    assert.equal((active.json() as { challenge: { id: string } }).challenge.id, challengeId);

    const byId = await app.inject({
      method: 'GET',
      url: `/v1/progress-challenges/${challengeId}`,
      headers: parentHeaders,
    });
    assert.equal(byId.statusCode, 200);
    assert.equal(
      (byId.json() as { challenge: { athleteId: string } }).challenge.athleteId,
      athleteId,
    );

    const completed = await app.inject({
      method: 'PUT',
      url: `/v1/athletes/${athleteId}/progress-challenges/${challengeId}`,
      headers: parentHeaders,
      payload: {
        ...challengeBody,
        currentValue: 3,
        progress: 100,
        status: 'completed',
        completedAt: '2026-07-04T10:00:00.000Z',
      },
    });
    assert.equal(completed.statusCode, 200);
    assert.equal(
      (completed.json() as { challenge: { status: string; progress: number } }).challenge.status,
      'completed',
    );
    assert.equal(
      (completed.json() as { challenge: { status: string; progress: number } }).challenge.progress,
      100,
    );

    const history = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/progress-challenges/history`,
      headers: parentHeaders,
    });
    assert.equal(history.statusCode, 200);
    assert.deepEqual(
      (history.json() as { challenges: Array<{ id: string }> }).challenges.map(
        (challenge) => challenge.id,
      ),
      [challengeId],
    );

    const outsiderUserId = findUserWithoutAthleteHealthAccess(
      tables,
      athleteId,
      new Set([guardianUserId]),
    );
    const denied = await app.inject({
      method: 'PUT',
      url: `/v1/athletes/${athleteId}/progress-challenges/${challengeId}`,
      headers: authHeaders(tables, outsiderUserId, 'parent'),
      payload: challengeBody,
    });
    assert.equal(denied.statusCode, 403);

    const liveTables = getMarketplaceSeedStore().tables as SeedTables;
    const storedChallenge = asRows(liveTables.progressChallenges).find(
      (row) => asString(row.id) === challengeId,
    );
    assert.equal(asString(storedChallenge?.status), 'completed');
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'progress_challenge.upsert',
        resourceId: challengeId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'progress_challenge.complete',
        resourceId: challengeId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'progress_challenge.upsert',
        resourceId: challengeId,
        result: 'DENY',
      }).length,
      1,
    );
  });

  it('persists self-assessments through /v1 authority and denies outsiders', async () => {
    const tables = loadTables();
    const completedBooking = asRows(tables.bookings).find((booking) => {
      const bookingId = asString(booking.id);
      if (!bookingId || asString(booking.status) !== 'COMPLETED' || asString(booking.deletedAt)) {
        return false;
      }
      return asRows(tables.bookingParticipants).some((participant) => {
        const athleteId = asString(participant.athleteId);
        return (
          asString(participant.bookingId) === bookingId &&
          Boolean(athleteId) &&
          !asString(participant.deletedAt) &&
          asRows(tables.guardianChildLinks).some(
            (link) => asString(link.athleteId) === athleteId && !asString(link.deletedAt),
          )
        );
      });
    });
    assert.ok(completedBooking, 'expected completed booking with guarded athlete');
    const bookingId = asString(completedBooking.id) as string;
    const coachUserId = asString(completedBooking.coachUserId) as string;
    const participant = asRows(tables.bookingParticipants).find(
      (row) => asString(row.bookingId) === bookingId && Boolean(asString(row.athleteId)),
    );
    assert.ok(participant, 'expected completed booking participant');
    const athleteId = asString(participant.athleteId) as string;
    const guardianLink = asRows(tables.guardianChildLinks).find(
      (row) => asString(row.athleteId) === athleteId && !asString(row.deletedAt),
    );
    assert.ok(guardianLink, 'expected linked guardian');
    const guardianUserId = asString(guardianLink.guardianUserId) as string;
    const parentHeaders = authHeaders(tables, guardianUserId, 'parent', {
      'x-guardian-athlete-ids': athleteId,
    });

    const promptRead = await app.inject({
      method: 'GET',
      url: `/v1/me/self-assessment-prompts?athleteId=${encodeURIComponent(athleteId)}`,
      headers: parentHeaders,
    });
    assert.equal(promptRead.statusCode, 200);
    const promptPayload = promptRead.json() as {
      prompt: { id: string; athleteId: string; coachId: string; bookingId: string } | null;
    };
    assert.equal(promptPayload.prompt?.athleteId, athleteId);
    assert.equal(promptPayload.prompt?.coachId, coachUserId);
    assert.equal(promptPayload.prompt?.bookingId, bookingId);
    const promptId = promptPayload.prompt?.id as string;

    const deniedDispatch = await app.inject({
      method: 'POST',
      url: `/v1/self-assessment-prompts/${encodeURIComponent(promptId)}/dispatch`,
      headers: parentHeaders,
    });
    assert.equal(deniedDispatch.statusCode, 403);

    const adminUserId = findPrivilegedAdminUserId(tables, new Set([guardianUserId]));
    const dispatched = await app.inject({
      method: 'POST',
      url: `/v1/self-assessment-prompts/${encodeURIComponent(promptId)}/dispatch`,
      headers: authHeaders(tables, adminUserId),
    });
    assert.equal(dispatched.statusCode, 200);
    assert.equal((dispatched.json() as { dispatched: boolean }).dispatched, true);

    const submitted = await app.inject({
      method: 'POST',
      url: '/v1/self-assessments',
      headers: parentHeaders,
      payload: {
        athleteId,
        coachId: coachUserId,
        bookingId,
        sessionId: bookingId,
        mood: 4,
        energyLevel: 3,
        confidence: 5,
        notes: 'Felt sharper after the session.',
      },
    });
    assert.equal(submitted.statusCode, 201);
    const submittedPayload = submitted.json() as {
      entry: {
        athleteId: string;
        coachId: string;
        bookingId: string;
        mood: number;
        energyLevel: number;
        confidence: number;
        notes: string;
      };
      prompt: { status: string } | null;
    };
    assert.equal(submittedPayload.entry.athleteId, athleteId);
    assert.equal(submittedPayload.entry.coachId, coachUserId);
    assert.equal(submittedPayload.entry.bookingId, bookingId);
    assert.equal(submittedPayload.entry.mood, 4);
    assert.equal(submittedPayload.entry.energyLevel, 3);
    assert.equal(submittedPayload.entry.confidence, 5);
    assert.equal(submittedPayload.entry.notes, 'Felt sharper after the session.');
    assert.equal(submittedPayload.prompt?.status, 'completed');

    const listed = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/self-assessments`,
      headers: parentHeaders,
    });
    assert.equal(listed.statusCode, 200);
    const listedPayload = listed.json() as {
      total: number;
      entries: Array<{ athleteId: string; bookingId: string }>;
    };
    assert.equal(listedPayload.total, 1);
    assert.equal(listedPayload.entries[0]?.athleteId, athleteId);
    assert.equal(listedPayload.entries[0]?.bookingId, bookingId);

    const outsiderUserId = findUserWithoutAthleteHealthAccess(
      tables,
      athleteId,
      new Set([guardianUserId, adminUserId]),
    );
    const deniedRead = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/self-assessments`,
      headers: authHeaders(tables, outsiderUserId, 'parent'),
    });
    assert.equal(deniedRead.statusCode, 403);

    const liveTables = getMarketplaceSeedStore().tables as SeedTables;
    assert.equal(
      asRows(liveTables.selfAssessmentPrompts).filter(
        (row) => asString(row.athleteId) === athleteId,
      ).length,
      1,
    );
    assert.equal(
      asRows(liveTables.selfAssessmentEntries).filter(
        (row) => asString(row.athleteId) === athleteId,
      ).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'self_assessments.submit',
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'self_assessments.read',
        resourceId: athleteId,
        result: 'DENY',
      }).length,
      1,
    );
  });

  it('persists termly report snapshots through /v1 authority and denies outsiders', async () => {
    const tables = loadTables();
    const guardianLink = asRows(tables.guardianChildLinks).find(
      (row) => asString(row.athleteId) && asString(row.guardianUserId),
    );
    assert.ok(guardianLink, 'expected guardian child link');
    const athleteId = asString(guardianLink.athleteId) as string;
    const guardianUserId = asString(guardianLink.guardianUserId) as string;
    const parentHeaders = authHeaders(tables, guardianUserId, 'parent', {
      'x-guardian-athlete-ids': athleteId,
    });
    const report = {
      id: 'termly_report_route_test',
      athleteId,
      athleteName: 'Route Test Athlete',
      generatedAt: '2026-07-05T10:00:00.000Z',
      range: {
        startDate: '2026-04-13T00:00:00.000Z',
        endDate: '2026-07-05T10:00:00.000Z',
        label: '13 Apr 2026 - 5 Jul 2026',
      },
      summary: {
        sessionsAttended: 3,
        attendanceRate: 75,
        averageEffort: 4,
        averagePerformance: 4,
        skillsImproved: 2,
        goalsCompleted: 1,
        badgesEarned: 1,
        practiceMinutes: 120,
        selfAssessmentsSubmitted: 2,
      },
      focusAreas: ['Passing'],
      highlights: ['3 completed sessions this term.'],
      attendanceByWeek: [],
      coachHighlights: [],
      skillSnapshot: [],
      goalSnapshot: [],
      generatedFrom: 'termly_v1',
    };

    const created = await app.inject({
      method: 'POST',
      url: `/v1/athletes/${athleteId}/termly-reports`,
      headers: parentHeaders,
      payload: { report },
    });
    assert.equal(created.statusCode, 201);
    const createdPayload = created.json() as {
      snapshot: {
        id: string;
        athleteId: string;
        generatedAt: string;
        report: { summary?: { sessionsAttended?: number } };
      };
    };
    assert.match(createdPayload.snapshot.id, /^trs_/);
    assert.equal(createdPayload.snapshot.athleteId, athleteId);
    assert.equal(createdPayload.snapshot.generatedAt, report.generatedAt);
    assert.equal(createdPayload.snapshot.report.summary?.sessionsAttended, 3);

    const listed = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/termly-reports`,
      headers: parentHeaders,
    });
    assert.equal(listed.statusCode, 200);
    const listedPayload = listed.json() as {
      total: number;
      snapshots: Array<{ id: string; athleteId: string }>;
    };
    assert.equal(listedPayload.total, 1);
    assert.equal(listedPayload.snapshots[0]?.id, createdPayload.snapshot.id);
    assert.equal(listedPayload.snapshots[0]?.athleteId, athleteId);

    const outsiderUserId = findUserWithoutAthleteHealthAccess(
      tables,
      athleteId,
      new Set([guardianUserId]),
    );
    const denied = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/termly-reports`,
      headers: authHeaders(tables, outsiderUserId, 'parent'),
    });
    assert.equal(denied.statusCode, 403);

    const liveTables = getMarketplaceSeedStore().tables as SeedTables;
    assert.equal(
      asRows(liveTables.termlyReportSnapshots).filter(
        (row) => asString(row.athleteId) === athleteId,
      ).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'athlete_termly_reports.create',
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'athlete_termly_reports.read',
        resourceId: athleteId,
        result: 'DENY',
      }).length,
      1,
    );
  });

  it('dispatches weekly recap notifications through /v1 authority and dedupes by week', async () => {
    const tables = loadTables();
    const guardianLink = asRows(tables.guardianChildLinks).find(
      (row) => asString(row.athleteId) && asString(row.guardianUserId),
    );
    assert.ok(guardianLink, 'expected guardian child link');
    const athleteId = asString(guardianLink.athleteId) as string;
    const guardianUserId = asString(guardianLink.guardianUserId) as string;
    const parentHeaders = authHeaders(tables, guardianUserId, 'parent', {
      'x-guardian-athlete-ids': athleteId,
    });
    const payload = {
      parentId: guardianUserId,
      now: '2026-02-22T19:00:00.000Z',
    };

    const dispatched = await app.inject({
      method: 'POST',
      url: `/v1/athletes/${athleteId}/weekly-recaps/dispatch`,
      headers: parentHeaders,
      payload,
    });
    assert.equal(dispatched.statusCode, 200);
    const dispatchedPayload = dispatched.json() as {
      sent: boolean;
      reason: string;
      weekKey: string;
      notification: { id?: string; userId?: string; sourceType?: string; sourceId?: string };
    };
    assert.equal(dispatchedPayload.sent, true);
    assert.equal(dispatchedPayload.reason, 'sent');
    assert.equal(dispatchedPayload.weekKey, '2026-02-22');
    assert.equal(dispatchedPayload.notification.userId, guardianUserId);
    assert.equal(dispatchedPayload.notification.sourceType, 'weekly_progress_recap');

    const second = await app.inject({
      method: 'POST',
      url: `/v1/athletes/${athleteId}/weekly-recaps/dispatch`,
      headers: parentHeaders,
      payload,
    });
    assert.equal(second.statusCode, 200);
    assert.equal((second.json() as { sent: boolean; reason: string }).sent, false);
    assert.equal((second.json() as { sent: boolean; reason: string }).reason, 'already_sent_this_week');

    const notDue = await app.inject({
      method: 'POST',
      url: `/v1/athletes/${athleteId}/weekly-recaps/dispatch`,
      headers: parentHeaders,
      payload: {
        parentId: guardianUserId,
        now: '2026-03-01T10:00:00.000Z',
      },
    });
    assert.equal(notDue.statusCode, 200);
    assert.equal((notDue.json() as { sent: boolean; reason: string }).sent, false);
    assert.equal((notDue.json() as { sent: boolean; reason: string }).reason, 'not_due_yet');

    const outsiderUserId = findUserWithoutAthleteHealthAccess(
      tables,
      athleteId,
      new Set([guardianUserId]),
    );
    const denied = await app.inject({
      method: 'POST',
      url: `/v1/athletes/${athleteId}/weekly-recaps/dispatch`,
      headers: authHeaders(tables, outsiderUserId, 'parent'),
      payload,
    });
    assert.equal(denied.statusCode, 403);

    const liveTables = getMarketplaceSeedStore().tables as SeedTables;
    assert.equal(
      asRows(liveTables.notifications).filter(
        (row) =>
          asString(row.userId) === guardianUserId &&
          asString(row.sourceType) === 'weekly_progress_recap' &&
          asString(row.sourceId) === dispatchedPayload.notification.sourceId,
      ).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'athlete_weekly_recap.dispatch',
        resourceId: athleteId,
        result: 'SUCCESS',
      }).length,
      3,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'athlete_weekly_recap.dispatch',
        resourceId: athleteId,
        result: 'DENY',
      }).length,
      1,
    );
  });

  it('serves practice tasks from drill assignments and blocks unrelated users', async () => {
    const tables = loadTables();
    const assignment = asRows(tables.drillAssignments).find(
      (row) =>
        asString(row.id) &&
        asString(row.athleteId) &&
        asString(row.coachUserId) &&
        asString(row.status) !== 'SUBMITTED' &&
        asString(row.status) !== 'COMPLETED',
    );
    assert.ok(assignment, 'expected pending drill assignment');
    const assignmentId = asString(assignment.id) as string;
    const athleteId = asString(assignment.athleteId) as string;
    const coachUserId = asString(assignment.coachUserId) as string;
    const guardianLink = asRows(tables.guardianChildLinks).find(
      (row) => asString(row.athleteId) === athleteId,
    );
    assert.ok(guardianLink, 'expected guardian for assigned athlete');
    const guardianUserId = asString(guardianLink.guardianUserId) as string;
    const parentHeaders = authHeaders(tables, guardianUserId, 'parent', {
      'x-guardian-athlete-ids': athleteId,
    });
    const coachHeaders = authHeaders(tables, coachUserId, 'coach', {
      'x-coach-athlete-ids': athleteId,
      'x-coach-verified': '1',
    });
    const taskId = `practice_task_drill_${assignmentId}`;

    const practiceTasks = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/practice-tasks?viewerRole=parent`,
      headers: parentHeaders,
    });
    assert.equal(practiceTasks.statusCode, 200);
    const practiceTasksPayload = practiceTasks.json() as {
      athleteId: string;
      total: number;
      tasks: Array<{
        source?: string;
        drillAssignmentId?: string;
        athleteId?: string;
        coachId?: string;
        status?: string;
        timing?: string;
      }>;
    };
    const task = practiceTasksPayload.tasks.find(
      (entry) => entry.drillAssignmentId === assignmentId,
    );
    assert.equal(practiceTasksPayload.athleteId, athleteId);
    assert.equal(practiceTasksPayload.total >= 1, true);
    assert.ok(task, 'expected practice task for drill assignment');
    assert.equal(task.source, 'drill_assignment');
    assert.equal(task.athleteId, athleteId);
    assert.equal(task.coachId, coachUserId);
    assert.equal(task.status, 'pending');
    assert.equal(['overdue', 'due_soon', 'upcoming'].includes(task.timing ?? ''), true);

    const directAssignments = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/drill-assignments?includeCompleted=false`,
      headers: parentHeaders,
    });
    assert.equal(directAssignments.statusCode, 200);
    const directAssignmentsPayload = directAssignments.json() as {
      athleteId: string;
      total: number;
      assignments: Array<{
        id?: string;
        drill?: { id?: string };
        submissions?: unknown[];
      }>;
    };
    const directAssignment = directAssignmentsPayload.assignments.find(
      (entry) => entry.id === assignmentId,
    );
    assert.equal(directAssignmentsPayload.athleteId, athleteId);
    assert.equal(directAssignmentsPayload.total >= 1, true);
    assert.ok(directAssignment, 'expected direct drill assignment');
    assert.equal(directAssignment.drill?.id, asString(assignment.drillId));

    const directAssignmentDetail = await app.inject({
      method: 'GET',
      url: `/v1/drill-assignments/${assignmentId}`,
      headers: parentHeaders,
    });
    assert.equal(directAssignmentDetail.statusCode, 200);
    const directAssignmentDetailPayload = directAssignmentDetail.json() as {
      assignment: {
        id?: string;
        athleteId?: string;
        coachUserId?: string;
        drill?: { id?: string };
        submissions?: unknown[];
      };
    };
    assert.equal(directAssignmentDetailPayload.assignment.id, assignmentId);
    assert.equal(directAssignmentDetailPayload.assignment.athleteId, athleteId);
    assert.equal(directAssignmentDetailPayload.assignment.coachUserId, coachUserId);
    assert.equal(directAssignmentDetailPayload.assignment.drill?.id, asString(assignment.drillId));
    assert.ok(Array.isArray(directAssignmentDetailPayload.assignment.submissions));

    const assignableDrill = asRows(tables.drills).find(
      (row) =>
        asString(row.authorUserId) === coachUserId &&
        row.active !== false &&
        !asString(row.deletedAt),
    );
    assert.ok(assignableDrill, 'expected coach-owned drill for assignment create');
    const assignableDrillId = asString(assignableDrill.id) as string;
    const createdDueDate = '2026-12-30T12:00:00.000Z';
    const directCreated = await app.inject({
      method: 'POST',
      url: '/v1/drill-assignments',
      headers: coachHeaders,
      payload: {
        drillId: assignableDrillId,
        athleteId,
        dueDate: createdDueDate,
        instructions: 'Assigned through direct API.',
        requiresEvidence: true,
      },
    });
    assert.equal(directCreated.statusCode, 201);
    const directCreatedPayload = directCreated.json() as {
      assignment: SeedRow & { drill?: SeedRow; submissions?: SeedRow[] };
    };
    const createdAssignmentId = asString(directCreatedPayload.assignment.id) as string;
    assert.match(createdAssignmentId, /^dra_/);
    assert.equal(asString(directCreatedPayload.assignment.drillId), assignableDrillId);
    assert.equal(asString(directCreatedPayload.assignment.athleteId), athleteId);
    assert.equal(asString(directCreatedPayload.assignment.coachUserId), coachUserId);
    assert.equal(asString(directCreatedPayload.assignment.status), 'ASSIGNED');
    assert.equal(asString(directCreatedPayload.assignment.dueDate), createdDueDate);
    assert.equal(asString(directCreatedPayload.assignment.instructions), 'Assigned through direct API.');
    assert.equal(directCreatedPayload.assignment.requiresEvidence, true);
    assert.equal(asString(directCreatedPayload.assignment.drill?.id), assignableDrillId);
    assert.deepEqual(directCreatedPayload.assignment.submissions, []);

    const deniedDirectCreate = await app.inject({
      method: 'POST',
      url: '/v1/drill-assignments',
      headers: parentHeaders,
      payload: {
        drillId: assignableDrillId,
        athleteId,
        dueDate: '2026-04-03T12:00:00.000Z',
      },
    });
    assert.equal(deniedDirectCreate.statusCode, 403);

    const deniedDirectRemove = await app.inject({
      method: 'DELETE',
      url: `/v1/drill-assignments/${createdAssignmentId}`,
      headers: parentHeaders,
    });
    assert.equal(deniedDirectRemove.statusCode, 403);

    const directRemoved = await app.inject({
      method: 'DELETE',
      url: `/v1/drill-assignments/${createdAssignmentId}`,
      headers: coachHeaders,
    });
    assert.equal(directRemoved.statusCode, 200);
    const directRemovedPayload = directRemoved.json() as {
      removed: boolean;
      assignment: {
        id?: string;
        athleteId?: string;
        coachUserId?: string;
        deletedAt?: string;
      };
    };
    assert.equal(directRemovedPayload.removed, true);
    assert.equal(directRemovedPayload.assignment.id, createdAssignmentId);
    assert.equal(directRemovedPayload.assignment.athleteId, athleteId);
    assert.equal(directRemovedPayload.assignment.coachUserId, coachUserId);
    assert.equal(Boolean(directRemovedPayload.assignment.deletedAt), true);

    const followUps = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/practice-follow-ups`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(followUps.statusCode, 200);
    const followUpsPayload = followUps.json() as {
      coachId: string;
      total: number;
      queue: Array<{
        athleteId?: string;
        coachId?: string;
        taskIds?: string[];
        nextDueAt?: string | null;
        pendingCount?: number;
        risk?: string;
      }>;
    };
    const queueItem = followUpsPayload.queue.find((entry) => entry.athleteId === athleteId);
    assert.equal(followUpsPayload.coachId, coachUserId);
    assert.equal(followUpsPayload.total >= 1, true);
    assert.ok(queueItem, 'expected queue item for assigned athlete');
    assert.equal(queueItem.coachId, coachUserId);
    assert.equal(queueItem.taskIds?.includes(taskId), true);
    assert.equal((queueItem.pendingCount ?? 0) >= 1, true);
    assert.equal(['high', 'watch', 'stable'].includes(queueItem.risk ?? ''), true);

    const dueAt = '2026-04-01T12:00:00.000Z';
    const dueUpdated = await app.inject({
      method: 'PATCH',
      url: `/v1/practice-tasks/${taskId}/due-at`,
      headers: coachHeaders,
      payload: {
        dueAt,
      },
    });
    assert.equal(dueUpdated.statusCode, 200);
    const dueUpdatedPayload = dueUpdated.json() as {
      task: { drillAssignmentId?: string; dueAt?: string; status?: string };
    };
    assert.equal(dueUpdatedPayload.task.drillAssignmentId, assignmentId);
    assert.equal(dueUpdatedPayload.task.dueAt, dueAt);
    assert.equal(dueUpdatedPayload.task.status, 'pending');

    const beforeSnoozeMs = Date.now();
    const snoozed = await app.inject({
      method: 'POST',
      url: `/v1/practice-tasks/${taskId}/snooze`,
      headers: coachHeaders,
      payload: {
        hours: 2,
      },
    });
    assert.equal(snoozed.statusCode, 200);
    const snoozedPayload = snoozed.json() as {
      task: { dueAt?: string; status?: string };
    };
    assert.equal(snoozedPayload.task.status, 'pending');
    assert.equal(
      Date.parse(snoozedPayload.task.dueAt ?? '') - beforeSnoozeMs >= 2 * 60 * 60 * 1000 - 5000,
      true,
    );

    const completed = await app.inject({
      method: 'POST',
      url: `/v1/practice-tasks/${taskId}/completion`,
      headers: parentHeaders,
      payload: {
        completed: true,
        completionNote: 'Finished footwork ladder.',
      },
    });
    assert.equal(completed.statusCode, 200);
    const completedPayload = completed.json() as {
      task: {
        drillAssignmentId?: string;
        status?: string;
        completionNote?: string;
        completedByUserId?: string;
      };
    };
    assert.equal(completedPayload.task.drillAssignmentId, assignmentId);
    assert.equal(completedPayload.task.status, 'completed');
    assert.equal(completedPayload.task.completionNote, 'Finished footwork ladder.');
    assert.equal(completedPayload.task.completedByUserId, guardianUserId);

    const uncompleted = await app.inject({
      method: 'POST',
      url: `/v1/practice-tasks/${taskId}/completion`,
      headers: parentHeaders,
      payload: {
        completed: false,
      },
    });
    assert.equal(uncompleted.statusCode, 200);
    const uncompletedPayload = uncompleted.json() as {
      task: { status?: string };
    };
    assert.equal(uncompletedPayload.task.status, 'pending');

    const directCompleted = await app.inject({
      method: 'PATCH',
      url: `/v1/drill-assignments/${assignmentId}/completion`,
      headers: parentHeaders,
      payload: {
        completed: true,
        completionNote: 'Direct assignment complete.',
      },
    });
    assert.equal(directCompleted.statusCode, 200);
    const directCompletedPayload = directCompleted.json() as {
      assignment: {
        id?: string;
        status?: string;
        submissions?: Array<{ notes?: string; status?: string }>;
      };
      task: { drillAssignmentId?: string; status?: string };
    };
    assert.equal(directCompletedPayload.assignment.id, assignmentId);
    assert.equal(directCompletedPayload.assignment.status, 'SUBMITTED');
    assert.equal(directCompletedPayload.task.drillAssignmentId, assignmentId);
    assert.equal(directCompletedPayload.task.status, 'completed');
    assert.equal(
      directCompletedPayload.assignment.submissions?.some(
        (submission) =>
          submission.notes === 'Direct assignment complete.' && submission.status === 'SUBMITTED',
      ),
      true,
    );

    const directUncompleted = await app.inject({
      method: 'PATCH',
      url: `/v1/drill-assignments/${assignmentId}/completion`,
      headers: parentHeaders,
      payload: {
        completed: false,
      },
    });
    assert.equal(directUncompleted.statusCode, 200);
    const directUncompletedPayload = directUncompleted.json() as {
      assignment: { id?: string; status?: string };
      task: { status?: string };
    };
    assert.equal(directUncompletedPayload.assignment.id, assignmentId);
    assert.equal(directUncompletedPayload.assignment.status, 'ASSIGNED');
    assert.equal(directUncompletedPayload.task.status, 'pending');

    const outsiderUserId = findUserWithoutAthleteHealthAccess(
      tables,
      athleteId,
      new Set([guardianUserId, coachUserId]),
    );
    const deniedPracticeTasks = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/practice-tasks?viewerRole=parent`,
      headers: authHeaders(tables, outsiderUserId, 'parent'),
    });
    assert.equal(deniedPracticeTasks.statusCode, 403);

    const deniedDirectAssignments = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/drill-assignments`,
      headers: authHeaders(tables, outsiderUserId, 'parent'),
    });
    assert.equal(deniedDirectAssignments.statusCode, 403);

    const deniedDirectAssignmentDetail = await app.inject({
      method: 'GET',
      url: `/v1/drill-assignments/${assignmentId}`,
      headers: authHeaders(tables, outsiderUserId, 'parent'),
    });
    assert.equal(deniedDirectAssignmentDetail.statusCode, 403);

    const deniedDueAt = await app.inject({
      method: 'PATCH',
      url: `/v1/practice-tasks/${taskId}/due-at`,
      headers: parentHeaders,
      payload: {
        dueAt: '2026-04-02T12:00:00.000Z',
      },
    });
    assert.equal(deniedDueAt.statusCode, 403);

    const deniedDirectCompletion = await app.inject({
      method: 'PATCH',
      url: `/v1/drill-assignments/${assignmentId}/completion`,
      headers: authHeaders(tables, outsiderUserId, 'parent'),
      payload: {
        completed: true,
      },
    });
    assert.equal(deniedDirectCompletion.statusCode, 403);

    const reviewed = await app.inject({
      method: 'POST',
      url: '/v1/practice-tasks/actions/review',
      headers: coachHeaders,
      payload: {
        taskIds: [taskId],
      },
    });
    assert.equal(reviewed.statusCode, 200);
    const reviewedPayload = reviewed.json() as {
      requestedCount: number;
      updatedCount: number;
      skippedCount: number;
    };
    assert.equal(reviewedPayload.requestedCount, 1);
    assert.equal(reviewedPayload.updatedCount, 1);
    assert.equal(reviewedPayload.skippedCount, 0);

    const followedUp = await app.inject({
      method: 'POST',
      url: '/v1/practice-tasks/actions/follow-up',
      headers: coachHeaders,
      payload: {
        taskIds: [taskId],
        actionType: 'message',
      },
    });
    assert.equal(followedUp.statusCode, 200);
    assert.equal((followedUp.json() as { updatedCount: number }).updatedCount, 1);

    const recoveryCheckpoint = await app.inject({
      method: 'POST',
      url: '/v1/practice-tasks/actions/recovery-checkpoint',
      headers: coachHeaders,
      payload: {
        taskIds: [taskId],
        hours: 48,
      },
    });
    assert.equal(recoveryCheckpoint.statusCode, 200);
    const recoveryPayload = recoveryCheckpoint.json() as { updatedCount: number; dueAt?: string };
    assert.equal(recoveryPayload.updatedCount, 1);
    assert.equal(typeof recoveryPayload.dueAt, 'string');

    const updatedFollowUps = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/practice-follow-ups`,
      headers: coachHeaders,
    });
    assert.equal(updatedFollowUps.statusCode, 200);
    const updatedFollowUpsPayload = updatedFollowUps.json() as {
      queue: Array<{ athleteId?: string; reviewedCount?: number; nextDueAt?: string | null }>;
    };
    const updatedQueueItem = updatedFollowUpsPayload.queue.find(
      (item) => item.athleteId === athleteId,
    );
    assert.equal(updatedQueueItem?.reviewedCount, 1);
    assert.equal(updatedQueueItem?.nextDueAt, recoveryPayload.dueAt);

    const deniedReview = await app.inject({
      method: 'POST',
      url: '/v1/practice-tasks/actions/review',
      headers: parentHeaders,
      payload: {
        taskIds: [taskId],
      },
    });
    assert.equal(deniedReview.statusCode, 403);

    const deniedFollowUps = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/practice-follow-ups`,
      headers: authHeaders(tables, outsiderUserId, 'coach'),
    });
    assert.equal(deniedFollowUps.statusCode, 403);

    const liveTables = getMarketplaceSeedStore().tables;
    const storedAssignment = asRows(liveTables.drillAssignments).find(
      (row) => asString(row.id) === assignmentId,
    );
    const removedStoredAssignment = asRows(liveTables.drillAssignments).find(
      (row) => asString(row.id) === createdAssignmentId,
    );
    assert.equal(asString(storedAssignment?.status), 'ASSIGNED');
    assert.equal(asString(storedAssignment?.updatedByUserId), coachUserId);
    assert.equal(asString(storedAssignment?.dueDate), recoveryPayload.dueAt);
    assert.equal(Boolean(asString(removedStoredAssignment?.deletedAt)), true);
    assert.equal(asString(removedStoredAssignment?.updatedByUserId), coachUserId);
    assert.equal(
      asRows(liveTables.assignmentSubmissions).some(
        (row) =>
          asString(row.drillAssignmentId) === assignmentId &&
          asString(row.notes) === 'Finished footwork ladder.' &&
          asString(row.status) === 'RETRACTED',
      ),
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'practice_tasks.read',
        resourceId: athleteId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'drill_assignments.read',
        resourceId: athleteId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'drill_assignments.read',
        resourceId: athleteId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'drill_assignment.read',
        resourceId: assignmentId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'drill_assignment.read',
        resourceId: assignmentId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'practice_tasks.read',
        resourceId: athleteId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'drill_assignment.create',
        resourceId: createdAssignmentId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'drill_assignment.create',
        resourceId: assignableDrillId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'drill_assignment.remove',
        resourceId: createdAssignmentId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'drill_assignment.remove',
        resourceId: createdAssignmentId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'drill_assignment.completion_update',
        resourceId: assignmentId,
        result: 'SUCCESS',
      }).length,
      2,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'drill_assignment.completion_update',
        resourceId: assignmentId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'practice_followups.read',
        resourceId: coachUserId,
        result: 'SUCCESS',
      }).length,
      2,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'practice_followups.read',
        resourceId: coachUserId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'practice_task.due_at_update',
        resourceId: assignmentId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'practice_task.due_at_update',
        resourceId: assignmentId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'practice_task.snooze',
        resourceId: assignmentId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'practice_task.completion_update',
        resourceId: assignmentId,
        result: 'SUCCESS',
      }).length,
      2,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'practice_task.review',
        resourceId: assignmentId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'practice_task.review',
        resourceId: assignmentId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'practice_task.follow_up',
        resourceId: assignmentId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'practice_task.recovery_checkpoint',
        resourceId: assignmentId,
        result: 'SUCCESS',
      }).length,
      1,
    );
  });

  it('serves athlete goals from the db fixture backend when API_DATA_BACKEND=db', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const store = getDbFixtureStore();
      const tables = store.tables;
      const guardianLink = asRows(tables.guardianChildLinks).find(
        (link) =>
          asRows(tables.goals).some(
            (goal) =>
              asString(goal.athleteId) === asString(link.athleteId) && !asString(goal.deletedAt),
          ) &&
          asRows(tables.athleteSkillAssessments).some(
            (assessment) => asString(assessment.athleteId) === asString(link.athleteId),
          ),
      );
      assert.ok(guardianLink, 'expected guardian link for athlete with goals');
      const athleteId = asString(guardianLink.athleteId) as string;
      const guardianUserId = asString(guardianLink.guardianUserId) as string;
      const fixtureGoalId = 'gol_db_fixture_analytics';

      asRows(tables.goals).push({
        id: fixtureGoalId,
        athleteId,
        title: 'DB fixture goal',
        status: 'ACTIVE',
        creatorUserId: guardianUserId,
        createdByUserId: guardianUserId,
        updatedByUserId: guardianUserId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      asRows(tables.goalMilestones).push({
        id: 'glm_db_fixture_analytics',
        goalId: fixtureGoalId,
        title: 'DB fixture milestone',
        status: 'PENDING',
        sortOrder: 1,
        createdByUserId: guardianUserId,
        updatedByUserId: guardianUserId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      asRows(tables.badgeDefinitions).push({
        id: 'abd_db_fixture_progress',
        code: 'DB_FIXTURE_PROGRESS',
        name: 'DB Fixture Progress',
        category: 'Development',
        description: 'Badge served from the db fixture backend.',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      asRows(tables.athleteBadges).push({
        id: 'aba_db_fixture_progress',
        athleteId,
        badgeDefinitionId: 'abd_db_fixture_progress',
        awardedByUserId: guardianUserId,
        bookingId: null,
        note: 'Awarded from db fixture data.',
        awardedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      const response = await app.inject({
        method: 'GET',
        url: `/v1/athletes/${athleteId}/goals`,
        headers: authHeaders(tables, guardianUserId, 'parent', {
          'x-guardian-athlete-ids': athleteId,
        }),
      });
      assert.equal(response.statusCode, 200);
      const payload = response.json() as {
        goals: SeedRow[];
        milestones: SeedRow[];
        seedVersion: string | null;
      };
      assert.equal(
        payload.goals.some((goal) => asString(goal.id) === fixtureGoalId),
        true,
      );
      assert.equal(
        payload.milestones.some((milestone) => asString(milestone.goalId) === fixtureGoalId),
        true,
      );
      assert.equal(payload.seedVersion, store.version);
      assert.equal(
        asRows(tables.auditEvents).some(
          (event) =>
            asString(event.action) === 'athlete_goals.read' &&
            asString(event.resourceId) === athleteId &&
            asString(event.result) === 'SUCCESS',
        ),
        true,
      );

      const progress = await app.inject({
        method: 'PATCH',
        url: `/v1/goals/${fixtureGoalId}/progress`,
        headers: authHeaders(tables, guardianUserId, 'parent', {
          'x-guardian-athlete-ids': athleteId,
        }),
        payload: {
          progress: 75,
          completedMilestoneIds: ['glm_db_fixture_analytics'],
        },
      });
      assert.equal(progress.statusCode, 200);
      const progressPayload = progress.json() as { goal: SeedRow; milestones: SeedRow[] };
      assert.equal(asNumber(progressPayload.goal.progress), 75);
      assert.equal(asString(progressPayload.milestones[0]?.status), 'COMPLETED');
      assert.equal(
        asNumber(
          asRows(tables.goals).find((goal) => asString(goal.id) === fixtureGoalId)?.progress,
        ),
        75,
      );
      assert.equal(
        asRows(tables.auditEvents).some(
          (event) =>
            asString(event.action) === 'athlete_goal.progress_update' &&
            asString(event.resourceId) === fixtureGoalId &&
            asString(event.result) === 'SUCCESS',
        ),
        true,
      );

      const analytics = await app.inject({
        method: 'GET',
        url: `/v1/athletes/${athleteId}/analytics?period=ALL`,
        headers: authHeaders(tables, guardianUserId, 'parent', {
          'x-guardian-athlete-ids': athleteId,
        }),
      });
      assert.equal(analytics.statusCode, 200);
      const analyticsPayload = analytics.json() as {
        analytics: { skills: unknown[]; totalSessions: number };
        seedVersion: string | null;
      };
      assert.equal(analyticsPayload.analytics.skills.length >= 1, true);
      assert.equal(analyticsPayload.analytics.totalSessions >= 1, true);
      assert.equal(analyticsPayload.seedVersion, store.version);

      const skillHistory = await app.inject({
        method: 'GET',
        url: `/v1/athletes/${athleteId}/skills/history`,
        headers: authHeaders(tables, guardianUserId, 'parent', {
          'x-guardian-athlete-ids': athleteId,
        }),
      });
      assert.equal(skillHistory.statusCode, 200);
      const skillHistoryPayload = skillHistory.json() as {
        skills: unknown[];
        seedVersion: string | null;
      };
      assert.equal(skillHistoryPayload.skills.length >= 1, true);
      assert.equal(skillHistoryPayload.seedVersion, store.version);

      const badges = await app.inject({
        method: 'GET',
        url: `/v1/athletes/${athleteId}/badges`,
        headers: authHeaders(tables, guardianUserId, 'parent', {
          'x-guardian-athlete-ids': athleteId,
        }),
      });
      assert.equal(badges.statusCode, 200);
      const badgesPayload = badges.json() as {
        badges: SeedRow[];
        badgeDefinitions: SeedRow[];
        seedVersion: string | null;
      };
      assert.equal(
        badgesPayload.badges.some((badge) => asString(badge.id) === 'aba_db_fixture_progress'),
        true,
      );
      assert.equal(
        badgesPayload.badgeDefinitions.some(
          (definition) => asString(definition.id) === 'abd_db_fixture_progress',
        ),
        true,
      );
      assert.equal(badgesPayload.seedVersion, store.version);

      const relatedParticipant = asRows(tables.bookingParticipants).find(
        (participant) =>
          asString(participant.athleteId) === athleteId && !asString(participant.deletedAt),
      );
      assert.ok(relatedParticipant, 'expected db fixture athlete booking participant');
      const relatedBookingId = asString(relatedParticipant.bookingId) as string;
      const relatedBooking = asRows(tables.bookings).find(
        (booking) => asString(booking.id) === relatedBookingId && !asString(booking.deletedAt),
      );
      assert.ok(relatedBooking, 'expected db fixture athlete booking');
      const relatedCoachUserId = asString(relatedBooking.coachUserId) as string;
      const fixtureBadge = asRows(tables.athleteBadges).find(
        (badge) => asString(badge.id) === 'aba_db_fixture_progress',
      );
      assert.ok(fixtureBadge, 'expected db fixture badge');
      fixtureBadge.bookingId = relatedBookingId;

      const sessionBadges = await app.inject({
        method: 'GET',
        url: `/v1/sessions/${relatedBookingId}/badges`,
        headers: authHeaders(tables, guardianUserId, 'parent', {
          'x-guardian-athlete-ids': athleteId,
        }),
      });
      assert.equal(sessionBadges.statusCode, 200);
      const sessionBadgesPayload = sessionBadges.json() as {
        badges: SeedRow[];
        badgeDefinitions: SeedRow[];
        seedVersion: string | null;
      };
      assert.equal(
        sessionBadgesPayload.badges.some(
          (badge) => asString(badge.id) === 'aba_db_fixture_progress',
        ),
        true,
      );
      assert.equal(
        sessionBadgesPayload.badgeDefinitions.some(
          (definition) => asString(definition.id) === 'abd_db_fixture_progress',
        ),
        true,
      );
      assert.equal(sessionBadgesPayload.seedVersion, store.version);

      const skillUpdate = await app.inject({
        method: 'POST',
        url: `/v1/athletes/${athleteId}/skill-updates`,
        headers: authHeaders(tables, relatedCoachUserId, 'coach', {
          'x-coach-athlete-ids': athleteId,
          'x-coach-verified': '1',
        }),
        payload: {
          skillName: 'Fixture Passing',
          score: 9,
          bookingId: relatedBookingId,
        },
      });
      assert.equal(skillUpdate.statusCode, 201);
      const skillUpdatePayload = skillUpdate.json() as {
        skillAssessment: SeedRow;
        skillDefinition: SeedRow;
        score: number;
        seedVersion: string | null;
      };
      assert.equal(asString(skillUpdatePayload.skillAssessment.athleteId), athleteId);
      assert.equal(asString(skillUpdatePayload.skillDefinition.name), 'Fixture Passing');
      assert.equal(skillUpdatePayload.score, 9);
      assert.equal(skillUpdatePayload.seedVersion, store.version);
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
    }
  });

  it('returns drills, uploads, video, community, messages, and notifications for seeded users', async () => {
    await withStorageEnv(async () => {
      const tables = loadTables();

      const drillAuthorId = asString(asRows(tables.drills)[0]?.authorUserId) as string;
      const deniedDrills = await app.inject({
        method: 'GET',
        url: `/v1/drills?coachUserId=${drillAuthorId}`,
      });
      assert.equal(deniedDrills.statusCode, 403);

      const outsiderUserId = findUnprivilegedUserId(tables, new Set([drillAuthorId]));
      const deniedOtherCoachDrills = await app.inject({
        method: 'GET',
        url: `/v1/drills?coachUserId=${drillAuthorId}`,
        headers: authHeaders(tables, outsiderUserId),
      });
      assert.equal(deniedOtherCoachDrills.statusCode, 403);

      const drills = await app.inject({
        method: 'GET',
        url: `/v1/drills?coachUserId=${drillAuthorId}`,
        headers: authHeaders(tables, drillAuthorId, 'coach'),
      });
      assert.equal(drills.statusCode, 200);
      const ownDrills = await app.inject({
        method: 'GET',
        url: '/v1/drills',
        headers: authHeaders(tables, drillAuthorId, 'coach'),
      });
      assert.equal(ownDrills.statusCode, 200);
      assert.equal((ownDrills.json() as { total: number }).total >= 1, true);
      const drillsPayload = drills.json() as {
        drills: Array<{ id?: string; assignments: unknown[] }>;
        total: number;
      };
      assert.equal(drillsPayload.total >= 1, true);
      assert.equal(drillsPayload.drills[0]?.assignments.length >= 1, true);
      const drillId = drillsPayload.drills[0]?.id;
      assert.ok(drillId, 'expected drill id for detail read');

      const deniedDrillDetail = await app.inject({
        method: 'GET',
        url: `/v1/drills/${drillId}`,
        headers: authHeaders(tables, outsiderUserId),
      });
      assert.equal(deniedDrillDetail.statusCode, 403);

      const drillDetail = await app.inject({
        method: 'GET',
        url: `/v1/drills/${drillId}`,
        headers: authHeaders(tables, drillAuthorId, 'coach'),
      });
      assert.equal(drillDetail.statusCode, 200);
      const drillDetailPayload = drillDetail.json() as {
        drill: { id?: string; assignments?: unknown[] };
      };
      assert.equal(drillDetailPayload.drill.id, drillId);
      assert.equal((drillDetailPayload.drill.assignments ?? []).length >= 1, true);

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
      const uploadPayload = uploadInit.json() as {
        uploadSessionId: string;
        mediaObjectId: string;
        uploadUrl: string;
      };
      assert.match(uploadPayload.uploadSessionId, /^ups_/);
      assert.match(uploadPayload.mediaObjectId, /^med_/);
      assert.match(uploadPayload.uploadUrl, /^https:\/\/uploads\.clubroom\.local\//);

      const videoRow = asRows(tables.videos)[0];
      const videoId = asString(videoRow?.id) as string;
      const videoReaderUserId = asString(videoRow?.coachUserId) as string;
      const video = await app.inject({
        method: 'GET',
        url: `/v1/videos/${videoId}`,
        headers: authHeaders(tables, videoReaderUserId, 'coach'),
      });
      assert.equal(video.statusCode, 200);
      const videoPayload = video.json() as {
        video: { annotations: unknown[]; playbackUrl: string; visibility: string };
      };
      assert.equal(videoPayload.video.annotations.length >= 1, true);
      assert.equal(videoPayload.video.visibility, 'PRIVATE');
      assert.match(videoPayload.video.playbackUrl, /^https:\/\/storage\.clubroom\.test\//);

      const communityUserId = asString(
        asRows(tables.communityGroupMemberships)[0]?.userId,
      ) as string;
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

      const clubPost = asRows(tables.posts).find((row) => Boolean(asString(row.clubId)));
      const clubId = asString(clubPost?.clubId);
      const clubMembership = asRows(tables.clubMemberships).find(
        (row) => asString(row.clubId) === clubId && row.active !== false,
      );
      const clubMemberUserId = asString(clubMembership?.userId);
      assert.ok(clubId, 'expected seeded club post club id');
      assert.ok(clubMemberUserId, 'expected seeded club post member user id');
      const clubPosts = await app.inject({
        method: 'GET',
        url: `/v1/posts?clubId=${clubId}`,
        headers: authHeaders(tables, clubMemberUserId),
      });
      assert.equal(clubPosts.statusCode, 200);
      const clubPostsPayload = clubPosts.json() as { posts: Array<{ clubId?: string | null }> };
      assert.equal(clubPostsPayload.posts.length >= 1, true);
      assert.equal(
        clubPostsPayload.posts.every((post) => post.clubId === clubId),
        true,
      );

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
  });

  it('serves drills from the db fixture backend when API_DATA_BACKEND=db', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const store = getDbFixtureStore();
      const tables = store.tables;
      const drills = asRows(tables.drills);
      const assignments = asRows(tables.drillAssignments);
      const submissions = asRows(tables.assignmentSubmissions);
      const coachUserId = asString(drills[0]?.authorUserId) as string;
      const athleteId = asString(asRows(tables.athletes)[0]?.id) as string;
      const outsiderUserId = findUnprivilegedUserId(tables, new Set([coachUserId]));
      const parentUserId = asRows(tables.users)
        .map((row) => asString(row.id))
        .find((candidateUserId): candidateUserId is string => {
          if (!candidateUserId || candidateUserId === coachUserId) {
            return false;
          }
          const roles = rolesForUser(tables, candidateUserId);
          return (
            roles.includes('parent') &&
            !roles.some((role) =>
              ['coach', 'club_admin', 'admin', 'security_admin'].includes(role),
            )
          );
        });
      assert.ok(coachUserId, 'expected db fixture drill author');
      assert.ok(athleteId, 'expected db fixture athlete');
      assert.ok(parentUserId, 'expected parent-only user for drill authz denial coverage');

      const now = '2026-06-01T09:00:00.000Z';
      drills.push({
        id: 'drl_db_fixture_live',
        authorUserId: coachUserId,
        title: 'DB Fixture Drill',
        description: 'DB-backed drill library coverage.',
        difficulty: 'intermediate',
        active: true,
        metadataJson: { source: 'db-fixture-test' },
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });
      assignments.push({
        id: 'dra_db_fixture_live',
        drillId: 'drl_db_fixture_live',
        athleteId,
        coachUserId,
        title: 'DB Fixture Assignment',
        instructions: 'Complete from db fixture state.',
        requiresEvidence: true,
        dueDate: '2026-06-08T09:00:00.000Z',
        status: 'SUBMITTED',
        createdByUserId: coachUserId,
        updatedByUserId: coachUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });
      submissions.push({
        id: 'das_db_fixture_live',
        drillAssignmentId: 'dra_db_fixture_live',
        athleteId,
        submittedByUserId: athleteId.startsWith('ath_') ? `usr_${athleteId.slice(4)}` : athleteId,
        mediaObjectId: null,
        notes: 'Submitted through db fixture state.',
        status: 'SUBMITTED',
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/v1/drills?coachUserId=${coachUserId}`,
        headers: authHeaders(tables, coachUserId, 'coach'),
      });
      assert.equal(response.statusCode, 200);
      const payload = response.json() as {
        drills: Array<SeedRow & { assignments: SeedRow[]; submissions: SeedRow[] }>;
        total: number;
        seedVersion: string | null;
      };
      const dbDrill = payload.drills.find((drill) => asString(drill.id) === 'drl_db_fixture_live');
      assert.ok(dbDrill, 'expected db fixture drill in /v1 response');
      assert.equal(payload.seedVersion, store.version);
      assert.equal(asString(dbDrill.title), 'DB Fixture Drill');
      assert.equal(
        dbDrill.assignments.some((assignment) => asString(assignment.id) === 'dra_db_fixture_live'),
        true,
      );
      assert.equal(
        dbDrill.submissions.some((submission) => asString(submission.id) === 'das_db_fixture_live'),
        true,
      );

      const detail = await app.inject({
        method: 'GET',
        url: '/v1/drills/drl_db_fixture_live',
        headers: authHeaders(tables, coachUserId, 'coach'),
      });
      assert.equal(detail.statusCode, 200);
      const detailPayload = detail.json() as {
        drill: SeedRow & { assignments?: SeedRow[]; submissions?: SeedRow[] };
        seedVersion: string | null;
      };
      assert.equal(asString(detailPayload.drill.id), 'drl_db_fixture_live');
      assert.equal(
        detailPayload.drill.assignments?.some(
          (assignment) => asString(assignment.id) === 'dra_db_fixture_live',
        ),
        true,
      );
      assert.equal(
        detailPayload.drill.submissions?.some(
          (submission) => asString(submission.id) === 'das_db_fixture_live',
        ),
        true,
      );
      assert.equal(detailPayload.seedVersion, store.version);

      const deniedParentList = await app.inject({
        method: 'GET',
        url: '/v1/drills',
        headers: authHeaders(tables, parentUserId, 'parent'),
      });
      assert.equal(deniedParentList.statusCode, 403);

      const deniedParentDetail = await app.inject({
        method: 'GET',
        url: '/v1/drills/drl_db_fixture_live',
        headers: authHeaders(tables, parentUserId, 'parent'),
      });
      assert.equal(deniedParentDetail.statusCode, 403);

      const deniedParentCreate = await app.inject({
        method: 'POST',
        url: '/v1/drills',
        headers: authHeaders(tables, parentUserId, 'parent'),
        payload: {
          title: 'Denied Parent Drill',
          description: 'Parents cannot author coach library drills.',
          category: 'TECHNIQUE',
          duration: 12,
          difficulty: 'BEGINNER',
        },
      });
      assert.equal(deniedParentCreate.statusCode, 403);

      const deniedUpdate = await app.inject({
        method: 'PATCH',
        url: '/v1/drills/drl_db_fixture_live',
        headers: authHeaders(tables, outsiderUserId),
        payload: {
          title: 'Denied drill update',
        },
      });
      assert.equal(deniedUpdate.statusCode, 403);

      const deniedRemove = await app.inject({
        method: 'DELETE',
        url: '/v1/drills/drl_db_fixture_live',
        headers: authHeaders(tables, outsiderUserId),
      });
      assert.equal(deniedRemove.statusCode, 403);

      const createdDrill = await app.inject({
        method: 'POST',
        url: '/v1/drills',
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: {
          title: 'Created DB Fixture Drill',
          description: 'Created through db fixture route.',
          category: 'TACTICAL',
          duration: 18,
          difficulty: 'ADVANCED',
          equipment: ['cones'],
          tags: ['pressing'],
        },
      });
      assert.equal(createdDrill.statusCode, 201);
      const createdDrillPayload = createdDrill.json() as {
        drill: SeedRow;
        seedVersion: string | null;
      };
      const createdDrillId = asString(createdDrillPayload.drill.id) as string;
      assert.match(createdDrillId, /^drl_/);
      assert.equal(asString(createdDrillPayload.drill.authorUserId), coachUserId);
      assert.equal(asString(createdDrillPayload.drill.category), 'TACTICAL');
      assert.equal(asNumber(createdDrillPayload.drill.duration), 18);
      assert.equal(createdDrillPayload.seedVersion, store.version);

      const updatedDrill = await app.inject({
        method: 'PATCH',
        url: `/v1/drills/${createdDrillId}`,
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: {
          title: 'Updated DB Fixture Drill',
          duration: 22,
          tags: ['updated'],
        },
      });
      assert.equal(updatedDrill.statusCode, 200);
      const updatedDrillPayload = updatedDrill.json() as { drill: SeedRow };
      assert.equal(asString(updatedDrillPayload.drill.title), 'Updated DB Fixture Drill');
      assert.equal(asNumber(updatedDrillPayload.drill.duration), 22);
      assert.deepEqual(asStringArray(updatedDrillPayload.drill.tags), ['updated']);

      const removedDrill = await app.inject({
        method: 'DELETE',
        url: `/v1/drills/${createdDrillId}`,
        headers: authHeaders(tables, coachUserId, 'coach'),
      });
      assert.equal(removedDrill.statusCode, 200);
      const removedDrillPayload = removedDrill.json() as {
        removed: boolean;
        drill: SeedRow;
        seedVersion: string | null;
      };
      assert.equal(removedDrillPayload.removed, true);
      assert.equal(asString(removedDrillPayload.drill.id), createdDrillId);
      assert.equal(removedDrillPayload.seedVersion, store.version);
      assert.equal(
        Boolean(asString(drills.find((row) => asString(row.id) === createdDrillId)?.deletedAt)),
        true,
      );

      const directAssignments = await app.inject({
        method: 'GET',
        url: `/v1/athletes/${athleteId}/drill-assignments`,
        headers: authHeaders(tables, coachUserId, 'coach', {
          'x-coach-athlete-ids': athleteId,
          'x-coach-verified': '1',
        }),
      });
      assert.equal(directAssignments.statusCode, 200);
      const directAssignmentsPayload = directAssignments.json() as {
        assignments: Array<SeedRow & { drill?: SeedRow; submissions?: SeedRow[] }>;
        seedVersion: string | null;
      };
      const directAssignment = directAssignmentsPayload.assignments.find(
        (assignment) => asString(assignment.id) === 'dra_db_fixture_live',
      );
      assert.ok(directAssignment, 'expected db fixture direct drill assignment');
      assert.equal(asString(directAssignment.drill?.id), 'drl_db_fixture_live');
      assert.equal(
        directAssignment.submissions?.some(
          (submission) => asString(submission.id) === 'das_db_fixture_live',
        ),
        true,
      );
      assert.equal(directAssignmentsPayload.seedVersion, store.version);

      const directAssignmentDetail = await app.inject({
        method: 'GET',
        url: '/v1/drill-assignments/dra_db_fixture_live',
        headers: authHeaders(tables, coachUserId, 'coach', {
          'x-coach-athlete-ids': athleteId,
          'x-coach-verified': '1',
        }),
      });
      assert.equal(directAssignmentDetail.statusCode, 200);
      const directAssignmentDetailPayload = directAssignmentDetail.json() as {
        assignment: SeedRow & { drill?: SeedRow; submissions?: SeedRow[] };
        seedVersion: string | null;
      };
      assert.equal(asString(directAssignmentDetailPayload.assignment.id), 'dra_db_fixture_live');
      assert.equal(
        asString(directAssignmentDetailPayload.assignment.drill?.id),
        'drl_db_fixture_live',
      );
      assert.equal(
        directAssignmentDetailPayload.assignment.submissions?.some(
          (submission) => asString(submission.id) === 'das_db_fixture_live',
        ),
        true,
      );
      assert.equal(directAssignmentDetailPayload.seedVersion, store.version);

      const created = await app.inject({
        method: 'POST',
        url: '/v1/drill-assignments',
        headers: authHeaders(tables, coachUserId, 'coach', {
          'x-coach-athlete-ids': athleteId,
          'x-coach-verified': '1',
        }),
        payload: {
          drillId: 'drl_db_fixture_live',
          athleteId,
          dueDate: '2026-06-09T09:00:00.000Z',
          instructions: 'Create through db fixture state.',
        },
      });
      assert.equal(created.statusCode, 201);
      const createdPayload = created.json() as {
        assignment: SeedRow & { drill?: SeedRow; submissions?: SeedRow[] };
        seedVersion: string | null;
      };
      const createdAssignmentId = asString(createdPayload.assignment.id) as string;
      assert.match(createdAssignmentId, /^dra_/);
      assert.equal(asString(createdPayload.assignment.drillId), 'drl_db_fixture_live');
      assert.equal(asString(createdPayload.assignment.athleteId), athleteId);
      assert.equal(asString(createdPayload.assignment.coachUserId), coachUserId);
      assert.equal(asString(createdPayload.assignment.instructions), 'Create through db fixture state.');
      assert.equal(asString(createdPayload.assignment.drill?.id), 'drl_db_fixture_live');
      assert.equal(createdPayload.seedVersion, store.version);
      assert.equal(
        assignments.some((row) => asString(row.id) === createdAssignmentId),
        true,
      );

      const removed = await app.inject({
        method: 'DELETE',
        url: `/v1/drill-assignments/${createdAssignmentId}`,
        headers: authHeaders(tables, coachUserId, 'coach', {
          'x-coach-athlete-ids': athleteId,
          'x-coach-verified': '1',
        }),
      });
      assert.equal(removed.statusCode, 200);
      const removedPayload = removed.json() as {
        removed: boolean;
        assignment: SeedRow;
        seedVersion: string | null;
      };
      assert.equal(removedPayload.removed, true);
      assert.equal(asString(removedPayload.assignment.id), createdAssignmentId);
      assert.equal(removedPayload.seedVersion, store.version);
      assert.equal(
        Boolean(
          asString(
            assignments.find((row) => asString(row.id) === createdAssignmentId)?.deletedAt,
          ),
        ),
        true,
      );
      assert.equal(
        auditEventsFor(tables, {
          action: 'drills.read',
          resourceId: coachUserId,
          result: 'SUCCESS',
        }).length,
        1,
      );
      assert.equal(
        auditEventsFor(tables, {
          action: 'drill.read',
          resourceId: 'drl_db_fixture_live',
          result: 'SUCCESS',
        }).length,
        1,
      );
      assert.equal(
        auditEventsFor(tables, {
          action: 'drills.read',
          resourceId: parentUserId,
          result: 'DENY',
        }).length,
        1,
      );
      assert.equal(
        auditEventsFor(tables, {
          action: 'drill.read',
          resourceId: 'drl_db_fixture_live',
          result: 'DENY',
        }).some((event) => asString(event.actorUserId) === parentUserId),
        true,
      );
      assert.equal(
        auditEventsFor(tables, {
          action: 'drill.create',
          result: 'DENY',
        }).some((event) => asString(event.actorUserId) === parentUserId),
        true,
      );
      const deniedDrillUpdateAudits = auditEventsFor(tables, {
        action: 'drill.update',
        resourceId: 'drl_db_fixture_live',
        result: 'DENY',
      });
      assert.equal(deniedDrillUpdateAudits.length, 1);
      assert.equal(asString(deniedDrillUpdateAudits[0]?.actorUserId), outsiderUserId);
      assert.equal(asString(deniedDrillUpdateAudits[0]?.subjectUserId), coachUserId);

      const deniedDrillRemoveAudits = auditEventsFor(tables, {
        action: 'drill.remove',
        resourceId: 'drl_db_fixture_live',
        result: 'DENY',
      });
      assert.equal(deniedDrillRemoveAudits.length, 1);
      assert.equal(asString(deniedDrillRemoveAudits[0]?.actorUserId), outsiderUserId);
      assert.equal(asString(deniedDrillRemoveAudits[0]?.subjectUserId), coachUserId);
      assert.equal(
        auditEventsFor(tables, {
          action: 'drill.create',
          resourceId: createdDrillId,
          result: 'SUCCESS',
        }).length,
        1,
      );
      assert.equal(
        auditEventsFor(tables, {
          action: 'drill.update',
          resourceId: createdDrillId,
          result: 'SUCCESS',
        }).length,
        1,
      );
      assert.equal(
        auditEventsFor(tables, {
          action: 'drill.remove',
          resourceId: createdDrillId,
          result: 'SUCCESS',
        }).length,
        1,
      );
      assert.equal(
        auditEventsFor(tables, {
          action: 'drill_assignments.read',
          resourceId: athleteId,
          result: 'SUCCESS',
        }).length,
        1,
      );
      assert.equal(
        auditEventsFor(tables, {
          action: 'drill_assignment.read',
          resourceId: 'dra_db_fixture_live',
          result: 'SUCCESS',
        }).length,
        1,
      );
      assert.equal(
        auditEventsFor(tables, {
          action: 'drill_assignment.create',
          resourceId: createdAssignmentId,
          result: 'SUCCESS',
        }).length,
        1,
      );
      assert.equal(
        auditEventsFor(tables, {
          action: 'drill_assignment.remove',
          resourceId: createdAssignmentId,
          result: 'SUCCESS',
        }).length,
        1,
      );
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
    }
  });

  it('mutates notification read and dismiss state through backend authority', async () => {
    const tables = loadTables();
    const notification = asRows(tables.notifications).find(
      (row) => Boolean(asString(row.id)) && Boolean(asString(row.userId)),
    );
    assert.ok(notification, 'expected seeded notification');
    const notificationId = asString(notification.id) as string;
    const ownerUserId = asString(notification.userId) as string;
    const outsiderUserId = findUnprivilegedUserId(tables, new Set([ownerUserId]));

    const deniedRead = await app.inject({
      method: 'POST',
      url: `/v1/me/notifications/${notificationId}/read`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(deniedRead.statusCode, 403);

    const read = await app.inject({
      method: 'POST',
      url: `/v1/me/notifications/${notificationId}/read`,
      headers: authHeaders(tables, ownerUserId),
    });
    assert.equal(read.statusCode, 200);
    const readPayload = read.json() as {
      notification: { id: string; status: string; readAt: string | null };
    };
    assert.equal(readPayload.notification.id, notificationId);
    assert.equal(readPayload.notification.status, 'READ');
    assert.equal(Boolean(readPayload.notification.readAt), true);

    const dismiss = await app.inject({
      method: 'POST',
      url: `/v1/me/notifications/${notificationId}/dismiss`,
      headers: authHeaders(tables, ownerUserId),
    });
    assert.equal(dismiss.statusCode, 200);
    const dismissPayload = dismiss.json() as {
      notification: { id: string; status: string; dismissedAt: string | null };
    };
    assert.equal(dismissPayload.notification.id, notificationId);
    assert.equal(dismissPayload.notification.status, 'DISMISSED');
    assert.equal(Boolean(dismissPayload.notification.dismissedAt), true);

    const listed = await app.inject({
      method: 'GET',
      url: '/v1/me/notifications',
      headers: authHeaders(tables, ownerUserId),
    });
    assert.equal(listed.statusCode, 200);
    const listedPayload = listed.json() as {
      notifications: Array<{ id: string; dismissedAt: string | null }>;
      unreadCount: number;
    };
    assert.equal(
      listedPayload.notifications.some(
        (candidate) => candidate.id === notificationId && Boolean(candidate.dismissedAt),
      ),
      true,
    );
    assert.equal(listedPayload.unreadCount >= 0, true);

    const allRead = await app.inject({
      method: 'POST',
      url: '/v1/me/notifications/read-all',
      headers: authHeaders(tables, ownerUserId),
    });
    assert.equal(allRead.statusCode, 200);
    const allReadPayload = allRead.json() as {
      notifications: Array<{ userId: string; status: string; dismissedAt: string | null }>;
      unreadCount: number;
    };
    assert.equal(allReadPayload.unreadCount, 0);
    assert.equal(
      allReadPayload.notifications
        .filter((candidate) => candidate.userId === ownerUserId && !candidate.dismissedAt)
        .every((candidate) => candidate.status === 'READ'),
      true,
    );

    const dismissAll = await app.inject({
      method: 'POST',
      url: '/v1/me/notifications/dismiss-all',
      headers: authHeaders(tables, ownerUserId),
    });
    assert.equal(dismissAll.statusCode, 200);
    const dismissAllPayload = dismissAll.json() as {
      notifications: Array<{ userId: string; dismissedAt: string | null }>;
      unreadCount: number;
    };
    assert.equal(dismissAllPayload.unreadCount, 0);
    assert.equal(
      dismissAllPayload.notifications
        .filter((candidate) => candidate.userId === ownerUserId)
        .every((candidate) => Boolean(candidate.dismissedAt)),
      true,
    );

    const liveTables = getMarketplaceSeedStore().tables;
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'notification.read',
        resourceId: notificationId,
        result: 'DENY',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'notification.dismiss_all',
        result: 'SUCCESS',
      }).length >= 1,
      true,
    );
  });

  it('mutates notification preferences through authenticated backend authority', async () => {
    const tables = loadTables();
    const preference = asRows(tables.notificationPreferences).find((row) =>
      Boolean(asString(row.userId)),
    );
    assert.ok(preference, 'expected seeded notification preferences');
    const ownerUserId = asString(preference.userId) as string;
    const coachUserId = asString(
      asRows(tables.coachProfiles).find((row) => asString(row.userId) !== ownerUserId)?.userId,
    ) as string;
    assert.ok(coachUserId, 'expected coach to mute');
    const outsiderUserId = findUnprivilegedUserId(tables, new Set([ownerUserId]));

    const updated = await app.inject({
      method: 'PATCH',
      url: '/v1/me/notifications/preferences',
      headers: authHeaders(tables, ownerUserId),
      payload: {
        channels: {
          push: false,
          sms: true,
        },
        quietHours: {
          enabled: true,
          startTime: '20:30',
          endTime: '06:45',
          timezone: 'Europe/London',
        },
        typePreferences: {
          MESSAGE_RECEIVED: {
            enabled: false,
            channels: ['EMAIL'],
          },
        },
        mutedCoaches: [
          {
            coachId: coachUserId,
            reason: 'too-many-updates',
          },
        ],
      },
    });
    assert.equal(updated.statusCode, 200);
    const updatedPayload = updated.json() as {
      preferences: {
        userId: string;
        pushEnabled: boolean;
        emailEnabled: boolean;
        smsEnabled: boolean;
        settingsJson?: {
          typePreferences?: Record<string, { enabled: boolean; channels: string[] }>;
        };
      };
      mutedSources: Array<{
        sourceType: string;
        sourceId: string;
        reason?: string;
        unmutedAt: string | null;
      }>;
      quietHours: {
        userId: string;
        enabled: boolean;
        startTimeLocal: string;
        endTimeLocal: string;
        timeZone: string;
      };
    };
    assert.equal(updatedPayload.preferences.userId, ownerUserId);
    assert.equal(updatedPayload.preferences.pushEnabled, false);
    assert.equal(updatedPayload.preferences.emailEnabled, true);
    assert.equal(updatedPayload.preferences.smsEnabled, true);
    assert.equal(
      updatedPayload.preferences.settingsJson?.typePreferences?.MESSAGE_RECEIVED?.enabled,
      false,
    );
    assert.deepEqual(
      updatedPayload.preferences.settingsJson?.typePreferences?.MESSAGE_RECEIVED?.channels,
      ['EMAIL'],
    );
    assert.equal(updatedPayload.quietHours.enabled, true);
    assert.equal(updatedPayload.quietHours.startTimeLocal, '20:30');
    assert.equal(updatedPayload.quietHours.endTimeLocal, '06:45');
    assert.equal(
      updatedPayload.mutedSources.some(
        (source) =>
          source.sourceType === 'coach' &&
          source.sourceId === coachUserId &&
          source.reason === 'too-many-updates' &&
          source.unmutedAt == null,
      ),
      true,
    );

    const outsiderUpdate = await app.inject({
      method: 'PATCH',
      url: '/v1/me/notifications/preferences',
      headers: authHeaders(tables, outsiderUserId),
      payload: {
        channels: {
          push: true,
        },
      },
    });
    assert.equal(outsiderUpdate.statusCode, 200);
    const outsiderPayload = outsiderUpdate.json() as { preferences: { userId: string } };
    assert.equal(outsiderPayload.preferences.userId, outsiderUserId);

    const ownerAfterOutsider = await app.inject({
      method: 'GET',
      url: '/v1/me/notifications',
      headers: authHeaders(tables, ownerUserId),
    });
    assert.equal(ownerAfterOutsider.statusCode, 200);
    const ownerAfterOutsiderPayload = ownerAfterOutsider.json() as {
      preferences: { pushEnabled: boolean; smsEnabled: boolean };
      mutedSources: Array<{ sourceType: string; sourceId: string; unmutedAt: string | null }>;
    };
    assert.equal(ownerAfterOutsiderPayload.preferences.pushEnabled, false);
    assert.equal(ownerAfterOutsiderPayload.preferences.smsEnabled, true);
    assert.equal(
      ownerAfterOutsiderPayload.mutedSources.some(
        (source) =>
          source.sourceType === 'coach' &&
          source.sourceId === coachUserId &&
          source.unmutedAt == null,
      ),
      true,
    );

    const unmuted = await app.inject({
      method: 'PATCH',
      url: '/v1/me/notifications/preferences',
      headers: authHeaders(tables, ownerUserId),
      payload: {
        mutedCoaches: [],
      },
    });
    assert.equal(unmuted.statusCode, 200);
    const unmutedPayload = unmuted.json() as {
      mutedSources: Array<{ sourceType: string; sourceId: string; unmutedAt: string | null }>;
    };
    assert.equal(
      unmutedPayload.mutedSources.some(
        (source) =>
          source.sourceType === 'coach' &&
          source.sourceId === coachUserId &&
          source.unmutedAt == null,
      ),
      false,
    );

    const liveTables = getMarketplaceSeedStore().tables;
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'notification.preferences.update',
        resourceId: ownerUserId,
        result: 'SUCCESS',
      }).length >= 2,
      true,
    );
  });

  it('serves privacy settings through authenticated self authority', async () => {
    const tables = loadTables();
    const ownerUserId = asString(asRows(tables.users)[0]?.id) as string;
    const outsiderUserId = asString(
      asRows(tables.users).find((row) => asString(row.id) !== ownerUserId)?.id,
    ) as string;
    assert.ok(ownerUserId, 'expected owner user');
    assert.ok(outsiderUserId, 'expected outsider user');

    const defaults = await app.inject({
      method: 'GET',
      url: '/v1/me/privacy-settings',
      headers: authHeaders(tables, ownerUserId),
    });
    assert.equal(defaults.statusCode, 200);
    const defaultsPayload = defaults.json() as {
      settings: {
        userId: string;
        profileVisible: boolean;
        showActivityStatus: boolean;
        shareWithPartners: boolean;
      };
    };
    assert.equal(defaultsPayload.settings.userId, ownerUserId);
    assert.equal(defaultsPayload.settings.profileVisible, true);
    assert.equal(defaultsPayload.settings.showActivityStatus, false);
    assert.equal(defaultsPayload.settings.shareWithPartners, false);

    const forged = await app.inject({
      method: 'PATCH',
      url: '/v1/me/privacy-settings',
      headers: authHeaders(tables, ownerUserId),
      payload: {
        userId: outsiderUserId,
        profileVisible: false,
      },
    });
    assert.equal(forged.statusCode, 400);

    const updated = await app.inject({
      method: 'PATCH',
      url: '/v1/me/privacy-settings',
      headers: authHeaders(tables, ownerUserId),
      payload: {
        profileVisible: false,
        shareWithPartners: true,
      },
    });
    assert.equal(updated.statusCode, 200);
    const updatedPayload = updated.json() as {
      settings: {
        userId: string;
        profileVisible: boolean;
        shareWithPartners: boolean;
      };
    };
    assert.equal(updatedPayload.settings.userId, ownerUserId);
    assert.equal(updatedPayload.settings.profileVisible, false);
    assert.equal(updatedPayload.settings.shareWithPartners, true);

    const outsiderUpdate = await app.inject({
      method: 'PATCH',
      url: '/v1/me/privacy-settings',
      headers: authHeaders(tables, outsiderUserId),
      payload: {
        profileVisible: true,
        showLocation: false,
      },
    });
    assert.equal(outsiderUpdate.statusCode, 200);

    const liveTables = getMarketplaceSeedStore().tables;
    const ownerRow = asRows(liveTables.userPrivacySettings).find(
      (row) => asString(row.userId) === ownerUserId,
    );
    const outsiderRow = asRows(liveTables.userPrivacySettings).find(
      (row) => asString(row.userId) === outsiderUserId,
    );
    assert.equal(ownerRow?.profileVisible, false);
    assert.equal(ownerRow?.shareWithPartners, true);
    assert.equal(outsiderRow?.showLocation, false);

    const updateAudit = auditEventsFor(liveTables, {
      action: 'privacy_settings.update',
      resourceId: ownerUserId,
      result: 'SUCCESS',
    })[0];
    assert.deepEqual(
      (updateAudit?.metadataJson as { changedKeys?: string[] } | undefined)?.changedKeys,
      ['profileVisible', 'shareWithPartners'],
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'privacy_settings.read',
        resourceId: ownerUserId,
        result: 'SUCCESS',
      }).length >= 1,
      true,
    );
  });

  it('uses the db fixture repository seam for active community and media reads in db mode', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      await withStorageEnv(async () => {
        const tables = getDbFixtureStore().tables;
        const videoRow = asRows(tables.videos)[0];
        const videoId = asString(videoRow?.id) as string;
        const videoReaderUserId = asString(videoRow?.coachUserId) as string;
        const communityUserId = asString(
          asRows(tables.communityGroupMemberships)[0]?.userId,
        ) as string;
        const groupId = asString(asRows(tables.communityGroups)[0]?.id) as string;
        const messagingUserId = asString(asRows(tables.messageParticipants)[0]?.userId) as string;
        const notificationUserId = asString(asRows(tables.notifications)[0]?.userId) as string;

        const [video, groups, posts, threads, notifications] = await Promise.all([
          app.inject({
            method: 'GET',
            url: `/v1/videos/${videoId}`,
            headers: authHeaders(tables, videoReaderUserId, 'coach'),
          }),
          app.inject({
            method: 'GET',
            url: '/v1/community-groups',
            headers: authHeaders(tables, communityUserId),
          }),
          app.inject({
            method: 'GET',
            url: `/v1/posts?communityGroupId=${groupId}`,
            headers: authHeaders(tables, communityUserId),
          }),
          app.inject({
            method: 'GET',
            url: '/v1/message-threads',
            headers: authHeaders(tables, messagingUserId),
          }),
          app.inject({
            method: 'GET',
            url: '/v1/me/notifications',
            headers: authHeaders(tables, notificationUserId),
          }),
        ]);

        assert.equal(video.statusCode, 200);
        assert.equal(groups.statusCode, 200);
        assert.equal(posts.statusCode, 200);
        assert.equal(threads.statusCode, 200);
        assert.equal(notifications.statusCode, 200);
      });
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
    }
  });

  it('uses the db fixture repository seam for notification preference writes in db mode', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const tables = getDbFixtureStore().tables;
      const userId = asString(asRows(tables.notificationPreferences)[0]?.userId) as string;
      assert.ok(userId, 'expected notification preference user');

      const updated = await app.inject({
        method: 'PATCH',
        url: '/v1/me/notifications/preferences',
        headers: authHeaders(tables, userId),
        payload: {
          channels: {
            email: false,
          },
          quietHours: {
            enabled: true,
            startTime: '21:15',
            endTime: '06:30',
            timezone: 'Europe/London',
          },
        },
      });
      assert.equal(updated.statusCode, 200);
      const updatedPayload = updated.json() as {
        preferences: { userId: string; emailEnabled: boolean };
        quietHours: { enabled: boolean; startTimeLocal: string; endTimeLocal: string };
      };
      assert.equal(updatedPayload.preferences.userId, userId);
      assert.equal(updatedPayload.preferences.emailEnabled, false);
      assert.equal(updatedPayload.quietHours.enabled, true);
      assert.equal(updatedPayload.quietHours.startTimeLocal, '21:15');
      assert.equal(updatedPayload.quietHours.endTimeLocal, '06:30');
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
    }
  });

  it('creates community groups through backend authority', async () => {
    const tables = loadTables();
    const { clubId, staffUserId, staffRole, memberUserId, memberUserIds } =
      findClubPostActors(tables);
    const squad = asRows(tables.squads).find(
      (row) => asString(row.clubId) === clubId && !asString(row.deletedAt),
    );
    assert.ok(squad, 'expected an active squad for community group tests');
    const squadId = asString(squad.id) as string;
    const squadMemberUserId = findSquadGroupMemberUserId(tables, squadId, memberUserIds);
    const nonSquadClubMemberUserId = findNonSquadClubMemberUserId(
      tables,
      squadId,
      memberUserIds,
      new Set([staffUserId, squadMemberUserId]),
    );
    const outsiderUserId = findUnprivilegedUserId(tables, memberUserIds);
    const approvalRequesterUserId = findUnprivilegedUserId(
      tables,
      new Set([...memberUserIds, outsiderUserId, staffUserId]),
    );

    const unauthenticated = await app.inject({
      method: 'POST',
      url: '/v1/community-groups',
      payload: {
        name: 'Unauthenticated Group',
        type: 'GENERAL',
        idempotencyKey: 'community-group-unauth-test',
      },
    });
    assert.equal(unauthenticated.statusCode, 403);

    const deniedMemberClubGroup = await app.inject({
      method: 'POST',
      url: '/v1/community-groups',
      headers: authHeaders(tables, memberUserId, 'member'),
      payload: {
        name: 'Member-created Club Group',
        type: 'CLUB',
        clubId,
        idempotencyKey: 'community-group-member-deny',
      },
    });
    assert.equal(deniedMemberClubGroup.statusCode, 403);

    const deniedNonClubSeed = await app.inject({
      method: 'POST',
      url: '/v1/community-groups',
      headers: authHeaders(tables, staffUserId, staffRole),
      payload: {
        name: 'Invalid Club Member Seed',
        type: 'CLUB',
        clubId,
        memberIds: [outsiderUserId],
        idempotencyKey: 'community-group-member-seed-deny',
      },
    });
    assert.equal(deniedNonClubSeed.statusCode, 403);

    const createdGeneral = await app.inject({
      method: 'POST',
      url: '/v1/community-groups',
      headers: authHeaders(tables, memberUserId, 'member'),
      payload: {
        name: 'Backend Parent Group',
        description: 'Created by the API route',
        type: 'GENERAL',
        isPublic: true,
        idempotencyKey: 'community-group-general-create-test',
      },
    });
    assert.equal(createdGeneral.statusCode, 201);
    const createdGeneralPayload = createdGeneral.json() as {
      group: {
        id: string;
        clubId: string | null;
        ownerUserId: string;
        name: string;
        visibility: string;
        memberships: Array<{ userId: string; role: string }>;
      };
    };
    assert.equal(createdGeneralPayload.group.clubId, null);
    assert.equal(createdGeneralPayload.group.ownerUserId, memberUserId);
    assert.equal(createdGeneralPayload.group.name, 'Backend Parent Group');
    assert.equal(createdGeneralPayload.group.visibility, 'PUBLIC');
    assert.deepEqual(
      createdGeneralPayload.group.memberships.map((membership) => ({
        userId: membership.userId,
        role: membership.role,
      })),
      [
        {
          userId: memberUserId,
          role: 'OWNER',
        },
      ],
    );

    const replayedGeneral = await app.inject({
      method: 'POST',
      url: '/v1/community-groups',
      headers: authHeaders(tables, memberUserId, 'member'),
      payload: {
        name: 'Backend Parent Group',
        description: 'Created by the API route',
        type: 'GENERAL',
        isPublic: true,
        idempotencyKey: 'community-group-general-create-test',
      },
    });
    assert.equal(replayedGeneral.statusCode, 201);
    const replayedGeneralPayload = replayedGeneral.json() as { group: { id: string } };
    assert.equal(replayedGeneralPayload.group.id, createdGeneralPayload.group.id);

    const conflictedGeneral = await app.inject({
      method: 'POST',
      url: '/v1/community-groups',
      headers: authHeaders(tables, memberUserId, 'member'),
      payload: {
        name: 'Different Parent Group',
        description: 'Created by the API route',
        type: 'GENERAL',
        isPublic: true,
        idempotencyKey: 'community-group-general-create-test',
      },
    });
    assert.equal(conflictedGeneral.statusCode, 409);

    const createdPrivate = await app.inject({
      method: 'POST',
      url: '/v1/community-groups',
      headers: authHeaders(tables, memberUserId, 'member'),
      payload: {
        name: 'Private Parent Group',
        type: 'GENERAL',
        isPublic: false,
        idempotencyKey: 'community-group-private-create-test',
      },
    });
    assert.equal(createdPrivate.statusCode, 201);
    const createdPrivatePayload = createdPrivate.json() as { group: { id: string } };

    const deniedPrivateJoin = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdPrivatePayload.group.id}/join`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(deniedPrivateJoin.statusCode, 403);

    const createdJoinRequest = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdPrivatePayload.group.id}/join-requests`,
      headers: authHeaders(tables, approvalRequesterUserId),
      payload: {
        isCoach: true,
      },
    });
    assert.equal(createdJoinRequest.statusCode, 201);
    const createdJoinRequestPayload = createdJoinRequest.json() as {
      request: {
        id: string;
        groupId: string;
        requesterId: string;
        isCoach: boolean;
        status: string;
      };
    };
    assert.equal(createdJoinRequestPayload.request.groupId, createdPrivatePayload.group.id);
    assert.equal(createdJoinRequestPayload.request.requesterId, approvalRequesterUserId);
    assert.equal(createdJoinRequestPayload.request.isCoach, true);
    assert.equal(createdJoinRequestPayload.request.status, 'PENDING');

    const duplicateJoinRequest = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdPrivatePayload.group.id}/join-requests`,
      headers: authHeaders(tables, approvalRequesterUserId),
      payload: {
        isCoach: true,
      },
    });
    assert.equal(duplicateJoinRequest.statusCode, 409);

    const deniedJoinRequestList = await app.inject({
      method: 'GET',
      url: `/v1/community-groups/${createdPrivatePayload.group.id}/join-requests`,
      headers: authHeaders(tables, approvalRequesterUserId),
    });
    assert.equal(deniedJoinRequestList.statusCode, 403);

    const listedJoinRequests = await app.inject({
      method: 'GET',
      url: `/v1/community-groups/${createdPrivatePayload.group.id}/join-requests`,
      headers: authHeaders(tables, memberUserId, 'member'),
    });
    assert.equal(listedJoinRequests.statusCode, 200);
    const listedJoinRequestsPayload = listedJoinRequests.json() as {
      requests: Array<{ id: string; requesterId: string; status: string }>;
    };
    assert.equal(
      listedJoinRequestsPayload.requests.some(
        (request) =>
          request.id === createdJoinRequestPayload.request.id &&
          request.requesterId === approvalRequesterUserId &&
          request.status === 'PENDING',
      ),
      true,
    );

    const approvedJoinRequest = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdPrivatePayload.group.id}/join-requests/${createdJoinRequestPayload.request.id}/approve`,
      headers: authHeaders(tables, memberUserId, 'member'),
    });
    assert.equal(approvedJoinRequest.statusCode, 200);
    const approvedJoinRequestPayload = approvedJoinRequest.json() as {
      request: { status: string };
      group: { memberships: Array<{ userId: string; role: string }> };
    };
    assert.equal(approvedJoinRequestPayload.request.status, 'ACCEPTED');
    assert.equal(
      approvedJoinRequestPayload.group.memberships.some(
        (membership) =>
          membership.userId === approvalRequesterUserId && membership.role === 'MEMBER',
      ),
      true,
    );

    const duplicateJoinRequestApprove = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdPrivatePayload.group.id}/join-requests/${createdJoinRequestPayload.request.id}/approve`,
      headers: authHeaders(tables, memberUserId, 'member'),
    });
    assert.equal(duplicateJoinRequestApprove.statusCode, 404);

    const rejectedJoinRequestSeed = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdPrivatePayload.group.id}/join-requests`,
      headers: authHeaders(tables, staffUserId, staffRole),
    });
    assert.equal(rejectedJoinRequestSeed.statusCode, 201);
    const rejectedJoinRequestSeedPayload = rejectedJoinRequestSeed.json() as {
      request: { id: string };
    };
    const rejectedJoinRequest = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdPrivatePayload.group.id}/join-requests/${rejectedJoinRequestSeedPayload.request.id}/reject`,
      headers: authHeaders(tables, memberUserId, 'member'),
    });
    assert.equal(rejectedJoinRequest.statusCode, 200);
    assert.equal(
      (rejectedJoinRequest.json() as { request: { status: string } }).request.status,
      'DECLINED',
    );

    const deniedInviteCreate = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdPrivatePayload.group.id}/invites`,
      headers: authHeaders(tables, outsiderUserId),
      payload: {
        inviteeUserId: staffUserId,
      },
    });
    assert.equal(deniedInviteCreate.statusCode, 403);

    const createdInvite = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdPrivatePayload.group.id}/invites`,
      headers: authHeaders(tables, memberUserId, 'member'),
      payload: {
        inviteeUserId: outsiderUserId,
      },
    });
    assert.equal(createdInvite.statusCode, 201);
    const createdInvitePayload = createdInvite.json() as {
      invite: {
        id: string;
        groupId: string;
        inviteeId: string;
        status: string;
      };
    };
    assert.equal(createdInvitePayload.invite.groupId, createdPrivatePayload.group.id);
    assert.equal(createdInvitePayload.invite.inviteeId, outsiderUserId);
    assert.equal(createdInvitePayload.invite.status, 'PENDING');

    const duplicateInvite = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdPrivatePayload.group.id}/invites`,
      headers: authHeaders(tables, memberUserId, 'member'),
      payload: {
        inviteeUserId: outsiderUserId,
      },
    });
    assert.equal(duplicateInvite.statusCode, 409);

    const listedInvites = await app.inject({
      method: 'GET',
      url: '/v1/me/community-group-invites',
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(listedInvites.statusCode, 200);
    const listedInvitesPayload = listedInvites.json() as {
      invites: Array<{ id: string; groupId: string }>;
    };
    assert.equal(
      listedInvitesPayload.invites.some(
        (invite) =>
          invite.id === createdInvitePayload.invite.id &&
          invite.groupId === createdPrivatePayload.group.id,
      ),
      true,
    );

    const acceptedInvite = await app.inject({
      method: 'POST',
      url: `/v1/community-group-invites/${createdInvitePayload.invite.id}/accept`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(acceptedInvite.statusCode, 200);
    const acceptedInvitePayload = acceptedInvite.json() as {
      group: { memberships: Array<{ userId: string; role: string }> };
    };
    assert.equal(
      acceptedInvitePayload.group.memberships.some(
        (membership) => membership.userId === outsiderUserId && membership.role === 'MEMBER',
      ),
      true,
    );

    const duplicateAccept = await app.inject({
      method: 'POST',
      url: `/v1/community-group-invites/${createdInvitePayload.invite.id}/accept`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(duplicateAccept.statusCode, 404);

    const declineInvite = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdPrivatePayload.group.id}/invites`,
      headers: authHeaders(tables, memberUserId, 'member'),
      payload: {
        inviteeUserId: staffUserId,
      },
    });
    assert.equal(declineInvite.statusCode, 201);
    const declineInvitePayload = declineInvite.json() as { invite: { id: string } };
    const declinedInvite = await app.inject({
      method: 'POST',
      url: `/v1/community-group-invites/${declineInvitePayload.invite.id}/decline`,
      headers: authHeaders(tables, staffUserId, staffRole),
    });
    assert.equal(declinedInvite.statusCode, 200);

    const joinedGeneral = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdGeneralPayload.group.id}/join`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(joinedGeneral.statusCode, 200);
    const joinedGeneralPayload = joinedGeneral.json() as {
      group: { memberships: Array<{ userId: string; role: string }> };
    };
    assert.equal(
      joinedGeneralPayload.group.memberships.some(
        (membership) => membership.userId === outsiderUserId && membership.role === 'MEMBER',
      ),
      true,
    );

    const duplicateJoin = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdGeneralPayload.group.id}/join`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(duplicateJoin.statusCode, 409);

    const ownerLeaveGuard = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdGeneralPayload.group.id}/leave`,
      headers: authHeaders(tables, memberUserId, 'member'),
    });
    assert.equal(ownerLeaveGuard.statusCode, 400);

    const leftGeneral = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdGeneralPayload.group.id}/leave`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(leftGeneral.statusCode, 200);
    const leftGeneralPayload = leftGeneral.json() as {
      group: { memberships: Array<{ userId: string }> };
    };
    assert.equal(
      leftGeneralPayload.group.memberships.some(
        (membership) => membership.userId === outsiderUserId,
      ),
      false,
    );

    const duplicateLeave = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdGeneralPayload.group.id}/leave`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(duplicateLeave.statusCode, 404);

    const createdClub = await app.inject({
      method: 'POST',
      url: '/v1/community-groups',
      headers: authHeaders(tables, staffUserId, staffRole),
      payload: {
        name: 'Backend Club Group',
        type: 'CLUB',
        clubId,
        isPublic: true,
        memberIds: [memberUserId],
        idempotencyKey: 'community-group-club-create-test',
      },
    });
    assert.equal(createdClub.statusCode, 201);
    const createdClubPayload = createdClub.json() as {
      group: {
        id: string;
        clubId: string;
        ownerUserId: string;
        memberships: Array<{ userId: string; role: string }>;
      };
    };
    assert.equal(createdClubPayload.group.clubId, clubId);
    assert.equal(createdClubPayload.group.ownerUserId, staffUserId);
    assert.equal(
      createdClubPayload.group.memberships.some(
        (membership) => membership.userId === staffUserId && membership.role === 'OWNER',
      ),
      true,
    );
    assert.equal(
      createdClubPayload.group.memberships.some(
        (membership) => membership.userId === memberUserId && membership.role === 'MEMBER',
      ),
      true,
    );

    const deniedPublicSquad = await app.inject({
      method: 'POST',
      url: '/v1/community-groups',
      headers: authHeaders(tables, staffUserId, staffRole),
      payload: {
        name: 'Public Squad Group',
        type: 'SQUAD',
        clubId,
        squadId,
        isPublic: true,
        idempotencyKey: 'community-group-squad-public-deny',
      },
    });
    assert.equal(deniedPublicSquad.statusCode, 400);

    const deniedNonSquadSeed = await app.inject({
      method: 'POST',
      url: '/v1/community-groups',
      headers: authHeaders(tables, staffUserId, staffRole),
      payload: {
        name: 'Wrong Squad Member Group',
        type: 'SQUAD',
        clubId,
        squadId,
        memberIds: [nonSquadClubMemberUserId],
        idempotencyKey: 'community-group-squad-member-deny',
      },
    });
    assert.equal(deniedNonSquadSeed.statusCode, 403);

    const createdSquad = await app.inject({
      method: 'POST',
      url: '/v1/community-groups',
      headers: authHeaders(tables, staffUserId, staffRole),
      payload: {
        name: 'Backend Squad Group',
        type: 'SQUAD',
        clubId,
        squadId,
        isPublic: false,
        memberIds: [squadMemberUserId],
        idempotencyKey: 'community-group-squad-create-test',
      },
    });
    assert.equal(createdSquad.statusCode, 201);
    const createdSquadPayload = createdSquad.json() as {
      group: {
        id: string;
        groupType: string;
        clubId: string;
        squadId: string;
        visibility: string;
        memberships: Array<{ userId: string; role: string }>;
      };
    };
    assert.equal(createdSquadPayload.group.groupType, 'SQUAD');
    assert.equal(createdSquadPayload.group.clubId, clubId);
    assert.equal(createdSquadPayload.group.squadId, squadId);
    assert.equal(createdSquadPayload.group.visibility, 'PRIVATE');
    assert.equal(
      createdSquadPayload.group.memberships.some(
        (membership) => membership.userId === squadMemberUserId && membership.role === 'MEMBER',
      ),
      true,
    );

    const replayedSquad = await app.inject({
      method: 'POST',
      url: '/v1/community-groups',
      headers: authHeaders(tables, staffUserId, staffRole),
      payload: {
        name: 'Backend Squad Group Duplicate',
        type: 'SQUAD',
        clubId,
        squadId,
        memberIds: [squadMemberUserId],
        idempotencyKey: 'community-group-squad-create-test-second-key',
      },
    });
    assert.equal(replayedSquad.statusCode, 201);
    const replayedSquadPayload = replayedSquad.json() as { group: { id: string } };
    assert.equal(replayedSquadPayload.group.id, createdSquadPayload.group.id);

    const directAddStaffHeaders = authHeaders(tables, staffUserId, staffRole, {
      'x-auth-roles': 'coach',
      'x-acting-role': 'coach',
    });
    const createdDirectAddGroup = await app.inject({
      method: 'POST',
      url: '/v1/community-groups',
      headers: directAddStaffHeaders,
      payload: {
        name: 'Backend Direct Add Group',
        type: 'CLUB',
        clubId,
        memberIds: [],
        idempotencyKey: 'community-group-member-add-create-test',
      },
    });
    assert.equal(createdDirectAddGroup.statusCode, 201);
    const createdDirectAddGroupPayload = createdDirectAddGroup.json() as {
      group: { id: string };
    };

    const deniedDirectAdd = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdDirectAddGroupPayload.group.id}/members`,
      headers: authHeaders(tables, memberUserId, 'member'),
      payload: {
        memberUserId,
      },
    });
    assert.equal(deniedDirectAdd.statusCode, 403);

    const directAdded = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdDirectAddGroupPayload.group.id}/members`,
      headers: directAddStaffHeaders,
      payload: {
        memberUserId,
        role: 'MODERATOR',
      },
    });
    assert.equal(directAdded.statusCode, 200);
    const directAddedPayload = directAdded.json() as {
      group: { memberships: Array<{ userId: string; role: string }> };
    };
    assert.equal(
      directAddedPayload.group.memberships.some(
        (membership) => membership.userId === memberUserId && membership.role === 'MODERATOR',
      ),
      true,
    );

    const duplicateDirectAdd = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdDirectAddGroupPayload.group.id}/members`,
      headers: directAddStaffHeaders,
      payload: {
        memberUserId,
        role: 'MODERATOR',
      },
    });
    assert.equal(duplicateDirectAdd.statusCode, 200);

    const currentClubMemberUserIds = new Set(
      asRows(tables.clubMemberships)
        .filter((row) => asString(row.clubId) === clubId && isActiveMembership(row))
        .map((row) => asString(row.userId))
        .filter((userId): userId is string => Boolean(userId)),
    );
    const nonClubUserId = findUnprivilegedUserId(tables, currentClubMemberUserIds);
    const deniedNonClubDirectAdd = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdDirectAddGroupPayload.group.id}/members`,
      headers: directAddStaffHeaders,
      payload: {
        memberUserId: nonClubUserId,
      },
    });
    assert.equal(deniedNonClubDirectAdd.statusCode, 403);

    const createdTransferGroup = await app.inject({
      method: 'POST',
      url: '/v1/community-groups',
      headers: authHeaders(tables, staffUserId, staffRole),
      payload: {
        name: 'Backend Transfer Group',
        type: 'CLUB',
        clubId,
        memberIds: [memberUserId],
        idempotencyKey: 'community-group-owner-transfer-create-test',
      },
    });
    assert.equal(createdTransferGroup.statusCode, 201);
    const createdTransferGroupPayload = createdTransferGroup.json() as {
      group: { id: string; ownerUserId: string };
    };
    assert.equal(createdTransferGroupPayload.group.ownerUserId, staffUserId);

    const deniedOwnerTransfer = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdTransferGroupPayload.group.id}/members/${staffUserId}/transfer-ownership`,
      headers: authHeaders(tables, memberUserId, 'member'),
    });
    assert.equal(deniedOwnerTransfer.statusCode, 403);

    const transferredOwner = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdTransferGroupPayload.group.id}/members/${memberUserId}/transfer-ownership`,
      headers: authHeaders(tables, staffUserId, staffRole),
    });
    assert.equal(transferredOwner.statusCode, 200);
    const transferredOwnerPayload = transferredOwner.json() as {
      group: {
        ownerUserId: string;
        memberships: Array<{ userId: string; role: string }>;
      };
    };
    assert.equal(transferredOwnerPayload.group.ownerUserId, memberUserId);
    assert.equal(
      transferredOwnerPayload.group.memberships.some(
        (membership) => membership.userId === memberUserId && membership.role === 'OWNER',
      ),
      true,
    );
    assert.equal(
      transferredOwnerPayload.group.memberships.some(
        (membership) => membership.userId === staffUserId && membership.role === 'ADMIN',
      ),
      true,
    );

    const deniedClubJoin = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdClubPayload.group.id}/join`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(deniedClubJoin.statusCode, 403);

    const listedForSeededMember = await app.inject({
      method: 'GET',
      url: '/v1/community-groups',
      headers: authHeaders(tables, memberUserId, 'member'),
    });
    assert.equal(listedForSeededMember.statusCode, 200);
    const listedPayload = listedForSeededMember.json() as {
      groups: Array<{ id: string }>;
    };
    assert.equal(
      listedPayload.groups.some((group) => group.id === createdClubPayload.group.id),
      true,
    );

    const deniedMemberRoleUpdate = await app.inject({
      method: 'PATCH',
      url: `/v1/community-groups/${createdClubPayload.group.id}/members/${staffUserId}/role`,
      headers: authHeaders(tables, memberUserId, 'member'),
      payload: {
        role: 'MEMBER',
      },
    });
    assert.equal(deniedMemberRoleUpdate.statusCode, 403);

    const updatedMemberRole = await app.inject({
      method: 'PATCH',
      url: `/v1/community-groups/${createdClubPayload.group.id}/members/${memberUserId}/role`,
      headers: authHeaders(tables, staffUserId, staffRole),
      payload: {
        role: 'MODERATOR',
      },
    });
    assert.equal(updatedMemberRole.statusCode, 200);
    const updatedMemberRolePayload = updatedMemberRole.json() as {
      group: { memberships: Array<{ userId: string; role: string }> };
    };
    assert.equal(
      updatedMemberRolePayload.group.memberships.some(
        (membership) => membership.userId === memberUserId && membership.role === 'MODERATOR',
      ),
      true,
    );

    const deniedMemberRemove = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdClubPayload.group.id}/members/${staffUserId}/remove`,
      headers: authHeaders(tables, memberUserId, 'member'),
    });
    assert.equal(deniedMemberRemove.statusCode, 403);

    const removedMember = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdClubPayload.group.id}/members/${memberUserId}/remove`,
      headers: authHeaders(tables, staffUserId, staffRole),
    });
    assert.equal(removedMember.statusCode, 200);
    const removedMemberPayload = removedMember.json() as {
      group: { memberships: Array<{ userId: string }> };
    };
    assert.equal(
      removedMemberPayload.group.memberships.some(
        (membership) => membership.userId === memberUserId,
      ),
      false,
    );

    const duplicateRemove = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdClubPayload.group.id}/members/${memberUserId}/remove`,
      headers: authHeaders(tables, staffUserId, staffRole),
    });
    assert.equal(duplicateRemove.statusCode, 404);

    const deniedArchive = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdPrivatePayload.group.id}/archive`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(deniedArchive.statusCode, 403);

    const archivedPrivate = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdPrivatePayload.group.id}/archive`,
      headers: authHeaders(tables, memberUserId, 'member'),
    });
    assert.equal(archivedPrivate.statusCode, 200);
    const archivedPrivatePayload = archivedPrivate.json() as {
      group: { deletedAt: string | null; memberships: Array<{ userId: string }> };
    };
    assert.equal(typeof archivedPrivatePayload.group.deletedAt, 'string');
    assert.deepEqual(archivedPrivatePayload.group.memberships, []);

    const listedAfterArchive = await app.inject({
      method: 'GET',
      url: '/v1/community-groups',
      headers: authHeaders(tables, memberUserId, 'member'),
    });
    assert.equal(listedAfterArchive.statusCode, 200);
    const listedAfterArchivePayload = listedAfterArchive.json() as {
      groups: Array<{ id: string }>;
    };
    assert.equal(
      listedAfterArchivePayload.groups.some((group) => group.id === createdPrivatePayload.group.id),
      false,
    );

    const duplicateArchive = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${createdPrivatePayload.group.id}/archive`,
      headers: authHeaders(tables, memberUserId, 'member'),
    });
    assert.equal(duplicateArchive.statusCode, 404);

    const liveTables = getMarketplaceSeedStore().tables;
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.create',
        result: 'SUCCESS',
      }).length >= 2,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.create',
        result: 'DENY',
      }).length >= 2,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.join',
        result: 'SUCCESS',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.join',
        result: 'DENY',
      }).length >= 3,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.join_request.create',
        result: 'SUCCESS',
      }).length >= 2,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.join_request.create',
        result: 'DENY',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.join_request.list',
        result: 'SUCCESS',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.join_request.list',
        result: 'DENY',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.join_request.approve',
        result: 'SUCCESS',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.join_request.approve',
        result: 'DENY',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.join_request.reject',
        result: 'SUCCESS',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.invite.create',
        result: 'SUCCESS',
      }).length >= 2,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.invite.create',
        result: 'DENY',
      }).length >= 2,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.invite.accept',
        result: 'SUCCESS',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.invite.accept',
        result: 'DENY',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.invite.decline',
        result: 'SUCCESS',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.leave',
        result: 'SUCCESS',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.leave',
        result: 'DENY',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.member.role_update',
        result: 'SUCCESS',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.member.role_update',
        result: 'DENY',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.member.add',
        result: 'SUCCESS',
      }).length >= 2,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.member.add',
        result: 'DENY',
      }).length >= 2,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.owner.transfer',
        result: 'SUCCESS',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.owner.transfer',
        result: 'DENY',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.member.remove',
        result: 'SUCCESS',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.member.remove',
        result: 'DENY',
      }).length >= 2,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.archive',
        result: 'SUCCESS',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.group.archive',
        result: 'DENY',
      }).length >= 2,
      true,
    );
  });

  it('uses the db fixture repository seam for community group creation in db mode', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const tables = getDbFixtureStore().tables;
      const { clubId, staffUserId, staffRole, memberUserId, memberUserIds } =
        findClubPostActors(tables);
      const squad = asRows(tables.squads).find(
        (row) => asString(row.clubId) === clubId && !asString(row.deletedAt),
      );
      assert.ok(squad, 'expected an active squad for db-fixture community group tests');
      const squadId = asString(squad.id) as string;
      const squadMemberUserId = findSquadGroupMemberUserId(tables, squadId, memberUserIds);
      const nonSquadClubMemberUserId = findNonSquadClubMemberUserId(
        tables,
        squadId,
        memberUserIds,
        new Set([staffUserId, squadMemberUserId]),
      );
      const inviteeUserId = findUnprivilegedUserId(tables, new Set([staffUserId, memberUserId]));

      const created = await app.inject({
        method: 'POST',
        url: '/v1/community-groups',
        headers: authHeaders(tables, staffUserId, staffRole),
        payload: {
          name: 'DB Fixture Club Group',
          type: 'CLUB',
          clubId,
          memberIds: [memberUserId],
          idempotencyKey: 'community-group-db-fixture-create',
        },
      });
      assert.equal(created.statusCode, 201);
      const createdPayload = created.json() as {
        group: { id: string; memberships: Array<{ userId: string; role: string }> };
      };
      assert.equal(
        asRows(getDbFixtureStore().tables.communityGroups).some(
          (group) => asString(group.id) === createdPayload.group.id,
        ),
        true,
      );
      assert.equal(
        createdPayload.group.memberships.some(
          (membership) => membership.userId === memberUserId && membership.role === 'MEMBER',
        ),
        true,
      );
      assert.equal(
        auditEventsFor(getDbFixtureStore().tables, {
          action: 'community.group.create',
          result: 'SUCCESS',
        }).length >= 1,
        true,
      );

      const deniedSquadSeed = await app.inject({
        method: 'POST',
        url: '/v1/community-groups',
        headers: authHeaders(tables, staffUserId, staffRole),
        payload: {
          name: 'DB Fixture Wrong Squad Group',
          type: 'SQUAD',
          clubId,
          squadId,
          memberIds: [nonSquadClubMemberUserId],
          idempotencyKey: 'community-group-db-fixture-squad-member-deny',
        },
      });
      assert.equal(deniedSquadSeed.statusCode, 403);

      const createdSquad = await app.inject({
        method: 'POST',
        url: '/v1/community-groups',
        headers: authHeaders(tables, staffUserId, staffRole),
        payload: {
          name: 'DB Fixture Squad Group',
          type: 'SQUAD',
          clubId,
          squadId,
          memberIds: [squadMemberUserId],
          idempotencyKey: 'community-group-db-fixture-squad-create',
        },
      });
      assert.equal(createdSquad.statusCode, 201);
      const createdSquadPayload = createdSquad.json() as {
        group: { id: string; groupType: string; clubId: string; squadId: string };
      };
      assert.equal(createdSquadPayload.group.groupType, 'SQUAD');
      assert.equal(createdSquadPayload.group.clubId, clubId);
      assert.equal(createdSquadPayload.group.squadId, squadId);
      assert.equal(
        asRows(getDbFixtureStore().tables.communityGroups).some(
          (group) =>
            asString(group.id) === createdSquadPayload.group.id &&
            asString(group.groupType) === 'SQUAD' &&
            asString(group.squadId) === squadId,
        ),
        true,
      );

      const directAddFixtureGroup = await app.inject({
        method: 'POST',
        url: '/v1/community-groups',
        headers: authHeaders(tables, staffUserId, staffRole),
        payload: {
          name: 'DB Fixture Direct Add Group',
          type: 'CLUB',
          clubId,
          memberIds: [],
          idempotencyKey: 'community-group-db-fixture-member-add',
        },
      });
      assert.equal(directAddFixtureGroup.statusCode, 201);
      const directAddFixtureGroupPayload = directAddFixtureGroup.json() as {
        group: { id: string };
      };

      const directAddFixture = await app.inject({
        method: 'POST',
        url: `/v1/community-groups/${directAddFixtureGroupPayload.group.id}/members`,
        headers: authHeaders(tables, staffUserId, staffRole),
        payload: {
          memberUserId,
          role: 'MEMBER',
        },
      });
      assert.equal(directAddFixture.statusCode, 200);
      const directAddFixturePayload = directAddFixture.json() as {
        group: { memberships: Array<{ userId: string; role: string }> };
      };
      assert.equal(
        directAddFixturePayload.group.memberships.some(
          (membership) => membership.userId === memberUserId && membership.role === 'MEMBER',
        ),
        true,
      );

      const transferFixtureGroup = await app.inject({
        method: 'POST',
        url: '/v1/community-groups',
        headers: authHeaders(tables, staffUserId, staffRole),
        payload: {
          name: 'DB Fixture Owner Transfer Group',
          type: 'CLUB',
          clubId,
          memberIds: [memberUserId],
          idempotencyKey: 'community-group-db-fixture-owner-transfer',
        },
      });
      assert.equal(transferFixtureGroup.statusCode, 201);
      const transferFixtureGroupPayload = transferFixtureGroup.json() as {
        group: { id: string };
      };

      const transferFixtureDenied = await app.inject({
        method: 'POST',
        url: `/v1/community-groups/${transferFixtureGroupPayload.group.id}/members/${staffUserId}/transfer-ownership`,
        headers: authHeaders(tables, memberUserId, 'member'),
      });
      assert.equal(transferFixtureDenied.statusCode, 403);

      const transferFixture = await app.inject({
        method: 'POST',
        url: `/v1/community-groups/${transferFixtureGroupPayload.group.id}/members/${memberUserId}/transfer-ownership`,
        headers: authHeaders(tables, staffUserId, staffRole),
      });
      assert.equal(transferFixture.statusCode, 200);
      const transferFixturePayload = transferFixture.json() as {
        group: {
          ownerUserId: string;
          memberships: Array<{ userId: string; role: string }>;
        };
      };
      assert.equal(transferFixturePayload.group.ownerUserId, memberUserId);
      assert.equal(
        transferFixturePayload.group.memberships.some(
          (membership) => membership.userId === memberUserId && membership.role === 'OWNER',
        ),
        true,
      );

      const roleUpdated = await app.inject({
        method: 'PATCH',
        url: `/v1/community-groups/${createdPayload.group.id}/members/${memberUserId}/role`,
        headers: authHeaders(tables, staffUserId, staffRole),
        payload: {
          role: 'MODERATOR',
        },
      });
      assert.equal(roleUpdated.statusCode, 200);
      const roleUpdatedPayload = roleUpdated.json() as {
        group: { memberships: Array<{ userId: string; role: string }> };
      };
      assert.equal(
        roleUpdatedPayload.group.memberships.some(
          (membership) => membership.userId === memberUserId && membership.role === 'MODERATOR',
        ),
        true,
      );

      const removed = await app.inject({
        method: 'POST',
        url: `/v1/community-groups/${createdPayload.group.id}/members/${memberUserId}/remove`,
        headers: authHeaders(tables, staffUserId, staffRole),
      });
      assert.equal(removed.statusCode, 200);
      const removedPayload = removed.json() as {
        group: { memberships: Array<{ userId: string }> };
      };
      assert.equal(
        removedPayload.group.memberships.some((membership) => membership.userId === memberUserId),
        false,
      );

      const archived = await app.inject({
        method: 'POST',
        url: `/v1/community-groups/${createdPayload.group.id}/archive`,
        headers: authHeaders(tables, staffUserId, staffRole),
      });
      assert.equal(archived.statusCode, 200);
      assert.equal(
        asRows(getDbFixtureStore().tables.communityGroups).some(
          (group) =>
            asString(group.id) === createdPayload.group.id &&
            typeof asString(group.deletedAt) === 'string',
        ),
        true,
      );

      const publicGroup = await app.inject({
        method: 'POST',
        url: '/v1/community-groups',
        headers: authHeaders(tables, staffUserId, staffRole),
        payload: {
          name: 'DB Fixture Public Group',
          type: 'GENERAL',
          isPublic: true,
          idempotencyKey: 'community-group-db-fixture-public-create',
        },
      });
      assert.equal(publicGroup.statusCode, 201);
      const publicGroupPayload = publicGroup.json() as { group: { id: string } };

      const fixtureJoinRequest = await app.inject({
        method: 'POST',
        url: `/v1/community-groups/${publicGroupPayload.group.id}/join-requests`,
        headers: authHeaders(tables, inviteeUserId),
      });
      assert.equal(fixtureJoinRequest.statusCode, 201);
      const fixtureJoinRequestPayload = fixtureJoinRequest.json() as { request: { id: string } };

      const fixtureJoinRequests = await app.inject({
        method: 'GET',
        url: `/v1/community-groups/${publicGroupPayload.group.id}/join-requests`,
        headers: authHeaders(tables, staffUserId, staffRole),
      });
      assert.equal(fixtureJoinRequests.statusCode, 200);
      assert.equal(
        (fixtureJoinRequests.json() as { requests: Array<{ id: string }> }).requests.some(
          (request) => request.id === fixtureJoinRequestPayload.request.id,
        ),
        true,
      );

      const fixtureJoinRejected = await app.inject({
        method: 'POST',
        url: `/v1/community-groups/${publicGroupPayload.group.id}/join-requests/${fixtureJoinRequestPayload.request.id}/reject`,
        headers: authHeaders(tables, staffUserId, staffRole),
      });
      assert.equal(fixtureJoinRejected.statusCode, 200);

      const fixtureInvite = await app.inject({
        method: 'POST',
        url: `/v1/community-groups/${publicGroupPayload.group.id}/invites`,
        headers: authHeaders(tables, staffUserId, staffRole),
        payload: {
          inviteeUserId,
        },
      });
      assert.equal(fixtureInvite.statusCode, 201);
      const fixtureInvitePayload = fixtureInvite.json() as { invite: { id: string } };

      const fixtureInvites = await app.inject({
        method: 'GET',
        url: '/v1/me/community-group-invites',
        headers: authHeaders(tables, inviteeUserId),
      });
      assert.equal(fixtureInvites.statusCode, 200);
      assert.equal(
        (fixtureInvites.json() as { invites: Array<{ id: string }> }).invites.some(
          (invite) => invite.id === fixtureInvitePayload.invite.id,
        ),
        true,
      );

      const fixtureDeclined = await app.inject({
        method: 'POST',
        url: `/v1/community-group-invites/${fixtureInvitePayload.invite.id}/decline`,
        headers: authHeaders(tables, inviteeUserId),
      });
      assert.equal(fixtureDeclined.statusCode, 200);

      const joined = await app.inject({
        method: 'POST',
        url: `/v1/community-groups/${publicGroupPayload.group.id}/join`,
        headers: authHeaders(tables, memberUserId, 'member'),
      });
      assert.equal(joined.statusCode, 200);

      const left = await app.inject({
        method: 'POST',
        url: `/v1/community-groups/${publicGroupPayload.group.id}/leave`,
        headers: authHeaders(tables, memberUserId, 'member'),
      });
      assert.equal(left.statusCode, 200);
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
    }
  });

  it('creates community group messages and read receipts through backend authority', async () => {
    const tables = loadTables();
    const group = asRows(tables.communityGroups)[0];
    assert.ok(group, 'expected seeded community group');
    const groupId = asString(group.id) as string;
    const memberUserIds = asRows(tables.communityGroupMemberships)
      .filter(
        (row) =>
          asString(row.communityGroupId) === groupId &&
          !asString(row.deletedAt) &&
          asString(row.userId),
      )
      .map((row) => asString(row.userId) as string);
    assert.equal(memberUserIds.length >= 2, true);
    const senderUserId = memberUserIds[0] as string;
    const readerUserId = memberUserIds[1] as string;
    const outsiderUserId = findUnprivilegedUserId(tables, new Set(memberUserIds));

    const unauthenticated = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${groupId}/messages`,
      payload: {
        body: 'This should not be accepted from local state',
        idempotencyKey: 'community-message-unauth-test',
      },
    });
    assert.equal(unauthenticated.statusCode, 403);

    const denied = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${groupId}/messages`,
      headers: authHeaders(tables, outsiderUserId),
      payload: {
        body: 'Outsider spoof attempt',
        idempotencyKey: 'community-message-deny-test',
      },
    });
    assert.equal(denied.statusCode, 403);

    const created = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${groupId}/messages`,
      headers: authHeaders(tables, senderUserId),
      payload: {
        body: 'Backend-owned group update',
        idempotencyKey: 'community-message-create-test',
      },
    });
    assert.equal(created.statusCode, 201);
    const createdPayload = created.json() as {
      message: {
        id: string;
        messageThreadId: string;
        senderUserId: string;
        content: string;
        receipts: Array<{ userId: string; readAt: string | null }>;
      };
      thread: { messages: Array<{ id: string; content: string }> };
    };
    assert.equal(createdPayload.message.senderUserId, senderUserId);
    assert.equal(createdPayload.message.content, 'Backend-owned group update');
    assert.equal(
      createdPayload.message.receipts.some(
        (receipt) => receipt.userId === readerUserId && receipt.readAt == null,
      ),
      true,
    );
    assert.equal(
      createdPayload.thread.messages.some(
        (message) =>
          message.id === createdPayload.message.id &&
          message.content === 'Backend-owned group update',
      ),
      true,
    );

    const replayed = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${groupId}/messages`,
      headers: authHeaders(tables, senderUserId),
      payload: {
        body: 'Backend-owned group update',
        idempotencyKey: 'community-message-create-test',
      },
    });
    assert.equal(replayed.statusCode, 201);
    const replayedPayload = replayed.json() as { message: { id: string } };
    assert.equal(replayedPayload.message.id, createdPayload.message.id);

    const conflict = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${groupId}/messages`,
      headers: authHeaders(tables, senderUserId),
      payload: {
        body: 'Different content cannot reuse the same idempotency key',
        idempotencyKey: 'community-message-create-test',
      },
    });
    assert.equal(conflict.statusCode, 409);

    const markedRead = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${groupId}/messages/read`,
      headers: authHeaders(tables, readerUserId),
    });
    assert.equal(markedRead.statusCode, 200);
    const readPayload = markedRead.json() as {
      thread: {
        messages: Array<{
          id: string;
          receipts: Array<{ userId: string; readAt: string | null }>;
        }>;
      };
    };
    const readMessage = readPayload.thread.messages.find(
      (message) => message.id === createdPayload.message.id,
    );
    assert.ok(readMessage, 'expected created message after marking read');
    assert.equal(
      readMessage.receipts.some(
        (receipt) => receipt.userId === readerUserId && Boolean(receipt.readAt),
      ),
      true,
    );

    const deniedRead = await app.inject({
      method: 'POST',
      url: `/v1/community-groups/${groupId}/messages/read`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(deniedRead.statusCode, 403);

    const listed = await app.inject({
      method: 'GET',
      url: '/v1/message-threads',
      headers: authHeaders(tables, senderUserId),
    });
    assert.equal(listed.statusCode, 200);
    const listedPayload = listed.json() as {
      threads: Array<{ messages: Array<{ id: string; content: string }> }>;
    };
    assert.equal(
      listedPayload.threads.some((thread) =>
        thread.messages.some((message) => message.id === createdPayload.message.id),
      ),
      true,
    );

    const liveTables = getMarketplaceSeedStore().tables;
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.message.create',
        resourceId: groupId,
        result: 'DENY',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.message.read',
        resourceId: groupId,
        result: 'DENY',
      }).length >= 1,
      true,
    );
  });

  it('uses the db fixture repository seam for community group message writes in db mode', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const tables = getDbFixtureStore().tables;
      const groupId = asString(asRows(tables.communityGroups)[0]?.id) as string;
      const senderUserId = asString(
        asRows(tables.communityGroupMemberships).find(
          (row) => asString(row.communityGroupId) === groupId && !asString(row.deletedAt),
        )?.userId,
      ) as string;

      const created = await app.inject({
        method: 'POST',
        url: `/v1/community-groups/${groupId}/messages`,
        headers: authHeaders(tables, senderUserId),
        payload: {
          body: 'DB fixture community write',
          idempotencyKey: 'community-message-db-fixture-test',
        },
      });
      assert.equal(created.statusCode, 201);

      const listed = await app.inject({
        method: 'GET',
        url: '/v1/message-threads',
        headers: authHeaders(tables, senderUserId),
      });
      assert.equal(listed.statusCode, 200);
      const listedPayload = listed.json() as {
        threads: Array<{ messages: Array<{ content: string }> }>;
      };
      assert.equal(
        listedPayload.threads.some((thread) =>
          thread.messages.some((message) => message.content === 'DB fixture community write'),
        ),
        true,
      );
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
    }
  });

  it('creates and removes direct thread messages through backend authority', async () => {
    const tables = loadTables();
    const store = getMarketplaceSeedStore();
    const { threadId, senderUserId, otherUserId, participantUserIds } =
      findDirectMessageThreadActors(tables);
    const outsiderUserId = findUnprivilegedUserId(tables, participantUserIds);
    const now = new Date().toISOString();
    ensureRows(store.tables, 'mediaObjects').push(
      {
        id: 'med_direct_message_attachment',
        ownerUserId: senderUserId,
        kind: 'IMAGE',
        status: 'AVAILABLE',
        storageKey: 'test/direct-message/photo.jpg',
        bucketName: 'clubroom-private',
        contentType: 'image/jpeg',
        sizeBytes: 2048,
        originalFileName: 'touch-map.jpg',
        visibilityScope: 'private',
        consentRequired: false,
        createdByUserId: senderUserId,
        updatedByUserId: senderUserId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'med_direct_message_wrong_owner',
        ownerUserId: otherUserId,
        kind: 'IMAGE',
        status: 'AVAILABLE',
        storageKey: 'test/direct-message/wrong-owner.jpg',
        bucketName: 'clubroom-private',
        contentType: 'image/jpeg',
        sizeBytes: 2048,
        originalFileName: 'wrong-owner.jpg',
        visibilityScope: 'private',
        consentRequired: false,
        createdByUserId: otherUserId,
        updatedByUserId: otherUserId,
        createdAt: now,
        updatedAt: now,
      },
    );

    const unauthenticated = await app.inject({
      method: 'POST',
      url: `/v1/message-threads/${threadId}/messages`,
      payload: {
        body: 'Unauthenticated direct-message spoof',
        idempotencyKey: 'direct-message-unauth-test',
      },
    });
    assert.equal(unauthenticated.statusCode, 403);

    const deniedOutsider = await app.inject({
      method: 'POST',
      url: `/v1/message-threads/${threadId}/messages`,
      headers: authHeaders(tables, outsiderUserId),
      payload: {
        body: 'Outsider direct-message spoof',
        idempotencyKey: 'direct-message-outsider-deny',
      },
    });
    assert.equal(deniedOutsider.statusCode, 403);

    const deniedMedia = await app.inject({
      method: 'POST',
      url: `/v1/message-threads/${threadId}/messages`,
      headers: authHeaders(tables, senderUserId),
      payload: {
        body: 'Media must be proved before direct send',
        attachments: [{ mediaObjectId: 'med_unproved' }],
        idempotencyKey: 'direct-message-media-deny',
      },
    });
    assert.equal(deniedMedia.statusCode, 400);

    const deniedWrongOwnerMedia = await app.inject({
      method: 'POST',
      url: `/v1/message-threads/${threadId}/messages`,
      headers: authHeaders(tables, senderUserId),
      payload: {
        body: 'Wrong owner media must not attach',
        attachments: [{ mediaObjectId: 'med_direct_message_wrong_owner' }],
        idempotencyKey: 'direct-message-media-wrong-owner-deny',
      },
    });
    assert.equal(deniedWrongOwnerMedia.statusCode, 403);

    const createdMedia = await app.inject({
      method: 'POST',
      url: `/v1/message-threads/${threadId}/messages`,
      headers: authHeaders(tables, senderUserId),
      payload: {
        body: 'Backend-owned direct message with media proof',
        attachments: [{ mediaObjectId: 'med_direct_message_attachment', title: 'Touch map' }],
        idempotencyKey: 'direct-message-media-create-test',
      },
    });
    assert.equal(createdMedia.statusCode, 201);
    const createdMediaPayload = createdMedia.json() as {
      message: { attachmentsJson: Array<{ mediaObjectId: string; type: string; title: string }> };
    };
    assert.deepEqual(createdMediaPayload.message.attachmentsJson, [
      {
        id: 'med_direct_message_attachment',
        mediaObjectId: 'med_direct_message_attachment',
        type: 'photo',
        title: 'Touch map',
        subtitle: 'image/jpeg',
        contentType: 'image/jpeg',
        originalFileName: 'touch-map.jpg',
      },
    ]);

    const mediaIdempotencyConflict = await app.inject({
      method: 'POST',
      url: `/v1/message-threads/${threadId}/messages`,
      headers: authHeaders(tables, senderUserId),
      payload: {
        body: 'Backend-owned direct message with media proof',
        idempotencyKey: 'direct-message-media-create-test',
      },
    });
    assert.equal(mediaIdempotencyConflict.statusCode, 409);

    const created = await app.inject({
      method: 'POST',
      url: `/v1/message-threads/${threadId}/messages`,
      headers: authHeaders(tables, senderUserId),
      payload: {
        body: 'Backend-owned direct message',
        idempotencyKey: 'direct-message-create-test',
      },
    });
    assert.equal(created.statusCode, 201);
    const createdPayload = created.json() as {
      message: {
        id: string;
        messageThreadId: string;
        senderUserId: string;
        content: string;
        receipts: Array<{ userId: string; readAt: string | null }>;
      };
      thread: { id: string; messages: Array<{ id: string; content: string }> };
    };
    assert.equal(createdPayload.message.messageThreadId, threadId);
    assert.equal(createdPayload.message.senderUserId, senderUserId);
    assert.equal(createdPayload.message.content, 'Backend-owned direct message');
    assert.equal(
      createdPayload.message.receipts.some(
        (receipt) => receipt.userId === senderUserId && Boolean(receipt.readAt),
      ),
      true,
    );
    assert.equal(
      createdPayload.message.receipts.some((receipt) => receipt.userId === otherUserId),
      true,
    );

    const replayed = await app.inject({
      method: 'POST',
      url: `/v1/message-threads/${threadId}/messages`,
      headers: authHeaders(tables, senderUserId),
      payload: {
        body: 'Backend-owned direct message',
        idempotencyKey: 'direct-message-create-test',
      },
    });
    assert.equal(replayed.statusCode, 201);
    const replayedPayload = replayed.json() as { message: { id: string } };
    assert.equal(replayedPayload.message.id, createdPayload.message.id);

    const conflict = await app.inject({
      method: 'POST',
      url: `/v1/message-threads/${threadId}/messages`,
      headers: authHeaders(tables, senderUserId),
      payload: {
        body: 'Different body cannot reuse the key',
        idempotencyKey: 'direct-message-create-test',
      },
    });
    assert.equal(conflict.statusCode, 409);

    const listedForOther = await app.inject({
      method: 'GET',
      url: '/v1/message-threads',
      headers: authHeaders(tables, otherUserId),
    });
    assert.equal(listedForOther.statusCode, 200);
    const listedPayload = listedForOther.json() as {
      threads: Array<{ id: string; messages: Array<{ id: string; content: string }> }>;
    };
    assert.equal(
      listedPayload.threads.some(
        (thread) =>
          thread.id === threadId &&
          thread.messages.some((message) => message.id === createdPayload.message.id),
      ),
      true,
    );

    const deniedRead = await app.inject({
      method: 'POST',
      url: `/v1/message-threads/${threadId}/read`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(deniedRead.statusCode, 403);

    const markedRead = await app.inject({
      method: 'POST',
      url: `/v1/message-threads/${threadId}/read`,
      headers: authHeaders(tables, otherUserId),
    });
    assert.equal(markedRead.statusCode, 200);
    const readPayload = markedRead.json() as {
      thread: {
        participants: Array<{ userId: string; lastReadAt: string | null }>;
        messages: Array<{
          id: string;
          receipts: Array<{ userId: string; readAt: string | null }>;
        }>;
      };
    };
    const readMessage = readPayload.thread.messages.find(
      (message) => message.id === createdPayload.message.id,
    );
    assert.ok(readMessage, 'expected created direct message after marking read');
    assert.equal(
      readMessage.receipts.some(
        (receipt) => receipt.userId === otherUserId && Boolean(receipt.readAt),
      ),
      true,
    );
    assert.equal(
      readPayload.thread.participants.some(
        (participant) => participant.userId === otherUserId && Boolean(participant.lastReadAt),
      ),
      true,
    );

    const deniedDelete = await app.inject({
      method: 'DELETE',
      url: `/v1/messages/${createdPayload.message.id}`,
      headers: authHeaders(tables, otherUserId),
    });
    assert.equal(deniedDelete.statusCode, 403);

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/v1/messages/${createdPayload.message.id}`,
      headers: authHeaders(tables, senderUserId),
    });
    assert.equal(deleted.statusCode, 200);
    const deletedPayload = deleted.json() as {
      message: { id: string; content: string; deletedAt: string | null };
      thread: { messages: Array<{ id: string }> };
    };
    assert.equal(deletedPayload.message.id, createdPayload.message.id);
    assert.equal(deletedPayload.message.content, '[deleted]');
    assert.equal(Boolean(deletedPayload.message.deletedAt), true);
    assert.equal(
      deletedPayload.thread.messages.some((message) => message.id === createdPayload.message.id),
      false,
    );

    const repeatDelete = await app.inject({
      method: 'DELETE',
      url: `/v1/messages/${createdPayload.message.id}`,
      headers: authHeaders(tables, senderUserId),
    });
    assert.equal(repeatDelete.statusCode, 409);

    const liveTables = getMarketplaceSeedStore().tables;
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.thread-message.create',
        resourceId: threadId,
        result: 'DENY',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.thread-message.create',
        resourceId: createdPayload.message.id,
        result: 'SUCCESS',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.message.remove',
        resourceId: createdPayload.message.id,
        result: 'DENY',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.message.remove',
        resourceId: createdPayload.message.id,
        result: 'SUCCESS',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.thread-message.read',
        resourceId: threadId,
        result: 'DENY',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.thread-message.read',
        resourceId: threadId,
        result: 'SUCCESS',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.message.delete',
        resourceId: createdPayload.message.id,
      }).length,
      0,
    );
  });

  it('uses the db fixture repository seam for direct message writes and removes in db mode', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const tables = getDbFixtureStore().tables;
      const { threadId, senderUserId, otherUserId } = findDirectMessageThreadActors(tables);

      const created = await app.inject({
        method: 'POST',
        url: `/v1/message-threads/${threadId}/messages`,
        headers: authHeaders(tables, senderUserId),
        payload: {
          body: 'DB fixture direct message',
          idempotencyKey: 'direct-message-db-fixture-test',
        },
      });
      assert.equal(created.statusCode, 201);
      const createdPayload = created.json() as {
        message: { id: string; messageThreadId: string; senderUserId: string; content: string };
      };
      assert.equal(createdPayload.message.messageThreadId, threadId);
      assert.equal(createdPayload.message.senderUserId, senderUserId);

      const listed = await app.inject({
        method: 'GET',
        url: '/v1/message-threads',
        headers: authHeaders(tables, otherUserId),
      });
      assert.equal(listed.statusCode, 200);
      const listedPayload = listed.json() as {
        threads: Array<{ id: string; messages: Array<{ id: string; content: string }> }>;
      };
      assert.equal(
        listedPayload.threads.some(
          (thread) =>
            thread.id === threadId &&
            thread.messages.some((message) => message.id === createdPayload.message.id),
        ),
        true,
      );

      const markedRead = await app.inject({
        method: 'POST',
        url: `/v1/message-threads/${threadId}/read`,
        headers: authHeaders(tables, otherUserId),
      });
      assert.equal(markedRead.statusCode, 200);
      const readPayload = markedRead.json() as {
        thread: {
          messages: Array<{
            id: string;
            receipts: Array<{ userId: string; readAt: string | null }>;
          }>;
        };
      };
      const readMessage = readPayload.thread.messages.find(
        (message) => message.id === createdPayload.message.id,
      );
      assert.ok(readMessage, 'expected fixture direct message after marking read');
      assert.equal(
        readMessage.receipts.some(
          (receipt) => receipt.userId === otherUserId && Boolean(receipt.readAt),
        ),
        true,
      );

      const deleted = await app.inject({
        method: 'DELETE',
        url: `/v1/messages/${createdPayload.message.id}`,
        headers: authHeaders(tables, senderUserId),
      });
      assert.equal(deleted.statusCode, 200);
      const deletedPayload = deleted.json() as {
        message: { deletedAt: string | null; content: string };
        thread: { messages: Array<{ id: string }> };
      };
      assert.equal(Boolean(deletedPayload.message.deletedAt), true);
      assert.equal(deletedPayload.message.content, '[deleted]');
      assert.equal(
        deletedPayload.thread.messages.some((message) => message.id === createdPayload.message.id),
        false,
      );
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
    }
  });

  it('creates staff feed posts through backend authority', async () => {
    const tables = loadTables();
    const store = getMarketplaceSeedStore();
    const { clubId, staffUserId, staffRole, memberUserId, memberUserIds } =
      findClubPostActors(tables);
    const outsiderUserId = findUnprivilegedUserId(tables, memberUserIds);
    const now = new Date().toISOString();
    ensureRows(store.tables, 'mediaObjects').push(
      {
        id: 'med_staff_feed_attachment',
        ownerUserId: staffUserId,
        kind: 'IMAGE',
        status: 'AVAILABLE',
        storageKey: 'test/staff-feed/photo.jpg',
        bucketName: 'clubroom-private',
        contentType: 'image/jpeg',
        sizeBytes: 4096,
        originalFileName: 'training-update.jpg',
        visibilityScope: 'private',
        consentRequired: false,
        createdByUserId: staffUserId,
        updatedByUserId: staffUserId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'med_staff_feed_wrong_owner',
        ownerUserId: memberUserId,
        kind: 'IMAGE',
        status: 'AVAILABLE',
        storageKey: 'test/staff-feed/wrong-owner.jpg',
        bucketName: 'clubroom-private',
        contentType: 'image/jpeg',
        sizeBytes: 4096,
        originalFileName: 'wrong-owner.jpg',
        visibilityScope: 'private',
        consentRequired: false,
        createdByUserId: memberUserId,
        updatedByUserId: memberUserId,
        createdAt: now,
        updatedAt: now,
      },
    );

    const unauthenticated = await app.inject({
      method: 'POST',
      url: '/v1/posts',
      payload: {
        clubId,
        content: 'Unauthenticated local state should not create posts',
        idempotencyKey: 'staff-feed-post-unauth-test',
      },
    });
    assert.equal(unauthenticated.statusCode, 403);

    const deniedMember = await app.inject({
      method: 'POST',
      url: '/v1/posts',
      headers: authHeaders(tables, memberUserId, 'member'),
      payload: {
        clubId,
        content: 'Member top-level post spoof',
        idempotencyKey: 'staff-feed-post-member-deny',
      },
    });
    assert.equal(deniedMember.statusCode, 403);

    const deniedOutsider = await app.inject({
      method: 'POST',
      url: '/v1/posts',
      headers: authHeaders(tables, outsiderUserId),
      payload: {
        clubId,
        content: 'Outsider top-level post spoof',
        idempotencyKey: 'staff-feed-post-outsider-deny',
      },
    });
    assert.equal(deniedOutsider.statusCode, 403);

    const deniedMedia = await app.inject({
      method: 'POST',
      url: '/v1/posts',
      headers: authHeaders(tables, staffUserId, staffRole),
      payload: {
        clubId,
        content: 'Media must be proved before publishing',
        attachments: [{ mediaObjectId: 'med_unproved' }],
        idempotencyKey: 'staff-feed-post-media-deny',
      },
    });
    assert.equal(deniedMedia.statusCode, 400);

    const deniedWrongOwnerMedia = await app.inject({
      method: 'POST',
      url: '/v1/posts',
      headers: authHeaders(tables, staffUserId, staffRole),
      payload: {
        clubId,
        content: 'Wrong owner media must not publish',
        attachments: [{ mediaObjectId: 'med_staff_feed_wrong_owner' }],
        idempotencyKey: 'staff-feed-post-media-wrong-owner-deny',
      },
    });
    assert.equal(deniedWrongOwnerMedia.statusCode, 403);

    const created = await app.inject({
      method: 'POST',
      url: '/v1/posts',
      headers: authHeaders(tables, staffUserId, staffRole),
      payload: {
        clubId,
        content: 'Backend-owned staff update',
        visibility: 'CLUB',
        metadata: {
          title: 'Training update',
          postType: 'announcement',
          postAs: 'club',
          feedType: 'CLUB',
          audience: 'club',
          audienceLabel: 'Club-wide',
        },
        attachments: [{ mediaObjectId: 'med_staff_feed_attachment', title: 'Training photo' }],
        idempotencyKey: 'staff-feed-post-create-test',
      },
    });
    assert.equal(created.statusCode, 201);
    const createdPayload = created.json() as {
      post: {
        id: string;
        clubId: string;
        communityGroupId: string | null;
        authorUserId: string;
        content: string;
        visibility: string;
        attachmentsJson?: {
          title?: string;
          postType?: string;
          attachments?: Array<{ mediaObjectId: string; type: string; title: string }>;
        };
        commentsCount: number;
        reactionsCount: number;
      };
    };
    assert.equal(createdPayload.post.clubId, clubId);
    assert.equal(createdPayload.post.communityGroupId, null);
    assert.equal(createdPayload.post.authorUserId, staffUserId);
    assert.equal(createdPayload.post.content, 'Backend-owned staff update');
    assert.equal(createdPayload.post.visibility, 'CLUB');
    assert.equal(createdPayload.post.attachmentsJson?.title, 'Training update');
    assert.equal(createdPayload.post.attachmentsJson?.postType, 'announcement');
    assert.deepEqual(createdPayload.post.attachmentsJson?.attachments, [
      {
        id: 'med_staff_feed_attachment',
        mediaObjectId: 'med_staff_feed_attachment',
        type: 'photo',
        title: 'Training photo',
        subtitle: 'image/jpeg',
        contentType: 'image/jpeg',
        originalFileName: 'training-update.jpg',
      },
    ]);
    assert.equal(createdPayload.post.commentsCount, 0);
    assert.equal(createdPayload.post.reactionsCount, 0);

    const mediaIdempotencyConflict = await app.inject({
      method: 'POST',
      url: '/v1/posts',
      headers: authHeaders(tables, staffUserId, staffRole),
      payload: {
        clubId,
        content: 'Backend-owned staff update',
        visibility: 'CLUB',
        metadata: {
          title: 'Training update',
          postType: 'announcement',
          postAs: 'club',
          feedType: 'CLUB',
          audience: 'club',
          audienceLabel: 'Club-wide',
        },
        idempotencyKey: 'staff-feed-post-create-test',
      },
    });
    assert.equal(mediaIdempotencyConflict.statusCode, 409);

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/posts/${createdPayload.post.id}`,
      headers: authHeaders(tables, memberUserId, 'member'),
    });
    assert.equal(detail.statusCode, 200);
    const detailPayload = detail.json() as {
      post: {
        id: string;
        clubId: string;
        content: string;
        commentsCount: number;
        reactionsCount: number;
      };
    };
    assert.equal(detailPayload.post.id, createdPayload.post.id);
    assert.equal(detailPayload.post.clubId, clubId);
    assert.equal(detailPayload.post.content, 'Backend-owned staff update');
    assert.equal(detailPayload.post.commentsCount, 0);
    assert.equal(detailPayload.post.reactionsCount, 0);

    const feedLiveTables = getMarketplaceSeedStore().tables;
    const followCreatedAt = new Date().toISOString();
    ensureRows(feedLiveTables, 'userFollows').push({
      id: 'follow_member_staff_feed_test',
      followerUserId: memberUserId,
      followedUserId: staffUserId,
      followerType: 'USER',
      followingType: 'COACH',
      notifyOnPost: true,
      notifyOnSession: true,
      createdAt: followCreatedAt,
      updatedAt: followCreatedAt,
    });

    const followedPersonalPost = await app.inject({
      method: 'POST',
      url: '/v1/posts',
      headers: authHeaders(tables, staffUserId, staffRole),
      payload: {
        clubId,
        content: 'Followed coach personal update',
        visibility: 'CLUB',
        metadata: {
          title: 'Personal coach note',
          postType: 'general',
          postAs: 'self',
          feedType: 'PERSONAL',
          audience: 'club',
          audienceLabel: 'Personal Feed',
        },
        idempotencyKey: 'staff-feed-following-personal-post',
      },
    });
    assert.equal(followedPersonalPost.statusCode, 201);
    const followedPersonalPayload = followedPersonalPost.json() as {
      post: { id: string; authorUserId: string; attachmentsJson?: { feedType?: string } };
    };
    assert.equal(followedPersonalPayload.post.authorUserId, staffUserId);
    assert.equal(followedPersonalPayload.post.attachmentsJson?.feedType, 'PERSONAL');

    const followingFeed = await app.inject({
      method: 'GET',
      url: '/v1/posts?followingOnly=true',
      headers: authHeaders(tables, memberUserId, 'member'),
    });
    assert.equal(followingFeed.statusCode, 200);
    const followingFeedPayload = followingFeed.json() as { posts: Array<{ id: string }> };
    assert.equal(
      followingFeedPayload.posts.some((post) => post.id === followedPersonalPayload.post.id),
      true,
    );
    assert.equal(
      followingFeedPayload.posts.some((post) => post.id === createdPayload.post.id),
      false,
    );

    ensureRows(feedLiveTables, 'userBlocks').push({
      id: 'block_member_staff_feed_test',
      blockerUserId: memberUserId,
      blockedUserId: staffUserId,
      createdAt: followCreatedAt,
      updatedAt: followCreatedAt,
    });
    const blockedFollowingFeed = await app.inject({
      method: 'GET',
      url: '/v1/posts?followingOnly=true',
      headers: authHeaders(tables, memberUserId, 'member'),
    });
    assert.equal(blockedFollowingFeed.statusCode, 200);
    const blockedFollowingPayload = blockedFollowingFeed.json() as { posts: Array<{ id: string }> };
    assert.equal(
      blockedFollowingPayload.posts.some((post) => post.id === followedPersonalPayload.post.id),
      false,
    );

    const deniedPin = await app.inject({
      method: 'PATCH',
      url: `/v1/posts/${createdPayload.post.id}/pin`,
      headers: authHeaders(tables, memberUserId, 'member'),
      payload: { pinned: true },
    });
    assert.equal(deniedPin.statusCode, 403);

    const pinned = await app.inject({
      method: 'PATCH',
      url: `/v1/posts/${createdPayload.post.id}/pin`,
      headers: authHeaders(tables, staffUserId, staffRole),
      payload: { pinned: true },
    });
    assert.equal(pinned.statusCode, 200);
    const pinnedPayload = pinned.json() as {
      post: {
        id: string;
        attachmentsJson?: { isPinned?: boolean; pinnedBy?: string; pinnedAt?: string };
      };
    };
    assert.equal(pinnedPayload.post.id, createdPayload.post.id);
    assert.equal(pinnedPayload.post.attachmentsJson?.isPinned, true);
    assert.equal(pinnedPayload.post.attachmentsJson?.pinnedBy, staffUserId);
    assert.ok(pinnedPayload.post.attachmentsJson?.pinnedAt, 'expected pinned timestamp');

    const listedAfterPin = await app.inject({
      method: 'GET',
      url: `/v1/posts?clubId=${clubId}`,
      headers: authHeaders(tables, memberUserId, 'member'),
    });
    assert.equal(listedAfterPin.statusCode, 200);
    const listedAfterPinPayload = listedAfterPin.json() as {
      posts: Array<{ id: string; attachmentsJson?: { isPinned?: boolean } }>;
    };
    assert.equal(
      listedAfterPinPayload.posts.some(
        (post) => post.id === createdPayload.post.id && post.attachmentsJson?.isPinned === true,
      ),
      true,
    );

    const unpinned = await app.inject({
      method: 'PATCH',
      url: `/v1/posts/${createdPayload.post.id}/pin`,
      headers: authHeaders(tables, staffUserId, staffRole),
      payload: { pinned: false },
    });
    assert.equal(unpinned.statusCode, 200);
    const unpinnedPayload = unpinned.json() as {
      post: { attachmentsJson?: { isPinned?: boolean; pinnedBy?: string; pinnedAt?: string } };
    };
    assert.equal(unpinnedPayload.post.attachmentsJson?.isPinned, undefined);
    assert.equal(unpinnedPayload.post.attachmentsJson?.pinnedBy, undefined);
    assert.equal(unpinnedPayload.post.attachmentsJson?.pinnedAt, undefined);

    const deniedDetail = await app.inject({
      method: 'GET',
      url: `/v1/posts/${createdPayload.post.id}`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(deniedDetail.statusCode, 404);

    const deniedPostReaction = await app.inject({
      method: 'POST',
      url: `/v1/posts/${createdPayload.post.id}/reactions/toggle`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(deniedPostReaction.statusCode, 403);

    const likedPost = await app.inject({
      method: 'POST',
      url: `/v1/posts/${createdPayload.post.id}/reactions/toggle`,
      headers: authHeaders(tables, memberUserId, 'member'),
    });
    assert.equal(likedPost.statusCode, 200);
    const likedPostPayload = likedPost.json() as {
      post: { id: string; reactionsCount: number; likedByCurrentUser: boolean; likes: string[] };
    };
    assert.equal(likedPostPayload.post.id, createdPayload.post.id);
    assert.equal(likedPostPayload.post.reactionsCount, 1);
    assert.equal(likedPostPayload.post.likedByCurrentUser, true);
    assert.deepEqual(likedPostPayload.post.likes, [memberUserId]);

    const listedAfterPostLike = await app.inject({
      method: 'GET',
      url: `/v1/posts?clubId=${clubId}`,
      headers: authHeaders(tables, memberUserId, 'member'),
    });
    assert.equal(listedAfterPostLike.statusCode, 200);
    const listedAfterPostLikePayload = listedAfterPostLike.json() as {
      posts: Array<{ id: string; reactionsCount: number; likedByCurrentUser: boolean }>;
    };
    assert.equal(
      listedAfterPostLikePayload.posts.some(
        (post) =>
          post.id === createdPayload.post.id &&
          post.reactionsCount === 1 &&
          post.likedByCurrentUser === true,
      ),
      true,
    );

    const unlikedPost = await app.inject({
      method: 'POST',
      url: `/v1/posts/${createdPayload.post.id}/reactions/toggle`,
      headers: authHeaders(tables, memberUserId, 'member'),
    });
    assert.equal(unlikedPost.statusCode, 200);
    const unlikedPostPayload = unlikedPost.json() as {
      post: { id: string; reactionsCount: number; likedByCurrentUser: boolean; likes: string[] };
    };
    assert.equal(unlikedPostPayload.post.id, createdPayload.post.id);
    assert.equal(unlikedPostPayload.post.reactionsCount, 0);
    assert.equal(unlikedPostPayload.post.likedByCurrentUser, false);
    assert.deepEqual(unlikedPostPayload.post.likes, []);
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'community.post.pin.update',
        resourceId: createdPayload.post.id,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'community.post.pin.update',
        resourceId: createdPayload.post.id,
        result: 'SUCCESS',
      }).length,
      2,
    );

    const replayed = await app.inject({
      method: 'POST',
      url: '/v1/posts',
      headers: authHeaders(tables, staffUserId, staffRole),
      payload: {
        clubId,
        content: 'Backend-owned staff update',
        visibility: 'CLUB',
        metadata: {
          title: 'Training update',
          postType: 'announcement',
          postAs: 'club',
          feedType: 'CLUB',
          audience: 'club',
          audienceLabel: 'Club-wide',
        },
        attachments: [{ mediaObjectId: 'med_staff_feed_attachment', title: 'Training photo' }],
        idempotencyKey: 'staff-feed-post-create-test',
      },
    });
    assert.equal(replayed.statusCode, 201);
    const replayedPayload = replayed.json() as { post: { id: string } };
    assert.equal(replayedPayload.post.id, createdPayload.post.id);

    const conflict = await app.inject({
      method: 'POST',
      url: '/v1/posts',
      headers: authHeaders(tables, staffUserId, staffRole),
      payload: {
        clubId,
        content: 'Different post content cannot reuse the key',
        visibility: 'CLUB',
        metadata: {
          title: 'Training update',
          postType: 'announcement',
          postAs: 'club',
          feedType: 'CLUB',
          audience: 'club',
          audienceLabel: 'Club-wide',
        },
        idempotencyKey: 'staff-feed-post-create-test',
      },
    });
    assert.equal(conflict.statusCode, 409);

    const listedForMember = await app.inject({
      method: 'GET',
      url: '/v1/posts',
      headers: authHeaders(tables, memberUserId, 'member'),
    });
    assert.equal(listedForMember.statusCode, 200);
    const listedPayload = listedForMember.json() as {
      posts: Array<{ id: string; content: string }>;
    };
    assert.equal(
      listedPayload.posts.some(
        (post) =>
          post.id === createdPayload.post.id && post.content === 'Backend-owned staff update',
      ),
      true,
    );

    const liveTables = getMarketplaceSeedStore().tables;
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.post.create',
        resourceId: clubId,
        result: 'DENY',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.post.create',
        resourceId: createdPayload.post.id,
        result: 'SUCCESS',
      }).length >= 1,
      true,
    );
  });

  it('uses the db fixture repository seam for staff feed post writes in db mode', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const tables = getDbFixtureStore().tables;
      const { clubId, staffUserId, staffRole, memberUserId } = findClubPostActors(tables);

      const created = await app.inject({
        method: 'POST',
        url: '/v1/posts',
        headers: authHeaders(tables, staffUserId, staffRole),
        payload: {
          clubId,
          content: 'DB fixture staff post',
          visibility: 'CLUB',
          metadata: {
            title: 'DB fixture update',
            postType: 'announcement',
            postAs: 'club',
            feedType: 'CLUB',
            audience: 'club',
            audienceLabel: 'Club-wide',
          },
          idempotencyKey: 'staff-feed-post-db-fixture-test',
        },
      });
      assert.equal(created.statusCode, 201);
      const createdPayload = created.json() as {
        post: { id: string; clubId: string; authorUserId: string; content: string };
      };
      assert.equal(createdPayload.post.clubId, clubId);
      assert.equal(createdPayload.post.authorUserId, staffUserId);
      assert.equal(createdPayload.post.content, 'DB fixture staff post');

      const storedPost = asRows(getDbFixtureStore().tables.posts).find(
        (row) => asString(row.id) === createdPayload.post.id,
      );
      assert.equal(asString(storedPost?.authorUserId), staffUserId);
      assert.equal(asString(storedPost?.clubId), clubId);

      const listed = await app.inject({
        method: 'GET',
        url: '/v1/posts',
        headers: authHeaders(tables, memberUserId, 'member'),
      });
      assert.equal(listed.statusCode, 200);
      const listedPayload = listed.json() as { posts: Array<{ id: string; content: string }> };
      assert.equal(
        listedPayload.posts.some(
          (post) => post.id === createdPayload.post.id && post.content === 'DB fixture staff post',
        ),
        true,
      );
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
    }
  });

  it('mutates post comments through backend authority', async () => {
    const tables = loadTables();
    const post = asRows(tables.posts).find(
      (row) => Boolean(asString(row.id)) && Boolean(asString(row.communityGroupId)),
    );
    assert.ok(post, 'expected seeded community post');
    const postId = asString(post.id) as string;
    const groupId = asString(post.communityGroupId) as string;
    const clubId = asString(post.clubId);
    const memberUserIds = asRows(tables.communityGroupMemberships)
      .filter(
        (row) =>
          asString(row.communityGroupId) === groupId &&
          !asString(row.deletedAt) &&
          asString(row.userId),
      )
      .map((row) => asString(row.userId) as string);
    assert.equal(memberUserIds.length >= 2, true);
    const commenterUserId = memberUserIds[0] as string;
    const otherMemberUserId =
      memberUserIds.find((userId) => {
        if (userId === commenterUserId) {
          return false;
        }
        const roles = rolesForUser(tables, userId);
        return (
          !roles.includes('club_admin') &&
          !roles.includes('admin') &&
          !roles.includes('security_admin')
        );
      }) ?? (memberUserIds.find((userId) => userId !== commenterUserId) as string);
    const clubMemberUserIds = clubId
      ? asRows(tables.clubMemberships)
          .filter(
            (row) =>
              asString(row.clubId) === clubId && !asString(row.deletedAt) && asString(row.userId),
          )
          .map((row) => asString(row.userId) as string)
      : [];
    const outsiderUserId = findUnprivilegedUserId(
      tables,
      new Set([...memberUserIds, ...clubMemberUserIds, asString(post.authorUserId) ?? '']),
    );
    const adminUserId = findPrivilegedAdminUserId(tables, new Set([commenterUserId]));

    const unauthenticated = await app.inject({
      method: 'POST',
      url: `/v1/posts/${postId}/comments`,
      payload: {
        content: 'Unauthenticated local state should not create comments',
        idempotencyKey: 'post-comment-unauth-test',
      },
    });
    assert.equal(unauthenticated.statusCode, 403);

    const deniedCreate = await app.inject({
      method: 'POST',
      url: `/v1/posts/${postId}/comments`,
      headers: authHeaders(tables, outsiderUserId),
      payload: {
        content: 'Outsider comment spoof',
        idempotencyKey: 'post-comment-deny-test',
      },
    });
    assert.equal(deniedCreate.statusCode, 403);

    const created = await app.inject({
      method: 'POST',
      url: `/v1/posts/${postId}/comments`,
      headers: authHeaders(tables, commenterUserId),
      payload: {
        content: 'Backend-owned parent comment',
        idempotencyKey: 'post-comment-create-test',
      },
    });
    assert.equal(created.statusCode, 201);
    const createdPayload = created.json() as {
      comment: {
        id: string;
        postId: string;
        authorUserId: string;
        content: string;
        parentCommentId: string | null;
        author?: { id: string; name: string };
      };
    };
    assert.equal(createdPayload.comment.postId, postId);
    assert.equal(createdPayload.comment.authorUserId, commenterUserId);
    assert.equal(createdPayload.comment.content, 'Backend-owned parent comment');
    assert.equal(createdPayload.comment.parentCommentId, null);
    assert.equal(createdPayload.comment.author?.id, commenterUserId);

    const replayed = await app.inject({
      method: 'POST',
      url: `/v1/posts/${postId}/comments`,
      headers: authHeaders(tables, commenterUserId),
      payload: {
        content: 'Backend-owned parent comment',
        idempotencyKey: 'post-comment-create-test',
      },
    });
    assert.equal(replayed.statusCode, 201);
    const replayedPayload = replayed.json() as { comment: { id: string } };
    assert.equal(replayedPayload.comment.id, createdPayload.comment.id);

    const idempotencyConflict = await app.inject({
      method: 'POST',
      url: `/v1/posts/${postId}/comments`,
      headers: authHeaders(tables, commenterUserId),
      payload: {
        content: 'Different content cannot reuse the key',
        idempotencyKey: 'post-comment-create-test',
      },
    });
    assert.equal(idempotencyConflict.statusCode, 409);

    const deniedReaction = await app.inject({
      method: 'POST',
      url: `/v1/comments/${createdPayload.comment.id}/reactions/toggle`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(deniedReaction.statusCode, 403);

    const liked = await app.inject({
      method: 'POST',
      url: `/v1/comments/${createdPayload.comment.id}/reactions/toggle`,
      headers: authHeaders(tables, commenterUserId),
    });
    assert.equal(liked.statusCode, 200);
    const likedPayload = liked.json() as {
      comment: {
        id: string;
        likesCount: number;
        likedByCurrentUser: boolean;
        likes: string[];
      };
    };
    assert.equal(likedPayload.comment.id, createdPayload.comment.id);
    assert.equal(likedPayload.comment.likesCount, 1);
    assert.equal(likedPayload.comment.likedByCurrentUser, true);
    assert.deepEqual(likedPayload.comment.likes, [commenterUserId]);

    const listedAfterLike = await app.inject({
      method: 'GET',
      url: `/v1/posts/${postId}/comments`,
      headers: authHeaders(tables, commenterUserId),
    });
    assert.equal(listedAfterLike.statusCode, 200);
    const listedAfterLikePayload = listedAfterLike.json() as {
      comments: Array<{ id: string; likesCount: number; likedByCurrentUser: boolean }>;
    };
    assert.equal(
      listedAfterLikePayload.comments.some(
        (comment) =>
          comment.id === createdPayload.comment.id &&
          comment.likesCount === 1 &&
          comment.likedByCurrentUser === true,
      ),
      true,
    );

    const unliked = await app.inject({
      method: 'POST',
      url: `/v1/comments/${createdPayload.comment.id}/reactions/toggle`,
      headers: authHeaders(tables, commenterUserId),
    });
    assert.equal(unliked.statusCode, 200);
    const unlikedPayload = unliked.json() as {
      comment: { id: string; likesCount: number; likedByCurrentUser: boolean; likes: string[] };
    };
    assert.equal(unlikedPayload.comment.id, createdPayload.comment.id);
    assert.equal(unlikedPayload.comment.likesCount, 0);
    assert.equal(unlikedPayload.comment.likedByCurrentUser, false);
    assert.deepEqual(unlikedPayload.comment.likes, []);

    const reply = await app.inject({
      method: 'POST',
      url: `/v1/posts/${postId}/comments`,
      headers: authHeaders(tables, otherMemberUserId),
      payload: {
        content: 'Backend-owned reply',
        parentCommentId: createdPayload.comment.id,
        idempotencyKey: 'post-comment-reply-test',
      },
    });
    assert.equal(reply.statusCode, 201);
    const replyPayload = reply.json() as {
      comment: { id: string; authorUserId: string; parentCommentId: string | null };
    };
    assert.equal(replyPayload.comment.authorUserId, otherMemberUserId);
    assert.equal(replyPayload.comment.parentCommentId, createdPayload.comment.id);

    const replyToReply = await app.inject({
      method: 'POST',
      url: `/v1/posts/${postId}/comments`,
      headers: authHeaders(tables, commenterUserId),
      payload: {
        content: 'Nested replies are not supported',
        parentCommentId: replyPayload.comment.id,
        idempotencyKey: 'post-comment-deep-reply-test',
      },
    });
    assert.equal(replyToReply.statusCode, 400);

    const listed = await app.inject({
      method: 'GET',
      url: `/v1/posts/${postId}/comments`,
      headers: authHeaders(tables, commenterUserId),
    });
    assert.equal(listed.statusCode, 200);
    const listedPayload = listed.json() as {
      comments: Array<{ id: string; content: string; parentCommentId: string | null }>;
    };
    assert.equal(
      listedPayload.comments.some(
        (comment) =>
          comment.id === replyPayload.comment.id &&
          comment.parentCommentId === createdPayload.comment.id,
      ),
      true,
    );

    const deniedDelete = await app.inject({
      method: 'DELETE',
      url: `/v1/comments/${createdPayload.comment.id}`,
      headers: authHeaders(tables, otherMemberUserId),
    });
    assert.equal(deniedDelete.statusCode, 403);

    const adminOwned = await app.inject({
      method: 'POST',
      url: `/v1/posts/${postId}/comments`,
      headers: authHeaders(tables, commenterUserId),
      payload: {
        content: 'Admin can remove this if needed',
        idempotencyKey: 'post-comment-admin-delete-test',
      },
    });
    assert.equal(adminOwned.statusCode, 201);
    const adminOwnedPayload = adminOwned.json() as { comment: { id: string } };

    const adminDeleted = await app.inject({
      method: 'DELETE',
      url: `/v1/comments/${adminOwnedPayload.comment.id}`,
      headers: authHeaders(tables, adminUserId),
    });
    assert.equal(adminDeleted.statusCode, 200);
    const adminDeletedPayload = adminDeleted.json() as {
      comment: { id: string; isDeleted: boolean; content: string };
    };
    assert.equal(adminDeletedPayload.comment.id, adminOwnedPayload.comment.id);
    assert.equal(adminDeletedPayload.comment.isDeleted, true);
    assert.equal(adminDeletedPayload.comment.content, '[deleted]');

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/v1/comments/${createdPayload.comment.id}`,
      headers: authHeaders(tables, commenterUserId),
    });
    assert.equal(deleted.statusCode, 200);
    const deletedPayload = deleted.json() as {
      comment: { id: string; isDeleted: boolean; deletedAt: string | null; content: string };
    };
    assert.equal(deletedPayload.comment.id, createdPayload.comment.id);
    assert.equal(deletedPayload.comment.isDeleted, true);
    assert.equal(Boolean(deletedPayload.comment.deletedAt), true);
    assert.equal(deletedPayload.comment.content, '[deleted]');

    const repeatDelete = await app.inject({
      method: 'DELETE',
      url: `/v1/comments/${createdPayload.comment.id}`,
      headers: authHeaders(tables, commenterUserId),
    });
    assert.equal(repeatDelete.statusCode, 409);

    const deletedReaction = await app.inject({
      method: 'POST',
      url: `/v1/comments/${createdPayload.comment.id}/reactions/toggle`,
      headers: authHeaders(tables, commenterUserId),
    });
    assert.equal(deletedReaction.statusCode, 400);

    const listedAfterDelete = await app.inject({
      method: 'GET',
      url: `/v1/posts/${postId}/comments`,
      headers: authHeaders(tables, commenterUserId),
    });
    assert.equal(listedAfterDelete.statusCode, 200);
    const listedAfterDeletePayload = listedAfterDelete.json() as {
      comments: Array<{ id: string; isDeleted: boolean; content: string }>;
    };
    assert.equal(
      listedAfterDeletePayload.comments.some(
        (comment) =>
          comment.id === createdPayload.comment.id &&
          comment.isDeleted === true &&
          comment.content === '[deleted]',
      ),
      true,
    );

    const liveTables = getMarketplaceSeedStore().tables;
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.comment.create',
        resourceId: postId,
        result: 'DENY',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.comment.remove',
        resourceId: createdPayload.comment.id,
        result: 'DENY',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.comment.remove',
        resourceId: createdPayload.comment.id,
        result: 'SUCCESS',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.comment.delete',
        resourceId: createdPayload.comment.id,
      }).length,
      0,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.comment.reaction.toggle',
        resourceId: createdPayload.comment.id,
        result: 'SUCCESS',
      }).length >= 1,
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'community.comment.reaction.toggle',
        resourceId: createdPayload.comment.id,
        result: 'DENY',
      }).length >= 1,
      true,
    );
  });

  it('uses the db fixture repository seam for post comment writes in db mode', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const tables = getDbFixtureStore().tables;
      const post = asRows(tables.posts).find(
        (row) => Boolean(asString(row.id)) && Boolean(asString(row.communityGroupId)),
      );
      assert.ok(post, 'expected db-fixture post');
      const postId = asString(post.id) as string;
      const groupId = asString(post.communityGroupId) as string;
      const commenterUserId = asString(
        asRows(tables.communityGroupMemberships).find(
          (row) => asString(row.communityGroupId) === groupId && !asString(row.deletedAt),
        )?.userId,
      ) as string;
      const clubId = asString(post.clubId);
      const memberUserIds = asRows(tables.communityGroupMemberships)
        .filter(
          (row) =>
            asString(row.communityGroupId) === groupId &&
            !asString(row.deletedAt) &&
            asString(row.userId),
        )
        .map((row) => asString(row.userId) as string);
      const clubMemberUserIds = clubId
        ? asRows(tables.clubMemberships)
            .filter(
              (row) =>
                asString(row.clubId) === clubId && !asString(row.deletedAt) && asString(row.userId),
            )
            .map((row) => asString(row.userId) as string)
        : [];
      const outsiderUserId = findUnprivilegedUserId(
        tables,
        new Set([...memberUserIds, ...clubMemberUserIds, asString(post.authorUserId) ?? '']),
      );

      const created = await app.inject({
        method: 'POST',
        url: `/v1/posts/${postId}/comments`,
        headers: authHeaders(tables, commenterUserId),
        payload: {
          content: 'DB fixture post comment',
          idempotencyKey: 'post-comment-db-fixture-test',
        },
      });
      assert.equal(created.statusCode, 201);
      const createdPayload = created.json() as {
        comment: { id: string; content: string; authorUserId: string };
      };
      assert.equal(createdPayload.comment.content, 'DB fixture post comment');
      assert.equal(createdPayload.comment.authorUserId, commenterUserId);

      const deniedReaction = await app.inject({
        method: 'POST',
        url: `/v1/comments/${createdPayload.comment.id}/reactions/toggle`,
        headers: authHeaders(tables, outsiderUserId),
      });
      assert.equal(deniedReaction.statusCode, 403);

      const liked = await app.inject({
        method: 'POST',
        url: `/v1/comments/${createdPayload.comment.id}/reactions/toggle`,
        headers: authHeaders(tables, commenterUserId),
      });
      assert.equal(liked.statusCode, 200);
      const likedPayload = liked.json() as {
        comment: { likesCount: number; likedByCurrentUser: boolean; likes: string[] };
      };
      assert.equal(likedPayload.comment.likesCount, 1);
      assert.equal(likedPayload.comment.likedByCurrentUser, true);
      assert.deepEqual(likedPayload.comment.likes, [commenterUserId]);

      const unliked = await app.inject({
        method: 'POST',
        url: `/v1/comments/${createdPayload.comment.id}/reactions/toggle`,
        headers: authHeaders(tables, commenterUserId),
      });
      assert.equal(unliked.statusCode, 200);
      const unlikedPayload = unliked.json() as {
        comment: { likesCount: number; likedByCurrentUser: boolean; likes: string[] };
      };
      assert.equal(unlikedPayload.comment.likesCount, 0);
      assert.equal(unlikedPayload.comment.likedByCurrentUser, false);
      assert.deepEqual(unlikedPayload.comment.likes, []);

      const listed = await app.inject({
        method: 'GET',
        url: `/v1/posts/${postId}/comments`,
        headers: authHeaders(tables, commenterUserId),
      });
      assert.equal(listed.statusCode, 200);
      const listedPayload = listed.json() as {
        comments: Array<{ id: string; content: string }>;
      };
      assert.equal(
        listedPayload.comments.some((comment) => comment.id === createdPayload.comment.id),
        true,
      );

      const deleted = await app.inject({
        method: 'DELETE',
        url: `/v1/comments/${createdPayload.comment.id}`,
        headers: authHeaders(tables, commenterUserId),
      });
      assert.equal(deleted.statusCode, 200);
      const deletedPayload = deleted.json() as { comment: { isDeleted: boolean; content: string } };
      assert.equal(deletedPayload.comment.isDeleted, true);
      assert.equal(deletedPayload.comment.content, '[deleted]');

      const deletedReaction = await app.inject({
        method: 'POST',
        url: `/v1/comments/${createdPayload.comment.id}/reactions/toggle`,
        headers: authHeaders(tables, commenterUserId),
      });
      assert.equal(deletedReaction.statusCode, 400);
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
    }
  });

  it('denies outsider access to unrelated video detail', async () => {
    const tables = loadTables();
    const video = asRows(tables.videos).find(
      (row) => Boolean(asString(row.id)) && Boolean(asString(row.athleteId)),
    );
    assert.ok(video, 'expected seeded video with athlete relationship');
    const athleteId = asString(video.athleteId) as string;
    const athleteUserId = asString(
      asRows(tables.athletes).find(
        (row) => asString(row.id) === athleteId && !asString(row.deletedAt),
      )?.userId,
    );
    const relatedUserIds = new Set(
      [
        asString(video.coachUserId),
        asString(video.createdByUserId),
        asString(video.updatedByUserId),
        athleteUserId,
        ...asRows(tables.guardianChildLinks)
          .filter((row) => asString(row.athleteId) === athleteId && !asString(row.deletedAt))
          .map((row) => asString(row.guardianUserId)),
      ].filter((userId): userId is string => Boolean(userId)),
    );
    const outsiderUserId = findUnprivilegedUserId(tables, relatedUserIds);

    const denied = await app.inject({
      method: 'GET',
      url: `/v1/videos/${asString(video.id)}`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(denied.statusCode, 403);
  });

  it('keeps athlete family access closed until the coach explicitly shares a video', async () => {
    await withStorageEnv(async () => {
      const tables = loadTables();
      const video = asRows(tables.videos).find(
        (row) => Boolean(asString(row.id)) && Boolean(asString(row.athleteId)),
      );
      assert.ok(video, 'expected seeded video with athlete relationship');
      const videoId = asString(video.id) as string;
      const athleteId = asString(video.athleteId) as string;
      const coachUserId = asString(video.coachUserId) as string;
      const guardianUserId = asString(
        asRows(tables.guardianChildLinks).find(
          (row) => asString(row.athleteId) === athleteId && !asString(row.deletedAt),
        )?.guardianUserId,
      ) as string;
      assert.ok(guardianUserId, 'expected guardian linked to seeded athlete');

      const denied = await app.inject({
        method: 'GET',
        url: `/v1/videos/${videoId}`,
        headers: authHeaders(tables, guardianUserId, 'parent'),
      });
      assert.equal(denied.statusCode, 403);

      const shared = await app.inject({
        method: 'PATCH',
        url: `/v1/videos/${videoId}/share`,
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: {
          visibility: 'SHARED',
        },
      });
      assert.equal(shared.statusCode, 200);
      const sharedPayload = shared.json() as {
        video: { sharedWithUserIds: string[]; visibility: string };
      };
      assert.equal(sharedPayload.video.visibility, 'SHARED');
      assert.equal(sharedPayload.video.sharedWithUserIds.includes(guardianUserId), true);

      const allowed = await app.inject({
        method: 'GET',
        url: `/v1/videos/${videoId}`,
        headers: authHeaders(tables, guardianUserId, 'parent'),
      });
      assert.equal(allowed.statusCode, 200);
    });
  });

  it('denies outsider access to private community group posts', async () => {
    const tables = loadTables();
    const group = asRows(tables.communityGroups)[0];
    assert.ok(group, 'expected seeded community group');
    const groupId = asString(group.id) as string;
    const memberUserIds = new Set(
      asRows(tables.communityGroupMemberships)
        .filter(
          (row) =>
            asString(row.communityGroupId) === groupId &&
            !asString(row.deletedAt) &&
            asString(row.userId),
        )
        .map((row) => asString(row.userId) as string),
    );
    const outsiderUserId = findUnprivilegedUserId(tables, memberUserIds);

    const denied = await app.inject({
      method: 'GET',
      url: `/v1/posts?communityGroupId=${groupId}`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(denied.statusCode, 403);
  });

  it('denies outsider access to private club posts', async () => {
    const tables = loadTables();
    const clubPost = asRows(tables.posts).find((row) => Boolean(asString(row.clubId)));
    assert.ok(clubPost, 'expected seeded club post');
    const clubId = asString(clubPost.clubId) as string;
    const memberUserIds = new Set(
      asRows(tables.clubMemberships)
        .filter(
          (row) =>
            asString(row.clubId) === clubId &&
            row.active !== false &&
            !asString(row.deletedAt) &&
            asString(row.userId),
        )
        .map((row) => asString(row.userId) as string),
    );
    const outsiderUserId = findUnprivilegedUserId(tables, memberUserIds);

    const denied = await app.inject({
      method: 'GET',
      url: `/v1/posts?clubId=${clubId}`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(denied.statusCode, 403);
  });

  it('creates signed upload targets through the db-backed runtime', async () => {
    const tables = loadTables();
    const drillAuthorId = asString(asRows(tables.drills)[0]?.authorUserId) as string;
    const previousBackend = env.API_DATA_BACKEND;
    const previousEndpoint = env.S3_ENDPOINT;
    const previousBucket = env.S3_BUCKET_PRIVATE;
    const previousRegion = env.S3_REGION;
    const previousAccessKey = env.S3_ACCESS_KEY_ID;
    const previousSecret = env.S3_SECRET_ACCESS_KEY;

    env.API_DATA_BACKEND = 'db';
    env.S3_ENDPOINT = 'https://storage.clubroom.test';
    env.S3_BUCKET_PRIVATE = 'clubroom-private';
    env.S3_REGION = 'eu-west-2';
    env.S3_ACCESS_KEY_ID = 'clubroom-access';
    env.S3_SECRET_ACCESS_KEY = 'clubroom-secret';

    try {
      const uploadInit = await app.inject({
        method: 'POST',
        url: '/v1/uploads/init',
        headers: authHeaders(tables, drillAuthorId, 'coach'),
        payload: {
          kind: 'VIDEO',
          contentType: 'video/mp4',
          fileName: '../session-demo.mp4',
          sizeBytes: 1_200_000,
          metadata: { source: 'db-fixture' },
        },
      });

      assert.equal(uploadInit.statusCode, 201);
      const payload = uploadInit.json() as {
        uploadSessionId: string;
        mediaObjectId: string;
        uploadMethod: string;
        uploadUrl: string;
        uploadHeaders: Record<string, string>;
        storageKey: string;
      };
      assert.equal(payload.uploadMethod, 'PUT');
      assert.match(payload.uploadSessionId, /^ups_/);
      assert.match(payload.mediaObjectId, /^med_/);
      assert.equal(payload.uploadHeaders['content-type'], 'video/mp4');

      const uploadUrl = new URL(payload.uploadUrl);
      assert.equal(uploadUrl.origin, 'https://storage.clubroom.test');
      assert.equal(uploadUrl.pathname.startsWith('/clubroom-private/uploads/'), true);
      assert.equal(uploadUrl.searchParams.get('X-Amz-Algorithm'), 'AWS4-HMAC-SHA256');
      assert.equal(Boolean(uploadUrl.searchParams.get('X-Amz-Signature')), true);
      assert.equal(payload.storageKey.includes('../'), false);

      const fixtureTables = getDbFixtureStore().tables;
      const uploadSession = asRows(fixtureTables.uploadSessions).find(
        (row) => asString(row.id) === payload.uploadSessionId,
      );
      const mediaObject = asRows(fixtureTables.mediaObjects).find(
        (row) => asString(row.id) === payload.mediaObjectId,
      );
      const pendingScan = asRows(fixtureTables.malwareScanResults).find(
        (row) => asString(row.mediaObjectId) === payload.mediaObjectId,
      );
      assert.ok(uploadSession);
      assert.ok(mediaObject);
      assert.equal(asString(mediaObject?.status), 'PENDING_UPLOAD');
      assert.equal(asString(pendingScan?.verdict) ?? asString(pendingScan?.status), 'PENDING');
      assert.equal(asString(pendingScan?.scanner) ?? asString(pendingScan?.engine), 'upload-init');
      assert.equal(
        auditEventsFor(fixtureTables, {
          action: 'upload.init',
          resourceId: payload.mediaObjectId,
          result: 'SUCCESS',
        }).length,
        1,
      );
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      env.S3_ENDPOINT = previousEndpoint;
      env.S3_BUCKET_PRIVATE = previousBucket;
      env.S3_REGION = previousRegion;
      env.S3_ACCESS_KEY_ID = previousAccessKey;
      env.S3_SECRET_ACCESS_KEY = previousSecret;
      resetDbFixtureStoreForTests();
    }
  });

  it('creates db-backed videos and mutates annotations through `/v1/videos*`', async () => {
    const tables = loadTables();
    const coachUserId = asString(asRows(tables.drills)[0]?.authorUserId) as string;
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      await withStorageEnv(async () => {
        const uploadInit = await app.inject({
          method: 'POST',
          url: '/v1/uploads/init',
          headers: authHeaders(tables, coachUserId, 'coach'),
          payload: {
            kind: 'VIDEO',
            contentType: 'video/mp4',
            fileName: 'technical-review.mp4',
            sizeBytes: 2_400_000,
          },
        });
        assert.equal(uploadInit.statusCode, 201);
        const uploadPayload = uploadInit.json() as {
          uploadSessionId: string;
          mediaObjectId: string;
        };

        const premature = await app.inject({
          method: 'POST',
          url: '/v1/videos',
          headers: authHeaders(tables, coachUserId, 'coach'),
          payload: {
            mediaObjectId: uploadPayload.mediaObjectId,
            title: 'Too Early',
            durationSeconds: 92,
          },
        });
        assert.equal(premature.statusCode, 400);
        assert.match(premature.body, /finalized and pass malware scanning/i);
        assert.equal(
          auditEventsFor(getDbFixtureStore().tables, {
            action: 'video.create',
            resourceId: uploadPayload.mediaObjectId,
            result: 'DENY',
          }).length,
          1,
        );

        const missingScanComplete = await app.inject({
          method: 'POST',
          url: `/v1/uploads/${uploadPayload.uploadSessionId}/complete`,
          headers: authHeaders(tables, coachUserId, 'coach'),
          payload: {
            mediaObjectId: uploadPayload.mediaObjectId,
          },
        });
        assert.equal(missingScanComplete.statusCode, 400);
        assert.match(missingScanComplete.body, /malware scanning did not pass/i);

        let fixtureTables = getDbFixtureStore().tables;
        let uploadSession = asRows(fixtureTables.uploadSessions).find(
          (row) => asString(row.id) === uploadPayload.uploadSessionId,
        );
        let mediaObject = asRows(fixtureTables.mediaObjects).find(
          (row) => asString(row.id) === uploadPayload.mediaObjectId,
        );
        assert.equal(asString(uploadSession?.status), 'INITIATED');
        assert.equal(asString(mediaObject?.status), 'PENDING_UPLOAD');

        await recordUploadMalwareScanResult({
          uploadSessionId: uploadPayload.uploadSessionId,
          mediaObjectId: uploadPayload.mediaObjectId,
          verdict: 'CLEAN',
          scanner: 'test-clean-scanner',
          scannedAt: '2030-01-01T10:00:00.000Z',
          details: {
            source: 'route_test_seed',
          },
        });

        const finalized = await app.inject({
          method: 'POST',
          url: `/v1/uploads/${uploadPayload.uploadSessionId}/complete`,
          headers: authHeaders(tables, coachUserId, 'coach'),
          payload: {
            mediaObjectId: uploadPayload.mediaObjectId,
          },
        });
        assert.equal(finalized.statusCode, 200);
        const finalizedPayload = finalized.json() as {
          mediaStatus: string;
          scanVerdict: string;
          scanner: string;
        };
        assert.equal(finalizedPayload.mediaStatus, 'AVAILABLE');
        assert.equal(finalizedPayload.scanVerdict, 'CLEAN');
        assert.equal(finalizedPayload.scanner, 'test-clean-scanner');

        fixtureTables = getDbFixtureStore().tables;
        uploadSession = asRows(fixtureTables.uploadSessions).find(
          (row) => asString(row.id) === uploadPayload.uploadSessionId,
        );
        mediaObject = asRows(fixtureTables.mediaObjects).find(
          (row) => asString(row.id) === uploadPayload.mediaObjectId,
        );
        const malwareScan = asRows(fixtureTables.malwareScanResults).find(
          (row) =>
            asString(row.mediaObjectId) === uploadPayload.mediaObjectId &&
            asString(row.scanner) === 'test-clean-scanner',
        );
        assert.equal(asString(uploadSession?.status), 'COMPLETED');
        assert.ok(asString(uploadSession?.completedAt), 'expected upload completion timestamp');
        assert.equal(asString(mediaObject?.status), 'AVAILABLE');
        assert.equal(asString(malwareScan?.verdict) ?? asString(malwareScan?.status), 'CLEAN');
        assert.equal(
          auditEventsFor(fixtureTables, {
            action: 'upload.complete',
            resourceId: uploadPayload.mediaObjectId,
            result: 'SUCCESS',
          }).length,
          1,
        );

        const created = await app.inject({
          method: 'POST',
          url: '/v1/videos',
          headers: authHeaders(tables, coachUserId, 'coach'),
          payload: {
            mediaObjectId: uploadPayload.mediaObjectId,
            title: 'Technical Review',
            description: 'Created in db mode',
            durationSeconds: 92,
          },
        });
        assert.equal(created.statusCode, 201);
        const createdPayload = created.json() as {
          video: { id: string; title: string; uploadStatus: string };
        };
        assert.equal(createdPayload.video.title, 'Technical Review');
        assert.equal(createdPayload.video.uploadStatus, 'READY');

        const annotation = await app.inject({
          method: 'POST',
          url: `/v1/videos/${createdPayload.video.id}/annotations`,
          headers: authHeaders(tables, coachUserId, 'coach'),
          payload: {
            timestamp: 12,
            label: 'Footwork',
            note: 'Open up earlier',
            type: 'TECHNIQUE',
          },
        });
        assert.equal(annotation.statusCode, 201);
        const annotationPayload = annotation.json() as {
          annotation: { id: string; label: string; note?: string; type: string };
        };
        assert.equal(annotationPayload.annotation.label, 'Footwork');
        assert.equal(annotationPayload.annotation.note, 'Open up earlier');
        assert.equal(annotationPayload.annotation.type, 'TECHNIQUE');

        const detail = await app.inject({
          method: 'GET',
          url: `/v1/videos/${createdPayload.video.id}`,
          headers: authHeaders(tables, coachUserId, 'coach'),
        });
        assert.equal(detail.statusCode, 200);
        const detailPayload = detail.json() as { video: { annotations: Array<{ label: string }> } };
        assert.equal(detailPayload.video.annotations[0]?.label, 'Footwork');

        const archivedAnnotation = await app.inject({
          method: 'DELETE',
          url: `/v1/videos/${createdPayload.video.id}/annotations/${annotationPayload.annotation.id}`,
          headers: authHeaders(tables, coachUserId, 'coach'),
        });
        assert.equal(archivedAnnotation.statusCode, 204);

        const archivedVideo = await app.inject({
          method: 'DELETE',
          url: `/v1/videos/${createdPayload.video.id}`,
          headers: authHeaders(tables, coachUserId, 'coach'),
        });
        assert.equal(archivedVideo.statusCode, 204);

        assert.equal(
          auditEventsFor(fixtureTables, {
            action: 'video.annotation.archive',
            resourceId: annotationPayload.annotation.id,
            result: 'SUCCESS',
          }).length,
          1,
        );
        assert.equal(
          auditEventsFor(fixtureTables, {
            action: 'video.archive',
            resourceId: createdPayload.video.id,
            result: 'SUCCESS',
          }).length,
          1,
        );
        assert.equal(
          auditEventsFor(fixtureTables, {
            action: 'video.annotation.delete',
            resourceId: annotationPayload.annotation.id,
          }).length,
          0,
        );
        assert.equal(
          auditEventsFor(fixtureTables, {
            action: 'video.delete',
            resourceId: createdPayload.video.id,
          }).length,
          0,
        );
      });
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
    }
  });

  it('rejects upload completion and video creation from unsafe media state', async () => {
    const tables = loadTables();
    const coachUserId = asString(asRows(tables.drills)[0]?.authorUserId) as string;
    const outsiderUserId = findUnprivilegedUserId(tables, new Set([coachUserId]));
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      await withStorageEnv(async () => {
        const uploadInit = await app.inject({
          method: 'POST',
          url: '/v1/uploads/init',
          headers: authHeaders(tables, coachUserId, 'coach'),
          payload: {
            kind: 'VIDEO',
            contentType: 'video/mp4',
            fileName: 'unsafe-video.mp4',
            sizeBytes: 2_400_000,
          },
        });
        assert.equal(uploadInit.statusCode, 201);
        const uploadPayload = uploadInit.json() as {
          uploadSessionId: string;
          mediaObjectId: string;
        };

        const outsiderComplete = await app.inject({
          method: 'POST',
          url: `/v1/uploads/${uploadPayload.uploadSessionId}/complete`,
          headers: authHeaders(tables, outsiderUserId, 'parent'),
          payload: {
            mediaObjectId: uploadPayload.mediaObjectId,
          },
        });
        assert.equal(outsiderComplete.statusCode, 403);
        assert.equal(
          auditEventsFor(getDbFixtureStore().tables, {
            action: 'upload.complete',
            resourceId: uploadPayload.mediaObjectId,
            result: 'DENY',
          }).length,
          1,
        );

        const fixtureTables = getDbFixtureStore().tables;
        const mediaObject = asRows(fixtureTables.mediaObjects).find(
          (row) => asString(row.id) === uploadPayload.mediaObjectId,
        );
        assert.ok(mediaObject, 'expected media object created by upload init');
        mediaObject.status = 'QUARANTINED';
        await recordUploadMalwareScanResult({
          uploadSessionId: uploadPayload.uploadSessionId,
          mediaObjectId: uploadPayload.mediaObjectId,
          verdict: 'INFECTED',
          scanner: 'test-scanner',
          scannedAt: new Date().toISOString(),
          details: {
            source: 'route_test_seed',
          },
        });

        const unsafeVideo = await app.inject({
          method: 'POST',
          url: '/v1/videos',
          headers: authHeaders(tables, coachUserId, 'coach'),
          payload: {
            mediaObjectId: uploadPayload.mediaObjectId,
            title: 'Unsafe media',
          },
        });
        assert.equal(unsafeVideo.statusCode, 400);
        assert.match(unsafeVideo.body, /finalized and pass malware scanning/i);
      });
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
    }
  });

  it('returns 503 for db-backed uploads when object storage config is missing', async () => {
    const tables = loadTables();
    const drillAuthorId = asString(asRows(tables.drills)[0]?.authorUserId) as string;
    const previousBackend = env.API_DATA_BACKEND;
    const previousEndpoint = env.S3_ENDPOINT;
    const previousBucket = env.S3_BUCKET_PRIVATE;
    const previousRegion = env.S3_REGION;
    const previousAccessKey = env.S3_ACCESS_KEY_ID;
    const previousSecret = env.S3_SECRET_ACCESS_KEY;

    env.API_DATA_BACKEND = 'db';
    env.S3_ENDPOINT = undefined;
    env.S3_BUCKET_PRIVATE = undefined;
    env.S3_REGION = undefined;
    env.S3_ACCESS_KEY_ID = undefined;
    env.S3_SECRET_ACCESS_KEY = undefined;

    try {
      const uploadInit = await app.inject({
        method: 'POST',
        url: '/v1/uploads/init',
        headers: authHeaders(tables, drillAuthorId, 'coach'),
        payload: {
          kind: 'VIDEO',
          contentType: 'video/mp4',
          fileName: 'session-demo.mp4',
          sizeBytes: 1_200_000,
        },
      });

      assert.equal(uploadInit.statusCode, 503);
      const payload = uploadInit.json() as { code: string; details?: { missing?: string[] } };
      assert.equal(payload.code, 'SERVICE_UNAVAILABLE');
      assert.deepEqual(payload.details?.missing, [
        'S3_ENDPOINT',
        'S3_BUCKET_PRIVATE',
        'S3_REGION',
        'S3_ACCESS_KEY_ID',
        'S3_SECRET_ACCESS_KEY',
      ]);
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      env.S3_ENDPOINT = previousEndpoint;
      env.S3_BUCKET_PRIVATE = previousBucket;
      env.S3_REGION = previousRegion;
      env.S3_ACCESS_KEY_ID = previousAccessKey;
      env.S3_SECRET_ACCESS_KEY = previousSecret;
      resetDbFixtureStoreForTests();
    }
  });

  it('enforces admin access for trust-ops listings and returns data deletion requests', async () => {
    const tables = loadTables();
    getMarketplaceSeedStore().tables.auditEvents.push({
      id: 'aev_test_athlete_delete_display',
      action: 'athlete.delete',
      resourceType: 'athlete',
      resourceId: 'ath_test_removed',
      result: 'SUCCESS',
      occurredAt: new Date().toISOString(),
    });
    getMarketplaceSeedStore().tables.auditEvents.push({
      id: 'aev_test_video_delete_display',
      action: 'video.delete',
      resourceType: 'video',
      resourceId: 'video_test_archived',
      result: 'SUCCESS',
      occurredAt: new Date().toISOString(),
    });
    getMarketplaceSeedStore().tables.auditEvents.push({
      id: 'aev_test_video_annotation_delete_display',
      action: 'video.annotation.delete',
      resourceType: 'video_annotation',
      resourceId: 'annotation_test_archived',
      result: 'SUCCESS',
      occurredAt: new Date().toISOString(),
    });
    getMarketplaceSeedStore().tables.auditEvents.push({
      id: 'aev_test_message_delete_display',
      action: 'community.message.delete',
      resourceType: 'message',
      resourceId: 'message_test_removed',
      result: 'SUCCESS',
      occurredAt: new Date().toISOString(),
    });
    getMarketplaceSeedStore().tables.auditEvents.push({
      id: 'aev_test_comment_delete_display',
      action: 'community.comment.delete',
      resourceType: 'comment',
      resourceId: 'comment_test_removed',
      result: 'SUCCESS',
      occurredAt: new Date().toISOString(),
    });
    getMarketplaceSeedStore().tables.auditEvents.push({
      id: 'aev_test_payout_default_display',
      action: 'coach_payout_methods.set_default',
      resourceType: 'coach_payout_method',
      resourceId: 'payout_method_test',
      result: 'SUCCESS',
      occurredAt: new Date().toISOString(),
    });
    getMarketplaceSeedStore().tables.auditEvents.push({
      id: 'aev_test_group_owner_transfer_display',
      action: 'community.group.owner.transfer',
      resourceType: 'community_group',
      resourceId: 'group_test',
      result: 'SUCCESS',
      occurredAt: new Date().toISOString(),
    });
    getMarketplaceSeedStore().tables.auditEvents.push({
      id: 'aev_test_recovery_checkpoint_display',
      action: 'practice_task.recovery_checkpoint',
      resourceType: 'practice_task',
      resourceId: 'task_test',
      result: 'SUCCESS',
      occurredAt: new Date().toISOString(),
    });
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
    const grantsPayload = accessGrants.json() as {
      grants: unknown[];
      auditEvents: Array<{ action?: string; displayEffect?: string; displayLabel?: string }>;
    };
    assert.equal(grantsPayload.grants.length >= 1, true);
    assert.equal(grantsPayload.auditEvents.length >= 1, true);
    const legacyDeleteAudit = grantsPayload.auditEvents.find(
      (event) => event.action === 'athlete.delete',
    );
    assert.equal(legacyDeleteAudit?.displayEffect, 'remove');
    assert.equal(legacyDeleteAudit?.displayLabel, 'Athlete removed');
    const legacyVideoDeleteAudit = grantsPayload.auditEvents.find(
      (event) => event.action === 'video.delete',
    );
    assert.equal(legacyVideoDeleteAudit?.displayEffect, 'archive');
    assert.equal(legacyVideoDeleteAudit?.displayLabel, 'Video archived');
    const legacyVideoAnnotationDeleteAudit = grantsPayload.auditEvents.find(
      (event) => event.action === 'video.annotation.delete',
    );
    assert.equal(legacyVideoAnnotationDeleteAudit?.displayEffect, 'archive');
    assert.equal(legacyVideoAnnotationDeleteAudit?.displayLabel, 'Video Annotation archived');
    const legacyMessageDeleteAudit = grantsPayload.auditEvents.find(
      (event) => event.action === 'community.message.delete',
    );
    assert.equal(legacyMessageDeleteAudit?.displayEffect, 'remove');
    assert.equal(legacyMessageDeleteAudit?.displayLabel, 'Community Message removed');
    const legacyCommentDeleteAudit = grantsPayload.auditEvents.find(
      (event) => event.action === 'community.comment.delete',
    );
    assert.equal(legacyCommentDeleteAudit?.displayEffect, 'remove');
    assert.equal(legacyCommentDeleteAudit?.displayLabel, 'Community Comment removed');
    const payoutDefaultAudit = grantsPayload.auditEvents.find(
      (event) => event.action === 'coach_payout_methods.set_default',
    );
    assert.equal(payoutDefaultAudit?.displayEffect, 'set default');
    assert.equal(payoutDefaultAudit?.displayLabel, 'Coach Payout Methods set as default');
    const transferAudit = grantsPayload.auditEvents.find(
      (event) => event.action === 'community.group.owner.transfer',
    );
    assert.equal(transferAudit?.displayEffect, 'transfer');
    assert.equal(transferAudit?.displayLabel, 'Community Group Owner transferred');
    const recoveryCheckpointAudit = grantsPayload.auditEvents.find(
      (event) => event.action === 'practice_task.recovery_checkpoint',
    );
    assert.equal(recoveryCheckpointAudit?.displayEffect, 'recovery checkpoint');
    assert.equal(
      recoveryCheckpointAudit?.displayLabel,
      'Practice Task scheduled recovery checkpoint',
    );
    for (const event of grantsPayload.auditEvents) {
      assert.doesNotMatch(event.displayLabel ?? '', /[._-]/);
      assert.doesNotMatch(event.displayEffect ?? '', /_/);
    }

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

    const deniedRuns = await app.inject({
      method: 'GET',
      url: '/v1/admin/retention-runs',
      headers: authHeaders(tables, asString(nonAdmin.id) as string),
    });
    assert.equal(deniedRuns.statusCode, 403);

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

    const liveTables = getMarketplaceSeedStore().tables;
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'access_grants.read',
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'retention_runs.read',
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'data_deletion_requests.read',
        result: 'SUCCESS',
      }).length,
      1,
    );
  });

  it('uses the db fixture repository seam for retention and data-deletion reads in db mode', async () => {
    const tables = loadTables();
    const previousBackend = env.API_DATA_BACKEND;
    const adminMembership = asRows(tables.userRoleMemberships).find((row) => {
      const role = asString(row.role);
      return role === 'club_admin' || role === 'security_admin';
    });
    assert.ok(adminMembership, 'expected seeded admin role membership');
    const adminUserId = asString(adminMembership.userId) as string;
    const deletionRequest = asRows(tables.dataDeletionRequests)[0];
    assert.ok(deletionRequest, 'expected seeded data deletion request');
    const requesterUserId = asString(deletionRequest.requesterUserId) as string;

    env.API_DATA_BACKEND = 'db';
    try {
      const runs = await app.inject({
        method: 'GET',
        url: '/v1/admin/retention-runs',
        headers: authHeaders(tables, adminUserId, asString(adminMembership.role) as string),
      });
      assert.equal(runs.statusCode, 200);
      const runsPayload = runs.json() as {
        runs: Array<{ id?: string }>;
        seedVersion: string | null;
      };
      assert.equal(runsPayload.seedVersion, null);
      assert.equal(
        runsPayload.runs.some((run) => run.id === asString(asRows(tables.retentionRuns)[0]?.id)),
        true,
      );

      const deletion = await app.inject({
        method: 'GET',
        url: '/v1/me/data-deletion-requests',
        headers: authHeaders(tables, requesterUserId),
      });
      assert.equal(deletion.statusCode, 200);
      const deletionPayload = deletion.json() as {
        requests: Array<{ id?: string; requesterUserId?: string }>;
        total: number;
        seedVersion: string | null;
      };
      assert.equal(deletionPayload.seedVersion, null);
      assert.equal(deletionPayload.total, 1);
      assert.equal(deletionPayload.requests[0]?.id, asString(deletionRequest.id));
      assert.equal(deletionPayload.requests[0]?.requesterUserId, requesterUserId);

      const fixtureTables = getDbFixtureStore().tables;
      assert.equal(
        auditEventsFor(fixtureTables, {
          action: 'retention_runs.read',
          result: 'SUCCESS',
        }).length,
        1,
      );
      assert.equal(
        auditEventsFor(fixtureTables, {
          action: 'data_deletion_requests.read',
          result: 'SUCCESS',
        }).length,
        1,
      );
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
    }
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
      .find(
        (userId): userId is string => Boolean(userId) && !guardianUserIds.has(userId as string),
      );
    assert.ok(parentNoKidsUserId, 'expected seeded parent user with no kids');
    const parentNoKidsId = parentNoKidsUserId as string;

    const parentNoKidsMe = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: authHeaders(tables, parentNoKidsId, 'parent'),
    });
    assert.equal(parentNoKidsMe.statusCode, 200);
    const parentNoKidsPayload = parentNoKidsMe.json() as {
      linkedFamilies: unknown[];
      linkedAthletes: unknown[];
    };
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
    const standaloneMemberClubsPayload = standaloneMemberClubs.json() as {
      clubs: unknown[];
      total: number;
    };
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
