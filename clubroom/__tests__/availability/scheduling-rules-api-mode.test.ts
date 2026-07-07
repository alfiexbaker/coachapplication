import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('schedulingRulesService API mode', () => {
  it('fails closed for non-self scheduling writes', async () => {
    const { schedulingRulesService } = await import('@/services/scheduling-rules-service');

    const rulesResult = await schedulingRulesService.updateCoachRules('other-coach', {
      minimumAdvanceBookingHours: 12,
    });
    assert.equal(rulesResult.success, false);
    if (rulesResult.success) return;
    assert.equal(rulesResult.error.code, 'UNSUPPORTED');

    const policyResult = await schedulingRulesService.setCancellationPolicy(
      'other-coach',
      'strict',
    );
    assert.equal(policyResult.success, false);
    if (policyResult.success) return;
    assert.equal(policyResult.error.code, 'UNSUPPORTED');
  });

  it('does not trust local scheduling policy mirrors for non-self reads', async () => {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const { STORAGE_KEYS } = await import('@/constants/storage-keys');
    const { schedulingRulesService } = await import('@/services/scheduling-rules-service');
    const calls: string[] = [];

    globalThis.fetch = (async (input) => {
      const url = new URL(String(input));
      calls.push(`${url.pathname}${url.search}`);
      if (url.pathname === '/v1/coaches/other-coach/scheduling-rules') {
        return jsonResponse({
          rules: {
            id: 'api-rules-other-coach',
            coachId: 'other-coach',
            minimumAdvanceBookingHours: 12,
            maxAdvanceBookingDays: 45,
            bufferMinutesDefault: 10,
            maxConcurrentDefault: 2,
            allowSameDayBookings: true,
            createdAt: '2026-01-02T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
          },
          cancellationPolicy: {
            id: 'api-policy-other-coach',
            coachId: 'other-coach',
            name: 'API policy',
            description: 'Read from backend',
            tiers: [
              {
                hoursBeforeSession: 24,
                refundPercentage: 100,
                description: 'Full refund',
              },
            ],
            minimumNoticeHours: 0,
            allowCancellations: true,
            isDefault: false,
            createdAt: '2026-01-02T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
          },
          requestId: 'req_rules',
        });
      }
      return jsonResponse({ message: `Unhandled ${url.pathname}` }, 500);
    }) as typeof fetch;

    schedulingRulesService.clearCache();
    await AsyncStorage.setItem(
      STORAGE_KEYS.SCHEDULING_RULES,
      JSON.stringify([
        {
          id: 'local-rules-other-coach',
          coachId: 'other-coach',
          minimumAdvanceBookingHours: 2,
          maxAdvanceBookingDays: 60,
          bufferMinutesDefault: 0,
          maxConcurrentDefault: 1,
          allowSameDayBookings: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
    );
    await AsyncStorage.setItem(
      STORAGE_KEYS.CANCELLATION_POLICIES,
      JSON.stringify([
        {
          id: 'local-policy-other-coach',
          coachId: 'other-coach',
          name: 'Local strict policy',
          description: 'Should not be read in API mode',
          tiers: [],
          minimumNoticeHours: 99,
          allowCancellations: false,
          isDefault: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
    );

    const rulesResult = await schedulingRulesService.getCoachRules('other-coach');
    assert.equal(rulesResult.success, true);
    if (!rulesResult.success) return;
    assert.equal(rulesResult.data.minimumAdvanceBookingHours, 12);
    assert.equal(rulesResult.data.allowSameDayBookings, true);

    const policyResult = await schedulingRulesService.getCancellationPolicy('other-coach');
    assert.equal(policyResult.success, true);
    if (!policyResult.success) return;
    assert.equal(policyResult.data?.name, 'API policy');

    const allPoliciesResult = await schedulingRulesService.loadPolicies();
    assert.equal(allPoliciesResult.success, true);
    if (!allPoliciesResult.success) return;
    assert.deepEqual(allPoliciesResult.data, []);
    assert.deepEqual(calls, [
      '/v1/coaches/other-coach/scheduling-rules',
      '/v1/coaches/other-coach/scheduling-rules',
    ]);
  });
});
