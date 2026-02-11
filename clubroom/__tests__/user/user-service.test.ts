import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import type { User } from '@/constants/types';
import { POC_ACCOUNT_IDS } from '@/constants/poc-accounts';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { eventBus, onTyped, ServiceEvents } from '@/services/event-bus';
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

describe('userService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.USERS);
    await apiClient.remove(STORAGE_KEYS.AUTH_USER);
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
