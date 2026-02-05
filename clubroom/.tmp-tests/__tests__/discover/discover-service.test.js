"use strict";
/**
 * Discover Service Tests
 *
 * Unit tests for the coach discovery service including
 * search, filtering, location-based queries, and suggestions.
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
const discover_service_1 = require("../../services/discover-service");
// Reset to mock data before each test
(0, node_test_1.beforeEach)(async () => {
    await discover_service_1.discoverService.resetToMockData();
});
(0, node_test_1.describe)('Discover Service', () => {
    (0, node_test_1.describe)('searchCoaches', () => {
        (0, node_test_1.default)('should return all coaches when no filters applied', async () => {
            const response = await discover_service_1.discoverService.searchCoaches({});
            node_assert_1.default.ok(response.results.length > 0);
            node_assert_1.default.ok(response.totalCount > 0);
            node_assert_1.default.strictEqual(response.page, 1);
            node_assert_1.default.ok(response.filterOptions);
        });
        (0, node_test_1.default)('should filter by text query', async () => {
            // Use a coach name that exists in the mock data
            const response = await discover_service_1.discoverService.searchCoaches({ query: 'Mike' });
            node_assert_1.default.ok(response.results.length > 0);
            node_assert_1.default.ok(response.results.every((r) => r.coach.fullName.toLowerCase().includes('mike') ||
                r.coach.shortBio.toLowerCase().includes('mike')));
        });
        (0, node_test_1.default)('should filter by minimum price', async () => {
            const minPrice = 50;
            const response = await discover_service_1.discoverService.searchCoaches({ priceMin: minPrice });
            node_assert_1.default.ok(response.results.length > 0);
            response.results.forEach((r) => {
                node_assert_1.default.ok(r.coach.priceRange.maxUsd >= minPrice, `Coach ${r.coach.fullName} maxPrice ${r.coach.priceRange.maxUsd} should be >= ${minPrice}`);
            });
        });
        (0, node_test_1.default)('should filter by maximum price', async () => {
            const maxPrice = 60;
            const response = await discover_service_1.discoverService.searchCoaches({ priceMax: maxPrice });
            node_assert_1.default.ok(response.results.length > 0);
            response.results.forEach((r) => {
                node_assert_1.default.ok(r.coach.priceRange.minUsd <= maxPrice, `Coach ${r.coach.fullName} minPrice ${r.coach.priceRange.minUsd} should be <= ${maxPrice}`);
            });
        });
        (0, node_test_1.default)('should filter by minimum rating', async () => {
            const minRating = 4.7;
            const response = await discover_service_1.discoverService.searchCoaches({ rating: minRating });
            node_assert_1.default.ok(response.results.length > 0);
            response.results.forEach((r) => {
                node_assert_1.default.ok(r.coach.rating.average >= minRating, `Coach ${r.coach.fullName} rating ${r.coach.rating.average} should be >= ${minRating}`);
            });
        });
        (0, node_test_1.default)('should filter by football focuses', async () => {
            // Use a focus that exists in the mock data
            const response = await discover_service_1.discoverService.searchCoaches({
                focuses: ['Finishing'],
            });
            node_assert_1.default.ok(response.results.length > 0);
            response.results.forEach((r) => {
                node_assert_1.default.ok(r.coach.footballFocuses.includes('Finishing'), `Coach ${r.coach.fullName} should have Finishing focus`);
            });
        });
        (0, node_test_1.default)('should filter by session formats', async () => {
            const response = await discover_service_1.discoverService.searchCoaches({
                formats: ['Virtual'],
            });
            node_assert_1.default.ok(response.results.length > 0);
            response.results.forEach((r) => {
                node_assert_1.default.ok(r.coach.sessionFormats.includes('Virtual'), `Coach ${r.coach.fullName} should offer Virtual sessions`);
            });
        });
        (0, node_test_1.default)('should filter by languages', async () => {
            const response = await discover_service_1.discoverService.searchCoaches({
                languages: ['Spanish'],
            });
            node_assert_1.default.ok(response.results.length > 0);
            response.results.forEach((r) => {
                node_assert_1.default.ok(r.coach.languages?.some((l) => l.name.toLowerCase() === 'spanish'), `Coach ${r.coach.fullName} should speak Spanish`);
            });
        });
        (0, node_test_1.default)('should sort by rating when specified', async () => {
            const response = await discover_service_1.discoverService.searchCoaches({
                sortBy: 'rating',
            });
            node_assert_1.default.ok(response.results.length > 1);
            for (let i = 1; i < response.results.length; i++) {
                node_assert_1.default.ok(response.results[i - 1].coach.rating.average >=
                    response.results[i].coach.rating.average, 'Results should be sorted by rating descending');
            }
        });
        (0, node_test_1.default)('should sort by price low to high', async () => {
            const response = await discover_service_1.discoverService.searchCoaches({
                sortBy: 'price_low',
            });
            node_assert_1.default.ok(response.results.length > 1);
            for (let i = 1; i < response.results.length; i++) {
                node_assert_1.default.ok(response.results[i - 1].coach.priceRange.minUsd <=
                    response.results[i].coach.priceRange.minUsd, 'Results should be sorted by price ascending');
            }
        });
        (0, node_test_1.default)('should sort by price high to low', async () => {
            const response = await discover_service_1.discoverService.searchCoaches({
                sortBy: 'price_high',
            });
            node_assert_1.default.ok(response.results.length > 1);
            for (let i = 1; i < response.results.length; i++) {
                node_assert_1.default.ok(response.results[i - 1].coach.priceRange.maxUsd >=
                    response.results[i].coach.priceRange.maxUsd, 'Results should be sorted by price descending');
            }
        });
        (0, node_test_1.default)('should paginate results correctly', async () => {
            const pageSize = 2;
            const page1 = await discover_service_1.discoverService.searchCoaches({}, 1, pageSize);
            const page2 = await discover_service_1.discoverService.searchCoaches({}, 2, pageSize);
            node_assert_1.default.strictEqual(page1.results.length, pageSize);
            node_assert_1.default.strictEqual(page1.page, 1);
            node_assert_1.default.strictEqual(page2.page, 2);
            // Verify no overlap between pages
            const page1Ids = new Set(page1.results.map((r) => r.coach.id));
            page2.results.forEach((r) => {
                node_assert_1.default.ok(!page1Ids.has(r.coach.id), 'Page 2 should not contain coaches from page 1');
            });
        });
        (0, node_test_1.default)('should combine multiple filters', async () => {
            const filters = {
                rating: 4.5,
                priceMax: 80,
                formats: ['In-person'],
            };
            const response = await discover_service_1.discoverService.searchCoaches(filters);
            response.results.forEach((r) => {
                node_assert_1.default.ok(r.coach.rating.average >= 4.5);
                node_assert_1.default.ok(r.coach.priceRange.minUsd <= 80);
                node_assert_1.default.ok(r.coach.sessionFormats.includes('In-person'));
            });
        });
    });
    (0, node_test_1.describe)('getCoachesNearLocation', () => {
        (0, node_test_1.default)('should return coaches within specified radius', async () => {
            const lat = 51.5074;
            const lng = -0.1278;
            const radiusKm = 5;
            const results = await discover_service_1.discoverService.getCoachesNearLocation(lat, lng, radiusKm);
            node_assert_1.default.ok(results.length > 0);
            results.forEach((r) => {
                node_assert_1.default.ok(r.distanceKm !== undefined && r.distanceKm <= radiusKm, `Coach should be within ${radiusKm}km radius`);
            });
        });
        (0, node_test_1.default)('should sort results by distance', async () => {
            const lat = 51.5074;
            const lng = -0.1278;
            const radiusKm = 20;
            const results = await discover_service_1.discoverService.getCoachesNearLocation(lat, lng, radiusKm);
            node_assert_1.default.ok(results.length > 1);
            for (let i = 1; i < results.length; i++) {
                node_assert_1.default.ok((results[i - 1].distanceKm ?? 0) <= (results[i].distanceKm ?? 0), 'Results should be sorted by distance');
            }
        });
    });
    (0, node_test_1.describe)('getFilterOptions', () => {
        (0, node_test_1.default)('should return filter options with counts', async () => {
            const options = await discover_service_1.discoverService.getFilterOptions({});
            node_assert_1.default.ok(options.focuses.length > 0);
            node_assert_1.default.ok(options.languages.length > 0);
            node_assert_1.default.ok(options.formats.length > 0);
            node_assert_1.default.ok(options.priceRange.min >= 0);
            node_assert_1.default.ok(options.priceRange.max > options.priceRange.min);
            node_assert_1.default.ok(options.totalCount > 0);
            // Verify counts are positive
            options.focuses.forEach((f) => {
                node_assert_1.default.ok(f.count >= 0, `Focus ${f.label} should have non-negative count`);
            });
        });
        (0, node_test_1.default)('should update counts based on current filters', async () => {
            const allOptions = await discover_service_1.discoverService.getFilterOptions({});
            const filteredOptions = await discover_service_1.discoverService.getFilterOptions({
                rating: 4.8,
            });
            node_assert_1.default.ok(filteredOptions.totalCount <= allOptions.totalCount, 'Filtered count should be less than or equal to total');
        });
    });
    (0, node_test_1.describe)('getSuggestedCoaches', () => {
        (0, node_test_1.default)('should return suggested coaches', async () => {
            const suggestions = await discover_service_1.discoverService.getSuggestedCoaches('user1');
            node_assert_1.default.ok(suggestions.length > 0);
            node_assert_1.default.ok(suggestions.length <= 6);
            suggestions.forEach((s) => {
                node_assert_1.default.ok(s.coach);
                node_assert_1.default.ok(s.reason);
                node_assert_1.default.ok(s.reasonText);
                node_assert_1.default.ok(typeof s.confidence === 'number');
                node_assert_1.default.ok(s.confidence >= 0 && s.confidence <= 1);
            });
        });
        (0, node_test_1.default)('should include various suggestion reasons', async () => {
            const suggestions = await discover_service_1.discoverService.getSuggestedCoaches('user1');
            const reasons = new Set(suggestions.map((s) => s.reason));
            // Should have at least 2 different reasons
            node_assert_1.default.ok(reasons.size >= 2, 'Should have variety of suggestion reasons');
        });
    });
    (0, node_test_1.describe)('getCoachById', () => {
        (0, node_test_1.default)('should return coach by ID', async () => {
            // Use a coach ID that exists in the mock data
            const coach = await discover_service_1.discoverService.getCoachById('coach_mike');
            node_assert_1.default.ok(coach);
            node_assert_1.default.strictEqual(coach.id, 'coach_mike');
        });
        (0, node_test_1.default)('should return null for non-existent coach', async () => {
            const coach = await discover_service_1.discoverService.getCoachById('non_existent');
            node_assert_1.default.strictEqual(coach, null);
        });
    });
    (0, node_test_1.describe)('getAllCoaches', () => {
        (0, node_test_1.default)('should return all coaches', async () => {
            const coaches = await discover_service_1.discoverService.getAllCoaches();
            node_assert_1.default.ok(Array.isArray(coaches));
            node_assert_1.default.ok(coaches.length > 0);
            coaches.forEach((coach) => {
                node_assert_1.default.ok(coach.id);
                node_assert_1.default.ok(coach.fullName);
                node_assert_1.default.ok(coach.location);
                node_assert_1.default.ok(typeof coach.location.lat === 'number');
                node_assert_1.default.ok(typeof coach.location.lng === 'number');
            });
        });
    });
    (0, node_test_1.describe)('Recent Searches', () => {
        (0, node_test_1.default)('should save and retrieve recent searches', async () => {
            // Clear first
            await discover_service_1.discoverService.clearRecentSearches();
            // Perform searches
            await discover_service_1.discoverService.searchCoaches({ query: 'goalkeeper' });
            await discover_service_1.discoverService.searchCoaches({ query: 'striker' });
            const recent = await discover_service_1.discoverService.getRecentSearches();
            node_assert_1.default.ok(recent.includes('striker'));
            node_assert_1.default.ok(recent.includes('goalkeeper'));
            // Most recent should be first
            node_assert_1.default.strictEqual(recent[0], 'striker');
        });
        (0, node_test_1.default)('should limit recent searches', async () => {
            await discover_service_1.discoverService.clearRecentSearches();
            // Perform more than max searches
            for (let i = 0; i < 15; i++) {
                await discover_service_1.discoverService.searchCoaches({ query: `search${i}` });
            }
            const recent = await discover_service_1.discoverService.getRecentSearches();
            // Should be capped at 10
            node_assert_1.default.ok(recent.length <= 10);
        });
        (0, node_test_1.default)('should clear recent searches', async () => {
            await discover_service_1.discoverService.searchCoaches({ query: 'test' });
            await discover_service_1.discoverService.clearRecentSearches();
            const recent = await discover_service_1.discoverService.getRecentSearches();
            node_assert_1.default.strictEqual(recent.length, 0);
        });
    });
    (0, node_test_1.describe)('hasActiveFilters', () => {
        (0, node_test_1.default)('should return false for empty filters', () => {
            node_assert_1.default.strictEqual(discover_service_1.discoverService.hasActiveFilters({}), false);
        });
        (0, node_test_1.default)('should return true when filters are set', () => {
            node_assert_1.default.strictEqual(discover_service_1.discoverService.hasActiveFilters({ rating: 4 }), true);
            node_assert_1.default.strictEqual(discover_service_1.discoverService.hasActiveFilters({ priceMin: 30 }), true);
            node_assert_1.default.strictEqual(discover_service_1.discoverService.hasActiveFilters({ focuses: ['Goalkeeping'] }), true);
        });
    });
    (0, node_test_1.describe)('getActiveFilterCount', () => {
        (0, node_test_1.default)('should return 0 for empty filters', () => {
            node_assert_1.default.strictEqual(discover_service_1.discoverService.getActiveFilterCount({}), 0);
        });
        (0, node_test_1.default)('should count each filter category once', () => {
            const filters = {
                priceMin: 30,
                priceMax: 80,
                rating: 4,
                focuses: ['Goalkeeping', 'Finishing'],
            };
            // priceMin + priceMax count as 1, rating as 1, focuses as 1 = 3
            node_assert_1.default.strictEqual(discover_service_1.discoverService.getActiveFilterCount(filters), 3);
        });
    });
    (0, node_test_1.describe)('countCoaches', () => {
        (0, node_test_1.default)('should return correct count for filters', async () => {
            const allCount = await discover_service_1.discoverService.countCoaches({});
            const filteredCount = await discover_service_1.discoverService.countCoaches({ rating: 4.8 });
            node_assert_1.default.ok(allCount > 0);
            node_assert_1.default.ok(filteredCount <= allCount);
        });
    });
});
