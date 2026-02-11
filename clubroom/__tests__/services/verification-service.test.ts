import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { verificationService } from '@/services/verification-service';

describe('verificationService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.VERIFICATION);
  });

  it('returns default status and updates identity verification (happy path)', async () => {
    const statusResult = await verificationService.getStatus('coach_verify_1');
    assert.equal(statusResult.success, true);
    if (!statusResult.success) return;

    assert.equal(statusResult.data.overallLevel, 'BASIC');

    const updateResult = await verificationService.submitIdVerification(
      'coach_verify_1',
      'mock://id-document.jpg'
    );
    assert.equal(updateResult.success, true);
    if (!updateResult.success) return;

    assert.equal(updateResult.data.identity.status, 'PENDING');
  });

  it('calculates helper labels and tones', () => {
    assert.equal(verificationService.getStatusLabel({ status: 'VERIFIED' }), 'Verified');
    assert.equal(verificationService.getStatusTone('PENDING'), 'warning');
  });

  it('returns err when verification storage fails (error path)', async () => {
    const apiClientInternals = apiClient as unknown as { get: typeof apiClient.get };
    const originalGet = apiClientInternals.get;
    apiClientInternals.get = async () => {
      throw new Error('forced verification read failure');
    };

    try {
      const result = await verificationService.getStatus('coach_verify_err');
      assert.equal(result.success, false);
      if (result.success) return;

      assert.equal(result.error.code, 'STORAGE');
    } finally {
      apiClientInternals.get = originalGet;
    }
  });
});
