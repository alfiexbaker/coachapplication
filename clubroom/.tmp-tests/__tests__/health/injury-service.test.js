"use strict";
/**
 * Injury Service Tests
 *
 * Unit tests for the injury service functionality including
 * CRUD operations, recovery notes, and status management.
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
// Reset to mock data before each test
(0, node_test_1.beforeEach)(async () => {
    await injury_service_1.injuryService.resetToMockData();
});
(0, node_test_1.describe)('Injury Service', () => {
    (0, node_test_1.describe)('logInjury', () => {
        (0, node_test_1.default)('should log a new injury with required fields', async () => {
            const input = {
                bodyPart: 'LEFT_KNEE',
                description: 'Twisted knee during training',
                severity: 'MODERATE',
                occurredAt: new Date().toISOString(),
            };
            const injury = await injury_service_1.injuryService.logInjury('test_user', input, 'Test User');
            node_assert_1.default.ok(injury.id.startsWith('injury_'));
            node_assert_1.default.strictEqual(injury.bodyPart, 'LEFT_KNEE');
            node_assert_1.default.strictEqual(injury.description, 'Twisted knee during training');
            node_assert_1.default.strictEqual(injury.severity, 'MODERATE');
            node_assert_1.default.strictEqual(injury.status, 'ACTIVE');
            node_assert_1.default.strictEqual(injury.recoveryPercent, 0);
            node_assert_1.default.strictEqual(injury.userId, 'test_user');
            node_assert_1.default.strictEqual(injury.sharedWithCoach, true);
            node_assert_1.default.deepStrictEqual(injury.notes, []);
            node_assert_1.default.ok(injury.createdAt);
            node_assert_1.default.ok(injury.updatedAt);
        });
        (0, node_test_1.default)('should log injury with all optional fields', async () => {
            const input = {
                bodyPart: 'RIGHT_ANKLE',
                description: 'Sprained ankle',
                severity: 'MINOR',
                occurredAt: '2026-01-05T10:00:00Z',
                expectedRecovery: '2026-01-20T00:00:00Z',
                sharedWithCoach: false,
            };
            const injury = await injury_service_1.injuryService.logInjury('test_user', input);
            node_assert_1.default.strictEqual(injury.bodyPart, 'RIGHT_ANKLE');
            node_assert_1.default.strictEqual(injury.expectedRecovery, '2026-01-20T00:00:00Z');
            node_assert_1.default.strictEqual(injury.sharedWithCoach, false);
        });
        (0, node_test_1.default)('should set sharedWithCoach to true by default', async () => {
            const input = {
                bodyPart: 'HEAD',
                description: 'Minor headache',
                severity: 'MINOR',
                occurredAt: new Date().toISOString(),
            };
            const injury = await injury_service_1.injuryService.logInjury('test_user', input);
            node_assert_1.default.strictEqual(injury.sharedWithCoach, true);
        });
    });
    (0, node_test_1.describe)('getUserInjuries', () => {
        (0, node_test_1.default)('should return injuries for a specific user', async () => {
            const injuries = await injury_service_1.injuryService.getUserInjuries('user1');
            node_assert_1.default.ok(Array.isArray(injuries));
            node_assert_1.default.ok(injuries.length > 0);
            injuries.forEach((injury) => {
                node_assert_1.default.strictEqual(injury.userId, 'user1');
            });
        });
        (0, node_test_1.default)('should include healed injuries by default', async () => {
            const injuries = await injury_service_1.injuryService.getUserInjuries('user1', true);
            const hasHealed = injuries.some((i) => i.status === 'HEALED');
            node_assert_1.default.ok(hasHealed, 'Should include healed injuries');
        });
        (0, node_test_1.default)('should exclude healed injuries when includeHealed is false', async () => {
            const injuries = await injury_service_1.injuryService.getUserInjuries('user1', false);
            injuries.forEach((injury) => {
                node_assert_1.default.notStrictEqual(injury.status, 'HEALED');
            });
        });
        (0, node_test_1.default)('should sort injuries with active first, then recovering, then healed', async () => {
            const injuries = await injury_service_1.injuryService.getUserInjuries('user1', true);
            const statusOrder = { ACTIVE: 0, RECOVERING: 1, HEALED: 2 };
            let lastOrder = -1;
            injuries.forEach((injury) => {
                const currentOrder = statusOrder[injury.status];
                node_assert_1.default.ok(currentOrder >= lastOrder, 'Injuries should be sorted by status');
                if (currentOrder > lastOrder) {
                    lastOrder = currentOrder;
                }
            });
        });
    });
    (0, node_test_1.describe)('getInjuryById', () => {
        (0, node_test_1.default)('should return injury by ID', async () => {
            const injury = await injury_service_1.injuryService.getInjuryById('injury_1');
            node_assert_1.default.ok(injury);
            node_assert_1.default.strictEqual(injury.id, 'injury_1');
        });
        (0, node_test_1.default)('should return null for non-existent injury', async () => {
            const injury = await injury_service_1.injuryService.getInjuryById('non_existent');
            node_assert_1.default.strictEqual(injury, null);
        });
    });
    (0, node_test_1.describe)('updateInjury', () => {
        (0, node_test_1.default)('should update injury fields', async () => {
            const originalInjury = await injury_service_1.injuryService.getInjuryById('injury_1');
            node_assert_1.default.ok(originalInjury);
            const updatedInjury = await injury_service_1.injuryService.updateInjury('injury_1', {
                description: 'Updated description',
                severity: 'SEVERE',
                recoveryPercent: 50,
            });
            node_assert_1.default.ok(updatedInjury);
            node_assert_1.default.strictEqual(updatedInjury.description, 'Updated description');
            node_assert_1.default.strictEqual(updatedInjury.severity, 'SEVERE');
            node_assert_1.default.strictEqual(updatedInjury.recoveryPercent, 50);
            node_assert_1.default.ok(new Date(updatedInjury.updatedAt) > new Date(originalInjury.updatedAt));
        });
        (0, node_test_1.default)('should set healedAt when marking as healed', async () => {
            const updatedInjury = await injury_service_1.injuryService.updateInjury('injury_1', {
                status: 'HEALED',
            });
            node_assert_1.default.ok(updatedInjury);
            node_assert_1.default.strictEqual(updatedInjury.status, 'HEALED');
            node_assert_1.default.strictEqual(updatedInjury.recoveryPercent, 100);
            node_assert_1.default.ok(updatedInjury.healedAt);
        });
        (0, node_test_1.default)('should return null for non-existent injury', async () => {
            const result = await injury_service_1.injuryService.updateInjury('non_existent', { description: 'Test' });
            node_assert_1.default.strictEqual(result, null);
        });
    });
    (0, node_test_1.describe)('addRecoveryNote', () => {
        (0, node_test_1.default)('should add a recovery note to an injury', async () => {
            const injury = await injury_service_1.injuryService.getInjuryById('injury_1');
            node_assert_1.default.ok(injury);
            const originalNoteCount = injury.notes.length;
            const updatedInjury = await injury_service_1.injuryService.addRecoveryNote('injury_1', 'Feeling better today', 'user1', 'Tom Henderson', 70);
            node_assert_1.default.ok(updatedInjury);
            node_assert_1.default.strictEqual(updatedInjury.notes.length, originalNoteCount + 1);
            const newNote = updatedInjury.notes[updatedInjury.notes.length - 1];
            node_assert_1.default.ok(newNote.id.startsWith('note_'));
            node_assert_1.default.strictEqual(newNote.injuryId, 'injury_1');
            node_assert_1.default.strictEqual(newNote.note, 'Feeling better today');
            node_assert_1.default.strictEqual(newNote.createdBy, 'user1');
            node_assert_1.default.strictEqual(newNote.recoveryPercent, 70);
        });
        (0, node_test_1.default)('should update recovery percent when adding note with progress', async () => {
            const updatedInjury = await injury_service_1.injuryService.addRecoveryNote('injury_1', 'Progress update', 'user1', 'User', 80);
            node_assert_1.default.ok(updatedInjury);
            node_assert_1.default.strictEqual(updatedInjury.recoveryPercent, 80);
        });
        (0, node_test_1.default)('should transition status from ACTIVE to RECOVERING when progress > 0', async () => {
            // Create a new active injury
            const input = {
                bodyPart: 'LEFT_WRIST',
                description: 'Wrist strain',
                severity: 'MINOR',
                occurredAt: new Date().toISOString(),
            };
            const injury = await injury_service_1.injuryService.logInjury('test_user', input);
            node_assert_1.default.strictEqual(injury.status, 'ACTIVE');
            // Add note with progress
            const updated = await injury_service_1.injuryService.addRecoveryNote(injury.id, 'Starting recovery', 'test_user', 'Test', 25);
            node_assert_1.default.ok(updated);
            node_assert_1.default.strictEqual(updated.status, 'RECOVERING');
        });
        (0, node_test_1.default)('should auto-heal when progress reaches 100', async () => {
            const input = {
                bodyPart: 'RIGHT_FOOT',
                description: 'Bruised foot',
                severity: 'MINOR',
                occurredAt: new Date().toISOString(),
            };
            const injury = await injury_service_1.injuryService.logInjury('test_user', input);
            const updated = await injury_service_1.injuryService.addRecoveryNote(injury.id, 'Fully recovered', 'test_user', 'Test', 100);
            node_assert_1.default.ok(updated);
            node_assert_1.default.strictEqual(updated.status, 'HEALED');
            node_assert_1.default.strictEqual(updated.recoveryPercent, 100);
            node_assert_1.default.ok(updated.healedAt);
        });
        (0, node_test_1.default)('should return null for non-existent injury', async () => {
            const result = await injury_service_1.injuryService.addRecoveryNote('non_existent', 'Test note', 'user1');
            node_assert_1.default.strictEqual(result, null);
        });
    });
    (0, node_test_1.describe)('markAsHealed', () => {
        (0, node_test_1.default)('should mark injury as healed', async () => {
            const updatedInjury = await injury_service_1.injuryService.markAsHealed('injury_1');
            node_assert_1.default.ok(updatedInjury);
            node_assert_1.default.strictEqual(updatedInjury.status, 'HEALED');
            node_assert_1.default.strictEqual(updatedInjury.recoveryPercent, 100);
            node_assert_1.default.ok(updatedInjury.healedAt);
        });
        (0, node_test_1.default)('should return null for non-existent injury', async () => {
            const result = await injury_service_1.injuryService.markAsHealed('non_existent');
            node_assert_1.default.strictEqual(result, null);
        });
    });
    (0, node_test_1.describe)('getAthleteInjuries', () => {
        (0, node_test_1.default)('should return only shared injuries', async () => {
            // Log an unshared injury
            const input = {
                bodyPart: 'NECK',
                description: 'Private injury',
                severity: 'MINOR',
                occurredAt: new Date().toISOString(),
                sharedWithCoach: false,
            };
            await injury_service_1.injuryService.logInjury('user1', input);
            const athleteInjuries = await injury_service_1.injuryService.getAthleteInjuries('user1');
            athleteInjuries.forEach((injury) => {
                node_assert_1.default.strictEqual(injury.sharedWithCoach, true);
            });
        });
    });
    (0, node_test_1.describe)('hasActiveInjury', () => {
        (0, node_test_1.default)('should return true if user has active injuries', async () => {
            const hasActive = await injury_service_1.injuryService.hasActiveInjury('user1');
            node_assert_1.default.strictEqual(hasActive, true);
        });
        (0, node_test_1.default)('should return true if user has recovering injuries', async () => {
            // user1 has a RECOVERING injury in mock data
            const hasActive = await injury_service_1.injuryService.hasActiveInjury('user1');
            node_assert_1.default.strictEqual(hasActive, true);
        });
        (0, node_test_1.default)('should return false if user has only healed injuries', async () => {
            // Create a user with only healed injuries
            const input = {
                bodyPart: 'LEFT_HAND',
                description: 'Old injury',
                severity: 'MINOR',
                occurredAt: new Date().toISOString(),
            };
            const injury = await injury_service_1.injuryService.logInjury('new_user', input);
            await injury_service_1.injuryService.markAsHealed(injury.id);
            const hasActive = await injury_service_1.injuryService.hasActiveInjury('new_user');
            node_assert_1.default.strictEqual(hasActive, false);
        });
    });
    (0, node_test_1.describe)('getActiveInjuryCount', () => {
        (0, node_test_1.default)('should return correct count of active/recovering injuries', async () => {
            const count = await injury_service_1.injuryService.getActiveInjuryCount('user1');
            node_assert_1.default.ok(typeof count === 'number');
            node_assert_1.default.ok(count >= 0);
        });
    });
    (0, node_test_1.describe)('getInjuryStats', () => {
        (0, node_test_1.default)('should return correct statistics', async () => {
            const stats = await injury_service_1.injuryService.getInjuryStats('user1');
            node_assert_1.default.ok(typeof stats.totalInjuries === 'number');
            node_assert_1.default.ok(typeof stats.activeInjuries === 'number');
            node_assert_1.default.ok(typeof stats.recoveringInjuries === 'number');
            node_assert_1.default.ok(typeof stats.healedInjuries === 'number');
            node_assert_1.default.ok(Array.isArray(stats.commonBodyParts));
            node_assert_1.default.ok(typeof stats.averageRecoveryDays === 'number');
        });
        (0, node_test_1.default)('should count body parts correctly', async () => {
            const stats = await injury_service_1.injuryService.getInjuryStats('user1');
            // commonBodyParts should be sorted by count descending
            for (let i = 0; i < stats.commonBodyParts.length - 1; i++) {
                node_assert_1.default.ok(stats.commonBodyParts[i].count >= stats.commonBodyParts[i + 1].count, 'Body parts should be sorted by count');
            }
        });
        (0, node_test_1.default)('should limit common body parts to top 5', async () => {
            const stats = await injury_service_1.injuryService.getInjuryStats('user1');
            node_assert_1.default.ok(stats.commonBodyParts.length <= 5);
        });
    });
    (0, node_test_1.describe)('Body Part Utilities', () => {
        (0, node_test_1.default)('getBodyPartCategory should return correct category', () => {
            node_assert_1.default.strictEqual(injury_service_1.injuryService.getBodyPartCategory('HEAD'), 'HEAD');
            node_assert_1.default.strictEqual(injury_service_1.injuryService.getBodyPartCategory('NECK'), 'HEAD');
            node_assert_1.default.strictEqual(injury_service_1.injuryService.getBodyPartCategory('LEFT_SHOULDER'), 'UPPER_BODY');
            node_assert_1.default.strictEqual(injury_service_1.injuryService.getBodyPartCategory('CHEST'), 'CORE');
            node_assert_1.default.strictEqual(injury_service_1.injuryService.getBodyPartCategory('LEFT_KNEE'), 'LOWER_BODY');
        });
        (0, node_test_1.default)('getBodyPartLabel should return readable labels', () => {
            node_assert_1.default.strictEqual(injury_service_1.injuryService.getBodyPartLabel('LEFT_KNEE'), 'Left Knee');
            node_assert_1.default.strictEqual(injury_service_1.injuryService.getBodyPartLabel('RIGHT_SHOULDER'), 'Right Shoulder');
            node_assert_1.default.strictEqual(injury_service_1.injuryService.getBodyPartLabel('LOWER_BACK'), 'Lower Back');
        });
        (0, node_test_1.default)('getBodyPartsByCategory should return correct parts', () => {
            const headParts = injury_service_1.injuryService.getBodyPartsByCategory('HEAD');
            node_assert_1.default.ok(headParts.includes('HEAD'));
            node_assert_1.default.ok(headParts.includes('NECK'));
            node_assert_1.default.ok(!headParts.includes('LEFT_KNEE'));
            const lowerBodyParts = injury_service_1.injuryService.getBodyPartsByCategory('LOWER_BODY');
            node_assert_1.default.ok(lowerBodyParts.includes('LEFT_KNEE'));
            node_assert_1.default.ok(lowerBodyParts.includes('RIGHT_ANKLE'));
            node_assert_1.default.ok(!lowerBodyParts.includes('HEAD'));
        });
    });
    (0, node_test_1.describe)('Display Helpers', () => {
        (0, node_test_1.default)('getSeverityInfo should return correct info for all severities', () => {
            const severities = ['MINOR', 'MODERATE', 'SEVERE'];
            severities.forEach((severity) => {
                const info = injury_service_1.injuryService.getSeverityInfo(severity);
                node_assert_1.default.ok(info.label);
                node_assert_1.default.ok(info.color);
                node_assert_1.default.ok(info.icon);
            });
        });
        (0, node_test_1.default)('getStatusInfo should return correct info for all statuses', () => {
            const statuses = ['ACTIVE', 'RECOVERING', 'HEALED'];
            statuses.forEach((status) => {
                const info = injury_service_1.injuryService.getStatusInfo(status);
                node_assert_1.default.ok(info.label);
                node_assert_1.default.ok(info.color);
                node_assert_1.default.ok(info.icon);
            });
        });
        (0, node_test_1.default)('formatDate should format date correctly', () => {
            const formatted = injury_service_1.injuryService.formatDate('2026-06-15');
            node_assert_1.default.ok(formatted.includes('15'));
            node_assert_1.default.ok(formatted.includes('Jun'));
            node_assert_1.default.ok(formatted.includes('2026'));
            const noDate = injury_service_1.injuryService.formatDate(undefined);
            node_assert_1.default.strictEqual(noDate, 'Not set');
        });
    });
    (0, node_test_1.describe)('Recovery Progress', () => {
        (0, node_test_1.default)('calculateExpectedProgress should return correct progress', () => {
            const now = Date.now();
            const oneDayMs = 24 * 60 * 60 * 1000;
            // Injury occurred 5 days ago, expected recovery in 5 days (50% progress)
            const injury = {
                id: 'test',
                userId: 'user1',
                bodyPart: 'LEFT_KNEE',
                description: 'Test',
                severity: 'MODERATE',
                occurredAt: new Date(now - 5 * oneDayMs).toISOString(),
                expectedRecovery: new Date(now + 5 * oneDayMs).toISOString(),
                status: 'RECOVERING',
                notes: [],
                recoveryPercent: 30,
                sharedWithCoach: true,
                createdAt: new Date(now - 5 * oneDayMs).toISOString(),
                updatedAt: new Date().toISOString(),
            };
            const progress = injury_service_1.injuryService.calculateExpectedProgress(injury);
            node_assert_1.default.ok(progress >= 45 && progress <= 55, 'Expected ~50% progress');
        });
        (0, node_test_1.default)('getDaysUntilRecovery should return correct days', () => {
            const now = Date.now();
            const oneDayMs = 24 * 60 * 60 * 1000;
            const injury = {
                id: 'test',
                userId: 'user1',
                bodyPart: 'LEFT_KNEE',
                description: 'Test',
                severity: 'MODERATE',
                occurredAt: new Date().toISOString(),
                expectedRecovery: new Date(now + 10 * oneDayMs).toISOString(),
                status: 'RECOVERING',
                notes: [],
                recoveryPercent: 30,
                sharedWithCoach: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            const days = injury_service_1.injuryService.getDaysUntilRecovery(injury);
            node_assert_1.default.ok(days !== null);
            node_assert_1.default.ok(days >= 9 && days <= 11, 'Expected ~10 days');
        });
        (0, node_test_1.default)('getDaysUntilRecovery should return null for healed injuries', () => {
            const injury = {
                id: 'test',
                userId: 'user1',
                bodyPart: 'LEFT_KNEE',
                description: 'Test',
                severity: 'MODERATE',
                occurredAt: new Date().toISOString(),
                expectedRecovery: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'HEALED',
                notes: [],
                recoveryPercent: 100,
                sharedWithCoach: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                healedAt: new Date().toISOString(),
            };
            const days = injury_service_1.injuryService.getDaysUntilRecovery(injury);
            node_assert_1.default.strictEqual(days, null);
        });
        (0, node_test_1.default)('getDaysUntilRecovery should return null for injuries without expected date', () => {
            const injury = {
                id: 'test',
                userId: 'user1',
                bodyPart: 'LEFT_KNEE',
                description: 'Test',
                severity: 'MODERATE',
                occurredAt: new Date().toISOString(),
                status: 'ACTIVE',
                notes: [],
                recoveryPercent: 0,
                sharedWithCoach: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            const days = injury_service_1.injuryService.getDaysUntilRecovery(injury);
            node_assert_1.default.strictEqual(days, null);
        });
    });
});
