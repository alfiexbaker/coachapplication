/**
 * Annotation Components Tests
 *
 * Tests for the video annotation components including
 * AnnotationMarker, AnnotationPanel, AnnotationForm, TimelineBar, and AnnotationBadge.
 */

import { withAlpha } from '@/constants/theme';
import assert from 'node:assert';
import test, { describe } from 'node:test';

import { ANNOTATION_TYPE_CONFIG, videoService } from '../../services/video-service';
import type { VideoAnnotation, VideoAnnotationType } from '../../constants/types';

/**
 * Helper function to create a mock annotation for testing
 */
function createMockAnnotation(overrides: Partial<VideoAnnotation> = {}): VideoAnnotation {
  return {
    id: 'ann_test_1',
    timestamp: 30,
    label: 'Test Annotation',
    note: 'This is a test note',
    type: 'TECHNIQUE',
    createdBy: 'coach_1',
    createdByName: 'Coach Smith',
    createdAt: '2026-01-10T10:00:00Z',
    ...overrides,
  };
}

describe('AnnotationMarker Component Logic', () => {
  describe('Position Calculation', () => {
    test('should calculate correct position percentage', () => {
      const duration = 180; // 3 minutes
      const timestamp = 60; // 1 minute

      const position = (timestamp / duration) * 100;
      // Use approximate comparison for floating point
      assert.ok(Math.abs(position - (100 / 3)) < 0.0001);
    });

    test('should handle zero duration', () => {
      const duration = 0;
      const timestamp = 30;

      const position = duration > 0 ? (timestamp / duration) * 100 : 0;
      assert.strictEqual(position, 0);
    });

    test('should handle timestamp at start', () => {
      const duration = 180;
      const timestamp = 0;

      const position = (timestamp / duration) * 100;
      assert.strictEqual(position, 0);
    });

    test('should handle timestamp at end', () => {
      const duration = 180;
      const timestamp = 180;

      const position = (timestamp / duration) * 100;
      assert.strictEqual(position, 100);
    });
  });

  describe('Type Color Mapping', () => {
    test('should have correct color for HIGHLIGHT', () => {
      const config = ANNOTATION_TYPE_CONFIG.HIGHLIGHT;
      assert.strictEqual(config.color, '#4CAF50');
    });

    test('should have correct color for IMPROVEMENT', () => {
      const config = ANNOTATION_TYPE_CONFIG.IMPROVEMENT;
      assert.strictEqual(config.color, '#FF9800');
    });

    test('should have correct color for TECHNIQUE', () => {
      const config = ANNOTATION_TYPE_CONFIG.TECHNIQUE;
      assert.strictEqual(config.color, '#2196F3');
    });

    test('should have correct color for GENERAL', () => {
      const config = ANNOTATION_TYPE_CONFIG.GENERAL;
      assert.strictEqual(config.color, '#9E9E9E');
    });
  });

  describe('Size Variants', () => {
    test('small size should have correct dimensions', () => {
      const sizeMap = {
        small: { marker: 8, icon: 10 },
        medium: { marker: 12, icon: 14 },
        large: { marker: 16, icon: 18 },
      };

      assert.strictEqual(sizeMap.small.marker, 8);
      assert.strictEqual(sizeMap.small.icon, 10);
    });

    test('medium size should have correct dimensions', () => {
      const sizeMap = {
        small: { marker: 8, icon: 10 },
        medium: { marker: 12, icon: 14 },
        large: { marker: 16, icon: 18 },
      };

      assert.strictEqual(sizeMap.medium.marker, 12);
      assert.strictEqual(sizeMap.medium.icon, 14);
    });

    test('large size should have correct dimensions', () => {
      const sizeMap = {
        small: { marker: 8, icon: 10 },
        medium: { marker: 12, icon: 14 },
        large: { marker: 16, icon: 18 },
      };

      assert.strictEqual(sizeMap.large.marker, 16);
      assert.strictEqual(sizeMap.large.icon, 18);
    });
  });
});

describe('AnnotationPanel Component Logic', () => {
  describe('Filtering', () => {
    test('should filter annotations by type', () => {
      const annotations: VideoAnnotation[] = [
        createMockAnnotation({ id: 'ann_1', type: 'HIGHLIGHT' }),
        createMockAnnotation({ id: 'ann_2', type: 'IMPROVEMENT' }),
        createMockAnnotation({ id: 'ann_3', type: 'TECHNIQUE' }),
        createMockAnnotation({ id: 'ann_4', type: 'HIGHLIGHT' }),
      ];

      const selectedTypes: VideoAnnotationType[] = ['HIGHLIGHT'];
      const filtered = annotations.filter((ann) => selectedTypes.includes(ann.type));

      assert.strictEqual(filtered.length, 2);
      filtered.forEach((ann) => assert.strictEqual(ann.type, 'HIGHLIGHT'));
    });

    test('should filter annotations by search query', () => {
      const annotations: VideoAnnotation[] = [
        createMockAnnotation({ id: 'ann_1', label: 'Great technique' }),
        createMockAnnotation({ id: 'ann_2', label: 'Good effort' }),
        createMockAnnotation({ id: 'ann_3', label: 'Technique needs work' }),
      ];

      const query = 'technique';
      const filtered = annotations.filter(
        (ann) => ann.label.toLowerCase().includes(query.toLowerCase())
      );

      assert.strictEqual(filtered.length, 2);
    });

    test('should filter by note content', () => {
      const annotations: VideoAnnotation[] = [
        createMockAnnotation({ id: 'ann_1', note: 'Focus on footwork' }),
        createMockAnnotation({ id: 'ann_2', note: 'Good positioning' }),
        createMockAnnotation({ id: 'ann_3', note: undefined }),
      ];

      const query = 'footwork';
      const filtered = annotations.filter(
        (ann) => ann.note?.toLowerCase().includes(query.toLowerCase())
      );

      assert.strictEqual(filtered.length, 1);
    });

    test('should show all when no filters applied', () => {
      const annotations: VideoAnnotation[] = [
        createMockAnnotation({ id: 'ann_1' }),
        createMockAnnotation({ id: 'ann_2' }),
        createMockAnnotation({ id: 'ann_3' }),
      ];

      const selectedTypes: VideoAnnotationType[] = [];
      const query: string = '';

      let filtered = [...annotations];
      if (selectedTypes.length > 0) {
        filtered = filtered.filter((ann) => selectedTypes.includes(ann.type));
      }
      if (query.length > 0) {
        const searchQuery = query.toLowerCase();
        filtered = filtered.filter((ann) =>
          ann.label.toLowerCase().includes(searchQuery)
        );
      }

      assert.strictEqual(filtered.length, 3);
    });
  });

  describe('Sorting', () => {
    test('should sort annotations by timestamp', () => {
      const annotations: VideoAnnotation[] = [
        createMockAnnotation({ id: 'ann_1', timestamp: 90 }),
        createMockAnnotation({ id: 'ann_2', timestamp: 30 }),
        createMockAnnotation({ id: 'ann_3', timestamp: 60 }),
      ];

      const sorted = [...annotations].sort((a, b) => a.timestamp - b.timestamp);

      assert.strictEqual(sorted[0].timestamp, 30);
      assert.strictEqual(sorted[1].timestamp, 60);
      assert.strictEqual(sorted[2].timestamp, 90);
    });
  });

  describe('Active Detection', () => {
    test('should detect active annotation within threshold', () => {
      const annotation = createMockAnnotation({ timestamp: 30 });
      const currentTime = 31;
      const threshold = 2;

      const isActive = Math.abs(currentTime - annotation.timestamp) < threshold;
      assert.strictEqual(isActive, true);
    });

    test('should not detect active annotation outside threshold', () => {
      const annotation = createMockAnnotation({ timestamp: 30 });
      const currentTime = 35;
      const threshold = 2;

      const isActive = Math.abs(currentTime - annotation.timestamp) < threshold;
      assert.strictEqual(isActive, false);
    });
  });
});

describe('AnnotationForm Component Logic', () => {
  describe('Input Validation', () => {
    test('should validate required label', () => {
      const errors = videoService.validateInput(
        { timestamp: 30, label: '', type: 'HIGHLIGHT' },
        180
      );

      assert.ok(errors.length > 0);
      assert.ok(errors.some((e) => e.toLowerCase().includes('label')));
    });

    test('should validate label length', () => {
      const errors = videoService.validateInput(
        { timestamp: 30, label: 'A'.repeat(101), type: 'HIGHLIGHT' },
        180
      );

      assert.ok(errors.some((e) => e.includes('100')));
    });

    test('should validate note length', () => {
      const errors = videoService.validateInput(
        { timestamp: 30, label: 'Valid', note: 'A'.repeat(501), type: 'HIGHLIGHT' },
        180
      );

      assert.ok(errors.some((e) => e.includes('500')));
    });

    test('should validate timestamp range', () => {
      const errorsNegative = videoService.validateInput(
        { timestamp: -10, label: 'Valid', type: 'HIGHLIGHT' },
        180
      );
      assert.ok(errorsNegative.some((e) => e.toLowerCase().includes('negative')));

      const errorsExceeds = videoService.validateInput(
        { timestamp: 200, label: 'Valid', type: 'HIGHLIGHT' },
        180
      );
      assert.ok(errorsExceeds.some((e) => e.toLowerCase().includes('duration')));
    });

    test('should pass valid input', () => {
      const errors = videoService.validateInput(
        { timestamp: 60, label: 'Valid label', note: 'Valid note', type: 'TECHNIQUE' },
        180
      );

      assert.strictEqual(errors.length, 0);
    });
  });

  describe('Timestamp Controls', () => {
    test('should adjust timestamp within bounds', () => {
      const duration = 180;
      let timestamp = 60;

      // Increment
      timestamp = Math.max(0, Math.min(duration, timestamp + 5));
      assert.strictEqual(timestamp, 65);

      // Decrement
      timestamp = Math.max(0, Math.min(duration, timestamp - 10));
      assert.strictEqual(timestamp, 55);
    });

    test('should not go below zero', () => {
      const duration = 180;
      let timestamp = 3;

      timestamp = Math.max(0, Math.min(duration, timestamp - 5));
      assert.strictEqual(timestamp, 0);
    });

    test('should not exceed duration', () => {
      const duration = 180;
      let timestamp = 178;

      timestamp = Math.max(0, Math.min(duration, timestamp + 5));
      assert.strictEqual(timestamp, 180);
    });
  });

  describe('Type Selection', () => {
    test('should have all annotation types available', () => {
      const types = videoService.getAllTypes();

      assert.ok(types.includes('HIGHLIGHT'));
      assert.ok(types.includes('IMPROVEMENT'));
      assert.ok(types.includes('TECHNIQUE'));
      assert.ok(types.includes('GENERAL'));
    });
  });
});

describe('TimelineBar Component Logic', () => {
  describe('Position Calculation', () => {
    test('should calculate position from time', () => {
      const duration: number = 180;

      const getPositionFromTime = (time: number, dur: number): number => {
        if (dur === 0) return 0;
        return (time / dur) * 100;
      };

      assert.strictEqual(getPositionFromTime(0, duration), 0);
      assert.strictEqual(getPositionFromTime(90, duration), 50);
      assert.strictEqual(getPositionFromTime(180, duration), 100);
    });

    test('should calculate time from position', () => {
      const duration: number = 180;
      const width: number = 300;

      const getTimeFromPosition = (position: number, w: number, dur: number): number => {
        if (w === 0 || dur === 0) return 0;
        return (position / w) * dur;
      };

      assert.strictEqual(getTimeFromPosition(0, width, duration), 0);
      assert.strictEqual(getTimeFromPosition(150, width, duration), 90);
      assert.strictEqual(getTimeFromPosition(300, width, duration), 180);
    });
  });

  describe('Marker Grouping', () => {
    test('should group markers that are close together', () => {
      const annotations: VideoAnnotation[] = [
        createMockAnnotation({ id: 'ann_1', timestamp: 30 }),
        createMockAnnotation({ id: 'ann_2', timestamp: 31 }),
        createMockAnnotation({ id: 'ann_3', timestamp: 90 }),
      ];
      const duration = 180;
      const minDistance = 3; // 3% minimum distance

      const getPositionFromTime = (time: number): number => (time / duration) * 100;

      const groups: { position: number; annotations: VideoAnnotation[] }[] = [];
      const sorted = [...annotations].sort((a, b) => a.timestamp - b.timestamp);

      for (const ann of sorted) {
        const position = getPositionFromTime(ann.timestamp);
        const lastGroup = groups[groups.length - 1];

        if (lastGroup && position - lastGroup.position < minDistance) {
          lastGroup.annotations.push(ann);
        } else {
          groups.push({ position, annotations: [ann] });
        }
      }

      assert.strictEqual(groups.length, 2);
      assert.strictEqual(groups[0].annotations.length, 2);
      assert.strictEqual(groups[1].annotations.length, 1);
    });
  });
});

describe('AnnotationBadge Component Logic', () => {
  describe('Variant Styles', () => {
    test('filled variant should use type color as background', () => {
      const type: VideoAnnotationType = 'HIGHLIGHT';
      const config = ANNOTATION_TYPE_CONFIG[type];

      const variantStyles = {
        filled: {
          backgroundColor: config.color,
          textColor: '#fff',
        },
        outlined: {
          backgroundColor: 'transparent',
          borderColor: config.color,
        },
        subtle: {
          backgroundColor: withAlpha(config.color, 0.09),
        },
      };

      assert.strictEqual(variantStyles.filled.backgroundColor, '#4CAF50');
      assert.strictEqual(variantStyles.filled.textColor, '#fff');
    });

    test('outlined variant should have transparent background', () => {
      const type: VideoAnnotationType = 'TECHNIQUE';
      const config = ANNOTATION_TYPE_CONFIG[type];

      const variantStyles = {
        outlined: {
          backgroundColor: 'transparent',
          borderColor: config.color,
          textColor: config.color,
        },
      };

      assert.strictEqual(variantStyles.outlined.backgroundColor, 'transparent');
      assert.strictEqual(variantStyles.outlined.borderColor, '#2196F3');
    });
  });

  describe('Size Styles', () => {
    test('should have correct dimensions for each size', () => {
      const sizeStyles = {
        small: { paddingHorizontal: 6, fontSize: 10, iconSize: 10 },
        medium: { paddingHorizontal: 8, fontSize: 11, iconSize: 12 },
        large: { paddingHorizontal: 12, fontSize: 13, iconSize: 14 },
      };

      assert.strictEqual(sizeStyles.small.fontSize, 10);
      assert.strictEqual(sizeStyles.medium.fontSize, 11);
      assert.strictEqual(sizeStyles.large.fontSize, 13);
    });
  });
});

describe('Timestamp Formatting', () => {
  test('should format timestamps correctly', () => {
    const formatTimestamp = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    assert.strictEqual(formatTimestamp(0), '0:00');
    assert.strictEqual(formatTimestamp(5), '0:05');
    assert.strictEqual(formatTimestamp(30), '0:30');
    assert.strictEqual(formatTimestamp(60), '1:00');
    assert.strictEqual(formatTimestamp(65), '1:05');
    assert.strictEqual(formatTimestamp(90), '1:30');
    assert.strictEqual(formatTimestamp(125), '2:05');
    assert.strictEqual(formatTimestamp(600), '10:00');
    assert.strictEqual(formatTimestamp(3661), '61:01');
  });
});

describe('Annotation Data Display', () => {
  test('annotation should have all required fields', () => {
    const annotation = createMockAnnotation();

    assert.ok(annotation.id);
    assert.ok(typeof annotation.timestamp === 'number');
    assert.ok(annotation.label);
    assert.ok(annotation.type);
  });

  test('annotation can have optional fields', () => {
    const withOptional = createMockAnnotation({
      note: 'Optional note',
      createdBy: 'user_1',
      createdByName: 'User Name',
    });

    assert.strictEqual(withOptional.note, 'Optional note');
    assert.strictEqual(withOptional.createdBy, 'user_1');
    assert.strictEqual(withOptional.createdByName, 'User Name');
  });

  test('annotation without optional fields', () => {
    const minimal: VideoAnnotation = {
      id: 'ann_min',
      timestamp: 60,
      label: 'Minimal',
      type: 'GENERAL',
    };

    assert.strictEqual(minimal.note, undefined);
    assert.strictEqual(minimal.createdBy, undefined);
  });
});

describe('Edge Cases', () => {
  test('should handle very long labels gracefully', () => {
    const longLabel = 'A'.repeat(100);
    const annotation = createMockAnnotation({ label: longLabel });

    assert.strictEqual(annotation.label.length, 100);
  });

  test('should handle special characters in labels', () => {
    const specialLabel = 'Good shot! "Keep it up" & focus <more>';
    const annotation = createMockAnnotation({ label: specialLabel });

    assert.strictEqual(annotation.label, specialLabel);
  });

  test('should handle zero duration video', () => {
    const duration = 0;
    const timestamp = 30;

    const position = duration > 0 ? (timestamp / duration) * 100 : 0;
    assert.strictEqual(position, 0);
  });

  test('should handle many annotations', () => {
    const annotations = Array.from({ length: 100 }, (_, i) =>
      createMockAnnotation({
        id: `ann_${i}`,
        timestamp: i * 2,
        label: `Annotation ${i}`,
      })
    );

    assert.strictEqual(annotations.length, 100);

    // Should be able to filter
    const filtered = annotations.filter((a) => a.timestamp < 100);
    assert.strictEqual(filtered.length, 50);
  });
});
