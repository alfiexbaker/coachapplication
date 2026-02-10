"use strict";
/**
 * ComparisonTable Component Tests
 *
 * Tests for the comparison table component including:
 * - Loading state handling
 * - Empty state handling
 * - Best value highlighting
 * - Coach removal
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
const expectOk = (result) => {
    node_assert_1.default.strictEqual(result.success, true);
    if (!result.success) {
        throw new Error('Expected successful result');
    }
    return result.data;
};
// Reset services before each test
(0, node_test_1.beforeEach)(async () => {
    expectOk(await comparison_service_1.comparisonService.reset());
    expectOk(await discover_service_1.discoverService.resetToMockData());
});
(0, node_test_1.describe)('ComparisonTable Component Logic', () => {
    (0, node_test_1.describe)('Data Loading', () => {
        (0, node_test_1.default)('should load comparison data for selected coaches', async () => {
            expectOk(await comparison_service_1.comparisonService.addToComparison('coach_mike'));
            expectOk(await comparison_service_1.comparisonService.addToComparison('coach_david'));
            const state = expectOk(await comparison_service_1.comparisonService.getComparisonState());
            node_assert_1.default.strictEqual(state.coaches.length, 2);
            node_assert_1.default.ok(state.coaches.some((c) => c.coachId === 'coach_mike'));
            node_assert_1.default.ok(state.coaches.some((c) => c.coachId === 'coach_david'));
        });
        (0, node_test_1.default)('should load data for specific coach IDs', async () => {
            const data = expectOk(await comparison_service_1.comparisonService.getComparisonData([
                'coach_mike',
                'coach_amy',
                'coach_oliver',
            ]));
            node_assert_1.default.strictEqual(data.length, 3);
        });
    });
    (0, node_test_1.describe)('Empty State', () => {
        (0, node_test_1.default)('should return empty coaches when none selected', async () => {
            const state = expectOk(await comparison_service_1.comparisonService.getComparisonState());
            node_assert_1.default.strictEqual(state.coaches.length, 0);
            node_assert_1.default.strictEqual(state.selectedCoachIds.length, 0);
        });
    });
    (0, node_test_1.describe)('Best Value Highlighting', () => {
        (0, node_test_1.default)('should correctly identify best price', async () => {
            const data = expectOk(await comparison_service_1.comparisonService.getComparisonData([
                'coach_mike',
                'coach_david',
                'coach_harry', // Harry has lowest price ($35-50)
            ]));
            const bestPrice = comparison_service_1.comparisonService.getBestValue(data, 'PRICE');
            // coach_harry has the lowest minimum price
            node_assert_1.default.strictEqual(bestPrice, 'coach_harry');
        });
        (0, node_test_1.default)('should correctly identify best rating', async () => {
            const data = expectOk(await comparison_service_1.comparisonService.getComparisonData([
                'coach_mike',
                'coach_david',
                'coach_oliver', // Oliver has highest rating (4.9)
            ]));
            const bestRating = comparison_service_1.comparisonService.getBestValue(data, 'RATING');
            node_assert_1.default.strictEqual(bestRating, 'coach_oliver');
        });
        (0, node_test_1.default)('should correctly identify most experienced', async () => {
            const data = expectOk(await comparison_service_1.comparisonService.getComparisonData([
                'coach_mike',
                'coach_david',
                'coach_oliver', // Oliver has most sessions (260)
            ]));
            const bestExperience = comparison_service_1.comparisonService.getBestValue(data, 'EXPERIENCE');
            node_assert_1.default.strictEqual(bestExperience, 'coach_oliver');
        });
    });
    (0, node_test_1.describe)('Coach Removal', () => {
        (0, node_test_1.default)('should update table after coach removal', async () => {
            expectOk(await comparison_service_1.comparisonService.addToComparison('coach_mike'));
            expectOk(await comparison_service_1.comparisonService.addToComparison('coach_david'));
            expectOk(await comparison_service_1.comparisonService.addToComparison('coach_amy'));
            expectOk(await comparison_service_1.comparisonService.removeFromComparison('coach_david'));
            const state = expectOk(await comparison_service_1.comparisonService.getComparisonState());
            node_assert_1.default.strictEqual(state.coaches.length, 2);
            node_assert_1.default.ok(!state.coaches.some((c) => c.coachId === 'coach_david'));
        });
    });
    (0, node_test_1.describe)('Coach Data Transformation', () => {
        (0, node_test_1.default)('should include all required comparison fields', async () => {
            const data = expectOk(await comparison_service_1.comparisonService.getComparisonData(['coach_mike']));
            const coach = data[0];
            node_assert_1.default.ok(coach);
            node_assert_1.default.ok(typeof coach.coachId === 'string');
            node_assert_1.default.ok(typeof coach.name === 'string');
            node_assert_1.default.ok(typeof coach.avatar === 'string');
            node_assert_1.default.ok(typeof coach.rating === 'number');
            node_assert_1.default.ok(typeof coach.reviewCount === 'number');
            node_assert_1.default.ok(typeof coach.price.min === 'number');
            node_assert_1.default.ok(typeof coach.price.max === 'number');
            node_assert_1.default.ok(Array.isArray(coach.specialties));
            node_assert_1.default.ok(Array.isArray(coach.sessionTypes));
            node_assert_1.default.ok(typeof coach.availability === 'object');
            node_assert_1.default.ok(typeof coach.totalSessions === 'number');
            node_assert_1.default.ok(typeof coach.distanceMiles === 'number');
            node_assert_1.default.ok(Array.isArray(coach.languages));
            node_assert_1.default.ok(typeof coach.yearsExperience === 'number');
            node_assert_1.default.ok(Array.isArray(coach.badges));
            node_assert_1.default.ok(typeof coach.shortBio === 'string');
        });
        (0, node_test_1.default)('should calculate years of experience correctly', async () => {
            const data = expectOk(await comparison_service_1.comparisonService.getComparisonData(['coach_oliver']));
            const coach = data[0];
            // Oliver joined 4 years ago (based on mock data)
            node_assert_1.default.ok(coach.yearsExperience >= 3);
            node_assert_1.default.ok(coach.yearsExperience <= 5);
        });
    });
});
(0, node_test_1.describe)('ComparisonTable with Specific IDs', () => {
    (0, node_test_1.default)('should load only specified coaches', async () => {
        // Add some coaches to the general comparison list
        expectOk(await comparison_service_1.comparisonService.addToComparison('coach_mike'));
        expectOk(await comparison_service_1.comparisonService.addToComparison('coach_david'));
        // But request specific different coaches
        const data = expectOk(await comparison_service_1.comparisonService.getComparisonData(['coach_amy', 'coach_oliver']));
        node_assert_1.default.strictEqual(data.length, 2);
        node_assert_1.default.ok(data.some((c) => c.coachId === 'coach_amy'));
        node_assert_1.default.ok(data.some((c) => c.coachId === 'coach_oliver'));
        node_assert_1.default.ok(!data.some((c) => c.coachId === 'coach_mike'));
    });
    (0, node_test_1.default)('should handle mix of valid and invalid IDs', async () => {
        const data = expectOk(await comparison_service_1.comparisonService.getComparisonData([
            'coach_mike',
            'invalid_id_1',
            'coach_david',
            'invalid_id_2',
        ]));
        node_assert_1.default.strictEqual(data.length, 2);
    });
});
