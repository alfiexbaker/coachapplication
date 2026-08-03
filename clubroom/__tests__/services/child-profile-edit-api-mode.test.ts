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

async function setupSignedInParent() {
  const [{ authService }, { registerApiAuthService }, { ok }] = await Promise.all([
    import('@/services/auth-service'),
    import('@/services/auth-service-registry'),
    import('@/types/result'),
  ]);
  const originalGetCurrentUser = authService.getCurrentUser;

  authService.getCurrentUser = async () => ({
    id: 'usr_profile_parent',
    email: 'profile.parent@example.test',
    accountType: 'PARENT',
    appRole: 'USER',
    firstName: 'Profile',
    lastName: 'Parent',
    isVerified: true,
    onboardingComplete: true,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  });
  registerApiAuthService({
    getTokens: async () => ({
      accessToken: 'child-profile-edit-test-token',
      refreshToken: 'child-profile-edit-refresh-token',
      expiresAt: Date.now() + 3_600_000,
    }),
    refreshToken: async () => ok(undefined),
    logout: async () => {},
  });

  return () => {
    authService.getCurrentUser = originalGetCurrentUser;
  };
}

function familyPayload(params: { permissions: string[]; childIds: string[] }) {
  return {
    family: {
      id: 'fam_profile_edit',
      name: 'Profile Family',
      primaryGuardianUserId: 'usr_other_primary',
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    },
    memberships: [
      {
        id: 'fmem_profile_parent',
        familyId: 'fam_profile_edit',
        userId: 'usr_profile_parent',
        role: 'guardian',
        permissions: params.permissions,
        childAccessAthleteIds: params.childIds,
        createdAt: '2026-07-01T00:00:00.000Z',
      },
    ],
    athletes: params.childIds.map((id) => ({
      id,
      parentId: 'usr_other_primary',
      displayName: 'Assigned Player',
      firstName: 'Assigned',
      lastName: 'Player',
      gender: 'PREFER_NOT_TO_SAY',
      relationship: 'OTHER',
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    })),
    pendingGuardianInvites: [],
  };
}

afterEach(async () => {
  globalThis.fetch = originalFetch;
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.clear();
});

describe('child profile edit access in API mode', () => {
  it('allows only a profile manager assigned to the requested child', async () => {
    const restoreUser = await setupSignedInParent();
    const { childService } = await import('@/services/child-service');
    const calls: string[] = [];

    globalThis.fetch = (async (input) => {
      const url = new URL(String(input));
      calls.push(url.pathname);
      if (url.pathname === '/v1/me') {
        return jsonResponse({
          linkedFamilies: [{ familyId: 'fam_profile_edit', role: 'guardian' }],
        });
      }
      if (url.pathname === '/v1/families/fam_profile_edit') {
        return jsonResponse(
          familyPayload({ permissions: ['profile'], childIds: ['ath_profile_assigned'] }),
        );
      }
      return jsonResponse({ message: `unexpected ${url.pathname}` }, 404);
    }) as typeof fetch;

    try {
      const assigned = await childService.canManageChildProfile('ath_profile_assigned');
      assert.deepEqual(assigned, { success: true, data: true });

      const hidden = await childService.canManageChildProfile('ath_profile_hidden');
      assert.deepEqual(hidden, { success: true, data: false });
      assert.equal(calls.filter((path) => path === '/v1/families/fam_profile_edit').length, 4);
    } finally {
      restoreUser();
    }
  });

  it('denies view-only guardians before requesting child profile data', async () => {
    const restoreUser = await setupSignedInParent();
    const { childService } = await import('@/services/child-service');
    const calls: string[] = [];

    globalThis.fetch = (async (input) => {
      const url = new URL(String(input));
      calls.push(url.pathname);
      if (url.pathname === '/v1/me') {
        return jsonResponse({
          linkedFamilies: [{ familyId: 'fam_profile_edit', role: 'guardian' }],
        });
      }
      if (url.pathname === '/v1/families/fam_profile_edit') {
        return jsonResponse(
          familyPayload({ permissions: ['schedule'], childIds: ['ath_profile_assigned'] }),
        );
      }
      return jsonResponse({ message: `unexpected ${url.pathname}` }, 404);
    }) as typeof fetch;

    try {
      const result = await childService.canManageChildProfile('ath_profile_assigned');
      assert.deepEqual(result, { success: true, data: false });
      assert.equal(calls.includes('/v1/athletes/ath_profile_assigned'), false);
      assert.equal(calls.filter((path) => path === '/v1/families/fam_profile_edit').length, 1);
    } finally {
      restoreUser();
    }
  });
});
