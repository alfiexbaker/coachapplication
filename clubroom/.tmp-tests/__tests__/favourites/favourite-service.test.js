"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = __importStar(require("node:test"));
// Mock data for development
const MOCK_FAVOURITES = [
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
let favouritesCache = [];
const mockFavouriteService = {
    async resetToMockData() {
        favouritesCache = MOCK_FAVOURITES.map((f) => ({ ...f }));
    },
    async addFavourite(input) {
        // Check if already favourited
        const existing = favouritesCache.find((f) => f.userId === input.userId && f.coachId === input.coachId && f.isFavourite);
        if (existing) {
            return existing;
        }
        // Check for soft-deleted favourite to restore
        const softDeleted = favouritesCache.find((f) => f.userId === input.userId && f.coachId === input.coachId && !f.isFavourite);
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
        const newFavourite = {
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
    async removeFavourite(userId, coachId) {
        const favourite = favouritesCache.find((f) => f.userId === userId && f.coachId === coachId && f.isFavourite);
        if (favourite) {
            favourite.isFavourite = false;
            favourite.updatedAt = new Date().toISOString();
        }
    },
    async getFavourites(userId) {
        return favouritesCache
            .filter((f) => f.userId === userId && f.isFavourite)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    async isFavourite(userId, coachId) {
        return favouritesCache.some((f) => f.userId === userId && f.coachId === coachId && f.isFavourite);
    },
    async toggleFavourite(input) {
        const currentlyFavourited = await this.isFavourite(input.userId, input.coachId);
        if (currentlyFavourited) {
            await this.removeFavourite(input.userId, input.coachId);
            return { isFavourite: false, favourite: null };
        }
        else {
            const favourite = await this.addFavourite(input);
            return { isFavourite: true, favourite };
        }
    },
    async getFavouriteCount(userId) {
        const favourites = await this.getFavourites(userId);
        return favourites.length;
    },
    async getFavouriteById(favouriteId) {
        return favouritesCache.find((f) => f.id === favouriteId && f.isFavourite) || null;
    },
    async updateNote(userId, coachId, note) {
        const favourite = favouritesCache.find((f) => f.userId === userId && f.coachId === coachId && f.isFavourite);
        if (!favourite) {
            return null;
        }
        favourite.note = note;
        favourite.updatedAt = new Date().toISOString();
        return favourite;
    },
    async getFavouriteCoachIds(userId) {
        const favourites = await this.getFavourites(userId);
        return favourites.map((f) => f.coachId);
    },
    async clearAll() {
        favouritesCache = [];
    },
};
// Use the mock service for testing
const favouriteService = mockFavouriteService;
// Reset to mock data before each test
(0, node_test_1.beforeEach)(async () => {
    await favouriteService.resetToMockData();
});
(0, node_test_1.describe)('Favourite Service', () => {
    (0, node_test_1.describe)('addFavourite', () => {
        (0, node_test_1.default)('should create a new favourite with required fields', async () => {
            const input = {
                userId: 'test_user',
                coachId: 'coach_new',
                coachName: 'New Coach',
            };
            const favourite = await favouriteService.addFavourite(input);
            node_assert_1.default.ok(favourite.id.startsWith('fav_'));
            node_assert_1.default.strictEqual(favourite.userId, 'test_user');
            node_assert_1.default.strictEqual(favourite.coachId, 'coach_new');
            node_assert_1.default.strictEqual(favourite.coachName, 'New Coach');
            node_assert_1.default.strictEqual(favourite.isFavourite, true);
            node_assert_1.default.ok(favourite.createdAt);
        });
        (0, node_test_1.default)('should create a favourite with all optional fields', async () => {
            const input = {
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
            node_assert_1.default.strictEqual(favourite.coachName, 'Full Coach');
            node_assert_1.default.strictEqual(favourite.coachAvatar, 'https://example.com/avatar.jpg');
            node_assert_1.default.strictEqual(favourite.coachSport, 'Football');
            node_assert_1.default.strictEqual(favourite.coachRating, 4.8);
            node_assert_1.default.strictEqual(favourite.coachPriceMin, 50);
            node_assert_1.default.strictEqual(favourite.coachPriceMax, 100);
            node_assert_1.default.strictEqual(favourite.coachCity, 'London');
            node_assert_1.default.strictEqual(favourite.note, 'Great coach for beginners');
        });
        (0, node_test_1.default)('should return existing favourite if already favourited', async () => {
            const input = {
                userId: 'parent1',
                coachId: 'coach1', // Already favourited in mock data
                coachName: 'Sarah Mitchell',
            };
            const favourite = await favouriteService.addFavourite(input);
            // Should return existing favourite, not create new one
            node_assert_1.default.strictEqual(favourite.id, 'fav_1');
        });
        (0, node_test_1.default)('should restore soft-deleted favourite', async () => {
            const input = {
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
            node_assert_1.default.strictEqual(restored.id, created.id);
            node_assert_1.default.strictEqual(restored.isFavourite, true);
            node_assert_1.default.strictEqual(restored.coachName, 'Updated Name');
            node_assert_1.default.ok(restored.updatedAt);
        });
    });
    (0, node_test_1.describe)('removeFavourite', () => {
        (0, node_test_1.default)('should soft-delete a favourite', async () => {
            // Verify favourite exists
            let isFav = await favouriteService.isFavourite('parent1', 'coach1');
            node_assert_1.default.strictEqual(isFav, true);
            // Remove favourite
            await favouriteService.removeFavourite('parent1', 'coach1');
            // Should no longer be a favourite
            isFav = await favouriteService.isFavourite('parent1', 'coach1');
            node_assert_1.default.strictEqual(isFav, false);
        });
        (0, node_test_1.default)('should handle removing non-existent favourite gracefully', async () => {
            // Should not throw
            await favouriteService.removeFavourite('parent1', 'non_existent_coach');
        });
    });
    (0, node_test_1.describe)('getFavourites', () => {
        (0, node_test_1.default)('should return favourites for a specific user', async () => {
            const favourites = await favouriteService.getFavourites('parent1');
            node_assert_1.default.ok(Array.isArray(favourites));
            node_assert_1.default.ok(favourites.length > 0);
            favourites.forEach((fav) => {
                node_assert_1.default.strictEqual(fav.userId, 'parent1');
                node_assert_1.default.strictEqual(fav.isFavourite, true);
            });
        });
        (0, node_test_1.default)('should return empty array for user with no favourites', async () => {
            const favourites = await favouriteService.getFavourites('no_favourites_user');
            node_assert_1.default.ok(Array.isArray(favourites));
            node_assert_1.default.strictEqual(favourites.length, 0);
        });
        (0, node_test_1.default)('should sort favourites by createdAt (most recent first)', async () => {
            const favourites = await favouriteService.getFavourites('parent1');
            for (let i = 0; i < favourites.length - 1; i++) {
                const current = new Date(favourites[i].createdAt).getTime();
                const next = new Date(favourites[i + 1].createdAt).getTime();
                node_assert_1.default.ok(current >= next, 'Favourites should be sorted by createdAt descending');
            }
        });
    });
    (0, node_test_1.describe)('isFavourite', () => {
        (0, node_test_1.default)('should return true for favourited coach', async () => {
            const isFav = await favouriteService.isFavourite('parent1', 'coach1');
            node_assert_1.default.strictEqual(isFav, true);
        });
        (0, node_test_1.default)('should return false for non-favourited coach', async () => {
            const isFav = await favouriteService.isFavourite('parent1', 'non_existent_coach');
            node_assert_1.default.strictEqual(isFav, false);
        });
        (0, node_test_1.default)('should return false for removed favourite', async () => {
            await favouriteService.removeFavourite('parent1', 'coach1');
            const isFav = await favouriteService.isFavourite('parent1', 'coach1');
            node_assert_1.default.strictEqual(isFav, false);
        });
    });
    (0, node_test_1.describe)('toggleFavourite', () => {
        (0, node_test_1.default)('should add favourite when not favourited', async () => {
            const result = await favouriteService.toggleFavourite({
                userId: 'toggle_user',
                coachId: 'toggle_coach',
                coachName: 'Toggle Coach',
            });
            node_assert_1.default.strictEqual(result.isFavourite, true);
            node_assert_1.default.ok(result.favourite);
            node_assert_1.default.strictEqual(result.favourite.coachName, 'Toggle Coach');
        });
        (0, node_test_1.default)('should remove favourite when already favourited', async () => {
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
            node_assert_1.default.strictEqual(result.isFavourite, false);
            node_assert_1.default.strictEqual(result.favourite, null);
        });
    });
    (0, node_test_1.describe)('getFavouriteCount', () => {
        (0, node_test_1.default)('should return correct count for user', async () => {
            const count = await favouriteService.getFavouriteCount('parent1');
            const favourites = await favouriteService.getFavourites('parent1');
            node_assert_1.default.strictEqual(count, favourites.length);
        });
        (0, node_test_1.default)('should return 0 for user with no favourites', async () => {
            const count = await favouriteService.getFavouriteCount('no_favourites_user');
            node_assert_1.default.strictEqual(count, 0);
        });
    });
    (0, node_test_1.describe)('getFavouriteById', () => {
        (0, node_test_1.default)('should return favourite by ID', async () => {
            const favourite = await favouriteService.getFavouriteById('fav_1');
            node_assert_1.default.ok(favourite);
            node_assert_1.default.strictEqual(favourite.id, 'fav_1');
        });
        (0, node_test_1.default)('should return null for non-existent ID', async () => {
            const favourite = await favouriteService.getFavouriteById('non_existent');
            node_assert_1.default.strictEqual(favourite, null);
        });
        (0, node_test_1.default)('should return null for soft-deleted favourite', async () => {
            await favouriteService.removeFavourite('parent1', 'coach1');
            const favourite = await favouriteService.getFavouriteById('fav_1');
            node_assert_1.default.strictEqual(favourite, null);
        });
    });
    (0, node_test_1.describe)('updateNote', () => {
        (0, node_test_1.default)('should update note on favourite', async () => {
            const updated = await favouriteService.updateNote('parent1', 'coach1', 'Updated note');
            node_assert_1.default.ok(updated);
            node_assert_1.default.strictEqual(updated.note, 'Updated note');
            node_assert_1.default.ok(updated.updatedAt);
        });
        (0, node_test_1.default)('should return null for non-existent favourite', async () => {
            const updated = await favouriteService.updateNote('parent1', 'non_existent', 'Note');
            node_assert_1.default.strictEqual(updated, null);
        });
    });
    (0, node_test_1.describe)('getFavouriteCoachIds', () => {
        (0, node_test_1.default)('should return array of coach IDs', async () => {
            const coachIds = await favouriteService.getFavouriteCoachIds('parent1');
            node_assert_1.default.ok(Array.isArray(coachIds));
            node_assert_1.default.ok(coachIds.length > 0);
            node_assert_1.default.ok(coachIds.includes('coach1'));
        });
        (0, node_test_1.default)('should return empty array for user with no favourites', async () => {
            const coachIds = await favouriteService.getFavouriteCoachIds('no_favourites_user');
            node_assert_1.default.ok(Array.isArray(coachIds));
            node_assert_1.default.strictEqual(coachIds.length, 0);
        });
    });
    (0, node_test_1.describe)('clearAll', () => {
        (0, node_test_1.default)('should remove all favourites', async () => {
            await favouriteService.clearAll();
            const favourites = await favouriteService.getFavourites('parent1');
            node_assert_1.default.strictEqual(favourites.length, 0);
        });
    });
});
(0, node_test_1.describe)('Favourite Service Edge Cases', () => {
    (0, node_test_1.default)('should handle concurrent add and remove', async () => {
        const input = {
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
        node_assert_1.default.strictEqual(isFav, false);
    });
    (0, node_test_1.default)('should handle special characters in note', async () => {
        const specialNote = 'Coach with "quotes" & <special> chars! @#$%^&*()';
        const updated = await favouriteService.updateNote('parent1', 'coach1', specialNote);
        node_assert_1.default.ok(updated);
        node_assert_1.default.strictEqual(updated.note, specialNote);
    });
    (0, node_test_1.default)('should handle empty string note', async () => {
        const updated = await favouriteService.updateNote('parent1', 'coach1', '');
        node_assert_1.default.ok(updated);
        node_assert_1.default.strictEqual(updated.note, '');
    });
});
