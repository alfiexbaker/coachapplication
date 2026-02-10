import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { favouriteService, type AddFavouriteInput } from '@/services/favourite-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('FavouriteService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.FAVOURITES);
  });

  describe('addFavourite', () => {
    it('should add coach to favourites', async () => {
      const input: AddFavouriteInput = {
        userId: 'test-user-' + Math.random().toString(36).slice(2),
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        coachSport: 'Football',
        coachRating: 4.8,
        coachPriceMin: 45,
        coachPriceMax: 75,
        coachCity: 'London',
      };

      const result = await favouriteService.addFavourite(input);

      assert.ok(result);
      assert.ok(result.id);
      assert.equal(result.userId, input.userId);
      assert.equal(result.coachId, input.coachId);
      assert.equal(result.coachName, input.coachName);
      assert.equal(result.isFavourite, true);
      assert.ok(result.createdAt);
    });

    it('should return existing favourite if already favourited', async () => {
      const input: AddFavouriteInput = {
        userId: 'test-user-' + Math.random().toString(36).slice(2),
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
      };

      const result1 = await favouriteService.addFavourite(input);
      const result2 = await favouriteService.addFavourite(input);

      assert.equal(result1.id, result2.id);
    });

    it('should restore soft-deleted favourite', async () => {
      const input: AddFavouriteInput = {
        userId: 'test-user-' + Math.random().toString(36).slice(2),
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
      };

      const fav1 = await favouriteService.addFavourite(input);
      await favouriteService.removeFavourite(input.userId, input.coachId);
      const fav2 = await favouriteService.addFavourite(input);

      assert.equal(fav1.id, fav2.id);
      assert.equal(fav2.isFavourite, true);
      assert.ok(fav2.updatedAt);
    });
  });

  describe('removeFavourite', () => {
    it('should remove coach from favourites', async () => {
      const input: AddFavouriteInput = {
        userId: 'test-user-' + Math.random().toString(36).slice(2),
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
      };

      await favouriteService.addFavourite(input);
      await favouriteService.removeFavourite(input.userId, input.coachId);

      const isFav = await favouriteService.isFavourite(input.userId, input.coachId);
      assert.equal(isFav, false);
    });

    it('should not throw when removing non-existent favourite', async () => {
      await favouriteService.removeFavourite('user-id', 'coach-id');
      // Should complete without error
      assert.ok(true);
    });
  });

  describe('getFavourites', () => {
    it('should return all favourites for user', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      await favouriteService.addFavourite({
        userId,
        coachId: 'coach1-' + Math.random().toString(36).slice(2),
        coachName: 'Coach 1',
      });

      await favouriteService.addFavourite({
        userId,
        coachId: 'coach2-' + Math.random().toString(36).slice(2),
        coachName: 'Coach 2',
      });

      const favourites = await favouriteService.getFavourites(userId);

      assert.ok(favourites.length >= 2);
      assert.ok(favourites.every(f => f.userId === userId));
      assert.ok(favourites.every(f => f.isFavourite === true));
    });

    it('should return empty array when no favourites', async () => {
      const userId = 'test-user-empty-' + Math.random().toString(36).slice(2);
      const favourites = await favouriteService.getFavourites(userId);

      assert.ok(Array.isArray(favourites));
      assert.equal(favourites.length, 0);
    });
  });

  describe('isFavourite', () => {
    it('should return true when coach is favourited', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      await favouriteService.addFavourite({
        userId,
        coachId,
        coachName: 'Test Coach',
      });

      const isFav = await favouriteService.isFavourite(userId, coachId);
      assert.equal(isFav, true);
    });

    it('should return false when coach is not favourited', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      const isFav = await favouriteService.isFavourite(userId, coachId);
      assert.equal(isFav, false);
    });
  });

  describe('toggleFavourite', () => {
    it('should add favourite when not favourited', async () => {
      const input: AddFavouriteInput = {
        userId: 'test-user-' + Math.random().toString(36).slice(2),
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
      };

      const result = await favouriteService.toggleFavourite(input);

      assert.equal(result.isFavourite, true);
      assert.ok(result.favourite);
      assert.equal(result.favourite.coachId, input.coachId);
    });

    it('should remove favourite when already favourited', async () => {
      const input: AddFavouriteInput = {
        userId: 'test-user-' + Math.random().toString(36).slice(2),
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
      };

      await favouriteService.addFavourite(input);
      const result = await favouriteService.toggleFavourite(input);

      assert.equal(result.isFavourite, false);
      assert.equal(result.favourite, null);
    });
  });

  describe('getFavouriteCount', () => {
    it('should return count of favourites', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      await favouriteService.addFavourite({
        userId,
        coachId: 'coach1-' + Math.random().toString(36).slice(2),
        coachName: 'Coach 1',
      });

      await favouriteService.addFavourite({
        userId,
        coachId: 'coach2-' + Math.random().toString(36).slice(2),
        coachName: 'Coach 2',
      });

      const count = await favouriteService.getFavouriteCount(userId);

      assert.ok(count >= 2);
    });

    it('should return 0 when no favourites', async () => {
      const userId = 'test-user-empty-' + Math.random().toString(36).slice(2);
      const count = await favouriteService.getFavouriteCount(userId);

      assert.equal(count, 0);
    });
  });

  describe('getFavouriteById', () => {
    it('should return favourite by id', async () => {
      const input: AddFavouriteInput = {
        userId: 'test-user-' + Math.random().toString(36).slice(2),
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
      };

      const added = await favouriteService.addFavourite(input);
      const found = await favouriteService.getFavouriteById(added.id);

      assert.ok(found);
      assert.equal(found.id, added.id);
      assert.equal(found.coachId, input.coachId);
    });

    it('should return null when not found', async () => {
      const found = await favouriteService.getFavouriteById('non-existent-id');
      assert.equal(found, null);
    });
  });

  describe('updateNote', () => {
    it('should update note on favourite', async () => {
      const input: AddFavouriteInput = {
        userId: 'test-user-' + Math.random().toString(36).slice(2),
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
      };

      await favouriteService.addFavourite(input);
      const updated = await favouriteService.updateNote(input.userId, input.coachId, 'Great coach!');

      assert.ok(updated);
      assert.equal(updated.note, 'Great coach!');
      assert.ok(updated.updatedAt);
    });

    it('should return null when favourite not found', async () => {
      const updated = await favouriteService.updateNote('user-id', 'coach-id', 'Note');
      assert.equal(updated, null);
    });
  });

  describe('getFavouriteCoachIds', () => {
    it('should return array of coach IDs', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const coachId1 = 'coach1-' + Math.random().toString(36).slice(2);
      const coachId2 = 'coach2-' + Math.random().toString(36).slice(2);

      await favouriteService.addFavourite({
        userId,
        coachId: coachId1,
        coachName: 'Coach 1',
      });

      await favouriteService.addFavourite({
        userId,
        coachId: coachId2,
        coachName: 'Coach 2',
      });

      const ids = await favouriteService.getFavouriteCoachIds(userId);

      assert.ok(Array.isArray(ids));
      assert.ok(ids.includes(coachId1));
      assert.ok(ids.includes(coachId2));
    });

    it('should return empty array when no favourites', async () => {
      const userId = 'test-user-empty-' + Math.random().toString(36).slice(2);
      const ids = await favouriteService.getFavouriteCoachIds(userId);

      assert.ok(Array.isArray(ids));
      assert.equal(ids.length, 0);
    });
  });

  describe('clearAll', () => {
    it('should clear all favourites', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      await favouriteService.addFavourite({
        userId,
        coachId: 'coach1',
        coachName: 'Coach 1',
      });

      await favouriteService.clearAll();

      const favourites = await favouriteService.getFavourites(userId);
      assert.equal(favourites.length, 0);
    });
  });
});
