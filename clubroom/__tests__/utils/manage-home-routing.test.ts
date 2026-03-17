import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canRouteToOwnerDashboard,
  pickOwnerDashboardClubId,
} from '../../utils/manage-home-routing';

test('canRouteToOwnerDashboard only accepts owner and admin roles', () => {
  assert.equal(canRouteToOwnerDashboard('OWNER'), true);
  assert.equal(canRouteToOwnerDashboard('ADMIN'), true);
  assert.equal(canRouteToOwnerDashboard('HEAD_COACH'), false);
  assert.equal(canRouteToOwnerDashboard('COACH'), false);
  assert.equal(canRouteToOwnerDashboard(null), false);
});

test('pickOwnerDashboardClubId prefers the requested club when owner/admin access exists', () => {
  const clubId = pickOwnerDashboardClubId(
    [
      { clubId: 'club_b', role: 'OWNER', status: 'active' },
      { clubId: 'club_a', role: 'ADMIN', status: 'active' },
    ],
    'club_a',
  );

  assert.equal(clubId, 'club_a');
});

test('pickOwnerDashboardClubId does not jump to another owner club when a requested club is only coach-accessible', () => {
  const clubId = pickOwnerDashboardClubId(
    [
      { clubId: 'club_owner', role: 'OWNER', status: 'active' },
      { clubId: 'club_context', role: 'COACH', status: 'active' },
    ],
    'club_context',
  );

  assert.equal(clubId, null);
});

test('pickOwnerDashboardClubId prefers owner access before admin access when no club is requested', () => {
  const clubId = pickOwnerDashboardClubId([
    { clubId: 'club_admin', role: 'ADMIN', status: 'active' },
    { clubId: 'club_owner', role: 'OWNER', status: 'active' },
  ]);

  assert.equal(clubId, 'club_owner');
});

test('pickOwnerDashboardClubId ignores inactive and non-owner roles', () => {
  const clubId = pickOwnerDashboardClubId([
    { clubId: 'club_pending', role: 'OWNER', status: 'pending' },
    { clubId: 'club_head', role: 'HEAD_COACH', status: 'active' },
  ]);

  assert.equal(clubId, null);
});
