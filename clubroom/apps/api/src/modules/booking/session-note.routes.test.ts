import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { buildApp } from '../../app.js';
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
  preferredRole?: string,
): Record<string, string> {
  const roles = rolesForUser(tables, userId);
  const actingRole = preferredRole ?? roles[0] ?? 'parent';
  return {
    'x-auth-user-id': userId,
    'x-auth-roles': roles.join(',') || actingRole,
    'x-acting-role': actingRole,
  };
}

function findBookingWithGuardian(tables: SeedTables): {
  bookingId: string;
  coachUserId: string;
  guardianUserId: string;
} {
  for (const booking of asRows(tables.bookings)) {
    const bookingId = asString(booking.id);
    const coachUserId = asString(booking.coachUserId);
    if (!bookingId || !coachUserId) {
      continue;
    }
    const participant = asRows(tables.bookingParticipants).find(
      (row) =>
        asString(row.bookingId) === bookingId &&
        Boolean(asString(row.athleteId)) &&
        Boolean(asString(row.guardianUserId)),
    );
    const guardianUserId = asString(participant?.guardianUserId);
    if (guardianUserId) {
      return { bookingId, coachUserId, guardianUserId };
    }
  }
  throw new Error('expected seeded booking with athlete participant');
}

describe('booking session-note routes', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
  });

  after(async () => {
    await app.close();
  });

  it('lets the assigned coach save notes, lets the guardian read them, and audits denied edits', async () => {
    const store = getMarketplaceSeedStore();
    const { bookingId, coachUserId, guardianUserId } = findBookingWithGuardian(store.tables);

    const denied = await app.inject({
      method: 'PUT',
      url: `/v1/bookings/${bookingId}/session-note`,
      headers: authHeaders(store.tables, guardianUserId, 'parent'),
      payload: {
        summary: 'Parent should not be able to submit coach notes.',
        focus: ['Receiving'],
        effort: 3,
        attendance: 'attended',
      },
    });
    assert.equal(denied.statusCode, 403);

    const saved = await app.inject({
      method: 'PUT',
      url: `/v1/bookings/${bookingId}/session-note`,
      headers: authHeaders(store.tables, coachUserId, 'coach'),
      payload: {
        summary: 'Strong first touch and better scanning.',
        focus: ['First touch', 'Scanning'],
        improvements: 'Open body shape earlier.',
        homework: 'Ten minutes wall passes.',
        effort: 4,
        attendance: 'attended',
      },
    });
    assert.equal(saved.statusCode, 200);
    const savedNote = (saved.json() as {
      note: { summary: string; focus: string[]; effort: number };
    }).note;
    assert.equal(savedNote.summary, 'Strong first touch and better scanning.');
    assert.deepEqual(savedNote.focus, ['First touch', 'Scanning']);
    assert.equal(savedNote.effort, 4);

    const readByParent = await app.inject({
      method: 'GET',
      url: `/v1/bookings/${bookingId}/session-note`,
      headers: authHeaders(store.tables, guardianUserId, 'parent'),
    });
    assert.equal(readByParent.statusCode, 200);
    assert.equal(
      (readByParent.json() as { note: { homework: string } }).note.homework,
      'Ten minutes wall passes.',
    );

    const auditEvents = asRows(store.tables.auditEvents);
    assert.equal(
      auditEvents.some(
        (row) =>
          asString(row.action) === 'booking_session_note.save' &&
          asString(row.resourceId) === bookingId &&
          asString(row.result) === 'DENY',
      ),
      true,
    );
    assert.equal(
      auditEvents.some(
        (row) =>
          asString(row.action) === 'booking_session_note.read' &&
          asString(row.resourceId) === bookingId &&
          asString(row.result) === 'SUCCESS',
      ),
      true,
    );
  });
});
