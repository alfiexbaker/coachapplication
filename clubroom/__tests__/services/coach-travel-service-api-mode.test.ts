import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('coachTravelService API mode', () => {
  it('returns unsaved defaults and blocks local persistence', async () => {
    const [{ coachTravelService }, { apiClient }] = await Promise.all([
      import('@/services/coach-travel-service'),
      import('@/services/api-client'),
    ]);

    const originalGet = apiClient.get;
    const originalSet = apiClient.set;
    apiClient.get = async () => {
      throw new Error('local get should not run in API mode');
    };
    apiClient.set = async () => {
      throw new Error('local set should not run in API mode');
    };

    try {
      const settings = await coachTravelService.getSettings('coach_api_travel');
      assert.equal(settings.success, true);
      assert.equal(settings.success && settings.data.coachId, 'coach_api_travel');
      assert.equal(settings.success && settings.data.radiusMiles, 10);
      assert.equal(coachTravelService.canSaveTravelSettings(), false);

      const updated = await coachTravelService.updateSettings('coach_api_travel', {
        radiusMiles: 20,
      });
      assert.equal(updated.success, false);
      assert.equal(!updated.success && updated.error.code, 'UNSUPPORTED');
      assert.equal(
        !updated.success && (updated.error.details as { route?: string } | undefined)?.route,
        '/v1/coaches/me/travel-settings',
      );
    } finally {
      apiClient.get = originalGet;
      apiClient.set = originalSet;
    }
  });
});
