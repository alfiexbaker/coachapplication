import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { buildApp } from '../../app.js';

describe('family-athlete routes', () => {
  const app = buildApp();

  after(async () => {
    await app.close();
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

  it('upserts and reads medical and emergency contacts', async () => {
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
        emergencyNotes: 'Carry inhaler at all sessions',
      },
    });
    assert.equal(medical.statusCode, 200);
    const medicalPayload = medical.json() as {
      athleteId: string;
      conditions: string[];
      allergies: string[];
      emergencyNotes: string | null;
    };
    assert.equal(medicalPayload.athleteId, athleteId);
    assert.deepEqual(medicalPayload.conditions, ['asthma']);
    assert.deepEqual(medicalPayload.allergies, ['peanuts']);
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
          },
        ],
      },
    });
    assert.equal(emergency.statusCode, 200);
    const emergencyPayload = emergency.json() as {
      athleteId: string;
      contacts: Array<{ id: string; name: string }>;
    };
    assert.equal(emergencyPayload.athleteId, athleteId);
    assert.equal(emergencyPayload.contacts.length, 1);
    assert.match(emergencyPayload.contacts[0].id, /^emc_/);
    assert.equal(emergencyPayload.contacts[0].name, 'Parent One');

    const getEmergency = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${athleteId}/emergency-contacts`,
      headers: guardianHeaders,
    });
    assert.equal(getEmergency.statusCode, 200);
    const persisted = getEmergency.json() as { contacts: Array<{ name: string }> };
    assert.equal(persisted.contacts[0]?.name, 'Parent One');
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
