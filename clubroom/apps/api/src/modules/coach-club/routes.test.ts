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

function getSeededCoachUserId(tables: SeedTables): string {
  const rulesRow = asRows(tables.schedulingRules)[0];
  const coachUserId = asString(rulesRow?.coachUserId);
  assert.ok(coachUserId, 'expected seeded coach user id');
  return coachUserId;
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

  it('lets a coach manage self availability templates via v1 routes', async () => {
    const tables = loadTables();
    const coachUserId = getSeededCoachUserId(tables);
    const headers = authHeaders(tables, coachUserId, 'coach');

    const list = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/availability/templates',
      headers,
    });
    assert.equal(list.statusCode, 200);
    const initialPayload = list.json() as { templates: Array<{ coachId: string }> };
    assert.equal(initialPayload.templates.length > 0, true);
    assert.equal(initialPayload.templates.every((template) => template.coachId === coachUserId), true);

    const created = await app.inject({
      method: 'POST',
      url: '/v1/coaches/me/availability/templates',
      headers,
      payload: {
        coachId: coachUserId,
        dayOfWeek: 5,
        startTime: '18:00',
        endTime: '20:00',
        isRecurring: true,
        maxConcurrent: 3,
        bufferMinutes: 10,
        location: 'Test Dome',
      },
    });
    assert.equal(created.statusCode, 201);
    const createdTemplate = created.json() as {
      id: string;
      coachId: string;
      dayOfWeek: number;
      maxConcurrent: number;
      location?: string;
    };
    assert.equal(createdTemplate.coachId, coachUserId);
    assert.equal(createdTemplate.dayOfWeek, 5);
    assert.equal(createdTemplate.maxConcurrent, 3);
    assert.equal(createdTemplate.location, 'Test Dome');

    const updated = await app.inject({
      method: 'PATCH',
      url: `/v1/coaches/me/availability/templates/${createdTemplate.id}`,
      headers,
      payload: {
        coachId: coachUserId,
        dayOfWeek: 5,
        startTime: '18:30',
        endTime: '20:30',
        isRecurring: true,
        maxConcurrent: 1,
        bufferMinutes: 20,
        location: 'Updated Dome',
      },
    });
    assert.equal(updated.statusCode, 200);
    const updatedTemplate = updated.json() as { id: string; maxConcurrent: number; location?: string };
    assert.equal(updatedTemplate.id, createdTemplate.id);
    assert.equal(updatedTemplate.maxConcurrent, 1);
    assert.equal(updatedTemplate.location, 'Updated Dome');

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/v1/coaches/me/availability/templates/${createdTemplate.id}`,
      headers,
    });
    assert.equal(deleted.statusCode, 204);

    const afterDelete = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/availability/templates',
      headers,
    });
    const finalPayload = afterDelete.json() as { templates: Array<{ id: string }> };
    assert.equal(finalPayload.templates.some((template) => template.id === createdTemplate.id), false);
  });

  it('lets a coach manage self availability overrides with date filtering', async () => {
    const tables = loadTables();
    const coachUserId = getSeededCoachUserId(tables);
    const headers = authHeaders(tables, coachUserId, 'coach');

    const list = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/availability/overrides?start=2026-03-01&end=2026-03-31',
      headers,
    });
    assert.equal(list.statusCode, 200);
    const initialPayload = list.json() as { overrides: Array<{ coachId: string; date: string }> };
    assert.equal(initialPayload.overrides.every((override) => override.coachId === coachUserId), true);
    assert.equal(initialPayload.overrides.every((override) => override.date >= '2026-03-01' && override.date <= '2026-03-31'), true);

    const created = await app.inject({
      method: 'POST',
      url: '/v1/coaches/me/availability/overrides',
      headers,
      payload: {
        coachId: coachUserId,
        date: '2026-03-20',
        isBlocked: false,
        reason: 'Extra session window',
        customSlots: [
          {
            date: '2026-03-20',
            startTime: '09:00',
            endTime: '10:30',
            location: 'Training Annex',
          },
        ],
      },
    });
    assert.equal(created.statusCode, 201);
    const createdOverride = created.json() as { id: string; date: string; customSlots?: Array<{ startTime: string }> };
    assert.equal(createdOverride.date, '2026-03-20');
    assert.equal(createdOverride.customSlots?.[0]?.startTime, '09:00');

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/v1/coaches/me/availability/overrides/${createdOverride.id}`,
      headers,
    });
    assert.equal(deleted.statusCode, 204);
  });

  it('lets a coach update self scheduling rules and cancellation policy via v1 routes', async () => {
    const tables = loadTables();
    const coachUserId = getSeededCoachUserId(tables);
    const headers = authHeaders(tables, coachUserId, 'coach');

    const existing = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/scheduling-rules',
      headers,
    });
    assert.equal(existing.statusCode, 200);
    const existingPayload = existing.json() as {
      rules: { coachId: string; minimumAdvanceBookingHours: number };
      cancellationPolicy: { tiers: Array<{ hoursBeforeSession: number }> } | null;
    };
    assert.equal(existingPayload.rules.coachId, coachUserId);
    assert.equal(existingPayload.rules.minimumAdvanceBookingHours > 0, true);
    assert.equal((existingPayload.cancellationPolicy?.tiers.length ?? 0) > 0, true);

    const updated = await app.inject({
      method: 'PATCH',
      url: '/v1/coaches/me/scheduling-rules',
      headers,
      payload: {
        minimumAdvanceBookingHours: 36,
        maxAdvanceBookingDays: 45,
        bufferMinutesDefault: 20,
        maxConcurrentDefault: 2,
        allowSameDayBookings: false,
        cancellationPolicy: {
          name: 'Coach custom',
          description: 'Custom policy',
          minimumNoticeHours: 6,
          allowCancellations: true,
          isDefault: false,
          tiers: [
            { hoursBeforeSession: 24, refundPercentage: 100, description: 'Full refund' },
            { hoursBeforeSession: 6, refundPercentage: 50, description: 'Half refund' },
            { hoursBeforeSession: 0, refundPercentage: 0, description: 'No refund' },
          ],
        },
      },
    });
    assert.equal(updated.statusCode, 200);
    const updatedPayload = updated.json() as {
      rules: {
        minimumAdvanceBookingHours: number;
        maxAdvanceBookingDays: number;
        bufferMinutesDefault: number;
        maxConcurrentDefault: number;
        allowSameDayBookings: boolean;
      };
      cancellationPolicy: {
        name: string;
        tiers: Array<{ hoursBeforeSession: number; refundPercentage: number }>;
      } | null;
    };
    assert.equal(updatedPayload.rules.minimumAdvanceBookingHours, 36);
    assert.equal(updatedPayload.rules.maxAdvanceBookingDays, 45);
    assert.equal(updatedPayload.rules.bufferMinutesDefault, 20);
    assert.equal(updatedPayload.rules.maxConcurrentDefault, 2);
    assert.equal(updatedPayload.rules.allowSameDayBookings, false);
    assert.equal(updatedPayload.cancellationPolicy?.name, 'Coach custom');
    assert.deepEqual(
      updatedPayload.cancellationPolicy?.tiers.map((tier) => ({
        hoursBeforeSession: tier.hoursBeforeSession,
        refundPercentage: tier.refundPercentage,
      })),
      [
        { hoursBeforeSession: 24, refundPercentage: 100 },
        { hoursBeforeSession: 6, refundPercentage: 50 },
        { hoursBeforeSession: 0, refundPercentage: 0 },
      ],
    );
  });
});
