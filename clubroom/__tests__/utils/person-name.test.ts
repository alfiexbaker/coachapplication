import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isGenericPersonPlaceholder,
  resolveNonGenericPersonName,
  resolveUserProfileName,
} from '@/utils/person-name';

describe('person-name helpers', () => {
  it('rejects generic person placeholders used by booking fallbacks', () => {
    assert.equal(isGenericPersonPlaceholder('Athlete'), true);
    assert.equal(isGenericPersonPlaceholder('Parent'), true);
    assert.equal(isGenericPersonPlaceholder('User 12'), true);
    assert.equal(isGenericPersonPlaceholder('  Coach  '), true);
    assert.equal(isGenericPersonPlaceholder('Maya Patel'), false);
    assert.equal(isGenericPersonPlaceholder(''), false);
  });

  it('returns only real user profile names', () => {
    assert.equal(resolveNonGenericPersonName('  Athlete  '), undefined);
    assert.equal(resolveNonGenericPersonName('  Jordan Lee  '), 'Jordan Lee');
    assert.equal(resolveUserProfileName({ fullName: 'Parent', name: 'Sam Rivera' }), 'Sam Rivera');
    assert.equal(resolveUserProfileName({ fullName: 'Athlete', name: 'User 8' }), undefined);
  });
});
