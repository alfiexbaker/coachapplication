"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const favourite_service_1 = require("@/services/favourite-service");
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
(0, node_test_1.describe)('FavouriteService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.FAVOURITES);
    });
    (0, node_test_1.describe)('addFavourite', () => {
        (0, node_test_1.it)('should add coach to favourites', async () => {
            const input = {
                userId: 'test-user-' + Math.random().toString(36).slice(2),
                coachId: 'test-coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
                coachSport: 'Football',
                coachRating: 4.8,
                coachPriceMin: 45,
                coachPriceMax: 75,
                coachCity: 'London',
            };
            const result = await favourite_service_1.favouriteService.addFavourite(input);
            strict_1.default.ok(result);
            strict_1.default.ok(result.id);
            strict_1.default.equal(result.userId, input.userId);
            strict_1.default.equal(result.coachId, input.coachId);
            strict_1.default.equal(result.coachName, input.coachName);
            strict_1.default.equal(result.isFavourite, true);
            strict_1.default.ok(result.createdAt);
        });
        (0, node_test_1.it)('should return existing favourite if already favourited', async () => {
            const input = {
                userId: 'test-user-' + Math.random().toString(36).slice(2),
                coachId: 'test-coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
            };
            const result1 = await favourite_service_1.favouriteService.addFavourite(input);
            const result2 = await favourite_service_1.favouriteService.addFavourite(input);
            strict_1.default.equal(result1.id, result2.id);
        });
        (0, node_test_1.it)('should restore soft-deleted favourite', async () => {
            const input = {
                userId: 'test-user-' + Math.random().toString(36).slice(2),
                coachId: 'test-coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
            };
            const fav1 = await favourite_service_1.favouriteService.addFavourite(input);
            await favourite_service_1.favouriteService.removeFavourite(input.userId, input.coachId);
            const fav2 = await favourite_service_1.favouriteService.addFavourite(input);
            strict_1.default.equal(fav1.id, fav2.id);
            strict_1.default.equal(fav2.isFavourite, true);
            strict_1.default.ok(fav2.updatedAt);
        });
    });
    (0, node_test_1.describe)('removeFavourite', () => {
        (0, node_test_1.it)('should remove coach from favourites', async () => {
            const input = {
                userId: 'test-user-' + Math.random().toString(36).slice(2),
                coachId: 'test-coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
            };
            await favourite_service_1.favouriteService.addFavourite(input);
            await favourite_service_1.favouriteService.removeFavourite(input.userId, input.coachId);
            const isFav = await favourite_service_1.favouriteService.isFavourite(input.userId, input.coachId);
            strict_1.default.equal(isFav, false);
        });
        (0, node_test_1.it)('should not throw when removing non-existent favourite', async () => {
            await favourite_service_1.favouriteService.removeFavourite('user-id', 'coach-id');
            // Should complete without error
            strict_1.default.ok(true);
        });
    });
    (0, node_test_1.describe)('getFavourites', () => {
        (0, node_test_1.it)('should return all favourites for user', async () => {
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            await favourite_service_1.favouriteService.addFavourite({
                userId,
                coachId: 'coach1-' + Math.random().toString(36).slice(2),
                coachName: 'Coach 1',
            });
            await favourite_service_1.favouriteService.addFavourite({
                userId,
                coachId: 'coach2-' + Math.random().toString(36).slice(2),
                coachName: 'Coach 2',
            });
            const favourites = await favourite_service_1.favouriteService.getFavourites(userId);
            strict_1.default.ok(favourites.length >= 2);
            strict_1.default.ok(favourites.every(f => f.userId === userId));
            strict_1.default.ok(favourites.every(f => f.isFavourite === true));
        });
        (0, node_test_1.it)('should return empty array when no favourites', async () => {
            const userId = 'test-user-empty-' + Math.random().toString(36).slice(2);
            const favourites = await favourite_service_1.favouriteService.getFavourites(userId);
            strict_1.default.ok(Array.isArray(favourites));
            strict_1.default.equal(favourites.length, 0);
        });
    });
    (0, node_test_1.describe)('isFavourite', () => {
        (0, node_test_1.it)('should return true when coach is favourited', async () => {
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
            await favourite_service_1.favouriteService.addFavourite({
                userId,
                coachId,
                coachName: 'Test Coach',
            });
            const isFav = await favourite_service_1.favouriteService.isFavourite(userId, coachId);
            strict_1.default.equal(isFav, true);
        });
        (0, node_test_1.it)('should return false when coach is not favourited', async () => {
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
            const isFav = await favourite_service_1.favouriteService.isFavourite(userId, coachId);
            strict_1.default.equal(isFav, false);
        });
    });
    (0, node_test_1.describe)('toggleFavourite', () => {
        (0, node_test_1.it)('should add favourite when not favourited', async () => {
            const input = {
                userId: 'test-user-' + Math.random().toString(36).slice(2),
                coachId: 'test-coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
            };
            const result = await favourite_service_1.favouriteService.toggleFavourite(input);
            strict_1.default.equal(result.isFavourite, true);
            strict_1.default.ok(result.favourite);
            strict_1.default.equal(result.favourite.coachId, input.coachId);
        });
        (0, node_test_1.it)('should remove favourite when already favourited', async () => {
            const input = {
                userId: 'test-user-' + Math.random().toString(36).slice(2),
                coachId: 'test-coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
            };
            await favourite_service_1.favouriteService.addFavourite(input);
            const result = await favourite_service_1.favouriteService.toggleFavourite(input);
            strict_1.default.equal(result.isFavourite, false);
            strict_1.default.equal(result.favourite, null);
        });
    });
    (0, node_test_1.describe)('getFavouriteCount', () => {
        (0, node_test_1.it)('should return count of favourites', async () => {
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            await favourite_service_1.favouriteService.addFavourite({
                userId,
                coachId: 'coach1-' + Math.random().toString(36).slice(2),
                coachName: 'Coach 1',
            });
            await favourite_service_1.favouriteService.addFavourite({
                userId,
                coachId: 'coach2-' + Math.random().toString(36).slice(2),
                coachName: 'Coach 2',
            });
            const count = await favourite_service_1.favouriteService.getFavouriteCount(userId);
            strict_1.default.ok(count >= 2);
        });
        (0, node_test_1.it)('should return 0 when no favourites', async () => {
            const userId = 'test-user-empty-' + Math.random().toString(36).slice(2);
            const count = await favourite_service_1.favouriteService.getFavouriteCount(userId);
            strict_1.default.equal(count, 0);
        });
    });
    (0, node_test_1.describe)('getFavouriteById', () => {
        (0, node_test_1.it)('should return favourite by id', async () => {
            const input = {
                userId: 'test-user-' + Math.random().toString(36).slice(2),
                coachId: 'test-coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
            };
            const added = await favourite_service_1.favouriteService.addFavourite(input);
            const found = await favourite_service_1.favouriteService.getFavouriteById(added.id);
            strict_1.default.ok(found);
            strict_1.default.equal(found.id, added.id);
            strict_1.default.equal(found.coachId, input.coachId);
        });
        (0, node_test_1.it)('should return null when not found', async () => {
            const found = await favourite_service_1.favouriteService.getFavouriteById('non-existent-id');
            strict_1.default.equal(found, null);
        });
    });
    (0, node_test_1.describe)('updateNote', () => {
        (0, node_test_1.it)('should update note on favourite', async () => {
            const input = {
                userId: 'test-user-' + Math.random().toString(36).slice(2),
                coachId: 'test-coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
            };
            await favourite_service_1.favouriteService.addFavourite(input);
            const updated = await favourite_service_1.favouriteService.updateNote(input.userId, input.coachId, 'Great coach!');
            strict_1.default.ok(updated);
            strict_1.default.equal(updated.note, 'Great coach!');
            strict_1.default.ok(updated.updatedAt);
        });
        (0, node_test_1.it)('should return null when favourite not found', async () => {
            const updated = await favourite_service_1.favouriteService.updateNote('user-id', 'coach-id', 'Note');
            strict_1.default.equal(updated, null);
        });
    });
    (0, node_test_1.describe)('getFavouriteCoachIds', () => {
        (0, node_test_1.it)('should return array of coach IDs', async () => {
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            const coachId1 = 'coach1-' + Math.random().toString(36).slice(2);
            const coachId2 = 'coach2-' + Math.random().toString(36).slice(2);
            await favourite_service_1.favouriteService.addFavourite({
                userId,
                coachId: coachId1,
                coachName: 'Coach 1',
            });
            await favourite_service_1.favouriteService.addFavourite({
                userId,
                coachId: coachId2,
                coachName: 'Coach 2',
            });
            const ids = await favourite_service_1.favouriteService.getFavouriteCoachIds(userId);
            strict_1.default.ok(Array.isArray(ids));
            strict_1.default.ok(ids.includes(coachId1));
            strict_1.default.ok(ids.includes(coachId2));
        });
        (0, node_test_1.it)('should return empty array when no favourites', async () => {
            const userId = 'test-user-empty-' + Math.random().toString(36).slice(2);
            const ids = await favourite_service_1.favouriteService.getFavouriteCoachIds(userId);
            strict_1.default.ok(Array.isArray(ids));
            strict_1.default.equal(ids.length, 0);
        });
    });
    (0, node_test_1.describe)('clearAll', () => {
        (0, node_test_1.it)('should clear all favourites', async () => {
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            await favourite_service_1.favouriteService.addFavourite({
                userId,
                coachId: 'coach1',
                coachName: 'Coach 1',
            });
            await favourite_service_1.favouriteService.clearAll();
            const favourites = await favourite_service_1.favouriteService.getFavourites(userId);
            strict_1.default.equal(favourites.length, 0);
        });
    });
});
