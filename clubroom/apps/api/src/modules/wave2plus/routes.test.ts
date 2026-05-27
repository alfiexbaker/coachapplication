import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, beforeEach, describe, it } from 'node:test';
import { env } from '@clubroom/config';
import { buildApp } from '../../app.js';
import { getDbFixtureStore, resetDbFixtureStoreForTests } from '../../lib/db-fixture-store.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { resetMarketplaceSeedStoreForTests } from '../../lib/marketplace-seed-store.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;
const tokenFromHostedUrl = (value: string): string =>
  new URL(value, 'http://clubroom.test').searchParams.get('token') ?? '';

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
        return roles.includes('security_admin') || roles.includes('admin') || roles.includes('club_admin');
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
          return roles.includes('security_admin') || roles.includes('admin') || roles.includes('club_admin');
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
        events: Array<{ eventType?: string; metadataJson?: { source?: string; bookingId?: string } }>;
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
            attempt.id === paymentPayload.paymentSession.attemptId &&
            attempt.status === 'CANCELED',
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
        events: Array<{ eventType?: string; metadataJson?: { source?: string; bookingId?: string } }>;
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
        refund: { eventType?: string; metadataJson?: { source?: string; status?: string; idempotencyKey?: string } };
        reconcilerEntry: { state?: string } | null;
      };
      assert.equal(refundedPayload.invoice.status, 'VOID');
      assert.equal(refundedPayload.invoice.voidReason, 'Coach approved cancellation refund');
      assert.equal(refundedPayload.refund.eventType, 'VOIDED');
      assert.equal(refundedPayload.refund.metadataJson?.source, 'invoice-refund');
      assert.equal(refundedPayload.refund.metadataJson?.status, 'APPROVED');
      assert.equal(refundedPayload.refund.metadataJson?.idempotencyKey, 'paid-invoice-refund-approved');
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

    const reminded = await app.inject({
      method: 'POST',
      url: `/v1/invoices/${invoiceId}/reminders`,
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        recipientEmail: 'payer@example.com',
        message: 'Please pay through the secure hosted payment page.',
      },
    });
    assert.equal(reminded.statusCode, 200);
    const remindedPayload = reminded.json() as {
      invoice: { id: string; status: string; sentAt?: string };
      reminder: { deliveryStatus?: string; channel?: string };
      sentAt: string;
    };
    assert.equal(remindedPayload.invoice.id, invoiceId);
    assert.equal(remindedPayload.invoice.status, 'SENT');
    assert.equal(remindedPayload.reminder.deliveryStatus, 'queued');
    assert.equal(remindedPayload.reminder.channel, 'email');
    assert.equal(Boolean(remindedPayload.sentAt), true);

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
      const drillsPayload = drills.json() as {
        drills: Array<{ assignments: unknown[] }>;
        total: number;
      };
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
      assert.ok(uploadSession);
      assert.ok(mediaObject);
      assert.equal(asString(mediaObject?.status), 'PENDING_UPLOAD');
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
        const uploadPayload = uploadInit.json() as { uploadSessionId: string; mediaObjectId: string };

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
        assert.equal(finalizedPayload.scanner, 'clubroom-backend-upload-finalizer');

        const fixtureTables = getDbFixtureStore().tables;
        const uploadSession = asRows(fixtureTables.uploadSessions).find(
          (row) => asString(row.id) === uploadPayload.uploadSessionId,
        );
        const mediaObject = asRows(fixtureTables.mediaObjects).find(
          (row) => asString(row.id) === uploadPayload.mediaObjectId,
        );
        const malwareScan = asRows(fixtureTables.malwareScanResults).find(
          (row) => asString(row.mediaObjectId) === uploadPayload.mediaObjectId,
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
          annotation: { label: string; note?: string; type: string };
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
        const uploadPayload = uploadInit.json() as { uploadSessionId: string; mediaObjectId: string };

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
        asRows(fixtureTables.malwareScanResults).push({
          id: 'msr_unsafe_video_test',
          uploadSessionId: uploadPayload.uploadSessionId,
          mediaObjectId: uploadPayload.mediaObjectId,
          verdict: 'INFECTED',
          status: 'INFECTED',
          scanner: 'test-scanner',
          engine: 'test-scanner',
          scannedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
