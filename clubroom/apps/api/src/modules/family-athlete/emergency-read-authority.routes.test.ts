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

function auditCount(tables: SeedTables, action: string): number {
  return asRows(tables.auditEvents).filter(
    (row) =>
      asString(row.action) === action &&
      asString(row.resourceId) === 'ath_user3' &&
      asString(row.result) === 'SUCCESS' &&
      row.sensitiveRead === true,
  ).length;
}

describe('emergency read authority', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
  });

  after(async () => {
    await app.close();
  });

  it('requires a verified assigned coach for every emergency-data read and audits the allowed reads', async () => {
    const tables = getMarketplaceSeedStore().tables as SeedTables;
    const baseHeaders = {
      'x-auth-user-id': 'usr_coach1',
      'x-auth-roles': 'coach',
      'x-acting-role': 'coach',
      'x-coach-athlete-ids': 'ath_user3',
    };

    const unverifiedMedical = await app.inject({
      method: 'GET',
      url: '/v1/athletes/ath_user3/medical',
      headers: baseHeaders,
    });
    const unverifiedContacts = await app.inject({
      method: 'GET',
      url: '/v1/athletes/ath_user3/emergency-contacts',
      headers: baseHeaders,
    });
    assert.equal(unverifiedMedical.statusCode, 403);
    assert.equal(unverifiedContacts.statusCode, 403);

    const verifiedHeaders = { ...baseHeaders, 'x-coach-verified': '1' };
    const verifiedMedical = await app.inject({
      method: 'GET',
      url: '/v1/athletes/ath_user3/medical',
      headers: verifiedHeaders,
    });
    const verifiedContacts = await app.inject({
      method: 'GET',
      url: '/v1/athletes/ath_user3/emergency-contacts',
      headers: verifiedHeaders,
    });
    assert.equal(verifiedMedical.statusCode, 200);
    assert.equal(verifiedContacts.statusCode, 200);

    assert.equal(auditCount(tables, 'medical.read'), 1);
    assert.equal(auditCount(tables, 'emergency_contacts.read'), 1);
    assert.equal(
      asRows(tables.securityEvents).filter(
        (row) => asString(row.eventType) === 'authz.request_denied',
      ).length,
      2,
    );
  });
});
