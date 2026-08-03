import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { STORAGE_KEYS, getUserKey } from '@/constants/storage-keys';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

const CLIENT_LOCAL_STORAGE_KEYS = new Set<string>([
  STORAGE_KEYS.ACTIVE_CHILD_ID,
  STORAGE_KEYS.AUTH_USER,
  STORAGE_KEYS.CALENDAR_SYNC_SETTINGS,
  STORAGE_KEYS.DISCOVER_RECENT_SEARCHES,
  STORAGE_KEYS.NOTIFICATION_ROUTE_ALIAS_MIGRATION_V1,
  STORAGE_KEYS.SEEN_STATUSES,
]);

const EXPLICIT_V1_REQUIRED = /EXPLICIT_V1_REQUIRED|explicit \/v1 service contract/;

describe('apiClient API mode storage boundary', () => {
  it('uses RFC 7807 detail instead of exposing the serialized problem response', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          type: 'https://api.clubroom.local/errors/auth_forbidden',
          title: 'You do not have permission to manage club invites',
          status: 403,
          code: 'AUTH_FORBIDDEN',
          detail: 'You do not have permission to manage club invites',
          requestId: 'req_should_not_reach_ui',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/problem+json' },
        },
      )) as typeof fetch;

    try {
      const { apiFetch } = await import('@/services/api-client');
      const result = await apiFetch('/v1/test/problem-details');

      assert.equal(result.success, false);
      if (result.success) return;
      assert.equal(result.error.code, 'UNAUTHORIZED');
      assert.equal(result.error.message, 'You do not have permission to manage club invites');
      assert.doesNotMatch(result.error.message, /requestId|AUTH_FORBIDDEN|^\{/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('rejects server-owned generic reads instead of returning fallbacks', async () => {
    const { apiClient } = await import('@/services/api-client');

    await assert.rejects(
      () => apiClient.get(STORAGE_KEYS.CONCERNS, []),
      EXPLICIT_V1_REQUIRED,
    );
  });

  it('does not let BaseService turn API-mode storage rejection into empty success', async () => {
    const { BaseService } = await import('@/services/base-service');

    class ApiOwnedService extends BaseService<{ id: string }> {
      protected storageKey = STORAGE_KEYS.CONCERNS;
      protected entityName = 'ApiOwnedRecord';
    }

    const result = await new ApiOwnedService().getAll();

    assert.equal(result.success, false);
    if (result.success) {
      assert.fail('API-mode generic storage rejection must not become an empty list');
    }
    assert.equal(result.error.code, 'STORAGE');
  });

  it('rejects every declared server-owned storage key through every generic operation', async () => {
    const { apiClient } = await import('@/services/api-client');
    const declaredKeys = [...new Set(Object.values(STORAGE_KEYS))];
    const serverOwnedKeys = [
      ...declaredKeys.filter((key) => !CLIENT_LOCAL_STORAGE_KEYS.has(key)),
      ...declaredKeys
        .filter((key) => key !== STORAGE_KEYS.CALENDAR_SYNC_SETTINGS)
        .map((key) => `${key}_api_boundary`),
    ];
    const originalWarn = console.warn;

    assert.ok(serverOwnedKeys.length > 200, 'expected exact and derived server-owned storage keys');

    console.warn = () => undefined;
    try {
      for (const key of serverOwnedKeys) {
        await assert.rejects(() => apiClient.get(key, null), EXPLICIT_V1_REQUIRED, `get ${key}`);
        await assert.rejects(() => apiClient.set(key, null), EXPLICIT_V1_REQUIRED, `set ${key}`);
        await assert.rejects(
          () => apiClient.update(key, () => null, null),
          EXPLICIT_V1_REQUIRED,
          `update ${key}`,
        );
        await assert.rejects(() => apiClient.remove(key), EXPLICIT_V1_REQUIRED, `remove ${key}`);
      }
    } finally {
      console.warn = originalWarn;
    }
  });

  it('rejects allow-book-self generic reads in API mode', async () => {
    const { apiClient } = await import('@/services/api-client');

    await assert.rejects(
      () => apiClient.get(getUserKey(STORAGE_KEYS.ALLOW_BOOK_SELF, 'user_api_boundary'), false),
      EXPLICIT_V1_REQUIRED,
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
        EXPLICIT_V1_REQUIRED,
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
        EXPLICIT_V1_REQUIRED,
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
        EXPLICIT_V1_REQUIRED,
      );
    }
  });

  it('rejects offline queue storage in API mode until explicit v1 retry contracts exist', async () => {
    const { apiClient } = await import('@/services/api-client');

    await assert.rejects(
      () => apiClient.set(STORAGE_KEYS.OFFLINE_QUEUE, []),
      EXPLICIT_V1_REQUIRED,
    );
  });

  it('keeps whitelisted client runtime keys local in API mode', async () => {
    const { apiClient } = await import('@/services/api-client');

    await apiClient.set(STORAGE_KEYS.ACTIVE_CHILD_ID, 'ath_api_boundary');
    assert.equal(await apiClient.get(STORAGE_KEYS.ACTIVE_CHILD_ID, null), 'ath_api_boundary');
  });
});
