import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { buildApp } from '../../app.js';
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

function rolesForUser(tables: SeedTables, userId: string): string[] {
  return asRows(tables.userRoleMemberships)
    .filter((row) => asString(row.userId) === userId)
    .map((row) => asString(row.role))
    .filter((role): role is string => Boolean(role));
}

function authHeaders(tables: SeedTables, userId: string): Record<string, string> {
  const roles = rolesForUser(tables, userId);
  const actingRole = roles[0] ?? 'parent';
  return {
    'x-auth-user-id': userId,
    'x-auth-roles': roles.join(',') || actingRole,
    'x-acting-role': actingRole,
  };
}

function activeUserIds(tables: SeedTables): string[] {
  return asRows(tables.users)
    .filter((user) => asString(user.accountStatus) !== 'disabled' && !asString(user.deletedAt))
    .map((user) => asString(user.id))
    .filter((userId): userId is string => Boolean(userId));
}

function auditRows(tables: SeedTables, action: string, result: string): SeedRow[] {
  return asRows(tables.auditEvents).filter(
    (row) => asString(row.action) === action && asString(row.result) === result,
  );
}

describe('generic report routes', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
    resetDbFixtureStoreForTests();
  });

  after(async () => {
    await app.close();
  });

  it('persists reports, auto-blocks serious reports, scopes reads, and audits the flow', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables as SeedTables;
    const [actorId, targetId] = activeUserIds(tables);
    assert.ok(actorId, 'expected actor user');
    assert.ok(targetId, 'expected target user');
    assert.notEqual(actorId, targetId);

    const created = await app.inject({
      method: 'POST',
      url: '/v1/reports',
      headers: authHeaders(tables, actorId),
      payload: {
        reportedUserId: targetId,
        type: 'safety_concern',
        context: 'profile',
        description: 'Profile raised a safeguarding concern.',
      },
    });
    assert.equal(created.statusCode, 201);
    const createdPayload = created.json() as {
      report: {
        id: string;
        reportedUserId: string;
        reportedByUserId: string;
        type: string;
        context: string;
        status: string;
      };
      autoBlocked: boolean;
    };
    assert.match(createdPayload.report.id, /^safe_/);
    assert.equal(createdPayload.report.reportedUserId, targetId);
    assert.equal(createdPayload.report.reportedByUserId, actorId);
    assert.equal(createdPayload.report.type, 'safety_concern');
    assert.equal(createdPayload.report.context, 'profile');
    assert.equal(createdPayload.report.status, 'pending');
    assert.equal(createdPayload.autoBlocked, true);

    const incident = asRows(tables.safeguardingIncidents).find(
      (row) => asString(row.id) === createdPayload.report.id,
    );
    assert.ok(incident, 'expected safeguarding-backed report row');
    assert.equal(asString(incident?.category), 'other');
    const details = JSON.parse(asString(incident?.detailsEncrypted) ?? '{}') as {
      source?: string;
      reportedUserId?: string;
    };
    assert.equal(details.source, 'generic-report');
    assert.equal(details.reportedUserId, targetId);

    const block = asRows(tables.userBlocks).find(
      (row) =>
        asString(row.blockerUserId) === actorId &&
        asString(row.blockedUserId) === targetId &&
        !asString(row.deletedAt),
    );
    assert.ok(block, 'expected serious report to create an active block');

    const ownReports = await app.inject({
      method: 'GET',
      url: '/v1/reports',
      headers: authHeaders(tables, actorId),
    });
    assert.equal(ownReports.statusCode, 200);
    const ownPayload = ownReports.json() as { reports: Array<{ id: string }>; total: number };
    assert.equal(ownPayload.total, 1);
    assert.equal(ownPayload.reports[0]?.id, createdPayload.report.id);

    const targetReports = await app.inject({
      method: 'GET',
      url: '/v1/reports',
      headers: authHeaders(tables, targetId),
    });
    assert.equal(targetReports.statusCode, 200);
    assert.deepEqual((targetReports.json() as { reports: unknown[] }).reports, []);

    const selfReport = await app.inject({
      method: 'POST',
      url: '/v1/reports',
      headers: authHeaders(tables, actorId),
      payload: {
        reportedUserId: actorId,
        type: 'spam',
        context: 'profile',
      },
    });
    assert.equal(selfReport.statusCode, 400);

    const unauthenticated = await app.inject({
      method: 'GET',
      url: '/v1/reports',
    });
    assert.equal(unauthenticated.statusCode, 403);

    assert.equal(auditRows(tables, 'reports.create', 'SUCCESS').length, 1);
    assert.equal(auditRows(tables, 'reports.create', 'ERROR').length, 1);
    assert.equal(auditRows(tables, 'reports.read', 'SUCCESS').length, 2);
    assert.equal(auditRows(tables, 'users.block.create', 'SUCCESS').length, 1);
  });
});
