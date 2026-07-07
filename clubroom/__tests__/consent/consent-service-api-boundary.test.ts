import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { apiClient } from '@/services/api-client';
import { consentService } from '@/services/consent-service';

describe('consentService API boundary', () => {
  test('roster consent dashboard reads v1 in API mode without local storage', async () => {
    const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
    const originalGet = apiClient.get;
    const originalFetch = global.fetch;
    let localReadCount = 0;
    const fetchCalls: string[] = [];

    Object.defineProperty(apiClient, 'isMockMode', {
      configurable: true,
      get: () => false,
    });
    apiClient.get = (async () => {
      localReadCount += 1;
      throw new Error('local consent reads should not run in API mode');
    }) as typeof apiClient.get;
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      fetchCalls.push(`${init?.method ?? 'GET'} ${url.pathname}${url.search}`);
      if (url.pathname === '/v1/coaches/coach_api_consents/roster/consents') {
        return new Response(
          JSON.stringify({
            consents: [
              {
                athleteId: 'ath_api_consents',
                consents: [
                  {
                    type: 'PHOTO',
                    granted: true,
                    grantedBy: 'guardian_api',
                    grantedAt: '2026-07-01T10:00:00.000Z',
                  },
                  {
                    type: 'VIDEO',
                    granted: false,
                    grantedBy: 'guardian_api',
                  },
                ],
                lastUpdated: '2026-07-01T10:00:00.000Z',
              },
            ],
            summary: {
              totalAthletes: 1,
              byType: {
                PHOTO: { granted: 1, denied: 0 },
                VIDEO: { granted: 0, denied: 1 },
                SOCIAL_MEDIA: { granted: 0, denied: 0 },
                EMERGENCY_TREATMENT: { granted: 0, denied: 0 },
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({ message: 'unexpected route' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      const list = await consentService.getRosterConsents('coach_api_consents');
      const summary = await consentService.getConsentSummary('coach_api_consents');

      assert.equal(list.success, true);
      assert.equal(summary.success, true);
      if (!list.success || !summary.success) {
        return;
      }
      assert.equal(list.data[0]?.athleteId, 'ath_api_consents');
      assert.equal(list.data[0]?.consents[0]?.type, 'PHOTO');
      assert.equal(summary.data.totalAthletes, 1);
      assert.equal(summary.data.byType.PHOTO.granted, 1);
      assert.deepEqual(fetchCalls, [
        'GET /v1/coaches/coach_api_consents/roster/consents',
        'GET /v1/coaches/coach_api_consents/roster/consents',
      ]);
      assert.equal(localReadCount, 0);
    } finally {
      if (originalIsMockMode) {
        Object.defineProperty(apiClient, 'isMockMode', originalIsMockMode);
      }
      apiClient.get = originalGet;
      global.fetch = originalFetch;
    }
  });
});
