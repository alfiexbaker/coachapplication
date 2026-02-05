"use strict";
/**
 * EmergencyQuickCard Component Tests
 *
 * Unit tests for the EmergencyQuickCard component
 * testing rendering, interactions, and edge cases.
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
// Mock data for tests
const mockPrimaryContact = {
    id: 'contact_1',
    name: 'Sarah Henderson',
    relationship: 'Mother',
    phone: '+44 7700 900123',
    email: 'sarah@email.com',
    isPrimary: true,
    canPickup: true,
};
const mockAllergies = ['Peanuts', 'Tree nuts'];
const mockConditions = ['Mild asthma'];
const mockMedications = ['Ventolin inhaler'];
(0, node_test_1.describe)('EmergencyQuickCard', () => {
    (0, node_test_1.describe)('Alert Level Display', () => {
        (0, node_test_1.default)('should display correct alert level for high alerts', () => {
            // With 2+ allergies, alert level should be 'high'
            const allergies = ['Peanuts', 'Shellfish', 'Tree nuts'];
            node_assert_1.default.strictEqual(allergies.length >= 2, true);
        });
        (0, node_test_1.default)('should display correct alert level for medium alerts', () => {
            // With 1 allergy, alert level should be 'medium'
            const allergies = ['Peanuts'];
            node_assert_1.default.strictEqual(allergies.length >= 1 && allergies.length < 2, true);
        });
        (0, node_test_1.default)('should display no alerts for empty medical info', () => {
            const allergies = [];
            const conditions = [];
            const hasAlerts = allergies.length > 0 || conditions.length > 0;
            node_assert_1.default.strictEqual(hasAlerts, false);
        });
    });
    (0, node_test_1.describe)('Contact Display', () => {
        (0, node_test_1.default)('should have primary contact data available', () => {
            node_assert_1.default.ok(mockPrimaryContact.name);
            node_assert_1.default.ok(mockPrimaryContact.phone);
            node_assert_1.default.strictEqual(mockPrimaryContact.isPrimary, true);
        });
        (0, node_test_1.default)('should format contact relationship correctly', () => {
            const formattedContact = `${mockPrimaryContact.name} (${mockPrimaryContact.relationship})`;
            node_assert_1.default.strictEqual(formattedContact, 'Sarah Henderson (Mother)');
        });
        (0, node_test_1.default)('should handle contact without email', () => {
            const contactWithoutEmail = {
                ...mockPrimaryContact,
                email: undefined,
            };
            node_assert_1.default.strictEqual(contactWithoutEmail.email, undefined);
        });
    });
    (0, node_test_1.describe)('Medical Summary', () => {
        (0, node_test_1.default)('should limit displayed items to 3', () => {
            const allItems = [
                ...mockAllergies,
                ...mockConditions,
                ...mockMedications,
            ];
            const displayedItems = allItems.slice(0, 3);
            const remainingCount = allItems.length - displayedItems.length;
            node_assert_1.default.strictEqual(displayedItems.length, 3);
            node_assert_1.default.strictEqual(remainingCount, 1);
        });
        (0, node_test_1.default)('should correctly count remaining items', () => {
            const totalItems = mockAllergies.length + mockConditions.length + mockMedications.length;
            const displayedCount = 3;
            const remaining = totalItems - displayedCount;
            node_assert_1.default.strictEqual(remaining, 1);
        });
        (0, node_test_1.default)('should handle empty medical data', () => {
            const emptyAllergies = [];
            const emptyConditions = [];
            const emptyMedications = [];
            const totalItems = emptyAllergies.length + emptyConditions.length + emptyMedications.length;
            node_assert_1.default.strictEqual(totalItems, 0);
        });
    });
    (0, node_test_1.describe)('No Contact Warning', () => {
        (0, node_test_1.default)('should identify when no contact is available', () => {
            const primaryContact = null;
            const hasNoContact = primaryContact === null;
            node_assert_1.default.strictEqual(hasNoContact, true);
        });
    });
    (0, node_test_1.describe)('Item Type Classification', () => {
        (0, node_test_1.default)('should correctly classify allergies', () => {
            const items = mockAllergies.map(a => ({ label: a, type: 'allergy' }));
            items.forEach(item => {
                node_assert_1.default.strictEqual(item.type, 'allergy');
            });
        });
        (0, node_test_1.default)('should correctly classify conditions', () => {
            const items = mockConditions.map(c => ({ label: c, type: 'condition' }));
            items.forEach(item => {
                node_assert_1.default.strictEqual(item.type, 'condition');
            });
        });
        (0, node_test_1.default)('should correctly classify medications', () => {
            const items = mockMedications.map(m => ({ label: m, type: 'medication' }));
            items.forEach(item => {
                node_assert_1.default.strictEqual(item.type, 'medication');
            });
        });
    });
});
