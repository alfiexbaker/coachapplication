import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { User } from '@/constants/types';
import { type Result, type ServiceError, ok, err, notFound, storageError } from '@/types/result';
import { createLogger } from '@/utils/logger';
import { accountIdsMatch, normalizeAccountId } from '@/utils/account-id';

import { apiClient } from './api-client';
import { ServiceEvents, emitTyped } from './event-bus';
import { blockService } from './block-service';

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

interface ChildProfileRecord {
  id?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  nickname?: unknown;
  photoUrl?: unknown;
  dateOfBirth?: unknown;
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

function mapChildProfileToUser(profile: ChildProfileRecord): User | null {
  if (typeof profile.id !== 'string' || profile.id.length === 0) {
    return null;
  }

  const firstName = typeof profile.firstName === 'string' ? profile.firstName.trim() : '';
  const lastName = typeof profile.lastName === 'string' ? profile.lastName.trim() : '';
  const nickname = typeof profile.nickname === 'string' ? profile.nickname.trim() : '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  return {
    id: profile.id,
    name: nickname || fullName || firstName || 'Young Athlete',
    email: '',
    postcode: '',
    dateOfBirth: typeof profile.dateOfBirth === 'string' ? profile.dateOfBirth : '',
    avatar: typeof profile.photoUrl === 'string' ? profile.photoUrl : undefined,
    role: 'USER',
  };
}

class UserService {
  private async loadUsers(): Promise<User[]> {
    const [users, authUser, childProfiles] = await Promise.all([
      apiClient.get<User[]>(STORAGE_KEYS.USERS, []),
      apiClient.get<AuthUserRecord | null>(STORAGE_KEYS.AUTH_USER, null),
      apiClient.get<ChildProfileRecord[]>(STORAGE_KEYS.CHILDREN_PROFILES, []),
    ]);

    const usersById = new Map<string, User>();

    for (const user of users) {
      usersById.set(normalizeAccountId(user.id), user);
    }

    const mappedAuthUser = authUser ? mapAuthUserToUser(authUser) : null;
    if (mappedAuthUser) {
      const key = normalizeAccountId(mappedAuthUser.id);
      if (!usersById.has(key)) {
        usersById.set(key, mappedAuthUser);
      }
    }

    for (const childProfile of childProfiles) {
      const mappedChild = mapChildProfileToUser(childProfile);
      if (!mappedChild) continue;

      const key = normalizeAccountId(mappedChild.id);
      if (!usersById.has(key)) {
        usersById.set(key, mappedChild);
      }
    }

    return Array.from(usersById.values());
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

  async searchUsers(
    query: string,
    requestorId?: string,
  ): Promise<Result<User[], ServiceError>> {
    try {
      const normalizedQuery = query.trim().toLowerCase();
      const users = await this.loadUsers();

      let filtered: User[];
      if (!normalizedQuery) {
        filtered = users;
      } else {
        filtered = users.filter((user) => {
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
      }

      // SAFEGUARDING: Exclude minors from general search results.
      // Minors are only visible to their guardians and rostered coaches.
      const currentDate = new Date();
      const minors: User[] = [];
      const nonMinors: User[] = [];

      for (const user of filtered) {
        if (user.dateOfBirth && this.isUnder18(user.dateOfBirth, currentDate)) {
          minors.push(user);
        } else {
          nonMinors.push(user);
        }
      }

      let results: User[];

      if (minors.length === 0) {
        results = nonMinors;
      } else if (!requestorId) {
        // No requestor — exclude all minors
        logger.debug('Minors excluded from search results (no requestor)', {
          excludedCount: minors.length,
        });
        results = nonMinors;
      } else {
        // Check which minors the requestor can access
        const accessibleMinorIds = await this.batchCheckMinorAccess(
          minors.map((m) => m.id),
          requestorId,
        );
        const accessibleSet = new Set(accessibleMinorIds);
        const accessibleMinors = minors.filter((m) => accessibleSet.has(m.id));

        const excludedCount = minors.length - accessibleMinors.length;
        if (excludedCount > 0) {
          logger.debug('Minors excluded from search results', {
            requestorId,
            excludedCount,
          });
        }

        results = [...nonMinors, ...accessibleMinors];
      }

      // Filter out blocked users
      if (requestorId) {
        const blockedResult = await blockService.getBlockedUsers(requestorId);
        if (blockedResult.success && blockedResult.data.length > 0) {
          const blockedSet = new Set(blockedResult.data);
          results = results.filter((u) => !blockedSet.has(u.id));
        }
      }

      return ok(results);
    } catch (error) {
      logger.error('Failed to search users', { query, error });
      return err(storageError('Failed to search users'));
    }
  }

  private isUnder18(dateOfBirth: string, currentDate: Date): boolean {
    const parts = dateOfBirth.split('-');
    if (parts.length !== 3) return false;
    const dob = new Date(
      Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)),
    );
    if (isNaN(dob.getTime())) return false;
    let age = currentDate.getFullYear() - dob.getUTCFullYear();
    const monthDiff = currentDate.getMonth() - dob.getUTCMonth();
    if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < dob.getUTCDate())) {
      age--;
    }
    return age < 18;
  }

  private async batchCheckMinorAccess(
    minorIds: string[],
    requestorId: string,
  ): Promise<string[]> {
    const accessibleIds: string[] = [];

    // Load family members once
    const familyMembers = await apiClient.get<{ id: string }[]>(
      STORAGE_KEYS.FAMILY_MEMBERS,
      [],
    );
    const familyChildIds = new Set(familyMembers.map((m) => m.id));

    // Load roster once
    const roster = await apiClient.get<{ athleteId: string }[]>(STORAGE_KEYS.ROSTER, []);
    const rosterChildIds = new Set(roster.map((a) => a.athleteId));

    for (const minorId of minorIds) {
      if (familyChildIds.has(minorId) || rosterChildIds.has(minorId)) {
        accessibleIds.push(minorId);
      }
    }

    return accessibleIds;
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
