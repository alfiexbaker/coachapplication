import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { env } from '@clubroom/config';
import { buildApp } from '../../app.js';
import { getDbFixtureStore, resetDbFixtureStoreForTests } from '../../lib/db-fixture-store.js';
import {
  getMarketplaceSeedStore,
  resetMarketplaceSeedStoreForTests,
} from '../../lib/marketplace-seed-store.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

function rolesForUser(tables: SeedTables, userId: string): string[] {
  return asRows(tables.userRoleMemberships)
    .filter((row) => asString(row.userId) === userId)
    .map((row) => asString(row.role))
    .filter((role): role is string => Boolean(role));
}

function authHeaders(
  tables: SeedTables,
  userId: string,
  actingRole?: string,
): Record<string, string> {
  const roles = rolesForUser(tables, userId);
  const role = actingRole ?? roles[0] ?? 'parent';
  return {
    'x-auth-user-id': userId,
    'x-auth-roles': roles.join(',') || role,
    'x-acting-role': role,
  };
}

function findActors(tables: SeedTables): { coachUserId: string; nonCoachUserId: string } {
  const coachUserId = asString(asRows(tables.coachProfiles)[0]?.userId);
  assert.ok(coachUserId, 'expected seeded coach');
  const coachIds = new Set(
    asRows(tables.coachProfiles)
      .map((row) => asString(row.userId))
      .filter((userId): userId is string => Boolean(userId)),
  );
  const nonCoachUserId = asRows(tables.users)
    .map((row) => asString(row.id))
    .find((userId): userId is string => Boolean(userId && !coachIds.has(userId)));
  assert.ok(nonCoachUserId, 'expected seeded non-coach');
  return { coachUserId, nonCoachUserId };
}

function auditRows(tables: SeedTables, action: string, result: string): SeedRow[] {
  return asRows(tables.auditEvents).filter(
    (row) => asString(row.action) === action && asString(row.result) === result,
  );
}

const paymentInstructionsPayload = {
  payeeName: 'A Shaw Coaching',
  bankTransferDetails: 'Sort code 00-00-00, account ending 1234',
  paymentNotes: 'Use the invoice number as the payment reference.',
};

describe('coach payment instruction routes', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
    resetDbFixtureStoreForTests();
  });

  after(async () => {
    await app.close();
  });

  it('reads defaults and saves coach-owned payment instructions without auditing raw bank text', async () => {
    const tables = getMarketplaceSeedStore().tables as SeedTables;
    const { coachUserId, nonCoachUserId } = findActors(tables);

    const initial = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/payment-instructions',
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(initial.statusCode, 200);
    const initialPayload = initial.json() as {
      instructions: {
        coachId: string;
        payeeName: string;
        bankTransferDetails: string;
        paymentNotes: string;
      };
    };
    assert.equal(initialPayload.instructions.coachId, coachUserId);
    assert.equal(initialPayload.instructions.payeeName, '');
    assert.equal(initialPayload.instructions.bankTransferDetails, '');
    assert.match(initialPayload.instructions.paymentNotes, /invoice number/);

    const invalid = await app.inject({
      method: 'PATCH',
      url: '/v1/coaches/me/payment-instructions',
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        payeeName: 'Name only',
      },
    });
    assert.equal(invalid.statusCode, 400);

    const denied = await app.inject({
      method: 'PATCH',
      url: '/v1/coaches/me/payment-instructions',
      headers: authHeaders(tables, nonCoachUserId),
      payload: paymentInstructionsPayload,
    });
    assert.equal(denied.statusCode, 404);

    const saved = await app.inject({
      method: 'PATCH',
      url: '/v1/coaches/me/payment-instructions',
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: paymentInstructionsPayload,
    });
    assert.equal(saved.statusCode, 200);
    const savedPayload = saved.json() as {
      instructions: {
        coachId: string;
        payeeName: string;
        bankTransferDetails: string;
        paymentNotes: string;
      };
    };
    assert.equal(savedPayload.instructions.coachId, coachUserId);
    assert.equal(savedPayload.instructions.payeeName, paymentInstructionsPayload.payeeName);
    assert.equal(
      savedPayload.instructions.bankTransferDetails,
      paymentInstructionsPayload.bankTransferDetails,
    );
    assert.equal(savedPayload.instructions.paymentNotes, paymentInstructionsPayload.paymentNotes);

    const row = asRows(tables.coachPaymentInstructions).find(
      (entry) => asString(entry.coachUserId) === coachUserId,
    );
    assert.equal(row?.payeeName, paymentInstructionsPayload.payeeName);
    assert.equal(row?.updatedByUserId, coachUserId);

    assert.equal(auditRows(tables, 'coach_payment_instructions.read', 'SUCCESS').length, 1);
    assert.equal(auditRows(tables, 'coach_payment_instructions.update', 'SUCCESS').length, 1);
    assert.equal(auditRows(tables, 'coach_payment_instructions.update', 'DENY').length, 2);
    const auditText = JSON.stringify(
      auditRows(tables, 'coach_payment_instructions.update', 'SUCCESS'),
    );
    assert.equal(auditText.includes(paymentInstructionsPayload.bankTransferDetails), false);
  });

  it('fails closed for payment instructions in db mode when Prisma is unavailable', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const tables = getDbFixtureStore().tables as SeedTables;
      const { coachUserId } = findActors(tables);

      const read = await app.inject({
        method: 'GET',
        url: '/v1/coaches/me/payment-instructions',
        headers: authHeaders(tables, coachUserId, 'coach'),
      });
      assert.equal(read.statusCode, 503);
      assert.match(read.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(read.body.includes(coachUserId), false);

      const saved = await app.inject({
        method: 'PATCH',
        url: '/v1/coaches/me/payment-instructions',
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: paymentInstructionsPayload,
      });
      assert.equal(saved.statusCode, 503);
      assert.match(saved.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(saved.body.includes(paymentInstructionsPayload.bankTransferDetails), false);
    } finally {
      env.API_DATA_BACKEND = previousBackend;
    }
  });
});
