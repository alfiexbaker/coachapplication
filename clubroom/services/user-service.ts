import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { User } from '@/constants/types';
import { type Result, type ServiceError, ok, err, notFound, storageError } from '@/types/result';
import { createLogger } from '@/utils/logger';
import { accountIdsMatch, normalizeAccountId } from '@/utils/account-id';

import { apiClient } from './api-client';
import { ServiceEvents, emitTyped } from './event-bus';

const logger = createLogger('UserService');

type UserChanges = Partial<
  Pick<User, 'name' | 'avatar' | 'postcode' | 'dateOfBirth' | 'email' | 'role'>
>;

interface AuthUserRecord {
  id?: unknown;
  name?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  avatar?: unknown;
  photoUrl?: unknown;
  postcode?: unknown;
  dateOfBirth?: unknown;
  role?: unknown;
  accountType?: unknown;
}

function normalizeUserRole(rawRole: unknown, rawAccountType: unknown): User['role'] {
  const candidate = (
    typeof rawRole === 'string'
      ? rawRole
      : typeof rawAccountType === 'string'
        ? rawAccountType
        : 'USER'
  ).toUpperCase();

  if (
    candidate === 'COACH' ||
    candidate === 'PARENT' ||
    candidate === 'ADMIN' ||
    candidate === 'USER'
  ) {
    return candidate;
  }

  // Auth profile can return ATHLETE; app-level User role equivalent is USER.
  if (candidate === 'ATHLETE') {
    return 'USER';
  }

  return 'USER';
}

function mapAuthUserToUser(authUser: AuthUserRecord): User | null {
  if (typeof authUser.id !== 'string' || authUser.id.length === 0) {
    return null;
  }

  const explicitName = typeof authUser.name === 'string' ? authUser.name.trim() : '';
  const firstName = typeof authUser.firstName === 'string' ? authUser.firstName.trim() : '';
  const lastName = typeof authUser.lastName === 'string' ? authUser.lastName.trim() : '';
  const joinedName = [firstName, lastName].filter(Boolean).join(' ').trim();

  return {
    id: authUser.id,
    name: explicitName || joinedName || 'Unknown User',
    email: typeof authUser.email === 'string' ? authUser.email : '',
    avatar:
      typeof authUser.avatar === 'string'
        ? authUser.avatar
        : typeof authUser.photoUrl === 'string'
          ? authUser.photoUrl
          : undefined,
    postcode: typeof authUser.postcode === 'string' ? authUser.postcode : '',
    dateOfBirth: typeof authUser.dateOfBirth === 'string' ? authUser.dateOfBirth : '',
    role: normalizeUserRole(authUser.role, authUser.accountType),
  };
}

class UserService {
  private async loadUsers(): Promise<User[]> {
    const users = await apiClient.get<User[]>(STORAGE_KEYS.USERS, []);
    if (users.length > 0) {
      return users;
    }

    const authUser = await apiClient.get<AuthUserRecord | null>(STORAGE_KEYS.AUTH_USER, null);
    const mappedUser = authUser ? mapAuthUserToUser(authUser) : null;
    return mappedUser ? [mappedUser] : [];
  }

  async getUserById(id: string): Promise<Result<User, ServiceError>> {
    try {
      const users = await this.loadUsers();
      const user = users.find((candidate) => accountIdsMatch(candidate.id, id));

      if (!user) {
        return err(notFound('User', id));
      }

      return ok(user);
    } catch (error) {
      logger.error('Failed to get user by id', { id, error });
      return err(storageError('Failed to load user'));
    }
  }

  async getUsersByIds(ids: string[]): Promise<Result<User[], ServiceError>> {
    try {
      const uniqueIds = [...new Set(ids.filter(Boolean))];
      if (uniqueIds.length === 0) {
        return ok([]);
      }

      const users = await this.loadUsers();
      const usersByNormalizedId = new Map(
        users.map((user) => [normalizeAccountId(user.id), user] as const),
      );
      const result = uniqueIds
        .map((id) => usersByNormalizedId.get(normalizeAccountId(id)))
        .filter((user): user is User => Boolean(user));

      return ok(result);
    } catch (error) {
      logger.error('Failed to get users by ids', { ids, error });
      return err(storageError('Failed to load users'));
    }
  }

  async searchUsers(query: string): Promise<Result<User[], ServiceError>> {
    try {
      const normalizedQuery = query.trim().toLowerCase();
      const users = await this.loadUsers();

      if (!normalizedQuery) {
        return ok(users);
      }

      const filtered = users.filter((user) => {
        const name = user.name.toLowerCase();
        const email = user.email.toLowerCase();
        const postcode = user.postcode.toLowerCase();
        const role = user.role.toLowerCase();

        return (
          name.includes(normalizedQuery) ||
          email.includes(normalizedQuery) ||
          postcode.includes(normalizedQuery) ||
          role.includes(normalizedQuery)
        );
      });

      return ok(filtered);
    } catch (error) {
      logger.error('Failed to search users', { query, error });
      return err(storageError('Failed to search users'));
    }
  }

  async getCurrentUser(): Promise<Result<User, ServiceError>> {
    try {
      const authUser = await apiClient.get<AuthUserRecord | null>(STORAGE_KEYS.AUTH_USER, null);
      if (!authUser) {
        return err(notFound('Current user'));
      }

      if (typeof authUser.id === 'string' && authUser.id.length > 0) {
        const existingUserResult = await this.getUserById(authUser.id);
        if (existingUserResult.success) {
          return existingUserResult;
        }
      }

      const mappedUser = mapAuthUserToUser(authUser);
      if (!mappedUser) {
        return err(notFound('Current user'));
      }

      return ok(mappedUser);
    } catch (error) {
      logger.error('Failed to get current user', error);
      return err(storageError('Failed to load current user'));
    }
  }

  async updateUserProfile(
    userId: string,
    changes: UserChanges,
  ): Promise<Result<User, ServiceError>> {
    try {
      const users = await this.loadUsers();
      const userIndex = users.findIndex((user) => accountIdsMatch(user.id, userId));
      if (userIndex === -1) {
        return err(notFound('User', userId));
      }

      const updatedUser: User = {
        ...users[userIndex],
        ...changes,
      };

      users[userIndex] = updatedUser;
      await apiClient.set(STORAGE_KEYS.USERS, users);

      emitTyped(ServiceEvents.USER_UPDATED, { userId, changes });
      emitTyped(ServiceEvents.USER_PROFILE_CHANGED, { userId, changes });

      return ok(updatedUser);
    } catch (error) {
      logger.error('Failed to update user profile', { userId, changes, error });
      return err(storageError('Failed to update user profile'));
    }
  }
}

export const userService = new UserService();
