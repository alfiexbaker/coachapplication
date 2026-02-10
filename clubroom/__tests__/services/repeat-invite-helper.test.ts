/**
 * Repeat Invite Helper Tests
 *
 * Tests for the "repeat next week" slot finder helper.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { findRepeatSlot } from '../../services/invite/repeat-invite-helper';

describe('findRepeatSlot', () => {
  test('returns a result object', async () => {
    const result = await findRepeatSlot('coach_1', '2026-06-15', '09:00');
    assert.ok(result !== undefined);
    assert.ok('primarySlot' in result);
    assert.ok('alternatives' in result);
  });

  test('alternatives is an array', async () => {
    const result = await findRepeatSlot('coach_1', '2026-06-15', '09:00');
    assert.ok(Array.isArray(result.alternatives));
  });
});
