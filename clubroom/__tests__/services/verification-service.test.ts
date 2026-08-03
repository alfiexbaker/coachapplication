import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import {
  VERIFICATION_DOCUMENT_MAX_BYTES,
  VERIFICATION_DOCUMENT_PICKER_TYPES,
  validateVerificationDocumentSelection,
  verificationService,
} from '@/services/verification-service';

describe('verificationService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.VERIFICATION);
  });

  it('returns default status and updates identity verification (happy path)', async () => {
    const statusResult = await verificationService.getStatus('coach_verify_1');
    assert.equal(statusResult.success, true);
    if (!statusResult.success) return;

    assert.equal(statusResult.data.overallLevel, 'BASIC');

    const updateResult = await verificationService.submitIdVerification('coach_verify_1', {
      uri: 'mock://id-document.jpg',
      fileName: 'id-document.jpg',
      contentType: 'image/jpeg',
      label: 'Passport',
    });
    assert.equal(updateResult.success, true);
    if (!updateResult.success) return;

    assert.equal(updateResult.data.identity.status, 'PENDING');
  });

  it('calculates helper labels and tones', () => {
    assert.equal(verificationService.getStatusLabel({ status: 'VERIFIED' }), 'Verified');
    assert.equal(verificationService.getStatusTone('PENDING'), 'warning');
  });

  it('allows only bounded verification evidence types', () => {
    assert.deepEqual(VERIFICATION_DOCUMENT_PICKER_TYPES, [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ]);

    const heif = validateVerificationDocumentSelection({
      uri: 'mock://passport.heif',
      fileName: 'passport.heif',
      contentType: 'image/heif',
      sizeBytes: VERIFICATION_DOCUMENT_MAX_BYTES,
    });
    assert.equal(heif.success, true);
    if (heif.success) {
      assert.equal(heif.data.contentType, 'image/heic');
    }

    for (const input of [
      {
        uri: 'mock://evidence.svg',
        fileName: 'evidence.svg',
        contentType: 'image/svg+xml',
        sizeBytes: 4096,
      },
      {
        uri: 'mock://evidence.txt',
        fileName: 'evidence.txt',
        contentType: 'text/plain',
        sizeBytes: 4096,
      },
    ]) {
      const result = validateVerificationDocumentSelection(input);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, 'VALIDATION');
        assert.match(result.error.message, /PDF, JPG, PNG, WebP or HEIC/);
      }
    }

    const oversized = validateVerificationDocumentSelection({
      uri: 'mock://dbs.pdf',
      fileName: 'dbs.pdf',
      contentType: 'application/pdf',
      sizeBytes: VERIFICATION_DOCUMENT_MAX_BYTES + 1,
    });
    assert.equal(oversized.success, false);
    if (!oversized.success) {
      assert.equal(oversized.error.code, 'VALIDATION');
      assert.match(oversized.error.message, /20 MB/);
    }

    const empty = validateVerificationDocumentSelection({
      uri: 'mock://empty.pdf',
      fileName: 'empty.pdf',
      contentType: 'application/pdf',
      sizeBytes: 0,
    });
    assert.equal(empty.success, false);
    if (!empty.success) {
      assert.match(empty.error.message, /non-empty/);
    }
  });

  it('submits DBS evidence for background-check review', async () => {
    const result = await verificationService.submitBackgroundCheckVerification('coach_verify_dbs', {
      uri: 'mock://dbs-certificate.pdf',
      fileName: 'dbs-certificate.pdf',
      contentType: 'application/pdf',
      label: 'Enhanced DBS certificate',
    });

    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.backgroundCheck.status, 'PENDING');
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

  it('reviews verification status through /v1 in API mode', async () => {
    const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
    const originalFetch = globalThis.fetch;
    const fetchCalls: { url: string; body?: string }[] = [];
    Object.defineProperty(apiClient, 'isMockMode', {
      configurable: true,
      get: () => false,
    });
    globalThis.fetch = (async (input, init) => {
      fetchCalls.push({
        url: String(input),
        body: typeof init?.body === 'string' ? init.body : undefined,
      });
      return new Response(
        JSON.stringify({
          type: 'dbs',
          verification: {
            id: 'cvf_api_review',
            status: 'APPROVED',
          },
          status: {
            coachId: 'coach_api_1',
            email: { status: 'NOT_STARTED' },
            phone: { status: 'NOT_STARTED' },
            identity: { status: 'NOT_STARTED' },
            backgroundCheck: {
              status: 'VERIFIED',
              verifiedAt: '2026-01-22T09:00:00.000Z',
              expiresAt: '2029-01-22T09:00:00.000Z',
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
      const result = await verificationService.updateVerificationItem(
        'coach_api_1',
        'backgroundCheck',
        {
          status: 'VERIFIED',
          expiresAt: '2029-01-22T09:00:00.000Z',
          notes: 'DBS evidence checked',
        },
      );
      assert.equal(result.success, true);
      if (!result.success) return;

      assert.equal(result.data.backgroundCheck.status, 'VERIFIED');
      assert.match(
        fetchCalls[0]?.url ?? '',
        /\/v1\/coaches\/coach_api_1\/verifications\/dbs\/review$/,
      );
      assert.deepEqual(JSON.parse(fetchCalls[0]?.body ?? '{}'), {
        status: 'APPROVED',
        expiresAt: '2029-01-22T09:00:00.000Z',
        notes: 'DBS evidence checked',
      });
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
