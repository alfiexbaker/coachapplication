import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('authService API mode', () => {
  it('refreshes current user from /v1/auth/me instead of trusting local AUTH_USER', async () => {
    const [{ authService }, { apiClient }] = await Promise.all([
      import('@/services/auth-service'),
      import('@/services/api-client'),
    ]);

    const staleUser = {
      id: 'user_api_current',
      email: 'stale@example.com',
      accountType: 'COACH',
      firstName: 'Stale',
      lastName: 'User',
      isVerified: false,
      onboardingComplete: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const liveUser = {
      ...staleUser,
      email: 'live@example.com',
      firstName: 'Live',
      updatedAt: '2026-07-08T00:00:00.000Z',
    };

    await authService.storeTokens({
      accessToken: 'live_access_token',
      refreshToken: 'live_refresh_token',
      expiresAt: Date.now() + 60_000,
    });
    await apiClient.set(STORAGE_KEYS.AUTH_USER, staleUser);

    const originalFetch = globalThis.fetch;
    let meCalls = 0;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/v1/auth/me')) {
        meCalls += 1;
        return {
          ok: true,
          status: 200,
          json: async () => ({ user: liveUser }),
          text: async () => '',
        };
      }

      return {
        ok: true,
        status: 204,
        json: async () => ({}),
        text: async () => '',
      };
    }) as unknown as typeof globalThis.fetch;

    try {
      const user = await authService.getCurrentUser();

      assert.equal(meCalls, 1);
      assert.equal(user?.email, 'live@example.com');
      assert.equal(user?.firstName, 'Live');

      const cached = await apiClient.get<typeof liveUser | null>(STORAGE_KEYS.AUTH_USER, null);
      assert.equal(cached?.email, 'live@example.com');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('does not patch email verification state when verify-email omits a user payload', async () => {
    const [{ authService }, { apiClient }] = await Promise.all([
      import('@/services/auth-service'),
      import('@/services/api-client'),
    ]);

    const unverifiedUser = {
      id: 'user_api_verify',
      email: 'verify@example.com',
      accountType: 'COACH',
      firstName: 'Verify',
      lastName: 'Coach',
      isVerified: false,
      onboardingComplete: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const verifiedUser = {
      ...unverifiedUser,
      isVerified: true,
      updatedAt: '2026-07-08T00:00:00.000Z',
    };

    const originalFetch = globalThis.fetch;
    const calls: Array<{ method: string; url: string }> = [];
    let meCalls = 0;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      calls.push({ method, url });

      if (url.endsWith('/v1/auth/me') && method === 'GET') {
        meCalls += 1;
        return {
          ok: true,
          status: 200,
          json: async () => ({ user: meCalls === 1 ? unverifiedUser : verifiedUser }),
          text: async () => '',
        };
      }

      if (url.endsWith('/v1/auth/verify-email')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
          text: async () => '',
        };
      }

      return {
        ok: true,
        status: 204,
        json: async () => ({}),
        text: async () => '',
      };
    }) as unknown as typeof globalThis.fetch;

    try {
      await authService.logout();
      await authService.storeTokens({
        accessToken: 'verify_access_token',
        refreshToken: 'verify_refresh_token',
        expiresAt: Date.now() + 60_000,
      });

      const currentUser = await authService.getCurrentUser();
      assert.equal(currentUser?.isVerified, false);

      const result = await authService.verifyEmail('123456');
      assert.equal(result.success, true);
      if (!result.success) return;

      assert.equal(result.data.user.isVerified, true);
      assert.equal(meCalls, 2);
      assert.equal(calls.some((call) => call.method === 'PATCH' && call.url.endsWith('/v1/auth/me')), false);

      const cached = await apiClient.get<typeof verifiedUser | null>(STORAGE_KEYS.AUTH_USER, null);
      assert.equal(cached?.isVerified, true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
