"use strict";
/**
 * Family Member Service Tests
 *
 * Tests for family member CRUD, bookings, spending, and progress queries.
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
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importStar(require("node:test"));
const family_member_service_1 = require("../../services/family/family-member-service");
(0, node_test_1.describe)('familyMemberService', () => {
    (0, node_test_1.describe)('getFamilyMembers', () => {
        (0, node_test_1.default)('returns array of family members', async () => {
            const members = await family_member_service_1.familyMemberService.getFamilyMembers('parent_1');
            strict_1.default.ok(Array.isArray(members));
        });
    });
    (0, node_test_1.describe)('getFamilyMember', () => {
        (0, node_test_1.default)('returns null for non-existent child', async () => {
            const member = await family_member_service_1.familyMemberService.getFamilyMember('nonexistent_child');
            strict_1.default.equal(member, null);
        });
    });
    (0, node_test_1.describe)('getById (Result pattern)', () => {
        (0, node_test_1.default)('returns err for non-existent child', async () => {
            const result = await family_member_service_1.familyMemberService.getById('nonexistent_xyz');
            strict_1.default.strictEqual(result.success, false);
        });
    });
    (0, node_test_1.describe)('create (Result pattern)', () => {
        (0, node_test_1.default)('creates a family member', async () => {
            const result = await family_member_service_1.familyMemberService.create('parent_test_1', {
                name: 'Test Child',
                age: 10,
                dateOfBirth: '2016-05-15',
                relationship: 'son',
            });
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.name, 'Test Child');
                strict_1.default.ok(result.data.id);
            }
        });
    });
    (0, node_test_1.describe)('update (Result pattern)', () => {
        (0, node_test_1.default)('returns err for non-existent child', async () => {
            const result = await family_member_service_1.familyMemberService.update('nonexistent_child', { name: 'Updated' });
            strict_1.default.strictEqual(result.success, false);
        });
    });
    (0, node_test_1.describe)('getActive', () => {
        (0, node_test_1.default)('returns array of active members', async () => {
            const active = await family_member_service_1.familyMemberService.getActive('parent_1');
            strict_1.default.ok(Array.isArray(active));
        });
    });
    (0, node_test_1.describe)('getFamilyBookings', () => {
        (0, node_test_1.default)('returns array of bookings', async () => {
            const bookings = await family_member_service_1.familyMemberService.getFamilyBookings('parent_1');
            strict_1.default.ok(Array.isArray(bookings));
        });
    });
    (0, node_test_1.describe)('getFamilySpending', () => {
        (0, node_test_1.default)('returns array of spending records', async () => {
            const spending = await family_member_service_1.familyMemberService.getFamilySpending('parent_1');
            strict_1.default.ok(Array.isArray(spending));
        });
    });
    (0, node_test_1.describe)('getFamilySpendingSummary', () => {
        (0, node_test_1.default)('returns summary with totalSpent', async () => {
            const summary = await family_member_service_1.familyMemberService.getFamilySpendingSummary('parent_1');
            strict_1.default.equal(typeof summary.totalSpent, 'number');
        });
    });
    (0, node_test_1.describe)('getNextChildColor', () => {
        (0, node_test_1.default)('returns a color string', () => {
            const color = family_member_service_1.familyMemberService.getNextChildColor(0);
            strict_1.default.equal(typeof color, 'string');
        });
        (0, node_test_1.default)('returns different colors for different counts', () => {
            const c0 = family_member_service_1.familyMemberService.getNextChildColor(0);
            const c1 = family_member_service_1.familyMemberService.getNextChildColor(1);
            strict_1.default.notEqual(c0, c1);
        });
    });
    (0, node_test_1.describe)('formatAmount', () => {
        (0, node_test_1.default)('formats amount in GBP', () => {
            const result = family_member_service_1.familyMemberService.formatAmount(25);
            strict_1.default.ok(result.includes('25'));
        });
    });
});
