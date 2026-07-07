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

function authHeaders(userId: string): Record<string, string> {
  return {
    'x-auth-user-id': userId,
    'x-auth-roles': 'coach',
    'x-acting-role': 'coach',
  };
}

function findActors(tables: SeedTables): {
  coachUserId: string;
  otherOfferingId: string;
  nonCoachUserId: string;
} {
  const coachUserId = asString(asRows(tables.coachProfiles)[0]?.userId);
  assert.ok(coachUserId, 'expected seeded coach');

  const otherOfferingId = asRows(tables.coachingOfferings)
    .filter((row) => row.active !== false && !asString(row.deletedAt))
    .find((row) => asString(row.coachUserId) !== coachUserId)?.id;
  assert.equal(typeof otherOfferingId, 'string', 'expected another coach offering');

  const coachIds = new Set(
    asRows(tables.coachProfiles)
      .map((row) => asString(row.userId))
      .filter((userId): userId is string => Boolean(userId)),
  );
  const nonCoachUserId = asRows(tables.users)
    .map((row) => asString(row.id))
    .find((userId): userId is string => Boolean(userId && !coachIds.has(userId)));
  assert.ok(nonCoachUserId, 'expected seeded non-coach');

  return {
    coachUserId,
    otherOfferingId: otherOfferingId as string,
    nonCoachUserId,
  };
}

function auditCount(tables: SeedTables, action: string, result: string): number {
  return asRows(tables.auditEvents).filter(
    (row) => asString(row.action) === action && asString(row.result) === result,
  ).length;
}

describe('coach session template routes', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
    resetDbFixtureStoreForTests();
  });

  after(async () => {
    await app.close();
  });

  it('keeps CRUD self-owned, persists offerings, and audits mutations', async () => {
    const tables = getMarketplaceSeedStore().tables as SeedTables;
    const { coachUserId, otherOfferingId, nonCoachUserId } = findActors(tables);

    const list = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/session-templates',
      headers: authHeaders(coachUserId),
    });
    assert.equal(list.statusCode, 200);
    const listed = (
      list.json() as {
        templates: Array<{ coachId: string; type: string; skillsFocus: string[] }>;
      }
    ).templates;
    assert.ok(listed.length > 0);
    assert.ok(listed.every((template) => template.coachId === coachUserId));
    assert.ok(listed.some((template) => template.type === '1-to-1'));

    const otherCoachRead = await app.inject({
      method: 'GET',
      url: `/v1/coaches/me/session-templates/${otherOfferingId}`,
      headers: authHeaders(coachUserId),
    });
    assert.equal(otherCoachRead.statusCode, 404);

    const otherCoachUpdate = await app.inject({
      method: 'PATCH',
      url: `/v1/coaches/me/session-templates/${otherOfferingId}`,
      headers: authHeaders(coachUserId),
      payload: {
        name: 'Cannot edit this',
      },
    });
    assert.equal(otherCoachUpdate.statusCode, 404);

    const otherCoachDelete = await app.inject({
      method: 'DELETE',
      url: `/v1/coaches/me/session-templates/${otherOfferingId}`,
      headers: authHeaders(coachUserId),
    });
    assert.equal(otherCoachDelete.statusCode, 404);
    assert.equal(
      asRows(tables.coachingOfferings).find((row) => asString(row.id) === otherOfferingId)?.active,
      true,
    );

    const deniedCreate = await app.inject({
      method: 'POST',
      url: '/v1/coaches/me/session-templates',
      headers: authHeaders(nonCoachUserId),
      payload: {
        name: 'Unauthorized template',
        type: 'assessment',
        duration: 45,
        capacity: 1,
        defaultPrice: 20,
        skillsFocus: [],
      },
    });
    assert.equal(deniedCreate.statusCode, 404);

    const invalidCreate = await app.inject({
      method: 'POST',
      url: '/v1/coaches/me/session-templates',
      headers: authHeaders(coachUserId),
      payload: {
        name: 'No',
        type: 'clinic',
        duration: 5,
        capacity: 0,
        defaultPrice: -1,
        skillsFocus: [],
      },
    });
    assert.equal(invalidCreate.statusCode, 400);

    const created = await app.inject({
      method: 'POST',
      url: '/v1/coaches/me/session-templates',
      headers: authHeaders(coachUserId),
      payload: {
        name: 'Finishing clinic',
        type: 'clinic',
        duration: 90,
        capacity: 12,
        defaultPrice: 27.5,
        description: 'Finishing under pressure.',
        defaultLocation: 'Pitch 2',
        skillsFocus: ['Finishing', 'Movement'],
      },
    });
    assert.equal(created.statusCode, 201);
    const createdTemplate = (
      created.json() as {
        template: {
          id: string;
          coachId: string;
          name: string;
          defaultPrice: number;
          skillsFocus: string[];
        };
      }
    ).template;
    assert.equal(createdTemplate.coachId, coachUserId);
    assert.equal(createdTemplate.defaultPrice, 27.5);
    assert.deepEqual(createdTemplate.skillsFocus, ['Finishing', 'Movement']);

    const updated = await app.inject({
      method: 'PATCH',
      url: `/v1/coaches/me/session-templates/${createdTemplate.id}`,
      headers: authHeaders(coachUserId),
      payload: {
        name: 'Advanced finishing clinic',
        defaultPrice: 30,
        skillsFocus: ['Finishing'],
      },
    });
    assert.equal(updated.statusCode, 200);
    const updatedTemplate = (
      updated.json() as {
        template: { name: string; defaultPrice: number; skillsFocus: string[] };
      }
    ).template;
    assert.equal(updatedTemplate.name, 'Advanced finishing clinic');
    assert.equal(updatedTemplate.defaultPrice, 30);
    assert.deepEqual(updatedTemplate.skillsFocus, ['Finishing']);

    const stored = asRows(tables.coachingOfferings).find(
      (row) => asString(row.id) === createdTemplate.id,
    );
    assert.equal(asString(stored?.title), 'Advanced finishing clinic');
    assert.equal(stored?.priceMinor, 3000);
    assert.deepEqual(stored?.skillsFocus, ['Finishing']);

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/v1/coaches/me/session-templates/${createdTemplate.id}`,
      headers: authHeaders(coachUserId),
    });
    assert.equal(deleted.statusCode, 204);
    assert.equal(stored?.active, false);
    assert.equal(typeof stored?.deletedAt, 'string');

    assert.equal(auditCount(tables, 'coach_session_template.create', 'SUCCESS'), 1);
    assert.equal(auditCount(tables, 'coach_session_template.create', 'DENY'), 2);
    assert.equal(auditCount(tables, 'coach_session_template.update', 'SUCCESS'), 1);
    assert.equal(auditCount(tables, 'coach_session_template.update', 'DENY'), 1);
    assert.equal(auditCount(tables, 'coach_session_template.archive', 'SUCCESS'), 1);
    assert.equal(auditCount(tables, 'coach_session_template.archive', 'DENY'), 1);
  });

  it('exposes self offering create and patch through the v1 offerings contract', async () => {
    const tables = getMarketplaceSeedStore().tables as SeedTables;
    const { coachUserId, nonCoachUserId } = findActors(tables);

    const deniedCreate = await app.inject({
      method: 'POST',
      url: '/v1/coaches/me/offerings',
      headers: authHeaders(nonCoachUserId),
      payload: {
        title: 'Unauthorized direct offering',
        serviceType: 'assessment',
        durationMinutes: 45,
        capacity: 1,
        priceMinor: 2000,
        skillsFocus: [],
      },
    });
    assert.equal(deniedCreate.statusCode, 404);

    const created = await app.inject({
      method: 'POST',
      url: '/v1/coaches/me/offerings',
      headers: authHeaders(coachUserId),
      payload: {
        title: 'Direct finishing group',
        serviceType: 'small-group',
        durationMinutes: 75,
        capacity: 4,
        priceMinor: 3250,
        description: 'A direct offering route proof.',
        defaultLocation: 'Pitch 3',
        skillsFocus: ['Finishing', 'Movement'],
      },
    });
    assert.equal(created.statusCode, 201);
    const createdOffering = (
      created.json() as {
        offering: {
          id: string;
          coachUserId: string;
          title: string;
          serviceType: string;
          durationMinutes: number;
          capacity: number;
          priceMinor: number;
          skillsFocus: string[];
        };
      }
    ).offering;
    assert.equal(createdOffering.coachUserId, coachUserId);
    assert.equal(createdOffering.title, 'Direct finishing group');
    assert.equal(createdOffering.serviceType, 'small-group');
    assert.equal(createdOffering.durationMinutes, 75);
    assert.equal(createdOffering.capacity, 4);
    assert.equal(createdOffering.priceMinor, 3250);
    assert.deepEqual(createdOffering.skillsFocus, ['Finishing', 'Movement']);

    const updated = await app.inject({
      method: 'PATCH',
      url: `/v1/coaches/me/offerings/${createdOffering.id}`,
      headers: authHeaders(coachUserId),
      payload: {
        title: 'Direct advanced finishing',
        priceMinor: 4000,
        skillsFocus: ['Finishing'],
      },
    });
    assert.equal(updated.statusCode, 200);
    const updatedOffering = (
      updated.json() as {
        offering: { title: string; priceMinor: number; skillsFocus: string[] };
      }
    ).offering;
    assert.equal(updatedOffering.title, 'Direct advanced finishing');
    assert.equal(updatedOffering.priceMinor, 4000);
    assert.deepEqual(updatedOffering.skillsFocus, ['Finishing']);

    const stored = asRows(tables.coachingOfferings).find(
      (row) => asString(row.id) === createdOffering.id,
    );
    assert.equal(asString(stored?.title), 'Direct advanced finishing');
    assert.equal(stored?.priceMinor, 4000);
    assert.equal(stored?.durationMinutes, 75);
    assert.deepEqual(stored?.skillsFocus, ['Finishing']);

    const listed = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/offerings',
      headers: authHeaders(coachUserId),
    });
    assert.equal(listed.statusCode, 200);
    const listedPayload = listed.json() as {
      offerings: Array<{ id: string; title: string; priceMinor: number }>;
    };
    assert.ok(
      listedPayload.offerings.some(
        (offering) =>
          offering.id === createdOffering.id &&
          offering.title === 'Direct advanced finishing' &&
          offering.priceMinor === 4000,
      ),
    );

    assert.equal(auditCount(tables, 'coach_offering.create', 'SUCCESS'), 1);
    assert.equal(auditCount(tables, 'coach_offering.create', 'DENY'), 1);
    assert.equal(auditCount(tables, 'coach_offering.update', 'SUCCESS'), 1);
  });

  it('uses the db fixture store for the same self-owned CRUD contract', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const tables = getDbFixtureStore().tables as SeedTables;
      const { coachUserId } = findActors(tables);

      const created = await app.inject({
        method: 'POST',
        url: '/v1/coaches/me/session-templates',
        headers: authHeaders(coachUserId),
        payload: {
          name: 'DB fixture assessment',
          type: 'assessment',
          duration: 60,
          capacity: 2,
          defaultPrice: 40,
          skillsFocus: ['Assessment'],
        },
      });
      assert.equal(created.statusCode, 201);
      const templateId = (created.json() as { template: { id: string } }).template.id;

      const read = await app.inject({
        method: 'GET',
        url: `/v1/coaches/me/session-templates/${templateId}`,
        headers: authHeaders(coachUserId),
      });
      assert.equal(read.statusCode, 200);
      assert.equal(
        (read.json() as { template: { name: string } }).template.name,
        'DB fixture assessment',
      );

      const deleted = await app.inject({
        method: 'DELETE',
        url: `/v1/coaches/me/session-templates/${templateId}`,
        headers: authHeaders(coachUserId),
      });
      assert.equal(deleted.statusCode, 204);
      assert.equal(auditCount(tables, 'coach_session_template.create', 'SUCCESS'), 1);
      assert.equal(auditCount(tables, 'coach_session_template.archive', 'SUCCESS'), 1);
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });
});
