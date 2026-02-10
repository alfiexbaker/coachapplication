/**
 * Cancellation Service
 *
 * Handles booking cancellation records, no-show tracking, and policy retrieval.
 * Works alongside scheduling-rules-service for refund calculations.
 *
 * USER STORY:
 * "As a coach, I want to track cancellations and no-shows so I can
 * identify patterns and adjust my policies accordingly."
 *
 * "As a parent, I want a clear cancellation process that tells me
 * my refund amount before I confirm."
 */

import { apiClient } from './api-client';
import { schedulingRulesService } from '@/services/scheduling-rules-service';
import type { CancellationPolicy, RefundCalculation, RefundTier } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { type Result, type ServiceError, ok, err, storageError } from '@/types/result';
import { emitTyped, ServiceEvents } from './event-bus';

import { STORAGE_KEYS } from '@/constants/storage-keys';

const logger = createLogger('CancellationService');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CancellationRecord {
  id: string;
  bookingId: string;
  cancelledBy: 'parent' | 'coach';
  cancelledAt: string;
  reason: string;
  reasonCategory: string;
  note: string;
  refundAmount: number;
  refundPercentage: number;
  hoursBeforeSession: number;
  coachId: string;
  familyId?: string;
}

export interface CancellationTier {
  minHoursBefore: number;
  maxHoursBefore: number | null;
  refundPercent: number;
  label: string;
}

export { CancellationPolicy };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadRecords(): Promise<CancellationRecord[]> {
  try {
    return await apiClient.get<CancellationRecord[]>(STORAGE_KEYS.CANCELLATION_RECORDS, []);
  } catch (error) {
    logger.error('Failed to load cancellation records', error);
    return [];
  }
}

async function saveRecords(records: CancellationRecord[]): Promise<void> {
  await apiClient.set(STORAGE_KEYS.CANCELLATION_RECORDS, records);
}

async function loadNoShowCounts(): Promise<Record<string, number>> {
  try {
    return await apiClient.get<Record<string, number>>(STORAGE_KEYS.NO_SHOW_COUNTS, {});
  } catch (error) {
    logger.error('Failed to load no-show counts', error);
    return {};
  }
}

async function saveNoShowCounts(counts: Record<string, number>): Promise<void> {
  await apiClient.set(STORAGE_KEYS.NO_SHOW_COUNTS, counts);
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const cancellationService = {
  /**
   * Get the cancellation policy for a coach.
   * Delegates to schedulingRulesService.
   */
  async getCancellationPolicy(coachId: string): Promise<Result<CancellationPolicy | null, ServiceError>> {
    try {
      return await schedulingRulesService.getCancellationPolicy(coachId);
    } catch (error) {
      logger.error('Failed to get cancellation policy', error);
      return err(storageError('Failed to get cancellation policy'));
    }
  },

  /**
   * Save / update a cancellation policy for a coach.
   * Stores under STORAGE_KEYS.CANCELLATION_POLICIES via schedulingRulesService.
   */
  async saveCancellationPolicy(
    coachId: string,
    policy: {
      preset: 'flexible' | 'standard' | 'strict' | 'custom';
      customTiers?: RefundTier[];
    },
  ): Promise<Result<void, ServiceError>> {
    try {
      const saveResult = await schedulingRulesService.setCancellationPolicy(
        coachId,
        policy.preset,
        policy.customTiers,
      );
      if (!saveResult.success) {
        return saveResult;
      }
      logger.debug('Cancellation policy saved', { coachId, preset: policy.preset });
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to save cancellation policy', error);
      return err(storageError('Failed to save cancellation policy'));
    }
  },

  /**
   * Cancel a booking and record the cancellation.
   */
  async cancelBooking(
    bookingId: string,
    cancelledBy: string,
    details: {
      reason: string;
      note?: string;
      refundCalculation?: RefundCalculation | null;
      coachId?: string;
      familyId?: string;
    },
  ): Promise<Result<CancellationRecord, ServiceError>> {
    try {
      const records = await loadRecords();

      const record: CancellationRecord = {
        id: `cancel_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        bookingId,
        cancelledBy: cancelledBy as 'parent' | 'coach',
        cancelledAt: new Date().toISOString(),
        reason: details.reason,
        reasonCategory: details.reason,
        note: details.note ?? '',
        refundAmount: details.refundCalculation?.netRefundAmount ?? 0,
        refundPercentage: details.refundCalculation?.refundPercentage ?? 0,
        hoursBeforeSession: details.refundCalculation?.hoursUntilSession ?? 0,
        coachId: details.coachId ?? '',
        familyId: details.familyId,
      };

      records.push(record);
      await saveRecords(records);

      logger.info('Booking cancelled', {
        bookingId,
        cancelledBy,
        reason: details.reason,
        refundAmount: record.refundAmount,
      });
      emitTyped(ServiceEvents.CANCELLATION_RECORDED, {
        cancellationId: record.id,
        bookingId: record.bookingId,
        cancelledBy: record.cancelledBy,
        coachId: record.coachId,
        familyId: record.familyId,
      });

      return ok(record);
    } catch (error) {
      logger.error('Failed to cancel booking', { bookingId, cancelledBy, error });
      return err(storageError('Failed to cancel booking'));
    }
  },

  /**
   * Get all cancellation records, optionally filtered by coachId.
   */
  async getCancellationRecords(coachId?: string): Promise<Result<CancellationRecord[], ServiceError>> {
    try {
      const records = await loadRecords();
      if (!coachId) return ok(records);
      return ok(records.filter((r) => r.coachId === coachId));
    } catch (error) {
      logger.error('Failed to get cancellation records', { coachId, error });
      return err(storageError('Failed to get cancellation records'));
    }
  },

  /**
   * Get a single cancellation record by booking ID.
   */
  async getCancellationByBooking(
    bookingId: string,
  ): Promise<Result<CancellationRecord | null, ServiceError>> {
    try {
      const records = await loadRecords();
      return ok(records.find((r) => r.bookingId === bookingId) ?? null);
    } catch (error) {
      logger.error('Failed to get cancellation by booking', { bookingId, error });
      return err(storageError('Failed to get cancellation by booking'));
    }
  },

  /**
   * Get the no-show count for a family.
   */
  async getNoShowCount(familyId: string): Promise<Result<number, ServiceError>> {
    try {
      const counts = await loadNoShowCounts();
      return ok(counts[familyId] ?? 0);
    } catch (error) {
      logger.error('Failed to get no-show count', { familyId, error });
      return err(storageError('Failed to get no-show count'));
    }
  },

  /**
   * Increment the no-show counter for a family.
   */
  async incrementNoShow(familyId: string): Promise<Result<void, ServiceError>> {
    try {
      const counts = await loadNoShowCounts();
      counts[familyId] = (counts[familyId] ?? 0) + 1;
      await saveNoShowCounts(counts);
      logger.warn('No-show recorded', { familyId, total: counts[familyId] });
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to increment no-show', { familyId, error });
      return err(storageError('Failed to increment no-show'));
    }
  },

  /**
   * Reset no-show count for a family (e.g. after a grace period).
   */
  async resetNoShowCount(familyId: string): Promise<Result<void, ServiceError>> {
    try {
      const counts = await loadNoShowCounts();
      delete counts[familyId];
      await saveNoShowCounts(counts);
      logger.info('No-show count reset', { familyId });
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to reset no-show count', { familyId, error });
      return err(storageError('Failed to reset no-show count'));
    }
  },

  /**
   * Get the default cancellation tiers for a preset policy.
   * Used when a coach is setting up their policy for the first time.
   */
  getDefaultPolicy(preset: 'flexible' | 'standard' | 'strict'): CancellationTier[] {
    switch (preset) {
      case 'flexible':
        return [
          { minHoursBefore: 0, maxHoursBefore: 2, refundPercent: 50, label: 'Less than 2 hours' },
          { minHoursBefore: 2, maxHoursBefore: 12, refundPercent: 75, label: '2-12 hours before' },
          { minHoursBefore: 12, maxHoursBefore: null, refundPercent: 100, label: '12+ hours before' },
        ];
      case 'standard':
        return [
          { minHoursBefore: 0, maxHoursBefore: 4, refundPercent: 0, label: 'Less than 4 hours' },
          { minHoursBefore: 4, maxHoursBefore: 24, refundPercent: 50, label: '4-24 hours before' },
          { minHoursBefore: 24, maxHoursBefore: null, refundPercent: 100, label: '24+ hours before' },
        ];
      case 'strict':
        return [
          { minHoursBefore: 0, maxHoursBefore: 24, refundPercent: 0, label: 'Less than 24 hours' },
          { minHoursBefore: 24, maxHoursBefore: 48, refundPercent: 50, label: '24-48 hours before' },
          { minHoursBefore: 48, maxHoursBefore: null, refundPercent: 100, label: '48+ hours before' },
        ];
      default:
        return this.getDefaultPolicy('standard');
    }
  },

  /**
   * Determine which cancellation tier applies given how many hours remain.
   * Returns null if no tier matches (shouldn't happen with well-formed tiers).
   */
  getPolicyTier(
    policy: { tiers: CancellationTier[] },
    hoursUntilSession: number,
  ): CancellationTier | null {
    for (const tier of policy.tiers) {
      const matchesMin = hoursUntilSession >= tier.minHoursBefore;
      const matchesMax = tier.maxHoursBefore === null || hoursUntilSession < tier.maxHoursBefore;
      if (matchesMin && matchesMax) {
        return tier;
      }
    }
    return null;
  },

  /**
   * Get cancellation stats for a coach (for analytics).
   */
  async getCancellationStats(
    coachId: string,
  ): Promise<Result<{
    totalCancellations: number;
    byCoach: number;
    byParent: number;
    topReasons: { reason: string; count: number }[];
    avgHoursBeforeSession: number;
  }, ServiceError>> {
    try {
      const records = await loadRecords();
      const coachRecords = records.filter((r) => r.coachId === coachId);

      const byCoach = coachRecords.filter((r) => r.cancelledBy === 'coach').length;
      const byParent = coachRecords.filter((r) => r.cancelledBy === 'parent').length;

    // Count reasons
      const reasonCounts: Record<string, number> = {};
      for (const r of coachRecords) {
        reasonCounts[r.reasonCategory] = (reasonCounts[r.reasonCategory] ?? 0) + 1;
      }
      const topReasons = Object.entries(reasonCounts)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const avgHours =
        coachRecords.length > 0
          ? coachRecords.reduce((sum, r) => sum + r.hoursBeforeSession, 0) / coachRecords.length
          : 0;

      return ok({
        totalCancellations: coachRecords.length,
        byCoach,
        byParent,
        topReasons,
        avgHoursBeforeSession: Math.round(avgHours * 10) / 10,
      });
    } catch (error) {
      logger.error('Failed to get cancellation stats', { coachId, error });
      return err(storageError('Failed to get cancellation stats'));
    }
  },
};
