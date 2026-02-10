import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { trialService } from '@/services/trial-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('TrialService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.TRIAL_OFFERINGS);
    await apiClient.remove(STORAGE_KEYS.TRIAL_USAGE);
    await apiClient.remove(STORAGE_KEYS.TRIAL_CONVERSIONS);
  });

  describe('getTrialOffering', () => {
    it('should return null when coach has no trial offering', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      const offering = await trialService.getTrialOffering(coachId);

      assert.equal(offering, null);
    });

    it('should return trial offering for coach', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      await trialService.upsertTrialOffering(coachId, {
        enabled: true,
        trialPrice: 15.0,
        normalPrice: 40.0,
        durationMinutes: 60,
        limitPerFamily: 1,
        description: 'First session trial',
      });

      const offering = await trialService.getTrialOffering(coachId);

      assert.ok(offering);
      assert.equal(offering.coachId, coachId);
      assert.equal(offering.enabled, true);
      assert.equal(offering.trialPrice, 15.0);
    });
  });

  describe('upsertTrialOffering', () => {
    it('should create new trial offering', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      const offering = await trialService.upsertTrialOffering(coachId, {
        enabled: true,
        trialPrice: 15.0,
        normalPrice: 40.0,
        durationMinutes: 60,
        limitPerFamily: 1,
        description: 'First session trial',
      });

      assert.ok(offering.id);
      assert.equal(offering.coachId, coachId);
      assert.equal(offering.enabled, true);
      assert.equal(offering.trialPrice, 15.0);
      assert.equal(offering.normalPrice, 40.0);
      assert.equal(offering.durationMinutes, 60);
      assert.equal(offering.limitPerFamily, 1);
      assert.ok(offering.createdAt);
      assert.ok(offering.updatedAt);
    });

    it('should update existing trial offering', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      await trialService.upsertTrialOffering(coachId, {
        enabled: true,
        trialPrice: 15.0,
        normalPrice: 40.0,
        durationMinutes: 60,
        limitPerFamily: 1,
        description: 'First version',
      });

      const updated = await trialService.upsertTrialOffering(coachId, {
        enabled: true,
        trialPrice: 10.0,
        normalPrice: 40.0,
        durationMinutes: 60,
        limitPerFamily: 2,
        description: 'Second version',
      });

      assert.equal(updated.trialPrice, 10.0);
      assert.equal(updated.limitPerFamily, 2);
      assert.equal(updated.description, 'Second version');

      // Should only have one offering for this coach
      const offerings = await apiClient.get<any[]>(STORAGE_KEYS.TRIAL_OFFERINGS, []);
      const coachOfferings = offerings.filter((o) => o.coachId === coachId);
      assert.equal(coachOfferings.length, 1);
    });

    it('should allow disabling trial offering', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      await trialService.upsertTrialOffering(coachId, {
        enabled: true,
        trialPrice: 15.0,
        normalPrice: 40.0,
        durationMinutes: 60,
        limitPerFamily: 1,
        description: 'Trial',
      });

      const disabled = await trialService.upsertTrialOffering(coachId, {
        enabled: false,
        trialPrice: 15.0,
        normalPrice: 40.0,
        durationMinutes: 60,
        limitPerFamily: 1,
        description: 'Trial',
      });

      assert.equal(disabled.enabled, false);
    });
  });

  describe('recordTrialUsage', () => {
    it('should record trial usage', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);
      const bookingId = 'test-booking-' + Math.random().toString(36).slice(2);

      const usage = await trialService.recordTrialUsage(
        coachId,
        parentId,
        bookingId
      );

      assert.ok(usage.id);
      assert.equal(usage.coachId, coachId);
      assert.equal(usage.parentId, parentId);
      assert.equal(usage.bookingId, bookingId);
      assert.ok(usage.usedAt);
    });

    it('should handle optional familyId', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);
      const bookingId = 'test-booking-' + Math.random().toString(36).slice(2);
      const familyId = 'test-family-' + Math.random().toString(36).slice(2);

      const usage = await trialService.recordTrialUsage(
        coachId,
        parentId,
        bookingId,
        familyId
      );

      assert.equal(usage.familyId, familyId);
    });
  });

  describe('hasUsedTrial', () => {
    it('should return false when parent has not used trial', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);

      const hasUsed = await trialService.hasUsedTrial(coachId, parentId);

      assert.equal(hasUsed, false);
    });

    it('should return true when parent has used trial', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);
      const bookingId = 'test-booking-' + Math.random().toString(36).slice(2);

      await trialService.recordTrialUsage(coachId, parentId, bookingId);

      const hasUsed = await trialService.hasUsedTrial(coachId, parentId);

      assert.equal(hasUsed, true);
    });

    it('should not count trial usage from different coach', async () => {
      const coach1 = 'test-coach-1-' + Math.random().toString(36).slice(2);
      const coach2 = 'test-coach-2-' + Math.random().toString(36).slice(2);
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);

      await trialService.recordTrialUsage(coach1, parentId, 'booking1');

      const hasUsed = await trialService.hasUsedTrial(coach2, parentId);

      assert.equal(hasUsed, false);
    });
  });

  describe('recordConversion', () => {
    it('should record trial conversion', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);
      const trialBookingId = 'test-trial-booking-' + Math.random().toString(36).slice(2);
      const regularBookingId = 'test-regular-booking-' + Math.random().toString(36).slice(2);

      const conversion = await trialService.recordConversion(
        coachId,
        parentId,
        trialBookingId,
        regularBookingId
      );

      assert.ok(conversion.id);
      assert.equal(conversion.coachId, coachId);
      assert.equal(conversion.parentId, parentId);
      assert.equal(conversion.trialBookingId, trialBookingId);
      assert.equal(conversion.regularBookingId, regularBookingId);
      assert.ok(conversion.convertedAt);
    });
  });

  describe('getConversionRate', () => {
    it('should return 0 when no trials used', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      const rate = await trialService.getConversionRate(coachId);

      assert.equal(rate, 0);
    });

    it('should calculate conversion rate correctly', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      // Record 4 trial usages
      await trialService.recordTrialUsage(coachId, 'parent1', 'trial1');
      await trialService.recordTrialUsage(coachId, 'parent2', 'trial2');
      await trialService.recordTrialUsage(coachId, 'parent3', 'trial3');
      await trialService.recordTrialUsage(coachId, 'parent4', 'trial4');

      // Record 2 conversions
      await trialService.recordConversion(coachId, 'parent1', 'trial1', 'regular1');
      await trialService.recordConversion(coachId, 'parent2', 'trial2', 'regular2');

      const rate = await trialService.getConversionRate(coachId);

      assert.equal(rate, 50); // 2 conversions out of 4 trials = 50%
    });

    it('should return 100 when all trials converted', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      await trialService.recordTrialUsage(coachId, 'parent1', 'trial1');
      await trialService.recordConversion(coachId, 'parent1', 'trial1', 'regular1');

      const rate = await trialService.getConversionRate(coachId);

      assert.equal(rate, 100);
    });
  });

  describe('isEligibleForTrial', () => {
    it('should return true when parent has not used trial', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);

      await trialService.upsertTrialOffering(coachId, {
        enabled: true,
        trialPrice: 15.0,
        normalPrice: 40.0,
        durationMinutes: 60,
        limitPerFamily: 1,
        description: 'Trial',
      });

      const eligible = await trialService.isEligibleForTrial(coachId, parentId);

      assert.equal(eligible, true);
    });

    it('should return false when trial offering disabled', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);

      await trialService.upsertTrialOffering(coachId, {
        enabled: false,
        trialPrice: 15.0,
        normalPrice: 40.0,
        durationMinutes: 60,
        limitPerFamily: 1,
        description: 'Trial',
      });

      const eligible = await trialService.isEligibleForTrial(coachId, parentId);

      assert.equal(eligible, false);
    });

    it('should return false when parent has used trial', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
      const parentId = 'test-parent-' + Math.random().toString(36).slice(2);

      await trialService.upsertTrialOffering(coachId, {
        enabled: true,
        trialPrice: 15.0,
        normalPrice: 40.0,
        durationMinutes: 60,
        limitPerFamily: 1,
        description: 'Trial',
      });

      await trialService.recordTrialUsage(coachId, parentId, 'booking1');

      const eligible = await trialService.isEligibleForTrial(coachId, parentId);

      assert.equal(eligible, false);
    });
  });
});
