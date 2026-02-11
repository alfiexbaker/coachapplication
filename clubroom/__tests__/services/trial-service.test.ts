import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { trialService } from '@/services/trial-service';

describe('trialService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.TRIAL_OFFERINGS);
    await apiClient.remove(STORAGE_KEYS.TRIAL_USAGES);
    await apiClient.remove(STORAGE_KEYS.TRIAL_CONVERSIONS);
  });

  it('upserts and retrieves trial offering (happy path)', async () => {
    const offering = await trialService.upsertTrialOffering('coach_trial_1', {
      enabled: true,
      trialPrice: 10,
      normalPrice: 50,
      durationMinutes: 60,
      limitPerFamily: 1,
      description: 'Intro offer',
    });

    assert.equal(offering.coachId, 'coach_trial_1');
    assert.equal(offering.enabled, true);

    const fetched = await trialService.getTrialOffering('coach_trial_1');
    assert.ok(fetched);
    assert.equal(fetched?.id, offering.id);
  });

  it('returns not eligible when no active trial offering exists (empty path)', async () => {
    const eligible = await trialService.isTrialEligible('coach_none', 'parent_none');
    assert.equal(eligible, false);
  });

  it('tracks usage count and enforces limit per family', async () => {
    await trialService.upsertTrialOffering('coach_trial_2', {
      enabled: true,
      trialPrice: 5,
      normalPrice: 45,
      durationMinutes: 60,
      limitPerFamily: 1,
      description: 'Single trial',
    });

    await trialService.recordTrialUsage('coach_trial_2', 'parent_trial_1', 'booking_trial_1');
    const usageCount = await trialService.getTrialUsageCount('coach_trial_2', 'parent_trial_1');
    assert.equal(usageCount, 1);

    const eligible = await trialService.isTrialEligible('coach_trial_2', 'parent_trial_1');
    assert.equal(eligible, false);
  });

  it('propagates storage failures (error path)', async () => {
    const apiClientInternals = apiClient as unknown as {
      get: typeof apiClient.get;
    };
    const originalGet = apiClientInternals.get;
    apiClientInternals.get = async () => {
      throw new Error('forced trial storage failure');
    };

    try {
      await assert.rejects(
        async () => {
          await trialService.getTrialOffering('coach_err');
        },
        /forced trial storage failure/
      );
    } finally {
      apiClientInternals.get = originalGet;
    }
  });
});
