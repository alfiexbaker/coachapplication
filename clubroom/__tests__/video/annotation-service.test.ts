/**
 * Annotation Service Tests
 *
 * Unit tests for the annotation service functionality including
 * CRUD operations, export features, and helper functions.
 */

import assert from 'node:assert';
import test, { describe, beforeEach } from 'node:test';

import { annotationService, ANNOTATION_TYPE_CONFIG, CreateAnnotationInput } from '../../services/annotation-service';
import { videoService } from '../../services/video-service';
import type { VideoAnnotationType } from '../../constants/types';

describe('Annotation Service', () => {
  describe('getAnnotatedVideo', () => {
    test('should return annotated video with sorted annotations', async () => {
      const video = await annotationService.getAnnotatedVideo('vid_1');

      assert.ok(video);
      assert.strictEqual(video.id, 'vid_1');
      assert.ok(Array.isArray(video.annotations));

      // Check annotations are sorted by timestamp
      for (let i = 1; i < video.annotations.length; i++) {
        assert.ok(
          video.annotations[i].timestamp >= video.annotations[i - 1].timestamp,
          'Annotations should be sorted by timestamp'
        );
      }
    });

    test('should return null for non-existent video', async () => {
      const video = await annotationService.getAnnotatedVideo('non_existent');

      assert.strictEqual(video, null);
    });
  });

  describe('getVideoAnnotations', () => {
    test('should return sorted annotations for a video', async () => {
      const annotations = await annotationService.getVideoAnnotations('vid_1');

      assert.ok(Array.isArray(annotations));
      assert.ok(annotations.length > 0);

      // Check sorting
      for (let i = 1; i < annotations.length; i++) {
        assert.ok(annotations[i].timestamp >= annotations[i - 1].timestamp);
      }
    });

    test('should return empty array for video with no annotations', async () => {
      const annotations = await annotationService.getVideoAnnotations('vid_3');

      assert.ok(Array.isArray(annotations));
      // vid_3 has no annotations in mock data
    });

    test('should return empty array for non-existent video', async () => {
      const annotations = await annotationService.getVideoAnnotations('non_existent');

      assert.deepStrictEqual(annotations, []);
    });
  });

  describe('addAnnotation', () => {
    test('should add a new annotation to a video', async () => {
      const input: CreateAnnotationInput = {
        timestamp: 60,
        label: 'Test Annotation',
        note: 'This is a test note',
        type: 'HIGHLIGHT',
      };

      const annotation = await annotationService.addAnnotation('vid_1', input);

      assert.ok(annotation);
      assert.ok(annotation.id);
      assert.strictEqual(annotation.timestamp, 60);
      assert.strictEqual(annotation.label, 'Test Annotation');
      assert.strictEqual(annotation.note, 'This is a test note');
      assert.strictEqual(annotation.type, 'HIGHLIGHT');
    });

    test('should add annotation with creator info', async () => {
      const input: CreateAnnotationInput = {
        timestamp: 30,
        label: 'Coach Note',
        type: 'TECHNIQUE',
      };

      const annotation = await annotationService.addAnnotation(
        'vid_1',
        input,
        'coach_1',
        'Coach Smith'
      );

      assert.ok(annotation);
      assert.strictEqual(annotation.createdBy, 'coach_1');
      assert.strictEqual(annotation.createdByName, 'Coach Smith');
    });
  });

  describe('deleteAnnotation', () => {
    test('should delete an existing annotation', async () => {
      // First add an annotation
      const input: CreateAnnotationInput = {
        timestamp: 90,
        label: 'To Be Deleted',
        type: 'GENERAL',
      };
      const annotation = await annotationService.addAnnotation('vid_1', input);

      // Then delete it
      const result = await annotationService.deleteAnnotation('vid_1', annotation.id);

      assert.strictEqual(result, true);
    });
  });

  describe('exportAnnotations', () => {
    test('should export annotations with formatted data', async () => {
      const exportData = await annotationService.exportAnnotations('vid_1');

      assert.ok(exportData);
      assert.ok(exportData.videoTitle);
      assert.ok(exportData.coachName);
      assert.ok(Array.isArray(exportData.athleteNames));
      assert.ok(exportData.exportedAt);
      assert.ok(Array.isArray(exportData.annotations));

      // Check annotation format
      if (exportData.annotations.length > 0) {
        const ann = exportData.annotations[0];
        assert.ok(typeof ann.timestamp === 'number');
        assert.ok(typeof ann.timestampFormatted === 'string');
        assert.ok(ann.timestampFormatted.includes(':'));
        assert.ok(ann.label);
        assert.ok(ann.type);
        assert.ok(ann.typeLabel);
      }
    });

    test('should return null for non-existent video', async () => {
      const exportData = await annotationService.exportAnnotations('non_existent');

      assert.strictEqual(exportData, null);
    });
  });

  describe('getAnnotationsByType', () => {
    test('should group annotations by type', async () => {
      const grouped = await annotationService.getAnnotationsByType('vid_1');

      assert.ok(grouped.HIGHLIGHT !== undefined);
      assert.ok(grouped.IMPROVEMENT !== undefined);
      assert.ok(grouped.TECHNIQUE !== undefined);
      assert.ok(grouped.GENERAL !== undefined);

      // Verify each group contains only annotations of that type
      for (const ann of grouped.HIGHLIGHT) {
        assert.strictEqual(ann.type, 'HIGHLIGHT');
      }
      for (const ann of grouped.IMPROVEMENT) {
        assert.strictEqual(ann.type, 'IMPROVEMENT');
      }
    });
  });

  describe('getAnnotationStats', () => {
    test('should return annotation statistics', async () => {
      const stats = await annotationService.getAnnotationStats('vid_1');

      assert.ok(typeof stats.total === 'number');
      assert.ok(stats.byType);
      assert.ok(typeof stats.byType.HIGHLIGHT === 'number');
      assert.ok(typeof stats.byType.IMPROVEMENT === 'number');
      assert.ok(typeof stats.byType.TECHNIQUE === 'number');
      assert.ok(typeof stats.byType.GENERAL === 'number');
      assert.ok(typeof stats.averagePerMinute === 'number');
    });

    test('should return zero stats for non-existent video', async () => {
      const stats = await annotationService.getAnnotationStats('non_existent');

      assert.strictEqual(stats.total, 0);
      assert.strictEqual(stats.byType.HIGHLIGHT, 0);
      assert.strictEqual(stats.averagePerMinute, 0);
    });
  });

  describe('findAnnotationsNearTimestamp', () => {
    test('should find annotations near a timestamp', async () => {
      const annotations = await annotationService.getVideoAnnotations('vid_1');
      if (annotations.length === 0) return;

      const firstAnnotation = annotations[0];
      const nearby = await annotationService.findAnnotationsNearTimestamp(
        'vid_1',
        firstAnnotation.timestamp + 2,
        5
      );

      assert.ok(nearby.length > 0);
      assert.ok(nearby.some((a) => a.id === firstAnnotation.id));
    });

    test('should return empty array if no nearby annotations', async () => {
      const nearby = await annotationService.findAnnotationsNearTimestamp(
        'vid_1',
        99999,
        2
      );

      assert.deepStrictEqual(nearby, []);
    });
  });

  describe('getNextAnnotation', () => {
    test('should return next annotation after timestamp', async () => {
      const annotations = await annotationService.getVideoAnnotations('vid_1');
      if (annotations.length < 2) return;

      const next = await annotationService.getNextAnnotation(
        'vid_1',
        annotations[0].timestamp
      );

      assert.ok(next);
      assert.ok(next.timestamp > annotations[0].timestamp);
    });

    test('should return null if no next annotation', async () => {
      const next = await annotationService.getNextAnnotation('vid_1', 99999);

      assert.strictEqual(next, null);
    });
  });

  describe('getPreviousAnnotation', () => {
    test('should return previous annotation before timestamp', async () => {
      const annotations = await annotationService.getVideoAnnotations('vid_1');
      if (annotations.length < 2) return;

      const prev = await annotationService.getPreviousAnnotation(
        'vid_1',
        annotations[annotations.length - 1].timestamp
      );

      assert.ok(prev);
      assert.ok(prev.timestamp < annotations[annotations.length - 1].timestamp);
    });

    test('should return null if no previous annotation', async () => {
      const prev = await annotationService.getPreviousAnnotation('vid_1', 0);

      assert.strictEqual(prev, null);
    });
  });

  describe('Helper Functions', () => {
    describe('formatTimestamp', () => {
      test('should format seconds to MM:SS', () => {
        assert.strictEqual(annotationService.formatTimestamp(0), '0:00');
        assert.strictEqual(annotationService.formatTimestamp(30), '0:30');
        assert.strictEqual(annotationService.formatTimestamp(60), '1:00');
        assert.strictEqual(annotationService.formatTimestamp(90), '1:30');
        assert.strictEqual(annotationService.formatTimestamp(125), '2:05');
        assert.strictEqual(annotationService.formatTimestamp(600), '10:00');
      });

      test('should handle fractional seconds', () => {
        assert.strictEqual(annotationService.formatTimestamp(30.5), '0:30');
        assert.strictEqual(annotationService.formatTimestamp(65.9), '1:05');
      });
    });

    describe('parseTimestamp', () => {
      test('should parse MM:SS to seconds', () => {
        assert.strictEqual(annotationService.parseTimestamp('0:00'), 0);
        assert.strictEqual(annotationService.parseTimestamp('0:30'), 30);
        assert.strictEqual(annotationService.parseTimestamp('1:00'), 60);
        assert.strictEqual(annotationService.parseTimestamp('1:30'), 90);
        assert.strictEqual(annotationService.parseTimestamp('10:00'), 600);
      });

      test('should return 0 for invalid format', () => {
        assert.strictEqual(annotationService.parseTimestamp('invalid'), 0);
        assert.strictEqual(annotationService.parseTimestamp(''), 0);
        assert.strictEqual(annotationService.parseTimestamp('1'), 0);
      });
    });

    describe('getTypeInfo', () => {
      test('should return type configuration', () => {
        const types: VideoAnnotationType[] = ['HIGHLIGHT', 'IMPROVEMENT', 'TECHNIQUE', 'GENERAL'];

        for (const type of types) {
          const info = annotationService.getTypeInfo(type);

          assert.ok(info.label);
          assert.ok(info.color);
          assert.ok(info.icon);
          assert.ok(info.description);
          assert.ok(info.color.startsWith('#'));
        }
      });
    });

    describe('getAllTypes', () => {
      test('should return all annotation types', () => {
        const types = annotationService.getAllTypes();

        assert.ok(Array.isArray(types));
        assert.strictEqual(types.length, 4);
        assert.ok(types.includes('HIGHLIGHT'));
        assert.ok(types.includes('IMPROVEMENT'));
        assert.ok(types.includes('TECHNIQUE'));
        assert.ok(types.includes('GENERAL'));
      });
    });

    describe('validateInput', () => {
      const videoDuration = 180;

      test('should pass for valid input', () => {
        const errors = annotationService.validateInput(
          {
            timestamp: 60,
            label: 'Valid label',
            type: 'HIGHLIGHT',
          },
          videoDuration
        );

        assert.deepStrictEqual(errors, []);
      });

      test('should fail for empty label', () => {
        const errors = annotationService.validateInput(
          {
            timestamp: 60,
            label: '',
            type: 'HIGHLIGHT',
          },
          videoDuration
        );

        assert.ok(errors.some((e) => e.includes('Label')));
      });

      test('should fail for label too long', () => {
        const errors = annotationService.validateInput(
          {
            timestamp: 60,
            label: 'A'.repeat(101),
            type: 'HIGHLIGHT',
          },
          videoDuration
        );

        assert.ok(errors.some((e) => e.includes('100')));
      });

      test('should fail for note too long', () => {
        const errors = annotationService.validateInput(
          {
            timestamp: 60,
            label: 'Valid',
            note: 'A'.repeat(501),
            type: 'HIGHLIGHT',
          },
          videoDuration
        );

        assert.ok(errors.some((e) => e.includes('500')));
      });

      test('should fail for negative timestamp', () => {
        const errors = annotationService.validateInput(
          {
            timestamp: -10,
            label: 'Valid',
            type: 'HIGHLIGHT',
          },
          videoDuration
        );

        assert.ok(errors.some((e) => e.includes('negative')));
      });

      test('should fail for timestamp exceeding duration', () => {
        const errors = annotationService.validateInput(
          {
            timestamp: 200,
            label: 'Valid',
            type: 'HIGHLIGHT',
          },
          videoDuration
        );

        assert.ok(errors.some((e) => e.includes('duration')));
      });
    });
  });

  describe('generateTextSummary', () => {
    test('should generate readable text summary', async () => {
      const summary = await annotationService.generateTextSummary('vid_1');

      assert.ok(typeof summary === 'string');
      assert.ok(summary.includes('Video:'));
      assert.ok(summary.includes('Coach:'));
      assert.ok(summary.includes('Athletes:'));
      assert.ok(summary.includes('Annotations'));
    });

    test('should return empty string for non-existent video', async () => {
      const summary = await annotationService.generateTextSummary('non_existent');

      assert.strictEqual(summary, '');
    });
  });
});

describe('ANNOTATION_TYPE_CONFIG', () => {
  test('should have configuration for all types', () => {
    const types: VideoAnnotationType[] = ['HIGHLIGHT', 'IMPROVEMENT', 'TECHNIQUE', 'GENERAL'];

    for (const type of types) {
      const config = ANNOTATION_TYPE_CONFIG[type];

      assert.ok(config, `Config should exist for ${type}`);
      assert.ok(config.label, `${type} should have label`);
      assert.ok(config.color, `${type} should have color`);
      assert.ok(config.icon, `${type} should have icon`);
      assert.ok(config.description, `${type} should have description`);
    }
  });

  test('should have valid hex colors', () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    const types: VideoAnnotationType[] = ['HIGHLIGHT', 'IMPROVEMENT', 'TECHNIQUE', 'GENERAL'];

    for (const type of types) {
      const config = ANNOTATION_TYPE_CONFIG[type];
      assert.ok(
        hexRegex.test(config.color),
        `${type} color should be valid hex: ${config.color}`
      );
    }
  });

  test('HIGHLIGHT should be green', () => {
    const config = ANNOTATION_TYPE_CONFIG.HIGHLIGHT;
    assert.strictEqual(config.label, 'Highlight');
    assert.ok(config.color.toLowerCase().includes('4caf50'));
  });

  test('IMPROVEMENT should be orange', () => {
    const config = ANNOTATION_TYPE_CONFIG.IMPROVEMENT;
    assert.strictEqual(config.label, 'Improvement');
    assert.ok(config.color.toLowerCase().includes('ff9800'));
  });

  test('TECHNIQUE should be blue', () => {
    const config = ANNOTATION_TYPE_CONFIG.TECHNIQUE;
    assert.strictEqual(config.label, 'Technique');
    assert.ok(config.color.toLowerCase().includes('2196f3'));
  });
});
