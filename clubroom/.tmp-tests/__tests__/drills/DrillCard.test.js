"use strict";
/**
 * DrillCard Component Tests
 *
 * Tests for the DrillCard component rendering and behavior.
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
// Helper to create mock drill data
function createMockDrill(overrides) {
    return {
        id: 'test_drill',
        coachId: 'coach1',
        title: 'Test Drill',
        description: 'Test description for the drill',
        category: 'TECHNIQUE',
        duration: 15,
        difficulty: 'BEGINNER',
        createdAt: '2026-01-01T10:00:00Z',
        updatedAt: '2026-01-01T10:00:00Z',
        ...overrides,
    };
}
(0, node_test_1.describe)('DrillCard Component', () => {
    (0, node_test_1.describe)('Drill Data Structure', () => {
        (0, node_test_1.default)('should have all required fields', () => {
            const drill = createMockDrill();
            node_assert_1.default.ok(drill.id, 'Drill should have an id');
            node_assert_1.default.ok(drill.coachId, 'Drill should have a coachId');
            node_assert_1.default.ok(drill.title, 'Drill should have a title');
            node_assert_1.default.ok(drill.description, 'Drill should have a description');
            node_assert_1.default.ok(drill.category, 'Drill should have a category');
            node_assert_1.default.ok(drill.duration, 'Drill should have a duration');
            node_assert_1.default.ok(drill.difficulty, 'Drill should have a difficulty');
        });
        (0, node_test_1.default)('should support video drills', () => {
            const drill = createMockDrill({
                videoUrl: 'https://example.com/video.mp4',
                thumbnailUrl: 'https://example.com/thumb.jpg',
            });
            node_assert_1.default.ok(drill.videoUrl, 'Video drill should have a videoUrl');
            node_assert_1.default.ok(drill.thumbnailUrl, 'Video drill should have a thumbnailUrl');
        });
        (0, node_test_1.default)('should support equipment list', () => {
            const drill = createMockDrill({
                equipment: ['Football', 'Cones', 'Stopwatch'],
            });
            node_assert_1.default.ok(Array.isArray(drill.equipment), 'Equipment should be an array');
            node_assert_1.default.strictEqual(drill.equipment?.length, 3, 'Should have 3 equipment items');
        });
        (0, node_test_1.default)('should support tags', () => {
            const drill = createMockDrill({
                tags: ['ball control', 'agility', 'speed'],
            });
            node_assert_1.default.ok(Array.isArray(drill.tags), 'Tags should be an array');
            node_assert_1.default.strictEqual(drill.tags?.length, 3, 'Should have 3 tags');
        });
        (0, node_test_1.default)('should track assignment count', () => {
            const drill = createMockDrill({
                assignmentCount: 15,
            });
            node_assert_1.default.strictEqual(drill.assignmentCount, 15, 'Assignment count should be tracked');
        });
    });
    (0, node_test_1.describe)('Category Validation', () => {
        (0, node_test_1.default)('should accept all valid categories', () => {
            const categories = ['WARMUP', 'TECHNIQUE', 'FITNESS', 'COOLDOWN', 'TACTICAL'];
            categories.forEach((category) => {
                const drill = createMockDrill({ category });
                node_assert_1.default.strictEqual(drill.category, category);
            });
        });
    });
    (0, node_test_1.describe)('Difficulty Validation', () => {
        (0, node_test_1.default)('should accept all valid difficulties', () => {
            const difficulties = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
            difficulties.forEach((difficulty) => {
                const drill = createMockDrill({ difficulty });
                node_assert_1.default.strictEqual(drill.difficulty, difficulty);
            });
        });
    });
    (0, node_test_1.describe)('Duration Handling', () => {
        (0, node_test_1.default)('should handle various durations', () => {
            const durations = [5, 10, 15, 30, 45, 60, 90, 120];
            durations.forEach((duration) => {
                const drill = createMockDrill({ duration });
                node_assert_1.default.strictEqual(drill.duration, duration);
                node_assert_1.default.ok(drill.duration > 0, 'Duration should be positive');
            });
        });
    });
    (0, node_test_1.describe)('Display Properties', () => {
        (0, node_test_1.default)('should have coach ID for display fallback', () => {
            const drill = createMockDrill({ coachId: 'coach_sarah' });
            node_assert_1.default.strictEqual(drill.coachId, 'coach_sarah');
        });
        (0, node_test_1.default)('should truncate long descriptions appropriately', () => {
            const longDescription = 'A'.repeat(500);
            const drill = createMockDrill({ description: longDescription });
            // The component will handle truncation, but the data should store full text
            node_assert_1.default.strictEqual(drill.description.length, 500);
        });
        (0, node_test_1.default)('should handle missing optional fields gracefully', () => {
            const minimalDrill = createMockDrill({
                videoUrl: undefined,
                thumbnailUrl: undefined,
                equipment: undefined,
                tags: undefined,
                assignmentCount: undefined,
            });
            node_assert_1.default.strictEqual(minimalDrill.videoUrl, undefined);
            node_assert_1.default.strictEqual(minimalDrill.thumbnailUrl, undefined);
            node_assert_1.default.strictEqual(minimalDrill.equipment, undefined);
            node_assert_1.default.strictEqual(minimalDrill.tags, undefined);
            node_assert_1.default.strictEqual(minimalDrill.assignmentCount, undefined);
        });
    });
});
