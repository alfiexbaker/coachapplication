import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';

import { buildApp } from '../../app.js';
import { getMarketplaceSeedStore, resetMarketplaceSeedStoreForTests } from '../../lib/marketplace-seed-store.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

function auditCount(tables: SeedTables, result: string): number {
  return asRows(tables.auditEvents).filter(
    (row) =>
      asString(row.action) === 'athlete_injury.read' &&
      asString(row.resourceId) === 'ath_user3' &&
      asString(row.result) === result,
  ).length;
}

describe('injury read authority', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
  });

  after(async () => {
    await app.close();
  });

  it('requires a verified assigned coach and audits both outcomes', async () => {
    const tables = getMarketplaceSeedStore().tables as SeedTables;
    const baseHeaders = {
      'x-auth-user-id': 'usr_coach1',
      'x-auth-roles': 'coach',
      'x-acting-role': 'coach',
      'x-coach-athlete-ids': 'ath_user3',
    };

    const denied = await app.inject({
      method: 'GET',
      url: '/v1/athletes/ath_user3/injuries',
      headers: baseHeaders,
    });
    assert.equal(denied.statusCode, 403);

    const allowed = await app.inject({
      method: 'GET',
      url: '/v1/athletes/ath_user3/injuries',
      headers: { ...baseHeaders, 'x-coach-verified': '1' },
    });
    assert.equal(allowed.statusCode, 200);
    assert.equal(Array.isArray((allowed.json() as { injuries: unknown[] }).injuries), true);

    assert.equal(auditCount(tables, 'DENY'), 1);
    assert.equal(auditCount(tables, 'SUCCESS'), 1);
  });

  it('keeps unshared injuries out of a coach projection and blocks direct reads and writes', async () => {
    const tables = getMarketplaceSeedStore().tables as SeedTables;
    const now = '2026-08-03T10:00:00.000Z';
    const injuries = Array.isArray(tables.athleteInjuries)
      ? (tables.athleteInjuries as SeedRow[])
      : (tables.athleteInjuries = []);
    const privateInjuryId = 'inj_private-coach-projection';
    const sharedInjuryId = 'inj_shared-coach-projection';
    injuries.push(
      {
        id: privateInjuryId,
        athleteId: 'ath_user3',
        title: 'Private injury note',
        type: 'medical',
        severity: 'medium',
        status: 'active',
        reportedAt: now,
        expectedRecoveryDate: null,
        resolvedAt: null,
        notes: 'Must not reach a coach.',
        createdByUserId: 'usr_parent1',
        updatedByUserId: 'usr_parent1',
        createdAt: now,
        updatedAt: now,
        version: 1,
      },
      {
        id: sharedInjuryId,
        athleteId: 'ath_user3',
        title: 'Shared injury note',
        type: 'impact',
        severity: 'low',
        status: 'active',
        reportedAt: now,
        expectedRecoveryDate: null,
        resolvedAt: null,
        notes: 'Visible to the assigned coach.',
        sharedWithCoach: true,
        createdByUserId: 'usr_parent1',
        updatedByUserId: 'usr_parent1',
        createdAt: now,
        updatedAt: now,
        version: 1,
      },
    );
    const coachHeaders = {
      'x-auth-user-id': 'usr_coach1',
      'x-auth-roles': 'coach',
      'x-acting-role': 'coach',
      'x-coach-athlete-ids': 'ath_user3',
      'x-coach-verified': '1',
    };

    const list = await app.inject({
      method: 'GET',
      url: '/v1/athletes/ath_user3/injuries',
      headers: coachHeaders,
    });
    assert.equal(list.statusCode, 200);
    const listed = list.json() as { injuries: { id: string; notes: string | null }[] };
    assert.equal(listed.injuries.some((injury) => injury.id === sharedInjuryId), true);
    assert.equal(listed.injuries.some((injury) => injury.id === privateInjuryId), false);
    assert.equal(listed.injuries.some((injury) => injury.notes === 'Must not reach a coach.'), false);

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/injuries/${privateInjuryId}`,
      headers: coachHeaders,
    });
    assert.equal(detail.statusCode, 403);

    const update = await app.inject({
      method: 'PATCH',
      url: `/v1/injuries/${privateInjuryId}`,
      headers: coachHeaders,
      payload: { status: 'resolved' },
    });
    assert.equal(update.statusCode, 403);

    const auditEvents = asRows(tables.auditEvents);
    assert.equal(
      auditEvents.some(
        (row) =>
          asString(row.action) === 'athlete_injury.read' &&
          asString(row.resourceId) === privateInjuryId &&
          asString(row.result) === 'DENY',
      ),
      true,
    );
    assert.equal(
      auditEvents.some(
        (row) =>
          asString(row.action) === 'athlete_injury.update' &&
          asString(row.resourceId) === privateInjuryId &&
          asString(row.result) === 'DENY',
      ),
      true,
    );
  });
});
