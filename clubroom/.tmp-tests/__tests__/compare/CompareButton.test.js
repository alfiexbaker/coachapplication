"use strict";
/**
 * CompareButton Component Tests
 *
 * Tests for the compare button component including:
 * - Rendering in different variants
 * - Adding/removing coaches
 * - Disabled state when at max capacity
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
(0, node_test_1.describe)('CompareButton Component Logic', () => {
    (0, node_test_1.describe)('Initial State', () => {
        (0, node_test_1.default)('should show not in comparison initially', async () => {
            const isIn = await comparison_service_1.comparisonService.isInComparison('coach_mike');
            node_assert_1.default.strictEqual(isIn, false);
        });
        (0, node_test_1.default)('should allow adding when list is empty', async () => {
            const canAdd = await comparison_service_1.comparisonService.canAddMore();
            node_assert_1.default.strictEqual(canAdd, true);
        });
    });
    (0, node_test_1.describe)('Add Behavior', () => {
        (0, node_test_1.default)('should successfully add coach on press', async () => {
            const result = await comparison_service_1.comparisonService.addToComparison('coach_mike');
            node_assert_1.default.strictEqual(result.success, true);
            const isIn = await comparison_service_1.comparisonService.isInComparison('coach_mike');
            node_assert_1.default.strictEqual(isIn, true);
        });
        (0, node_test_1.default)('should update state after adding', async () => {
            await comparison_service_1.comparisonService.addToComparison('coach_mike');
            const count = await comparison_service_1.comparisonService.getComparisonCount();
            node_assert_1.default.strictEqual(count, 1);
            const canAdd = await comparison_service_1.comparisonService.canAddMore();
            node_assert_1.default.strictEqual(canAdd, true);
        });
    });
    (0, node_test_1.describe)('Remove Behavior', () => {
        (0, node_test_1.default)('should successfully remove coach on press when in comparison', async () => {
            await comparison_service_1.comparisonService.addToComparison('coach_mike');
            await comparison_service_1.comparisonService.removeFromComparison('coach_mike');
            const isIn = await comparison_service_1.comparisonService.isInComparison('coach_mike');
            node_assert_1.default.strictEqual(isIn, false);
        });
    });
    (0, node_test_1.describe)('Disabled State', () => {
        (0, node_test_1.default)('should be disabled when at max capacity and coach not in list', async () => {
            await comparison_service_1.comparisonService.addToComparison('coach_mike');
            await comparison_service_1.comparisonService.addToComparison('coach_david');
            await comparison_service_1.comparisonService.addToComparison('coach_amy');
            const canAdd = await comparison_service_1.comparisonService.canAddMore();
            const isOliverIn = await comparison_service_1.comparisonService.isInComparison('coach_oliver');
            // Button should be disabled for coach_oliver
            node_assert_1.default.strictEqual(canAdd, false);
            node_assert_1.default.strictEqual(isOliverIn, false);
        });
        (0, node_test_1.default)('should NOT be disabled for coach already in comparison even at max', async () => {
            await comparison_service_1.comparisonService.addToComparison('coach_mike');
            await comparison_service_1.comparisonService.addToComparison('coach_david');
            await comparison_service_1.comparisonService.addToComparison('coach_amy');
            const canAdd = await comparison_service_1.comparisonService.canAddMore();
            const isMikeIn = await comparison_service_1.comparisonService.isInComparison('coach_mike');
            // Mike should still be able to be removed
            node_assert_1.default.strictEqual(canAdd, false);
            node_assert_1.default.strictEqual(isMikeIn, true);
        });
    });
    (0, node_test_1.describe)('State Change Callback', () => {
        (0, node_test_1.default)('should provide correct state after add', async () => {
            const result = await comparison_service_1.comparisonService.addToComparison('coach_mike');
            node_assert_1.default.strictEqual(result.success, true);
            node_assert_1.default.strictEqual(result.currentCount, 1);
        });
        (0, node_test_1.default)('should provide correct state after remove', async () => {
            await comparison_service_1.comparisonService.addToComparison('coach_mike');
            await comparison_service_1.comparisonService.addToComparison('coach_david');
            await comparison_service_1.comparisonService.removeFromComparison('coach_mike');
            const count = await comparison_service_1.comparisonService.getComparisonCount();
            node_assert_1.default.strictEqual(count, 1);
        });
    });
});
(0, node_test_1.describe)('CompareButton Variants', () => {
    (0, node_test_1.describe)('Icon Variant', () => {
        (0, node_test_1.default)('should work with icon variant behavior', async () => {
            // Icon variant should still add/remove correctly
            const result = await comparison_service_1.comparisonService.addToComparison('coach_mike');
            node_assert_1.default.strictEqual(result.success, true);
        });
    });
    (0, node_test_1.describe)('Compact Variant', () => {
        (0, node_test_1.default)('should work with compact variant behavior', async () => {
            // Compact variant should still add/remove correctly
            const result = await comparison_service_1.comparisonService.addToComparison('coach_david');
            node_assert_1.default.strictEqual(result.success, true);
        });
    });
    (0, node_test_1.describe)('Full Variant', () => {
        (0, node_test_1.default)('should work with full variant behavior', async () => {
            // Full variant should still add/remove correctly
            const result = await comparison_service_1.comparisonService.addToComparison('coach_amy');
            node_assert_1.default.strictEqual(result.success, true);
        });
    });
});
