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
      {
        uri: 'mock://id-document.jpg',
        fileName: 'id-document.jpg',
        contentType: 'image/jpeg',
        label: 'Passport',
      }
    );
    assert.equal(updateResult.success, true);
    if (!updateResult.success) return;

    assert.equal(updateResult.data.identity.status, 'PENDING');
  });

  it('calculates helper labels and tones', () => {
    assert.equal(verificationService.getStatusLabel({ status: 'VERIFIED' }), 'Verified');
    assert.equal(verificationService.getStatusTone('PENDING'), 'warning');
  });

  it('reads verification status from /v1 in API mode', async () => {
    const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
    const originalFetch = globalThis.fetch;
    const fetchUrls: string[] = [];
    Object.defineProperty(apiClient, 'isMockMode', {
      configurable: true,
      get: () => false,
    });
    globalThis.fetch = (async (input) => {
      fetchUrls.push(String(input));
      return new Response(
        JSON.stringify({
          status: {
            coachId: 'coach_api_1',
            email: { status: 'NOT_STARTED' },
            phone: { status: 'NOT_STARTED' },
            identity: { status: 'NOT_STARTED' },
            backgroundCheck: {
              status: 'VERIFIED',
              verifiedAt: '2026-01-22T09:00:00.000Z',
              expiresAt: '2026-12-28T09:00:00.000Z',
            },
            credentials: [],
            insurance: { status: 'NOT_STARTED' },
            overallLevel: 'NONE',
            lastUpdated: '2026-03-02T12:00:00.000Z',
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }) as typeof fetch;

    try {
      const result = await verificationService.getStatus('coach_api_1');
      assert.equal(result.success, true);
      if (!result.success) return;

      assert.equal(result.data.backgroundCheck.status, 'VERIFIED');
      assert.match(fetchUrls[0], /\/v1\/coaches\/coach_api_1\/verification-status$/);
    } finally {
      if (originalIsMockMode) {
        Object.defineProperty(apiClient, 'isMockMode', originalIsMockMode);
      }
      globalThis.fetch = originalFetch;
    }
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
