import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildOwnerDemoWalkthrough,
  buildPrimaryDemoWalkthrough,
} from '../../utils/demo-walkthrough';

test('buildPrimaryDemoWalkthrough returns family walkthrough for users with children', () => {
  const walkthrough = buildPrimaryDemoWalkthrough({
    user: {
      role: 'USER',
      children: [{ childId: 'child_1', childName: 'Child One' }],
    },
  });

  assert.equal(walkthrough?.id, 'family_ops');
  assert.deepEqual(
    walkthrough?.steps.map((step) => step.id),
    ['family_dashboard', 'family_recurring', 'family_bookings'],
  );
});

test('buildPrimaryDemoWalkthrough returns athlete walkthrough for solo users', () => {
  const walkthrough = buildPrimaryDemoWalkthrough({
    user: {
      role: 'USER',
      children: [],
      skillLevel: 'INTERMEDIATE',
    },
  });

  assert.equal(walkthrough?.id, 'athlete_progress');
  assert.deepEqual(
    walkthrough?.steps.map((step) => step.id),
    ['athlete_bookings', 'athlete_goals', 'athlete_badges'],
  );
});

test('buildPrimaryDemoWalkthrough returns coach walkthrough for coaches', () => {
  const walkthrough = buildPrimaryDemoWalkthrough({
    user: {
      role: 'COACH',
      type: 'COACH',
    },
  });

  assert.equal(walkthrough?.id, 'coach_delivery');
  assert.deepEqual(
    walkthrough?.steps.map((step) => step.id),
    ['coach_bookings', 'coach_earnings', 'coach_manage'],
  );
});

test('buildPrimaryDemoWalkthrough returns admin walkthrough for system admins', () => {
  const walkthrough = buildPrimaryDemoWalkthrough({
    user: {
      role: 'USER',
      isSystemAdmin: true,
    },
  });

  assert.equal(walkthrough?.id, 'admin_ops');
  assert.deepEqual(
    walkthrough?.steps.map((step) => step.id),
    ['admin_users', 'admin_invites', 'admin_notifications'],
  );
});

test('buildOwnerDemoWalkthrough builds the seeded owner route sequence', () => {
  const walkthrough = buildOwnerDemoWalkthrough('club_123');

  assert.equal(walkthrough.id, 'owner_ops');
  assert.deepEqual(
    walkthrough.steps.map((step) => step.id),
    ['owner_dashboard', 'owner_staffing', 'owner_standards', 'owner_finance'],
  );
  assert.deepEqual(walkthrough.steps[0]?.route, {
    pathname: '/club/[clubId]/dashboard',
    params: { clubId: 'club_123' },
  });
});
