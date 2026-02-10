/**
 * Invite Hold Service Tests
 *
 * Tests for slot hold management during pending invites.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { inviteHoldService } from '../../services/invite-hold-service';

describe('inviteHoldService', () => {
  describe('createHolds', () => {
    test('creates hold records for slots', async () => {
      const holds = await inviteHoldService.createHolds(
        'coach_hold_1',
        'inv_hold_1',
        [{ date: '2026-06-15', startTime: '09:00', endTime: '10:00' }],
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      );

      assert.ok(Array.isArray(holds));
      assert.ok(holds.length >= 1);
      assert.equal(holds[0].coachId, 'coach_hold_1');
    });
  });

  describe('getActiveHolds', () => {
    test('returns array of holds for coach', async () => {
      const holds = await inviteHoldService.getActiveHolds('coach_hold_1');
      assert.ok(Array.isArray(holds));
    });
  });

  describe('isSlotHeld', () => {
    test('returns boolean', async () => {
      const result = await inviteHoldService.isSlotHeld('coach_1', '2026-06-15', '09:00');
      assert.equal(typeof result, 'boolean');
    });
  });

  describe('releaseHoldsForInvite', () => {
    test('does not throw for valid invite', async () => {
      await assert.doesNotReject(async () => {
        await inviteHoldService.releaseHoldsForInvite('inv_hold_1');
      });
    });
  });

  describe('releaseHolds', () => {
    test('does not throw for hold IDs', async () => {
      await assert.doesNotReject(async () => {
        await inviteHoldService.releaseHolds(['hold_1', 'hold_2']);
      });
    });
  });

  describe('cleanup', () => {
    test('returns number of cleaned up holds', async () => {
      const count = await inviteHoldService.cleanup();
      assert.equal(typeof count, 'number');
    });
  });
});
