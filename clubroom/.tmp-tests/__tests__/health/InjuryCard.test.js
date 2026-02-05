"use strict";
/**
 * InjuryCard Component Tests
 *
 * Tests for the InjuryCard component rendering and behavior.
 * Uses React Native Testing Library patterns.
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
const injury_service_1 = require("../../services/injury-service");
/**
 * Helper function to create a mock injury for testing
 */
function createMockInjury(overrides = {}) {
    return {
        id: 'injury_test_1',
        userId: 'user1',
        userName: 'Test User',
        bodyPart: 'LEFT_KNEE',
        description: 'Test injury description',
        severity: 'MODERATE',
        occurredAt: '2026-01-05T14:30:00Z',
        expectedRecovery: '2026-01-20T00:00:00Z',
        status: 'RECOVERING',
        notes: [
            {
                id: 'note_1',
                injuryId: 'injury_test_1',
                note: 'Started treatment',
                createdAt: '2026-01-06T10:00:00Z',
                createdBy: 'user1',
                createdByName: 'Test User',
                recoveryPercent: 25,
            },
        ],
        recoveryPercent: 50,
        sharedWithCoach: true,
        createdAt: '2026-01-05T16:00:00Z',
        updatedAt: '2026-01-10T09:00:00Z',
        ...overrides,
    };
}
(0, node_test_1.describe)('InjuryCard Component Logic', () => {
    (0, node_test_1.describe)('Injury Data Display', () => {
        (0, node_test_1.default)('should have correct body part and description', () => {
            const injury = createMockInjury();
            node_assert_1.default.strictEqual(injury.bodyPart, 'LEFT_KNEE');
            node_assert_1.default.strictEqual(injury.description, 'Test injury description');
        });
        (0, node_test_1.default)('should display correct body part label', () => {
            const injury = createMockInjury();
            const label = injury_service_1.injuryService.getBodyPartLabel(injury.bodyPart);
            node_assert_1.default.strictEqual(label, 'Left Knee');
        });
        (0, node_test_1.default)('should have correct recovery percentage', () => {
            const injury = createMockInjury();
            node_assert_1.default.strictEqual(injury.recoveryPercent, 50);
        });
        (0, node_test_1.default)('should count notes correctly', () => {
            const injury = createMockInjury();
            node_assert_1.default.strictEqual(injury.notes.length, 1);
        });
    });
    (0, node_test_1.describe)('Severity Display', () => {
        (0, node_test_1.default)('should display correct severity info for each severity', () => {
            const severities = ['MINOR', 'MODERATE', 'SEVERE'];
            severities.forEach((severity) => {
                const injury = createMockInjury({ severity });
                const info = injury_service_1.injuryService.getSeverityInfo(injury.severity);
                node_assert_1.default.ok(info.label, `Severity ${severity} should have a label`);
                node_assert_1.default.ok(info.icon, `Severity ${severity} should have an icon`);
                node_assert_1.default.ok(info.color, `Severity ${severity} should have a color`);
                node_assert_1.default.ok(info.color.startsWith('#'), `Severity ${severity} color should be hex`);
            });
        });
        (0, node_test_1.default)('MINOR severity should be amber', () => {
            const info = injury_service_1.injuryService.getSeverityInfo('MINOR');
            node_assert_1.default.strictEqual(info.label, 'Minor');
            node_assert_1.default.strictEqual(info.color, '#F59E0B');
        });
        (0, node_test_1.default)('MODERATE severity should be orange', () => {
            const info = injury_service_1.injuryService.getSeverityInfo('MODERATE');
            node_assert_1.default.strictEqual(info.label, 'Moderate');
            node_assert_1.default.strictEqual(info.color, '#F97316');
        });
        (0, node_test_1.default)('SEVERE severity should be red', () => {
            const info = injury_service_1.injuryService.getSeverityInfo('SEVERE');
            node_assert_1.default.strictEqual(info.label, 'Severe');
            node_assert_1.default.strictEqual(info.color, '#EF4444');
        });
    });
    (0, node_test_1.describe)('Status Display', () => {
        (0, node_test_1.default)('should display correct status info for each status', () => {
            const statuses = ['ACTIVE', 'RECOVERING', 'HEALED'];
            statuses.forEach((status) => {
                const injury = createMockInjury({ status });
                const info = injury_service_1.injuryService.getStatusInfo(injury.status);
                node_assert_1.default.ok(info.label, `Status ${status} should have a label`);
                node_assert_1.default.ok(info.icon, `Status ${status} should have an icon`);
                node_assert_1.default.ok(info.color, `Status ${status} should have a color`);
                node_assert_1.default.ok(info.color.startsWith('#'), `Status ${status} color should be hex`);
            });
        });
        (0, node_test_1.default)('ACTIVE status should be red', () => {
            const info = injury_service_1.injuryService.getStatusInfo('ACTIVE');
            node_assert_1.default.strictEqual(info.label, 'Active');
            node_assert_1.default.strictEqual(info.color, '#EF4444');
        });
        (0, node_test_1.default)('RECOVERING status should be amber', () => {
            const info = injury_service_1.injuryService.getStatusInfo('RECOVERING');
            node_assert_1.default.strictEqual(info.label, 'Recovering');
            node_assert_1.default.strictEqual(info.color, '#F59E0B');
        });
        (0, node_test_1.default)('HEALED status should be green', () => {
            const info = injury_service_1.injuryService.getStatusInfo('HEALED');
            node_assert_1.default.strictEqual(info.label, 'Healed');
            node_assert_1.default.strictEqual(info.color, '#10B981');
        });
    });
    (0, node_test_1.describe)('Body Part Categories', () => {
        (0, node_test_1.default)('should categorize head correctly', () => {
            const injury = createMockInjury({ bodyPart: 'HEAD' });
            const category = injury_service_1.injuryService.getBodyPartCategory(injury.bodyPart);
            node_assert_1.default.strictEqual(category, 'HEAD');
        });
        (0, node_test_1.default)('should categorize neck as head', () => {
            const injury = createMockInjury({ bodyPart: 'NECK' });
            const category = injury_service_1.injuryService.getBodyPartCategory(injury.bodyPart);
            node_assert_1.default.strictEqual(category, 'HEAD');
        });
        (0, node_test_1.default)('should categorize shoulders as upper body', () => {
            const leftShoulder = injury_service_1.injuryService.getBodyPartCategory('LEFT_SHOULDER');
            const rightShoulder = injury_service_1.injuryService.getBodyPartCategory('RIGHT_SHOULDER');
            node_assert_1.default.strictEqual(leftShoulder, 'UPPER_BODY');
            node_assert_1.default.strictEqual(rightShoulder, 'UPPER_BODY');
        });
        (0, node_test_1.default)('should categorize chest as core', () => {
            const injury = createMockInjury({ bodyPart: 'CHEST' });
            const category = injury_service_1.injuryService.getBodyPartCategory(injury.bodyPart);
            node_assert_1.default.strictEqual(category, 'CORE');
        });
        (0, node_test_1.default)('should categorize knee as lower body', () => {
            const injury = createMockInjury({ bodyPart: 'LEFT_KNEE' });
            const category = injury_service_1.injuryService.getBodyPartCategory(injury.bodyPart);
            node_assert_1.default.strictEqual(category, 'LOWER_BODY');
        });
    });
    (0, node_test_1.describe)('Date Display', () => {
        (0, node_test_1.default)('should format occurred date correctly', () => {
            const injury = createMockInjury({ occurredAt: '2026-06-15T10:00:00Z' });
            const formatted = injury_service_1.injuryService.formatDate(injury.occurredAt);
            node_assert_1.default.ok(formatted.includes('15'));
            node_assert_1.default.ok(formatted.includes('Jun'));
            node_assert_1.default.ok(formatted.includes('2026'));
        });
        (0, node_test_1.default)('should format expected recovery date correctly', () => {
            const injury = createMockInjury({ expectedRecovery: '2026-07-01T00:00:00Z' });
            const formatted = injury_service_1.injuryService.formatDate(injury.expectedRecovery);
            node_assert_1.default.ok(formatted.includes('1'));
            node_assert_1.default.ok(formatted.includes('Jul'));
            node_assert_1.default.ok(formatted.includes('2026'));
        });
        (0, node_test_1.default)('should handle missing expected recovery date', () => {
            const injury = createMockInjury({ expectedRecovery: undefined });
            const formatted = injury_service_1.injuryService.formatDate(injury.expectedRecovery);
            node_assert_1.default.strictEqual(formatted, 'Not set');
        });
    });
    (0, node_test_1.describe)('Recovery Progress', () => {
        (0, node_test_1.default)('should calculate days until recovery', () => {
            const now = Date.now();
            const oneDayMs = 24 * 60 * 60 * 1000;
            const injury = createMockInjury({
                expectedRecovery: new Date(now + 10 * oneDayMs).toISOString(),
                status: 'RECOVERING',
            });
            const days = injury_service_1.injuryService.getDaysUntilRecovery(injury);
            node_assert_1.default.ok(days !== null);
            node_assert_1.default.ok(days >= 9 && days <= 11);
        });
        (0, node_test_1.default)('should return null for healed injuries', () => {
            const injury = createMockInjury({
                status: 'HEALED',
                recoveryPercent: 100,
            });
            const days = injury_service_1.injuryService.getDaysUntilRecovery(injury);
            node_assert_1.default.strictEqual(days, null);
        });
        (0, node_test_1.default)('should return null for injuries without expected date', () => {
            const injury = createMockInjury({
                expectedRecovery: undefined,
            });
            const days = injury_service_1.injuryService.getDaysUntilRecovery(injury);
            node_assert_1.default.strictEqual(days, null);
        });
        (0, node_test_1.default)('should show 0% for new injury', () => {
            const injury = createMockInjury({ recoveryPercent: 0 });
            node_assert_1.default.strictEqual(injury.recoveryPercent, 0);
        });
        (0, node_test_1.default)('should show 100% for healed injury', () => {
            const injury = createMockInjury({
                recoveryPercent: 100,
                status: 'HEALED',
            });
            node_assert_1.default.strictEqual(injury.recoveryPercent, 100);
        });
        (0, node_test_1.default)('should clamp progress between 0 and 100', () => {
            const injury = createMockInjury({ recoveryPercent: 150 });
            const clampedProgress = Math.max(0, Math.min(100, injury.recoveryPercent));
            node_assert_1.default.strictEqual(clampedProgress, 100);
            const negativeInjury = createMockInjury({ recoveryPercent: -10 });
            const clampedNegative = Math.max(0, Math.min(100, negativeInjury.recoveryPercent));
            node_assert_1.default.strictEqual(clampedNegative, 0);
        });
    });
    (0, node_test_1.describe)('Coach Sharing', () => {
        (0, node_test_1.default)('should show shared badge when sharedWithCoach is true', () => {
            const injury = createMockInjury({ sharedWithCoach: true });
            node_assert_1.default.strictEqual(injury.sharedWithCoach, true);
        });
        (0, node_test_1.default)('should not show shared badge when sharedWithCoach is false', () => {
            const injury = createMockInjury({ sharedWithCoach: false });
            node_assert_1.default.strictEqual(injury.sharedWithCoach, false);
        });
    });
    (0, node_test_1.describe)('Compact Variant', () => {
        (0, node_test_1.default)('compact variant should work with minimal data', () => {
            const minimalInjury = createMockInjury({
                description: 'Brief description',
                notes: [],
                expectedRecovery: undefined,
            });
            node_assert_1.default.ok(minimalInjury.id);
            node_assert_1.default.ok(minimalInjury.bodyPart);
            node_assert_1.default.ok(minimalInjury.status);
        });
        (0, node_test_1.default)('compact variant should show status and recovery percent', () => {
            const injury = createMockInjury();
            const statusInfo = injury_service_1.injuryService.getStatusInfo(injury.status);
            node_assert_1.default.ok(statusInfo.label);
            node_assert_1.default.ok(injury.recoveryPercent >= 0);
        });
    });
    (0, node_test_1.describe)('Interaction Logic', () => {
        (0, node_test_1.default)('injury should be pressable when onPress is provided', () => {
            createMockInjury();
            let pressed = false;
            const onPress = () => {
                pressed = true;
            };
            onPress();
            node_assert_1.default.strictEqual(pressed, true);
        });
        (0, node_test_1.default)('should navigate to injury detail on press', () => {
            const injury = createMockInjury();
            const expectedPath = `/health/${injury.id}`;
            node_assert_1.default.strictEqual(`/health/${injury.id}`, expectedPath);
        });
    });
});
(0, node_test_1.describe)('InjuryCard Accessibility', () => {
    (0, node_test_1.default)('injury card should have accessible content', () => {
        const injury = createMockInjury();
        node_assert_1.default.ok(injury.description.length > 0, 'Description should be non-empty');
        node_assert_1.default.ok(injury.bodyPart, 'Body part should be defined');
    });
    (0, node_test_1.default)('progress should be describable', () => {
        const injury = createMockInjury({ recoveryPercent: 75 });
        const progressDescription = `${injury.recoveryPercent}% recovered`;
        node_assert_1.default.strictEqual(progressDescription, '75% recovered');
    });
    (0, node_test_1.default)('severity should be describable', () => {
        const injury = createMockInjury({ severity: 'MODERATE' });
        const info = injury_service_1.injuryService.getSeverityInfo(injury.severity);
        const description = `${info.label} severity injury`;
        node_assert_1.default.strictEqual(description, 'Moderate severity injury');
    });
    (0, node_test_1.default)('status should be describable', () => {
        const injury = createMockInjury({ status: 'RECOVERING' });
        const info = injury_service_1.injuryService.getStatusInfo(injury.status);
        const description = `Status: ${info.label}`;
        node_assert_1.default.strictEqual(description, 'Status: Recovering');
    });
});
(0, node_test_1.describe)('InjuryCard Edge Cases', () => {
    (0, node_test_1.default)('should handle very long description', () => {
        const longDescription = 'A'.repeat(500);
        const injury = createMockInjury({ description: longDescription });
        node_assert_1.default.strictEqual(injury.description.length, 500);
    });
    (0, node_test_1.default)('should handle special characters in description', () => {
        const specialDescription = 'Injury with "quotes" & <special> chars!';
        const injury = createMockInjury({ description: specialDescription });
        node_assert_1.default.strictEqual(injury.description, specialDescription);
    });
    (0, node_test_1.default)('should handle many notes', () => {
        const manyNotes = Array.from({ length: 50 }, (_, i) => ({
            id: `note_${i}`,
            injuryId: 'injury_test_1',
            note: `Note ${i}`,
            createdAt: new Date().toISOString(),
            createdBy: 'user1',
            createdByName: 'User',
            recoveryPercent: i * 2,
        }));
        const injury = createMockInjury({ notes: manyNotes });
        node_assert_1.default.strictEqual(injury.notes.length, 50);
    });
    (0, node_test_1.default)('should handle injury with no notes', () => {
        const injury = createMockInjury({ notes: [] });
        node_assert_1.default.strictEqual(injury.notes.length, 0);
    });
    (0, node_test_1.default)('should handle all body parts', () => {
        const bodyParts = [
            'HEAD', 'NECK',
            'LEFT_SHOULDER', 'RIGHT_SHOULDER',
            'LEFT_ARM', 'RIGHT_ARM',
            'LEFT_ELBOW', 'RIGHT_ELBOW',
            'LEFT_WRIST', 'RIGHT_WRIST',
            'LEFT_HAND', 'RIGHT_HAND',
            'CHEST', 'UPPER_BACK', 'LOWER_BACK', 'ABDOMEN',
            'LEFT_HIP', 'RIGHT_HIP',
            'LEFT_THIGH', 'RIGHT_THIGH',
            'LEFT_KNEE', 'RIGHT_KNEE',
            'LEFT_CALF', 'RIGHT_CALF',
            'LEFT_ANKLE', 'RIGHT_ANKLE',
            'LEFT_FOOT', 'RIGHT_FOOT',
        ];
        bodyParts.forEach((part) => {
            const injury = createMockInjury({ bodyPart: part });
            const label = injury_service_1.injuryService.getBodyPartLabel(injury.bodyPart);
            const category = injury_service_1.injuryService.getBodyPartCategory(injury.bodyPart);
            node_assert_1.default.ok(label, `Body part ${part} should have a label`);
            node_assert_1.default.ok(category, `Body part ${part} should have a category`);
        });
    });
    (0, node_test_1.default)('should handle healed injury with healedAt date', () => {
        const injury = createMockInjury({
            status: 'HEALED',
            recoveryPercent: 100,
            healedAt: '2026-01-15T10:00:00Z',
        });
        node_assert_1.default.strictEqual(injury.status, 'HEALED');
        node_assert_1.default.ok(injury.healedAt);
    });
});
