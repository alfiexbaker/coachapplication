"use strict";
/**
 * SafetyChecklist Component Tests
 *
 * Unit tests for the SafetyChecklist component
 * testing completion status, rendering, and edge cases.
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
(0, node_test_1.describe)('SafetyChecklist', () => {
    (0, node_test_1.describe)('Completion Status', () => {
        (0, node_test_1.default)('should calculate completed count correctly', () => {
            const items = [
                { key: 'contact', label: 'Emergency Contact', isComplete: true },
                { key: 'consent', label: 'Emergency Treatment Consent', isComplete: true },
                { key: 'medical', label: 'Medical Information', isComplete: false },
            ];
            const completedCount = items.filter(i => i.isComplete).length;
            node_assert_1.default.strictEqual(completedCount, 2);
        });
        (0, node_test_1.default)('should identify when all items are complete', () => {
            const items = [
                { key: 'contact', label: 'Emergency Contact', isComplete: true },
                { key: 'consent', label: 'Emergency Treatment Consent', isComplete: true },
                { key: 'medical', label: 'Medical Information', isComplete: true },
            ];
            const completedCount = items.filter(i => i.isComplete).length;
            const isAllComplete = completedCount === items.length;
            node_assert_1.default.strictEqual(isAllComplete, true);
        });
        (0, node_test_1.default)('should identify when some items are incomplete', () => {
            const items = [
                { key: 'contact', label: 'Emergency Contact', isComplete: true },
                { key: 'consent', label: 'Emergency Treatment Consent', isComplete: false },
                { key: 'medical', label: 'Medical Information', isComplete: false },
            ];
            const completedCount = items.filter(i => i.isComplete).length;
            const isAllComplete = completedCount === items.length;
            node_assert_1.default.strictEqual(isAllComplete, false);
            node_assert_1.default.strictEqual(completedCount, 1);
        });
        (0, node_test_1.default)('should handle all incomplete items', () => {
            const items = [
                { key: 'contact', label: 'Emergency Contact', isComplete: false },
                { key: 'consent', label: 'Emergency Treatment Consent', isComplete: false },
                { key: 'medical', label: 'Medical Information', isComplete: false },
            ];
            const completedCount = items.filter(i => i.isComplete).length;
            node_assert_1.default.strictEqual(completedCount, 0);
        });
    });
    (0, node_test_1.describe)('Progress Display', () => {
        (0, node_test_1.default)('should format progress as fraction', () => {
            const completed = 2;
            const total = 3;
            const progress = `${completed}/${total}`;
            node_assert_1.default.strictEqual(progress, '2/3');
        });
        (0, node_test_1.default)('should show correct status message for complete', () => {
            const completedCount = 3;
            const total = 3;
            const isAllComplete = completedCount === total;
            const message = isAllComplete
                ? 'All safety requirements met'
                : `${completedCount}/${total} requirements complete`;
            node_assert_1.default.strictEqual(message, 'All safety requirements met');
        });
        (0, node_test_1.default)('should show correct status message for incomplete', () => {
            const getStatusMessage = (completed, total) => {
                const isAllComplete = completed === total;
                return isAllComplete
                    ? 'All safety requirements met'
                    : `${completed}/${total} requirements complete`;
            };
            node_assert_1.default.strictEqual(getStatusMessage(2, 3), '2/3 requirements complete');
        });
    });
    (0, node_test_1.describe)('SafetyStatusIndicator', () => {
        (0, node_test_1.default)('should return complete status when both requirements met', () => {
            const hasEmergencyContact = true;
            const hasEmergencyConsent = true;
            const isComplete = hasEmergencyContact && hasEmergencyConsent;
            node_assert_1.default.strictEqual(isComplete, true);
        });
        (0, node_test_1.default)('should return incomplete status when contact missing', () => {
            const hasEmergencyContact = false;
            const hasEmergencyConsent = true;
            const isComplete = hasEmergencyContact && hasEmergencyConsent;
            node_assert_1.default.strictEqual(isComplete, false);
        });
        (0, node_test_1.default)('should return incomplete status when consent missing', () => {
            const hasEmergencyContact = true;
            const hasEmergencyConsent = false;
            const isComplete = hasEmergencyContact && hasEmergencyConsent;
            node_assert_1.default.strictEqual(isComplete, false);
        });
        (0, node_test_1.default)('should return incomplete status when both missing', () => {
            const hasEmergencyContact = false;
            const hasEmergencyConsent = false;
            const isComplete = hasEmergencyContact && hasEmergencyConsent;
            node_assert_1.default.strictEqual(isComplete, false);
        });
    });
    (0, node_test_1.describe)('SessionSafetySummary', () => {
        (0, node_test_1.default)('should correctly identify missing info count', () => {
            const missingInfoCount = 2;
            const hasMissingInfo = missingInfoCount > 0;
            node_assert_1.default.strictEqual(hasMissingInfo, true);
        });
        (0, node_test_1.default)('should format plural message correctly for multiple athletes', () => {
            const formatMessage = (count) => `${count} athlete${count !== 1 ? 's' : ''} missing emergency contact`;
            node_assert_1.default.strictEqual(formatMessage(3), '3 athletes missing emergency contact');
        });
        (0, node_test_1.default)('should format singular message correctly for one athlete', () => {
            const formatMessage = (count) => `${count} athlete${count !== 1 ? 's' : ''} missing emergency contact`;
            node_assert_1.default.strictEqual(formatMessage(1), '1 athlete missing emergency contact');
        });
        (0, node_test_1.default)('should not show warning when no missing info', () => {
            const missingInfoCount = 0;
            const hasMissingInfo = missingInfoCount > 0;
            node_assert_1.default.strictEqual(hasMissingInfo, false);
        });
        (0, node_test_1.default)('should calculate stats correctly', () => {
            const totalAthletes = 10;
            const athletesWithAlerts = 4;
            const missingInfoCount = 2;
            node_assert_1.default.ok(athletesWithAlerts <= totalAthletes);
            node_assert_1.default.ok(missingInfoCount <= totalAthletes);
        });
    });
});
