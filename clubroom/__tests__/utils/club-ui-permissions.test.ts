import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ClubMembership } from '../../constants/types';
import {
  canCreateClubPost,
  canCreateClubScheduleItems,
  canManageClubUi,
  canShareClubInvite,
  canViewClubOwnerDashboard,
  getClubRoleLabel,
} from '../../utils/club-ui-permissions';

function membership(
  role: ClubMembership['role'],
  options: Partial<
    Pick<ClubMembership, 'canCreateSessions' | 'canPostAsClub' | 'status'>
  > = {},
): ClubMembership {
  return {
    clubId: 'club_1',
    userId: 'user_1',
    role,
    status: options.status ?? 'active',
    joinSource: 'invite',
    canPostAsClub: options.canPostAsClub,
    canCreateSessions: options.canCreateSessions,
  };
}

describe('club UI permissions', () => {
  it('uses governance labels including assistant', () => {
    assert.equal(getClubRoleLabel('ASSISTANT'), 'Assistant');
    assert.equal(getClubRoleLabel(null), 'Member');
  });

  it('requires explicit post capability or grant', () => {
    assert.equal(canCreateClubPost(membership('OWNER')), true);
    assert.equal(canCreateClubPost(membership('HEAD_COACH')), true);
    assert.equal(canCreateClubPost(membership('COACH')), false);
    assert.equal(canCreateClubPost(membership('COACH', { canPostAsClub: true })), true);
    assert.equal(canCreateClubPost(membership('ASSISTANT')), false);
    assert.equal(canCreateClubPost(membership('MEMBER')), false);
    assert.equal(canCreateClubPost(membership('OWNER', { status: 'pending' })), false);
  });

  it('uses grant-aware org-session capability for schedule create actions', () => {
    assert.equal(canCreateClubScheduleItems(membership('OWNER')), true);
    assert.equal(canCreateClubScheduleItems(membership('HEAD_COACH')), true);
    assert.equal(canCreateClubScheduleItems(membership('COACH')), false);
    assert.equal(
      canCreateClubScheduleItems(membership('COACH', { canCreateSessions: true })),
      true,
    );
    assert.equal(canCreateClubScheduleItems(membership('ASSISTANT')), false);
    assert.equal(canCreateClubScheduleItems(membership('OWNER', { status: 'pending' })), false);
  });

  it('keeps invite sharing and owner dashboard scoped', () => {
    assert.equal(canShareClubInvite(membership('HEAD_COACH')), true);
    assert.equal(canManageClubUi(membership('ADMIN')), true);
    assert.equal(canShareClubInvite(membership('COACH', { canPostAsClub: true })), false);
    assert.equal(canManageClubUi(membership('OWNER', { status: 'pending' })), false);
    assert.equal(canViewClubOwnerDashboard('OWNER'), true);
    assert.equal(canViewClubOwnerDashboard('ADMIN'), true);
    assert.equal(canViewClubOwnerDashboard('HEAD_COACH'), false);
  });
});
