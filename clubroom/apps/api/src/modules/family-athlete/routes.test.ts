import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, beforeEach, describe, it } from 'node:test';
import { env } from '@clubroom/config';
import { buildApp } from '../../app.js';
import { resetAuthRuntimeForTests } from '../../lib/auth-runtime.js';
import { getDbFixtureStore, resetDbFixtureStoreForTests } from '../../lib/db-fixture-store.js';
import {
  getMarketplaceSeedStore,
  resetMarketplaceSeedStoreForTests,
} from '../../lib/marketplace-seed-store.js';
import { resetFamilyAthleteRouteStateForTests } from './routes.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

function auditEventsFor(
  tables: SeedTables,
  params: { action: string; resourceId?: string; result?: string },
): SeedRow[] {
  return asRows(tables.auditEvents).filter(
    (row) =>
      asString(row.action) === params.action &&
      (params.resourceId === undefined || asString(row.resourceId) === params.resourceId) &&
      (params.result === undefined || asString(row.result) === params.result),
  );
}

function ensureRows(tables: SeedTables, key: string): SeedRow[] {
  if (!Array.isArray(tables[key])) {
    tables[key] = [];
  }
  return tables[key];
}

function resolveDatasetPath(): string {
  const primary = path.resolve(
    process.cwd(),
    'docs/backend-api/test-data/marketplace/linked-dataset.json',
  );
  if (fs.existsSync(primary)) {
    return primary;
  }

  const fallback = path.resolve(
    process.cwd(),
    '../../docs/backend-api/test-data/marketplace/linked-dataset.json',
  );
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

describe('family-athlete routes', () => {
  const app = buildApp();

  beforeEach(() => {
    resetAuthRuntimeForTests();
    resetMarketplaceSeedStoreForTests();
    resetDbFixtureStoreForTests();
    resetFamilyAthleteRouteStateForTests();
  });

  after(async () => {
    await app.close();
  });

  it('creates and updates athletes for a family administrator', async () => {
    const tables = loadTables();
    const familyMembership = asRows(tables.familyMemberships)[0];
    assert.ok(familyMembership, 'expected seeded family membership');

    const familyId = asString(familyMembership.familyId) as string;
    const parentUserId = asString(familyMembership.userId) as string;
    const headers = {
      'x-auth-user-id': parentUserId,
      'x-auth-roles': rolesForUser(tables, parentUserId).join(',') || 'parent',
      'x-acting-role': rolesForUser(tables, parentUserId)[0] ?? 'parent',
    };

    const create = await app.inject({
      method: 'POST',
      url: '/v1/athletes',
      headers,
      payload: {
        familyId,
        firstName: 'New',
        lastName: 'Player',
        relationship: 'SON',
        gender: 'MALE',
        communicationNotes: 'Needs short instructions',
        trustData: {
          medical: {
            allergies: ['Peanuts'],
            conditions: ['Asthma'],
            medications: ['Inhaler'],
            restrictions: [],
          },
          emergencyContacts: {
            contacts: [
              {
                name: 'Pat Guardian',
                relationship: 'Parent',
                phone: '+447700900123',
                isPrimary: true,
                canPickup: true,
              },
            ],
          },
          consents: {
            consents: [
              { type: 'PHOTO', granted: false, grantedBy: 'Parent/Guardian' },
              { type: 'VIDEO', granted: true, grantedBy: 'Parent/Guardian' },
              { type: 'SOCIAL_MEDIA', granted: false, grantedBy: 'Parent/Guardian' },
              {
                type: 'EMERGENCY_TREATMENT',
                granted: true,
                grantedBy: 'Parent/Guardian',
              },
            ],
          },
        },
      },
    });
    assert.equal(create.statusCode, 201);
    const created = create.json() as {
      athleteId: string;
      firstName: string;
      communicationNotes: string | null;
    };
    assert.match(created.athleteId, /^ath_/);
    assert.equal(created.firstName, 'New');
    assert.equal(created.communicationNotes, 'Needs short instructions');
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'athlete.create',
        resourceId: created.athleteId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    const runtimeTables = getMarketplaceSeedStore().tables as SeedTables;
    const medicalRows = asRows(runtimeTables.childMedicalRecords).filter(
      (row) => asString(row.athleteId) === created.athleteId,
    );
    assert.equal(medicalRows.length, 1);
    assert.deepEqual(medicalRows[0]?.allergies, ['Peanuts']);
    const emergencyRows = asRows(runtimeTables.childEmergencyContacts).filter(
      (row) => asString(row.athleteId) === created.athleteId,
    );
    assert.equal(emergencyRows.length, 1);
    assert.equal(emergencyRows[0]?.isPrimary, true);
    const consentRows = asRows(runtimeTables.childConsents).filter(
      (row) => asString(row.athleteId) === created.athleteId,
    );
    assert.equal(consentRows.length, 4);
    assert.deepEqual(
      consentRows.map((row) => [row.consentType, row.granted]),
      [
        ['PHOTO', false],
        ['VIDEO', true],
        ['SOCIAL_MEDIA', false],
        ['EMERGENCY_TREATMENT', true],
      ],
    );
    assert.equal(
      auditEventsFor(runtimeTables, {
        action: 'medical.update',
        resourceId: created.athleteId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(runtimeTables, {
        action: 'emergency_contacts.update',
        resourceId: created.athleteId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.deepEqual(
      auditEventsFor(runtimeTables, {
        action: 'consents.update',
        resourceId: created.athleteId,
        result: 'SUCCESS',
      })[0]?.metadataJson,
      {
        source: 'athlete.create',
        count: 4,
        grantedTypes: ['VIDEO', 'EMERGENCY_TREATMENT'],
        deniedTypes: ['PHOTO', 'SOCIAL_MEDIA'],
      },
    );

    const update = await app.inject({
      method: 'PATCH',
      url: `/v1/athletes/${created.athleteId}`,
      headers,
      payload: {
        nickname: 'NP',
        disabilities: [
          {
            id: 'dis_support_update',
            type: 'ADHD',
            supportRequired: 'Short instructions',
            communicationPreferences: ['Visual cues'],
          },
        ],
        specialNeeds: [
          {
            id: 'sn_support_update',
            category: 'SENSORY',
            name: 'Noise adjustment',
            severity: 'MILD',
            accommodationsNeeded: ['Quiet arrival'],
          },
        ],
        communicationNotes: 'Use one instruction at a time',
        behavioralNotes: 'Settles better with early warmups',
      },
    });
    assert.equal(update.statusCode, 200);
    const updated = update.json() as {
      athleteId: string;
      nickname: string | null;
      disabilities: { type: string }[];
      specialNeeds: { name: string }[];
      communicationNotes: string | null;
      behavioralNotes: string | null;
    };
    assert.equal(updated.athleteId, created.athleteId);
    assert.equal(updated.nickname, 'NP');
    assert.equal(updated.disabilities[0]?.type, 'ADHD');
    assert.equal(updated.specialNeeds[0]?.name, 'Noise adjustment');
    assert.equal(updated.communicationNotes, 'Use one instruction at a time');
    assert.equal(updated.behavioralNotes, 'Settles better with early warmups');
    assert.deepEqual(
      auditEventsFor(runtimeTables, {
        action: 'athlete.update',
        resourceId: created.athleteId,
        result: 'SUCCESS',
      })[0]?.metadataJson,
      {
        familyId,
        fields: [
          'behavioralNotes',
          'communicationNotes',
          'disabilities',
          'nickname',
          'specialNeeds',
        ],
      },
    );

    const athleteBeforeRejectedPatch = asRows(runtimeTables.athletes).find(
      (row) => asString(row.id) === created.athleteId,
    );
    const versionBeforeRejectedPatch = athleteBeforeRejectedPatch?.version;
    const rejectedPatch = await app.inject({
      method: 'PATCH',
      url: `/v1/athletes/${created.athleteId}`,
      headers,
      payload: {
        dateOfBirth: 'not-a-date',
        privateOverride: 'must-not-be-stored-or-audited',
      },
    });
    assert.equal(rejectedPatch.statusCode, 400);
    const athleteAfterRejectedPatch = asRows(runtimeTables.athletes).find(
      (row) => asString(row.id) === created.athleteId,
    );
    assert.equal(athleteAfterRejectedPatch?.version, versionBeforeRejectedPatch);
    const rejectedPatchAudits = auditEventsFor(runtimeTables, {
      action: 'athlete.update',
      resourceId: created.athleteId,
      result: 'DENY',
    });
    assert.equal(rejectedPatchAudits.length, 1);
    assert.deepEqual(rejectedPatchAudits[0]?.metadataJson, {
      familyId,
      errorCode: 'VALIDATION_FAILED',
      requestedFields: ['dateOfBirth', 'privateOverride'],
    });
    assert.equal(
      JSON.stringify(rejectedPatchAudits[0]?.metadataJson).includes(
        'must-not-be-stored-or-audited',
      ),
      false,
    );

    const rejectedSupportPatch = await app.inject({
      method: 'PATCH',
      url: `/v1/athletes/${created.athleteId}`,
      headers,
      payload: {
        disabilities: [
          {
            id: 'dis_rejected',
            type: 'ADHD',
            communicationPreferences: Array.from({ length: 11 }, (_, index) => `cue-${index}`),
            privateSupportOverride: 'must-not-be-stored-or-audited',
          },
        ],
      },
    });
    assert.equal(rejectedSupportPatch.statusCode, 400);
    const athleteAfterRejectedSupportPatch = asRows(runtimeTables.athletes).find(
      (row) => asString(row.id) === created.athleteId,
    );
    assert.equal(athleteAfterRejectedSupportPatch?.version, versionBeforeRejectedPatch);
    const rejectedSupportPatchAudits = auditEventsFor(runtimeTables, {
      action: 'athlete.update',
      resourceId: created.athleteId,
      result: 'DENY',
    });
    assert.equal(rejectedSupportPatchAudits.length, 2);
    assert.deepEqual(rejectedSupportPatchAudits[1]?.metadataJson, {
      familyId,
      errorCode: 'VALIDATION_FAILED',
      requestedFields: ['disabilities'],
    });
    assert.equal(
      JSON.stringify(rejectedSupportPatchAudits[1]?.metadataJson).includes(
        'must-not-be-stored-or-audited',
      ),
      false,
    );

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${created.athleteId}`,
      headers,
    });
    assert.equal(detail.statusCode, 200);
    const detailPayload = detail.json() as { id: string; nickname: string | null };
    assert.equal(detailPayload.id, created.athleteId);
    assert.equal(detailPayload.nickname, 'NP');

    const family = await app.inject({
      method: 'GET',
      url: `/v1/families/${familyId}`,
      headers,
    });
    assert.equal(family.statusCode, 200);
    const familyPayload = family.json() as {
      athletes: Array<{ id: string; nickname: string | null; behavioralNotes: string | null }>;
    };
    const createdAthlete = familyPayload.athletes.find(
      (athlete) => athlete.id === created.athleteId,
    );
    assert.ok(createdAthlete, 'expected created athlete in family aggregate');
    assert.equal(createdAthlete?.nickname, 'NP');
    assert.equal(createdAthlete?.behavioralNotes, 'Settles better with early warmups');

    const remove = await app.inject({
      method: 'DELETE',
      url: `/v1/athletes/${created.athleteId}`,
      headers,
    });
    assert.equal(remove.statusCode, 204);
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'athlete.remove',
        resourceId: created.athleteId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'athlete.delete',
        resourceId: created.athleteId,
      }).length,
      0,
    );
  });

  it('rolls back athlete creation when trust-data initialization fails', async () => {
    const fixtureTables = loadTables();
    const familyMembership = asRows(fixtureTables.familyMemberships)[0];
    assert.ok(familyMembership, 'expected seeded family membership');

    const familyId = asString(familyMembership.familyId) as string;
    const parentUserId = asString(familyMembership.userId) as string;
    const tables = getMarketplaceSeedStore().tables as SeedTables;
    const medicalRows = asRows(tables.childMedicalRecords);
    const originalMedicalPush = medicalRows.push;
    const countsBefore = {
      athletes: asRows(tables.athletes).length,
      guardianLinks: asRows(tables.guardianChildLinks).length,
      senTags: asRows(tables.childSenTags).length,
      medical: medicalRows.length,
      contacts: asRows(tables.childEmergencyContacts).length,
      consents: asRows(tables.childConsents).length,
    };

    medicalRows.push = (() => {
      throw new Error('injected medical initialization failure');
    }) as typeof medicalRows.push;

    let response;
    try {
      response = await app.inject({
        method: 'POST',
        url: '/v1/athletes',
        headers: authHeaders(fixtureTables, parentUserId, 'parent'),
        payload: {
          familyId,
          firstName: 'Atomic',
          lastName: 'Rollback',
          relationship: 'WARD',
          gender: 'PREFER_NOT_TO_SAY',
          specialNeeds: [
            {
              category: 'OTHER',
              name: 'Rollback proof',
            },
          ],
          trustData: {
            medical: {
              allergies: ['Injected failure'],
            },
            emergencyContacts: {
              contacts: [
                {
                  name: 'Rollback Guardian',
                  relationship: 'Guardian',
                  phone: '+447700900456',
                },
              ],
            },
            consents: {
              consents: [{ type: 'PHOTO', granted: false, grantedBy: 'Parent/Guardian' }],
            },
          },
        },
      });
    } finally {
      medicalRows.push = originalMedicalPush;
    }

    assert.equal(response?.statusCode, 500);
    assert.deepEqual(
      {
        athletes: asRows(tables.athletes).length,
        guardianLinks: asRows(tables.guardianChildLinks).length,
        senTags: asRows(tables.childSenTags).length,
        medical: medicalRows.length,
        contacts: asRows(tables.childEmergencyContacts).length,
        consents: asRows(tables.childConsents).length,
      },
      countsBefore,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'athlete.create',
        resourceId: familyId,
        result: 'ERROR',
      }).length,
      1,
    );
  });

  it('denies athlete creation outside family admin scope without creating records', async () => {
    const tables = getMarketplaceSeedStore().tables;
    const membership = asRows(tables.familyMemberships).find((row) => {
      const familyId = asString(row.familyId);
      const userId = asString(row.userId);
      const role = asString(row.role)?.toLowerCase();
      const permissions = Array.isArray(row.permissions)
        ? row.permissions.map((permission) => String(permission).toLowerCase())
        : [];
      const assignedIds = Array.isArray(row.childAccessAthleteIds)
        ? row.childAccessAthleteIds.map(String)
        : [];
      const family = asRows(tables.families).find(
        (candidate) => asString(candidate.id) === familyId && !asString(candidate.deletedAt),
      );
      return Boolean(
        familyId &&
        userId &&
        family &&
        role !== 'owner' &&
        role !== 'admin' &&
        asString(family.primaryGuardianUserId) !== userId &&
        !permissions.includes('admin') &&
        assignedIds.length > 0 &&
        !asString(row.deletedAt),
      );
    });
    assert.ok(membership, 'expected an assigned non-admin guardian');

    const familyId = asString(membership.familyId) as string;
    const guardianUserId = asString(membership.userId) as string;
    const familyMemberIds = new Set(
      asRows(tables.familyMemberships)
        .filter((row) => asString(row.familyId) === familyId && !asString(row.deletedAt))
        .map((row) => asString(row.userId))
        .filter((userId): userId is string => Boolean(userId)),
    );
    const unrelatedUserId = asRows(tables.users)
      .map((row) => asString(row.id))
      .find((userId): userId is string => Boolean(userId && !familyMemberIds.has(userId)));
    assert.ok(unrelatedUserId, 'expected an unrelated authenticated user');

    const athleteCountBefore = asRows(tables.athletes).length;
    const guardianLinkCountBefore = asRows(tables.guardianChildLinks).length;
    for (const [userId, firstName] of [
      [guardianUserId, 'Assigned'],
      [unrelatedUserId, 'Unrelated'],
    ] as const) {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/athletes',
        headers: authHeaders(tables, userId, 'parent'),
        payload: {
          familyId,
          firstName,
          lastName: 'Denied',
          relationship: 'WARD',
          gender: 'PREFER_NOT_TO_SAY',
        },
      });
      assert.equal(response.statusCode, 403);
    }
    assert.equal(asRows(tables.athletes).length, athleteCountBefore);
    assert.equal(asRows(tables.guardianChildLinks).length, guardianLinkCountBefore);
    assert.equal(
      auditEventsFor(tables, {
        action: 'athlete.create',
        resourceId: familyId,
        result: 'DENY',
      }).length,
      2,
    );

    membership.permissions = [
      ...new Set([
        ...(Array.isArray(membership.permissions) ? membership.permissions.map(String) : []),
        'admin',
      ]),
    ];
    const delegatedAdminCreate = await app.inject({
      method: 'POST',
      url: '/v1/athletes',
      headers: authHeaders(tables, guardianUserId, 'parent'),
      payload: {
        familyId,
        firstName: 'Delegated',
        lastName: 'Admin',
        relationship: 'WARD',
        gender: 'PREFER_NOT_TO_SAY',
      },
    });
    assert.equal(delegatedAdminCreate.statusCode, 201);
    const delegatedAdminAthleteId = (delegatedAdminCreate.json() as { athleteId: string })
      .athleteId;
    assert.equal(asRows(tables.athletes).length, athleteCountBefore + 1);
    assert.equal(asRows(tables.guardianChildLinks).length, guardianLinkCountBefore + 1);
    assert.equal(
      auditEventsFor(tables, {
        action: 'athlete.create',
        resourceId: delegatedAdminAthleteId,
        result: 'SUCCESS',
      }).length,
      1,
    );
  });

  it('limits non-owner family reads to explicitly assigned children', async () => {
    const tables = getMarketplaceSeedStore().tables;
    const membership = asRows(tables.familyMemberships).find((row) => {
      const familyId = asString(row.familyId);
      const userId = asString(row.userId);
      const assignedIds = Array.isArray(row.childAccessAthleteIds)
        ? row.childAccessAthleteIds.map(String)
        : [];
      if (
        !familyId ||
        !userId ||
        asString(row.role)?.toLowerCase() === 'owner' ||
        assignedIds.length === 0 ||
        asString(row.deletedAt)
      ) {
        return false;
      }
      const familyAthleteIds = new Set(
        asRows(tables.guardianChildLinks)
          .filter((link) => asString(link.familyId) === familyId && !asString(link.deletedAt))
          .map((link) => asString(link.athleteId))
          .filter((athleteId): athleteId is string => Boolean(athleteId)),
      );
      return [...familyAthleteIds].some((athleteId) => !assignedIds.includes(athleteId));
    });
    assert.ok(membership, 'expected a family member with restricted child access');

    const familyId = asString(membership.familyId) as string;
    const memberUserId = asString(membership.userId) as string;
    const assignedIds = (membership.childAccessAthleteIds as unknown[]).map(String);
    const familyAthleteIds = [
      ...new Set(
        asRows(tables.guardianChildLinks)
          .filter((link) => asString(link.familyId) === familyId && !asString(link.deletedAt))
          .map((link) => asString(link.athleteId))
          .filter((athleteId): athleteId is string => Boolean(athleteId)),
      ),
    ];
    const hiddenAthleteId = familyAthleteIds.find((athleteId) => !assignedIds.includes(athleteId));
    assert.ok(hiddenAthleteId, 'expected an unassigned family athlete');
    ensureRows(tables, 'familyGuardianInvites').push({
      id: 'ginv_hidden_child_scope',
      familyId,
      inviteeEmail: 'hidden-child-invite@clubroom.demo',
      role: 'GUARDIAN',
      permissions: ['VIEW_SCHEDULE'],
      relationshipLabel: 'Guardian',
      childAccessAthleteIds: [hiddenAthleteId],
      status: 'PENDING',
      invitedByUserId: memberUserId,
      createdAt: new Date().toISOString(),
      expiresAt: '2099-01-01T00:00:00.000Z',
      deletedAt: null,
    });

    const headers = authHeaders(tables, memberUserId, 'parent');
    const family = await app.inject({
      method: 'GET',
      url: `/v1/families/${familyId}`,
      headers,
    });
    assert.equal(family.statusCode, 200);
    const familyPayload = family.json() as {
      athletes: Array<{ id: string }>;
      memberships: Array<{ childAccessAthleteIds: string[] }>;
      guardianInvites: unknown[];
    };
    const visibleAthleteIds = familyPayload.athletes.map((athlete) => athlete.id);
    assert.deepEqual(new Set(visibleAthleteIds), new Set(assignedIds));
    assert.equal(
      familyPayload.memberships.every((familyMembership) =>
        familyMembership.childAccessAthleteIds.every((athleteId) =>
          visibleAthleteIds.includes(athleteId),
        ),
      ),
      true,
    );
    assert.deepEqual(familyPayload.guardianInvites, []);
    assert.equal(JSON.stringify(familyPayload).includes(hiddenAthleteId), false);

    const assignedDetail = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${assignedIds[0]}`,
      headers,
    });
    assert.equal(assignedDetail.statusCode, 200);

    const hiddenDetail = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${hiddenAthleteId}`,
      headers,
    });
    assert.equal(hiddenDetail.statusCode, 403);

    const deniedAssignedUpdate = await app.inject({
      method: 'PATCH',
      url: `/v1/athletes/${assignedIds[0]}`,
      headers,
      payload: {
        nickname: 'Blocked',
      },
    });
    assert.equal(deniedAssignedUpdate.statusCode, 403);

    const deniedAssignedRemove = await app.inject({
      method: 'DELETE',
      url: `/v1/athletes/${assignedIds[0]}`,
      headers,
    });
    assert.equal(deniedAssignedRemove.statusCode, 403);

    membership.permissions = [...new Set([...(membership.permissions as string[]), 'medical'])];
    const allowedAssignedUpdate = await app.inject({
      method: 'PATCH',
      url: `/v1/athletes/${assignedIds[0]}`,
      headers,
      payload: {
        nickname: 'Allowed',
      },
    });
    assert.equal(allowedAssignedUpdate.statusCode, 200);

    const deniedAssignedRemoveWithProfilePermission = await app.inject({
      method: 'DELETE',
      url: `/v1/athletes/${assignedIds[0]}`,
      headers,
    });
    assert.equal(deniedAssignedRemoveWithProfilePermission.statusCode, 403);

    const deniedHiddenUpdate = await app.inject({
      method: 'PATCH',
      url: `/v1/athletes/${hiddenAthleteId}`,
      headers,
      payload: {
        nickname: 'Still blocked',
      },
    });
    assert.equal(deniedHiddenUpdate.statusCode, 403);

    const deniedHiddenRemove = await app.inject({
      method: 'DELETE',
      url: `/v1/athletes/${hiddenAthleteId}`,
      headers,
    });
    assert.equal(deniedHiddenRemove.statusCode, 403);
    assert.equal(
      auditEventsFor(tables, {
        action: 'athlete.update',
        result: 'DENY',
      }).length,
      2,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'athlete.update',
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'athlete.remove',
        result: 'DENY',
      }).length,
      3,
    );

    membership.permissions = ['admin'];
    const delegatedAdminFamily = await app.inject({
      method: 'GET',
      url: `/v1/families/${familyId}`,
      headers,
    });
    assert.equal(delegatedAdminFamily.statusCode, 200);
    const delegatedAdminPayload = delegatedAdminFamily.json() as {
      athletes: Array<{ id: string }>;
      guardianInvites: Array<{ id: string }>;
    };
    assert.deepEqual(
      new Set(delegatedAdminPayload.athletes.map((athlete) => athlete.id)),
      new Set(familyAthleteIds),
    );
    assert.equal(
      delegatedAdminPayload.guardianInvites.some(
        (invite) => invite.id === 'ginv_hidden_child_scope',
      ),
      true,
    );

    const delegatedAdminUpdate = await app.inject({
      method: 'PATCH',
      url: `/v1/athletes/${hiddenAthleteId}`,
      headers,
      payload: {
        nickname: 'Admin allowed',
      },
    });
    assert.equal(delegatedAdminUpdate.statusCode, 200);
  });

  it('projects legacy SEN tags when detailed support JSON is absent', async () => {
    const tables = getMarketplaceSeedStore().tables;
    const tag = asRows(tables.childSenTags).find(
      (row) =>
        !asString(row.deletedAt) && Boolean(asString(row.athleteId)) && Boolean(asString(row.tag)),
    );
    assert.ok(tag, 'expected a current legacy SEN tag');

    const athleteId = asString(tag.athleteId) as string;
    const athlete = asRows(tables.athletes).find((row) => asString(row.id) === athleteId);
    assert.ok(athlete, 'expected the tagged athlete');
    assert.equal(
      Array.isArray(athlete.specialNeedsJson) && athlete.specialNeedsJson.length > 0,
      false,
    );

    const guardianLink = asRows(tables.guardianChildLinks).find(
      (row) => asString(row.athleteId) === athleteId && !asString(row.deletedAt),
    );
    assert.ok(guardianLink, 'expected a current guardian link');

    const response = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}`,
      headers: authHeaders(tables, asString(guardianLink.guardianUserId) as string, 'parent'),
    });
    assert.equal(response.statusCode, 200);
    const payload = response.json() as {
      specialNeeds: { id?: string; category: string; name: string; severity?: string }[];
    };
    assert.equal(
      payload.specialNeeds.some(
        (need) =>
          need.id === asString(tag.id) &&
          need.category === 'OTHER' &&
          need.name === asString(tag.tag) &&
          need.severity === (tag.isCritical === true ? 'SEVERE' : undefined),
      ),
      true,
    );
  });

  it('denies direct athlete access when the linked family is archived', async () => {
    const tables = getMarketplaceSeedStore().tables;
    const family = asRows(tables.families).find(
      (row) => asString(row.id) && asString(row.primaryGuardianUserId) && !asString(row.deletedAt),
    );
    assert.ok(family, 'expected active seeded family');
    const familyId = asString(family.id) as string;
    const guardianUserId = asString(family.primaryGuardianUserId) as string;
    const link = asRows(tables.guardianChildLinks).find(
      (row) =>
        asString(row.familyId) === familyId && asString(row.athleteId) && !asString(row.deletedAt),
    );
    assert.ok(link, 'expected family athlete link');
    const athleteId = asString(link.athleteId) as string;
    family.deletedAt = new Date().toISOString();
    const headers = authHeaders(tables, guardianUserId, 'parent');

    const aggregate = await app.inject({
      method: 'GET',
      url: `/v1/families/${familyId}`,
      headers,
    });
    assert.equal(aggregate.statusCode, 404);

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}`,
      headers,
    });
    assert.equal(detail.statusCode, 404);

    const update = await app.inject({
      method: 'PATCH',
      url: `/v1/athletes/${athleteId}`,
      headers,
      payload: {
        nickname: 'Blocked archived family update',
      },
    });
    assert.equal(update.statusCode, 404);

    const remove = await app.inject({
      method: 'DELETE',
      url: `/v1/athletes/${athleteId}`,
      headers,
    });
    assert.equal(remove.statusCode, 404);
  });

  it('denies athlete create for users outside the family', async () => {
    const tables = loadTables();
    const familyMembership = asRows(tables.familyMemberships)[0];
    assert.ok(familyMembership, 'expected seeded family membership');

    const familyId = asString(familyMembership.familyId) as string;
    const outsider = asRows(tables.users).find((row) => {
      const userId = asString(row.id);
      if (!userId) {
        return false;
      }
      return !asRows(tables.familyMemberships).some(
        (membership) =>
          asString(membership.familyId) === familyId && asString(membership.userId) === userId,
      );
    });
    assert.ok(outsider, 'expected outsider');

    const denied = await app.inject({
      method: 'POST',
      url: '/v1/athletes',
      headers: {
        'x-auth-user-id': asString(outsider.id) as string,
        'x-auth-roles': rolesForUser(tables, asString(outsider.id) as string).join(',') || 'coach',
        'x-acting-role': rolesForUser(tables, asString(outsider.id) as string)[0] ?? 'coach',
      },
      payload: {
        familyId,
        firstName: 'Blocked',
        lastName: 'User',
      },
    });
    assert.equal(denied.statusCode, 403);
  });

  it('returns family no-show count from backend proof and blocks unrelated users', async () => {
    const tables = getMarketplaceSeedStore().tables as SeedTables;
    const link = asRows(tables.guardianChildLinks).find(
      (row) => asString(row.familyId) && asString(row.athleteId) && !asString(row.deletedAt),
    );
    assert.ok(link, 'expected seeded family athlete link');
    const familyId = asString(link.familyId) as string;
    const athleteId = asString(link.athleteId) as string;
    const familyMembership = asRows(tables.familyMemberships).find(
      (row) => asString(row.familyId) === familyId && !asString(row.deletedAt),
    );
    assert.ok(familyMembership, 'expected seeded family membership');
    const parentUserId = asString(familyMembership.userId) as string;
    const outsider = asRows(tables.users).find((row) => {
      const userId = asString(row.id);
      return Boolean(
        userId &&
        userId !== parentUserId &&
        !asRows(tables.familyMemberships).some(
          (membership) =>
            asString(membership.familyId) === familyId && asString(membership.userId) === userId,
        ),
      );
    });
    assert.ok(outsider, 'expected outsider');

    const now = new Date().toISOString();
    ensureRows(tables, 'attendanceRecords').push(
      {
        id: 'att_no_show_dedup',
        athleteId,
        bookingId: null,
        groupSessionId: 'grp_no_show_dedup',
        status: 'NO_SHOW',
        notes: 'No-show proof from attendance',
        recordedByUserId: parentUserId,
        recordedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'att_attended_ignored',
        athleteId,
        bookingId: 'bok_attended_ignored',
        groupSessionId: null,
        status: 'ATTENDED',
        notes: 'Should not count',
        recordedByUserId: parentUserId,
        recordedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    );
    ensureRows(tables, 'groupSessionRegistrations').push(
      {
        id: 'gsr_no_show_dedup',
        groupSessionId: 'grp_no_show_dedup',
        athleteId,
        parentUserId,
        status: 'NO_SHOW',
        createdByUserId: parentUserId,
        updatedByUserId: parentUserId,
        registeredAt: now,
        updatedAt: now,
        deletedAt: null,
      },
      {
        id: 'gsr_no_show_unique',
        groupSessionId: 'grp_no_show_unique',
        athleteId,
        parentUserId,
        status: 'NO_SHOW',
        createdByUserId: parentUserId,
        updatedByUserId: parentUserId,
        registeredAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    );

    const allowed = await app.inject({
      method: 'GET',
      url: `/v1/families/${familyId}/no-shows`,
      headers: authHeaders(tables, parentUserId, 'parent'),
    });
    assert.equal(allowed.statusCode, 200);
    const payload = allowed.json() as {
      familyId: string;
      count: number;
      attendanceRecordCount: number;
      groupRegistrationCount: number;
    };
    assert.equal(payload.familyId, familyId);
    assert.equal(payload.count, 2);
    assert.equal(payload.attendanceRecordCount, 1);
    assert.equal(payload.groupRegistrationCount, 2);

    const denied = await app.inject({
      method: 'GET',
      url: `/v1/families/${familyId}/no-shows`,
      headers: authHeaders(tables, asString(outsider.id) as string),
    });
    assert.equal(denied.statusCode, 403);

    assert.equal(
      auditEventsFor(tables, {
        action: 'family_no_shows.read',
        resourceId: familyId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'family_no_shows.read',
        resourceId: familyId,
        result: 'DENY',
      }).length,
      1,
    );
  });

  it('records and clears family no-show proof with audit events', async () => {
    const tables = getMarketplaceSeedStore().tables as SeedTables;
    const familyMembership = asRows(tables.familyMemberships).find(
      (row) =>
        asString(row.familyId) &&
        asString(row.userId) &&
        asString(row.role)?.toLowerCase() !== 'owner' &&
        Array.isArray(row.childAccessAthleteIds) &&
        row.childAccessAthleteIds.length > 0 &&
        !asString(row.deletedAt),
    );
    assert.ok(familyMembership, 'expected seeded restricted guardian membership');
    const familyId = asString(familyMembership.familyId) as string;
    const parentUserId = asString(familyMembership.userId) as string;
    const assignedAthleteIds = (familyMembership.childAccessAthleteIds as unknown[]).map(String);
    const athleteId = assignedAthleteIds.find((candidateAthleteId) =>
      asRows(tables.guardianChildLinks).some(
        (row) =>
          asString(row.familyId) === familyId &&
          asString(row.athleteId) === candidateAthleteId &&
          asString(row.guardianUserId) === parentUserId &&
          !asString(row.deletedAt),
      ),
    );
    assert.ok(athleteId, 'expected assigned athlete link');
    const hiddenAthleteId = asRows(tables.guardianChildLinks)
      .filter((row) => asString(row.familyId) === familyId && !asString(row.deletedAt))
      .map((row) => asString(row.athleteId))
      .find((candidateAthleteId): candidateAthleteId is string =>
        Boolean(candidateAthleteId && !assignedAthleteIds.includes(candidateAthleteId)),
      );
    assert.ok(hiddenAthleteId, 'expected an unassigned family athlete');
    const coachUserId = asString(
      asRows(tables.userRoleMemberships).find((row) => asString(row.role) === 'coach')?.userId,
    ) as string;
    assert.ok(coachUserId, 'expected seeded coach');
    const now = new Date().toISOString();
    const sessionId = 'grp_family_no_show_patch';
    const registrationId = 'gsr_family_no_show_patch';

    ensureRows(tables, 'groupSessions').push({
      id: sessionId,
      coachUserId,
      clubId: null,
      squadId: null,
      title: 'Family no-show patch proof',
      description: null,
      sessionType: 'training',
      maxParticipants: 12,
      currentParticipants: 1,
      offPlatformParticipants: 0,
      waitlistEnabled: true,
      waitlistCount: 0,
      pricePerParticipantMinor: null,
      currency: 'GBP',
      status: 'PUBLISHED',
      scheduleJson: [{ date: '2026-07-03', startTime: '17:00', endTime: '18:00' }],
      createdByUserId: coachUserId,
      updatedByUserId: coachUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    ensureRows(tables, 'groupSessionRegistrations').push({
      id: registrationId,
      groupSessionId: sessionId,
      athleteId,
      parentUserId,
      status: 'REGISTERED',
      createdByUserId: parentUserId,
      updatedByUserId: parentUserId,
      registeredAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    const baseline = await app.inject({
      method: 'GET',
      url: `/v1/families/${familyId}/no-shows`,
      headers: authHeaders(tables, parentUserId, 'parent'),
    });
    assert.equal(baseline.statusCode, 200);
    const baselinePayload = baseline.json() as { count: number };
    ensureRows(tables, 'attendanceRecords').push({
      id: 'att_hidden_family_no_show',
      athleteId: hiddenAthleteId,
      bookingId: 'bok_hidden_family_no_show',
      groupSessionId: null,
      status: 'NO_SHOW',
      notes: 'Must not appear in restricted guardian counts',
      recordedByUserId: coachUserId,
      recordedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const before = await app.inject({
      method: 'GET',
      url: `/v1/families/${familyId}/no-shows`,
      headers: authHeaders(tables, parentUserId, 'parent'),
    });
    assert.equal(before.statusCode, 200);
    const beforePayload = before.json() as { count: number };
    assert.equal(beforePayload.count, baselinePayload.count);

    familyMembership.permissions = ['messages'];
    const deniedReadOnlyRecord = await app.inject({
      method: 'PATCH',
      url: `/v1/families/${familyId}/no-shows`,
      headers: authHeaders(tables, parentUserId, 'parent'),
      payload: {
        action: 'record',
        athleteId,
        groupSessionRegistrationId: registrationId,
        date: '2026-07-03',
      },
    });
    assert.equal(deniedReadOnlyRecord.statusCode, 403);
    familyMembership.permissions = ['book'];

    const recorded = await app.inject({
      method: 'PATCH',
      url: `/v1/families/${familyId}/no-shows`,
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        action: 'record',
        athleteId,
        groupSessionRegistrationId: registrationId,
        date: '2026-07-03',
        notes: 'Missed session',
      },
    });
    assert.equal(recorded.statusCode, 200);
    const recordedPayload = recorded.json() as {
      count: number;
      action: string;
      proof: { kind: string; registrationId: string };
    };
    assert.equal(recordedPayload.action, 'record');
    assert.equal(recordedPayload.count, beforePayload.count + 1);
    assert.equal(recordedPayload.proof.kind, 'group_registration');
    assert.equal(recordedPayload.proof.registrationId, registrationId);

    const registration = ensureRows(tables, 'groupSessionRegistrations').find(
      (row) => asString(row.id) === registrationId,
    );
    assert.equal(asString(registration?.status), 'NO_SHOW');
    const attendance = ensureRows(tables, 'attendanceRecords').find(
      (row) =>
        asString(row.groupSessionId) === sessionId &&
        asString(row.athleteId) === athleteId &&
        asString(row.status) === 'NO_SHOW',
    );
    assert.ok(attendance, 'expected no-show attendance proof');

    const parentLink = asRows(tables.guardianChildLinks).find(
      (row) =>
        asString(row.familyId) === familyId &&
        asString(row.athleteId) === athleteId &&
        asString(row.guardianUserId) === parentUserId &&
        !asString(row.deletedAt),
    );
    assert.ok(parentLink, 'expected current parent-athlete link');
    parentLink.deletedAt = new Date().toISOString();
    const deniedRevokedGuardianClear = await app.inject({
      method: 'PATCH',
      url: `/v1/families/${familyId}/no-shows`,
      headers: authHeaders(tables, parentUserId, 'parent'),
      payload: {
        action: 'clear',
        athleteId,
        groupSessionRegistrationId: registrationId,
        date: '2026-07-03',
      },
    });
    assert.equal(deniedRevokedGuardianClear.statusCode, 403);
    parentLink.deletedAt = null;

    const cleared = await app.inject({
      method: 'PATCH',
      url: `/v1/families/${familyId}/no-shows`,
      headers: authHeaders(tables, parentUserId, 'parent'),
      payload: {
        action: 'clear',
        athleteId,
        groupSessionRegistrationId: registrationId,
        date: '2026-07-03',
        notes: 'Coach corrected attendance',
      },
    });
    assert.equal(cleared.statusCode, 200);
    const clearedPayload = cleared.json() as { count: number; proof: { clearedRecords: number } };
    assert.equal(clearedPayload.count, beforePayload.count);
    assert.equal(clearedPayload.proof.clearedRecords, 1);
    assert.equal(asString(registration?.status), 'REGISTERED');
    assert.equal(asString(attendance?.status), 'NO_SHOW_CLEARED');

    assert.equal(
      auditEventsFor(tables, {
        action: 'family_no_shows.record',
        resourceId: familyId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'family_no_shows.clear',
        resourceId: familyId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'family_no_shows.record',
        resourceId: familyId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'family_no_shows.clear',
        resourceId: familyId,
        result: 'DENY',
      }).length,
      1,
    );
  });

  it('audits denied athlete removal attempts as remove, not delete', async () => {
    const tables = loadTables();
    const link = asRows(tables.guardianChildLinks).find(
      (row) => asString(row.athleteId) && asString(row.familyId) && !asString(row.deletedAt),
    );
    assert.ok(link, 'expected seeded guardian child link');

    const athleteId = asString(link.athleteId) as string;
    const familyId = asString(link.familyId) as string;
    const outsider = asRows(tables.users).find((row) => {
      const userId = asString(row.id);
      if (!userId) {
        return false;
      }
      return !asRows(tables.familyMemberships).some(
        (membership) =>
          asString(membership.familyId) === familyId && asString(membership.userId) === userId,
      );
    });
    assert.ok(outsider, 'expected outsider');

    const denied = await app.inject({
      method: 'DELETE',
      url: `/v1/athletes/${athleteId}`,
      headers: authHeaders(tables, asString(outsider.id) as string),
    });
    assert.equal(denied.statusCode, 403);
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'athlete.remove',
        resourceId: athleteId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'athlete.delete',
        resourceId: athleteId,
      }).length,
      0,
    );
  });

  it('lists athlete squad memberships for family-authorized users and denies outsiders', async () => {
    const tables = loadTables();
    const squadMembership = asRows(tables.squadMemberships).find((row) => {
      const athleteId = asString(row.athleteId);
      const squadId = asString(row.squadId);
      const familyId = asString(
        asRows(tables.guardianChildLinks).find(
          (link) => asString(link.athleteId) === athleteId && !asString(link.deletedAt),
        )?.familyId,
      );
      const family = asRows(tables.families).find(
        (candidate) => asString(candidate.id) === familyId && !asString(candidate.deletedAt),
      );
      const hasFamilyAuthorityWithoutDirectLink = asRows(tables.familyMemberships).some(
        (membership) => {
          const userId = asString(membership.userId);
          const role = asString(membership.role)?.toLowerCase();
          const permissions = Array.isArray(membership.permissions)
            ? membership.permissions.map((permission) => String(permission).toLowerCase())
            : [];
          return Boolean(
            userId &&
            asString(membership.familyId) === familyId &&
            !asString(membership.deletedAt) &&
            (role === 'owner' ||
              role === 'admin' ||
              asString(family?.primaryGuardianUserId) === userId ||
              permissions.includes('admin')) &&
            !asRows(tables.guardianChildLinks).some(
              (link) =>
                asString(link.athleteId) === athleteId &&
                asString(link.guardianUserId) === userId &&
                !asString(link.deletedAt),
            ),
          );
        },
      );
      return (
        athleteId &&
        squadId &&
        familyId &&
        hasFamilyAuthorityWithoutDirectLink &&
        !asString(row.deletedAt) &&
        asString(row.status)?.toLowerCase() !== 'inactive' &&
        asRows(tables.guardianChildLinks).some(
          (link) => asString(link.athleteId) === athleteId && !asString(link.deletedAt),
        ) &&
        asRows(tables.squads).some(
          (squad) => asString(squad.id) === squadId && !asString(squad.deletedAt),
        )
      );
    });
    assert.ok(squadMembership, 'expected seeded squad membership');

    const athleteId = asString(squadMembership.athleteId) as string;
    const squadId = asString(squadMembership.squadId) as string;
    const guardianUserId = asString(
      asRows(tables.guardianChildLinks).find(
        (link) => asString(link.athleteId) === athleteId && !asString(link.deletedAt),
      )?.guardianUserId,
    ) as string;
    const squad = asRows(tables.squads).find((row) => asString(row.id) === squadId);
    const athleteUserId = asString(
      asRows(tables.athletes).find((row) => asString(row.id) === athleteId)?.userId,
    );
    const familyId = asString(
      asRows(tables.guardianChildLinks).find(
        (link) => asString(link.athleteId) === athleteId && !asString(link.deletedAt),
      )?.familyId,
    ) as string;
    assert.ok(guardianUserId, 'expected linked guardian');
    assert.ok(familyId, 'expected athlete family');
    assert.ok(squad, 'expected linked squad');

    const allowed = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/squad-memberships`,
      headers: authHeaders(tables, guardianUserId, 'parent'),
    });
    assert.equal(allowed.statusCode, 200);
    const payload = allowed.json() as {
      athleteId: string;
      memberships: Array<{ id: string; squadId: string; clubId: string; status: string }>;
    };
    assert.equal(payload.athleteId, athleteId);
    assert.equal(
      payload.memberships.some((membership) => membership.squadId === squadId),
      true,
    );
    assert.equal(
      payload.memberships.find((membership) => membership.squadId === squadId)?.clubId,
      asString(squad.clubId),
    );
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'athlete_squad_membership.list',
        resourceId: athleteId,
        result: 'SUCCESS',
      }).length >= 1,
      true,
    );

    const family = asRows(tables.families).find(
      (row) => asString(row.id) === familyId && !asString(row.deletedAt),
    );
    const familyAuthorizedMembership = asRows(tables.familyMemberships).find((membership) => {
      const userId = asString(membership.userId);
      const role = asString(membership.role)?.toLowerCase();
      const permissions = Array.isArray(membership.permissions)
        ? membership.permissions.map((permission) => String(permission).toLowerCase())
        : [];
      return Boolean(
        userId &&
        asString(membership.familyId) === familyId &&
        !asString(membership.deletedAt) &&
        (role === 'owner' ||
          role === 'admin' ||
          asString(family?.primaryGuardianUserId) === userId ||
          permissions.includes('admin')) &&
        !asRows(tables.guardianChildLinks).some(
          (link) =>
            asString(link.athleteId) === athleteId &&
            asString(link.guardianUserId) === userId &&
            !asString(link.deletedAt),
        ),
      );
    });
    assert.ok(
      familyAuthorizedMembership,
      'expected family authority without a direct guardian link',
    );

    const familyAuthorized = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/squad-memberships`,
      headers: authHeaders(tables, asString(familyAuthorizedMembership.userId) as string, 'parent'),
    });
    assert.equal(familyAuthorized.statusCode, 200);
    assert.equal(
      (
        familyAuthorized.json() as {
          memberships: Array<{ squadId: string }>;
        }
      ).memberships.some((membership) => membership.squadId === squadId),
      true,
    );

    const outsider = asRows(tables.users).find((row) => {
      const userId = asString(row.id);
      if (!userId || userId === guardianUserId || userId === athleteUserId) {
        return false;
      }
      const roles = rolesForUser(tables, userId);
      return (
        !roles.includes('club_admin') &&
        !roles.includes('security_admin') &&
        !asRows(tables.familyMemberships).some(
          (membership) =>
            asString(membership.familyId) === familyId &&
            asString(membership.userId) === userId &&
            !asString(membership.deletedAt),
        ) &&
        !asRows(tables.guardianChildLinks).some(
          (link) =>
            asString(link.athleteId) === athleteId &&
            asString(link.guardianUserId) === userId &&
            !asString(link.deletedAt),
        )
      );
    });
    assert.ok(outsider, 'expected outsider user');

    const denied = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/squad-memberships`,
      headers: authHeaders(tables, asString(outsider.id) as string, 'parent'),
    });
    assert.equal(denied.statusCode, 403);
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'athlete_squad_membership.list',
        resourceId: athleteId,
        result: 'DENY',
      }).length >= 1,
      true,
    );
  });

  it('fails closed for athlete profile routes in db mode when Prisma is unavailable', async () => {
    const tables = loadTables();
    const familyMembership = asRows(tables.familyMemberships)[0];
    assert.ok(familyMembership, 'expected seeded family membership');

    const familyId = asString(familyMembership.familyId) as string;
    const parentUserId = asString(familyMembership.userId) as string;
    const athleteId = asRows(tables.guardianChildLinks)
      .filter(
        (row) =>
          asString(row.familyId) === familyId &&
          asString(row.guardianUserId) === parentUserId &&
          !asString(row.deletedAt),
      )
      .map((row) => asString(row.athleteId))
      .find((id): id is string => Boolean(id));
    assert.ok(athleteId, 'expected seeded athlete link');

    const headers = {
      'x-auth-user-id': parentUserId,
      'x-auth-roles': rolesForUser(tables, parentUserId).join(',') || 'parent',
      'x-acting-role': rolesForUser(tables, parentUserId)[0] ?? 'parent',
      'x-guardian-athlete-ids': athleteId,
    };

    const originalBackend = env.API_DATA_BACKEND;
    try {
      env.API_DATA_BACKEND = 'db';

      const create = await app.inject({
        method: 'POST',
        url: '/v1/athletes',
        headers,
        payload: {
          familyId,
          firstName: 'Db',
          lastName: 'Mode',
          relationship: 'DAUGHTER',
          specialNeeds: [
            {
              category: 'LEARNING',
              name: 'Needs visual prompts',
              severity: 'MODERATE',
            },
          ],
        },
      });
      assert.equal(create.statusCode, 503);
      assert.match(create.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(create.body.includes('Db'), false);

      const detail = await app.inject({
        method: 'GET',
        url: `/v1/athletes/${athleteId}`,
        headers,
      });
      assert.equal(detail.statusCode, 503);
      assert.match(detail.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(detail.body.includes(athleteId), false);

      const update = await app.inject({
        method: 'PATCH',
        url: `/v1/athletes/${athleteId}`,
        headers,
        payload: {
          specialNeeds: [
            {
              category: 'LEARNING',
              name: 'Needs quiet instructions',
              severity: 'MILD',
            },
          ],
        },
      });
      assert.equal(update.statusCode, 503);
      assert.match(update.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(update.body.includes('Needs quiet instructions'), false);

      const remove = await app.inject({
        method: 'DELETE',
        url: `/v1/athletes/${athleteId}`,
        headers,
      });
      assert.equal(remove.statusCode, 503);
      assert.match(remove.body, /DATABASE_URL is not configured for db backend/);
    } finally {
      env.API_DATA_BACKEND = originalBackend;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });

  it('deletes athletes for an authenticated family member', async () => {
    const tables = loadTables();
    const familyMembership = asRows(tables.familyMemberships)[0];
    assert.ok(familyMembership, 'expected seeded family membership');

    const familyId = asString(familyMembership.familyId) as string;
    const parentUserId = asString(familyMembership.userId) as string;
    const headers = {
      'x-auth-user-id': parentUserId,
      'x-auth-roles': rolesForUser(tables, parentUserId).join(',') || 'parent',
      'x-acting-role': rolesForUser(tables, parentUserId)[0] ?? 'parent',
    };

    const create = await app.inject({
      method: 'POST',
      url: '/v1/athletes',
      headers,
      payload: {
        familyId,
        firstName: 'Delete',
        lastName: 'Me',
      },
    });
    assert.equal(create.statusCode, 201);
    const created = create.json() as { athleteId: string };

    const remove = await app.inject({
      method: 'DELETE',
      url: `/v1/athletes/${created.athleteId}`,
      headers,
    });
    assert.equal(remove.statusCode, 204);

    const family = await app.inject({
      method: 'GET',
      url: `/v1/families/${familyId}`,
      headers,
    });
    assert.equal(family.statusCode, 200);
    const familyPayload = family.json() as { athletes: Array<{ id: string }> };
    assert.equal(
      familyPayload.athletes.some((athlete) => athlete.id === created.athleteId),
      false,
    );
  });

  it('creates guardian invitations through backend family authority', async () => {
    const originalBackend = env.API_DATA_BACKEND;
    try {
      env.API_DATA_BACKEND = 'db';
      const store = getDbFixtureStore();
      const ownerMembership = asRows(store.tables.familyMemberships).find(
        (row) => asString(row.role) === 'owner',
      );
      assert.ok(ownerMembership, 'expected family owner membership');

      const familyId = asString(ownerMembership.familyId) as string;
      const ownerUserId = asString(ownerMembership.userId) as string;
      const athleteId = asRows(store.tables.guardianChildLinks)
        .filter((row) => asString(row.familyId) === familyId)
        .map((row) => asString(row.athleteId))
        .find((id): id is string => Boolean(id));
      assert.ok(athleteId, 'expected family athlete');

      const headers = {
        'x-auth-user-id': ownerUserId,
        'x-auth-roles': rolesForUser(store.tables, ownerUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(store.tables, ownerUserId)[0] ?? 'parent',
      };
      const payload = {
        inviteeEmail: 'trusted.guardian@example.com',
        inviteeName: 'Trusted Guardian',
        role: 'GUARDIAN',
        relationship: 'Grandparent',
        childAccess: [athleteId],
        message: 'Please help with session pickups.',
      };

      const create = await app.inject({
        method: 'POST',
        url: `/v1/families/${familyId}/guardians`,
        headers,
        payload,
      });
      assert.equal(create.statusCode, 201);
      const created = create.json() as {
        id: string;
        familyId: string;
        inviteeEmail: string;
        role: string;
        childAccess: string[];
        status: string;
      };
      assert.match(created.id, /^ginv_/);
      assert.equal(created.familyId, familyId);
      assert.equal(created.inviteeEmail, 'trusted.guardian@example.com');
      assert.equal(created.role, 'GUARDIAN');
      assert.deepEqual(created.childAccess, [athleteId]);
      assert.equal(created.status, 'PENDING');

      const replay = await app.inject({
        method: 'POST',
        url: `/v1/families/${familyId}/guardians`,
        headers,
        payload,
      });
      assert.equal(replay.statusCode, 200);
      assert.equal((replay.json() as { id: string }).id, created.id);

      const conflict = await app.inject({
        method: 'POST',
        url: `/v1/families/${familyId}/guardians`,
        headers,
        payload: {
          ...payload,
          role: 'VIEWER',
        },
      });
      assert.equal(conflict.statusCode, 409);

      const family = await app.inject({
        method: 'GET',
        url: `/v1/families/${familyId}`,
        headers,
      });
      assert.equal(family.statusCode, 200);
      const familyPayload = family.json() as {
        pendingGuardianInvites: Array<{ id: string; inviteeEmail: string }>;
      };
      assert.equal(
        familyPayload.pendingGuardianInvites.some((invite) => invite.id === created.id),
        true,
      );

      assert.equal(
        auditEventsFor(store.tables, {
          action: 'family_guardian_invite.create',
          resourceId: created.id,
          result: 'SUCCESS',
        }).length >= 1,
        true,
      );
      assert.equal(
        auditEventsFor(store.tables, {
          action: 'family_guardian_invite.create',
          result: 'DENY',
        }).some((event) => asString(event.actorUserId) === ownerUserId),
        true,
      );
    } finally {
      env.API_DATA_BACKEND = originalBackend;
      resetDbFixtureStoreForTests();
    }
  });

  it('denies guardian invitation writes for non-admin family members', async () => {
    const originalBackend = env.API_DATA_BACKEND;
    try {
      env.API_DATA_BACKEND = 'db';
      const store = getDbFixtureStore();
      const ownerMembership = asRows(store.tables.familyMemberships).find(
        (row) => asString(row.role) === 'owner',
      );
      assert.ok(ownerMembership, 'expected family owner membership');
      const familyId = asString(ownerMembership.familyId) as string;
      const nonAdminMembership = asRows(store.tables.familyMemberships).find(
        (row) => asString(row.familyId) === familyId && asString(row.role) !== 'owner',
      );
      assert.ok(nonAdminMembership, 'expected non-admin family membership');
      const nonAdminUserId = asString(nonAdminMembership.userId) as string;

      const denied = await app.inject({
        method: 'POST',
        url: `/v1/families/${familyId}/guardians`,
        headers: {
          'x-auth-user-id': nonAdminUserId,
          'x-auth-roles': rolesForUser(store.tables, nonAdminUserId).join(',') || 'parent',
          'x-acting-role': rolesForUser(store.tables, nonAdminUserId)[0] ?? 'parent',
        },
        payload: {
          inviteeEmail: 'blocked.guardian@example.com',
          role: 'VIEWER',
          relationship: 'Family friend',
          childAccess: [],
        },
      });
      assert.equal(denied.statusCode, 403);
      assert.equal(
        auditEventsFor(store.tables, {
          action: 'family_guardian_invite.create',
          result: 'DENY',
        }).some((event) => asString(event.actorUserId) === nonAdminUserId),
        true,
      );
    } finally {
      env.API_DATA_BACKEND = originalBackend;
      resetDbFixtureStoreForTests();
    }
  });

  it('updates guardian permissions and child access through backend authority', async () => {
    const originalBackend = env.API_DATA_BACKEND;
    try {
      env.API_DATA_BACKEND = 'db';
      const store = getDbFixtureStore();
      const familyMemberships = asRows(store.tables.familyMemberships);
      const guardianLinks = asRows(store.tables.guardianChildLinks);
      const ownerMembership = familyMemberships.find((owner) => {
        if (asString(owner.role) !== 'owner') return false;
        const familyId = asString(owner.familyId);
        const candidate = familyMemberships.find((membership) => {
          if (asString(membership.familyId) !== familyId || asString(membership.role) === 'owner') {
            return false;
          }
          const guardianUserId = asString(membership.userId);
          return guardianLinks
            .filter(
              (link) =>
                asString(link.familyId) === familyId &&
                asString(link.guardianUserId) === guardianUserId &&
                !asString(link.deletedAt),
            )
            .every((link) => link.isPrimary !== true);
        });
        const athleteIds = guardianLinks
          .filter((link) => asString(link.familyId) === familyId && !asString(link.deletedAt))
          .map((link) => asString(link.athleteId))
          .filter((id): id is string => Boolean(id));
        return Boolean(candidate && new Set(athleteIds).size >= 2);
      });
      assert.ok(ownerMembership, 'expected owner with mutable guardian');
      const familyId = asString(ownerMembership.familyId) as string;
      const ownerUserId = asString(ownerMembership.userId) as string;
      const targetMembership = familyMemberships.find(
        (membership) =>
          asString(membership.familyId) === familyId && asString(membership.role) !== 'owner',
      );
      assert.ok(targetMembership, 'expected target guardian membership');
      const guardianId = asString(targetMembership.id) as string;
      const guardianUserId = asString(targetMembership.userId) as string;
      const targetAthleteId = [
        ...new Set(
          guardianLinks
            .filter((link) => asString(link.familyId) === familyId && !asString(link.deletedAt))
            .map((link) => asString(link.athleteId))
            .filter((id): id is string => Boolean(id)),
        ),
      ][1];
      assert.ok(targetAthleteId, 'expected second family athlete');
      const oldActiveLink = guardianLinks.find(
        (link) =>
          asString(link.familyId) === familyId &&
          asString(link.guardianUserId) === guardianUserId &&
          !asString(link.deletedAt),
      );
      assert.ok(oldActiveLink, 'expected existing guardian child link');
      const oldAthleteId = asString(oldActiveLink.athleteId) as string;

      const update = await app.inject({
        method: 'PATCH',
        url: `/v1/families/${familyId}/guardians/${guardianId}`,
        headers: authHeaders(store.tables, ownerUserId, 'parent'),
        payload: {
          permissions: ['VIEW_SCHEDULE', 'MANAGE_PAYMENTS'],
          childAccess: [targetAthleteId],
        },
      });
      assert.equal(update.statusCode, 200);
      const updated = update.json() as {
        id: string;
        userId: string;
        role: string;
        permissions: string[];
        childAccess: string[];
        isPrimary: boolean;
      };
      assert.equal(updated.id, guardianId);
      assert.equal(updated.userId, guardianUserId);
      assert.equal(updated.role, 'GUARDIAN');
      assert.equal(updated.isPrimary, false);
      assert.deepEqual(updated.permissions, ['VIEW_SCHEDULE', 'MANAGE_PAYMENTS']);
      assert.deepEqual(updated.childAccess, [targetAthleteId]);
      assert.deepEqual(targetMembership.permissions, ['schedule', 'payments']);
      assert.deepEqual(targetMembership.childAccessAthleteIds, [targetAthleteId]);
      assert.equal(
        asString(oldActiveLink.deletedAt) !== undefined,
        oldAthleteId !== targetAthleteId,
      );
      assert.equal(
        guardianLinks.some(
          (link) =>
            asString(link.familyId) === familyId &&
            asString(link.guardianUserId) === guardianUserId &&
            asString(link.athleteId) === targetAthleteId &&
            !asString(link.deletedAt),
        ),
        true,
      );
      assert.equal(
        auditEventsFor(store.tables, {
          action: 'family_guardian.update_access',
          resourceId: guardianId,
          result: 'SUCCESS',
        }).length,
        1,
      );
    } finally {
      env.API_DATA_BACKEND = originalBackend;
      resetDbFixtureStoreForTests();
    }
  });

  it('denies guardian access updates for non-admin family members', async () => {
    const originalBackend = env.API_DATA_BACKEND;
    try {
      env.API_DATA_BACKEND = 'db';
      const store = getDbFixtureStore();
      const ownerMembership = asRows(store.tables.familyMemberships).find(
        (row) => asString(row.role) === 'owner',
      );
      assert.ok(ownerMembership, 'expected family owner membership');
      const familyId = asString(ownerMembership.familyId) as string;
      const nonAdminMembership = asRows(store.tables.familyMemberships).find(
        (row) => asString(row.familyId) === familyId && asString(row.role) !== 'owner',
      );
      assert.ok(nonAdminMembership, 'expected non-admin family membership');
      const nonAdminUserId = asString(nonAdminMembership.userId) as string;

      const denied = await app.inject({
        method: 'PATCH',
        url: `/v1/families/${familyId}/guardians/${asString(ownerMembership.id)}`,
        headers: authHeaders(store.tables, nonAdminUserId, 'parent'),
        payload: {
          permissions: ['VIEW_SCHEDULE'],
        },
      });
      assert.equal(denied.statusCode, 403);
      assert.equal(
        auditEventsFor(store.tables, {
          action: 'family_guardian.update_access',
          resourceId: asString(ownerMembership.id),
          result: 'DENY',
        }).some((event) => asString(event.actorUserId) === nonAdminUserId),
        true,
      );
    } finally {
      env.API_DATA_BACKEND = originalBackend;
      resetDbFixtureStoreForTests();
    }
  });

  it('cancels guardian invites and removes non-primary guardians through backend authority', async () => {
    const originalBackend = env.API_DATA_BACKEND;
    try {
      env.API_DATA_BACKEND = 'db';
      const store = getDbFixtureStore();
      const ownerMembership = asRows(store.tables.familyMemberships).find(
        (row) => asString(row.role) === 'owner',
      );
      assert.ok(ownerMembership, 'expected family owner membership');
      const familyId = asString(ownerMembership.familyId) as string;
      const ownerUserId = asString(ownerMembership.userId) as string;
      const headers = {
        'x-auth-user-id': ownerUserId,
        'x-auth-roles': rolesForUser(store.tables, ownerUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(store.tables, ownerUserId)[0] ?? 'parent',
      };

      const create = await app.inject({
        method: 'POST',
        url: `/v1/families/${familyId}/guardians`,
        headers,
        payload: {
          inviteeEmail: 'cancel.me@example.com',
          role: 'VIEWER',
          relationship: 'Family friend',
          childAccess: [],
        },
      });
      assert.equal(create.statusCode, 201);
      const inviteId = (create.json() as { id: string }).id;

      const cancel = await app.inject({
        method: 'DELETE',
        url: `/v1/families/${familyId}/guardian-invites/${inviteId}`,
        headers,
      });
      assert.equal(cancel.statusCode, 204);
      assert.equal(
        auditEventsFor(store.tables, {
          action: 'family_guardian_invite.cancel',
          resourceId: inviteId,
          result: 'SUCCESS',
        }).length,
        1,
      );

      const removableMembership = asRows(store.tables.familyMemberships).find(
        (row) => asString(row.familyId) === familyId && asString(row.role) !== 'owner',
      );
      assert.ok(removableMembership, 'expected removable guardian membership');
      const guardianId = asString(removableMembership.id) as string;
      const guardianUserId = asString(removableMembership.userId) as string;

      const remove = await app.inject({
        method: 'DELETE',
        url: `/v1/families/${familyId}/guardians/${guardianId}`,
        headers,
      });
      assert.equal(remove.statusCode, 204);
      assert.equal(asString(removableMembership.deletedAt) !== undefined, true);
      assert.equal(
        asRows(store.tables.guardianChildLinks).every((row) => {
          if (
            asString(row.familyId) !== familyId ||
            asString(row.guardianUserId) !== guardianUserId
          ) {
            return true;
          }
          return asString(row.deletedAt) !== undefined;
        }),
        true,
      );

      const removePrimary = await app.inject({
        method: 'DELETE',
        url: `/v1/families/${familyId}/guardians/${asString(ownerMembership.id)}`,
        headers,
      });
      assert.equal(removePrimary.statusCode, 409);
      assert.equal(
        auditEventsFor(store.tables, {
          action: 'family_guardian.remove',
          resourceId: guardianId,
          result: 'SUCCESS',
        }).length,
        1,
      );
    } finally {
      env.API_DATA_BACKEND = originalBackend;
      resetDbFixtureStoreForTests();
    }
  });

  it('lists and accepts guardian invitations only for the invited user', async () => {
    const originalBackend = env.API_DATA_BACKEND;
    try {
      env.API_DATA_BACKEND = 'db';
      const store = getDbFixtureStore();
      const ownerMembership = asRows(store.tables.familyMemberships).find(
        (row) => asString(row.role) === 'owner',
      );
      assert.ok(ownerMembership, 'expected family owner membership');
      const familyId = asString(ownerMembership.familyId) as string;
      const ownerUserId = asString(ownerMembership.userId) as string;
      const familyAthleteIds = asRows(store.tables.guardianChildLinks)
        .filter((row) => asString(row.familyId) === familyId)
        .map((row) => asString(row.athleteId))
        .filter((id): id is string => Boolean(id));
      assert.equal(familyAthleteIds.length > 0, true);

      const invitee = asRows(store.tables.users).find((row) => {
        const userId = asString(row.id);
        const email = asString(row.email);
        return Boolean(
          userId &&
          email &&
          !asRows(store.tables.familyMemberships).some(
            (membership) =>
              asString(membership.familyId) === familyId && asString(membership.userId) === userId,
          ),
        );
      });
      assert.ok(invitee, 'expected user outside the family');
      const inviteeUserId = asString(invitee.id) as string;
      const inviteeEmail = asString(invitee.email) as string;

      const create = await app.inject({
        method: 'POST',
        url: `/v1/families/${familyId}/guardians`,
        headers: {
          'x-auth-user-id': ownerUserId,
          'x-auth-roles': rolesForUser(store.tables, ownerUserId).join(',') || 'parent',
          'x-acting-role': rolesForUser(store.tables, ownerUserId)[0] ?? 'parent',
        },
        payload: {
          inviteeEmail,
          role: 'GUARDIAN',
          relationship: 'Aunt/Uncle',
          childAccess: [familyAthleteIds[0]],
        },
      });
      assert.equal(create.statusCode, 201);
      const inviteId = (create.json() as { id: string }).id;

      const outsider = asRows(store.tables.users).find((row) => {
        const userId = asString(row.id);
        return userId && userId !== ownerUserId && userId !== inviteeUserId;
      });
      assert.ok(outsider, 'expected unrelated user');
      const outsiderAccept = await app.inject({
        method: 'POST',
        url: `/v1/guardian-invites/${inviteId}/accept`,
        headers: {
          'x-auth-user-id': asString(outsider.id) as string,
          'x-auth-roles':
            rolesForUser(store.tables, asString(outsider.id) as string).join(',') || 'parent',
          'x-acting-role':
            rolesForUser(store.tables, asString(outsider.id) as string)[0] ?? 'parent',
        },
      });
      assert.equal(outsiderAccept.statusCode, 403);

      const inbox = await app.inject({
        method: 'GET',
        url: '/v1/me/guardian-invites',
        headers: {
          'x-auth-user-id': inviteeUserId,
          'x-auth-roles': rolesForUser(store.tables, inviteeUserId).join(',') || 'parent',
          'x-acting-role': rolesForUser(store.tables, inviteeUserId)[0] ?? 'parent',
        },
      });
      assert.equal(inbox.statusCode, 200);
      assert.equal(
        (inbox.json() as { invites: Array<{ id: string }> }).invites.some(
          (invite) => invite.id === inviteId,
        ),
        true,
      );

      const accept = await app.inject({
        method: 'POST',
        url: `/v1/guardian-invites/${inviteId}/accept`,
        headers: {
          'x-auth-user-id': inviteeUserId,
          'x-auth-roles': rolesForUser(store.tables, inviteeUserId).join(',') || 'parent',
          'x-acting-role': rolesForUser(store.tables, inviteeUserId)[0] ?? 'parent',
        },
      });
      assert.equal(accept.statusCode, 200);
      assert.equal((accept.json() as { status: string }).status, 'ACCEPTED');
      assert.equal(
        asRows(store.tables.familyMemberships).some(
          (row) =>
            asString(row.familyId) === familyId &&
            asString(row.userId) === inviteeUserId &&
            !asString(row.deletedAt),
        ),
        true,
      );
      assert.equal(
        asRows(store.tables.guardianChildLinks).some(
          (row) =>
            asString(row.familyId) === familyId &&
            asString(row.guardianUserId) === inviteeUserId &&
            asString(row.athleteId) === familyAthleteIds[0] &&
            !asString(row.deletedAt),
        ),
        true,
      );

      const family = await app.inject({
        method: 'GET',
        url: `/v1/families/${familyId}`,
        headers: {
          'x-auth-user-id': inviteeUserId,
          'x-auth-roles': rolesForUser(store.tables, inviteeUserId).join(',') || 'parent',
          'x-acting-role': rolesForUser(store.tables, inviteeUserId)[0] ?? 'parent',
        },
      });
      assert.equal(family.statusCode, 200);
      assert.equal(
        auditEventsFor(store.tables, {
          action: 'family_guardian_invite.accept',
          resourceId: inviteId,
          result: 'SUCCESS',
        }).length,
        1,
      );
      assert.equal(
        auditEventsFor(store.tables, {
          action: 'family_guardian_invite.accept',
          resourceId: inviteId,
          result: 'DENY',
        }).length,
        1,
      );
    } finally {
      env.API_DATA_BACKEND = originalBackend;
      resetDbFixtureStoreForTests();
    }
  });

  it('declines guardian invitations without granting family access', async () => {
    const originalBackend = env.API_DATA_BACKEND;
    try {
      env.API_DATA_BACKEND = 'db';
      const store = getDbFixtureStore();
      const ownerMembership = asRows(store.tables.familyMemberships).find(
        (row) => asString(row.role) === 'owner',
      );
      assert.ok(ownerMembership, 'expected family owner membership');
      const familyId = asString(ownerMembership.familyId) as string;
      const ownerUserId = asString(ownerMembership.userId) as string;
      const invitee = asRows(store.tables.users).find((row) => {
        const userId = asString(row.id);
        const email = asString(row.email);
        return Boolean(
          userId &&
          email &&
          !asRows(store.tables.familyMemberships).some(
            (membership) =>
              asString(membership.familyId) === familyId && asString(membership.userId) === userId,
          ),
        );
      });
      assert.ok(invitee, 'expected user outside the family');
      const inviteeUserId = asString(invitee.id) as string;

      const create = await app.inject({
        method: 'POST',
        url: `/v1/families/${familyId}/guardians`,
        headers: {
          'x-auth-user-id': ownerUserId,
          'x-auth-roles': rolesForUser(store.tables, ownerUserId).join(',') || 'parent',
          'x-acting-role': rolesForUser(store.tables, ownerUserId)[0] ?? 'parent',
        },
        payload: {
          inviteeEmail: asString(invitee.email),
          role: 'VIEWER',
          relationship: 'Family friend',
          childAccess: [],
        },
      });
      assert.equal(create.statusCode, 201);
      const inviteId = (create.json() as { id: string }).id;

      const decline = await app.inject({
        method: 'POST',
        url: `/v1/guardian-invites/${inviteId}/decline`,
        headers: {
          'x-auth-user-id': inviteeUserId,
          'x-auth-roles': rolesForUser(store.tables, inviteeUserId).join(',') || 'parent',
          'x-acting-role': rolesForUser(store.tables, inviteeUserId)[0] ?? 'parent',
        },
      });
      assert.equal(decline.statusCode, 200);
      assert.equal((decline.json() as { status: string }).status, 'DECLINED');
      assert.equal(
        asRows(store.tables.familyMemberships).some(
          (row) => asString(row.familyId) === familyId && asString(row.userId) === inviteeUserId,
        ),
        false,
      );

      const family = await app.inject({
        method: 'GET',
        url: `/v1/families/${familyId}`,
        headers: {
          'x-auth-user-id': inviteeUserId,
          'x-auth-roles': rolesForUser(store.tables, inviteeUserId).join(',') || 'parent',
          'x-acting-role': rolesForUser(store.tables, inviteeUserId)[0] ?? 'parent',
        },
      });
      assert.equal(family.statusCode, 403);
      assert.equal(
        auditEventsFor(store.tables, {
          action: 'family_guardian_invite.decline',
          resourceId: inviteId,
          result: 'SUCCESS',
        }).length,
        1,
      );
    } finally {
      env.API_DATA_BACKEND = originalBackend;
      resetDbFixtureStoreForTests();
    }
  });

  it('allows a verified assigned coach to read athlete detail', async () => {
    const detail = await app.inject({
      method: 'GET',
      url: '/v1/athletes/ath_user1',
      headers: {
        'x-auth-user-id': 'usr_coach1',
        'x-auth-roles': 'coach',
        'x-acting-role': 'coach',
        'x-coach-athlete-ids': 'ath_user1',
        'x-coach-verified': 'true',
      },
    });

    assert.equal(detail.statusCode, 200);
    const payload = detail.json() as { id: string; firstName: string };
    assert.equal(payload.id, 'ath_user1');
    assert.equal(typeof payload.firstName, 'string');
  });

  it('allows a linked athlete user to read their own athlete detail', async () => {
    const tables = loadTables();
    const linkedAthlete = asRows(tables.athletes).find((row) => {
      const athleteId = asString(row.id);
      const userId = asString(row.userId);
      return Boolean(athleteId && userId && athleteId !== userId.replace(/^usr_/, 'ath_'));
    });
    assert.ok(linkedAthlete, 'expected linked athlete with separate athlete and user ids');

    const athleteId = asString(linkedAthlete.id) as string;
    const userId = asString(linkedAthlete.userId) as string;
    const detail = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}`,
      headers: authHeaders(tables, userId, 'athlete'),
    });

    assert.equal(detail.statusCode, 200);
    const payload = detail.json() as { id: string; athleteId: string };
    assert.equal(payload.id, athleteId);
    assert.equal(payload.athleteId, athleteId);
  });

  it('creates, lists, and updates injuries', async () => {
    const athleteId = 'ath_user1';
    const athleteHeaders = {
      'x-auth-user-id': 'usr_user1',
      'x-auth-roles': 'athlete',
      'x-acting-role': 'athlete',
    };
    const auditTables = getMarketplaceSeedStore().tables as SeedTables;
    const injuryRows = ensureRows(auditTables, 'athleteInjuries');
    const injuryCountBeforeInvalidCreates = injuryRows.length;
    const invalidCreates = await Promise.all([
      app.inject({
        method: 'POST',
        url: `/v1/athletes/${athleteId}/injuries`,
        headers: athleteHeaders,
        payload: {
          title: 'Hamstring strain',
          type: 'muscle',
          severity: 'medium',
          createdByUserId: 'usr_forged',
        },
      }),
      app.inject({
        method: 'POST',
        url: `/v1/athletes/${athleteId}/injuries`,
        headers: athleteHeaders,
        payload: {
          title: 'Hamstring strain',
          type: 'muscle',
          severity: 'medium',
          reportedAt: '2026-08-02T10:00:00.000Z',
          expectedRecoveryDate: '2026-08-01T10:00:00.000Z',
        },
      }),
    ]);
    assert.deepEqual(
      invalidCreates.map((response) => response.statusCode),
      [400, 400],
    );
    assert.equal(injuryRows.length, injuryCountBeforeInvalidCreates);
    assert.equal(
      auditEventsFor(auditTables, {
        action: 'athlete_injury.create',
        resourceId: athleteId,
        result: 'DENY',
      }).length,
      2,
    );

    const create = await app.inject({
      method: 'POST',
      url: `/v1/athletes/${athleteId}/injuries`,
      headers: athleteHeaders,
      payload: {
        title: 'Hamstring strain',
        type: 'muscle',
        severity: 'medium',
        notes: 'Pulled during sprint drill',
        sharedWithCoach: true,
      },
    });
    assert.equal(create.statusCode, 201);
    const created = create.json() as {
      id: string;
      status: string;
      athleteId: string;
      sharedWithCoach: boolean;
    };
    assert.match(created.id, /^inj_/);
    assert.equal(created.status, 'active');
    assert.equal(created.athleteId, athleteId);
    assert.equal(created.sharedWithCoach, true);

    const list = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/injuries`,
      headers: athleteHeaders,
    });
    assert.equal(list.statusCode, 200);
    const listed = list.json() as { athleteId: string; injuries: Array<{ id: string }> };
    assert.equal(listed.athleteId, athleteId);
    assert.equal(listed.injuries.length >= 1, true);
    assert.equal(listed.injuries[0]?.id, created.id);

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/injuries/${created.id}`,
      headers: athleteHeaders,
    });
    assert.equal(detail.statusCode, 200);
    const detailPayload = detail.json() as { id: string; athleteId: string; notes: string | null };
    assert.equal(detailPayload.id, created.id);
    assert.equal(detailPayload.athleteId, athleteId);
    assert.equal(detailPayload.notes, 'Pulled during sprint drill');

    const deniedDetail = await app.inject({
      method: 'GET',
      url: `/v1/injuries/${created.id}`,
      headers: {
        'x-auth-user-id': 'usr_user2',
        'x-auth-roles': 'athlete',
        'x-acting-role': 'athlete',
      },
    });
    assert.equal(deniedDetail.statusCode, 403);

    const patch = await app.inject({
      method: 'PATCH',
      url: `/v1/injuries/${created.id}`,
      headers: athleteHeaders,
      payload: {
        status: 'resolved',
      },
    });
    assert.equal(patch.statusCode, 200);
    const updated = patch.json() as {
      status: string;
      resolvedAt: string | null;
      notes: string | null;
    };
    assert.equal(updated.status, 'resolved');
    assert.equal(typeof updated.resolvedAt, 'string');
    assert.equal(updated.notes, 'Pulled during sprint drill');

    const rowBeforeInvalidUpdates = injuryRows.find((row) => asString(row.id) === created.id);
    assert.ok(rowBeforeInvalidUpdates);
    const invalidUpdateSnapshot = JSON.stringify(rowBeforeInvalidUpdates);
    const invalidUpdates = await Promise.all([
      app.inject({
        method: 'PATCH',
        url: `/v1/injuries/${created.id}`,
        headers: athleteHeaders,
        payload: {},
      }),
      app.inject({
        method: 'PATCH',
        url: `/v1/injuries/${created.id}`,
        headers: athleteHeaders,
        payload: {
          resolvedAt: '2026-08-01T10:00:00.000Z',
        },
      }),
    ]);
    assert.deepEqual(
      invalidUpdates.map((response) => response.statusCode),
      [400, 400],
    );
    assert.equal(JSON.stringify(rowBeforeInvalidUpdates), invalidUpdateSnapshot);

    const reopen = await app.inject({
      method: 'PATCH',
      url: `/v1/injuries/${created.id}`,
      headers: athleteHeaders,
      payload: {
        status: 'active',
      },
    });
    assert.equal(reopen.statusCode, 200);
    const reopened = reopen.json() as {
      status: string;
      resolvedAt: string | null;
      notes: string | null;
    };
    assert.equal(reopened.status, 'active');
    assert.equal(reopened.resolvedAt, null);
    assert.equal(reopened.notes, 'Pulled during sprint drill');

    assert.equal(
      auditEventsFor(auditTables, {
        action: 'athlete_injury.read',
        resourceId: created.id,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(auditTables, {
        action: 'athlete_injury.read',
        resourceId: created.id,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(auditTables, {
        action: 'athlete_injury.update',
        resourceId: created.id,
        result: 'SUCCESS',
      }).length,
      2,
    );
    const deniedUpdates = auditEventsFor(auditTables, {
      action: 'athlete_injury.update',
      resourceId: created.id,
      result: 'DENY',
    });
    assert.equal(deniedUpdates.length, 2);
    assert.equal(
      deniedUpdates.every(
        (event) =>
          (event.metadataJson as { errorCode?: string } | undefined)?.errorCode ===
          'VALIDATION_FAILED',
      ),
      true,
    );
  });

  it('allows a linked parent and denies an unrelated parent when reading an injury', async () => {
    const tables = loadTables();
    const guardianLink = asRows(tables.guardianChildLinks).find(
      (link) => asString(link.athleteId) && asString(link.guardianUserId),
    );
    assert.ok(guardianLink, 'expected an active guardian-child link');
    const athleteId = asString(guardianLink.athleteId);
    const guardianUserId = asString(guardianLink.guardianUserId);
    assert.ok(athleteId);
    assert.ok(guardianUserId);

    const unrelatedParent = asRows(tables.userRoleMemberships).find((membership) => {
      const userId = asString(membership.userId);
      return (
        asString(membership.role) === 'parent' &&
        Boolean(userId) &&
        userId !== guardianUserId &&
        !asRows(tables.guardianChildLinks).some(
          (link) =>
            asString(link.guardianUserId) === userId &&
            asString(link.athleteId) === athleteId &&
            !asString(link.deletedAt),
        )
      );
    });
    const unrelatedParentUserId = asString(unrelatedParent?.userId);
    assert.ok(unrelatedParentUserId, 'expected an unrelated parent');

    const create = await app.inject({
      method: 'POST',
      url: `/v1/athletes/${athleteId}/injuries`,
      headers: authHeaders(tables, guardianUserId, 'parent'),
      payload: {
        title: 'Ankle knock',
        type: 'impact',
        severity: 'low',
      },
    });
    assert.equal(create.statusCode, 201);
    const created = create.json() as { id: string; athleteId: string };
    assert.equal(created.athleteId, athleteId);

    const linkedParentDetail = await app.inject({
      method: 'GET',
      url: `/v1/injuries/${created.id}`,
      headers: authHeaders(tables, guardianUserId, 'parent'),
    });
    assert.equal(linkedParentDetail.statusCode, 200);

    const unrelatedParentDetail = await app.inject({
      method: 'GET',
      url: `/v1/injuries/${created.id}`,
      headers: authHeaders(tables, unrelatedParentUserId, 'parent'),
    });
    assert.equal(unrelatedParentDetail.statusCode, 403);

    const auditTables = getMarketplaceSeedStore().tables as SeedTables;
    assert.equal(
      auditEventsFor(auditTables, {
        action: 'athlete_injury.read',
        resourceId: created.id,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(auditTables, {
        action: 'athlete_injury.read',
        resourceId: created.id,
        result: 'DENY',
      }).length,
      1,
    );
  });

  it('upserts and reads medical, emergency contacts, and consents', async () => {
    const athleteId = 'ath_user2';
    const guardianHeaders = {
      'x-auth-user-id': 'usr_parent1',
      'x-auth-roles': 'parent',
      'x-acting-role': 'parent',
      'x-guardian-athlete-ids': athleteId,
    };
    const tables = getMarketplaceSeedStore().tables as SeedTables;
    const consentRows = ensureRows(tables, 'childConsents');
    for (let index = consentRows.length - 1; index >= 0; index -= 1) {
      if (asString(consentRows[index]?.athleteId) === athleteId) {
        consentRows.splice(index, 1);
      }
    }

    const rowsBeforeInvalidWrites = {
      medical: asRows(tables.childMedicalRecords).length,
      emergency: asRows(tables.childEmergencyContacts).length,
      consents: consentRows.length,
    };
    const invalidWrites = await Promise.all([
      app.inject({
        method: 'PATCH',
        url: `/v1/athletes/${athleteId}/medical`,
        headers: guardianHeaders,
        payload: {},
      }),
      app.inject({
        method: 'PATCH',
        url: `/v1/athletes/${athleteId}/medical`,
        headers: guardianHeaders,
        payload: {
          conditions: ['asthma'],
          updatedByUserId: 'usr_forged',
        },
      }),
      app.inject({
        method: 'PATCH',
        url: `/v1/athletes/${athleteId}/emergency-contacts`,
        headers: guardianHeaders,
        payload: {
          contacts: [
            {
              name: 'Parent One',
              relationship: 'parent',
              phone: '+447700900100',
              createdByUserId: 'usr_forged',
            },
          ],
        },
      }),
      app.inject({
        method: 'PUT',
        url: `/v1/athletes/${athleteId}/consents`,
        headers: guardianHeaders,
        payload: {
          consents: [
            { type: 'PHOTO', granted: true, grantedBy: 'Parent One' },
            { type: 'PHOTO', granted: false, grantedBy: 'Parent One' },
          ],
        },
      }),
    ]);
    assert.deepEqual(
      invalidWrites.map((response) => response.statusCode),
      [400, 400, 400, 400],
    );
    assert.deepEqual(
      {
        medical: asRows(tables.childMedicalRecords).length,
        emergency: asRows(tables.childEmergencyContacts).length,
        consents: consentRows.length,
      },
      rowsBeforeInvalidWrites,
    );
    const deniedValidationAudits = asRows(tables.auditEvents).filter((row) => {
      const metadata = row.metadataJson as { errorCode?: string } | undefined;
      return (
        asString(row.resourceId) === athleteId &&
        asString(row.result) === 'DENY' &&
        metadata?.errorCode === 'VALIDATION_FAILED'
      );
    });
    assert.deepEqual(
      deniedValidationAudits.map((row) => asString(row.action)).sort(),
      ['consents.update', 'emergency_contacts.update', 'medical.update', 'medical.update'],
    );

    const initialConsents = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/consents`,
      headers: guardianHeaders,
    });
    assert.equal(initialConsents.statusCode, 200);
    const initialConsentPayload = initialConsents.json() as {
      consents: Array<{ type: string; granted: boolean }>;
    };
    assert.deepEqual(
      initialConsentPayload.consents.map((consent) => [consent.type, consent.granted]),
      [
        ['PHOTO', false],
        ['VIDEO', false],
        ['SOCIAL_MEDIA', false],
        ['EMERGENCY_TREATMENT', false],
      ],
    );

    const medical = await app.inject({
      method: 'PATCH',
      url: `/v1/athletes/${athleteId}/medical`,
      headers: guardianHeaders,
      payload: {
        conditions: ['asthma'],
        allergies: ['peanuts'],
        medications: ['inhaler'],
        restrictions: ['Warm up before sprinting'],
        doctorName: 'Dr. Kim',
        doctorPhone: '+442071234568',
        insuranceProvider: 'AXA',
        insuranceNumber: 'AXA-778899',
        emergencyNotes: 'Carry inhaler at all sessions',
      },
    });
    assert.equal(medical.statusCode, 200);
    const medicalPayload = medical.json() as {
      athleteId: string;
      conditions: string[];
      allergies: string[];
      medications: string[];
      restrictions: string[];
      doctorName: string | null;
      doctorPhone: string | null;
      insuranceProvider: string | null;
      insuranceNumber: string | null;
      emergencyNotes: string | null;
    };
    assert.equal(medicalPayload.athleteId, athleteId);
    assert.deepEqual(medicalPayload.conditions, ['asthma']);
    assert.deepEqual(medicalPayload.allergies, ['peanuts']);
    assert.deepEqual(medicalPayload.medications, ['inhaler']);
    assert.deepEqual(medicalPayload.restrictions, ['Warm up before sprinting']);
    assert.equal(medicalPayload.doctorName, 'Dr. Kim');
    assert.equal(medicalPayload.doctorPhone, '+442071234568');
    assert.equal(medicalPayload.insuranceProvider, 'AXA');
    assert.equal(medicalPayload.insuranceNumber, 'AXA-778899');
    assert.equal(medicalPayload.emergencyNotes, 'Carry inhaler at all sessions');

    const emergency = await app.inject({
      method: 'PATCH',
      url: `/v1/athletes/${athleteId}/emergency-contacts`,
      headers: guardianHeaders,
      payload: {
        contacts: [
          {
            name: 'Parent One',
            relationship: 'parent',
            phone: '+447700900100',
            isPrimary: true,
            canPickup: true,
          },
        ],
      },
    });
    assert.equal(emergency.statusCode, 200);
    const emergencyPayload = emergency.json() as {
      athleteId: string;
      contacts: Array<{ id: string; name: string; isPrimary: boolean; canPickup: boolean }>;
    };
    assert.equal(emergencyPayload.athleteId, athleteId);
    assert.equal(emergencyPayload.contacts.length, 1);
    assert.match(emergencyPayload.contacts[0].id, /^emc_/);
    assert.equal(emergencyPayload.contacts[0].name, 'Parent One');
    assert.equal(emergencyPayload.contacts[0].isPrimary, true);
    assert.equal(emergencyPayload.contacts[0].canPickup, true);
    assert.equal('email' in emergencyPayload.contacts[0], false);

    const getEmergency = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/emergency-contacts`,
      headers: guardianHeaders,
    });
    assert.equal(getEmergency.statusCode, 200);
    const persisted = getEmergency.json() as { contacts: Array<{ name: string }> };
    assert.equal(persisted.contacts[0]?.name, 'Parent One');

    const consents = await app.inject({
      method: 'PUT',
      url: `/v1/athletes/${athleteId}/consents`,
      headers: guardianHeaders,
      payload: {
        consents: [
          {
            type: 'PHOTO',
            granted: true,
            grantedAt: '2026-03-18T10:00:00.000Z',
            grantedBy: 'Parent One',
            expiryAt: '2027-03-01T00:00:00.000Z',
          },
          {
            type: 'VIDEO',
            granted: false,
            grantedBy: '',
          },
          {
            type: 'SOCIAL_MEDIA',
            granted: false,
            grantedBy: '',
          },
          {
            type: 'EMERGENCY_TREATMENT',
            granted: true,
            grantedAt: '2026-03-18T10:00:00.000Z',
            grantedBy: 'Parent One',
            expiryAt: '2027-03-01T00:00:00.000Z',
          },
        ],
      },
    });
    assert.equal(consents.statusCode, 200);
    const consentPayload = consents.json() as {
      athleteId: string;
      consents: Array<{ type: string; granted: boolean; grantedBy: string }>;
    };
    assert.equal(consentPayload.athleteId, athleteId);
    assert.equal(consentPayload.consents.length, 4);
    assert.equal(
      consentPayload.consents.find((consent) => consent.type === 'PHOTO')?.granted,
      true,
    );
    const exposedConsentTypes = new Set(['PHOTO', 'VIDEO', 'SOCIAL_MEDIA', 'EMERGENCY_TREATMENT']);
    const firstCurrentConsentRows = asRows(getMarketplaceSeedStore().tables.childConsents).filter(
      (row) =>
        asString(row.athleteId) === athleteId &&
        exposedConsentTypes.has(asString(row.consentType) ?? '') &&
        !asString(row.supersededById),
    );
    assert.equal(firstCurrentConsentRows.length, 4);
    const firstCurrentConsentIds = new Set(
      firstCurrentConsentRows
        .map((row) => asString(row.id))
        .filter((id): id is string => Boolean(id)),
    );

    const updatedConsents = await app.inject({
      method: 'PUT',
      url: `/v1/athletes/${athleteId}/consents`,
      headers: guardianHeaders,
      payload: {
        consents: [
          {
            type: 'PHOTO',
            granted: false,
            grantedBy: '',
          },
          {
            type: 'VIDEO',
            granted: true,
            grantedAt: '2026-04-18T10:00:00.000Z',
            grantedBy: 'Parent One',
            expiryAt: '2027-04-01T00:00:00.000Z',
          },
          {
            type: 'SOCIAL_MEDIA',
            granted: false,
            grantedBy: '',
          },
          {
            type: 'EMERGENCY_TREATMENT',
            granted: true,
            grantedAt: '2026-04-18T10:00:00.000Z',
            grantedBy: 'Parent One',
            expiryAt: '2027-04-01T00:00:00.000Z',
          },
        ],
      },
    });
    assert.equal(updatedConsents.statusCode, 200);
    const updatedConsentPayload = updatedConsents.json() as {
      consents: Array<{ type: string; granted: boolean }>;
    };
    assert.equal(
      updatedConsentPayload.consents.find((consent) => consent.type === 'PHOTO')?.granted,
      false,
    );
    assert.equal(
      updatedConsentPayload.consents.find((consent) => consent.type === 'VIDEO')?.granted,
      true,
    );
    const allConsentRows = asRows(getMarketplaceSeedStore().tables.childConsents).filter(
      (row) =>
        asString(row.athleteId) === athleteId &&
        exposedConsentTypes.has(asString(row.consentType) ?? ''),
    );
    const supersededFirstRows = allConsentRows.filter((row) =>
      firstCurrentConsentIds.has(asString(row.id) ?? ''),
    );
    assert.equal(supersededFirstRows.length, 4);
    assert.equal(
      supersededFirstRows.every((row) => Boolean(asString(row.supersededById))),
      true,
    );
    const latestConsentRows = allConsentRows.filter((row) => !asString(row.supersededById));
    assert.equal(latestConsentRows.length, 4);

    const athleteDetail = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}`,
      headers: guardianHeaders,
    });
    assert.equal(athleteDetail.statusCode, 200);
    const athleteDetailPayload = athleteDetail.json() as {
      consents?: Array<{ supersededById?: string | null }>;
    };
    assert.equal(Array.isArray(athleteDetailPayload.consents), true);
    assert.equal(
      athleteDetailPayload.consents?.every((consent) => !consent.supersededById),
      true,
    );

    const getConsents = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/consents`,
      headers: guardianHeaders,
    });
    assert.equal(getConsents.statusCode, 200);
    const persistedConsents = getConsents.json() as {
      consents: Array<{ type: string; granted: boolean }>;
    };
    assert.equal(
      persistedConsents.consents.find((consent) => consent.type === 'EMERGENCY_TREATMENT')?.granted,
      true,
    );

    const consentUpdateAudits = auditEventsFor(tables, {
      action: 'consents.update',
      resourceId: athleteId,
      result: 'SUCCESS',
    });
    assert.equal(consentUpdateAudits.length, 2);
    assert.deepEqual(consentUpdateAudits[0]?.metadataJson, {
      count: 4,
      grantedTypes: ['PHOTO', 'EMERGENCY_TREATMENT'],
      deniedTypes: ['VIDEO', 'SOCIAL_MEDIA'],
    });
    assert.deepEqual(consentUpdateAudits[1]?.metadataJson, {
      count: 4,
      grantedTypes: ['VIDEO', 'EMERGENCY_TREATMENT'],
      deniedTypes: ['PHOTO', 'SOCIAL_MEDIA'],
    });
    assert.equal(
      auditEventsFor(tables, {
        action: 'consents.read',
        resourceId: athleteId,
        result: 'SUCCESS',
      }).length,
      2,
    );
  });

  it('fails closed for athlete medical records in db mode when Prisma is unavailable', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const athleteId = 'ath_user2';
      const guardianHeaders = {
        'x-auth-user-id': 'usr_parent1',
        'x-auth-roles': 'parent',
        'x-acting-role': 'parent',
        'x-guardian-athlete-ids': athleteId,
      };

      const read = await app.inject({
        method: 'GET',
        url: `/v1/athletes/${athleteId}/medical`,
        headers: guardianHeaders,
      });
      assert.equal(read.statusCode, 503);
      assert.match(read.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(read.body.includes(athleteId), false);

      const write = await app.inject({
        method: 'PATCH',
        url: `/v1/athletes/${athleteId}/medical`,
        headers: guardianHeaders,
        payload: {
          conditions: ['asthma'],
          allergies: ['peanuts'],
          medications: ['inhaler'],
          restrictions: ['Warm up before sprinting'],
        },
      });
      assert.equal(write.statusCode, 503);
      assert.match(write.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(write.body.includes('peanuts'), false);
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });

  it('denies medical reads for unverified coaches and denies non-guardian writes', async () => {
    const athleteId = 'ath_user2';
    const verifiedCoachHeaders = {
      'x-auth-user-id': 'usr_coach1',
      'x-auth-roles': 'coach',
      'x-acting-role': 'coach',
      'x-coach-athlete-ids': athleteId,
      'x-coach-verified': '1',
    };

    const coachUnverified = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/medical`,
      headers: {
        'x-auth-user-id': 'usr_coach1',
        'x-auth-roles': 'coach',
        'x-acting-role': 'coach',
        'x-coach-athlete-ids': athleteId,
      },
    });
    assert.equal(coachUnverified.statusCode, 403);

    const coachVerified = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/medical`,
      headers: verifiedCoachHeaders,
    });
    assert.equal(coachVerified.statusCode, 200);

    const coachConsentRead = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/consents`,
      headers: verifiedCoachHeaders,
    });
    assert.equal(coachConsentRead.statusCode, 200);

    const coachConsentWrite = await app.inject({
      method: 'PUT',
      url: `/v1/athletes/${athleteId}/consents`,
      headers: verifiedCoachHeaders,
      payload: {
        consents: [{ type: 'PHOTO', granted: true, grantedBy: 'Coach' }],
      },
    });
    assert.equal(coachConsentWrite.statusCode, 403);

    const tables = getMarketplaceSeedStore().tables as SeedTables;
    assert.equal(
      auditEventsFor(tables, {
        action: 'consents.read',
        resourceId: athleteId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      asRows(tables.securityEvents).filter((row) => {
        const metadata = row.metadataJson as { action?: string } | undefined;
        return (
          asString(row.eventType) === 'authz.request_denied' &&
          metadata?.action === 'put:/v1/athletes/:athleteId/consents'
        );
      }).length,
      1,
    );

    const nonGuardianPatch = await app.inject({
      method: 'PATCH',
      url: '/v1/athletes/ath_user3/medical',
      headers: {
        'x-auth-user-id': 'usr_parent1',
        'x-auth-roles': 'parent',
        'x-acting-role': 'parent',
        'x-guardian-athlete-ids': 'ath_user1,ath_user2',
      },
      payload: {
        conditions: ['test-condition'],
      },
    });
    assert.equal(nonGuardianPatch.statusCode, 403);
  });

  it('ignores forged guardian trust headers on bearer-authenticated requests', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: 'olivia.barton@clubroom.demo',
        password: 'user',
      },
    });
    assert.equal(login.statusCode, 200);
    const loginPayload = login.json() as {
      tokens: { accessToken: string };
    };

    const medical = await app.inject({
      method: 'GET',
      url: '/v1/athletes/ath_user3/medical',
      headers: {
        authorization: `Bearer ${loginPayload.tokens.accessToken}`,
        'x-acting-role': 'parent',
        'x-guardian-athlete-ids': 'ath_user3',
      },
    });

    assert.equal(medical.statusCode, 403);
  });

  it('group roster injury logging requires verified assigned coach', async () => {
    const athleteId = 'ath_user3';

    const unverifiedCoach = await app.inject({
      method: 'POST',
      url: `/v1/athletes/${athleteId}/injuries`,
      headers: {
        'x-auth-user-id': 'usr_coach1',
        'x-auth-roles': 'coach',
        'x-acting-role': 'coach',
        'x-coach-athlete-ids': athleteId,
      },
      payload: {
        title: 'Ankle knock',
        type: 'LEFT_ANKLE',
        severity: 'low',
        notes: 'Attempt from group roster flow without verification.',
      },
    });
    assert.equal(unverifiedCoach.statusCode, 403);

    const unassignedCoach = await app.inject({
      method: 'POST',
      url: `/v1/athletes/${athleteId}/injuries`,
      headers: {
        'x-auth-user-id': 'usr_coach1',
        'x-auth-roles': 'coach',
        'x-acting-role': 'coach',
        'x-coach-athlete-ids': 'ath_user1',
        'x-coach-verified': '1',
      },
      payload: {
        title: 'Ankle knock',
        type: 'LEFT_ANKLE',
        severity: 'low',
        notes: 'Attempt from group roster flow without assignment.',
      },
    });
    assert.equal(unassignedCoach.statusCode, 403);

    const verifiedAssignedCoach = await app.inject({
      method: 'POST',
      url: `/v1/athletes/${athleteId}/injuries`,
      headers: {
        'x-auth-user-id': 'usr_coach1',
        'x-auth-roles': 'coach',
        'x-acting-role': 'coach',
        'x-coach-athlete-ids': `${athleteId},ath_user1`,
        'x-coach-verified': '1',
      },
      payload: {
        title: 'Ankle knock',
        type: 'LEFT_ANKLE',
        severity: 'low',
        notes: 'Successful group roster injury log.',
      },
    });
    assert.equal(verifiedAssignedCoach.statusCode, 201);
  });
});
