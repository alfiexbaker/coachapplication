import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldLoadFamilyChildren } from '../../hooks/child-context-helpers';

test('shouldLoadFamilyChildren skips coach and admin actors', () => {
  assert.equal(shouldLoadFamilyChildren({ role: 'COACH', hasChildren: true }), false);
  assert.equal(shouldLoadFamilyChildren({ role: 'ADMIN', hasChildren: true }), false);
});

test('shouldLoadFamilyChildren skips ordinary users without family context', () => {
  assert.equal(shouldLoadFamilyChildren({ role: 'USER', hasChildren: false, children: [] }), false);
  assert.equal(shouldLoadFamilyChildren({ role: 'USER' }), false);
});

test('shouldLoadFamilyChildren loads parent-like user actors', () => {
  assert.equal(shouldLoadFamilyChildren({ role: 'PARENT' }), true);
  assert.equal(shouldLoadFamilyChildren({ role: 'USER', hasChildren: true }), true);
  assert.equal(shouldLoadFamilyChildren({ role: 'USER', childrenCount: 1 }), true);
  assert.equal(
    shouldLoadFamilyChildren({
      role: 'USER',
      children: [
        {
          childId: 'athlete-1',
          childName: 'Test Athlete',
          relationshipType: 'PARENT_CHILD',
          addedAt: '2026-07-03T00:00:00.000Z',
        },
      ],
    }),
    true,
  );
});
