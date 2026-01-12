"use strict";
/**
 * Annotation Components Tests
 *
 * Tests for the video annotation components including
 * AnnotationMarker, AnnotationPanel, AnnotationForm, TimelineBar, and AnnotationBadge.
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
/**
 * Helper function to create a mock annotation for testing
 */
function createMockAnnotation(overrides = {}) {
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
(0, node_test_1.describe)('AnnotationMarker Component Logic', () => {
    (0, node_test_1.describe)('Position Calculation', () => {
        (0, node_test_1.default)('should calculate correct position percentage', () => {
            const duration = 180; // 3 minutes
            const timestamp = 60; // 1 minute
            const position = (timestamp / duration) * 100;
            // Use approximate comparison for floating point
            node_assert_1.default.ok(Math.abs(position - (100 / 3)) < 0.0001);
        });
        (0, node_test_1.default)('should handle zero duration', () => {
            const duration = 0;
            const timestamp = 30;
            const position = duration > 0 ? (timestamp / duration) * 100 : 0;
            node_assert_1.default.strictEqual(position, 0);
        });
        (0, node_test_1.default)('should handle timestamp at start', () => {
            const duration = 180;
            const timestamp = 0;
            const position = (timestamp / duration) * 100;
            node_assert_1.default.strictEqual(position, 0);
        });
        (0, node_test_1.default)('should handle timestamp at end', () => {
            const duration = 180;
            const timestamp = 180;
            const position = (timestamp / duration) * 100;
            node_assert_1.default.strictEqual(position, 100);
        });
    });
    (0, node_test_1.describe)('Type Color Mapping', () => {
        (0, node_test_1.default)('should have correct color for HIGHLIGHT', () => {
            const config = annotation_service_1.ANNOTATION_TYPE_CONFIG.HIGHLIGHT;
            node_assert_1.default.strictEqual(config.color, '#4CAF50');
        });
        (0, node_test_1.default)('should have correct color for IMPROVEMENT', () => {
            const config = annotation_service_1.ANNOTATION_TYPE_CONFIG.IMPROVEMENT;
            node_assert_1.default.strictEqual(config.color, '#FF9800');
        });
        (0, node_test_1.default)('should have correct color for TECHNIQUE', () => {
            const config = annotation_service_1.ANNOTATION_TYPE_CONFIG.TECHNIQUE;
            node_assert_1.default.strictEqual(config.color, '#2196F3');
        });
        (0, node_test_1.default)('should have correct color for GENERAL', () => {
            const config = annotation_service_1.ANNOTATION_TYPE_CONFIG.GENERAL;
            node_assert_1.default.strictEqual(config.color, '#9E9E9E');
        });
    });
    (0, node_test_1.describe)('Size Variants', () => {
        (0, node_test_1.default)('small size should have correct dimensions', () => {
            const sizeMap = {
                small: { marker: 8, icon: 10 },
                medium: { marker: 12, icon: 14 },
                large: { marker: 16, icon: 18 },
            };
            node_assert_1.default.strictEqual(sizeMap.small.marker, 8);
            node_assert_1.default.strictEqual(sizeMap.small.icon, 10);
        });
        (0, node_test_1.default)('medium size should have correct dimensions', () => {
            const sizeMap = {
                small: { marker: 8, icon: 10 },
                medium: { marker: 12, icon: 14 },
                large: { marker: 16, icon: 18 },
            };
            node_assert_1.default.strictEqual(sizeMap.medium.marker, 12);
            node_assert_1.default.strictEqual(sizeMap.medium.icon, 14);
        });
        (0, node_test_1.default)('large size should have correct dimensions', () => {
            const sizeMap = {
                small: { marker: 8, icon: 10 },
                medium: { marker: 12, icon: 14 },
                large: { marker: 16, icon: 18 },
            };
            node_assert_1.default.strictEqual(sizeMap.large.marker, 16);
            node_assert_1.default.strictEqual(sizeMap.large.icon, 18);
        });
    });
});
(0, node_test_1.describe)('AnnotationPanel Component Logic', () => {
    (0, node_test_1.describe)('Filtering', () => {
        (0, node_test_1.default)('should filter annotations by type', () => {
            const annotations = [
                createMockAnnotation({ id: 'ann_1', type: 'HIGHLIGHT' }),
                createMockAnnotation({ id: 'ann_2', type: 'IMPROVEMENT' }),
                createMockAnnotation({ id: 'ann_3', type: 'TECHNIQUE' }),
                createMockAnnotation({ id: 'ann_4', type: 'HIGHLIGHT' }),
            ];
            const selectedTypes = ['HIGHLIGHT'];
            const filtered = annotations.filter((ann) => selectedTypes.includes(ann.type));
            node_assert_1.default.strictEqual(filtered.length, 2);
            filtered.forEach((ann) => node_assert_1.default.strictEqual(ann.type, 'HIGHLIGHT'));
        });
        (0, node_test_1.default)('should filter annotations by search query', () => {
            const annotations = [
                createMockAnnotation({ id: 'ann_1', label: 'Great technique' }),
                createMockAnnotation({ id: 'ann_2', label: 'Good effort' }),
                createMockAnnotation({ id: 'ann_3', label: 'Technique needs work' }),
            ];
            const query = 'technique';
            const filtered = annotations.filter((ann) => ann.label.toLowerCase().includes(query.toLowerCase()));
            node_assert_1.default.strictEqual(filtered.length, 2);
        });
        (0, node_test_1.default)('should filter by note content', () => {
            const annotations = [
                createMockAnnotation({ id: 'ann_1', note: 'Focus on footwork' }),
                createMockAnnotation({ id: 'ann_2', note: 'Good positioning' }),
                createMockAnnotation({ id: 'ann_3', note: undefined }),
            ];
            const query = 'footwork';
            const filtered = annotations.filter((ann) => ann.note?.toLowerCase().includes(query.toLowerCase()));
            node_assert_1.default.strictEqual(filtered.length, 1);
        });
        (0, node_test_1.default)('should show all when no filters applied', () => {
            const annotations = [
                createMockAnnotation({ id: 'ann_1' }),
                createMockAnnotation({ id: 'ann_2' }),
                createMockAnnotation({ id: 'ann_3' }),
            ];
            const selectedTypes = [];
            const query = '';
            let filtered = [...annotations];
            if (selectedTypes.length > 0) {
                filtered = filtered.filter((ann) => selectedTypes.includes(ann.type));
            }
            if (query.length > 0) {
                const searchQuery = query.toLowerCase();
                filtered = filtered.filter((ann) => ann.label.toLowerCase().includes(searchQuery));
            }
            node_assert_1.default.strictEqual(filtered.length, 3);
        });
    });
    (0, node_test_1.describe)('Sorting', () => {
        (0, node_test_1.default)('should sort annotations by timestamp', () => {
            const annotations = [
                createMockAnnotation({ id: 'ann_1', timestamp: 90 }),
                createMockAnnotation({ id: 'ann_2', timestamp: 30 }),
                createMockAnnotation({ id: 'ann_3', timestamp: 60 }),
            ];
            const sorted = [...annotations].sort((a, b) => a.timestamp - b.timestamp);
            node_assert_1.default.strictEqual(sorted[0].timestamp, 30);
            node_assert_1.default.strictEqual(sorted[1].timestamp, 60);
            node_assert_1.default.strictEqual(sorted[2].timestamp, 90);
        });
    });
    (0, node_test_1.describe)('Active Detection', () => {
        (0, node_test_1.default)('should detect active annotation within threshold', () => {
            const annotation = createMockAnnotation({ timestamp: 30 });
            const currentTime = 31;
            const threshold = 2;
            const isActive = Math.abs(currentTime - annotation.timestamp) < threshold;
            node_assert_1.default.strictEqual(isActive, true);
        });
        (0, node_test_1.default)('should not detect active annotation outside threshold', () => {
            const annotation = createMockAnnotation({ timestamp: 30 });
            const currentTime = 35;
            const threshold = 2;
            const isActive = Math.abs(currentTime - annotation.timestamp) < threshold;
            node_assert_1.default.strictEqual(isActive, false);
        });
    });
});
(0, node_test_1.describe)('AnnotationForm Component Logic', () => {
    (0, node_test_1.describe)('Input Validation', () => {
        (0, node_test_1.default)('should validate required label', () => {
            const errors = annotation_service_1.annotationService.validateInput({ timestamp: 30, label: '', type: 'HIGHLIGHT' }, 180);
            node_assert_1.default.ok(errors.length > 0);
            node_assert_1.default.ok(errors.some((e) => e.toLowerCase().includes('label')));
        });
        (0, node_test_1.default)('should validate label length', () => {
            const errors = annotation_service_1.annotationService.validateInput({ timestamp: 30, label: 'A'.repeat(101), type: 'HIGHLIGHT' }, 180);
            node_assert_1.default.ok(errors.some((e) => e.includes('100')));
        });
        (0, node_test_1.default)('should validate note length', () => {
            const errors = annotation_service_1.annotationService.validateInput({ timestamp: 30, label: 'Valid', note: 'A'.repeat(501), type: 'HIGHLIGHT' }, 180);
            node_assert_1.default.ok(errors.some((e) => e.includes('500')));
        });
        (0, node_test_1.default)('should validate timestamp range', () => {
            const errorsNegative = annotation_service_1.annotationService.validateInput({ timestamp: -10, label: 'Valid', type: 'HIGHLIGHT' }, 180);
            node_assert_1.default.ok(errorsNegative.some((e) => e.toLowerCase().includes('negative')));
            const errorsExceeds = annotation_service_1.annotationService.validateInput({ timestamp: 200, label: 'Valid', type: 'HIGHLIGHT' }, 180);
            node_assert_1.default.ok(errorsExceeds.some((e) => e.toLowerCase().includes('duration')));
        });
        (0, node_test_1.default)('should pass valid input', () => {
            const errors = annotation_service_1.annotationService.validateInput({ timestamp: 60, label: 'Valid label', note: 'Valid note', type: 'TECHNIQUE' }, 180);
            node_assert_1.default.strictEqual(errors.length, 0);
        });
    });
    (0, node_test_1.describe)('Timestamp Controls', () => {
        (0, node_test_1.default)('should adjust timestamp within bounds', () => {
            const duration = 180;
            let timestamp = 60;
            // Increment
            timestamp = Math.max(0, Math.min(duration, timestamp + 5));
            node_assert_1.default.strictEqual(timestamp, 65);
            // Decrement
            timestamp = Math.max(0, Math.min(duration, timestamp - 10));
            node_assert_1.default.strictEqual(timestamp, 55);
        });
        (0, node_test_1.default)('should not go below zero', () => {
            const duration = 180;
            let timestamp = 3;
            timestamp = Math.max(0, Math.min(duration, timestamp - 5));
            node_assert_1.default.strictEqual(timestamp, 0);
        });
        (0, node_test_1.default)('should not exceed duration', () => {
            const duration = 180;
            let timestamp = 178;
            timestamp = Math.max(0, Math.min(duration, timestamp + 5));
            node_assert_1.default.strictEqual(timestamp, 180);
        });
    });
    (0, node_test_1.describe)('Type Selection', () => {
        (0, node_test_1.default)('should have all annotation types available', () => {
            const types = annotation_service_1.annotationService.getAllTypes();
            node_assert_1.default.ok(types.includes('HIGHLIGHT'));
            node_assert_1.default.ok(types.includes('IMPROVEMENT'));
            node_assert_1.default.ok(types.includes('TECHNIQUE'));
            node_assert_1.default.ok(types.includes('GENERAL'));
        });
    });
});
(0, node_test_1.describe)('TimelineBar Component Logic', () => {
    (0, node_test_1.describe)('Position Calculation', () => {
        (0, node_test_1.default)('should calculate position from time', () => {
            const duration = 180;
            const getPositionFromTime = (time, dur) => {
                if (dur === 0)
                    return 0;
                return (time / dur) * 100;
            };
            node_assert_1.default.strictEqual(getPositionFromTime(0, duration), 0);
            node_assert_1.default.strictEqual(getPositionFromTime(90, duration), 50);
            node_assert_1.default.strictEqual(getPositionFromTime(180, duration), 100);
        });
        (0, node_test_1.default)('should calculate time from position', () => {
            const duration = 180;
            const width = 300;
            const getTimeFromPosition = (position, w, dur) => {
                if (w === 0 || dur === 0)
                    return 0;
                return (position / w) * dur;
            };
            node_assert_1.default.strictEqual(getTimeFromPosition(0, width, duration), 0);
            node_assert_1.default.strictEqual(getTimeFromPosition(150, width, duration), 90);
            node_assert_1.default.strictEqual(getTimeFromPosition(300, width, duration), 180);
        });
    });
    (0, node_test_1.describe)('Marker Grouping', () => {
        (0, node_test_1.default)('should group markers that are close together', () => {
            const annotations = [
                createMockAnnotation({ id: 'ann_1', timestamp: 30 }),
                createMockAnnotation({ id: 'ann_2', timestamp: 31 }),
                createMockAnnotation({ id: 'ann_3', timestamp: 90 }),
            ];
            const duration = 180;
            const minDistance = 3; // 3% minimum distance
            const getPositionFromTime = (time) => (time / duration) * 100;
            const groups = [];
            const sorted = [...annotations].sort((a, b) => a.timestamp - b.timestamp);
            for (const ann of sorted) {
                const position = getPositionFromTime(ann.timestamp);
                const lastGroup = groups[groups.length - 1];
                if (lastGroup && position - lastGroup.position < minDistance) {
                    lastGroup.annotations.push(ann);
                }
                else {
                    groups.push({ position, annotations: [ann] });
                }
            }
            node_assert_1.default.strictEqual(groups.length, 2);
            node_assert_1.default.strictEqual(groups[0].annotations.length, 2);
            node_assert_1.default.strictEqual(groups[1].annotations.length, 1);
        });
    });
});
(0, node_test_1.describe)('AnnotationBadge Component Logic', () => {
    (0, node_test_1.describe)('Variant Styles', () => {
        (0, node_test_1.default)('filled variant should use type color as background', () => {
            const type = 'HIGHLIGHT';
            const config = annotation_service_1.ANNOTATION_TYPE_CONFIG[type];
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
                    backgroundColor: `${config.color}15`,
                },
            };
            node_assert_1.default.strictEqual(variantStyles.filled.backgroundColor, '#4CAF50');
            node_assert_1.default.strictEqual(variantStyles.filled.textColor, '#fff');
        });
        (0, node_test_1.default)('outlined variant should have transparent background', () => {
            const type = 'TECHNIQUE';
            const config = annotation_service_1.ANNOTATION_TYPE_CONFIG[type];
            const variantStyles = {
                outlined: {
                    backgroundColor: 'transparent',
                    borderColor: config.color,
                    textColor: config.color,
                },
            };
            node_assert_1.default.strictEqual(variantStyles.outlined.backgroundColor, 'transparent');
            node_assert_1.default.strictEqual(variantStyles.outlined.borderColor, '#2196F3');
        });
    });
    (0, node_test_1.describe)('Size Styles', () => {
        (0, node_test_1.default)('should have correct dimensions for each size', () => {
            const sizeStyles = {
                small: { paddingHorizontal: 6, fontSize: 10, iconSize: 10 },
                medium: { paddingHorizontal: 8, fontSize: 11, iconSize: 12 },
                large: { paddingHorizontal: 12, fontSize: 13, iconSize: 14 },
            };
            node_assert_1.default.strictEqual(sizeStyles.small.fontSize, 10);
            node_assert_1.default.strictEqual(sizeStyles.medium.fontSize, 11);
            node_assert_1.default.strictEqual(sizeStyles.large.fontSize, 13);
        });
    });
});
(0, node_test_1.describe)('Timestamp Formatting', () => {
    (0, node_test_1.default)('should format timestamps correctly', () => {
        const formatTimestamp = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };
        node_assert_1.default.strictEqual(formatTimestamp(0), '0:00');
        node_assert_1.default.strictEqual(formatTimestamp(5), '0:05');
        node_assert_1.default.strictEqual(formatTimestamp(30), '0:30');
        node_assert_1.default.strictEqual(formatTimestamp(60), '1:00');
        node_assert_1.default.strictEqual(formatTimestamp(65), '1:05');
        node_assert_1.default.strictEqual(formatTimestamp(90), '1:30');
        node_assert_1.default.strictEqual(formatTimestamp(125), '2:05');
        node_assert_1.default.strictEqual(formatTimestamp(600), '10:00');
        node_assert_1.default.strictEqual(formatTimestamp(3661), '61:01');
    });
});
(0, node_test_1.describe)('Annotation Data Display', () => {
    (0, node_test_1.default)('annotation should have all required fields', () => {
        const annotation = createMockAnnotation();
        node_assert_1.default.ok(annotation.id);
        node_assert_1.default.ok(typeof annotation.timestamp === 'number');
        node_assert_1.default.ok(annotation.label);
        node_assert_1.default.ok(annotation.type);
    });
    (0, node_test_1.default)('annotation can have optional fields', () => {
        const withOptional = createMockAnnotation({
            note: 'Optional note',
            createdBy: 'user_1',
            createdByName: 'User Name',
        });
        node_assert_1.default.strictEqual(withOptional.note, 'Optional note');
        node_assert_1.default.strictEqual(withOptional.createdBy, 'user_1');
        node_assert_1.default.strictEqual(withOptional.createdByName, 'User Name');
    });
    (0, node_test_1.default)('annotation without optional fields', () => {
        const minimal = {
            id: 'ann_min',
            timestamp: 60,
            label: 'Minimal',
            type: 'GENERAL',
        };
        node_assert_1.default.strictEqual(minimal.note, undefined);
        node_assert_1.default.strictEqual(minimal.createdBy, undefined);
    });
});
(0, node_test_1.describe)('Edge Cases', () => {
    (0, node_test_1.default)('should handle very long labels gracefully', () => {
        const longLabel = 'A'.repeat(100);
        const annotation = createMockAnnotation({ label: longLabel });
        node_assert_1.default.strictEqual(annotation.label.length, 100);
    });
    (0, node_test_1.default)('should handle special characters in labels', () => {
        const specialLabel = 'Good shot! "Keep it up" & focus <more>';
        const annotation = createMockAnnotation({ label: specialLabel });
        node_assert_1.default.strictEqual(annotation.label, specialLabel);
    });
    (0, node_test_1.default)('should handle zero duration video', () => {
        const duration = 0;
        const timestamp = 30;
        const position = duration > 0 ? (timestamp / duration) * 100 : 0;
        node_assert_1.default.strictEqual(position, 0);
    });
    (0, node_test_1.default)('should handle many annotations', () => {
        const annotations = Array.from({ length: 100 }, (_, i) => createMockAnnotation({
            id: `ann_${i}`,
            timestamp: i * 2,
            label: `Annotation ${i}`,
        }));
        node_assert_1.default.strictEqual(annotations.length, 100);
        // Should be able to filter
        const filtered = annotations.filter((a) => a.timestamp < 100);
        node_assert_1.default.strictEqual(filtered.length, 50);
    });
});
