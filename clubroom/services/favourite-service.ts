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

import { STORAGE_KEYS } from '@/constants/storage-keys';

const logger = createLogger('FavouriteService');

// Mock data for development - some pre-existing favourites
const MOCK_FAVOURITES: FavouriteCoach[] = [
  {
    id: 'fav_1',
    userId: 'parent1',
    coachId: 'coach1',
    coachName: 'Sarah Mitchell',
    coachAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    coachSport: 'Football',
    coachRating: 4.9,
    coachPriceMin: 45,
    coachPriceMax: 75,
    coachCity: 'London',
    isFavourite: true,
    createdAt: '2025-12-01T10:00:00Z',
  },
  {
    id: 'fav_2',
    userId: 'parent1',
    coachId: 'coach3',
    coachName: 'James Rodriguez',
    coachAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    coachSport: 'Football',
    coachRating: 4.7,
    coachPriceMin: 40,
    coachPriceMax: 60,
    coachCity: 'Manchester',
    isFavourite: true,
    createdAt: '2025-12-05T14:30:00Z',
  },
  {
    id: 'fav_3',
    userId: 'user1',
    coachId: 'coach2',
    coachName: 'Mike Thompson',
    coachAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    coachSport: 'Football',
    coachRating: 4.8,
    coachPriceMin: 50,
    coachPriceMax: 80,
    coachCity: 'Birmingham',
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
  async addFavourite(input: AddFavouriteInput): Promise<FavouriteCoach> {
    favouritesCache = await loadFavourites();

    // Check if already favourited
    const existing = favouritesCache.find(
      (f) => f.userId === input.userId && f.coachId === input.coachId && f.isFavourite
    );

    if (existing) {
      logger.debug('Already favourited', { coachId: input.coachId });
      return existing;
    }

    // Check for soft-deleted favourite to restore
    const softDeleted = favouritesCache.find(
      (f) => f.userId === input.userId && f.coachId === input.coachId && !f.isFavourite
    );

    if (softDeleted) {
      // Restore the soft-deleted favourite
      softDeleted.isFavourite = true;
      softDeleted.updatedAt = new Date().toISOString();
      softDeleted.coachName = input.coachName;
      softDeleted.coachAvatar = input.coachAvatar;
      softDeleted.coachSport = input.coachSport;
      softDeleted.coachRating = input.coachRating;
      softDeleted.coachPriceMin = input.coachPriceMin;
      softDeleted.coachPriceMax = input.coachPriceMax;
      softDeleted.coachCity = input.coachCity;
      if (input.note) {
        softDeleted.note = input.note;
      }

      await saveFavourites(favouritesCache);
      logger.debug('Restored favourite', { id: softDeleted.id });
      return softDeleted;
    }

    const newFavourite: FavouriteCoach = {
      id: `fav_${Date.now()}`,
      userId: input.userId,
      coachId: input.coachId,
      coachName: input.coachName,
      coachAvatar: input.coachAvatar,
      coachSport: input.coachSport,
      coachRating: input.coachRating,
      coachPriceMin: input.coachPriceMin,
      coachPriceMax: input.coachPriceMax,
      coachCity: input.coachCity,
      isFavourite: true,
      createdAt: new Date().toISOString(),
      note: input.note,
    };

    favouritesCache.push(newFavourite);
    await saveFavourites(favouritesCache);

    logger.debug('Created favourite', { id: newFavourite.id });
    return newFavourite;
  },

  /**
   * Remove a coach from user's favourites (soft delete)
   */
  async removeFavourite(userId: string, coachId: string): Promise<void> {
    favouritesCache = await loadFavourites();

    const favourite = favouritesCache.find(
      (f) => f.userId === userId && f.coachId === coachId && f.isFavourite
    );

    if (!favourite) {
      logger.debug('Not favourited', { coachId });
      return;
    }

    // Soft delete - mark as not favourite
    favourite.isFavourite = false;
    favourite.updatedAt = new Date().toISOString();

    await saveFavourites(favouritesCache);
    logger.debug('Removed favourite', { id: favourite.id });
  },

  /**
   * Get all favourited coaches for a user
   */
  async getFavourites(userId: string): Promise<FavouriteCoach[]> {
    favouritesCache = await loadFavourites();
    return favouritesCache
      .filter((f) => f.userId === userId && f.isFavourite)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /**
   * Check if a user has favourited a specific coach
   */
  async isFavourite(userId: string, coachId: string): Promise<boolean> {
    favouritesCache = await loadFavourites();
    return favouritesCache.some(
      (f) => f.userId === userId && f.coachId === coachId && f.isFavourite
    );
  },

  /**
   * Toggle favourite status for a coach
   * Returns the updated favourite status (true = favourited, false = removed)
   */
  async toggleFavourite(input: AddFavouriteInput): Promise<{ isFavourite: boolean; favourite: FavouriteCoach | null }> {
    const currentlyFavourited = await this.isFavourite(input.userId, input.coachId);

    if (currentlyFavourited) {
      await this.removeFavourite(input.userId, input.coachId);
      return { isFavourite: false, favourite: null };
    } else {
      const favourite = await this.addFavourite(input);
      return { isFavourite: true, favourite };
    }
  },

  /**
   * Get favourite count for a user
   */
  async getFavouriteCount(userId: string): Promise<number> {
    const favourites = await this.getFavourites(userId);
    return favourites.length;
  },

  /**
   * Get favourite by ID
   */
  async getFavouriteById(favouriteId: string): Promise<FavouriteCoach | null> {
    favouritesCache = await loadFavourites();
    return favouritesCache.find((f) => f.id === favouriteId && f.isFavourite) || null;
  },

  /**
   * Update favourite note
   */
  async updateNote(userId: string, coachId: string, note: string): Promise<FavouriteCoach | null> {
    favouritesCache = await loadFavourites();

    const favourite = favouritesCache.find(
      (f) => f.userId === userId && f.coachId === coachId && f.isFavourite
    );

    if (!favourite) {
      return null;
    }

    favourite.note = note;
    favourite.updatedAt = new Date().toISOString();

    await saveFavourites(favouritesCache);
    return favourite;
  },

  /**
   * Get IDs of all favourited coaches for a user
   * Useful for filtering or highlighting favourites in lists
   */
  async getFavouriteCoachIds(userId: string): Promise<string[]> {
    const favourites = await this.getFavourites(userId);
    return favourites.map((f) => f.coachId);
  },

  /**
   * Reset to mock data (for testing)
   */
  async resetToMockData(): Promise<void> {
    favouritesCache = [...MOCK_FAVOURITES];
    await saveFavourites(favouritesCache);
  },

  /**
   * Clear all favourites (for testing)
   */
  async clearAll(): Promise<void> {
    favouritesCache = [];
    await saveFavourites(favouritesCache);
  },
};
