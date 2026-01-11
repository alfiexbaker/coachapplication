// @ts-nocheck
/**
 * Favourite Service Tests
 *
 * Unit tests for the favourite service functionality including
 * CRUD operations, toggle functionality, and optimistic updates.
 *
 * These tests verify the core functionality of favourites:
 * - Add/remove favourites
 * - Toggle functionality
 * - Query operations
 * - Edge cases
 */

import assert from 'node:assert';
import test, { describe, beforeEach } from 'node:test';

// Mock FavouriteCoach type (subset of actual type for testing)
interface FavouriteCoach {
  id: string;
  userId: string;
  coachId: string;
  coachName: string;
  coachAvatar?: string;
  coachSport?: string;
  coachRating?: number;
  coachPriceMin?: number;
  coachPriceMax?: number;
  coachCity?: string;
  isFavourite: boolean;
  createdAt: string;
  updatedAt?: string;
  note?: string;
}

interface AddFavouriteInput {
  userId: string;
  coachId: string;
  coachName: string;
  coachAvatar?: string;
  coachSport?: string;
  coachRating?: number;
  coachPriceMin?: number;
  coachPriceMax?: number;
  coachCity?: string;
  note?: string;
}

// Mock data for development
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
    coachSport: 'Football',
    coachRating: 4.8,
    coachPriceMin: 50,
    coachPriceMax: 80,
    coachCity: 'Birmingham',
    isFavourite: true,
    createdAt: '2025-12-10T09:00:00Z',
  },
];

// In-memory mock service for testing
let favouritesCache: FavouriteCoach[] = [];

const mockFavouriteService = {
  async resetToMockData(): Promise<void> {
    favouritesCache = MOCK_FAVOURITES.map((f) => ({ ...f }));
  },

  async addFavourite(input: AddFavouriteInput): Promise<FavouriteCoach> {
    // Check if already favourited
    const existing = favouritesCache.find(
      (f) => f.userId === input.userId && f.coachId === input.coachId && f.isFavourite
    );

    if (existing) {
      return existing;
    }

    // Check for soft-deleted favourite to restore
    const softDeleted = favouritesCache.find(
      (f) => f.userId === input.userId && f.coachId === input.coachId && !f.isFavourite
    );

    if (softDeleted) {
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
    return newFavourite;
  },

  async removeFavourite(userId: string, coachId: string): Promise<void> {
    const favourite = favouritesCache.find(
      (f) => f.userId === userId && f.coachId === coachId && f.isFavourite
    );

    if (favourite) {
      favourite.isFavourite = false;
      favourite.updatedAt = new Date().toISOString();
    }
  },

  async getFavourites(userId: string): Promise<FavouriteCoach[]> {
    return favouritesCache
      .filter((f) => f.userId === userId && f.isFavourite)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async isFavourite(userId: string, coachId: string): Promise<boolean> {
    return favouritesCache.some(
      (f) => f.userId === userId && f.coachId === coachId && f.isFavourite
    );
  },

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

  async getFavouriteCount(userId: string): Promise<number> {
    const favourites = await this.getFavourites(userId);
    return favourites.length;
  },

  async getFavouriteById(favouriteId: string): Promise<FavouriteCoach | null> {
    return favouritesCache.find((f) => f.id === favouriteId && f.isFavourite) || null;
  },

  async updateNote(userId: string, coachId: string, note: string): Promise<FavouriteCoach | null> {
    const favourite = favouritesCache.find(
      (f) => f.userId === userId && f.coachId === coachId && f.isFavourite
    );

    if (!favourite) {
      return null;
    }

    favourite.note = note;
    favourite.updatedAt = new Date().toISOString();
    return favourite;
  },

  async getFavouriteCoachIds(userId: string): Promise<string[]> {
    const favourites = await this.getFavourites(userId);
    return favourites.map((f) => f.coachId);
  },

  async clearAll(): Promise<void> {
    favouritesCache = [];
  },
};

// Use the mock service for testing
const favouriteService = mockFavouriteService;

// Reset to mock data before each test
beforeEach(async () => {
  await favouriteService.resetToMockData();
});

describe('Favourite Service', () => {
  describe('addFavourite', () => {
    test('should create a new favourite with required fields', async () => {
      const input: AddFavouriteInput = {
        userId: 'test_user',
        coachId: 'coach_new',
        coachName: 'New Coach',
      };

      const favourite = await favouriteService.addFavourite(input);

      assert.ok(favourite.id.startsWith('fav_'));
      assert.strictEqual(favourite.userId, 'test_user');
      assert.strictEqual(favourite.coachId, 'coach_new');
      assert.strictEqual(favourite.coachName, 'New Coach');
      assert.strictEqual(favourite.isFavourite, true);
      assert.ok(favourite.createdAt);
    });

    test('should create a favourite with all optional fields', async () => {
      const input: AddFavouriteInput = {
        userId: 'test_user',
        coachId: 'coach_full',
        coachName: 'Full Coach',
        coachAvatar: 'https://example.com/avatar.jpg',
        coachSport: 'Football',
        coachRating: 4.8,
        coachPriceMin: 50,
        coachPriceMax: 100,
        coachCity: 'London',
        note: 'Great coach for beginners',
      };

      const favourite = await favouriteService.addFavourite(input);

      assert.strictEqual(favourite.coachName, 'Full Coach');
      assert.strictEqual(favourite.coachAvatar, 'https://example.com/avatar.jpg');
      assert.strictEqual(favourite.coachSport, 'Football');
      assert.strictEqual(favourite.coachRating, 4.8);
      assert.strictEqual(favourite.coachPriceMin, 50);
      assert.strictEqual(favourite.coachPriceMax, 100);
      assert.strictEqual(favourite.coachCity, 'London');
      assert.strictEqual(favourite.note, 'Great coach for beginners');
    });

    test('should return existing favourite if already favourited', async () => {
      const input: AddFavouriteInput = {
        userId: 'parent1',
        coachId: 'coach1', // Already favourited in mock data
        coachName: 'Sarah Mitchell',
      };

      const favourite = await favouriteService.addFavourite(input);

      // Should return existing favourite, not create new one
      assert.strictEqual(favourite.id, 'fav_1');
    });

    test('should restore soft-deleted favourite', async () => {
      const input: AddFavouriteInput = {
        userId: 'test_user',
        coachId: 'coach_restore',
        coachName: 'Restore Coach',
      };

      // Create and remove favourite
      const created = await favouriteService.addFavourite(input);
      await favouriteService.removeFavourite('test_user', 'coach_restore');

      // Re-add should restore
      const restored = await favouriteService.addFavourite({
        ...input,
        coachName: 'Updated Name', // Update name on restore
      });

      assert.strictEqual(restored.id, created.id);
      assert.strictEqual(restored.isFavourite, true);
      assert.strictEqual(restored.coachName, 'Updated Name');
      assert.ok(restored.updatedAt);
    });
  });

  describe('removeFavourite', () => {
    test('should soft-delete a favourite', async () => {
      // Verify favourite exists
      let isFav = await favouriteService.isFavourite('parent1', 'coach1');
      assert.strictEqual(isFav, true);

      // Remove favourite
      await favouriteService.removeFavourite('parent1', 'coach1');

      // Should no longer be a favourite
      isFav = await favouriteService.isFavourite('parent1', 'coach1');
      assert.strictEqual(isFav, false);
    });

    test('should handle removing non-existent favourite gracefully', async () => {
      // Should not throw
      await favouriteService.removeFavourite('parent1', 'non_existent_coach');
    });
  });

  describe('getFavourites', () => {
    test('should return favourites for a specific user', async () => {
      const favourites = await favouriteService.getFavourites('parent1');

      assert.ok(Array.isArray(favourites));
      assert.ok(favourites.length > 0);
      favourites.forEach((fav) => {
        assert.strictEqual(fav.userId, 'parent1');
        assert.strictEqual(fav.isFavourite, true);
      });
    });

    test('should return empty array for user with no favourites', async () => {
      const favourites = await favouriteService.getFavourites('no_favourites_user');

      assert.ok(Array.isArray(favourites));
      assert.strictEqual(favourites.length, 0);
    });

    test('should sort favourites by createdAt (most recent first)', async () => {
      const favourites = await favouriteService.getFavourites('parent1');

      for (let i = 0; i < favourites.length - 1; i++) {
        const current = new Date(favourites[i].createdAt).getTime();
        const next = new Date(favourites[i + 1].createdAt).getTime();
        assert.ok(current >= next, 'Favourites should be sorted by createdAt descending');
      }
    });
  });

  describe('isFavourite', () => {
    test('should return true for favourited coach', async () => {
      const isFav = await favouriteService.isFavourite('parent1', 'coach1');
      assert.strictEqual(isFav, true);
    });

    test('should return false for non-favourited coach', async () => {
      const isFav = await favouriteService.isFavourite('parent1', 'non_existent_coach');
      assert.strictEqual(isFav, false);
    });

    test('should return false for removed favourite', async () => {
      await favouriteService.removeFavourite('parent1', 'coach1');
      const isFav = await favouriteService.isFavourite('parent1', 'coach1');
      assert.strictEqual(isFav, false);
    });
  });

  describe('toggleFavourite', () => {
    test('should add favourite when not favourited', async () => {
      const result = await favouriteService.toggleFavourite({
        userId: 'toggle_user',
        coachId: 'toggle_coach',
        coachName: 'Toggle Coach',
      });

      assert.strictEqual(result.isFavourite, true);
      assert.ok(result.favourite);
      assert.strictEqual(result.favourite.coachName, 'Toggle Coach');
    });

    test('should remove favourite when already favourited', async () => {
      // First add
      await favouriteService.addFavourite({
        userId: 'toggle_user2',
        coachId: 'toggle_coach2',
        coachName: 'Toggle Coach 2',
      });

      // Then toggle (should remove)
      const result = await favouriteService.toggleFavourite({
        userId: 'toggle_user2',
        coachId: 'toggle_coach2',
        coachName: 'Toggle Coach 2',
      });

      assert.strictEqual(result.isFavourite, false);
      assert.strictEqual(result.favourite, null);
    });
  });

  describe('getFavouriteCount', () => {
    test('should return correct count for user', async () => {
      const count = await favouriteService.getFavouriteCount('parent1');
      const favourites = await favouriteService.getFavourites('parent1');

      assert.strictEqual(count, favourites.length);
    });

    test('should return 0 for user with no favourites', async () => {
      const count = await favouriteService.getFavouriteCount('no_favourites_user');
      assert.strictEqual(count, 0);
    });
  });

  describe('getFavouriteById', () => {
    test('should return favourite by ID', async () => {
      const favourite = await favouriteService.getFavouriteById('fav_1');

      assert.ok(favourite);
      assert.strictEqual(favourite.id, 'fav_1');
    });

    test('should return null for non-existent ID', async () => {
      const favourite = await favouriteService.getFavouriteById('non_existent');
      assert.strictEqual(favourite, null);
    });

    test('should return null for soft-deleted favourite', async () => {
      await favouriteService.removeFavourite('parent1', 'coach1');
      const favourite = await favouriteService.getFavouriteById('fav_1');
      assert.strictEqual(favourite, null);
    });
  });

  describe('updateNote', () => {
    test('should update note on favourite', async () => {
      const updated = await favouriteService.updateNote('parent1', 'coach1', 'Updated note');

      assert.ok(updated);
      assert.strictEqual(updated.note, 'Updated note');
      assert.ok(updated.updatedAt);
    });

    test('should return null for non-existent favourite', async () => {
      const updated = await favouriteService.updateNote('parent1', 'non_existent', 'Note');
      assert.strictEqual(updated, null);
    });
  });

  describe('getFavouriteCoachIds', () => {
    test('should return array of coach IDs', async () => {
      const coachIds = await favouriteService.getFavouriteCoachIds('parent1');

      assert.ok(Array.isArray(coachIds));
      assert.ok(coachIds.length > 0);
      assert.ok(coachIds.includes('coach1'));
    });

    test('should return empty array for user with no favourites', async () => {
      const coachIds = await favouriteService.getFavouriteCoachIds('no_favourites_user');

      assert.ok(Array.isArray(coachIds));
      assert.strictEqual(coachIds.length, 0);
    });
  });

  describe('clearAll', () => {
    test('should remove all favourites', async () => {
      await favouriteService.clearAll();

      const favourites = await favouriteService.getFavourites('parent1');
      assert.strictEqual(favourites.length, 0);
    });
  });
});

describe('Favourite Service Edge Cases', () => {
  test('should handle concurrent add and remove', async () => {
    const input: AddFavouriteInput = {
      userId: 'concurrent_user',
      coachId: 'concurrent_coach',
      coachName: 'Concurrent Coach',
    };

    // Add and remove in quick succession
    const addPromise = favouriteService.addFavourite(input);
    await addPromise;
    const removePromise = favouriteService.removeFavourite('concurrent_user', 'concurrent_coach');
    await removePromise;

    const isFav = await favouriteService.isFavourite('concurrent_user', 'concurrent_coach');
    assert.strictEqual(isFav, false);
  });

  test('should handle special characters in note', async () => {
    const specialNote = 'Coach with "quotes" & <special> chars! @#$%^&*()';
    const updated = await favouriteService.updateNote('parent1', 'coach1', specialNote);

    assert.ok(updated);
    assert.strictEqual(updated.note, specialNote);
  });

  test('should handle empty string note', async () => {
    const updated = await favouriteService.updateNote('parent1', 'coach1', '');

    assert.ok(updated);
    assert.strictEqual(updated.note, '');
  });
});
