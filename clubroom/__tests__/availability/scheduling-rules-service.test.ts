import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { schedulingRulesService } from '@/services/scheduling-rules-service';

describe('schedulingRulesService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SCHEDULING_RULES);
    await apiClient.remove(STORAGE_KEYS.CANCELLATION_POLICIES);
    schedulingRulesService.clearCache();
  });

  it('returns default rules for new coach (happy path)', async () => {
    const result = await schedulingRulesService.getCoachRules('coach-rules-1');

    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(result.data.coachId, 'coach-rules-1');
    assert.equal(result.data.minimumAdvanceBookingHours, 24);
    assert.equal(result.data.maxAdvanceBookingDays, 30);
    assert.equal(result.data.allowRescheduling, true);
  });

  it('updates rules and validates booking window', async () => {
    const updateResult = await schedulingRulesService.updateCoachRules('coach-rules-2', {
      minimumAdvanceBookingHours: 48,
      allowSameDayBookings: false,
    });

    assert.equal(updateResult.success, true);

    const nearFuture = new Date();
    nearFuture.setHours(nearFuture.getHours() + 2);

    const validationResult = await schedulingRulesService.validateBookingTime('coach-rules-2', nearFuture);
    assert.equal(validationResult.success, true);
    if (!validationResult.success) return;

    assert.equal(validationResult.data.isValid, false);
    assert.ok(validationResult.data.errorMessage?.includes('advance'));
  });

  it('returns null cancellation policy when none configured (empty path)', async () => {
    const result = await schedulingRulesService.getCancellationPolicy('coach-rules-3');

    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(result.data, null);
  });

  it('sets cancellation policy and calculates refund', async () => {
    const policyResult = await schedulingRulesService.setCancellationPolicy('coach-rules-4', 'flexible');
    assert.equal(policyResult.success, true);
    if (!policyResult.success) return;

    const sessionStart = new Date();
    sessionStart.setHours(sessionStart.getHours() + 10);

    const refund = schedulingRulesService.calculateRefund(100, sessionStart, policyResult.data);

    assert.equal(refund.originalAmount, 100);
    assert.equal(refund.refundPercentage, 100);
    assert.equal(refund.isEligible, true);
    assert.ok(refund.refundAmount > 0);
    assert.ok(refund.netRefundAmount <= refund.refundAmount);
  });

  it('returns validation error for unknown preset', async () => {
    const result = await schedulingRulesService.applyPreset(
      'coach-rules-5',
      'unknown_preset' as keyof typeof import('@/services/scheduling-rules-service').SCHEDULING_PRESETS,
    );

    assert.equal(result.success, false);
    if (result.success) return;

    assert.equal(result.error.code, 'VALIDATION');
  });

  it('returns err when saving rules fails (error path)', async () => {
    const apiClientInternals = apiClient as unknown as {
      set: typeof apiClient.set;
    };
    const originalSet = apiClientInternals.set;
    apiClientInternals.set = async () => {
      throw new Error('forced scheduling save failure');
    };

    try {
      const result = await schedulingRulesService.updateCoachRules('coach-rules-6', {
        minimumAdvanceBookingHours: 12,
      });

      assert.equal(result.success, false);
      if (result.success) return;

      assert.equal(result.error.code, 'STORAGE');
    } finally {
      apiClientInternals.set = originalSet;
    }
  });
});
