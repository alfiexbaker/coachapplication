import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { STORAGE_KEYS, getUserKey } from '@/constants/storage-keys';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('apiClient API mode storage boundary', () => {
  it('rejects server-owned generic reads instead of returning fallbacks', async () => {
    const { apiClient } = await import('@/services/api-client');

    await assert.rejects(
      () => apiClient.get(STORAGE_KEYS.CONCERNS, []),
      /EXPLICIT_V1_REQUIRED|explicit \/v1 service contract/,
    );
  });

  it('rejects allow-book-self generic reads in API mode', async () => {
    const { apiClient } = await import('@/services/api-client');

    await assert.rejects(
      () => apiClient.get(getUserKey(STORAGE_KEYS.ALLOW_BOOK_SELF, 'user_api_boundary'), false),
      /EXPLICIT_V1_REQUIRED|explicit \/v1 service contract/,
    );
  });

  it('rejects review read-model storage in API mode', async () => {
    const { apiClient } = await import('@/services/api-client');

    for (const key of [
      STORAGE_KEYS.COACH_PUBLIC_REVIEWS,
      STORAGE_KEYS.RATE_COACH_REVIEWS,
      STORAGE_KEYS.REVIEWS,
    ]) {
      await assert.rejects(
        () => apiClient.set(key, []),
        /EXPLICIT_V1_REQUIRED|explicit \/v1 service contract/,
      );
    }
  });

  it('rejects session completion mirror storage in API mode', async () => {
    const { apiClient } = await import('@/services/api-client');

    for (const key of [
      STORAGE_KEYS.SESSION_ATTENDANCE,
      `${STORAGE_KEYS.SESSION_ATTENDANCE}_session_api_boundary`,
      STORAGE_KEYS.SESSION_SHARING,
      `${STORAGE_KEYS.SESSION_SHARING}_session_api_boundary`,
    ]) {
      await assert.rejects(
        () => apiClient.set(key, {}),
        /EXPLICIT_V1_REQUIRED|explicit \/v1 service contract/,
      );
    }
  });

  it('rejects wizard draft storage in API mode until explicit v1 draft contracts exist', async () => {
    const { apiClient } = await import('@/services/api-client');

    for (const key of [
      STORAGE_KEYS.ONBOARDING_COMPLETE,
      STORAGE_KEYS.ONBOARDING_PROGRESS,
      `${STORAGE_KEYS.FORM_DRAFT_PREFIX}api_boundary`,
    ]) {
      await assert.rejects(
        () => apiClient.set(key, {}),
        /EXPLICIT_V1_REQUIRED|explicit \/v1 service contract/,
      );
    }
  });

  it('rejects offline queue storage in API mode until explicit v1 retry contracts exist', async () => {
    const { apiClient } = await import('@/services/api-client');

    await assert.rejects(
      () => apiClient.set(STORAGE_KEYS.OFFLINE_QUEUE, []),
      /EXPLICIT_V1_REQUIRED|explicit \/v1 service contract/,
    );
  });

  it('keeps whitelisted client runtime keys local in API mode', async () => {
    const { apiClient } = await import('@/services/api-client');

    await apiClient.set(STORAGE_KEYS.ACTIVE_CHILD_ID, 'ath_api_boundary');
    assert.equal(await apiClient.get(STORAGE_KEYS.ACTIVE_CHILD_ID, null), 'ath_api_boundary');
  });
});
