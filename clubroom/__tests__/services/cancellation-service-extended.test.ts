/**
 * Cancellation Service — Extended Tests
 *
 * Additional coverage for cancellation records, event emission,
 * no-show tracking, default policies, tier matching, and stats.
 */

import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

import { cancellationService } from '@/services/cancellation-service';
import { apiClient } from '@/services/api-client';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { Result, ServiceError } from '@/types/result';

const rid = () => Math.random().toString(36).slice(2, 10);

function expectOk<T>(result: Result<T, ServiceError>): T {
  assert.equal(result.success, true, `Expected ok but got err: ${JSON.stringify(result)}`);
  return result.data;
}

describe('cancellationService (extended)', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.CANCELLATION_RECORDS);
    await apiClient.remove(STORAGE_KEYS.NO_SHOW_COUNTS);
  });

  // ---------------------------------------------------------------------------
  // cancelBooking — happy path
  // ---------------------------------------------------------------------------
  describe('cancelBooking', () => {
    it('creates a record and returns ok(record)', async () => {
      const bookingId = `bk_${rid()}`;
      const coachId = `coach_${rid()}`;

      const record = expectOk(
        await cancellationService.cancelBooking(bookingId, 'parent', {
          reason: 'Child is unwell',
          note: 'Fever since morning',
          coachId,
          familyId: `fam_${rid()}`,
        }),
      );

      assert.ok(record.id);
      assert.equal(record.bookingId, bookingId);
      assert.equal(record.cancelledBy, 'parent');
      assert.equal(record.reason, 'Child is unwell');
      assert.equal(record.note, 'Fever since morning');
      assert.equal(record.coachId, coachId);
      assert.ok(record.cancelledAt);
    });

    it('emits CANCELLATION_RECORDED event', async () => {
      const bookingId = `bk_${rid()}`;
      const coachId = `coach_${rid()}`;
      let emitted: Record<string, unknown> | null = null;

      const unsub = onTyped(ServiceEvents.CANCELLATION_RECORDED, (payload) => {
        emitted = payload as unknown as Record<string, unknown>;
      });

      try {
        const record = expectOk(
          await cancellationService.cancelBooking(bookingId, 'coach', {
            reason: 'Weather',
            coachId,
          }),
        );

        assert.ok(emitted, 'CANCELLATION_RECORDED event should fire');
        assert.equal((emitted as Record<string, unknown>).bookingId, bookingId);
        assert.equal((emitted as Record<string, unknown>).cancellationId, record.id);
        assert.equal((emitted as Record<string, unknown>).cancelledBy, 'coach');
        assert.equal((emitted as Record<string, unknown>).coachId, coachId);
      } finally {
        unsub();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getCancellationRecords
  // ---------------------------------------------------------------------------
  describe('getCancellationRecords', () => {
    it('returns ok([]) when empty', async () => {
      const records = expectOk(await cancellationService.getCancellationRecords());
      assert.ok(Array.isArray(records));
      assert.equal(records.length, 0);
    });

    it('filters by coachId', async () => {
      const coachA = `coach_${rid()}`;
      const coachB = `coach_${rid()}`;

      await cancellationService.cancelBooking(`bk_${rid()}`, 'parent', { reason: 'R1', coachId: coachA });
      await cancellationService.cancelBooking(`bk_${rid()}`, 'parent', { reason: 'R2', coachId: coachB });
      await cancellationService.cancelBooking(`bk_${rid()}`, 'coach', { reason: 'R3', coachId: coachA });

      const records = expectOk(await cancellationService.getCancellationRecords(coachA));
      assert.equal(records.length, 2);
      for (const r of records) {
        assert.equal(r.coachId, coachA);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getCancellationByBooking
  // ---------------------------------------------------------------------------
  describe('getCancellationByBooking', () => {
    it('returns ok(null) for missing booking', async () => {
      const record = expectOk(
        await cancellationService.getCancellationByBooking(`missing_${rid()}`),
      );
      assert.equal(record, null);
    });

    it('returns the record for a known booking', async () => {
      const bookingId = `bk_${rid()}`;
      await cancellationService.cancelBooking(bookingId, 'parent', {
        reason: 'Holiday',
        coachId: `c_${rid()}`,
      });

      const record = expectOk(await cancellationService.getCancellationByBooking(bookingId));
      assert.ok(record);
      assert.equal(record!.bookingId, bookingId);
    });
  });

  // ---------------------------------------------------------------------------
  // No-show tracking
  // ---------------------------------------------------------------------------
  describe('getNoShowCount', () => {
    it('returns ok(0) for unknown family', async () => {
      const count = expectOk(await cancellationService.getNoShowCount(`fam_${rid()}`));
      assert.equal(count, 0);
    });
  });

  describe('incrementNoShow', () => {
    it('increments count to 1 after first call', async () => {
      const familyId = `fam_${rid()}`;
      expectOk(await cancellationService.incrementNoShow(familyId));

      const count = expectOk(await cancellationService.getNoShowCount(familyId));
      assert.equal(count, 1);
    });
  });

  describe('resetNoShowCount', () => {
    it('resets to 0 after increment', async () => {
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
    it('flexible preset returns 3 tiers, first has 50% refund', () => {
      const tiers = cancellationService.getDefaultPolicy('flexible');
      assert.equal(tiers.length, 3);
      assert.equal(tiers[0].refundPercent, 50);
    });

    it('standard preset returns 3 tiers, first has 0% refund', () => {
      const tiers = cancellationService.getDefaultPolicy('standard');
      assert.equal(tiers.length, 3);
      assert.equal(tiers[0].refundPercent, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // getPolicyTier
  // ---------------------------------------------------------------------------
  describe('getPolicyTier', () => {
    it('matches the correct tier for given hours', () => {
      const tiers = cancellationService.getDefaultPolicy('standard');
      const policy = { tiers };

      // 2 hours → first tier (0-4h, 0% refund)
      const late = cancellationService.getPolicyTier(policy, 2);
      assert.ok(late);
      assert.equal(late!.refundPercent, 0);

      // 12 hours → middle tier (4-24h, 50% refund)
      const mid = cancellationService.getPolicyTier(policy, 12);
      assert.ok(mid);
      assert.equal(mid!.refundPercent, 50);

      // 48 hours → last tier (24+, 100% refund)
      const early = cancellationService.getPolicyTier(policy, 48);
      assert.ok(early);
      assert.equal(early!.refundPercent, 100);
    });

    it('returns null for empty tiers', () => {
      const result = cancellationService.getPolicyTier({ tiers: [] }, 10);
      assert.equal(result, null);
    });

    it('handles boundary values correctly', () => {
      const tiers = cancellationService.getDefaultPolicy('standard');
      const policy = { tiers };

      // Exactly at boundary: 4 hours should match middle tier (>= 4)
      const atBoundary = cancellationService.getPolicyTier(policy, 4);
      assert.ok(atBoundary);
      assert.equal(atBoundary!.refundPercent, 50);

      // Exactly at boundary: 24 hours should match top tier (>= 24)
      const atTopBoundary = cancellationService.getPolicyTier(policy, 24);
      assert.ok(atTopBoundary);
      assert.equal(atTopBoundary!.refundPercent, 100);
    });
  });

  // ---------------------------------------------------------------------------
  // getCancellationStats
  // ---------------------------------------------------------------------------
  describe('getCancellationStats', () => {
    it('returns ok with 0 totals when empty', async () => {
      const stats = expectOk(
        await cancellationService.getCancellationStats(`coach_${rid()}`),
      );

      assert.equal(stats.totalCancellations, 0);
      assert.equal(stats.byCoach, 0);
      assert.equal(stats.byParent, 0);
      assert.equal(stats.topReasons.length, 0);
      assert.equal(stats.avgHoursBeforeSession, 0);
    });

    it('computes stats correctly with multiple records', async () => {
      const coachId = `coach_${rid()}`;
      await cancellationService.cancelBooking(`bk_${rid()}`, 'parent', {
        reason: 'Sick',
        coachId,
      });
      await cancellationService.cancelBooking(`bk_${rid()}`, 'parent', {
        reason: 'Sick',
        coachId,
      });
      await cancellationService.cancelBooking(`bk_${rid()}`, 'coach', {
        reason: 'Weather',
        coachId,
      });

      const stats = expectOk(await cancellationService.getCancellationStats(coachId));
      assert.equal(stats.totalCancellations, 3);
      assert.equal(stats.byParent, 2);
      assert.equal(stats.byCoach, 1);
      assert.ok(stats.topReasons.length >= 1);
      // "Sick" should be the top reason
      assert.equal(stats.topReasons[0].reason, 'Sick');
      assert.equal(stats.topReasons[0].count, 2);
    });
  });
});
