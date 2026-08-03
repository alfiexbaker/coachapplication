import assert from 'node:assert/strict';
import test from 'node:test';

import {
  scopeChildrenToCurrentUser,
  shouldLoadFamilyChildren,
} from '../../hooks/child-context-helpers';

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

test('scopeChildrenToCurrentUser hides family data across account transitions', () => {
  const children = [{ id: 'ath_child' }];

  assert.deepEqual(
    scopeChildrenToCurrentUser({
      children,
      ownerUserId: 'usr_parent',
      currentUserId: 'usr_athlete',
      isParentUser: false,
    }),
    [],
  );
  assert.deepEqual(
    scopeChildrenToCurrentUser({
      children,
      ownerUserId: 'usr_parent_a',
      currentUserId: 'usr_parent_b',
      isParentUser: true,
    }),
    [],
  );
  assert.equal(
    scopeChildrenToCurrentUser({
      children,
      ownerUserId: 'usr_parent',
      currentUserId: 'usr_parent',
      isParentUser: true,
    }),
    children,
  );
});
