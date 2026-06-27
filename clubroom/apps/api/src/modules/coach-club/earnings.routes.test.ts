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
const asNumber = (value: unknown): number => (typeof value === 'number' ? value : 0);
const asRecord = (value: unknown): SeedRow | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as SeedRow) : undefined;

function authHeaders(userId: string): Record<string, string> {
  return {
    'x-auth-user-id': userId,
    'x-auth-roles': 'coach',
    'x-acting-role': 'coach',
  };
}

function findActors(tables: SeedTables): {
  coachUserId: string;
  otherCoachUserId: string;
  nonCoachUserId: string;
} {
  const coachUserId = asString(asRows(tables.coachProfiles)[0]?.userId);
  const otherCoachUserId = asRows(tables.coachProfiles)
    .map((row) => asString(row.userId))
    .find((userId): userId is string => Boolean(userId && userId !== coachUserId));
  assert.ok(coachUserId, 'expected seeded coach');
  assert.ok(otherCoachUserId, 'expected another seeded coach');

  const coachIds = new Set(
    asRows(tables.coachProfiles)
      .map((row) => asString(row.userId))
      .filter((userId): userId is string => Boolean(userId)),
  );
  const nonCoachUserId = asRows(tables.users)
    .map((row) => asString(row.id))
    .find((userId): userId is string => Boolean(userId && !coachIds.has(userId)));
  assert.ok(nonCoachUserId, 'expected seeded non-coach');

  return { coachUserId, otherCoachUserId, nonCoachUserId };
}

function ensureInvoices(tables: SeedTables): SeedRow[] {
  if (!Array.isArray(tables.invoices)) {
    tables.invoices = [];
  }
  return tables.invoices;
}

function addInvoice(
  tables: SeedTables,
  params: {
    id: string;
    coachUserId: string;
    status: 'PAID' | 'SENT';
    totalMinor: number;
    paidAt?: string;
  },
): void {
  const now = new Date().toISOString();
  ensureInvoices(tables).push({
    id: params.id,
    invoiceNumber: `INV-${params.id}`,
    coachUserId: params.coachUserId,
    status: params.status,
    totalMinor: params.totalMinor,
    subtotalMinor: params.totalMinor,
    taxMinor: 0,
    taxRatePercent: 0,
    currency: 'GBP',
    sessionType: 'one_to_one',
    sessionDate: params.paidAt ?? now,
    paidAt: params.paidAt ?? null,
    createdAt: params.paidAt ?? now,
    updatedAt: params.paidAt ?? now,
    deletedAt: null,
  });
}

function auditCount(tables: SeedTables, result: string): number {
  return asRows(tables.auditEvents).filter(
    (row) => asString(row.action) === 'coach_earnings.read' && asString(row.result) === result,
  ).length;
}

function auditRows(tables: SeedTables, action: string, result?: string): SeedRow[] {
  return asRows(tables.auditEvents).filter(
    (row) =>
      asString(row.action) === action &&
      (result === undefined || asString(row.result) === result),
  );
}

function expectedPaidTotal(tables: SeedTables, coachUserId: string): number {
  return (
    asRows(tables.invoices)
      .filter(
        (row) =>
          asString(row.coachUserId) === coachUserId &&
          asString(row.status) === 'PAID' &&
          !asString(row.deletedAt),
      )
      .reduce((sum, row) => sum + asNumber(row.totalMinor), 0) / 100
  );
}

function expectedOpenTotal(tables: SeedTables, coachUserId: string): number {
  return (
    asRows(tables.invoices)
      .filter(
        (row) =>
          asString(row.coachUserId) === coachUserId &&
          ['DRAFT', 'SENT'].includes(asString(row.status) ?? '') &&
          !asString(row.deletedAt),
      )
      .reduce((sum, row) => sum + asNumber(row.totalMinor), 0) / 100
  );
}

describe('coach earnings route', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
    resetDbFixtureStoreForTests();
  });

  after(async () => {
    await app.close();
  });

  it('derives self-only earnings from invoices and audits sensitive reads', async () => {
    const tables = getMarketplaceSeedStore().tables as SeedTables;
    const { coachUserId, otherCoachUserId, nonCoachUserId } = findActors(tables);
    const now = new Date();
    const currentMonthPaidAt = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 12),
    ).toISOString();
    const previousMonthPaidAt = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 12),
    ).toISOString();

    addInvoice(tables, {
      id: 'invoice_earnings_current',
      coachUserId,
      status: 'PAID',
      totalMinor: 5500,
      paidAt: currentMonthPaidAt,
    });
    addInvoice(tables, {
      id: 'invoice_earnings_previous',
      coachUserId,
      status: 'PAID',
      totalMinor: 2500,
      paidAt: previousMonthPaidAt,
    });
    addInvoice(tables, {
      id: 'invoice_earnings_open',
      coachUserId,
      status: 'SENT',
      totalMinor: 4000,
    });
    addInvoice(tables, {
      id: 'invoice_earnings_other_coach',
      coachUserId: otherCoachUserId,
      status: 'PAID',
      totalMinor: 999900,
      paidAt: currentMonthPaidAt,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/earnings?period=month&limit=1',
      headers: authHeaders(coachUserId),
    });
    assert.equal(response.statusCode, 200);
    const payload = response.json() as {
      earnings: {
        coachId: string;
        availableBalance: number;
        pendingBalance: number;
        totalEarned: number;
        totalWithdrawn: number;
        pendingWithdrawals: unknown[];
        payoutMethods: unknown[];
      };
      calculation: { totalEarned: number; totalSessions: number };
      summary: { period: string; totalEarned: number };
      transactions: Array<{ coachId: string; amount: number }>;
      totalTransactions: number;
    };
    assert.equal(payload.earnings.coachId, coachUserId);
    assert.equal(payload.earnings.availableBalance, 0);
    assert.equal(payload.earnings.pendingBalance, expectedOpenTotal(tables, coachUserId));
    assert.equal(payload.earnings.totalEarned, expectedPaidTotal(tables, coachUserId));
    assert.equal(payload.earnings.totalWithdrawn, 0);
    assert.deepEqual(payload.earnings.pendingWithdrawals, []);
    assert.deepEqual(payload.earnings.payoutMethods, []);
    assert.equal(payload.calculation.totalEarned, payload.earnings.totalEarned);
    assert.equal(payload.summary.period, 'month');
    assert.ok(payload.summary.totalEarned >= 55);
    assert.equal(payload.transactions.length, 1);
    assert.equal(payload.transactions[0].coachId, coachUserId);
    assert.notEqual(payload.transactions[0].amount, 9999);
    assert.ok(payload.totalTransactions >= payload.transactions.length);

    const nonCoach = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/earnings',
      headers: authHeaders(nonCoachUserId),
    });
    assert.equal(nonCoach.statusCode, 404);

    const invalid = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/earnings?limit=0',
      headers: authHeaders(coachUserId),
    });
    assert.equal(invalid.statusCode, 400);

    assert.equal(auditCount(tables, 'SUCCESS'), 1);
    assert.equal(auditCount(tables, 'DENY'), 2);
  });

  it('uses the db fixture store for the same invoice-derived contract', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const tables = getDbFixtureStore().tables as SeedTables;
      const { coachUserId } = findActors(tables);
      addInvoice(tables, {
        id: 'invoice_earnings_db_fixture',
        coachUserId,
        status: 'PAID',
        totalMinor: 7300,
        paidAt: new Date().toISOString(),
      });

      const response = await app.inject({
        method: 'GET',
        url: '/v1/coaches/me/earnings?period=week',
        headers: authHeaders(coachUserId),
      });
      assert.equal(response.statusCode, 200);
      const payload = response.json() as {
        earnings: { coachId: string; totalEarned: number };
        summary: { period: string; totalEarned: number };
      };
      assert.equal(payload.earnings.coachId, coachUserId);
      assert.equal(payload.earnings.totalEarned, expectedPaidTotal(tables, coachUserId));
      assert.equal(payload.summary.period, 'week');
      assert.ok(payload.summary.totalEarned >= 73);
      assert.equal(auditCount(tables, 'SUCCESS'), 1);
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });

  it('runs payout methods and withdrawals through audited simulated provider state', async () => {
    const tables = getMarketplaceSeedStore().tables as SeedTables;
    const { coachUserId, nonCoachUserId } = findActors(tables);

    const payoutMethods = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/payout-methods',
      headers: authHeaders(coachUserId),
    });
    assert.equal(payoutMethods.statusCode, 200);
    const payoutPayload = payoutMethods.json() as {
      payoutMethods: unknown[];
      total: number;
      provider: string;
      providerConfigured: boolean;
    };
    assert.deepEqual(payoutPayload.payoutMethods, []);
    assert.equal(payoutPayload.total, 0);
    assert.equal(payoutPayload.provider, 'simulated');
    assert.equal(payoutPayload.providerConfigured, false);

    const nonCoachPayoutMethods = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/payout-methods',
      headers: authHeaders(nonCoachUserId),
    });
    assert.equal(nonCoachPayoutMethods.statusCode, 404);

    const addPayoutMethod = await app.inject({
      method: 'POST',
      url: '/v1/coaches/me/payout-methods',
      headers: authHeaders(coachUserId),
      payload: {
        type: 'BANK_ACCOUNT',
        bankName: 'Test Bank',
        accountLastFour: '1234',
        sortCode: '00-00-00',
        nickname: 'Main',
        isDefault: true,
      },
    });
    assert.equal(addPayoutMethod.statusCode, 200);
    const addPayoutPayload = addPayoutMethod.json() as {
      payoutMethod: {
        id: string;
        type: string;
        isDefault: boolean;
        isVerified: boolean;
        accountLastFour?: string;
        sortCode?: string;
      };
      payoutMethods: unknown[];
      provider: string;
      providerConfigured: boolean;
    };
    assert.ok(addPayoutPayload.payoutMethod.id);
    assert.equal(addPayoutPayload.payoutMethod.type, 'BANK_ACCOUNT');
    assert.equal(addPayoutPayload.payoutMethod.isDefault, true);
    assert.equal(addPayoutPayload.payoutMethod.isVerified, true);
    assert.equal(addPayoutPayload.payoutMethod.accountLastFour, '1234');
    assert.equal(addPayoutPayload.payoutMethod.sortCode, undefined);
    assert.equal(addPayoutPayload.payoutMethods.length, 1);
    assert.equal(addPayoutPayload.provider, 'simulated');
    assert.equal(addPayoutPayload.providerConfigured, false);
    const payoutMethodId = addPayoutPayload.payoutMethod.id;

    const setDefault = await app.inject({
      method: 'PATCH',
      url: `/v1/coaches/me/payout-methods/${encodeURIComponent(payoutMethodId)}/default`,
      headers: authHeaders(coachUserId),
    });
    assert.equal(setDefault.statusCode, 200);

    const withdrawals = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/withdrawals?status=pending',
      headers: authHeaders(coachUserId),
    });
    assert.equal(withdrawals.statusCode, 200);
    const withdrawalsPayload = withdrawals.json() as {
      withdrawals: unknown[];
      total: number;
      status: string;
      provider: string;
      providerConfigured: boolean;
    };
    assert.deepEqual(withdrawalsPayload.withdrawals, []);
    assert.equal(withdrawalsPayload.total, 0);
    assert.equal(withdrawalsPayload.status, 'pending');
    assert.equal(withdrawalsPayload.provider, 'simulated');
    assert.equal(withdrawalsPayload.providerConfigured, false);

    const requestWithdrawal = await app.inject({
      method: 'POST',
      url: '/v1/coaches/me/withdrawals',
      headers: authHeaders(coachUserId),
      payload: {
        amount: 25,
        payoutMethodId,
      },
    });
    assert.equal(requestWithdrawal.statusCode, 200);
    const requestWithdrawalPayload = requestWithdrawal.json() as {
      withdrawal: {
        id: string;
        amount: number;
        payoutMethodId: string;
        payoutMethod: string;
        status: string;
      };
      provider: string;
      providerConfigured: boolean;
    };
    assert.ok(requestWithdrawalPayload.withdrawal.id);
    assert.equal(requestWithdrawalPayload.withdrawal.amount, 25);
    assert.equal(requestWithdrawalPayload.withdrawal.payoutMethodId, payoutMethodId);
    assert.equal(requestWithdrawalPayload.withdrawal.payoutMethod, 'BANK_ACCOUNT');
    assert.equal(requestWithdrawalPayload.withdrawal.status, 'PENDING');
    assert.equal(requestWithdrawalPayload.provider, 'simulated');
    assert.equal(requestWithdrawalPayload.providerConfigured, false);
    const withdrawalId = requestWithdrawalPayload.withdrawal.id;

    const pendingAfterRequest = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/withdrawals?status=pending',
      headers: authHeaders(coachUserId),
    });
    assert.equal(pendingAfterRequest.statusCode, 200);
    const pendingAfterRequestPayload = pendingAfterRequest.json() as {
      withdrawals: Array<{ id: string }>;
    };
    assert.equal(pendingAfterRequestPayload.withdrawals.some((row) => row.id === withdrawalId), true);

    const completeWithdrawal = await app.inject({
      method: 'POST',
      url: `/v1/coaches/me/withdrawals/${encodeURIComponent(withdrawalId)}/complete`,
      headers: authHeaders(coachUserId),
    });
    assert.equal(completeWithdrawal.statusCode, 200);
    const completeWithdrawalPayload = completeWithdrawal.json() as {
      withdrawal: { status: string; completedAt?: string; reference?: string };
    };
    assert.equal(completeWithdrawalPayload.withdrawal.status, 'COMPLETED');
    assert.ok(completeWithdrawalPayload.withdrawal.completedAt);
    assert.ok(completeWithdrawalPayload.withdrawal.reference);

    const pendingAfterComplete = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/withdrawals?status=pending',
      headers: authHeaders(coachUserId),
    });
    const pendingAfterCompletePayload = pendingAfterComplete.json() as {
      withdrawals: Array<{ id: string }>;
    };
    assert.equal(
      pendingAfterCompletePayload.withdrawals.some((row) => row.id === withdrawalId),
      false,
    );

    const secondWithdrawal = await app.inject({
      method: 'POST',
      url: '/v1/coaches/me/withdrawals',
      headers: authHeaders(coachUserId),
      payload: {
        amount: 10,
        payoutMethodId,
      },
    });
    assert.equal(secondWithdrawal.statusCode, 200);
    const secondWithdrawalPayload = secondWithdrawal.json() as {
      withdrawal: { id: string; status: string };
    };
    assert.equal(secondWithdrawalPayload.withdrawal.status, 'PENDING');

    const cancelWithdrawal = await app.inject({
      method: 'POST',
      url: `/v1/coaches/me/withdrawals/${encodeURIComponent(secondWithdrawalPayload.withdrawal.id)}/cancel`,
      headers: authHeaders(coachUserId),
    });
    assert.equal(cancelWithdrawal.statusCode, 200);
    const cancelWithdrawalPayload = cancelWithdrawal.json() as {
      withdrawal: { status: string };
    };
    assert.equal(cancelWithdrawalPayload.withdrawal.status, 'CANCELLED');

    const deletePayoutMethod = await app.inject({
      method: 'DELETE',
      url: `/v1/coaches/me/payout-methods/${encodeURIComponent(payoutMethodId)}`,
      headers: authHeaders(coachUserId),
    });
    assert.equal(deletePayoutMethod.statusCode, 200);
    const deletePayoutMethodPayload = deletePayoutMethod.json() as {
      payoutMethods: unknown[];
      total: number;
    };
    assert.deepEqual(deletePayoutMethodPayload.payoutMethods, []);
    assert.equal(deletePayoutMethodPayload.total, 0);

    assert.equal(auditRows(tables, 'coach_payout_methods.read', 'SUCCESS').length, 1);
    assert.equal(auditRows(tables, 'coach_payout_methods.read', 'DENY').length, 1);
    assert.equal(auditRows(tables, 'coach_payout_methods.create', 'SUCCESS').length, 1);
    assert.equal(auditRows(tables, 'coach_payout_methods.set_default', 'SUCCESS').length, 1);
    assert.equal(auditRows(tables, 'coach_payout_methods.delete', 'SUCCESS').length, 1);
    assert.equal(auditRows(tables, 'coach_withdrawals.read', 'SUCCESS').length, 3);
    assert.equal(auditRows(tables, 'coach_withdrawals.create', 'SUCCESS').length, 2);
    assert.equal(auditRows(tables, 'coach_withdrawals.complete', 'SUCCESS').length, 1);
    assert.equal(auditRows(tables, 'coach_withdrawals.cancel', 'SUCCESS').length, 1);

    const createAudit = auditRows(tables, 'coach_payout_methods.create', 'SUCCESS')[0];
    const metadata = asRecord(createAudit?.metadataJson);
    assert.equal(metadata?.methodType, 'BANK_ACCOUNT');
    assert.equal(metadata?.provider, 'simulated');
    assert.equal(metadata?.missingAuthority, undefined);
    assert.equal(metadata?.bankName, undefined);
    assert.equal(metadata?.sortCode, undefined);
    assert.equal(metadata?.accountLastFour, undefined);
    assert.equal(metadata?.paypalEmail, undefined);
  });
});
