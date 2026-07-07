import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canManageSessionOperations,
  isAssignedSessionCoach,
} from '../../utils/session-ownership-authority';

describe('session ownership authority', () => {
  it('allows an assigned coach to manage their own session operations', () => {
    assert.equal(
      canManageSessionOperations({
        actingAs: 'club',
        assigneeCoachId: 'coach_1',
        currentUserId: 'coach_1',
        canManageClubAssignments: false,
      }),
      true,
    );
  });

  it('allows assignment-capable club staff to manage club-owned session operations', () => {
    assert.equal(
      canManageSessionOperations({
        actingAs: 'club',
        coachId: 'coach_1',
        currentUserId: 'owner_1',
        canManageClubAssignments: true,
      }),
      true,
    );
  });

  it('does not treat creator status as club-owned operational authority', () => {
    assert.equal(
      canManageSessionOperations({
        actingAs: 'club',
        coachId: 'coach_1',
        currentUserId: 'creator_1',
        canManageClubAssignments: false,
      }),
      false,
    );
  });

  it('recognizes owner or assignee coach ids as assigned coach authority', () => {
    assert.equal(
      isAssignedSessionCoach({
        coachId: 'coach_1',
        ownerCoachId: 'owner_coach_1',
        assigneeCoachId: 'assignee_1',
        currentUserId: 'owner_coach_1',
      }),
      true,
    );
  });
});
