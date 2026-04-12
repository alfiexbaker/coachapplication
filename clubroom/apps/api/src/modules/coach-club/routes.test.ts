import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, beforeEach, describe, it } from 'node:test';
import { buildApp } from '../../app.js';
import { resetMarketplaceSeedStoreForTests } from '../../lib/marketplace-seed-store.js';
import { resetCoachClubRouteStateForTests } from './routes.js';

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

function authHeaders(tables: SeedTables, userId: string, preferredRole?: string): Record<string, string> {
  const roles = rolesForUser(tables, userId);
  const actingRole = preferredRole ?? roles[0] ?? 'parent';
  return {
    'x-auth-user-id': userId,
    'x-auth-roles': roles.join(',') || actingRole,
    'x-acting-role': actingRole,
  };
}

describe('coach-club routes', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
    resetCoachClubRouteStateForTests();
  });

  after(async () => {
    await app.close();
  });

  it('returns a unified club schedule for an active member', async () => {
    const tables = loadTables();
    const membership = asRows(tables.clubMemberships).find((row) => row.active !== false);
    assert.ok(membership, 'expected seeded club membership');

    const clubId = asString(membership.id ? membership.clubId : undefined) as string;
    const userId = asString(membership.userId) as string;
    assert.ok(clubId, 'expected club id');
    assert.ok(userId, 'expected user id');

    const res = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/schedule`,
      headers: authHeaders(tables, userId),
    });
    assert.equal(res.statusCode, 200);

    const payload = res.json() as {
      clubId: string;
      activities: Array<{ source: string; kind: string; startsAt: string }>;
      total: number;
    };
    assert.equal(payload.clubId, clubId);
    assert.equal(payload.total >= 2, true);
    assert.equal(payload.activities.some((activity) => activity.source === 'club_event'), true);
    assert.equal(payload.activities.some((activity) => activity.source === 'group_session'), true);
    assert.equal(payload.activities.some((activity) => activity.kind === 'informational'), true);
    assert.equal(payload.activities.some((activity) => activity.kind === 'training'), true);

    const sorted = payload.activities.every((activity, index, items) => {
      if (index === 0) return true;
      return new Date(items[index - 1].startsAt).getTime() <= new Date(activity.startsAt).getTime();
    });
    assert.equal(sorted, true);
  });

  it('denies club schedule access to non-members of a private club', async () => {
    const tables = loadTables();
    const membership = asRows(tables.clubMemberships).find((row) => row.active !== false);
    assert.ok(membership, 'expected seeded club membership');

    const clubId = asString(membership.clubId) as string;
    const outsider = asRows(tables.users).find((row) => {
      const userId = asString(row.id);
      if (!userId) {
        return false;
      }

      const roles = rolesForUser(tables, userId);
      const isMember = asRows(tables.clubMemberships).some(
        (candidate) => asString(candidate.clubId) === clubId && asString(candidate.userId) === userId && candidate.active !== false,
      );
      return !isMember && !roles.includes('club_admin') && !roles.includes('security_admin');
    });
    assert.ok(outsider, 'expected non-member outsider');

    const denied = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/schedule`,
      headers: authHeaders(tables, asString(outsider.id) as string),
    });
    assert.equal(denied.statusCode, 403);
  });

  it('allows privileged admins to read club schedules without membership', async () => {
    const tables = loadTables();
    const membership = asRows(tables.clubMemberships).find((row) => row.active !== false);
    assert.ok(membership, 'expected seeded club membership');

    const clubId = asString(membership.clubId) as string;
    const privilegedAdmin = asRows(tables.users).find((row) => {
      const userId = asString(row.id);
      if (!userId) {
        return false;
      }
      const roles = rolesForUser(tables, userId);
      const isMember = asRows(tables.clubMemberships).some(
        (candidate) => asString(candidate.clubId) === clubId && asString(candidate.userId) === userId && candidate.active !== false,
      );
      return !isMember && roles.includes('security_admin');
    });
    assert.ok(privilegedAdmin, 'expected privileged admin outsider');

    const res = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/schedule`,
      headers: authHeaders(tables, asString(privilegedAdmin.id) as string, 'security_admin'),
    });
    assert.equal(res.statusCode, 200);
  });
});
