"use strict";
/**
 * Comparison Service Tests
 *
 * Unit tests for the coach comparison service including:
 * - Adding/removing coaches to comparison
 * - Getting comparison data
 * - Maximum coach limit enforcement
 * - Best value calculation
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
const comparison_service_1 = require("../../services/comparison-service");
const discover_service_1 = require("../../services/discover-service");
// Reset services before each test
(0, node_test_1.beforeEach)(async () => {
    await comparison_service_1.comparisonService.reset();
    await discover_service_1.discoverService.resetToMockData();
});
(0, node_test_1.describe)('Comparison Service', () => {
    (0, node_test_1.describe)('addToComparison', () => {
        (0, node_test_1.default)('should successfully add a coach to comparison', async () => {
            const result = await comparison_service_1.comparisonService.addToComparison('coach_mike');
            node_assert_1.default.strictEqual(result.success, true);
            node_assert_1.default.strictEqual(result.currentCount, 1);
            node_assert_1.default.strictEqual(result.maxCount, 3);
            node_assert_1.default.ok(result.message.includes('Mike'));
        });
        (0, node_test_1.default)('should not add the same coach twice', async () => {
            await comparison_service_1.comparisonService.addToComparison('coach_mike');
            const result = await comparison_service_1.comparisonService.addToComparison('coach_mike');
            node_assert_1.default.strictEqual(result.success, false);
            node_assert_1.default.strictEqual(result.currentCount, 1);
            node_assert_1.default.ok(result.message.includes('already'));
        });
        (0, node_test_1.default)('should enforce maximum 3 coaches limit', async () => {
            await comparison_service_1.comparisonService.addToComparison('coach_mike');
            await comparison_service_1.comparisonService.addToComparison('coach_david');
            await comparison_service_1.comparisonService.addToComparison('coach_amy');
            const result = await comparison_service_1.comparisonService.addToComparison('coach_oliver');
            node_assert_1.default.strictEqual(result.success, false);
            node_assert_1.default.strictEqual(result.currentCount, 3);
            node_assert_1.default.ok(result.message.includes('Maximum'));
        });
        (0, node_test_1.default)('should fail for non-existent coach', async () => {
            const result = await comparison_service_1.comparisonService.addToComparison('non_existent_coach');
            node_assert_1.default.strictEqual(result.success, false);
            node_assert_1.default.ok(result.message.includes('not found'));
        });
    });
    (0, node_test_1.describe)('removeFromComparison', () => {
        (0, node_test_1.default)('should successfully remove a coach from comparison', async () => {
            await comparison_service_1.comparisonService.addToComparison('coach_mike');
            await comparison_service_1.comparisonService.addToComparison('coach_david');
            await comparison_service_1.comparisonService.removeFromComparison('coach_mike');
            const list = await comparison_service_1.comparisonService.getComparisonList();
            node_assert_1.default.strictEqual(list.length, 1);
            node_assert_1.default.ok(!list.includes('coach_mike'));
            node_assert_1.default.ok(list.includes('coach_david'));
        });
        (0, node_test_1.default)('should handle removing non-existent coach gracefully', async () => {
            await comparison_service_1.comparisonService.addToComparison('coach_mike');
            // Should not throw
            await comparison_service_1.comparisonService.removeFromComparison('non_existent');
            const list = await comparison_service_1.comparisonService.getComparisonList();
            node_assert_1.default.strictEqual(list.length, 1);
        });
    });
    (0, node_test_1.describe)('getComparisonList', () => {
        (0, node_test_1.default)('should return empty list initially', async () => {
            const list = await comparison_service_1.comparisonService.getComparisonList();
            node_assert_1.default.strictEqual(list.length, 0);
        });
        (0, node_test_1.default)('should return all added coach IDs', async () => {
            await comparison_service_1.comparisonService.addToComparison('coach_mike');
            await comparison_service_1.comparisonService.addToComparison('coach_david');
            const list = await comparison_service_1.comparisonService.getComparisonList();
            node_assert_1.default.strictEqual(list.length, 2);
            node_assert_1.default.ok(list.includes('coach_mike'));
            node_assert_1.default.ok(list.includes('coach_david'));
        });
    });
    (0, node_test_1.describe)('getComparisonData', () => {
        (0, node_test_1.default)('should return coach comparison data for valid IDs', async () => {
            const data = await comparison_service_1.comparisonService.getComparisonData(['coach_mike', 'coach_david']);
            node_assert_1.default.strictEqual(data.length, 2);
            const mike = data.find((c) => c.coachId === 'coach_mike');
            node_assert_1.default.ok(mike);
            node_assert_1.default.strictEqual(mike.name, 'Mike Thompson');
            node_assert_1.default.ok(mike.rating > 0);
            node_assert_1.default.ok(mike.price.min > 0);
            node_assert_1.default.ok(mike.specialties.length > 0);
        });
        (0, node_test_1.default)('should skip invalid coach IDs', async () => {
            const data = await comparison_service_1.comparisonService.getComparisonData([
                'coach_mike',
                'invalid_coach',
                'coach_david',
            ]);
            node_assert_1.default.strictEqual(data.length, 2);
        });
        (0, node_test_1.default)('should return empty array for all invalid IDs', async () => {
            const data = await comparison_service_1.comparisonService.getComparisonData(['invalid1', 'invalid2']);
            node_assert_1.default.strictEqual(data.length, 0);
        });
    });
    (0, node_test_1.describe)('getComparisonState', () => {
        (0, node_test_1.default)('should return full comparison state', async () => {
            await comparison_service_1.comparisonService.addToComparison('coach_mike');
            await comparison_service_1.comparisonService.addToComparison('coach_david');
            const state = await comparison_service_1.comparisonService.getComparisonState();
            node_assert_1.default.strictEqual(state.selectedCoachIds.length, 2);
            node_assert_1.default.strictEqual(state.coaches.length, 2);
            node_assert_1.default.strictEqual(state.maxCoaches, 3);
            node_assert_1.default.strictEqual(state.highlightCriteria, null);
        });
    });
    (0, node_test_1.describe)('clearComparison', () => {
        (0, node_test_1.default)('should remove all coaches from comparison', async () => {
            await comparison_service_1.comparisonService.addToComparison('coach_mike');
            await comparison_service_1.comparisonService.addToComparison('coach_david');
            await comparison_service_1.comparisonService.addToComparison('coach_amy');
            await comparison_service_1.comparisonService.clearComparison();
            const list = await comparison_service_1.comparisonService.getComparisonList();
            node_assert_1.default.strictEqual(list.length, 0);
        });
    });
    (0, node_test_1.describe)('isInComparison', () => {
        (0, node_test_1.default)('should return true for coaches in comparison', async () => {
            await comparison_service_1.comparisonService.addToComparison('coach_mike');
            const result = await comparison_service_1.comparisonService.isInComparison('coach_mike');
            node_assert_1.default.strictEqual(result, true);
        });
        (0, node_test_1.default)('should return false for coaches not in comparison', async () => {
            await comparison_service_1.comparisonService.addToComparison('coach_mike');
            const result = await comparison_service_1.comparisonService.isInComparison('coach_david');
            node_assert_1.default.strictEqual(result, false);
        });
    });
    (0, node_test_1.describe)('getComparisonCount', () => {
        (0, node_test_1.default)('should return correct count', async () => {
            node_assert_1.default.strictEqual(await comparison_service_1.comparisonService.getComparisonCount(), 0);
            await comparison_service_1.comparisonService.addToComparison('coach_mike');
            node_assert_1.default.strictEqual(await comparison_service_1.comparisonService.getComparisonCount(), 1);
            await comparison_service_1.comparisonService.addToComparison('coach_david');
            node_assert_1.default.strictEqual(await comparison_service_1.comparisonService.getComparisonCount(), 2);
        });
    });
    (0, node_test_1.describe)('canAddMore', () => {
        (0, node_test_1.default)('should return true when under limit', async () => {
            await comparison_service_1.comparisonService.addToComparison('coach_mike');
            const canAdd = await comparison_service_1.comparisonService.canAddMore();
            node_assert_1.default.strictEqual(canAdd, true);
        });
        (0, node_test_1.default)('should return false when at limit', async () => {
            await comparison_service_1.comparisonService.addToComparison('coach_mike');
            await comparison_service_1.comparisonService.addToComparison('coach_david');
            await comparison_service_1.comparisonService.addToComparison('coach_amy');
            const canAdd = await comparison_service_1.comparisonService.canAddMore();
            node_assert_1.default.strictEqual(canAdd, false);
        });
    });
    (0, node_test_1.describe)('getMaxCoaches', () => {
        (0, node_test_1.default)('should return 3', () => {
            node_assert_1.default.strictEqual(comparison_service_1.comparisonService.getMaxCoaches(), 3);
        });
    });
    (0, node_test_1.describe)('getBestValue', () => {
        const mockCoaches = [
            {
                coachId: 'coach1',
                name: 'Coach One',
                avatar: '',
                rating: 4.8,
                reviewCount: 50,
                price: { min: 50, max: 80, currency: 'USD' },
                specialties: ['Dribbling'],
                sessionTypes: ['In-person'],
                availability: { nextSlot: '2024-01-15T10:00:00Z', slotsThisWeek: 3 },
                totalSessions: 200,
                distanceMiles: 5,
                languages: ['English'],
                yearsExperience: 3,
                badges: [],
                shortBio: '',
            },
            {
                coachId: 'coach2',
                name: 'Coach Two',
                avatar: '',
                rating: 4.5,
                reviewCount: 30,
                price: { min: 40, max: 60, currency: 'USD' },
                specialties: ['Passing'],
                sessionTypes: ['Virtual'],
                availability: { nextSlot: '2024-01-14T10:00:00Z', slotsThisWeek: 5 },
                totalSessions: 150,
                distanceMiles: 3,
                languages: ['English', 'Spanish'],
                yearsExperience: 2,
                badges: [],
                shortBio: '',
            },
            {
                coachId: 'coach3',
                name: 'Coach Three',
                avatar: '',
                rating: 4.9,
                reviewCount: 80,
                price: { min: 60, max: 100, currency: 'USD' },
                specialties: ['Finishing'],
                sessionTypes: ['Small group'],
                availability: { nextSlot: null, slotsThisWeek: 0 },
                totalSessions: 300,
                distanceMiles: 8,
                languages: ['English'],
                yearsExperience: 5,
                badges: [],
                shortBio: '',
            },
        ];
        (0, node_test_1.default)('should return coach with lowest price for PRICE criteria', () => {
            const bestPrice = comparison_service_1.comparisonService.getBestValue(mockCoaches, 'PRICE');
            node_assert_1.default.strictEqual(bestPrice, 'coach2'); // min price 40
        });
        (0, node_test_1.default)('should return coach with highest rating for RATING criteria', () => {
            const bestRating = comparison_service_1.comparisonService.getBestValue(mockCoaches, 'RATING');
            node_assert_1.default.strictEqual(bestRating, 'coach3'); // rating 4.9
        });
        (0, node_test_1.default)('should return coach with most sessions for EXPERIENCE criteria', () => {
            const bestExperience = comparison_service_1.comparisonService.getBestValue(mockCoaches, 'EXPERIENCE');
            node_assert_1.default.strictEqual(bestExperience, 'coach3'); // 300 sessions
        });
        (0, node_test_1.default)('should return coach with soonest availability for AVAILABILITY criteria', () => {
            const bestAvailability = comparison_service_1.comparisonService.getBestValue(mockCoaches, 'AVAILABILITY');
            node_assert_1.default.strictEqual(bestAvailability, 'coach2'); // Jan 14th (earliest)
        });
        (0, node_test_1.default)('should return null for AVAILABILITY when no coaches have availability', () => {
            const coachesNoAvailability = mockCoaches.map((c) => ({
                ...c,
                availability: { nextSlot: null, slotsThisWeek: 0 },
            }));
            const result = comparison_service_1.comparisonService.getBestValue(coachesNoAvailability, 'AVAILABILITY');
            node_assert_1.default.strictEqual(result, null);
        });
        (0, node_test_1.default)('should return null for empty coaches array', () => {
            node_assert_1.default.strictEqual(comparison_service_1.comparisonService.getBestValue([], 'PRICE'), null);
            node_assert_1.default.strictEqual(comparison_service_1.comparisonService.getBestValue([], 'RATING'), null);
            node_assert_1.default.strictEqual(comparison_service_1.comparisonService.getBestValue([], 'EXPERIENCE'), null);
            node_assert_1.default.strictEqual(comparison_service_1.comparisonService.getBestValue([], 'AVAILABILITY'), null);
        });
    });
});
