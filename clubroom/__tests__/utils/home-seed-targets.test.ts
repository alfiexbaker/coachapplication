import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildHomeSeedTargets } from '@/hooks/use-home-screen';
import type { ChildInfo } from '@/types/child-context';

function makeChild(id: string, name: string): ChildInfo {
  return {
    id,
    referenceId: id,
    profileId: id,
    name,
    fullName: name,
    initials: name.charAt(0),
    avatarUrl: null,
    age: null,
    dateOfBirth: null,
    colorCode: '#4B7BEC',
    squadIds: [],
    clubIds: [],
    hasSpecialNeeds: false,
    profile: null,
  };
}

describe('buildHomeSeedTargets', () => {
  it('prioritizes selected child and includes all children once for parent context', () => {
    const targets = buildHomeSeedTargets({
      isParent: true,
      selectedChildId: 'child_b',
      fallbackChildId: 'child_a',
      contextChildren: [makeChild('child_a', 'Kid A'), makeChild('child_b', 'Kid B')],
      currentUserId: 'user1',
      currentUserName: 'Parent User',
    });

    assert.deepEqual(
      targets.map((target) => target.athleteId),
      ['child_b', 'child_a'],
    );
    assert.equal(targets[0]?.athleteName, 'Kid B');
    assert.equal(targets[1]?.athleteName, 'Kid A');
  });

  it('falls back to fallback child id when parent context has no loaded child profiles', () => {
    const targets = buildHomeSeedTargets({
      isParent: true,
      selectedChildId: null,
      fallbackChildId: 'child_fallback',
      contextChildren: [],
      currentUserId: 'user1',
      currentUserName: 'Parent User',
    });

    assert.deepEqual(targets, [{ athleteId: 'child_fallback', athleteName: 'Child' }]);
  });

  it('uses current user for athlete context', () => {
    const targets = buildHomeSeedTargets({
      isParent: false,
      selectedChildId: null,
      fallbackChildId: null,
      contextChildren: [makeChild('child_unused', 'Kid U')],
      currentUserId: 'athlete_1',
      currentUserName: 'Athlete One',
    });

    assert.deepEqual(targets, [{ athleteId: 'athlete_1', athleteName: 'Athlete One' }]);
  });

  it('returns no targets when athlete context has no user id', () => {
    const targets = buildHomeSeedTargets({
      isParent: false,
      selectedChildId: null,
      fallbackChildId: null,
      contextChildren: [],
      currentUserId: undefined,
      currentUserName: undefined,
    });

    assert.deepEqual(targets, []);
  });
});
