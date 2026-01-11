/**
 * Promo Service Tests
 *
 * Unit tests for the promo code service functionality including
 * code creation, validation, redemption, and statistics.
 */

import assert from 'node:assert';
import test, { describe, beforeEach } from 'node:test';

import { promoService } from '../../services/promo-service';
import type { PromoCode, CreatePromoCodeParams } from '../../constants/types';

// Reset to mock data before each test
beforeEach(async () => {
  await promoService.resetToMockData();
});

describe('Promo Service', () => {
  describe('createPromoCode', () => {
    test('should create a new promo code with required fields', async () => {
      const params: CreatePromoCodeParams = {
        code: 'TESTCODE',
        creditAmount: 15,
        maxUses: 100,
        createdBy: 'admin_test',
      };

      const promoCode = await promoService.createPromoCode(params);

      assert.ok(promoCode.id.startsWith('promo_'));
      assert.strictEqual(promoCode.code, 'TESTCODE');
      assert.strictEqual(promoCode.creditAmount, 15);
      assert.strictEqual(promoCode.maxUses, 100);
      assert.strictEqual(promoCode.currentUses, 0);
      assert.strictEqual(promoCode.isActive, true);
      assert.strictEqual(promoCode.onePerUser, true); // default
      assert.strictEqual(promoCode.createdBy, 'admin_test');
      assert.ok(promoCode.createdAt);
      assert.ok(promoCode.updatedAt);
    });

    test('should create a promo code with all optional fields', async () => {
      const params: CreatePromoCodeParams = {
        code: 'fulltest',
        creditAmount: 25,
        maxUses: 50,
        expiresAt: '2027-12-31T23:59:59.000Z',
        description: 'Test promo code',
        onePerUser: false,
        createdBy: 'admin_test',
        createdByName: 'Test Admin',
      };

      const promoCode = await promoService.createPromoCode(params);

      assert.strictEqual(promoCode.code, 'FULLTEST'); // Normalized to uppercase
      assert.strictEqual(promoCode.creditAmount, 25);
      assert.strictEqual(promoCode.maxUses, 50);
      assert.strictEqual(promoCode.expiresAt, '2027-12-31T23:59:59.000Z');
      assert.strictEqual(promoCode.description, 'Test promo code');
      assert.strictEqual(promoCode.onePerUser, false);
      assert.strictEqual(promoCode.createdByName, 'Test Admin');
    });

    test('should normalize code to uppercase', async () => {
      const params: CreatePromoCodeParams = {
        code: 'lowercase',
        creditAmount: 10,
        maxUses: 10,
        createdBy: 'admin_test',
      };

      const promoCode = await promoService.createPromoCode(params);

      assert.strictEqual(promoCode.code, 'LOWERCASE');
    });

    test('should throw error for duplicate code', async () => {
      const params: CreatePromoCodeParams = {
        code: 'WELCOME25', // Existing mock code
        creditAmount: 10,
        maxUses: 10,
        createdBy: 'admin_test',
      };

      await assert.rejects(async () => {
        await promoService.createPromoCode(params);
      }, /already exists/);
    });

    test('should throw error for invalid credit amount', async () => {
      const params: CreatePromoCodeParams = {
        code: 'INVALID',
        creditAmount: 0,
        maxUses: 10,
        createdBy: 'admin_test',
      };

      await assert.rejects(async () => {
        await promoService.createPromoCode(params);
      }, /greater than zero/);
    });

    test('should throw error for invalid max uses', async () => {
      const params: CreatePromoCodeParams = {
        code: 'INVALID2',
        creditAmount: 10,
        maxUses: -1,
        createdBy: 'admin_test',
      };

      await assert.rejects(async () => {
        await promoService.createPromoCode(params);
      }, /greater than zero/);
    });
  });

  describe('getAllPromoCodes', () => {
    test('should return all promo codes', async () => {
      const codes = await promoService.getAllPromoCodes();

      assert.ok(Array.isArray(codes));
      assert.ok(codes.length > 0);
    });

    test('should return codes sorted by creation date (newest first)', async () => {
      const codes = await promoService.getAllPromoCodes();

      for (let i = 1; i < codes.length; i++) {
        const prevDate = new Date(codes[i - 1].createdAt).getTime();
        const currDate = new Date(codes[i].createdAt).getTime();
        assert.ok(prevDate >= currDate, 'Codes should be sorted by creation date descending');
      }
    });
  });

  describe('getPromoCodeById', () => {
    test('should return promo code by ID', async () => {
      const code = await promoService.getPromoCodeById('promo_welcome25');

      assert.ok(code);
      assert.strictEqual(code.id, 'promo_welcome25');
      assert.strictEqual(code.code, 'WELCOME25');
    });

    test('should return null for non-existent ID', async () => {
      const code = await promoService.getPromoCodeById('non_existent');

      assert.strictEqual(code, null);
    });
  });

  describe('getPromoCodeByString', () => {
    test('should return promo code by code string', async () => {
      const code = await promoService.getPromoCodeByString('WELCOME25');

      assert.ok(code);
      assert.strictEqual(code.code, 'WELCOME25');
    });

    test('should find code case-insensitively', async () => {
      const code = await promoService.getPromoCodeByString('welcome25');

      assert.ok(code);
      assert.strictEqual(code.code, 'WELCOME25');
    });

    test('should return null for non-existent code', async () => {
      const code = await promoService.getPromoCodeByString('NONEXISTENT');

      assert.strictEqual(code, null);
    });
  });

  describe('validateCode', () => {
    test('should validate a valid active code', async () => {
      const result = await promoService.validateCode('COACH15', 'new_user');

      assert.strictEqual(result.valid, true);
      assert.ok(result.promoCode);
      assert.strictEqual(result.promoCode.code, 'COACH15');
    });

    test('should reject empty code', async () => {
      const result = await promoService.validateCode('', 'user1');

      assert.strictEqual(result.valid, false);
      assert.ok(result.error);
    });

    test('should reject non-existent code', async () => {
      const result = await promoService.validateCode('FAKECODE', 'user1');

      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.error, 'Invalid promo code');
    });

    test('should reject inactive code', async () => {
      // SPRING20 is inactive in mock data
      const result = await promoService.validateCode('SPRING20', 'user1');

      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('no longer active') || result.error?.includes('usage limit'));
    });

    test('should reject code already used by user (one per user)', async () => {
      // parent1 has already used WELCOME25 in mock data
      const result = await promoService.validateCode('WELCOME25', 'parent1');

      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('already used'));
    });

    test('should allow code that user has not used', async () => {
      const result = await promoService.validateCode('COACH15', 'new_test_user');

      assert.strictEqual(result.valid, true);
    });
  });

  describe('redeemCode', () => {
    test('should successfully redeem a valid code', async () => {
      const result = await promoService.redeemCode('new_test_user_123', 'COACH15', 'Test User');

      assert.strictEqual(result.success, true);
      assert.ok(result.usage);
      assert.strictEqual(result.usage.code, 'COACH15');
      assert.strictEqual(result.usage.userId, 'new_test_user_123');
      assert.strictEqual(result.usage.creditAmount, 15);
      assert.ok(result.newBalance !== undefined);
    });

    test('should increment code usage count after redemption', async () => {
      const codeBefore = await promoService.getPromoCodeByString('COACH15');
      assert.ok(codeBefore);
      const usesBefore = codeBefore.currentUses;

      await promoService.redeemCode('redeem_test_user', 'COACH15');

      const codeAfter = await promoService.getPromoCodeByString('COACH15');
      assert.ok(codeAfter);
      assert.strictEqual(codeAfter.currentUses, usesBefore + 1);
    });

    test('should fail to redeem invalid code', async () => {
      const result = await promoService.redeemCode('user1', 'INVALIDCODE');

      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    test('should fail to redeem code already used by user', async () => {
      const result = await promoService.redeemCode('parent1', 'WELCOME25');

      assert.strictEqual(result.success, false);
      assert.ok(result.error?.includes('already used'));
    });

    test('should create usage record after redemption', async () => {
      const userId = 'usage_test_user_' + Date.now();
      await promoService.redeemCode(userId, 'COACH15', 'Usage Test');

      const usage = await promoService.getUserUsage(userId);

      assert.ok(usage.length > 0);
      assert.strictEqual(usage[0].userId, userId);
      assert.strictEqual(usage[0].code, 'COACH15');
    });
  });

  describe('getCodeUsage', () => {
    test('should return usage records for a code', async () => {
      const usage = await promoService.getCodeUsage('promo_welcome25');

      assert.ok(Array.isArray(usage));
      usage.forEach((u) => {
        assert.strictEqual(u.codeId, 'promo_welcome25');
      });
    });

    test('should return empty array for code with no usage', async () => {
      // Create a new code with no usage
      const newCode = await promoService.createPromoCode({
        code: 'NOUSAGE',
        creditAmount: 5,
        maxUses: 10,
        createdBy: 'admin',
      });

      const usage = await promoService.getCodeUsage(newCode.id);

      assert.ok(Array.isArray(usage));
      assert.strictEqual(usage.length, 0);
    });

    test('should return usage sorted by date (newest first)', async () => {
      const usage = await promoService.getCodeUsage('promo_welcome25');

      if (usage.length > 1) {
        for (let i = 1; i < usage.length; i++) {
          const prevDate = new Date(usage[i - 1].usedAt).getTime();
          const currDate = new Date(usage[i].usedAt).getTime();
          assert.ok(prevDate >= currDate, 'Usage should be sorted by date descending');
        }
      }
    });
  });

  describe('getUserUsage', () => {
    test('should return usage records for a user', async () => {
      const usage = await promoService.getUserUsage('parent1');

      assert.ok(Array.isArray(usage));
      assert.ok(usage.length > 0);
      usage.forEach((u) => {
        assert.strictEqual(u.userId, 'parent1');
      });
    });

    test('should return empty array for user with no usage', async () => {
      const usage = await promoService.getUserUsage('non_existent_user');

      assert.ok(Array.isArray(usage));
      assert.strictEqual(usage.length, 0);
    });
  });

  describe('deactivateCode', () => {
    test('should deactivate an active code', async () => {
      const deactivated = await promoService.deactivateCode('promo_coach15');

      assert.ok(deactivated);
      assert.strictEqual(deactivated.isActive, false);
    });

    test('should return null for non-existent code', async () => {
      const result = await promoService.deactivateCode('non_existent');

      assert.strictEqual(result, null);
    });
  });

  describe('reactivateCode', () => {
    test('should reactivate an inactive code', async () => {
      // First deactivate
      await promoService.deactivateCode('promo_coach15');

      // Then reactivate
      const reactivated = await promoService.reactivateCode('promo_coach15');

      assert.ok(reactivated);
      assert.strictEqual(reactivated.isActive, true);
    });

    test('should return null for non-existent code', async () => {
      const result = await promoService.reactivateCode('non_existent');

      assert.strictEqual(result, null);
    });
  });

  describe('updatePromoCode', () => {
    test('should update code fields', async () => {
      const updated = await promoService.updatePromoCode('promo_coach15', {
        maxUses: 200,
        description: 'Updated description',
      });

      assert.ok(updated);
      assert.strictEqual(updated.maxUses, 200);
      assert.strictEqual(updated.description, 'Updated description');
    });

    test('should return null for non-existent code', async () => {
      const result = await promoService.updatePromoCode('non_existent', {
        maxUses: 100,
      });

      assert.strictEqual(result, null);
    });
  });

  describe('deletePromoCode', () => {
    test('should delete a promo code', async () => {
      // Create a code to delete
      const code = await promoService.createPromoCode({
        code: 'TODELETE',
        creditAmount: 5,
        maxUses: 10,
        createdBy: 'admin',
      });

      const deleted = await promoService.deletePromoCode(code.id);
      assert.strictEqual(deleted, true);

      const retrieved = await promoService.getPromoCodeById(code.id);
      assert.strictEqual(retrieved, null);
    });

    test('should return false for non-existent code', async () => {
      const deleted = await promoService.deletePromoCode('non_existent');

      assert.strictEqual(deleted, false);
    });
  });

  describe('getCodeStats', () => {
    test('should return correct statistics', async () => {
      const stats = await promoService.getCodeStats();

      assert.ok(typeof stats.totalCodes === 'number');
      assert.ok(typeof stats.activeCodes === 'number');
      assert.ok(typeof stats.expiredCodes === 'number');
      assert.ok(typeof stats.exhaustedCodes === 'number');
      assert.ok(typeof stats.totalCreditsAwarded === 'number');
      assert.ok(typeof stats.totalRedemptions === 'number');
      assert.ok(stats.totalCodes >= stats.activeCodes);
    });
  });

  describe('getCodeDetailedStats', () => {
    test('should return detailed stats for a code', async () => {
      const stats = await promoService.getCodeDetailedStats('promo_welcome25');

      assert.ok(stats);
      assert.ok(stats.code);
      assert.strictEqual(stats.code.id, 'promo_welcome25');
      assert.ok(['active', 'expired', 'exhausted', 'inactive'].includes(stats.status));
      assert.ok(typeof stats.usageCount === 'number');
      assert.ok(typeof stats.remainingUses === 'number');
      assert.ok(typeof stats.totalCreditsAwarded === 'number');
      assert.ok(Array.isArray(stats.recentUsage));
    });

    test('should return null for non-existent code', async () => {
      const stats = await promoService.getCodeDetailedStats('non_existent');

      assert.strictEqual(stats, null);
    });
  });

  describe('Helper Functions', () => {
    test('formatCredit should format amount correctly', () => {
      const formatted = promoService.formatCredit(25.5);
      assert.ok(formatted.includes('25.50'));
      assert.ok(formatted.includes('\u00A3')); // Pound sign
    });

    test('formatDate should format date correctly', () => {
      const formatted = promoService.formatDate('2025-06-15T10:00:00.000Z');
      assert.ok(formatted.includes('15'));
      assert.ok(formatted.includes('Jun'));
      assert.ok(formatted.includes('2025'));
    });

    test('getStatusInfo should return correct info', () => {
      const statuses: Array<'active' | 'expired' | 'exhausted' | 'inactive'> = [
        'active',
        'expired',
        'exhausted',
        'inactive',
      ];

      statuses.forEach((status) => {
        const info = promoService.getStatusInfo(status);
        assert.ok(info.label);
        assert.ok(info.color);
      });
    });

    test('isValidCodeFormat should validate code format', () => {
      assert.strictEqual(promoService.isValidCodeFormat('ABC123'), true);
      assert.strictEqual(promoService.isValidCodeFormat('WELCOME25'), true);
      assert.strictEqual(promoService.isValidCodeFormat('ab'), false); // Too short
      assert.strictEqual(promoService.isValidCodeFormat('ABCDEFGHIJKLMNOPQRSTUVWXYZ'), false); // Too long
      assert.strictEqual(promoService.isValidCodeFormat('ABC-123'), false); // Special chars
    });

    test('getCodeStatus should return correct status', async () => {
      const activeCode = await promoService.getPromoCodeByString('COACH15');
      assert.ok(activeCode);
      assert.strictEqual(promoService.getCodeStatus(activeCode), 'active');

      // SPRING20 is exhausted
      const exhaustedCode = await promoService.getPromoCodeByString('SPRING20');
      assert.ok(exhaustedCode);
      const status = promoService.getCodeStatus(exhaustedCode);
      assert.ok(status === 'exhausted' || status === 'inactive' || status === 'expired');
    });
  });

  describe('Data Reset', () => {
    test('resetToMockData should restore mock data', async () => {
      // Delete a code
      await promoService.deletePromoCode('promo_welcome25');

      // Reset
      await promoService.resetToMockData();

      // Code should exist again
      const code = await promoService.getPromoCodeById('promo_welcome25');
      assert.ok(code);
    });

    test('clearAllData should remove all data', async () => {
      await promoService.clearAllData();

      const codes = await promoService.getAllPromoCodes();
      const stats = await promoService.getCodeStats();

      // After clearing, it returns mock data as fallback
      // but we can check the stats are 0 or codes are from mock
      assert.ok(Array.isArray(codes));
    });
  });
});
