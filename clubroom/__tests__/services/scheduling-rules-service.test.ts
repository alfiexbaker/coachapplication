/**
 * Scheduling Rules Service Tests
 *
 * Tests for coach scheduling rules, cancellation policies,
 * booking validation, and refund calculations.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { schedulingRulesService, POLICY_TEMPLATES, SCHEDULING_PRESETS } from '@/services/scheduling-rules-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { Result, ServiceError } from '@/types/result';

const rid = () => Math.random().toString(36).slice(2, 10);

function expectOk<T>(result: Result<T, ServiceError>): T {
  assert.equal(result.success, true);
  return result.data;
}

describe('schedulingRulesService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SCHEDULING_RULES);
    await apiClient.remove(STORAGE_KEYS.CANCELLATION_POLICIES);
    schedulingRulesService.clearCache();
  });

  // ---------------------------------------------------------------------------
  // getCoachRules
  // ---------------------------------------------------------------------------
  describe('getCoachRules', () => {
    test('returns default rules for new coach', async () => {
      const coachId = `coach_${rid()}`;
      const rules = expectOk(await schedulingRulesService.getCoachRules(coachId));

      assert.equal(rules.coachId, coachId);
      assert.equal(rules.minimumAdvanceBookingHours, 24);
      assert.equal(rules.maxAdvanceBookingDays, 30);
      assert.equal(rules.allowSameDayBookings, false);
      assert.equal(rules.bufferMinutesDefault, 15);
      assert.equal(rules.maxConcurrentDefault, 1);
      assert.equal(rules.allowRescheduling, true);
      assert.equal(rules.rescheduleDeadlineHours, 24);
    });

    test('returns saved rules after update', async () => {
      const coachId = `coach_${rid()}`;
      expectOk(await schedulingRulesService.updateCoachRules(coachId, {
        minimumAdvanceBookingHours: 48,
        allowSameDayBookings: true,
      }));

      const rules = expectOk(await schedulingRulesService.getCoachRules(coachId));
      assert.equal(rules.minimumAdvanceBookingHours, 48);
      assert.equal(rules.allowSameDayBookings, true);
    });
  });

  // ---------------------------------------------------------------------------
  // updateCoachRules
  // ---------------------------------------------------------------------------
  describe('updateCoachRules', () => {
    test('creates rules for coach who has none', async () => {
      const coachId = `coach_${rid()}`;
      const rules = expectOk(await schedulingRulesService.updateCoachRules(coachId, {
        minimumAdvanceBookingHours: 12,
        maxAdvanceBookingDays: 60,
      }));

      assert.equal(rules.coachId, coachId);
      assert.equal(rules.minimumAdvanceBookingHours, 12);
      assert.equal(rules.maxAdvanceBookingDays, 60);
      assert.ok(rules.updatedAt);
    });

    test('updates existing rules without overwriting other fields', async () => {
      const coachId = `coach_${rid()}`;
      expectOk(await schedulingRulesService.updateCoachRules(coachId, {
        minimumAdvanceBookingHours: 8,
        allowSameDayBookings: true,
      }));

      const updated = expectOk(await schedulingRulesService.updateCoachRules(coachId, {
        maxAdvanceBookingDays: 90,
      }));

      assert.equal(updated.minimumAdvanceBookingHours, 8);
      assert.equal(updated.allowSameDayBookings, true);
      assert.equal(updated.maxAdvanceBookingDays, 90);
    });
  });

  // ---------------------------------------------------------------------------
  // applyPreset
  // ---------------------------------------------------------------------------
  describe('applyPreset', () => {
    test('applies flexible preset', async () => {
      const coachId = `coach_${rid()}`;
      const rules = expectOk(await schedulingRulesService.applyPreset(coachId, 'flexible'));

      assert.equal(rules.minimumAdvanceBookingHours, 2);
      assert.equal(rules.maxAdvanceBookingDays, 60);
      assert.equal(rules.allowSameDayBookings, true);
    });

    test('applies strict preset', async () => {
      const coachId = `coach_${rid()}`;
      const rules = expectOk(await schedulingRulesService.applyPreset(coachId, 'strict'));

      assert.equal(rules.minimumAdvanceBookingHours, 48);
      assert.equal(rules.maxAdvanceBookingDays, 14);
      assert.equal(rules.allowSameDayBookings, false);
    });

    test('applies professional preset', async () => {
      const coachId = `coach_${rid()}`;
      const rules = expectOk(await schedulingRulesService.applyPreset(coachId, 'professional'));

      assert.equal(rules.minimumAdvanceBookingHours, 72);
      assert.equal(rules.maxAdvanceBookingDays, 60);
    });
  });

  // ---------------------------------------------------------------------------
  // validateBookingTime
  // ---------------------------------------------------------------------------
  describe('validateBookingTime', () => {
    test('rejects booking with insufficient notice', async () => {
      const coachId = `coach_${rid()}`;
      expectOk(await schedulingRulesService.updateCoachRules(coachId, {
        minimumAdvanceBookingHours: 24,
      }));

      const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const validation = expectOk(
        await schedulingRulesService.validateBookingTime(coachId, twoHoursFromNow),
      );

      assert.equal(validation.isValid, false);
      assert.ok(validation.errorMessage);
    });

    test('accepts booking with sufficient notice', async () => {
      const coachId = `coach_${rid()}`;
      expectOk(await schedulingRulesService.updateCoachRules(coachId, {
        minimumAdvanceBookingHours: 2,
        maxAdvanceBookingDays: 60,
      }));

      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const validation = expectOk(
        await schedulingRulesService.validateBookingTime(coachId, threeDaysFromNow),
      );

      assert.equal(validation.isValid, true);
    });

    test('rejects booking too far in advance', async () => {
      const coachId = `coach_${rid()}`;
      expectOk(await schedulingRulesService.updateCoachRules(coachId, {
        minimumAdvanceBookingHours: 2,
        maxAdvanceBookingDays: 14,
      }));

      const sixtyDaysFromNow = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      const validation = expectOk(
        await schedulingRulesService.validateBookingTime(coachId, sixtyDaysFromNow),
      );

      assert.equal(validation.isValid, false);
      assert.ok(validation.errorMessage);
    });
  });

  // ---------------------------------------------------------------------------
  // getCancellationPolicy / setCancellationPolicy
  // ---------------------------------------------------------------------------
  describe('getCancellationPolicy', () => {
    test('returns null for coach with no policy', async () => {
      const coachId = `coach_${rid()}`;
      const policy = expectOk(await schedulingRulesService.getCancellationPolicy(coachId));
      assert.equal(policy, null);
    });
  });

  describe('setCancellationPolicy', () => {
    test('creates standard policy from template', async () => {
      const coachId = `coach_${rid()}`;
      const policy = expectOk(
        await schedulingRulesService.setCancellationPolicy(coachId, 'standard'),
      );

      assert.equal(policy.coachId, coachId);
      assert.equal(policy.name, 'Standard');
      assert.ok(policy.tiers.length > 0);
      assert.equal(policy.allowCancellations, true);
    });

    test('creates flexible policy', async () => {
      const coachId = `coach_${rid()}`;
      const policy = expectOk(
        await schedulingRulesService.setCancellationPolicy(coachId, 'flexible'),
      );

      assert.equal(policy.name, 'Flexible');
      // Flexible should have higher refund percentages
      const fullRefundTiers = policy.tiers.filter((t) => t.refundPercentage === 100);
      assert.ok(fullRefundTiers.length >= 1);
    });

    test('creates strict policy', async () => {
      const coachId = `coach_${rid()}`;
      const policy = expectOk(
        await schedulingRulesService.setCancellationPolicy(coachId, 'strict'),
      );

      assert.equal(policy.name, 'Strict');
      assert.equal(policy.minimumNoticeHours, 2);
    });

    test('creates custom policy with custom tiers', async () => {
      const coachId = `coach_${rid()}`;
      const customTiers = [
        { hoursBeforeSession: 48, refundPercentage: 100, description: 'Full refund 48h+' },
        { hoursBeforeSession: 0, refundPercentage: 0, description: 'No refund' },
      ];

      const policy = expectOk(
        await schedulingRulesService.setCancellationPolicy(coachId, 'custom', customTiers),
      );

      assert.equal(policy.name, 'Custom');
      assert.ok(policy.tiers.length >= 2);
    });

    test('persists policy across reads', async () => {
      const coachId = `coach_${rid()}`;
      expectOk(await schedulingRulesService.setCancellationPolicy(coachId, 'standard'));
      schedulingRulesService.clearCache();

      const policy = expectOk(await schedulingRulesService.getCancellationPolicy(coachId));
      assert.ok(policy);
      assert.equal(policy!.name, 'Standard');
    });

    test('updates existing policy', async () => {
      const coachId = `coach_${rid()}`;
      const first = expectOk(
        await schedulingRulesService.setCancellationPolicy(coachId, 'standard'),
      );
      const second = expectOk(
        await schedulingRulesService.setCancellationPolicy(coachId, 'flexible'),
      );

      assert.equal(second.id, first.id); // Same ID = update
      assert.equal(second.name, 'Flexible');
    });
  });

  // ---------------------------------------------------------------------------
  // calculateRefund
  // ---------------------------------------------------------------------------
  describe('calculateRefund', () => {
    test('returns full refund for far-future cancellation', () => {
      const farFuture = new Date(Date.now() + 72 * 60 * 60 * 1000);
      const result = schedulingRulesService.calculateRefund(25, farFuture);

      assert.equal(result.originalAmount, 25);
      assert.equal(result.refundPercentage, 100);
      assert.equal(result.refundAmount, 25);
      assert.equal(result.isEligible, true);
    });

    test('returns zero refund for no-show (past session)', () => {
      const pastSession = new Date(Date.now() - 60 * 60 * 1000);
      const result = schedulingRulesService.calculateRefund(25, pastSession);

      assert.equal(result.originalAmount, 25);
      assert.equal(result.refundPercentage, 0);
      assert.equal(result.refundAmount, 0);
    });

    test('respects custom policy tiers', () => {
      const policy = {
        id: 'test_policy',
        coachId: 'test',
        name: 'Test',
        description: 'Test policy',
        tiers: [
          { hoursBeforeSession: 24, refundPercentage: 100, description: 'Full' },
          { hoursBeforeSession: 0, refundPercentage: 0, description: 'None' },
        ],
        minimumNoticeHours: 0,
        allowCancellations: true,
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 30 hours ahead = full refund
      const futureSession = new Date(Date.now() + 30 * 60 * 60 * 1000);
      const result = schedulingRulesService.calculateRefund(20, futureSession, policy);
      assert.equal(result.refundPercentage, 100);

      // 5 hours ahead = 0% refund (between 0 and 24)
      const nearSession = new Date(Date.now() + 5 * 60 * 60 * 1000);
      const result2 = schedulingRulesService.calculateRefund(20, nearSession, policy);
      assert.equal(result2.refundPercentage, 0);
    });

    test('returns not eligible when cancellations disabled', () => {
      const policy = {
        id: 'no_cancel',
        coachId: 'test',
        name: 'No Cancellations',
        description: 'No cancellations',
        tiers: [],
        minimumNoticeHours: 0,
        allowCancellations: false,
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = schedulingRulesService.calculateRefund(
        25,
        new Date(Date.now() + 72 * 60 * 60 * 1000),
        policy,
      );

      assert.equal(result.isEligible, false);
      assert.equal(result.refundAmount, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // canCancel
  // ---------------------------------------------------------------------------
  describe('canCancel', () => {
    test('returns true for session in the future with default policy', () => {
      const futureSession = new Date(Date.now() + 48 * 60 * 60 * 1000);
      assert.equal(schedulingRulesService.canCancel(futureSession), true);
    });

    test('returns false when cancellations are disabled', () => {
      const policy = {
        id: 'no_cancel',
        coachId: 'test',
        name: 'No Cancel',
        description: '',
        tiers: [],
        minimumNoticeHours: 0,
        allowCancellations: false,
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const futureSession = new Date(Date.now() + 48 * 60 * 60 * 1000);
      assert.equal(schedulingRulesService.canCancel(futureSession, policy), false);
    });
  });

  // ---------------------------------------------------------------------------
  // formatRulesForDisplay / getRulesSummary
  // ---------------------------------------------------------------------------
  describe('formatRulesForDisplay', () => {
    test('returns array of display strings', () => {
      const rules = schedulingRulesService.getDefaultRules(`coach_${rid()}`);
      const display = schedulingRulesService.formatRulesForDisplay(rules);

      assert.ok(Array.isArray(display));
      assert.ok(display.length > 0);
      assert.ok(display.some((d) => d.includes('advance')));
    });
  });

  describe('getRulesSummary', () => {
    test('returns summary string for 24h+ notice', () => {
      const rules = schedulingRulesService.getDefaultRules(`coach_${rid()}`);
      const summary = schedulingRulesService.getRulesSummary(rules);

      assert.ok(typeof summary === 'string');
      assert.ok(summary.includes('notice required'));
    });

    test('returns hours format for < 24h notice', () => {
      const rules = schedulingRulesService.getDefaultRules(`coach_${rid()}`);
      rules.minimumAdvanceBookingHours = 4;
      const summary = schedulingRulesService.getRulesSummary(rules);

      assert.ok(summary.includes('4+'));
      assert.ok(summary.includes('hours'));
    });
  });

  // ---------------------------------------------------------------------------
  // getDefaultCancellationPolicy
  // ---------------------------------------------------------------------------
  describe('getDefaultCancellationPolicy', () => {
    test('returns policy with standard tiers', () => {
      const policy = schedulingRulesService.getDefaultCancellationPolicy();

      assert.ok(policy.id);
      assert.equal(policy.name, 'Standard');
      assert.ok(policy.tiers.length > 0);
      assert.equal(policy.allowCancellations, true);
    });
  });
});
