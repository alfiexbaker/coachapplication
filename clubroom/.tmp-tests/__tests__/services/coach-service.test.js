"use strict";
/**
 * Coach Service Tests
 *
 * Tests for coach CRUD with Result pattern: getCoach, getCoaches,
 * getCoachReviews, submitReview, searchCoaches, getFeaturedCoaches, toggleFollow.
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
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importStar(require("node:test"));
const coach_service_1 = require("../../services/coach-service");
(0, node_test_1.describe)('coachService', () => {
    // ---------------------------------------------------------------------------
    // getCoach
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getCoach', () => {
        (0, node_test_1.default)('returns ok with coach data for known ID', async () => {
            const result = await coach_service_1.coachService.getCoach('coach-1');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.id, 'coach-1');
                strict_1.default.equal(result.data.name, 'Marcus Johnson');
                strict_1.default.ok(result.data.rating > 0);
            }
        });
        (0, node_test_1.default)('returns err for unknown ID', async () => {
            const result = await coach_service_1.coachService.getCoach('nonexistent-coach-xyz');
            strict_1.default.equal(result.success, false);
        });
    });
    // ---------------------------------------------------------------------------
    // getCoaches
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getCoaches', () => {
        (0, node_test_1.default)('returns ok with array of coaches', async () => {
            const result = await coach_service_1.coachService.getCoaches();
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.ok(Array.isArray(result.data));
                strict_1.default.ok(result.data.length >= 2);
            }
        });
        (0, node_test_1.default)('filters by minRating', async () => {
            const result = await coach_service_1.coachService.getCoaches({ minRating: 4.9 });
            strict_1.default.equal(result.success, true);
            if (result.success) {
                for (const coach of result.data) {
                    strict_1.default.ok(coach.rating >= 4.9);
                }
            }
        });
        (0, node_test_1.default)('filters by maxPrice', async () => {
            const result = await coach_service_1.coachService.getCoaches({ maxPrice: 40 });
            strict_1.default.equal(result.success, true);
            if (result.success) {
                for (const coach of result.data) {
                    strict_1.default.ok(coach.minPriceUsd <= 40);
                }
            }
        });
        (0, node_test_1.default)('filters by sport', async () => {
            const result = await coach_service_1.coachService.getCoaches({ sport: 'Football' });
            strict_1.default.equal(result.success, true);
            if (result.success) {
                for (const coach of result.data) {
                    strict_1.default.ok(coach.sports.some((s) => s.toLowerCase() === 'football'));
                }
            }
        });
    });
    // ---------------------------------------------------------------------------
    // getCoachReviews
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getCoachReviews', () => {
        (0, node_test_1.default)('returns ok with reviews for known coach', async () => {
            const result = await coach_service_1.coachService.getCoachReviews('coach-1');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.ok(result.data.length > 0);
                for (const review of result.data) {
                    strict_1.default.equal(review.coachId, 'coach-1');
                }
            }
        });
        (0, node_test_1.default)('returns ok with empty array for coach with no reviews', async () => {
            const result = await coach_service_1.coachService.getCoachReviews('coach-no-reviews-xyz');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.length, 0);
            }
        });
    });
    // ---------------------------------------------------------------------------
    // submitReview
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('submitReview', () => {
        (0, node_test_1.default)('creates a new review and returns ok', async () => {
            const result = await coach_service_1.coachService.submitReview('coach-1', {
                rating: 5,
                comment: 'Great session!',
                sessionType: '1-on-1',
            });
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.ok(result.data.id);
                strict_1.default.equal(result.data.coachId, 'coach-1');
                strict_1.default.equal(result.data.rating, 5);
                strict_1.default.equal(result.data.comment, 'Great session!');
            }
        });
    });
    // ---------------------------------------------------------------------------
    // searchCoaches
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('searchCoaches', () => {
        (0, node_test_1.default)('finds coaches by name', async () => {
            const result = await coach_service_1.coachService.searchCoaches('Marcus');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.ok(result.data.some((c) => c.name.includes('Marcus')));
            }
        });
        (0, node_test_1.default)('finds coaches by focus area', async () => {
            const result = await coach_service_1.coachService.searchCoaches('Dribbling');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.ok(result.data.length > 0);
            }
        });
        (0, node_test_1.default)('returns empty for no match', async () => {
            const result = await coach_service_1.coachService.searchCoaches('xyznonexistent123');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.length, 0);
            }
        });
    });
    // ---------------------------------------------------------------------------
    // getFeaturedCoaches
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getFeaturedCoaches', () => {
        (0, node_test_1.default)('returns ok with sorted coaches', async () => {
            const result = await coach_service_1.coachService.getFeaturedCoaches();
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.ok(result.data.length > 0);
                // Should be sorted by rating descending
                for (let i = 1; i < result.data.length; i++) {
                    strict_1.default.ok(result.data[i - 1].rating >= result.data[i].rating);
                }
            }
        });
    });
    // ---------------------------------------------------------------------------
    // toggleFollow
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('toggleFollow', () => {
        (0, node_test_1.default)('returns ok with boolean', async () => {
            const result = await coach_service_1.coachService.toggleFollow('coach-1', 'user-1');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(typeof result.data, 'boolean');
            }
        });
    });
});
