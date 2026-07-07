import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('apiClient API mode storage boundary', () => {
  it('rejects server-owned generic reads instead of returning fallbacks', async () => {
    const { apiClient } = await import('@/services/api-client');

    await assert.rejects(
      () => apiClient.get(STORAGE_KEYS.CONCERNS, []),
      /EXPLICIT_V1_REQUIRED|explicit \/v1 service contract/,
    );
  });

  it('keeps whitelisted client runtime keys local in API mode', async () => {
    const { apiClient } = await import('@/services/api-client');

    await apiClient.set(STORAGE_KEYS.ACTIVE_CHILD_ID, 'ath_api_boundary');
    assert.equal(await apiClient.get(STORAGE_KEYS.ACTIVE_CHILD_ID, null), 'ath_api_boundary');
  });
});
