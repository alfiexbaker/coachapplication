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
    id: 'usr_parent_permissions',
    email: 'permissions.parent@example.test',
    accountType: 'PARENT',
    appRole: 'USER',
    firstName: 'Permission',
    lastName: 'Parent',
    isVerified: true,
    onboardingComplete: true,
    createdAt: '2026-07-07T12:00:00.000Z',
    updatedAt: '2026-07-07T12:00:00.000Z',
  });
  registerApiAuthService({
    getTokens: async () => ({
      accessToken: 'family-permissions-api-token',
      refreshToken: 'family-permissions-refresh-token',
      expiresAt: Date.now() + 3_600_000,
    }),
    refreshToken: async () => ok(undefined),
    logout: async () => {},
  });

  return () => {
    authService.getCurrentUser = originalGetCurrentUser;
  };
}

function familyPayload() {
  return {
    family: {
      id: 'fam_permissions_api',
      name: 'Permissions Family',
      primaryGuardianUserId: 'usr_parent_permissions',
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    },
    memberships: [
      {
        id: 'fmem_primary',
        familyId: 'fam_permissions_api',
        userId: 'usr_parent_permissions',
        role: 'owner',
        permissions: null,
        childAccessAthleteIds: [],
        createdAt: '2026-07-01T00:00:00.000Z',
      },
      {
        id: 'fmem_limited',
        familyId: 'fam_permissions_api',
        userId: 'usr_limited_guardian',
        role: 'GUARDIAN',
        permissions: ['schedule', 'progress'],
        childAccessAthleteIds: ['ath_perm_1'],
        createdAt: '2026-07-01T00:00:00.000Z',
      },
      {
        id: 'fmem_admin',
        familyId: 'fam_permissions_api',
        userId: 'usr_admin_guardian',
        role: 'GUARDIAN',
        permissions: ['admin'],
        childAccessAthleteIds: [],
        createdAt: '2026-07-01T00:00:00.000Z',
      },
    ],
    athletes: [
      {
        id: 'ath_perm_1',
        parentId: 'usr_parent_permissions',
        displayName: 'Alex Permission',
        dateOfBirth: '2014-03-15',
        relationship: 'son',
        createdAt: '2026-07-01T00:00:00.000Z',
      },
      {
        id: 'ath_perm_2',
        parentId: 'usr_parent_permissions',
        displayName: 'Sam Permission',
        dateOfBirth: '2016-05-20',
        relationship: 'daughter',
        createdAt: '2026-07-01T00:00:00.000Z',
      },
    ],
    pendingGuardianInvites: [],
  };
}

afterEach(async () => {
  globalThis.fetch = originalFetch;
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.clear();
});

describe('familyPermissionService API mode', () => {
  it('reads permissions and child access from /v1 family authority', async () => {
    const restoreUser = await setupApiModeParent();
    const { familyPermissionService } = await import('@/services/family/family-permission-service');
    const calls: Array<{ method: string; path: string; actingRole?: string }> = [];

    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      const headers = new Headers(init?.headers);
      calls.push({
        method: init?.method ?? 'GET',
        path: url.pathname,
        actingRole: headers.get('x-acting-role') ?? undefined,
      });
      if (url.pathname === '/v1/families/fam_permissions_api') {
        return jsonResponse(familyPayload());
      }
      return jsonResponse({ message: `unexpected ${url.pathname}` }, 404);
    }) as typeof fetch;

    try {
      assert.deepEqual(
        await familyPermissionService.getPermissions('usr_limited_guardian', 'fam_permissions_api'),
        ['VIEW_SCHEDULE', 'VIEW_PROGRESS'],
      );
      assert.equal(
        await familyPermissionService.hasPermission(
          'usr_limited_guardian',
          'fam_permissions_api',
          'VIEW_PROGRESS',
        ),
        true,
      );
      assert.equal(
        await familyPermissionService.isAdmin('usr_parent_permissions', 'fam_permissions_api'),
        true,
      );
      assert.equal(
        await familyPermissionService.hasPermission(
          'usr_limited_guardian',
          'fam_permissions_api',
          'BOOK_SESSIONS',
        ),
        false,
      );
      assert.equal(
        await familyPermissionService.hasPermission(
          'usr_admin_guardian',
          'fam_permissions_api',
          'MANAGE_PAYMENTS',
        ),
        true,
      );

      const limitedChildren = await familyPermissionService.getAccessibleChildren(
        'usr_limited_guardian',
        'fam_permissions_api',
      );
      assert.deepEqual(
        limitedChildren.map((child) => child.id),
        ['ath_perm_1'],
      );

      const primaryChildren = await familyPermissionService.getAccessibleChildren(
        'usr_parent_permissions',
        'fam_permissions_api',
      );
      assert.deepEqual(
        primaryChildren.map((child) => child.id),
        ['ath_perm_1', 'ath_perm_2'],
      );

      assert.ok(calls.length >= 6);
      assert.ok(
        calls.every(
          (call) =>
            call.method === 'GET' &&
            call.path === '/v1/families/fam_permissions_api' &&
            call.actingRole === 'parent',
        ),
      );
    } finally {
      restoreUser();
    }
  });

  it('updates permissions and child access through /v1 family guardian authority', async () => {
    const restoreUser = await setupApiModeParent();
    const { familyPermissionService } = await import('@/services/family/family-permission-service');
    const calls: Array<{
      method: string;
      path: string;
      actingRole?: string;
      body: unknown;
    }> = [];

    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      const headers = new Headers(init?.headers);
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      calls.push({
        method: init?.method ?? 'GET',
        path: url.pathname,
        actingRole: headers.get('x-acting-role') ?? undefined,
        body,
      });
      if (url.pathname === '/v1/families/fam_permissions_api/guardians/fmem_limited') {
        return jsonResponse({
          id: 'fmem_limited',
          familyId: 'fam_permissions_api',
          userId: 'usr_limited_guardian',
          role: 'GUARDIAN',
          permissions: body.permissions ?? ['VIEW_SCHEDULE'],
          relationship: 'Grandparent',
          childAccess: body.childAccess ?? ['ath_perm_1'],
          isPrimary: false,
          addedAt: '2026-07-01T00:00:00.000Z',
          updatedAt: '2026-07-08T09:00:00.000Z',
        });
      }
      return jsonResponse({ message: `unexpected ${url.pathname}` }, 404);
    }) as typeof fetch;

    try {
      const permissionsResult = await familyPermissionService.updatePermissions(
        'fam_permissions_api',
        'usr_parent_permissions',
        'fmem_limited',
        ['VIEW_SCHEDULE', 'MANAGE_PAYMENTS'],
      );
      assert.equal(permissionsResult.success, true);
      if (permissionsResult.success) {
        assert.deepEqual(permissionsResult.data.permissions, [
          'VIEW_SCHEDULE',
          'MANAGE_PAYMENTS',
        ]);
        assert.equal(permissionsResult.data.userId, 'usr_limited_guardian');
      }

      const childAccessResult = await familyPermissionService.updateChildAccess(
        'fam_permissions_api',
        'usr_parent_permissions',
        'fmem_limited',
        ['ath_perm_2'],
      );
      assert.equal(childAccessResult.success, true);
      if (childAccessResult.success) {
        assert.deepEqual(childAccessResult.data.childAccess, ['ath_perm_2']);
        assert.equal(childAccessResult.data.isPrimary, false);
      }

      assert.deepEqual(calls, [
        {
          method: 'PATCH',
          path: '/v1/families/fam_permissions_api/guardians/fmem_limited',
          actingRole: 'parent',
          body: {
            permissions: ['VIEW_SCHEDULE', 'MANAGE_PAYMENTS'],
          },
        },
        {
          method: 'PATCH',
          path: '/v1/families/fam_permissions_api/guardians/fmem_limited',
          actingRole: 'parent',
          body: {
            childAccess: ['ath_perm_2'],
          },
        },
      ]);
    } finally {
      restoreUser();
    }
  });

  it('fails closed on family permission auth or API read failures', async () => {
    const [{ familyPermissionService }, { authService }] = await Promise.all([
      import('@/services/family/family-permission-service'),
      import('@/services/auth-service'),
    ]);
    const originalGetCurrentUser = authService.getCurrentUser;

    authService.getCurrentUser = async () => null;
    await assert.rejects(
      () => familyPermissionService.getPermissions('usr_limited_guardian', 'fam_permissions_api'),
      /sign in to view family permissions/i,
    );

    const result = await familyPermissionService.getGuardianPermissions(
      'usr_limited_guardian',
      'fam_permissions_api',
    );
    assert.equal(result.success, false);

    const restoreUser = await setupApiModeParent();
    globalThis.fetch = (async () =>
      jsonResponse({ message: 'family permissions down' }, 503)) as typeof fetch;

    try {
      await assert.rejects(
        () =>
          familyPermissionService.hasPermission(
            'usr_limited_guardian',
            'fam_permissions_api',
            'VIEW_PROGRESS',
          ),
        /family permissions down/i,
      );
      await assert.rejects(
        () =>
          familyPermissionService.getAccessibleChildren(
            'usr_limited_guardian',
            'fam_permissions_api',
          ),
        /family permissions down/i,
      );
    } finally {
      restoreUser();
      authService.getCurrentUser = originalGetCurrentUser;
    }
  });
});
