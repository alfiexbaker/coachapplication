import assert from 'node:assert/strict';
import test from 'node:test';

import { hasChildren, isParentLikeUser } from '../../utils/user-helpers';

test('isParentLikeUser returns true for legacy parent roles and child-bearing user accounts', () => {
  assert.equal(isParentLikeUser({ role: 'PARENT' }), true);
  assert.equal(isParentLikeUser({ role: 'USER', hasChildren: true }), true);
  assert.equal(isParentLikeUser({ role: 'USER', childrenCount: 2 }), true);
  assert.equal(
    isParentLikeUser({
      role: 'USER',
      children: [{ childId: 'child_1', childName: 'Child One' }],
    }),
    true,
  );
  assert.equal(isParentLikeUser({ role: 'USER' }), false);
});

test('hasChildren respects flags, counts, and linked child references', () => {
  assert.equal(hasChildren({ role: 'USER', hasChildren: true }), true);
  assert.equal(hasChildren({ role: 'USER', childrenCount: 1 }), true);
  assert.equal(
    hasChildren({
      role: 'USER',
      children: [{ childId: 'child_1', childName: 'Child One' }],
    }),
    true,
  );
  assert.equal(hasChildren({ role: 'USER', childrenCount: 0, children: [] }), false);
});
