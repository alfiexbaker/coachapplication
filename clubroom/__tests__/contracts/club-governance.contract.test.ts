import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatOrganizationRoleLabel,
  getAssignableClubRoles,
  getClubGovernanceSnapshot,
  parseOrganizationRole,
} from '@/contracts/club-governance';

describe('club governance contract', () => {
  it('normalizes external role strings into shared club roles', () => {
    assert.equal(parseOrganizationRole('club_admin'), 'ADMIN');
    assert.equal(parseOrganizationRole('head coach'), 'HEAD_COACH');
    assert.equal(parseOrganizationRole('assistant'), 'ASSISTANT');
    assert.equal(parseOrganizationRole('unknown_role'), null);
  });

  it('returns assignable roles in governance order', () => {
    assert.deepEqual(getAssignableClubRoles('OWNER'), [
      'ADMIN',
      'HEAD_COACH',
      'COACH',
      'ASSISTANT',
      'MEMBER',
    ]);
    assert.deepEqual(getAssignableClubRoles('HEAD_COACH'), [
      'COACH',
      'ASSISTANT',
      'MEMBER',
    ]);
  });

  it('exposes a stable governance snapshot for club consumers', () => {
    const headCoach = getClubGovernanceSnapshot('HEAD_COACH');
    const member = getClubGovernanceSnapshot('MEMBER');

    assert.equal(headCoach.canManageMembers, true);
    assert.equal(headCoach.canManageAssignments, true);
    assert.equal(headCoach.canViewCommercialMode, true);
    assert.equal(headCoach.visibility.medical, 'scoped');

    assert.equal(member.canManageMembers, false);
    assert.equal(member.canManageAssignments, false);
    assert.equal(member.visibility.finance, 'none');
  });

  it('formats role labels for UI fallbacks', () => {
    assert.equal(formatOrganizationRoleLabel('ASSISTANT'), 'Assistant');
    assert.equal(formatOrganizationRoleLabel(null), 'Member');
  });
});
