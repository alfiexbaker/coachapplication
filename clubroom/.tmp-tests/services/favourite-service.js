"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.favouriteService = void 0;
const api_client_1 = require("./api-client");
const logger_1 = require("@/utils/logger");
const event_bus_1 = require("./event-bus");
const result_1 = require("@/types/result");
const storage_keys_1 = require("@/constants/storage-keys");
const logger = (0, logger_1.createLogger)('FavouriteService');
// Mock data for development - some pre-existing favourites
const MOCK_FAVOURITES = [
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
let favouritesCache = [...MOCK_FAVOURITES];
async function loadFavourites() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.FAVOURITES, null);
        if (stored) {
            return stored;
        }
    }
    catch (error) {
        logger.error('Failed to load favourites', error);
    }
    return [...MOCK_FAVOURITES];
}
async function saveFavourites(favourites) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.FAVOURITES, favourites);
    }
    catch (error) {
        logger.error('Failed to save favourites', error);
    }
}
exports.favouriteService = {
    /**
     * Add a coach to user's favourites
     * Returns the new favourite if created, or existing favourite if already exists
     */
    async addFavourite(input) {
        try {
            favouritesCache = await loadFavourites();
            // Check if already favourited
            const existing = favouritesCache.find((f) => f.userId === input.userId && f.coachId === input.coachId && f.isFavourite);
            if (existing) {
                logger.debug('Already favourited', { coachId: input.coachId });
                return (0, result_1.ok)(existing);
            }
            const softDeleted = favouritesCache.find((f) => f.userId === input.userId && f.coachId === input.coachId && !f.isFavourite);
            if (softDeleted) {
                softDeleted.isFavourite = true;
                softDeleted.updatedAt = new Date().toISOString();
                if (input.note) {
                    softDeleted.note = input.note;
                }
                await saveFavourites(favouritesCache);
                logger.debug('Restored favourite', { id: softDeleted.id });
                (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.FAVOURITE_ADDED, {
                    userId: softDeleted.userId,
                    coachId: softDeleted.coachId,
                    favouriteId: softDeleted.id,
                });
                return (0, result_1.ok)(softDeleted);
            }
            const newFavourite = {
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
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.FAVOURITE_ADDED, {
                userId: newFavourite.userId,
                coachId: newFavourite.coachId,
                favouriteId: newFavourite.id,
            });
            return (0, result_1.ok)(newFavourite);
        }
        catch (error) {
            logger.error('Failed to add favourite', { input, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to add favourite'));
        }
    },
    /**
     * Remove a coach from user's favourites (soft delete)
     */
    async removeFavourite(userId, coachId) {
        try {
            favouritesCache = await loadFavourites();
            const favourite = favouritesCache.find((f) => f.userId === userId && f.coachId === coachId && f.isFavourite);
            if (!favourite) {
                logger.debug('Not favourited', { coachId });
                return (0, result_1.err)((0, result_1.notFound)('Favourite'));
            }
            favourite.isFavourite = false;
            favourite.updatedAt = new Date().toISOString();
            await saveFavourites(favouritesCache);
            logger.debug('Removed favourite', { id: favourite.id });
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.FAVOURITE_REMOVED, {
                userId: favourite.userId,
                coachId: favourite.coachId,
                favouriteId: favourite.id,
            });
            return (0, result_1.ok)(undefined);
        }
        catch (error) {
            logger.error('Failed to remove favourite', { userId, coachId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to remove favourite'));
        }
    },
    /**
     * Get all favourited coaches for a user
     */
    async getFavourites(userId) {
        try {
            favouritesCache = await loadFavourites();
            return (0, result_1.ok)(favouritesCache
                .filter((f) => f.userId === userId && f.isFavourite)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }
        catch (error) {
            logger.error('Failed to get favourites', { userId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to load favourites'));
        }
    },
    /**
     * Check if a user has favourited a specific coach
     */
    async isFavourite(userId, coachId) {
        try {
            favouritesCache = await loadFavourites();
            return (0, result_1.ok)(favouritesCache.some((f) => f.userId === userId && f.coachId === coachId && f.isFavourite));
        }
        catch (error) {
            logger.error('Failed to check favourite status', { userId, coachId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to check favourite status'));
        }
    },
    /**
     * Toggle favourite status for a coach
     * Returns the updated favourite status (true = favourited, false = removed)
     */
    async toggleFavourite(input) {
        const currentlyFavouritedResult = await this.isFavourite(input.userId, input.coachId);
        if (!currentlyFavouritedResult.success) {
            return currentlyFavouritedResult;
        }
        if (currentlyFavouritedResult.data) {
            const removeResult = await this.removeFavourite(input.userId, input.coachId);
            if (!removeResult.success && removeResult.error.code !== 'NOT_FOUND') {
                return removeResult;
            }
            return (0, result_1.ok)({ isFavourite: false, favourite: null });
        }
        const favouriteResult = await this.addFavourite(input);
        if (!favouriteResult.success) {
            return favouriteResult;
        }
        return (0, result_1.ok)({ isFavourite: true, favourite: favouriteResult.data });
    },
    /**
     * Get favourite count for a user
     */
    async getFavouriteCount(userId) {
        const favouritesResult = await this.getFavourites(userId);
        if (!favouritesResult.success) {
            return favouritesResult;
        }
        return (0, result_1.ok)(favouritesResult.data.length);
    },
    /**
     * Get favourite by ID
     */
    async getFavouriteById(favouriteId) {
        try {
            favouritesCache = await loadFavourites();
            return (0, result_1.ok)(favouritesCache.find((f) => f.id === favouriteId && f.isFavourite) || null);
        }
        catch (error) {
            logger.error('Failed to get favourite by id', { favouriteId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to load favourite'));
        }
    },
    /**
     * Update favourite note
     */
    async updateNote(userId, coachId, note) {
        try {
            favouritesCache = await loadFavourites();
            const favourite = favouritesCache.find((f) => f.userId === userId && f.coachId === coachId && f.isFavourite);
            if (!favourite) {
                return (0, result_1.ok)(null);
            }
            favourite.note = note;
            favourite.updatedAt = new Date().toISOString();
            await saveFavourites(favouritesCache);
            return (0, result_1.ok)(favourite);
        }
        catch (error) {
            logger.error('Failed to update favourite note', { userId, coachId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to update note'));
        }
    },
    /**
     * Get IDs of all favourited coaches for a user
     * Useful for filtering or highlighting favourites in lists
     */
    async getFavouriteCoachIds(userId) {
        const favouritesResult = await this.getFavourites(userId);
        if (!favouritesResult.success) {
            return favouritesResult;
        }
        return (0, result_1.ok)(favouritesResult.data.map((f) => f.coachId));
    },
    /**
     * Reset to mock data (for testing)
     */
    async resetToMockData() {
        try {
            favouritesCache = [...MOCK_FAVOURITES];
            await saveFavourites(favouritesCache);
            return (0, result_1.ok)(undefined);
        }
        catch (error) {
            logger.error('Failed to reset favourites', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to reset favourites'));
        }
    },
    /**
     * Clear all favourites (for testing)
     */
    async clearAll() {
        try {
            favouritesCache = [];
            await saveFavourites(favouritesCache);
            return (0, result_1.ok)(undefined);
        }
        catch (error) {
            logger.error('Failed to clear favourites', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to clear favourites'));
        }
    },
};
