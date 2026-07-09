import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function setupApiModeParent() {
  const [{ authService }, { registerApiAuthService }, { ok }] = await Promise.all([
    import('@/services/auth-service'),
    import('@/services/auth-service-registry'),
    import('@/types/result'),
  ]);
  const originalGetCurrentUser = authService.getCurrentUser;

  authService.getCurrentUser = async () => ({
    id: 'usr_parent_guardian_invites',
    email: 'guardian.invites@example.test',
    accountType: 'PARENT',
    appRole: 'USER',
    firstName: 'Guardian',
    lastName: 'Invites',
    isVerified: true,
    onboardingComplete: true,
    createdAt: '2026-07-07T12:00:00.000Z',
    updatedAt: '2026-07-07T12:00:00.000Z',
  });
  registerApiAuthService({
    getTokens: async () => ({
      accessToken: 'family-invites-api-token',
      refreshToken: 'family-invites-refresh-token',
      expiresAt: Date.now() + 3_600_000,
    }),
    refreshToken: async () => ok(undefined),
    logout: async () => {},
  });

  return () => {
    authService.getCurrentUser = originalGetCurrentUser;
  };
}

afterEach(async () => {
  globalThis.fetch = originalFetch;
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.clear();
});

describe('familyRelationshipService API mode', () => {
  it('loads guardian invite inbox from /v1 and preserves real empty results', async () => {
    const restoreUser = await setupApiModeParent();
    const { familyRelationshipService } =
      await import('@/services/family/family-relationship-service');
    const calls: Array<{ method: string; path: string; actingRole?: string }> = [];

    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      const headers = new Headers(init?.headers);
      calls.push({
        method: init?.method ?? 'GET',
        path: url.pathname,
        actingRole: headers.get('x-acting-role') ?? undefined,
      });

      if (url.pathname === '/v1/me/guardian-invites') {
        return jsonResponse({ invites: [] });
      }
      return jsonResponse({ message: `unexpected ${url.pathname}` }, 404);
    }) as typeof fetch;

    try {
      const invites = await familyRelationshipService.getPendingInvitesForUser(
        'guardian.invites@example.test',
      );
      assert.deepEqual(invites, []);
      assert.deepEqual(calls, [
        { method: 'GET', path: '/v1/me/guardian-invites', actingRole: 'parent' },
      ]);
    } finally {
      restoreUser();
    }
  });

  it('fails closed on guardian invite auth or API read failures', async () => {
    const [{ familyRelationshipService }, { authService }] = await Promise.all([
      import('@/services/family/family-relationship-service'),
      import('@/services/auth-service'),
    ]);
    const originalGetCurrentUser = authService.getCurrentUser;

    authService.getCurrentUser = async () => null;
    await assert.rejects(
      () => familyRelationshipService.getPendingInvitesForUser('missing.auth@example.test'),
      /sign in to view guardian invitations/i,
    );

    const restoreUser = await setupApiModeParent();
    globalThis.fetch = (async () =>
      jsonResponse({ message: 'guardian invites down' }, 503)) as typeof fetch;

    try {
      await assert.rejects(
        () => familyRelationshipService.getPendingInvitesForUser('api.down@example.test'),
        /guardian invites down/i,
      );
    } finally {
      restoreUser();
      authService.getCurrentUser = originalGetCurrentUser;
    }
  });
});
