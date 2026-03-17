import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDemoRoleEntries } from '../../utils/demo-role-entry';

test('buildDemoRoleEntries returns stable seeded stories for owner, coach, parent, athlete, and admin', () => {
  const entries = buildDemoRoleEntries([
    {
      username: 'coach1',
      password: 'coach',
      role: 'COACH',
      name: 'Jess Okafor',
    },
    {
      username: 'parent1',
      password: 'user',
      role: 'USER',
      name: 'Chris Barton',
      hasChildren: true,
      children: [{ id: 'child_1' }],
    },
    {
      username: 'user1',
      password: 'user',
      role: 'USER',
      name: 'Alfie Barton',
      children: [],
    },
    {
      username: 'admin',
      password: 'admin',
      role: 'ADMIN',
      name: 'Admin User',
      isSystemAdmin: true,
    },
  ]);

  assert.deepEqual(
    entries.map((entry) => entry.id),
    ['owner_ops', 'coach_delivery', 'family_parent', 'athlete_progress', 'admin_ops'],
  );
  assert.equal(entries[0]?.username, 'coach1');
  assert.deepEqual(entries[0]?.initialRoute, {
    pathname: '/club/[clubId]/dashboard',
    params: { clubId: 'club_lions' },
  });
  assert.equal(entries[1]?.username, 'coach1');
  assert.equal(entries[2]?.username, 'parent1');
  assert.equal(entries[2]?.initialRoute, '/(tabs)/index');
  assert.equal(entries[3]?.username, 'user1');
  assert.equal(entries[4]?.username, 'admin');
});

test('buildDemoRoleEntries falls back to semantic matching when preferred usernames are unavailable', () => {
  const entries = buildDemoRoleEntries([
    {
      username: 'coach_alt',
      password: 'coach',
      role: 'COACH',
      name: 'Coach Alt',
    },
    {
      username: 'family_alt',
      password: 'user',
      role: 'USER',
      name: 'Family Alt',
      children: [{ id: 'child_1' }],
    },
    {
      username: 'athlete_alt',
      password: 'user',
      role: 'USER',
      name: 'Athlete Alt',
      children: [],
    },
    {
      username: 'admin_alt',
      password: 'admin',
      role: 'USER',
      name: 'Admin Alt',
      isSystemAdmin: true,
    },
  ]);

  assert.equal(entries.length, 4);
  assert.equal(entries.find((entry) => entry.id === 'owner_ops'), undefined);
  assert.equal(entries.find((entry) => entry.id === 'coach_delivery')?.username, 'coach_alt');
  assert.equal(entries.find((entry) => entry.id === 'family_parent')?.username, 'family_alt');
  assert.equal(entries.find((entry) => entry.id === 'athlete_progress')?.username, 'athlete_alt');
  assert.equal(entries.find((entry) => entry.id === 'admin_ops')?.username, 'admin_alt');
});
