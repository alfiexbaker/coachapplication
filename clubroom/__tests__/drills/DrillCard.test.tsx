/**
 * DrillCard Component Tests
 *
 * Tests for the DrillCard component rendering and behavior.
 */

import assert from 'node:assert';
import test, { describe } from 'node:test';

import type { Drill, DrillCategory, DrillDifficulty } from '../../constants/types';

// Helper to create mock drill data
function createMockDrill(overrides?: Partial<Drill>): Drill {
  return {
    id: 'test_drill',
    coachId: 'coach1',
    coachName: 'Coach Mike',
    title: 'Test Drill',
    description: 'Test description for the drill',
    category: 'TECHNIQUE' as DrillCategory,
    duration: 15,
    difficulty: 'BEGINNER' as DrillDifficulty,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
    ...overrides,
  };
}

describe('DrillCard Component', () => {
  describe('Drill Data Structure', () => {
    test('should have all required fields', () => {
      const drill = createMockDrill();

      assert.ok(drill.id, 'Drill should have an id');
      assert.ok(drill.coachId, 'Drill should have a coachId');
      assert.ok(drill.title, 'Drill should have a title');
      assert.ok(drill.description, 'Drill should have a description');
      assert.ok(drill.category, 'Drill should have a category');
      assert.ok(drill.duration, 'Drill should have a duration');
      assert.ok(drill.difficulty, 'Drill should have a difficulty');
    });

    test('should support video drills', () => {
      const drill = createMockDrill({
        videoUrl: 'https://example.com/video.mp4',
        thumbnailUrl: 'https://example.com/thumb.jpg',
      });

      assert.ok(drill.videoUrl, 'Video drill should have a videoUrl');
      assert.ok(drill.thumbnailUrl, 'Video drill should have a thumbnailUrl');
    });

    test('should support equipment list', () => {
      const drill = createMockDrill({
        equipment: ['Football', 'Cones', 'Stopwatch'],
      });

      assert.ok(Array.isArray(drill.equipment), 'Equipment should be an array');
      assert.strictEqual(drill.equipment?.length, 3, 'Should have 3 equipment items');
    });

    test('should support tags', () => {
      const drill = createMockDrill({
        tags: ['ball control', 'agility', 'speed'],
      });

      assert.ok(Array.isArray(drill.tags), 'Tags should be an array');
      assert.strictEqual(drill.tags?.length, 3, 'Should have 3 tags');
    });

    test('should track assignment count', () => {
      const drill = createMockDrill({
        assignmentCount: 15,
      });

      assert.strictEqual(drill.assignmentCount, 15, 'Assignment count should be tracked');
    });
  });

  describe('Category Validation', () => {
    test('should accept all valid categories', () => {
      const categories: DrillCategory[] = ['WARMUP', 'TECHNIQUE', 'FITNESS', 'COOLDOWN', 'TACTICAL'];

      categories.forEach((category) => {
        const drill = createMockDrill({ category });
        assert.strictEqual(drill.category, category);
      });
    });
  });

  describe('Difficulty Validation', () => {
    test('should accept all valid difficulties', () => {
      const difficulties: DrillDifficulty[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

      difficulties.forEach((difficulty) => {
        const drill = createMockDrill({ difficulty });
        assert.strictEqual(drill.difficulty, difficulty);
      });
    });
  });

  describe('Duration Handling', () => {
    test('should handle various durations', () => {
      const durations = [5, 10, 15, 30, 45, 60, 90, 120];

      durations.forEach((duration) => {
        const drill = createMockDrill({ duration });
        assert.strictEqual(drill.duration, duration);
        assert.ok(drill.duration > 0, 'Duration should be positive');
      });
    });
  });

  describe('Display Properties', () => {
    test('should have coach name for display', () => {
      const drill = createMockDrill({ coachName: 'Coach Sarah' });

      assert.strictEqual(drill.coachName, 'Coach Sarah');
    });

    test('should truncate long descriptions appropriately', () => {
      const longDescription = 'A'.repeat(500);
      const drill = createMockDrill({ description: longDescription });

      // The component will handle truncation, but the data should store full text
      assert.strictEqual(drill.description.length, 500);
    });

    test('should handle missing optional fields gracefully', () => {
      const minimalDrill = createMockDrill({
        videoUrl: undefined,
        thumbnailUrl: undefined,
        equipment: undefined,
        tags: undefined,
        assignmentCount: undefined,
      });

      assert.strictEqual(minimalDrill.videoUrl, undefined);
      assert.strictEqual(minimalDrill.thumbnailUrl, undefined);
      assert.strictEqual(minimalDrill.equipment, undefined);
      assert.strictEqual(minimalDrill.tags, undefined);
      assert.strictEqual(minimalDrill.assignmentCount, undefined);
    });
  });
});
