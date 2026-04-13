import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, beforeEach, describe, it } from 'node:test';
import { env } from '@clubroom/config';
import { buildApp } from '../../app.js';
import { resetAuthRuntimeForTests } from '../../lib/auth-runtime.js';
import { resetDbFixtureStoreForTests } from '../../lib/db-fixture-store.js';
import { resetMarketplaceSeedStoreForTests } from '../../lib/marketplace-seed-store.js';
import { resetFamilyAthleteRouteStateForTests } from './routes.js';

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

  it('creates and updates athletes for an authenticated family member', async () => {
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
      },
    });
    assert.equal(create.statusCode, 201);
    const created = create.json() as { athleteId: string; firstName: string; communicationNotes: string | null };
    assert.match(created.athleteId, /^ath_/);
    assert.equal(created.firstName, 'New');
    assert.equal(created.communicationNotes, 'Needs short instructions');

    const update = await app.inject({
      method: 'PATCH',
      url: `/v1/athletes/${created.athleteId}`,
      headers,
      payload: {
        nickname: 'NP',
        behavioralNotes: 'Settles better with early warmups',
      },
    });
    assert.equal(update.statusCode, 200);
    const updated = update.json() as { athleteId: string; nickname: string | null; behavioralNotes: string | null };
    assert.equal(updated.athleteId, created.athleteId);
    assert.equal(updated.nickname, 'NP');
    assert.equal(updated.behavioralNotes, 'Settles better with early warmups');

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
    const createdAthlete = familyPayload.athletes.find((athlete) => athlete.id === created.athleteId);
    assert.ok(createdAthlete, 'expected created athlete in family aggregate');
    assert.equal(createdAthlete?.nickname, 'NP');
    assert.equal(createdAthlete?.behavioralNotes, 'Settles better with early warmups');
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
        (membership) => asString(membership.familyId) === familyId && asString(membership.userId) === userId,
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

  it('persists athlete profile writes through the db fixture backend', async () => {
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
      assert.equal(create.statusCode, 201);
      const created = create.json() as { athleteId: string };

      const detail = await app.inject({
        method: 'GET',
        url: `/v1/athletes/${created.athleteId}`,
        headers,
      });
      assert.equal(detail.statusCode, 200);
      const payload = detail.json() as {
        athleteId: string;
        firstName: string;
        relationship: string;
        specialNeeds: Array<{ name: string }>;
      };
      assert.equal(payload.athleteId, created.athleteId);
      assert.equal(payload.firstName, 'Db');
      assert.equal(payload.relationship, 'DAUGHTER');
      assert.equal(payload.specialNeeds[0]?.name, 'Needs visual prompts');
    } finally {
      env.API_DATA_BACKEND = originalBackend;
      resetDbFixtureStoreForTests();
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

  it('creates, lists, and updates injuries', async () => {
    const athleteId = 'ath_user1';
    const athleteHeaders = {
      'x-auth-user-id': 'usr_user1',
      'x-auth-roles': 'athlete',
      'x-acting-role': 'athlete',
    };

    const create = await app.inject({
      method: 'POST',
      url: `/v1/athletes/${athleteId}/injuries`,
      headers: athleteHeaders,
      payload: {
        title: 'Hamstring strain',
        type: 'muscle',
        severity: 'medium',
        notes: 'Pulled during sprint drill',
      },
    });
    assert.equal(create.statusCode, 201);
    const created = create.json() as { id: string; status: string; athleteId: string };
    assert.match(created.id, /^inj_/);
    assert.equal(created.status, 'active');
    assert.equal(created.athleteId, athleteId);

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

    const patch = await app.inject({
      method: 'PATCH',
      url: `/v1/injuries/${created.id}`,
      headers: athleteHeaders,
      payload: {
        status: 'resolved',
        notes: 'Cleared to play',
      },
    });
    assert.equal(patch.statusCode, 200);
    const updated = patch.json() as { status: string; resolvedAt: string | null; notes: string | null };
    assert.equal(updated.status, 'resolved');
    assert.equal(typeof updated.resolvedAt, 'string');
    assert.equal(updated.notes, 'Cleared to play');
  });

  it('upserts and reads medical, emergency contacts, and consents', async () => {
    const athleteId = 'ath_user2';
    const guardianHeaders = {
      'x-auth-user-id': 'usr_parent1',
      'x-auth-roles': 'parent',
      'x-acting-role': 'parent',
      'x-guardian-athlete-ids': athleteId,
    };

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
            email: 'parent.one@example.com',
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
    assert.equal(consentPayload.consents.find((consent) => consent.type === 'PHOTO')?.granted, true);

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
  });

  it('denies medical reads for unverified coaches and denies non-guardian writes', async () => {
    const athleteId = 'ath_user2';

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
      headers: {
        'x-auth-user-id': 'usr_coach1',
        'x-auth-roles': 'coach',
        'x-acting-role': 'coach',
        'x-coach-athlete-ids': athleteId,
        'x-coach-verified': '1',
      },
    });
    assert.equal(coachVerified.statusCode, 200);

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
