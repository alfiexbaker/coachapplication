import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { UserProfile } from '@/services/auth-service';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('authService API mode', () => {
  it('does not log raw email addresses in auth attempt or failure metadata', () => {
    const source = readProjectFile('services/auth-service.ts');

    const rawEmailLogPatterns = [
      /logger\.info\('Login attempt',\s*\{\s*email\s*\}\)/,
      /logger\.warn\('Login failed',\s*\{\s*email,/,
      /logger\.info\('Registration attempt',\s*\{\s*email: input\.email,/,
      /logger\.warn\('Registration failed',\s*\{\s*email: input\.email,/,
      /logger\.info\('Password reset requested',\s*\{\s*email\s*\}\)/,
      /logger\.warn\('Email availability check failed',\s*\{\s*email,/,
      /logger\.warn\('Login failed: Invalid credentials',\s*\{\s*email\s*\}\)/,
      /logger\.warn\('Registration failed: Email exists',\s*\{\s*email: input\.email\s*\}\)/,
    ];

    for (const pattern of rawEmailLogPatterns) {
      assert.doesNotMatch(source, pattern);
    }
    assert.match(source, /function emailLogFields\(email: string\)/);
    assert.match(source, /emailLength: normalized\.length/);
    assert.match(source, /emailDomainLength: domainLength/);
  });

  it('refreshes current user from /v1/auth/me instead of trusting local AUTH_USER', async () => {
    const [{ authService }, { apiClient }] = await Promise.all([
      import('@/services/auth-service'),
      import('@/services/api-client'),
    ]);

    const staleUser: UserProfile = {
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
    let liveUser: UserProfile = {
      ...staleUser,
      email: 'live@example.com',
      firstName: 'Live',
      updatedAt: '2026-07-08T00:00:00.000Z',
    };

    await authService.storeTokens({
      accessToken: 'live_access_token',
      refreshToken: 'live_refresh_token',
      expiresAt: Date.now() + 5 * 60_000,
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

      liveUser = {
        ...liveUser,
        firstName: 'Live Updated',
        appRole: 'ADMIN',
        roles: ['admin'],
        updatedAt: '2026-07-09T00:00:00.000Z',
      };
      const refreshedUser = await authService.getCurrentUser();

      assert.equal(meCalls, 2);
      assert.equal(refreshedUser?.firstName, 'Live Updated');
      assert.equal(refreshedUser?.appRole, 'ADMIN');

      const cached = await apiClient.get<typeof liveUser | null>(STORAGE_KEYS.AUTH_USER, null);
      assert.equal(cached?.firstName, 'Live Updated');
      assert.equal(cached?.appRole, 'ADMIN');
    } finally {
      await authService.logout();
      globalThis.fetch = originalFetch;
    }
  });

  it('fails closed instead of returning an in-memory user when /v1/auth/me fails', async () => {
    const [{ authService }] = await Promise.all([import('@/services/auth-service')]);
    const liveUser = {
      id: 'user_api_fail_closed',
      email: 'live.fail-closed@example.com',
      accountType: 'COACH' as const,
      firstName: 'Live',
      lastName: 'Authority',
      isVerified: true,
      onboardingComplete: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-07-08T00:00:00.000Z',
    };
    const originalFetch = globalThis.fetch;
    let authorityAvailable = true;
    let meCalls = 0;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/v1/auth/me')) {
        meCalls += 1;
        if (authorityAvailable) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ user: liveUser }),
            text: async () => '',
          };
        }
        return {
          ok: false,
          status: 503,
          json: async () => ({ detail: 'Current-user authority unavailable' }),
          text: async () => JSON.stringify({ detail: 'Current-user authority unavailable' }),
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
        accessToken: 'fail_closed_access_token',
        refreshToken: 'fail_closed_refresh_token',
        expiresAt: Date.now() + 5 * 60_000,
      });

      const firstLookup = await authService.getCurrentUser();
      assert.equal(firstLookup?.id, liveUser.id);

      authorityAvailable = false;
      const failedLookup = await authService.getCurrentUser();
      assert.equal(failedLookup, null);
      assert.equal(meCalls, 2);
    } finally {
      await authService.logout();
      globalThis.fetch = originalFetch;
    }
  });

  it('verifies email through /v1/auth/verify-email without local profile patching', async () => {
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
    const originalFetch = globalThis.fetch;
    const calls: { method: string; url: string }[] = [];
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
          json: async () => ({ user: unverifiedUser }),
          text: async () => '',
        };
      }

      if (url.endsWith('/v1/auth/verify-email')) {
        const body = JSON.stringify({ user: { ...unverifiedUser, isVerified: true } });
        return {
          ok: true,
          status: 200,
          json: async () => JSON.parse(body),
          text: async () => body,
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
      assert.equal(meCalls, 1);
      assert.equal(
        calls.some((call) => call.method === 'PATCH' && call.url.endsWith('/v1/auth/me')),
        false,
      );

      const cached = await apiClient.get<typeof unverifiedUser | null>(
        STORAGE_KEYS.AUTH_USER,
        null,
      );
      assert.equal(cached?.isVerified, true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('blocks signup availability when /v1/auth/check-email fails', async () => {
    const [{ authService }] = await Promise.all([import('@/services/auth-service')]);

    const originalFetch = globalThis.fetch;
    const calls: { method: string; url: string }[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      calls.push({ method, url });

      if (url.includes('/v1/auth/check-email')) {
        return {
          ok: false,
          status: 503,
          json: async () => ({ message: 'email authority unavailable' }),
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
      const available = await authService.checkEmailAvailable('new.parent@clubroom.test');

      assert.equal(available, false);
      assert.equal(
        calls.some((call) => call.method === 'GET' && call.url.includes('/v1/auth/check-email')),
        true,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('reports password reset delivery request failures', async () => {
    const { authService } = await import('@/services/auth-service');
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: false,
      status: 503,
      json: async () => ({ message: 'Password reset is unavailable.' }),
      text: async () => '',
    })) as unknown as typeof globalThis.fetch;

    try {
      const result = await authService.forgotPassword('coach@clubroom.test');

      assert.equal(result.success, false);
      if (result.success) return;
      assert.equal(result.error.code, 'NETWORK');
      assert.equal(result.error.message, 'Password reset is unavailable.');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('reports password reset delivery requests accepted by the API', async () => {
    const { authService } = await import('@/services/auth-service');
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true,
      status: 204,
      json: async () => ({}),
      text: async () => '',
    })) as unknown as typeof globalThis.fetch;

    try {
      const result = await authService.forgotPassword('coach@clubroom.test');
      assert.equal(result.success, true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
