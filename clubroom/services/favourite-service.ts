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
 * Storage: AsyncStorage (mock data for development)
 * API Integration Notes:
 * - POST /api/favourites - Create favourite
 * - DELETE /api/favourites/:id - Remove favourite
 * - GET /api/favourites?userId=X - Get user's favourites
 * - GET /api/favourites/check?userId=X&coachId=Y - Check if favourited
 */

import { apiClient } from './api-client';
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

let favouritesCache: FavouriteCoach[] = [...MOCK_FAVOURITES];

async function loadFavourites(): Promise<FavouriteCoach[]> {
  try {
    const stored = await apiClient.get<FavouriteCoach[] | null>(STORAGE_KEYS.FAVOURITES, null);
    if (stored) {
      return stored;
    }
  } catch (error) {
    logger.error('Failed to load favourites', error);
  }
  return [...MOCK_FAVOURITES];
}

async function saveFavourites(favourites: FavouriteCoach[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.FAVOURITES, favourites);
  } catch (error) {
    logger.error('Failed to save favourites', error);
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

export const favouriteService = {
  /**
   * Add a coach to user's favourites
   * Returns the new favourite if created, or existing favourite if already exists
   */
  async addFavourite(input: AddFavouriteInput): Promise<Result<FavouriteCoach, ServiceError>> {
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
    try {
      favouritesCache = [];
      await saveFavourites(favouritesCache);
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to clear favourites', error);
      return err(storageError('Failed to clear favourites'));
    }
  },
};
