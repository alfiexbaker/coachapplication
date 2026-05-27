/**
 * Favourite Service
 *
 * Manages user favourites for coaches, enabling quick access to saved coaches
 * and easy re-booking functionality.
 *
 * Key Features:
 * - Add/remove favourite coaches
 * - Query favourite coaches for a user
 * - Check favourite status for UI state
 * - Toggle favourite with optimistic UI support
 *
 * Mock storage: AsyncStorage
 * API authority:
 * - GET /v1/me/favourite-coaches
 * - GET /v1/me/favourite-coaches/:coachId
 * - POST /v1/me/favourite-coaches/:coachId
 * - DELETE /v1/me/favourite-coaches/:coachId
 */

import { apiClient, apiFetch } from './api-client';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
} from '@/services/api-auth-context';
import type { FavouriteCoach, SportCategory } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { emitTyped, ServiceEvents } from './event-bus';
import { type Result, type ServiceError, ok, err, storageError, notFound } from '@/types/result';

import { STORAGE_KEYS } from '@/constants/storage-keys';

const logger = createLogger('FavouriteService');

// Mock data for development - some pre-existing favourites
const MOCK_FAVOURITES: FavouriteCoach[] = [
  {
    id: 'fav_1',
    userId: 'parent1',
    coachId: 'coach1',
    isFavourite: true,
    createdAt: '2025-12-01T10:00:00Z',
  },
  {
    id: 'fav_2',
    userId: 'parent1',
    coachId: 'coach3',
    isFavourite: true,
    createdAt: '2025-12-05T14:30:00Z',
  },
  {
    id: 'fav_3',
    userId: 'user1',
    coachId: 'coach2',
    isFavourite: true,
    createdAt: '2025-12-10T09:00:00Z',
  },
];

function getRelativeIso(daysAgo: number, hour = 12, minute = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

for (const [index, favourite] of MOCK_FAVOURITES.entries()) {
  favourite.createdAt = getRelativeIso(14 - index * 3, 9 + index, 0);
}

let favouritesCache: FavouriteCoach[] = [...MOCK_FAVOURITES];
let favouritesCacheTimestamp = 0;
const FAVOURITES_CACHE_TTL_MS = 30_000;

function invalidateFavouritesCache(): void {
  favouritesCache = [];
  favouritesCacheTimestamp = 0;
}

function hasFreshFavouritesCache(): boolean {
  return favouritesCacheTimestamp > 0 && Date.now() - favouritesCacheTimestamp < FAVOURITES_CACHE_TTL_MS;
}

async function loadFavourites(): Promise<FavouriteCoach[]> {
  if (hasFreshFavouritesCache()) {
    return favouritesCache;
  }
  try {
    const stored = await apiClient.get<FavouriteCoach[] | null>(STORAGE_KEYS.FAVOURITES, null);
    if (stored) {
      favouritesCache = stored;
      favouritesCacheTimestamp = Date.now();
      return stored;
    }
  } catch (error) {
    logger.error('Failed to load favourites', error);
  }
  favouritesCache = [...MOCK_FAVOURITES];
  favouritesCacheTimestamp = Date.now();
  return favouritesCache;
}

async function saveFavourites(favourites: FavouriteCoach[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.FAVOURITES, favourites);
    favouritesCache = favourites;
    favouritesCacheTimestamp = Date.now();
  } catch (error) {
    logger.error('Failed to save favourites', error);
    invalidateFavouritesCache();
  }
}

export interface AddFavouriteInput {
  userId: string;
  coachId: string;
  coachName: string;
  coachAvatar?: string;
  coachSport?: SportCategory;
  coachRating?: number;
  coachPriceMin?: number;
  coachPriceMax?: number;
  coachCity?: string;
  note?: string;
}

interface ApiFavouriteResponse {
  favourite: FavouriteCoach;
  isFavourite: boolean;
  requestId: string;
}

interface ApiFavouriteStatusResponse {
  coachId: string;
  isFavourite: boolean;
  favourite: FavouriteCoach | null;
  requestId: string;
}

interface ApiFavouriteListResponse {
  favourites: FavouriteCoach[];
  total: number;
  seedVersion?: string | null;
  requestId: string;
}

async function resolveFavouriteHeaders(): Promise<Result<Record<string, string>, ServiceError>> {
  const currentUserResult = await resolveSignedInApiUser('Sign in to manage saved coaches.');
  if (!currentUserResult.success) {
    return currentUserResult;
  }

  return ok(
    buildApiAuthHeaders({
      actingRole: deriveApiActingRole(currentUserResult.data, 'parent'),
    }),
  );
}

function normalizeApiFavourite(favourite: FavouriteCoach): FavouriteCoach {
  return {
    ...favourite,
    isFavourite: favourite.isFavourite !== false,
  };
}

export const favouriteService = {
  async isUsingDemoSeed(userId: string): Promise<boolean> {
    if (!apiClient.isMockMode) return false;

    const stored = await apiClient.get<FavouriteCoach[] | null>(STORAGE_KEYS.FAVOURITES, null);
    if (stored && stored.length > 0) return false;
    const favourites = await loadFavourites();
    return favourites.some((f) => f.userId === userId && f.id.startsWith('fav_'));
  },
  /**
   * Add a coach to user's favourites
   * Returns the new favourite if created, or existing favourite if already exists
   */
  async addFavourite(input: AddFavouriteInput): Promise<Result<FavouriteCoach, ServiceError>> {
    if (!apiClient.isMockMode) {
      const headersResult = await resolveFavouriteHeaders();
      if (!headersResult.success) return headersResult;

      const result = await apiFetch<ApiFavouriteResponse>(
        `/v1/me/favourite-coaches/${encodeURIComponent(input.coachId)}`,
        {
          method: 'POST',
          headers: {
            ...headersResult.data,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...(input.note ? { note: input.note } : {}),
          }),
        },
      );
      if (!result.success) {
        logger.error('Failed to add favourite via API', { input, error: result.error });
        return err(result.error);
      }

      const favourite = normalizeApiFavourite(result.data.favourite);
      emitTyped(ServiceEvents.FAVOURITE_ADDED, {
        userId: favourite.userId,
        coachId: favourite.coachId,
        favouriteId: favourite.id,
      });
      return ok(favourite);
    }

    try {
      favouritesCache = await loadFavourites();

      // Check if already favourited
      const existing = favouritesCache.find(
        (f) => f.userId === input.userId && f.coachId === input.coachId && f.isFavourite,
      );

      if (existing) {
        logger.debug('Already favourited', { coachId: input.coachId });
        return ok(existing);
      }

      const softDeleted = favouritesCache.find(
        (f) => f.userId === input.userId && f.coachId === input.coachId && !f.isFavourite,
      );

      if (softDeleted) {
        softDeleted.isFavourite = true;
        softDeleted.updatedAt = new Date().toISOString();
        if (input.note) {
          softDeleted.note = input.note;
        }

        await saveFavourites(favouritesCache);
        logger.debug('Restored favourite', { id: softDeleted.id });
        emitTyped(ServiceEvents.FAVOURITE_ADDED, {
          userId: softDeleted.userId,
          coachId: softDeleted.coachId,
          favouriteId: softDeleted.id,
        });
        return ok(softDeleted);
      }

      const newFavourite: FavouriteCoach = {
        id: `fav_${Date.now()}`,
        userId: input.userId,
        coachId: input.coachId,
        isFavourite: true,
        createdAt: new Date().toISOString(),
        note: input.note,
      };

      favouritesCache.push(newFavourite);
      await saveFavourites(favouritesCache);

      logger.debug('Created favourite', { id: newFavourite.id });
      emitTyped(ServiceEvents.FAVOURITE_ADDED, {
        userId: newFavourite.userId,
        coachId: newFavourite.coachId,
        favouriteId: newFavourite.id,
      });
      return ok(newFavourite);
    } catch (error) {
      logger.error('Failed to add favourite', { input, error });
      return err(storageError('Failed to add favourite'));
    }
  },

  /**
   * Remove a coach from user's favourites (soft delete)
   */
  async removeFavourite(userId: string, coachId: string): Promise<Result<void, ServiceError>> {
    if (!apiClient.isMockMode) {
      const headersResult = await resolveFavouriteHeaders();
      if (!headersResult.success) return headersResult;

      const result = await apiFetch<ApiFavouriteResponse>(
        `/v1/me/favourite-coaches/${encodeURIComponent(coachId)}`,
        {
          method: 'DELETE',
          headers: headersResult.data,
        },
      );
      if (!result.success) {
        logger.error('Failed to remove favourite via API', { userId, coachId, error: result.error });
        return err(result.error);
      }

      const favourite = normalizeApiFavourite(result.data.favourite);
      emitTyped(ServiceEvents.FAVOURITE_REMOVED, {
        userId: favourite.userId,
        coachId: favourite.coachId,
        favouriteId: favourite.id,
      });
      return ok(undefined);
    }

    try {
      favouritesCache = await loadFavourites();

      const favourite = favouritesCache.find(
        (f) => f.userId === userId && f.coachId === coachId && f.isFavourite,
      );

      if (!favourite) {
        logger.debug('Not favourited', { coachId });
        return err(notFound('Favourite'));
      }

      favourite.isFavourite = false;
      favourite.updatedAt = new Date().toISOString();

      await saveFavourites(favouritesCache);
      logger.debug('Removed favourite', { id: favourite.id });
      emitTyped(ServiceEvents.FAVOURITE_REMOVED, {
        userId: favourite.userId,
        coachId: favourite.coachId,
        favouriteId: favourite.id,
      });
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to remove favourite', { userId, coachId, error });
      return err(storageError('Failed to remove favourite'));
    }
  },

  /**
   * Get all favourited coaches for a user
   */
  async getFavourites(userId: string): Promise<Result<FavouriteCoach[], ServiceError>> {
    if (!apiClient.isMockMode) {
      const headersResult = await resolveFavouriteHeaders();
      if (!headersResult.success) return headersResult;

      const result = await apiFetch<ApiFavouriteListResponse>('/v1/me/favourite-coaches', {
        method: 'GET',
        headers: headersResult.data,
      });
      if (!result.success) {
        logger.error('Failed to get favourites via API', { userId, error: result.error });
        return err(result.error);
      }

      return ok(
        result.data.favourites
          .map(normalizeApiFavourite)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      );
    }

    try {
      favouritesCache = await loadFavourites();
      return ok(
        favouritesCache
          .filter((f) => f.userId === userId && f.isFavourite)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      );
    } catch (error) {
      logger.error('Failed to get favourites', { userId, error });
      return err(storageError('Failed to load favourites'));
    }
  },

  /**
   * Check if a user has favourited a specific coach
   */
  async isFavourite(userId: string, coachId: string): Promise<Result<boolean, ServiceError>> {
    if (!apiClient.isMockMode) {
      const headersResult = await resolveFavouriteHeaders();
      if (!headersResult.success) return headersResult;

      const result = await apiFetch<ApiFavouriteStatusResponse>(
        `/v1/me/favourite-coaches/${encodeURIComponent(coachId)}`,
        {
          method: 'GET',
          headers: headersResult.data,
        },
      );
      if (!result.success) {
        logger.error('Failed to check favourite status via API', { userId, coachId, error: result.error });
        return err(result.error);
      }

      return ok(result.data.isFavourite);
    }

    try {
      favouritesCache = await loadFavourites();
      return ok(
        favouritesCache.some((f) => f.userId === userId && f.coachId === coachId && f.isFavourite),
      );
    } catch (error) {
      logger.error('Failed to check favourite status', { userId, coachId, error });
      return err(storageError('Failed to check favourite status'));
    }
  },

  /**
   * Toggle favourite status for a coach
   * Returns the updated favourite status (true = favourited, false = removed)
   */
  async toggleFavourite(
    input: AddFavouriteInput,
  ): Promise<Result<{ isFavourite: boolean; favourite: FavouriteCoach | null }, ServiceError>> {
    const currentlyFavouritedResult = await this.isFavourite(input.userId, input.coachId);
    if (!currentlyFavouritedResult.success) {
      return currentlyFavouritedResult;
    }

    if (currentlyFavouritedResult.data) {
      const removeResult = await this.removeFavourite(input.userId, input.coachId);
      if (!removeResult.success && removeResult.error.code !== 'NOT_FOUND') {
        return removeResult;
      }
      return ok({ isFavourite: false, favourite: null });
    }

    const favouriteResult = await this.addFavourite(input);
    if (!favouriteResult.success) {
      return favouriteResult;
    }
    return ok({ isFavourite: true, favourite: favouriteResult.data });
  },

  /**
   * Get favourite count for a user
   */
  async getFavouriteCount(userId: string): Promise<Result<number, ServiceError>> {
    const favouritesResult = await this.getFavourites(userId);
    if (!favouritesResult.success) {
      return favouritesResult;
    }
    return ok(favouritesResult.data.length);
  },

  /**
   * Get favourite by ID
   */
  async getFavouriteById(
    favouriteId: string,
  ): Promise<Result<FavouriteCoach | null, ServiceError>> {
    if (!apiClient.isMockMode) {
      const favouritesResult = await this.getFavourites('');
      if (!favouritesResult.success) {
        return favouritesResult;
      }
      return ok(favouritesResult.data.find((f) => f.id === favouriteId) ?? null);
    }

    try {
      favouritesCache = await loadFavourites();
      return ok(favouritesCache.find((f) => f.id === favouriteId && f.isFavourite) || null);
    } catch (error) {
      logger.error('Failed to get favourite by id', { favouriteId, error });
      return err(storageError('Failed to load favourite'));
    }
  },

  /**
   * Update favourite note
   */
  async updateNote(
    userId: string,
    coachId: string,
    note: string,
  ): Promise<Result<FavouriteCoach | null, ServiceError>> {
    if (!apiClient.isMockMode) {
      const headersResult = await resolveFavouriteHeaders();
      if (!headersResult.success) return headersResult;

      const result = await apiFetch<ApiFavouriteResponse>(
        `/v1/me/favourite-coaches/${encodeURIComponent(coachId)}`,
        {
          method: 'POST',
          headers: {
            ...headersResult.data,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ note }),
        },
      );
      if (!result.success) {
        if (result.error.code === 'NOT_FOUND') {
          return ok(null);
        }
        logger.error('Failed to update favourite note via API', {
          userId,
          coachId,
          error: result.error,
        });
        return err(result.error);
      }

      return ok(normalizeApiFavourite(result.data.favourite));
    }

    try {
      favouritesCache = await loadFavourites();

      const favourite = favouritesCache.find(
        (f) => f.userId === userId && f.coachId === coachId && f.isFavourite,
      );

      if (!favourite) {
        return ok(null);
      }

      favourite.note = note;
      favourite.updatedAt = new Date().toISOString();

      await saveFavourites(favouritesCache);
      return ok(favourite);
    } catch (error) {
      logger.error('Failed to update favourite note', { userId, coachId, error });
      return err(storageError('Failed to update note'));
    }
  },

  /**
   * Get IDs of all favourited coaches for a user
   * Useful for filtering or highlighting favourites in lists
   */
  async getFavouriteCoachIds(userId: string): Promise<Result<string[], ServiceError>> {
    const favouritesResult = await this.getFavourites(userId);
    if (!favouritesResult.success) {
      return favouritesResult;
    }
    return ok(favouritesResult.data.map((f) => f.coachId));
  },

  /**
   * Reset to mock data (for testing)
   */
  async resetToMockData(): Promise<Result<void, ServiceError>> {
    if (!apiClient.isMockMode) {
      return err(storageError('Favourite mock reset is only available in mock mode'));
    }

    try {
      favouritesCache = [...MOCK_FAVOURITES];
      await saveFavourites(favouritesCache);
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to reset favourites', error);
      return err(storageError('Failed to reset favourites'));
    }
  },

  /**
   * Clear all favourites (for testing)
   */
  async clearAll(): Promise<Result<void, ServiceError>> {
    if (!apiClient.isMockMode) {
      return err(storageError('Favourite mock clearing is only available in mock mode'));
    }

    try {
      favouritesCache = [];
      await saveFavourites(favouritesCache);
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to clear favourites', error);
      return err(storageError('Failed to clear favourites'));
    }
  },

  async dismissDemoFavourites(): Promise<Result<void, ServiceError>> {
    if (!apiClient.isMockMode) {
      return ok(undefined);
    }

    try {
      favouritesCache = [];
      await apiClient.set(STORAGE_KEYS.FAVOURITES, []);
      invalidateFavouritesCache();
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to dismiss demo favourites', error);
      return err(storageError('Failed to dismiss demo favourites'));
    }
  },
};
