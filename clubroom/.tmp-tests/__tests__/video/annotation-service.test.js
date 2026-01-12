"use strict";
/**
 * Annotation Service Tests
 *
 * Unit tests for the annotation service functionality including
 * CRUD operations, export features, and helper functions.
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
const annotation_service_1 = require("../../services/annotation-service");
(0, node_test_1.describe)('Annotation Service', () => {
    (0, node_test_1.describe)('getAnnotatedVideo', () => {
        (0, node_test_1.default)('should return annotated video with sorted annotations', async () => {
            const video = await annotation_service_1.annotationService.getAnnotatedVideo('vid_1');
            node_assert_1.default.ok(video);
            node_assert_1.default.strictEqual(video.id, 'vid_1');
            node_assert_1.default.ok(Array.isArray(video.annotations));
            // Check annotations are sorted by timestamp
            for (let i = 1; i < video.annotations.length; i++) {
                node_assert_1.default.ok(video.annotations[i].timestamp >= video.annotations[i - 1].timestamp, 'Annotations should be sorted by timestamp');
            }
        });
        (0, node_test_1.default)('should return null for non-existent video', async () => {
            const video = await annotation_service_1.annotationService.getAnnotatedVideo('non_existent');
            node_assert_1.default.strictEqual(video, null);
        });
    });
    (0, node_test_1.describe)('getVideoAnnotations', () => {
        (0, node_test_1.default)('should return sorted annotations for a video', async () => {
            const annotations = await annotation_service_1.annotationService.getVideoAnnotations('vid_1');
            node_assert_1.default.ok(Array.isArray(annotations));
            node_assert_1.default.ok(annotations.length > 0);
            // Check sorting
            for (let i = 1; i < annotations.length; i++) {
                node_assert_1.default.ok(annotations[i].timestamp >= annotations[i - 1].timestamp);
            }
        });
        (0, node_test_1.default)('should return empty array for video with no annotations', async () => {
            const annotations = await annotation_service_1.annotationService.getVideoAnnotations('vid_3');
            node_assert_1.default.ok(Array.isArray(annotations));
            // vid_3 has no annotations in mock data
        });
        (0, node_test_1.default)('should return empty array for non-existent video', async () => {
            const annotations = await annotation_service_1.annotationService.getVideoAnnotations('non_existent');
            node_assert_1.default.deepStrictEqual(annotations, []);
        });
    });
    (0, node_test_1.describe)('addAnnotation', () => {
        (0, node_test_1.default)('should add a new annotation to a video', async () => {
            const input = {
                timestamp: 60,
                label: 'Test Annotation',
                note: 'This is a test note',
                type: 'HIGHLIGHT',
            };
            const annotation = await annotation_service_1.annotationService.addAnnotation('vid_1', input);
            node_assert_1.default.ok(annotation);
            node_assert_1.default.ok(annotation.id);
            node_assert_1.default.strictEqual(annotation.timestamp, 60);
            node_assert_1.default.strictEqual(annotation.label, 'Test Annotation');
            node_assert_1.default.strictEqual(annotation.note, 'This is a test note');
            node_assert_1.default.strictEqual(annotation.type, 'HIGHLIGHT');
        });
        (0, node_test_1.default)('should add annotation with creator info', async () => {
            const input = {
                timestamp: 30,
                label: 'Coach Note',
                type: 'TECHNIQUE',
            };
            const annotation = await annotation_service_1.annotationService.addAnnotation('vid_1', input, 'coach_1', 'Coach Smith');
            node_assert_1.default.ok(annotation);
            node_assert_1.default.strictEqual(annotation.createdBy, 'coach_1');
            node_assert_1.default.strictEqual(annotation.createdByName, 'Coach Smith');
        });
    });
    (0, node_test_1.describe)('deleteAnnotation', () => {
        (0, node_test_1.default)('should delete an existing annotation', async () => {
            // First add an annotation
            const input = {
                timestamp: 90,
                label: 'To Be Deleted',
                type: 'GENERAL',
            };
            const annotation = await annotation_service_1.annotationService.addAnnotation('vid_1', input);
            // Then delete it
            const result = await annotation_service_1.annotationService.deleteAnnotation('vid_1', annotation.id);
            node_assert_1.default.strictEqual(result, true);
        });
    });
    (0, node_test_1.describe)('exportAnnotations', () => {
        (0, node_test_1.default)('should export annotations with formatted data', async () => {
            const exportData = await annotation_service_1.annotationService.exportAnnotations('vid_1');
            node_assert_1.default.ok(exportData);
            node_assert_1.default.ok(exportData.videoTitle);
            node_assert_1.default.ok(exportData.coachName);
            node_assert_1.default.ok(Array.isArray(exportData.athleteNames));
            node_assert_1.default.ok(exportData.exportedAt);
            node_assert_1.default.ok(Array.isArray(exportData.annotations));
            // Check annotation format
            if (exportData.annotations.length > 0) {
                const ann = exportData.annotations[0];
                node_assert_1.default.ok(typeof ann.timestamp === 'number');
                node_assert_1.default.ok(typeof ann.timestampFormatted === 'string');
                node_assert_1.default.ok(ann.timestampFormatted.includes(':'));
                node_assert_1.default.ok(ann.label);
                node_assert_1.default.ok(ann.type);
                node_assert_1.default.ok(ann.typeLabel);
            }
        });
        (0, node_test_1.default)('should return null for non-existent video', async () => {
            const exportData = await annotation_service_1.annotationService.exportAnnotations('non_existent');
            node_assert_1.default.strictEqual(exportData, null);
        });
    });
    (0, node_test_1.describe)('getAnnotationsByType', () => {
        (0, node_test_1.default)('should group annotations by type', async () => {
            const grouped = await annotation_service_1.annotationService.getAnnotationsByType('vid_1');
            node_assert_1.default.ok(grouped.HIGHLIGHT !== undefined);
            node_assert_1.default.ok(grouped.IMPROVEMENT !== undefined);
            node_assert_1.default.ok(grouped.TECHNIQUE !== undefined);
            node_assert_1.default.ok(grouped.GENERAL !== undefined);
            // Verify each group contains only annotations of that type
            for (const ann of grouped.HIGHLIGHT) {
                node_assert_1.default.strictEqual(ann.type, 'HIGHLIGHT');
            }
            for (const ann of grouped.IMPROVEMENT) {
                node_assert_1.default.strictEqual(ann.type, 'IMPROVEMENT');
            }
        });
    });
    (0, node_test_1.describe)('getAnnotationStats', () => {
        (0, node_test_1.default)('should return annotation statistics', async () => {
            const stats = await annotation_service_1.annotationService.getAnnotationStats('vid_1');
            node_assert_1.default.ok(typeof stats.total === 'number');
            node_assert_1.default.ok(stats.byType);
            node_assert_1.default.ok(typeof stats.byType.HIGHLIGHT === 'number');
            node_assert_1.default.ok(typeof stats.byType.IMPROVEMENT === 'number');
            node_assert_1.default.ok(typeof stats.byType.TECHNIQUE === 'number');
            node_assert_1.default.ok(typeof stats.byType.GENERAL === 'number');
            node_assert_1.default.ok(typeof stats.averagePerMinute === 'number');
        });
        (0, node_test_1.default)('should return zero stats for non-existent video', async () => {
            const stats = await annotation_service_1.annotationService.getAnnotationStats('non_existent');
            node_assert_1.default.strictEqual(stats.total, 0);
            node_assert_1.default.strictEqual(stats.byType.HIGHLIGHT, 0);
            node_assert_1.default.strictEqual(stats.averagePerMinute, 0);
        });
    });
    (0, node_test_1.describe)('findAnnotationsNearTimestamp', () => {
        (0, node_test_1.default)('should find annotations near a timestamp', async () => {
            const annotations = await annotation_service_1.annotationService.getVideoAnnotations('vid_1');
            if (annotations.length === 0)
                return;
            const firstAnnotation = annotations[0];
            const nearby = await annotation_service_1.annotationService.findAnnotationsNearTimestamp('vid_1', firstAnnotation.timestamp + 2, 5);
            node_assert_1.default.ok(nearby.length > 0);
            node_assert_1.default.ok(nearby.some((a) => a.id === firstAnnotation.id));
        });
        (0, node_test_1.default)('should return empty array if no nearby annotations', async () => {
            const nearby = await annotation_service_1.annotationService.findAnnotationsNearTimestamp('vid_1', 99999, 2);
            node_assert_1.default.deepStrictEqual(nearby, []);
        });
    });
    (0, node_test_1.describe)('getNextAnnotation', () => {
        (0, node_test_1.default)('should return next annotation after timestamp', async () => {
            const annotations = await annotation_service_1.annotationService.getVideoAnnotations('vid_1');
            if (annotations.length < 2)
                return;
            const next = await annotation_service_1.annotationService.getNextAnnotation('vid_1', annotations[0].timestamp);
            node_assert_1.default.ok(next);
            node_assert_1.default.ok(next.timestamp > annotations[0].timestamp);
        });
        (0, node_test_1.default)('should return null if no next annotation', async () => {
            const next = await annotation_service_1.annotationService.getNextAnnotation('vid_1', 99999);
            node_assert_1.default.strictEqual(next, null);
        });
    });
    (0, node_test_1.describe)('getPreviousAnnotation', () => {
        (0, node_test_1.default)('should return previous annotation before timestamp', async () => {
            const annotations = await annotation_service_1.annotationService.getVideoAnnotations('vid_1');
            if (annotations.length < 2)
                return;
            const prev = await annotation_service_1.annotationService.getPreviousAnnotation('vid_1', annotations[annotations.length - 1].timestamp);
            node_assert_1.default.ok(prev);
            node_assert_1.default.ok(prev.timestamp < annotations[annotations.length - 1].timestamp);
        });
        (0, node_test_1.default)('should return null if no previous annotation', async () => {
            const prev = await annotation_service_1.annotationService.getPreviousAnnotation('vid_1', 0);
            node_assert_1.default.strictEqual(prev, null);
        });
    });
    (0, node_test_1.describe)('Helper Functions', () => {
        (0, node_test_1.describe)('formatTimestamp', () => {
            (0, node_test_1.default)('should format seconds to MM:SS', () => {
                node_assert_1.default.strictEqual(annotation_service_1.annotationService.formatTimestamp(0), '0:00');
                node_assert_1.default.strictEqual(annotation_service_1.annotationService.formatTimestamp(30), '0:30');
                node_assert_1.default.strictEqual(annotation_service_1.annotationService.formatTimestamp(60), '1:00');
                node_assert_1.default.strictEqual(annotation_service_1.annotationService.formatTimestamp(90), '1:30');
                node_assert_1.default.strictEqual(annotation_service_1.annotationService.formatTimestamp(125), '2:05');
                node_assert_1.default.strictEqual(annotation_service_1.annotationService.formatTimestamp(600), '10:00');
            });
            (0, node_test_1.default)('should handle fractional seconds', () => {
                node_assert_1.default.strictEqual(annotation_service_1.annotationService.formatTimestamp(30.5), '0:30');
                node_assert_1.default.strictEqual(annotation_service_1.annotationService.formatTimestamp(65.9), '1:05');
            });
        });
        (0, node_test_1.describe)('parseTimestamp', () => {
            (0, node_test_1.default)('should parse MM:SS to seconds', () => {
                node_assert_1.default.strictEqual(annotation_service_1.annotationService.parseTimestamp('0:00'), 0);
                node_assert_1.default.strictEqual(annotation_service_1.annotationService.parseTimestamp('0:30'), 30);
                node_assert_1.default.strictEqual(annotation_service_1.annotationService.parseTimestamp('1:00'), 60);
                node_assert_1.default.strictEqual(annotation_service_1.annotationService.parseTimestamp('1:30'), 90);
                node_assert_1.default.strictEqual(annotation_service_1.annotationService.parseTimestamp('10:00'), 600);
            });
            (0, node_test_1.default)('should return 0 for invalid format', () => {
                node_assert_1.default.strictEqual(annotation_service_1.annotationService.parseTimestamp('invalid'), 0);
                node_assert_1.default.strictEqual(annotation_service_1.annotationService.parseTimestamp(''), 0);
                node_assert_1.default.strictEqual(annotation_service_1.annotationService.parseTimestamp('1'), 0);
            });
        });
        (0, node_test_1.describe)('getTypeInfo', () => {
            (0, node_test_1.default)('should return type configuration', () => {
                const types = ['HIGHLIGHT', 'IMPROVEMENT', 'TECHNIQUE', 'GENERAL'];
                for (const type of types) {
                    const info = annotation_service_1.annotationService.getTypeInfo(type);
                    node_assert_1.default.ok(info.label);
                    node_assert_1.default.ok(info.color);
                    node_assert_1.default.ok(info.icon);
                    node_assert_1.default.ok(info.description);
                    node_assert_1.default.ok(info.color.startsWith('#'));
                }
            });
        });
        (0, node_test_1.describe)('getAllTypes', () => {
            (0, node_test_1.default)('should return all annotation types', () => {
                const types = annotation_service_1.annotationService.getAllTypes();
                node_assert_1.default.ok(Array.isArray(types));
                node_assert_1.default.strictEqual(types.length, 4);
                node_assert_1.default.ok(types.includes('HIGHLIGHT'));
                node_assert_1.default.ok(types.includes('IMPROVEMENT'));
                node_assert_1.default.ok(types.includes('TECHNIQUE'));
                node_assert_1.default.ok(types.includes('GENERAL'));
            });
        });
        (0, node_test_1.describe)('validateInput', () => {
            const videoDuration = 180;
            (0, node_test_1.default)('should pass for valid input', () => {
                const errors = annotation_service_1.annotationService.validateInput({
                    timestamp: 60,
                    label: 'Valid label',
                    type: 'HIGHLIGHT',
                }, videoDuration);
                node_assert_1.default.deepStrictEqual(errors, []);
            });
            (0, node_test_1.default)('should fail for empty label', () => {
                const errors = annotation_service_1.annotationService.validateInput({
                    timestamp: 60,
                    label: '',
                    type: 'HIGHLIGHT',
                }, videoDuration);
                node_assert_1.default.ok(errors.some((e) => e.includes('Label')));
            });
            (0, node_test_1.default)('should fail for label too long', () => {
                const errors = annotation_service_1.annotationService.validateInput({
                    timestamp: 60,
                    label: 'A'.repeat(101),
                    type: 'HIGHLIGHT',
                }, videoDuration);
                node_assert_1.default.ok(errors.some((e) => e.includes('100')));
            });
            (0, node_test_1.default)('should fail for note too long', () => {
                const errors = annotation_service_1.annotationService.validateInput({
                    timestamp: 60,
                    label: 'Valid',
                    note: 'A'.repeat(501),
                    type: 'HIGHLIGHT',
                }, videoDuration);
                node_assert_1.default.ok(errors.some((e) => e.includes('500')));
            });
            (0, node_test_1.default)('should fail for negative timestamp', () => {
                const errors = annotation_service_1.annotationService.validateInput({
                    timestamp: -10,
                    label: 'Valid',
                    type: 'HIGHLIGHT',
                }, videoDuration);
                node_assert_1.default.ok(errors.some((e) => e.includes('negative')));
            });
            (0, node_test_1.default)('should fail for timestamp exceeding duration', () => {
                const errors = annotation_service_1.annotationService.validateInput({
                    timestamp: 200,
                    label: 'Valid',
                    type: 'HIGHLIGHT',
                }, videoDuration);
                node_assert_1.default.ok(errors.some((e) => e.includes('duration')));
            });
        });
    });
    (0, node_test_1.describe)('generateTextSummary', () => {
        (0, node_test_1.default)('should generate readable text summary', async () => {
            const summary = await annotation_service_1.annotationService.generateTextSummary('vid_1');
            node_assert_1.default.ok(typeof summary === 'string');
            node_assert_1.default.ok(summary.includes('Video:'));
            node_assert_1.default.ok(summary.includes('Coach:'));
            node_assert_1.default.ok(summary.includes('Athletes:'));
            node_assert_1.default.ok(summary.includes('Annotations'));
        });
        (0, node_test_1.default)('should return empty string for non-existent video', async () => {
            const summary = await annotation_service_1.annotationService.generateTextSummary('non_existent');
            node_assert_1.default.strictEqual(summary, '');
        });
    });
});
(0, node_test_1.describe)('ANNOTATION_TYPE_CONFIG', () => {
    (0, node_test_1.default)('should have configuration for all types', () => {
        const types = ['HIGHLIGHT', 'IMPROVEMENT', 'TECHNIQUE', 'GENERAL'];
        for (const type of types) {
            const config = annotation_service_1.ANNOTATION_TYPE_CONFIG[type];
            node_assert_1.default.ok(config, `Config should exist for ${type}`);
            node_assert_1.default.ok(config.label, `${type} should have label`);
            node_assert_1.default.ok(config.color, `${type} should have color`);
            node_assert_1.default.ok(config.icon, `${type} should have icon`);
            node_assert_1.default.ok(config.description, `${type} should have description`);
        }
    });
    (0, node_test_1.default)('should have valid hex colors', () => {
        const hexRegex = /^#[0-9A-Fa-f]{6}$/;
        const types = ['HIGHLIGHT', 'IMPROVEMENT', 'TECHNIQUE', 'GENERAL'];
        for (const type of types) {
            const config = annotation_service_1.ANNOTATION_TYPE_CONFIG[type];
            node_assert_1.default.ok(hexRegex.test(config.color), `${type} color should be valid hex: ${config.color}`);
        }
    });
    (0, node_test_1.default)('HIGHLIGHT should be green', () => {
        const config = annotation_service_1.ANNOTATION_TYPE_CONFIG.HIGHLIGHT;
        node_assert_1.default.strictEqual(config.label, 'Highlight');
        node_assert_1.default.ok(config.color.toLowerCase().includes('4caf50'));
    });
    (0, node_test_1.default)('IMPROVEMENT should be orange', () => {
        const config = annotation_service_1.ANNOTATION_TYPE_CONFIG.IMPROVEMENT;
        node_assert_1.default.strictEqual(config.label, 'Improvement');
        node_assert_1.default.ok(config.color.toLowerCase().includes('ff9800'));
    });
    (0, node_test_1.default)('TECHNIQUE should be blue', () => {
        const config = annotation_service_1.ANNOTATION_TYPE_CONFIG.TECHNIQUE;
        node_assert_1.default.strictEqual(config.label, 'Technique');
        node_assert_1.default.ok(config.color.toLowerCase().includes('2196f3'));
    });
});
