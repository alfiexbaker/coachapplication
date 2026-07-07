import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import type { User } from '@/constants/types';
import { POC_ACCOUNT_IDS } from '@/constants/poc-accounts';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { childService } from '@/services/child-service';
import { eventBus, onTyped, ServiceEvents } from '@/services/event-bus';
import { safetyService } from '@/services/safety-service';
import { userService } from '@/services/user-service';

const USERS_SEED: User[] = [
  {
    id: 'user-a',
    email: 'coach.a@example.com',
    role: 'COACH',
    name: 'Coach Alpha',
    postcode: 'E1 1AA',
    dateOfBirth: '1990-01-01',
  },
  {
    id: 'user-b',
    email: 'parent.b@example.com',
    role: 'USER',
    name: 'Parent Bravo',
    postcode: 'SW1A 1AA',
    dateOfBirth: '1988-05-10',
  },
];

async function withApiMode<T>(run: () => Promise<T>): Promise<T> {
  const originalDescriptor = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
  Object.defineProperty(apiClient, 'isMockMode', {
    configurable: true,
    get: () => false,
  });

  try {
    return await run();
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(apiClient, 'isMockMode', originalDescriptor);
    } else {
      delete (apiClient as unknown as { isMockMode?: boolean }).isMockMode;
    }
  }
}

describe('userService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.USERS);
    await apiClient.remove(STORAGE_KEYS.AUTH_USER);
    childService.__resetMockChildren();
    await safetyService.resetToMockData();
    eventBus.clearAll();
  });

  it('maps current user from AUTH_USER fallback (happy path)', async () => {
    await apiClient.set(STORAGE_KEYS.AUTH_USER, {
      id: 'auth-user-1',
      firstName: 'Alex',
      lastName: 'Stone',
      email: 'alex.stone@example.com',
      accountType: 'COACH',
    });

    const result = await userService.getCurrentUser();

    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(result.data.id, 'auth-user-1');
    assert.equal(result.data.name, 'Alex Stone');
    assert.equal(result.data.role, 'COACH');
  });

  it('returns not found for unknown user id (error path)', async () => {
    await apiClient.set(STORAGE_KEYS.USERS, USERS_SEED);

    const result = await userService.getUserById('user-missing');

    assert.equal(result.success, false);
    if (result.success) return;

    assert.equal(result.error.code, 'NOT_FOUND');
  });

  it('resolves child-created user records when users storage has no child record', async () => {
    await apiClient.set(STORAGE_KEYS.USERS, USERS_SEED);
    const child = await childService.createChild('parent_user_service', {
      firstName: 'Freya',
      lastName: 'Barton',
      nickname: 'F',
      dateOfBirth: '2014-02-11',
      gender: 'FEMALE',
      relationship: 'DAUGHTER',
      emergencyContactName: 'Parent Barton',
      emergencyContactPhone: '+44 7700 100200',
      emergencyContactRelation: 'Parent',
    });

    const result = await userService.getUserById(child.id);

    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.id, child.id);
    assert.equal(result.data.name, 'F');
    assert.equal(result.data.role, 'USER');
    assert.equal(result.data.dateOfBirth, '2014-02-11');
  });

  it('resolves canonical account aliases (coach1 -> coach-1)', async () => {
    await apiClient.set(STORAGE_KEYS.USERS, [
      ...USERS_SEED,
      {
        id: POC_ACCOUNT_IDS.coachStorage,
        email: 'coach.one@example.com',
        role: 'COACH',
        name: 'Coach One',
        postcode: 'N1 1AA',
        dateOfBirth: '1991-04-10',
      },
    ]);

    const result = await userService.getUserById(POC_ACCOUNT_IDS.coach);

    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.id, POC_ACCOUNT_IDS.coachStorage);
  });

  it('returns empty list for empty id input (empty path)', async () => {
    await apiClient.set(STORAGE_KEYS.USERS, USERS_SEED);

    const result = await userService.getUsersByIds([]);

    assert.equal(result.success, true);
    if (!result.success) return;

    assert.deepEqual(result.data, []);
  });

  it('searches users by name/email/role', async () => {
    await apiClient.set(STORAGE_KEYS.USERS, USERS_SEED);

    const byRole = await userService.searchUsers('coach');
    assert.equal(byRole.success, true);
    if (byRole.success) {
      assert.equal(byRole.data.length, 1);
      assert.equal(byRole.data[0].id, 'user-a');
    }

    const byEmail = await userService.searchUsers('parent.b@');
    assert.equal(byEmail.success, true);
    if (byEmail.success) {
      assert.equal(byEmail.data.length, 1);
      assert.equal(byEmail.data[0].id, 'user-b');
    }
  });

  it('updates user profile and emits USER_UPDATED + USER_PROFILE_CHANGED', async () => {
    await apiClient.set(STORAGE_KEYS.USERS, USERS_SEED);

    const emitted: string[] = [];
    const offUpdated = onTyped(ServiceEvents.USER_UPDATED, () => emitted.push('updated'));
    const offProfile = onTyped(ServiceEvents.USER_PROFILE_CHANGED, () => emitted.push('profile'));

    const result = await userService.updateUserProfile('user-a', {
      name: 'Coach Alpha Prime',
      postcode: 'N1 9GU',
    });

    offUpdated();
    offProfile();

    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(result.data.name, 'Coach Alpha Prime');
    assert.equal(result.data.postcode, 'N1 9GU');
    assert.deepEqual(emitted.sort(), ['profile', 'updated']);
  });

  it('uses only the signed-in auth profile as API-mode user display source', async () => {
    await withApiMode(async () => {
      await apiClient.set(STORAGE_KEYS.USERS, USERS_SEED);
      await apiClient.set(STORAGE_KEYS.AUTH_USER, {
        id: 'auth-user-live',
        firstName: 'Live',
        lastName: 'Profile',
        email: 'live.profile@example.com',
        accountType: 'PARENT',
      });

      const current = await userService.getCurrentUser();
      assert.equal(current.success, true);
      if (!current.success) return;
      assert.equal(current.data.id, 'auth-user-live');
      assert.equal(current.data.name, 'Live Profile');

      const localOnly = await userService.getUserById('user-a');
      assert.equal(localOnly.success, false);
      if (localOnly.success) return;
      assert.equal(localOnly.error.code, 'NOT_FOUND');

      const byIds = await userService.getUsersByIds(['auth-user-live', 'user-a']);
      assert.equal(byIds.success, true);
      if (!byIds.success) return;
      assert.deepEqual(
        byIds.data.map((user) => user.id),
        ['auth-user-live'],
      );
    });
  });

  it('uses API-mode user directory search and still blocks local profile writes', async () => {
    await withApiMode(async () => {
      const originalFetch = global.fetch;
      const fetchCalls: string[] = [];
      global.fetch = (async (input: RequestInfo | URL) => {
        const url = String(input);
        fetchCalls.push(url);
        return new Response(
          JSON.stringify({
            users: [
              {
                id: 'api-user-coach',
                name: 'API Coach',
                email: 'coach.api@example.com',
                role: 'COACH',
              },
            ],
            total: 1,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }) as typeof fetch;

      await apiClient.set(STORAGE_KEYS.USERS, USERS_SEED);
      await apiClient.set(STORAGE_KEYS.AUTH_USER, {
        id: 'auth-user-live',
        name: 'Live Profile',
        email: 'live.profile@example.com',
        role: 'PARENT',
      });

      try {
        const shortSearch = await userService.searchUsers('c', 'auth-user-live');
        assert.equal(shortSearch.success, true);
        if (!shortSearch.success) return;
        assert.deepEqual(shortSearch.data, []);
        assert.equal(fetchCalls.length, 0);

        const search = await userService.searchUsers('coach', 'auth-user-live');
        assert.equal(search.success, true);
        if (!search.success) return;
        assert.deepEqual(
          search.data.map((user) => user.id),
          ['api-user-coach'],
        );
        assert.equal(
          fetchCalls.some((url) => url.includes('/v1/users/search?q=coach')),
          true,
        );
      } finally {
        global.fetch = originalFetch;
      }

      const update = await userService.updateUserProfile('auth-user-live', {
        name: 'Local Mutation',
      });
      assert.equal(update.success, false);
      if (update.success) return;
      assert.equal(update.error.code, 'UNSUPPORTED');

      const localUsers = await apiClient.get<User[]>(STORAGE_KEYS.USERS, []);
      assert.equal(
        localUsers.find((user) => user.id === 'auth-user-live'),
        undefined,
      );
      assert.equal(localUsers.find((user) => user.id === 'user-a')?.name, 'Coach Alpha');
    });
  });

  it('returns storage error when user load fails', async () => {
    const apiClientInternals = apiClient as unknown as {
      get: typeof apiClient.get;
    };
    const originalGet = apiClientInternals.get;
    apiClientInternals.get = async () => {
      throw new Error('forced user load failure');
    };

    try {
      const result = await userService.getUserById('user-any');

      assert.equal(result.success, false);
      if (result.success) return;

      assert.equal(result.error.code, 'STORAGE');
    } finally {
      apiClientInternals.get = originalGet;
    }
  });
});
