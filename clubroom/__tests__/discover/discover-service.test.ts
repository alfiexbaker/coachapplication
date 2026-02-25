/**
 * Discover Service Tests
 *
 * Unit tests for the coach discovery service including
 * search, filtering, location-based queries, and suggestions.
 */

import assert from 'node:assert';
import test, { describe, beforeEach } from 'node:test';

import { discoverService } from '../../services/discover-service';
import type { CoachSearchFilters } from '../../constants/types';
import type { Result, ServiceError } from '../../types/result';

function expectOk<T>(result: Result<T, ServiceError>): T {
  assert.ok(result.success, result.success ? undefined : result.error.message);
  return result.data;
}

// Reset to mock data before each test
beforeEach(async () => {
  expectOk(await discoverService.resetToMockData());
});

describe('Discover Service', () => {
  describe('searchCoaches', () => {
    test('should return all coaches when no filters applied', async () => {
      const response = expectOk(await discoverService.searchCoaches({}));

      assert.ok(response.results.length > 0);
      assert.ok(response.totalCount > 0);
      assert.strictEqual(response.page, 1);
      assert.ok(response.filterOptions);
    });

    test('should filter by text query', async () => {
      // Use a coach name that exists in the mock data
      const response = expectOk(await discoverService.searchCoaches({ query: 'Mike' }));

      assert.ok(response.results.length > 0);
      assert.ok(
        response.results.every(
          (r) =>
            r.coach.fullName.toLowerCase().includes('mike') ||
            r.coach.shortBio.toLowerCase().includes('mike')
        )
      );
    });

    test('should filter by minimum price', async () => {
      const minPrice = 50;
      const response = expectOk(await discoverService.searchCoaches({ priceMin: minPrice }));

      assert.ok(response.results.length > 0);
      response.results.forEach((r) => {
        assert.ok(
          r.coach.priceRange.max >= minPrice,
          `Coach ${r.coach.fullName} maxPrice ${r.coach.priceRange.max} should be >= ${minPrice}`
        );
      });
    });

    test('should filter by maximum price', async () => {
      const maxPrice = 60;
      const response = expectOk(await discoverService.searchCoaches({ priceMax: maxPrice }));

      assert.ok(response.results.length > 0);
      response.results.forEach((r) => {
        assert.ok(
          r.coach.priceRange.min <= maxPrice,
          `Coach ${r.coach.fullName} minPrice ${r.coach.priceRange.min} should be <= ${maxPrice}`
        );
      });
    });

    test('should filter by minimum rating', async () => {
      const minRating = 4.7;
      const response = expectOk(await discoverService.searchCoaches({ rating: minRating }));

      assert.ok(response.results.length > 0);
      response.results.forEach((r) => {
        assert.ok(
          r.coach.rating.average >= minRating,
          `Coach ${r.coach.fullName} rating ${r.coach.rating.average} should be >= ${minRating}`
        );
      });
    });

    test('should filter by football focuses', async () => {
      // Use a focus that exists in the mock data
      const response = expectOk(await discoverService.searchCoaches({
        focuses: ['Finishing'],
      }));

      assert.ok(response.results.length > 0);
      response.results.forEach((r) => {
        assert.ok(
          r.coach.footballFocuses.includes('Finishing'),
          `Coach ${r.coach.fullName} should have Finishing focus`
        );
      });
    });

    test('should filter by session formats', async () => {
      const response = expectOk(await discoverService.searchCoaches({
        formats: ['Virtual'],
      }));

      assert.ok(response.results.length > 0);
      response.results.forEach((r) => {
        assert.ok(
          r.coach.sessionFormats.includes('Virtual'),
          `Coach ${r.coach.fullName} should offer Virtual sessions`
        );
      });
    });

    test('should filter by languages', async () => {
      const response = expectOk(await discoverService.searchCoaches({
        languages: ['Spanish'],
      }));

      assert.ok(response.results.length > 0);
      response.results.forEach((r) => {
        assert.ok(
          r.coach.languages?.some(
            (l) => l.name.toLowerCase() === 'spanish'
          ),
          `Coach ${r.coach.fullName} should speak Spanish`
        );
      });
    });

    test('should sort by rating when specified', async () => {
      const response = expectOk(await discoverService.searchCoaches({
        sortBy: 'rating',
      }));

      assert.ok(response.results.length > 1);
      for (let i = 1; i < response.results.length; i++) {
        assert.ok(
          response.results[i - 1].coach.rating.average >=
            response.results[i].coach.rating.average,
          'Results should be sorted by rating descending'
        );
      }
    });

    test('should sort by price low to high', async () => {
      const response = expectOk(await discoverService.searchCoaches({
        sortBy: 'price_low',
      }));

      assert.ok(response.results.length > 1);
      for (let i = 1; i < response.results.length; i++) {
        assert.ok(
          response.results[i - 1].coach.priceRange.min <=
            response.results[i].coach.priceRange.min,
          'Results should be sorted by price ascending'
        );
      }
    });

    test('should sort by price high to low', async () => {
      const response = expectOk(await discoverService.searchCoaches({
        sortBy: 'price_high',
      }));

      assert.ok(response.results.length > 1);
      for (let i = 1; i < response.results.length; i++) {
        assert.ok(
          response.results[i - 1].coach.priceRange.max >=
            response.results[i].coach.priceRange.max,
          'Results should be sorted by price descending'
        );
      }
    });

    test('should paginate results correctly', async () => {
      const pageSize = 2;
      const page1 = expectOk(await discoverService.searchCoaches({}, 1, pageSize));
      const page2 = expectOk(await discoverService.searchCoaches({}, 2, pageSize));

      assert.strictEqual(page1.results.length, pageSize);
      assert.strictEqual(page1.page, 1);
      assert.strictEqual(page2.page, 2);

      // Verify no overlap between pages
      const page1Ids = new Set(page1.results.map((r) => r.coach.id));
      page2.results.forEach((r) => {
        assert.ok(
          !page1Ids.has(r.coach.id),
          'Page 2 should not contain coaches from page 1'
        );
      });
    });

    test('should combine multiple filters', async () => {
      const filters: CoachSearchFilters = {
        rating: 4.5,
        priceMax: 80,
        formats: ['In-person'],
      };
      const response = expectOk(await discoverService.searchCoaches(filters));

      response.results.forEach((r) => {
        assert.ok(r.coach.rating.average >= 4.5);
        assert.ok(r.coach.priceRange.min <= 80);
        assert.ok(r.coach.sessionFormats.includes('In-person'));
      });
    });
  });

  describe('getCoachesNearLocation', () => {
    test('should return coaches within specified radius', async () => {
      const lat = 51.5074;
      const lng = -0.1278;
      const radiusKm = 5;

      const results = expectOk(await discoverService.getCoachesNearLocation(lat, lng, radiusKm));

      assert.ok(results.length > 0);
      results.forEach((r) => {
        assert.ok(
          r.distanceKm !== undefined && r.distanceKm <= radiusKm,
          `Coach should be within ${radiusKm}km radius`
        );
      });
    });

    test('should sort results by distance', async () => {
      const lat = 51.5074;
      const lng = -0.1278;
      const radiusKm = 20;

      const results = expectOk(await discoverService.getCoachesNearLocation(lat, lng, radiusKm));

      assert.ok(results.length > 1);
      for (let i = 1; i < results.length; i++) {
        assert.ok(
          (results[i - 1].distanceKm ?? 0) <= (results[i].distanceKm ?? 0),
          'Results should be sorted by distance'
        );
      }
    });
  });

  describe('getFilterOptions', () => {
    test('should return filter options with counts', async () => {
      const options = expectOk(await discoverService.getFilterOptions({}));

      assert.ok(options.focuses.length > 0);
      assert.ok(options.languages.length > 0);
      assert.ok(options.formats.length > 0);
      assert.ok(options.priceRange.min >= 0);
      assert.ok(options.priceRange.max > options.priceRange.min);
      assert.ok(options.totalCount > 0);

      // Verify counts are positive
      options.focuses.forEach((f) => {
        assert.ok(f.count >= 0, `Focus ${f.label} should have non-negative count`);
      });
    });

    test('should update counts based on current filters', async () => {
      const allOptions = expectOk(await discoverService.getFilterOptions({}));
      const filteredOptions = expectOk(await discoverService.getFilterOptions({
        rating: 4.8,
      }));

      assert.ok(
        filteredOptions.totalCount <= allOptions.totalCount,
        'Filtered count should be less than or equal to total'
      );
    });
  });

  describe('getSuggestedCoaches', () => {
    test('should return suggested coaches', async () => {
      const suggestions = expectOk(await discoverService.getSuggestedCoaches('user1'));

      assert.ok(suggestions.length > 0);
      assert.ok(suggestions.length <= 6);

      suggestions.forEach((s) => {
        assert.ok(s.coach);
        assert.ok(s.reason);
        assert.ok(s.reasonText);
        assert.ok(typeof s.confidence === 'number');
        assert.ok(s.confidence >= 0 && s.confidence <= 1);
      });
    });

    test('should include various suggestion reasons', async () => {
      const suggestions = expectOk(await discoverService.getSuggestedCoaches('user1'));
      const reasons = new Set(suggestions.map((s) => s.reason));

      // Should have at least 2 different reasons
      assert.ok(reasons.size >= 2, 'Should have variety of suggestion reasons');
    });
  });

  describe('getCoachById', () => {
    test('should return coach by ID', async () => {
      // Use a coach ID that exists in the mock data
      const coach = expectOk(await discoverService.getCoachById('coach_mike'));

      assert.ok(coach);
      assert.strictEqual(coach.id, 'coach_mike');
    });

    test('should return null for non-existent coach', async () => {
      const coach = expectOk(await discoverService.getCoachById('non_existent'));

      assert.strictEqual(coach, null);
    });
  });

  describe('getAllCoaches', () => {
    test('should return all coaches', async () => {
      const coaches = expectOk(await discoverService.getAllCoaches());

      assert.ok(Array.isArray(coaches));
      assert.ok(coaches.length > 0);

      coaches.forEach((coach) => {
        assert.ok(coach.id);
        assert.ok(coach.fullName);
        assert.ok(coach.location);
        assert.ok(typeof coach.location.lat === 'number');
        assert.ok(typeof coach.location.lng === 'number');
      });
    });
  });

  describe('Recent Searches', () => {
    test('should save and retrieve recent searches', async () => {
      // Clear first
      await discoverService.clearRecentSearches();

      // Perform searches
      await discoverService.searchCoaches({ query: 'goalkeeper' });
      await discoverService.searchCoaches({ query: 'striker' });

      const recent = expectOk(await discoverService.getRecentSearches());

      assert.ok(recent.includes('striker'));
      assert.ok(recent.includes('goalkeeper'));
      // Most recent should be first
      assert.strictEqual(recent[0], 'striker');
    });

    test('should limit recent searches', async () => {
      await discoverService.clearRecentSearches();

      // Perform more than max searches
      for (let i = 0; i < 15; i++) {
        await discoverService.searchCoaches({ query: `search${i}` });
      }

      const recent = expectOk(await discoverService.getRecentSearches());

      // Should be capped at 10
      assert.ok(recent.length <= 10);
    });

    test('should clear recent searches', async () => {
      await discoverService.searchCoaches({ query: 'test' });
      await discoverService.clearRecentSearches();

      const recent = expectOk(await discoverService.getRecentSearches());

      assert.strictEqual(recent.length, 0);
    });
  });

  describe('hasActiveFilters', () => {
    test('should return false for empty filters', () => {
      assert.strictEqual(discoverService.hasActiveFilters({}), false);
    });

    test('should return true when filters are set', () => {
      assert.strictEqual(discoverService.hasActiveFilters({ rating: 4 }), true);
      assert.strictEqual(discoverService.hasActiveFilters({ priceMin: 30 }), true);
      assert.strictEqual(
        discoverService.hasActiveFilters({ focuses: ['Goalkeeping'] }),
        true
      );
    });
  });

  describe('getActiveFilterCount', () => {
    test('should return 0 for empty filters', () => {
      assert.strictEqual(discoverService.getActiveFilterCount({}), 0);
    });

    test('should count each filter category once', () => {
      const filters: CoachSearchFilters = {
        priceMin: 30,
        priceMax: 80,
        rating: 4,
        focuses: ['Goalkeeping', 'Finishing'],
      };

      // priceMin + priceMax count as 1, rating as 1, focuses as 1 = 3
      assert.strictEqual(discoverService.getActiveFilterCount(filters), 3);
    });
  });

  describe('countCoaches', () => {
    test('should return correct count for filters', async () => {
      const allCount = expectOk(await discoverService.countCoaches({}));
      const filteredCount = expectOk(await discoverService.countCoaches({ rating: 4.8 }));

      assert.ok(allCount > 0);
      assert.ok(filteredCount <= allCount);
    });
  });
});
