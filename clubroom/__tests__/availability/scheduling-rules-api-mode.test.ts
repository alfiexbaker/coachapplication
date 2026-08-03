import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('schedulingRulesService API mode', () => {
  it('builds a minimal patch from backend-confirmed scheduling rules', async () => {
    const { diffCoachSchedulingRules } = await import('@/services/scheduling-rules-service');
    const current = {
      id: 'rules-self',
      coachId: 'coach-self',
      minimumAdvanceBookingHours: 24,
      maxAdvanceBookingDays: 30,
      bufferMinutesDefault: 15,
      maxConcurrentDefault: 1,
      allowSameDayBookings: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    assert.deepEqual(
      diffCoachSchedulingRules(current, {
        ...current,
        bufferMinutesDefault: 20,
        allowSameDayBookings: true,
      }),
      {
        bufferMinutesDefault: 20,
        allowSameDayBookings: true,
      },
    );
    assert.deepEqual(diffCoachSchedulingRules(current, current), {});
  });

  it('does not log raw scheduling-rule update payloads on failures', () => {
    const source = readProjectFile('services/scheduling-rules-service.ts');

    assert.doesNotMatch(
      source,
      /logger\.error\('Failed to update scheduling rules',\s*\{\s*coachId,\s*updates,/,
      'scheduling-rule update failure logs must not include the full updates payload',
    );
    assert.match(
      source,
      /changedFields,\s*\n\s*changedFieldCount: changedFields\.length/,
      'scheduling-rule diagnostics should log changed field names and counts instead of raw values',
    );
  });

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
      if (url.pathname === '/v1/coaches/me/scheduling-rules') {
        return jsonResponse({
          rules: {
            id: 'api-rules-self',
            coachId: 'coach-self',
            minimumAdvanceBookingHours: 24,
            maxAdvanceBookingDays: 30,
            bufferMinutesDefault: 15,
            maxConcurrentDefault: 1,
            allowSameDayBookings: false,
            createdAt: '2026-01-03T00:00:00.000Z',
            updatedAt: '2026-01-03T00:00:00.000Z',
          },
          cancellationPolicy: {
            id: 'api-policy-self',
            coachId: 'coach-self',
            name: 'Self API policy',
            description: 'Loaded from backend self route',
            tiers: [
              {
                hoursBeforeSession: 12,
                refundPercentage: 50,
                description: 'Half refund',
              },
            ],
            minimumNoticeHours: 0,
            allowCancellations: true,
            isDefault: true,
            createdAt: '2026-01-03T00:00:00.000Z',
            updatedAt: '2026-01-03T00:00:00.000Z',
          },
          requestId: 'req_self_rules',
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
    assert.equal(allPoliciesResult.data.length, 1);
    assert.equal(allPoliciesResult.data[0].name, 'Self API policy');
    assert.deepEqual(calls, [
      '/v1/coaches/other-coach/scheduling-rules',
      '/v1/coaches/other-coach/scheduling-rules',
      '/v1/coaches/me/scheduling-rules',
    ]);
  });

  it('fails closed when API-mode cancellation policy listing cannot reach authority', async () => {
    const { schedulingRulesService } = await import('@/services/scheduling-rules-service');

    globalThis.fetch = (async (input) => {
      const url = new URL(String(input));
      if (url.pathname === '/v1/coaches/me/scheduling-rules') {
        return jsonResponse({ message: 'rules api down' }, 503);
      }
      return jsonResponse({ message: `Unhandled ${url.pathname}` }, 500);
    }) as typeof fetch;

    schedulingRulesService.clearCache();

    const result = await schedulingRulesService.loadPolicies();
    assert.equal(result.success, false);
    if (result.success) return;
    assert.match(result.error.message, /rules api down|503/);
  });
});
