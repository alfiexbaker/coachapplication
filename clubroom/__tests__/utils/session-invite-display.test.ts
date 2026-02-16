// @ts-nocheck
/**
 * Tests for resolveInviteChildLabel utility
 *
 * Verifies child label resolution for multi-child parent invite experience.
 * The function resolves athleteIds to display names via getChildById callback.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveInviteChildLabel } from '@/utils/session-invite-display';

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
