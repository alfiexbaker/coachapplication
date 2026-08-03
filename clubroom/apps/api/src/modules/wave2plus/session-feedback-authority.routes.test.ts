import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { env } from '@clubroom/config';
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
const asRecord = (value: unknown): SeedRow | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as SeedRow) : undefined;

function rolesForUser(tables: SeedTables, userId: string): string[] {
  return asRows(tables.userRoleMemberships)
    .filter((row) => asString(row.userId) === userId)
    .map((row) => asString(row.role))
    .filter((role): role is string => Boolean(role));
}

function authHeaders(
  tables: SeedTables,
  userId: string,
  athleteId: string,
): Record<string, string> {
  const roles = rolesForUser(tables, userId);
  return {
    'x-auth-user-id': userId,
    'x-auth-roles': roles.join(',') || 'coach',
    'x-acting-role': 'coach',
    'x-coach-athlete-ids': athleteId,
    'x-coach-verified': '1',
  };
}

describe('session feedback identity authority', () => {
  const app = buildApp();
  const previousBackend = env.API_DATA_BACKEND;

  beforeEach(() => {
    env.API_DATA_BACKEND = 'seed';
    resetMarketplaceSeedStoreForTests();
    resetDbFixtureStoreForTests();
  });

  after(async () => {
    env.API_DATA_BACKEND = previousBackend;
    await app.close();
  });

  it('persists backend coach and athlete names instead of caller-supplied labels', async () => {
    const tables = getMarketplaceSeedStore().tables as SeedTables;
    const participant = asRows(tables.bookingParticipants).find(
      (row) => Boolean(asString(row.athleteId)) && !asString(row.deletedAt),
    );
    assert.ok(participant, 'expected seeded booking participant');
    const bookingId = asString(participant.bookingId);
    const athleteId = asString(participant.athleteId);
    const booking = asRows(tables.bookings).find((row) => asString(row.id) === bookingId);
    const coachId = asString(booking?.coachUserId);
    const coach = asRows(tables.users).find((row) => asString(row.id) === coachId);
    const athlete = asRows(tables.athletes).find((row) => asString(row.id) === athleteId);
    const coachName = asString(coach?.name)?.trim();
    const athleteName = asString(athlete?.displayName)?.trim();
    assert.ok(bookingId && athleteId && coachId && coachName && athleteName);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/session-feedback',
      headers: authHeaders(tables, coachId, athleteId),
      payload: {
        sessionId: bookingId,
        bookingId,
        coachId,
        coachName: 'Forged Coach Label',
        athleteId,
        athleteName: 'Forged Athlete Label',
        publicSummary: 'Backend identity authority proof.',
        effortRating: 4,
        overallPerformance: 4,
        visibility: 'parent',
      },
    });

    assert.equal(response.statusCode, 200);
    const payload = response.json() as { feedback: SeedRow };
    assert.equal(payload.feedback.coachName, coachName);
    assert.equal(payload.feedback.athleteName, athleteName);

    const stored = asRows(tables.sessionFeedback).find(
      (row) => asString(row.id) === asString(payload.feedback.id),
    );
    const metadata = asRecord(stored?.metadataJson);
    assert.equal(metadata?.coachName, coachName);
    assert.equal(metadata?.athleteName, athleteName);
  });
});
