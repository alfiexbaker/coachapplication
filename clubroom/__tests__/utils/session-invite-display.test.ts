// @ts-nocheck
/**
 * Tests for resolveInviteChildLabel utility
 *
 * Verifies child label resolution for multi-child parent invite experience.
 * The function resolves athleteIds to display names via getChildById callback.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getSessionInviteAthleteNames,
  getSessionInviteCoachName,
  getSessionInviteParentName,
  getSessionInviteServiceLabel,
  resolveInviteChildLabel,
} from '@/utils/session-invite-display';

// ============================================================================
// MOCK CHILDREN
// ============================================================================

interface MockChild {
  id: string;
  name: string;
  initials: string;
  colorCode: string;
}

const CHILDREN: Record<string, MockChild> = {
  child_tom: { id: 'child_tom', name: 'Tom', initials: 'T', colorCode: '#6366F1' },
  child_lucy: { id: 'child_lucy', name: 'Lucy', initials: 'L', colorCode: '#EC4899' },
  child_max: { id: 'child_max', name: 'Max', initials: 'M', colorCode: '#14B8A6' },
};

function mockGetChildById(id: string): MockChild | undefined {
  return CHILDREN[id];
}

// ============================================================================
// TESTS
// ============================================================================

describe('resolveInviteChildLabel', () => {
  it('returns undefined when isMultiChild is false (single-child parent = seamless)', () => {
    const result = resolveInviteChildLabel(
      ['child_tom'],
      mockGetChildById,
      false,
    );
    assert.strictEqual(result, undefined);
  });

  it('returns undefined when athleteIds is empty', () => {
    const result = resolveInviteChildLabel(
      [],
      mockGetChildById,
      true,
    );
    assert.strictEqual(result, undefined);
  });

  it('returns undefined when no children match (getChildById returns undefined for all)', () => {
    const result = resolveInviteChildLabel(
      ['unknown_child_1', 'unknown_child_2'],
      mockGetChildById,
      true,
    );
    assert.strictEqual(result, undefined);
  });

  it('returns single child name when 1 athleteId matches', () => {
    const result = resolveInviteChildLabel(
      ['child_tom'],
      mockGetChildById,
      true,
    );
    assert.strictEqual(result, 'Tom');
  });

  it('returns "Name1 + Name2" when 2 athleteIds match', () => {
    const result = resolveInviteChildLabel(
      ['child_tom', 'child_lucy'],
      mockGetChildById,
      true,
    );
    assert.strictEqual(result, 'Tom + Lucy');
  });

  it('returns "Name1 + Name2 + Name3" when 3 athleteIds match', () => {
    const result = resolveInviteChildLabel(
      ['child_tom', 'child_lucy', 'child_max'],
      mockGetChildById,
      true,
    );
    assert.strictEqual(result, 'Tom + Lucy + Max');
  });

  it('returns only matched names when some resolve and some do not', () => {
    const result = resolveInviteChildLabel(
      ['child_tom', 'unknown_child_1', 'child_lucy'],
      mockGetChildById,
      true,
    );
    assert.strictEqual(result, 'Tom + Lucy');
  });
});

describe('getSessionInviteServiceLabel', () => {
  it('formats backend service type tokens for display', () => {
    assert.strictEqual(
      getSessionInviteServiceLabel({ sessionType: 'one_to_one' } as never),
      '1-on-1 session',
    );
    assert.strictEqual(
      getSessionInviteServiceLabel({ sessionType: 'small_group' } as never),
      'Small-group session',
    );
  });
});

describe('session invite display labels', () => {
  it('uses resolved invite labels instead of internal ids', () => {
    const invite = {
      coachId: 'usr_1234567',
      coachName: 'Sam Taylor',
      athleteIds: ['ath_1234567'],
      athleteNames: ['Ava Singh'],
      parentId: 'usr_7654321',
      parentName: 'Priya Singh',
    } as never;

    assert.strictEqual(getSessionInviteCoachName(invite), 'Sam Taylor');
    assert.deepStrictEqual(getSessionInviteAthleteNames(invite), ['Ava Singh']);
    assert.strictEqual(getSessionInviteParentName(invite), 'Priya Singh');
  });

  it('hides internal ids when resolved labels are absent', () => {
    const invite = {
      coachId: 'usr_1234567',
      athleteIds: ['ath_1234567'],
      parentId: 'usr_7654321',
    } as never;

    assert.strictEqual(getSessionInviteCoachName(invite), 'Coach');
    assert.deepStrictEqual(getSessionInviteAthleteNames(invite), ['Athlete']);
    assert.strictEqual(getSessionInviteParentName(invite), 'Parent');
  });
});
