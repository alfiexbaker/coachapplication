import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, beforeEach, describe, it } from 'node:test';
import { env } from '@clubroom/config';
import { buildApp } from '../../app.js';
import { getDbFixtureStore, resetDbFixtureStoreForTests } from '../../lib/db-fixture-store.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { resetMarketplaceSeedStoreForTests } from '../../lib/marketplace-seed-store.js';
import { resetCoachClubRouteStateForTests } from './routes.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

function addDaysIso(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

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

function getSeededClubMembership(tables: SeedTables): { clubId: string; userId: string } {
  const membership = asRows(tables.clubMemberships).find((row) => row.active !== false);
  assert.ok(membership, 'expected seeded club membership');

  const clubId = asString(membership.clubId);
  const userId = asString(membership.userId);
  assert.ok(clubId, 'expected club id');
  assert.ok(userId, 'expected user id');

  return { clubId, userId };
}

describe('coach-club routes', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
    resetDbFixtureStoreForTests();
    resetCoachClubRouteStateForTests();
  });

  after(async () => {
    await app.close();
  });

  it('returns a unified club schedule for an active member', async () => {
    const tables = loadTables();
    const { clubId, userId } = getSeededClubMembership(tables);

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
    const { clubId } = getSeededClubMembership(tables);
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
    const { clubId } = getSeededClubMembership(tables);
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

  it('returns authoritative coach availability slots and can exclude pending invite holds', async () => {
    const tables = loadTables();
    const coachUserId = getSeededCoachUserId(tables);
    const viewerUserId = asString(asRows(tables.guardianChildLinks)[0]?.guardianUserId) ?? coachUserId;
    const targetDate = addDaysIso(10);
    const targetDayOfWeek = new Date(`${targetDate}T00:00:00.000Z`).getUTCDay();
    const store = getMarketplaceSeedStore();

    if (!Array.isArray(store.tables.availabilityTemplates)) {
      store.tables.availabilityTemplates = [];
    }
    if (!Array.isArray(store.tables.bookings)) {
      store.tables.bookings = [];
    }
    if (!Array.isArray(store.tables.invites)) {
      store.tables.invites = [];
    }
    if (!Array.isArray(store.tables.inviteTargets)) {
      store.tables.inviteTargets = [];
    }

    store.tables.availabilityTemplates.push({
      id: 'avt_authority_test',
      coachUserId,
      dayOfWeek: targetDayOfWeek,
      startTimeLocal: '17:00',
      endTimeLocal: '19:15',
      maxConcurrent: 1,
      bufferMinutes: 15,
      active: true,
      location: 'Authority Pitch',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUserId: coachUserId,
      updatedByUserId: coachUserId,
      version: 1,
      deletedAt: null,
      deletedByUserId: null,
    });
    store.tables.bookings.push({
      id: 'bok_authority_test',
      coachUserId,
      bookedByUserId: viewerUserId,
      status: 'CONFIRMED',
      scheduledAt: `${targetDate}T17:00:00.000Z`,
      durationMinutes: 60,
      location: 'Authority Pitch',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUserId: viewerUserId,
      updatedByUserId: viewerUserId,
      version: 1,
      deletedAt: null,
      deletedByUserId: null,
    });
    store.tables.invites.push({
      id: 'inv_authority_test',
      senderUserId: coachUserId,
      inviteType: 'session_invite',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      metadataJson: {
        proposedSlots: [
          {
            date: targetDate,
            startTime: '18:15',
            endTime: '19:15',
          },
        ],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revokedAt: null,
    });
    store.tables.inviteTargets.push({
      id: 'ivt_authority_test',
      inviteId: 'inv_authority_test',
      targetUserId: viewerUserId,
      status: 'PENDING',
      responsePayloadJson: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const listed = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/availability/slots?start=${targetDate}&end=${targetDate}&durationMinutes=60`,
      headers: authHeaders(tables, viewerUserId),
    });
    assert.equal(listed.statusCode, 200);
    const listedPayload = listed.json() as {
      slots: Array<{ date: string; startTime: string; isAvailable: boolean; bookedCount: number; location?: string }>;
    };
    const bookedSlot = listedPayload.slots.find((slot) => slot.date === targetDate && slot.startTime === '17:00');
    const heldSlot = listedPayload.slots.find((slot) => slot.date === targetDate && slot.startTime === '18:15');
    assert.ok(bookedSlot, 'expected booked availability slot');
    assert.ok(heldSlot, 'expected held availability slot');
    assert.equal(bookedSlot.isAvailable, false);
    assert.equal(bookedSlot.bookedCount >= 1, true);
    assert.equal(heldSlot.isAvailable, true);
    assert.equal(heldSlot.location, 'Authority Pitch');

    const heldExcluded = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/availability/slots?start=${targetDate}&end=${targetDate}&durationMinutes=60&excludePendingInvites=true`,
      headers: authHeaders(tables, viewerUserId),
    });
    assert.equal(heldExcluded.statusCode, 200);
    const heldExcludedPayload = heldExcluded.json() as {
      slots: Array<{ date: string; startTime: string; isAvailable: boolean }>;
    };
    const heldSlotAfterExclusion = heldExcludedPayload.slots.find(
      (slot) => slot.date === targetDate && slot.startTime === '18:15',
    );
    assert.ok(heldSlotAfterExclusion, 'expected held slot in exclusion response');
    assert.equal(heldSlotAfterExclusion.isAvailable, false);
  });

  it('applies scheduling-rule filtering only when requested on bookable slot reads', async () => {
    const tables = loadTables();
    const coachUserId = getSeededCoachUserId(tables);
    const viewerUserId = asString(asRows(tables.guardianChildLinks)[0]?.guardianUserId) ?? coachUserId;
    const targetDate = addDaysIso(5);
    const targetDayOfWeek = new Date(`${targetDate}T00:00:00.000Z`).getUTCDay();
    const store = getMarketplaceSeedStore();

    if (!Array.isArray(store.tables.availabilityTemplates)) {
      store.tables.availabilityTemplates = [];
    }

    const schedulingRule = asRows(store.tables.schedulingRules).find(
      (row) => asString(row.coachUserId) === coachUserId,
    );
    assert.ok(schedulingRule, 'expected scheduling rule row');
    schedulingRule.minimumAdvanceBookingHours = 999;

    store.tables.availabilityTemplates.push({
      id: 'avt_rules_filter_test',
      coachUserId,
      dayOfWeek: targetDayOfWeek,
      startTimeLocal: '10:00',
      endTimeLocal: '11:00',
      maxConcurrent: 1,
      bufferMinutes: 0,
      active: true,
      location: 'Rules Pitch',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUserId: coachUserId,
      updatedByUserId: coachUserId,
      version: 1,
      deletedAt: null,
      deletedByUserId: null,
    });

    const raw = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/availability/slots?start=${targetDate}&end=${targetDate}&durationMinutes=60`,
      headers: authHeaders(tables, viewerUserId),
    });
    assert.equal(raw.statusCode, 200);
    const rawPayload = raw.json() as {
      slots: Array<{ date: string; startTime: string }>;
    };
    assert.equal(
      rawPayload.slots.some((slot) => slot.date === targetDate && slot.startTime === '10:00'),
      true,
    );

    const filtered = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/availability/slots?start=${targetDate}&end=${targetDate}&durationMinutes=60&applySchedulingRules=true`,
      headers: authHeaders(tables, viewerUserId),
    });
    assert.equal(filtered.statusCode, 200);
    const filteredPayload = filtered.json() as {
      slots: Array<{ date: string; startTime: string }>;
    };
    assert.equal(
      filteredPayload.slots.some((slot) => slot.date === targetDate && slot.startTime === '10:00'),
      false,
    );
  });

  it('keeps coach self profile, availability, and scheduling writes working in db fixture mode', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const tables = loadTables();
      const coachUserId = getSeededCoachUserId(tables);

      const profile = await app.inject({
        method: 'GET',
        url: '/v1/coaches/me/profile',
        headers: authHeaders(tables, coachUserId, 'coach'),
      });
      assert.equal(profile.statusCode, 200);
      const profilePayload = profile.json() as {
        locations: unknown[];
        availabilityTemplates: unknown[];
      };
      assert.equal(profilePayload.locations.length >= 1, true);
      assert.equal(profilePayload.availabilityTemplates.length >= 1, true);

      const offerings = await app.inject({
        method: 'GET',
        url: '/v1/coaches/me/offerings',
        headers: authHeaders(tables, coachUserId, 'coach'),
      });
      assert.equal(offerings.statusCode, 200);
      assert.equal((offerings.json() as { total: number }).total >= 1, true);

      const templateCreate = await app.inject({
        method: 'POST',
        url: '/v1/coaches/me/availability/templates',
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: {
          dayOfWeek: 2,
          startTime: '10:00',
          endTime: '12:00',
          maxConcurrent: 2,
          bufferMinutes: 20,
          location: 'DB Fixture Dome',
        },
      });
      assert.equal(templateCreate.statusCode, 201);
      const createdTemplate = templateCreate.json() as {
        id: string;
        bufferMinutes: number;
        location?: string;
      };
      assert.equal(createdTemplate.bufferMinutes, 20);
      assert.equal(createdTemplate.location, 'DB Fixture Dome');

      const overrideDate = addDaysIso(20);
      const overrideCreate = await app.inject({
        method: 'POST',
        url: '/v1/coaches/me/availability/overrides',
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: {
          date: overrideDate,
          isBlocked: false,
          customSlots: [{ startTime: '13:00', endTime: '14:00', location: 'Indoor 3G' }],
          repeatUntil: addDaysIso(27),
          repeatDayOfWeek: new Date(`${overrideDate}T00:00:00.000Z`).getUTCDay(),
          repeatGroupId: 'grp_fixture_override',
        },
      });
      assert.equal(overrideCreate.statusCode, 201);
      const createdOverride = overrideCreate.json() as {
        id: string;
        customSlots?: Array<{ location?: string }>;
        repeatGroupId?: string;
      };
      assert.equal(createdOverride.customSlots?.[0]?.location, 'Indoor 3G');
      assert.equal(createdOverride.repeatGroupId, 'grp_fixture_override');

      const rulesPatch = await app.inject({
        method: 'PATCH',
        url: '/v1/coaches/me/scheduling-rules',
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: {
          minimumAdvanceBookingHours: 48,
          bufferMinutesDefault: 30,
          allowSameDayBookings: false,
          cancellationPolicy: {
            name: 'Fixture policy',
            description: 'DB fixture policy',
            tiers: [
              { hoursBeforeSession: 24, refundPercentage: 100, description: 'Full refund' },
              { hoursBeforeSession: 0, refundPercentage: 0, description: 'No refund' },
            ],
            minimumNoticeHours: 0,
            allowCancellations: true,
            isDefault: false,
          },
        },
      });
      assert.equal(rulesPatch.statusCode, 200);
      const rulesPayload = rulesPatch.json() as {
        rules: { minimumAdvanceBookingHours: number; bufferMinutesDefault: number };
        cancellationPolicy: { name: string; tiers: unknown[] } | null;
      };
      assert.equal(rulesPayload.rules.minimumAdvanceBookingHours, 48);
      assert.equal(rulesPayload.rules.bufferMinutesDefault, 30);
      assert.equal(rulesPayload.cancellationPolicy?.name, 'Fixture policy');
      assert.equal(rulesPayload.cancellationPolicy?.tiers.length, 2);

      const fixtureTables = getDbFixtureStore().tables;
      const storedTemplate = asRows(fixtureTables.availabilityTemplates).find(
        (row) => asString(row.id) === createdTemplate.id,
      );
      const storedOverride = asRows(fixtureTables.availabilityOverrides).find(
        (row) => asString(row.id) === createdOverride.id,
      );
      const storedRules = asRows(fixtureTables.schedulingRules).find(
        (row) => asString(row.coachUserId) === coachUserId,
      );
      assert.ok(storedTemplate, 'expected template persisted in db fixture store');
      assert.ok(storedOverride, 'expected override persisted in db fixture store');
      assert.ok(storedRules, 'expected scheduling rules persisted in db fixture store');
      assert.equal(Number(storedTemplate?.bufferMinutes), 20);
      assert.equal(asString(storedOverride?.repeatGroupId), 'grp_fixture_override');
      assert.equal(Number(storedRules?.minimumAdvanceBookingHours), 48);
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetMarketplaceSeedStoreForTests();
      resetDbFixtureStoreForTests();
      resetCoachClubRouteStateForTests();
    }
  });

  it('returns club event detail for an authorized member', async () => {
    const tables = loadTables();
    const { clubId, userId } = getSeededClubMembership(tables);

    const list = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/schedule`,
      headers: authHeaders(tables, userId),
    });
    assert.equal(list.statusCode, 200);

    const activity = (list.json() as { activities: Array<{ id: string; source: string; sourceEntityId: string }> }).activities.find(
      (candidate) => candidate.source === 'club_event',
    );
    assert.ok(activity, 'expected club event activity');

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/schedule/${activity.id}`,
      headers: authHeaders(tables, userId),
    });
    assert.equal(detail.statusCode, 200);

    const payload = detail.json() as {
      clubId: string;
      activity: { id: string; source: string; sourceEntityId: string };
    };
    assert.equal(payload.clubId, clubId);
    assert.equal(payload.activity.id, activity.id);
    assert.equal(payload.activity.source, 'club_event');
    assert.equal(payload.activity.sourceEntityId, activity.sourceEntityId);
  });

  it('returns group session detail for an authorized member', async () => {
    const tables = loadTables();
    const { clubId, userId } = getSeededClubMembership(tables);

    const list = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/schedule`,
      headers: authHeaders(tables, userId),
    });
    assert.equal(list.statusCode, 200);

    const activity = (list.json() as { activities: Array<{ id: string; source: string; sourceEntityId: string }> }).activities.find(
      (candidate) => candidate.source === 'group_session',
    );
    assert.ok(activity, 'expected group session activity');

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/schedule/${activity.id}`,
      headers: authHeaders(tables, userId),
    });
    assert.equal(detail.statusCode, 200);

    const payload = detail.json() as {
      clubId: string;
      activity: { id: string; source: string; sourceEntityId: string };
    };
    assert.equal(payload.clubId, clubId);
    assert.equal(payload.activity.id, activity.id);
    assert.equal(payload.activity.source, 'group_session');
    assert.equal(payload.activity.sourceEntityId, activity.sourceEntityId);
  });

  it('returns match detail for an authorized member when a match exists for the club', async () => {
    const tables = loadTables();
    const { clubId, userId } = getSeededClubMembership(tables);
    const store = getMarketplaceSeedStore();
    if (!Array.isArray(store.tables.matches)) {
      store.tables.matches = [];
    }

    store.tables.matches.push({
      id: 'match_test_club_schedule_detail',
      clubId,
      title: 'Sunday Fixture',
      startsAt: '2026-04-20T10:00:00.000Z',
      status: 'SCHEDULED',
      matchType: 'league',
      venue: 'Main Pitch',
      opponent: 'Riverside FC',
      isHome: true,
    });

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/schedule/club_activity:match:match_test_club_schedule_detail`,
      headers: authHeaders(tables, userId),
    });
    assert.equal(detail.statusCode, 200);

    const payload = detail.json() as {
      clubId: string;
      activity: { id: string; source: string; sourceEntityId: string; title: string };
    };
    assert.equal(payload.clubId, clubId);
    assert.equal(payload.activity.id, 'club_activity:match:match_test_club_schedule_detail');
    assert.equal(payload.activity.source, 'match');
    assert.equal(payload.activity.sourceEntityId, 'match_test_club_schedule_detail');
    assert.equal(payload.activity.title, 'Sunday Fixture');
  });

  it('denies club activity detail to non-members of a private club', async () => {
    const tables = loadTables();
    const { clubId, userId } = getSeededClubMembership(tables);
    const list = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/schedule`,
      headers: authHeaders(tables, userId),
    });
    assert.equal(list.statusCode, 200);

    const activity = (list.json() as { activities: Array<{ id: string }> }).activities[0];
    assert.ok(activity, 'expected seeded activity');

    const outsider = asRows(tables.users).find((row) => {
      const outsiderUserId = asString(row.id);
      if (!outsiderUserId) {
        return false;
      }

      const roles = rolesForUser(tables, outsiderUserId);
      const isMember = asRows(tables.clubMemberships).some(
        (candidate) => asString(candidate.clubId) === clubId && asString(candidate.userId) === outsiderUserId && candidate.active !== false,
      );
      return !isMember && !roles.includes('club_admin') && !roles.includes('security_admin');
    });
    assert.ok(outsider, 'expected non-member outsider');

    const denied = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/schedule/${activity.id}`,
      headers: authHeaders(tables, asString(outsider.id) as string),
    });
    assert.equal(denied.statusCode, 403);
  });

  it('returns 404 for a stale club activity id', async () => {
    const tables = loadTables();
    const { clubId, userId } = getSeededClubMembership(tables);

    const res = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/schedule/club_activity:club_event:missing`,
      headers: authHeaders(tables, userId),
    });
    assert.equal(res.statusCode, 404);
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
