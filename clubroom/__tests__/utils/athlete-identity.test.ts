import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isSelfAthleteTarget,
  resolveSelfAthleteId,
  resolveSelfAthleteName,
} from '@/utils/athlete-identity';

test('linked athlete identity takes precedence over account identity', () => {
  const user = {
    id: 'usr_athlete',
    athleteId: 'ath_real_profile',
    athleteName: 'Alfie Barton',
    name: 'Alex Barton',
  };

  assert.equal(resolveSelfAthleteId(user), 'ath_real_profile');
  assert.equal(resolveSelfAthleteName(user), 'Alfie Barton');
  assert.equal(isSelfAthleteTarget(user, 'ath_real_profile'), true);
  assert.equal(isSelfAthleteTarget(user, 'usr_athlete'), true);
  assert.equal(isSelfAthleteTarget(user, 'ath_someone_else'), false);
});

test('unlinked accounts keep the existing user identity fallback', () => {
  const user = { id: 'usr_parent', fullName: 'Jordan Parent' };
  assert.equal(resolveSelfAthleteId(user), 'usr_parent');
  assert.equal(resolveSelfAthleteName(user), 'Jordan Parent');
});
