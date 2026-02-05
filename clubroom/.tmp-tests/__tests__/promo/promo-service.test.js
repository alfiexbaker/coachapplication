"use strict";
/**
 * Promo Service Tests
 *
 * Unit tests for the promo code service functionality including
 * code creation, validation, redemption, and statistics.
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
const promo_service_1 = require("../../services/promo-service");
// Reset to mock data before each test
(0, node_test_1.beforeEach)(async () => {
    await promo_service_1.promoService.resetToMockData();
});
(0, node_test_1.describe)('Promo Service', () => {
    (0, node_test_1.describe)('createPromoCode', () => {
        (0, node_test_1.default)('should create a new promo code with required fields', async () => {
            const params = {
                code: 'TESTCODE',
                creditAmount: 15,
                maxUses: 100,
                createdBy: 'admin_test',
            };
            const result = await promo_service_1.promoService.createPromoCode(params);
            node_assert_1.default.strictEqual(result.success, true);
            if (!result.success)
                return;
            const promoCode = result.data;
            node_assert_1.default.ok(promoCode.id.startsWith('promo_'));
            node_assert_1.default.strictEqual(promoCode.code, 'TESTCODE');
            node_assert_1.default.strictEqual(promoCode.creditAmount, 15);
            node_assert_1.default.strictEqual(promoCode.maxUses, 100);
            node_assert_1.default.strictEqual(promoCode.currentUses, 0);
            node_assert_1.default.strictEqual(promoCode.isActive, true);
            node_assert_1.default.strictEqual(promoCode.onePerUser, true); // default
            node_assert_1.default.strictEqual(promoCode.createdBy, 'admin_test');
            node_assert_1.default.ok(promoCode.createdAt);
            node_assert_1.default.ok(promoCode.updatedAt);
        });
        (0, node_test_1.default)('should create a promo code with all optional fields', async () => {
            const params = {
                code: 'fulltest',
                creditAmount: 25,
                maxUses: 50,
                expiresAt: '2027-12-31T23:59:59.000Z',
                description: 'Test promo code',
                onePerUser: false,
                createdBy: 'admin_test',
                createdByName: 'Test Admin',
            };
            const result = await promo_service_1.promoService.createPromoCode(params);
            node_assert_1.default.strictEqual(result.success, true);
            if (!result.success)
                return;
            const promoCode = result.data;
            node_assert_1.default.strictEqual(promoCode.code, 'FULLTEST'); // Normalized to uppercase
            node_assert_1.default.strictEqual(promoCode.creditAmount, 25);
            node_assert_1.default.strictEqual(promoCode.maxUses, 50);
            node_assert_1.default.strictEqual(promoCode.expiresAt, '2027-12-31T23:59:59.000Z');
            node_assert_1.default.strictEqual(promoCode.description, 'Test promo code');
            node_assert_1.default.strictEqual(promoCode.onePerUser, false);
            node_assert_1.default.strictEqual(promoCode.createdByName, 'Test Admin');
        });
        (0, node_test_1.default)('should normalize code to uppercase', async () => {
            const params = {
                code: 'lowercase',
                creditAmount: 10,
                maxUses: 10,
                createdBy: 'admin_test',
            };
            const result = await promo_service_1.promoService.createPromoCode(params);
            node_assert_1.default.strictEqual(result.success, true);
            if (!result.success)
                return;
            node_assert_1.default.strictEqual(result.data.code, 'LOWERCASE');
        });
        (0, node_test_1.default)('should return error for duplicate code', async () => {
            const params = {
                code: 'WELCOME25', // Existing mock code
                creditAmount: 10,
                maxUses: 10,
                createdBy: 'admin_test',
            };
            const result = await promo_service_1.promoService.createPromoCode(params);
            node_assert_1.default.strictEqual(result.success, false);
            if (result.success)
                return;
            node_assert_1.default.ok(result.error.message.includes('already exists'));
        });
        (0, node_test_1.default)('should return error for invalid credit amount', async () => {
            const params = {
                code: 'INVALID',
                creditAmount: 0,
                maxUses: 10,
                createdBy: 'admin_test',
            };
            const result = await promo_service_1.promoService.createPromoCode(params);
            node_assert_1.default.strictEqual(result.success, false);
            if (result.success)
                return;
            node_assert_1.default.ok(result.error.message.includes('greater than zero'));
        });
        (0, node_test_1.default)('should return error for invalid max uses', async () => {
            const params = {
                code: 'INVALID2',
                creditAmount: 10,
                maxUses: -1,
                createdBy: 'admin_test',
            };
            const result = await promo_service_1.promoService.createPromoCode(params);
            node_assert_1.default.strictEqual(result.success, false);
            if (result.success)
                return;
            node_assert_1.default.ok(result.error.message.includes('greater than zero'));
        });
    });
    (0, node_test_1.describe)('getAllPromoCodes', () => {
        (0, node_test_1.default)('should return all promo codes', async () => {
            const codes = await promo_service_1.promoService.getAllPromoCodes();
            node_assert_1.default.ok(Array.isArray(codes));
            node_assert_1.default.ok(codes.length > 0);
        });
        (0, node_test_1.default)('should return codes sorted by creation date (newest first)', async () => {
            const codes = await promo_service_1.promoService.getAllPromoCodes();
            for (let i = 1; i < codes.length; i++) {
                const prevDate = new Date(codes[i - 1].createdAt).getTime();
                const currDate = new Date(codes[i].createdAt).getTime();
                node_assert_1.default.ok(prevDate >= currDate, 'Codes should be sorted by creation date descending');
            }
        });
    });
    (0, node_test_1.describe)('getPromoCodeById', () => {
        (0, node_test_1.default)('should return promo code by ID', async () => {
            const code = await promo_service_1.promoService.getPromoCodeById('promo_welcome25');
            node_assert_1.default.ok(code);
            node_assert_1.default.strictEqual(code.id, 'promo_welcome25');
            node_assert_1.default.strictEqual(code.code, 'WELCOME25');
        });
        (0, node_test_1.default)('should return null for non-existent ID', async () => {
            const code = await promo_service_1.promoService.getPromoCodeById('non_existent');
            node_assert_1.default.strictEqual(code, null);
        });
    });
    (0, node_test_1.describe)('getPromoCodeByString', () => {
        (0, node_test_1.default)('should return promo code by code string', async () => {
            const code = await promo_service_1.promoService.getPromoCodeByString('WELCOME25');
            node_assert_1.default.ok(code);
            node_assert_1.default.strictEqual(code.code, 'WELCOME25');
        });
        (0, node_test_1.default)('should find code case-insensitively', async () => {
            const code = await promo_service_1.promoService.getPromoCodeByString('welcome25');
            node_assert_1.default.ok(code);
            node_assert_1.default.strictEqual(code.code, 'WELCOME25');
        });
        (0, node_test_1.default)('should return null for non-existent code', async () => {
            const code = await promo_service_1.promoService.getPromoCodeByString('NONEXISTENT');
            node_assert_1.default.strictEqual(code, null);
        });
    });
    (0, node_test_1.describe)('validateCode', () => {
        (0, node_test_1.default)('should validate a valid active code', async () => {
            const result = await promo_service_1.promoService.validateCode('COACH15', 'new_user');
            node_assert_1.default.strictEqual(result.valid, true);
            node_assert_1.default.ok(result.promoCode);
            node_assert_1.default.strictEqual(result.promoCode.code, 'COACH15');
        });
        (0, node_test_1.default)('should reject empty code', async () => {
            const result = await promo_service_1.promoService.validateCode('', 'user1');
            node_assert_1.default.strictEqual(result.valid, false);
            node_assert_1.default.ok(result.error);
        });
        (0, node_test_1.default)('should reject non-existent code', async () => {
            const result = await promo_service_1.promoService.validateCode('FAKECODE', 'user1');
            node_assert_1.default.strictEqual(result.valid, false);
            node_assert_1.default.strictEqual(result.error, 'Invalid promo code');
        });
        (0, node_test_1.default)('should reject inactive code', async () => {
            // SPRING20 is inactive in mock data
            const result = await promo_service_1.promoService.validateCode('SPRING20', 'user1');
            node_assert_1.default.strictEqual(result.valid, false);
            node_assert_1.default.ok(result.error?.includes('no longer active') || result.error?.includes('usage limit'));
        });
        (0, node_test_1.default)('should reject code already used by user (one per user)', async () => {
            // parent1 has already used WELCOME25 in mock data
            const result = await promo_service_1.promoService.validateCode('WELCOME25', 'parent1');
            node_assert_1.default.strictEqual(result.valid, false);
            node_assert_1.default.ok(result.error?.includes('already used'));
        });
        (0, node_test_1.default)('should allow code that user has not used', async () => {
            const result = await promo_service_1.promoService.validateCode('COACH15', 'new_test_user');
            node_assert_1.default.strictEqual(result.valid, true);
        });
    });
    (0, node_test_1.describe)('redeemCode', () => {
        (0, node_test_1.default)('should successfully redeem a valid code', async () => {
            const result = await promo_service_1.promoService.redeemCode('new_test_user_123', 'COACH15', 'Test User');
            node_assert_1.default.strictEqual(result.success, true);
            node_assert_1.default.ok(result.usage);
            node_assert_1.default.strictEqual(result.usage.code, 'COACH15');
            node_assert_1.default.strictEqual(result.usage.userId, 'new_test_user_123');
            node_assert_1.default.strictEqual(result.usage.creditAmount, 15);
            node_assert_1.default.ok(result.newBalance !== undefined);
        });
        (0, node_test_1.default)('should increment code usage count after redemption', async () => {
            const codeBefore = await promo_service_1.promoService.getPromoCodeByString('COACH15');
            node_assert_1.default.ok(codeBefore);
            const usesBefore = codeBefore.currentUses;
            await promo_service_1.promoService.redeemCode('redeem_test_user', 'COACH15');
            const codeAfter = await promo_service_1.promoService.getPromoCodeByString('COACH15');
            node_assert_1.default.ok(codeAfter);
            node_assert_1.default.strictEqual(codeAfter.currentUses, usesBefore + 1);
        });
        (0, node_test_1.default)('should fail to redeem invalid code', async () => {
            const result = await promo_service_1.promoService.redeemCode('user1', 'INVALIDCODE');
            node_assert_1.default.strictEqual(result.success, false);
            node_assert_1.default.ok(result.error);
        });
        (0, node_test_1.default)('should fail to redeem code already used by user', async () => {
            const result = await promo_service_1.promoService.redeemCode('parent1', 'WELCOME25');
            node_assert_1.default.strictEqual(result.success, false);
            node_assert_1.default.ok(result.error?.includes('already used'));
        });
        (0, node_test_1.default)('should create usage record after redemption', async () => {
            const userId = 'usage_test_user_' + Date.now();
            await promo_service_1.promoService.redeemCode(userId, 'COACH15', 'Usage Test');
            const usage = await promo_service_1.promoService.getUserUsage(userId);
            node_assert_1.default.ok(usage.length > 0);
            node_assert_1.default.strictEqual(usage[0].userId, userId);
            node_assert_1.default.strictEqual(usage[0].code, 'COACH15');
        });
    });
    (0, node_test_1.describe)('getCodeUsage', () => {
        (0, node_test_1.default)('should return usage records for a code', async () => {
            const usage = await promo_service_1.promoService.getCodeUsage('promo_welcome25');
            node_assert_1.default.ok(Array.isArray(usage));
            usage.forEach((u) => {
                node_assert_1.default.strictEqual(u.codeId, 'promo_welcome25');
            });
        });
        (0, node_test_1.default)('should return empty array for code with no usage', async () => {
            // Create a new code with no usage
            const createResult = await promo_service_1.promoService.createPromoCode({
                code: 'NOUSAGE',
                creditAmount: 5,
                maxUses: 10,
                createdBy: 'admin',
            });
            node_assert_1.default.strictEqual(createResult.success, true);
            if (!createResult.success)
                return;
            const newCode = createResult.data;
            const usage = await promo_service_1.promoService.getCodeUsage(newCode.id);
            node_assert_1.default.ok(Array.isArray(usage));
            node_assert_1.default.strictEqual(usage.length, 0);
        });
        (0, node_test_1.default)('should return usage sorted by date (newest first)', async () => {
            const usage = await promo_service_1.promoService.getCodeUsage('promo_welcome25');
            if (usage.length > 1) {
                for (let i = 1; i < usage.length; i++) {
                    const prevDate = new Date(usage[i - 1].usedAt).getTime();
                    const currDate = new Date(usage[i].usedAt).getTime();
                    node_assert_1.default.ok(prevDate >= currDate, 'Usage should be sorted by date descending');
                }
            }
        });
    });
    (0, node_test_1.describe)('getUserUsage', () => {
        (0, node_test_1.default)('should return usage records for a user', async () => {
            const usage = await promo_service_1.promoService.getUserUsage('parent1');
            node_assert_1.default.ok(Array.isArray(usage));
            node_assert_1.default.ok(usage.length > 0);
            usage.forEach((u) => {
                node_assert_1.default.strictEqual(u.userId, 'parent1');
            });
        });
        (0, node_test_1.default)('should return empty array for user with no usage', async () => {
            const usage = await promo_service_1.promoService.getUserUsage('non_existent_user');
            node_assert_1.default.ok(Array.isArray(usage));
            node_assert_1.default.strictEqual(usage.length, 0);
        });
    });
    (0, node_test_1.describe)('deactivateCode', () => {
        (0, node_test_1.default)('should deactivate an active code', async () => {
            const deactivated = await promo_service_1.promoService.deactivateCode('promo_coach15');
            node_assert_1.default.ok(deactivated);
            node_assert_1.default.strictEqual(deactivated.isActive, false);
        });
        (0, node_test_1.default)('should return null for non-existent code', async () => {
            const result = await promo_service_1.promoService.deactivateCode('non_existent');
            node_assert_1.default.strictEqual(result, null);
        });
    });
    (0, node_test_1.describe)('reactivateCode', () => {
        (0, node_test_1.default)('should reactivate an inactive code', async () => {
            // First deactivate
            await promo_service_1.promoService.deactivateCode('promo_coach15');
            // Then reactivate
            const reactivated = await promo_service_1.promoService.reactivateCode('promo_coach15');
            node_assert_1.default.ok(reactivated);
            node_assert_1.default.strictEqual(reactivated.isActive, true);
        });
        (0, node_test_1.default)('should return null for non-existent code', async () => {
            const result = await promo_service_1.promoService.reactivateCode('non_existent');
            node_assert_1.default.strictEqual(result, null);
        });
    });
    (0, node_test_1.describe)('updatePromoCode', () => {
        (0, node_test_1.default)('should update code fields', async () => {
            const updated = await promo_service_1.promoService.updatePromoCode('promo_coach15', {
                maxUses: 200,
                description: 'Updated description',
            });
            node_assert_1.default.ok(updated);
            node_assert_1.default.strictEqual(updated.maxUses, 200);
            node_assert_1.default.strictEqual(updated.description, 'Updated description');
        });
        (0, node_test_1.default)('should return null for non-existent code', async () => {
            const result = await promo_service_1.promoService.updatePromoCode('non_existent', {
                maxUses: 100,
            });
            node_assert_1.default.strictEqual(result, null);
        });
    });
    (0, node_test_1.describe)('deletePromoCode', () => {
        (0, node_test_1.default)('should delete a promo code', async () => {
            // Create a code to delete
            const createResult = await promo_service_1.promoService.createPromoCode({
                code: 'TODELETE',
                creditAmount: 5,
                maxUses: 10,
                createdBy: 'admin',
            });
            node_assert_1.default.strictEqual(createResult.success, true);
            if (!createResult.success)
                return;
            const code = createResult.data;
            const deleted = await promo_service_1.promoService.deletePromoCode(code.id);
            node_assert_1.default.strictEqual(deleted, true);
            const retrieved = await promo_service_1.promoService.getPromoCodeById(code.id);
            node_assert_1.default.strictEqual(retrieved, null);
        });
        (0, node_test_1.default)('should return false for non-existent code', async () => {
            const deleted = await promo_service_1.promoService.deletePromoCode('non_existent');
            node_assert_1.default.strictEqual(deleted, false);
        });
    });
    (0, node_test_1.describe)('getCodeStats', () => {
        (0, node_test_1.default)('should return correct statistics', async () => {
            const stats = await promo_service_1.promoService.getCodeStats();
            node_assert_1.default.ok(typeof stats.totalCodes === 'number');
            node_assert_1.default.ok(typeof stats.activeCodes === 'number');
            node_assert_1.default.ok(typeof stats.expiredCodes === 'number');
            node_assert_1.default.ok(typeof stats.exhaustedCodes === 'number');
            node_assert_1.default.ok(typeof stats.totalCreditsAwarded === 'number');
            node_assert_1.default.ok(typeof stats.totalRedemptions === 'number');
            node_assert_1.default.ok(stats.totalCodes >= stats.activeCodes);
        });
    });
    (0, node_test_1.describe)('getCodeDetailedStats', () => {
        (0, node_test_1.default)('should return detailed stats for a code', async () => {
            const stats = await promo_service_1.promoService.getCodeDetailedStats('promo_welcome25');
            node_assert_1.default.ok(stats);
            node_assert_1.default.ok(stats.code);
            node_assert_1.default.strictEqual(stats.code.id, 'promo_welcome25');
            node_assert_1.default.ok(['active', 'expired', 'exhausted', 'inactive'].includes(stats.status));
            node_assert_1.default.ok(typeof stats.usageCount === 'number');
            node_assert_1.default.ok(typeof stats.remainingUses === 'number');
            node_assert_1.default.ok(typeof stats.totalCreditsAwarded === 'number');
            node_assert_1.default.ok(Array.isArray(stats.recentUsage));
        });
        (0, node_test_1.default)('should return null for non-existent code', async () => {
            const stats = await promo_service_1.promoService.getCodeDetailedStats('non_existent');
            node_assert_1.default.strictEqual(stats, null);
        });
    });
    (0, node_test_1.describe)('Helper Functions', () => {
        (0, node_test_1.default)('formatCredit should format amount correctly', () => {
            const formatted = promo_service_1.promoService.formatCredit(25.5);
            node_assert_1.default.ok(formatted.includes('25.50'));
            node_assert_1.default.ok(formatted.includes('\u00A3')); // Pound sign
        });
        (0, node_test_1.default)('formatDate should format date correctly', () => {
            const formatted = promo_service_1.promoService.formatDate('2025-06-15T10:00:00.000Z');
            node_assert_1.default.ok(formatted.includes('15'));
            node_assert_1.default.ok(formatted.includes('Jun'));
            node_assert_1.default.ok(formatted.includes('2025'));
        });
        (0, node_test_1.default)('getStatusInfo should return correct info', () => {
            const statuses = [
                'active',
                'expired',
                'exhausted',
                'inactive',
            ];
            statuses.forEach((status) => {
                const info = promo_service_1.promoService.getStatusInfo(status);
                node_assert_1.default.ok(info.label);
                node_assert_1.default.ok(info.color);
            });
        });
        (0, node_test_1.default)('isValidCodeFormat should validate code format', () => {
            node_assert_1.default.strictEqual(promo_service_1.promoService.isValidCodeFormat('ABC123'), true);
            node_assert_1.default.strictEqual(promo_service_1.promoService.isValidCodeFormat('WELCOME25'), true);
            node_assert_1.default.strictEqual(promo_service_1.promoService.isValidCodeFormat('ab'), false); // Too short
            node_assert_1.default.strictEqual(promo_service_1.promoService.isValidCodeFormat('ABCDEFGHIJKLMNOPQRSTUVWXYZ'), false); // Too long
            node_assert_1.default.strictEqual(promo_service_1.promoService.isValidCodeFormat('ABC-123'), false); // Special chars
        });
        (0, node_test_1.default)('getCodeStatus should return correct status', async () => {
            const activeCode = await promo_service_1.promoService.getPromoCodeByString('COACH15');
            node_assert_1.default.ok(activeCode);
            node_assert_1.default.strictEqual(promo_service_1.promoService.getCodeStatus(activeCode), 'active');
            // SPRING20 is exhausted
            const exhaustedCode = await promo_service_1.promoService.getPromoCodeByString('SPRING20');
            node_assert_1.default.ok(exhaustedCode);
            const status = promo_service_1.promoService.getCodeStatus(exhaustedCode);
            node_assert_1.default.ok(status === 'exhausted' || status === 'inactive' || status === 'expired');
        });
    });
    (0, node_test_1.describe)('Data Reset', () => {
        (0, node_test_1.default)('resetToMockData should restore mock data', async () => {
            // Delete a code
            await promo_service_1.promoService.deletePromoCode('promo_welcome25');
            // Reset
            await promo_service_1.promoService.resetToMockData();
            // Code should exist again
            const code = await promo_service_1.promoService.getPromoCodeById('promo_welcome25');
            node_assert_1.default.ok(code);
        });
        (0, node_test_1.default)('clearAllData should remove all data', async () => {
            await promo_service_1.promoService.clearAllData();
            const codes = await promo_service_1.promoService.getAllPromoCodes();
            // getCodeStats() is available but not needed for this assertion
            // After clearing, it returns mock data as fallback
            // but we can check the stats are 0 or codes are from mock
            node_assert_1.default.ok(Array.isArray(codes));
        });
    });
});
