/**
 * Cancellation Service Tests
 *
 * Tests for cancellation records, no-show tracking, policy tiers,
 * and cancellation stats.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { cancellationService } from '../../services/cancellation-service';
import { apiClient } from '../../services/api-client';
import type { Result, ServiceError } from '@/types/result';

const rid = () => Math.random().toString(36).slice(2, 10);

function expectOk<T>(result: Result<T, ServiceError>): T {
  assert.equal(result.success, true);
  return result.data;
}

describe('cancellationService', () => {
  beforeEach(async () => {
    await apiClient.remove('clubroom.cancellation_records');
    await apiClient.remove('clubroom.no_show_counts');
  });

  // ---------------------------------------------------------------------------
  // cancelBooking
  // ---------------------------------------------------------------------------
  describe('cancelBooking', () => {
    test('creates a cancellation record', async () => {
      const bookingId = `bk_${rid()}`;
      const record = expectOk(await cancellationService.cancelBooking(bookingId, 'parent', {
        reason: 'Schedule conflict',
        note: 'Child has a school event',
        coachId: `coach_${rid()}`,
      }));

      assert.ok(record.id);
      assert.equal(record.bookingId, bookingId);
      assert.equal(record.cancelledBy, 'parent');
      assert.equal(record.reason, 'Schedule conflict');
    });

    test('records refund amount from refundCalculation', async () => {
      const record = expectOk(await cancellationService.cancelBooking(`bk_${rid()}`, 'coach', {
        reason: 'Weather',
        coachId: `c_${rid()}`,
        refundCalculation: {
          originalAmount: 25,
          refundAmount: 25,
          platformFee: 0,
          netRefundAmount: 25,
          refundPercentage: 100,
          hoursUntilSession: 48,
          appliedTier: null,
          explanation: 'Full refund',
          isEligible: true,
        },
      }));

      assert.equal(record.refundAmount, 25);
      assert.equal(record.refundPercentage, 100);
    });
  });

  // ---------------------------------------------------------------------------
  // getCancellationRecords
  // ---------------------------------------------------------------------------
  describe('getCancellationRecords', () => {
    test('returns all records when no filter', async () => {
      await cancellationService.cancelBooking(`bk_${rid()}`, 'parent', {
        reason: 'R1', coachId: 'coach_A',
      });
      await cancellationService.cancelBooking(`bk_${rid()}`, 'coach', {
        reason: 'R2', coachId: 'coach_B',
      });

      const records = expectOk(await cancellationService.getCancellationRecords());
      assert.ok(records.length >= 2);
    });

    test('filters by coachId', async () => {
      const coachId = `coach_${rid()}`;
      await cancellationService.cancelBooking(`bk_${rid()}`, 'parent', {
        reason: 'R', coachId,
      });
      await cancellationService.cancelBooking(`bk_${rid()}`, 'parent', {
        reason: 'R', coachId: `other_${rid()}`,
      });

      const records = expectOk(await cancellationService.getCancellationRecords(coachId));
      assert.equal(records.length, 1);
    });
  });

  // ---------------------------------------------------------------------------
  // getCancellationByBooking
  // ---------------------------------------------------------------------------
  describe('getCancellationByBooking', () => {
    test('returns record for known booking', async () => {
      const bookingId = `bk_${rid()}`;
      await cancellationService.cancelBooking(bookingId, 'parent', {
        reason: 'Sick', coachId: `c_${rid()}`,
      });

      const record = expectOk(await cancellationService.getCancellationByBooking(bookingId));
      assert.ok(record);
      assert.equal(record!.bookingId, bookingId);
    });

    test('returns null for unknown booking', async () => {
      const record = expectOk(await cancellationService.getCancellationByBooking(`unknown_${rid()}`));
      assert.equal(record, null);
    });
  });

  // ---------------------------------------------------------------------------
  // No-show tracking
  // ---------------------------------------------------------------------------
  describe('no-show tracking', () => {
    test('getNoShowCount returns 0 for new family', async () => {
      const count = expectOk(await cancellationService.getNoShowCount(`fam_${rid()}`));
      assert.equal(count, 0);
    });

    test('incrementNoShow increases count', async () => {
      const familyId = `fam_${rid()}`;
      expectOk(await cancellationService.incrementNoShow(familyId));
      expectOk(await cancellationService.incrementNoShow(familyId));

      const count = expectOk(await cancellationService.getNoShowCount(familyId));
      assert.equal(count, 2);
    });

    test('resetNoShowCount resets to 0', async () => {
      const familyId = `fam_${rid()}`;
      expectOk(await cancellationService.incrementNoShow(familyId));
      expectOk(await cancellationService.incrementNoShow(familyId));
      expectOk(await cancellationService.resetNoShowCount(familyId));

      const count = expectOk(await cancellationService.getNoShowCount(familyId));
      assert.equal(count, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // getDefaultPolicy
  // ---------------------------------------------------------------------------
  describe('getDefaultPolicy', () => {
    test('flexible preset returns 3 tiers', () => {
      const tiers = cancellationService.getDefaultPolicy('flexible');
      assert.equal(tiers.length, 3);
      assert.equal(tiers[2].refundPercent, 100);
    });

    test('standard preset returns 3 tiers', () => {
      const tiers = cancellationService.getDefaultPolicy('standard');
      assert.equal(tiers.length, 3);
      assert.equal(tiers[0].refundPercent, 0);
    });

    test('strict preset returns 3 tiers', () => {
      const tiers = cancellationService.getDefaultPolicy('strict');
      assert.equal(tiers.length, 3);
      assert.equal(tiers[0].refundPercent, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // getPolicyTier
  // ---------------------------------------------------------------------------
  describe('getPolicyTier', () => {
    test('returns correct tier for hours', () => {
      const policy = { tiers: cancellationService.getDefaultPolicy('standard') };

      const earlyTier = cancellationService.getPolicyTier(policy, 48);
      assert.ok(earlyTier);
      assert.equal(earlyTier!.refundPercent, 100);

      const midTier = cancellationService.getPolicyTier(policy, 12);
      assert.ok(midTier);
      assert.equal(midTier!.refundPercent, 50);

      const lateTier = cancellationService.getPolicyTier(policy, 2);
      assert.ok(lateTier);
      assert.equal(lateTier!.refundPercent, 0);
    });

    test('returns null for empty tiers', () => {
      const result = cancellationService.getPolicyTier({ tiers: [] }, 10);
      assert.equal(result, null);
    });
  });

  // ---------------------------------------------------------------------------
  // getCancellationStats
  // ---------------------------------------------------------------------------
  describe('getCancellationStats', () => {
    test('returns stats for coach with records', async () => {
      const coachId = `coach_${rid()}`;
      await cancellationService.cancelBooking(`bk_${rid()}`, 'parent', {
        reason: 'Sick', coachId,
      });
      await cancellationService.cancelBooking(`bk_${rid()}`, 'coach', {
        reason: 'Weather', coachId,
      });

      const stats = expectOk(await cancellationService.getCancellationStats(coachId));
      assert.equal(stats.totalCancellations, 2);
      assert.equal(stats.byParent, 1);
      assert.equal(stats.byCoach, 1);
      assert.ok(stats.topReasons.length > 0);
    });

    test('returns zero stats for coach with no records', async () => {
      const stats = expectOk(await cancellationService.getCancellationStats(`none_${rid()}`));
      assert.equal(stats.totalCancellations, 0);
    });
  });
});
