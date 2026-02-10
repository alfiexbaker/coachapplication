import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { referralService } from '@/services/referral-service';
import { storageService } from '@/services/storage-service';

describe('ReferralService', () => {
  const STORAGE_KEY_CODES = 'clubroom.referral_codes';
  const STORAGE_KEY_REFERRALS = 'clubroom.referrals';

  beforeEach(async () => {
    await storageService.removeItem(STORAGE_KEY_CODES);
    await storageService.removeItem(STORAGE_KEY_REFERRALS);
  });

  describe('generateCode', () => {
    it('should generate a unique referral code successfully', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const userName = 'John Doe';

      const result = await referralService.generateCode(userId, userName);

      assert.ok(result.success);
      assert.ok(result.data.id);
      assert.ok(result.data.code);
      assert.ok(result.data.code.startsWith('JOHN-'));
      assert.equal(result.data.userId, userId);
      assert.equal(result.data.isActive, true);
    });

    it('should return existing code if user already has one', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const userName = 'Jane Smith';

      const first = await referralService.generateCode(userId, userName);
      const second = await referralService.generateCode(userId, userName);

      assert.ok(first.success && second.success);
      assert.equal(first.data.code, second.data.code);
    });

    it('should use default credit amount when not specified', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const result = await referralService.generateCode(userId);

      assert.ok(result.success);
      assert.equal(result.data.creditAmount, 10.0);
    });

    it('should accept custom credit amount', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const result = await referralService.generateCode(userId, 'Coach', 15.0);

      assert.ok(result.success);
      assert.equal(result.data.creditAmount, 15.0);
    });
  });

  describe('getUserCode', () => {
    it('should get existing code for user', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      await referralService.generateCode(userId, 'Test User');

      const result = await referralService.getUserCode(userId);

      assert.ok(result.success);
      assert.equal(result.data.userId, userId);
    });

    it('should create new code if user does not have one', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const result = await referralService.getUserCode(userId, 'New User');

      assert.ok(result.success);
      assert.equal(result.data.userId, userId);
      assert.ok(result.data.code);
    });
  });

  describe('validateCode', () => {
    it('should validate a valid referral code', async () => {
      const referrerId = 'test-referrer-' + Math.random().toString(36).slice(2);
      const newUserId = 'test-new-' + Math.random().toString(36).slice(2);

      const codeResult = await referralService.generateCode(referrerId, 'Referrer');
      assert.ok(codeResult.success);

      const validation = await referralService.validateCode(codeResult.data.code, newUserId);

      assert.ok(validation.valid);
      assert.ok(validation.referralCode);
      assert.equal(validation.error, undefined);
    });

    it('should reject invalid code', async () => {
      const newUserId = 'test-new-' + Math.random().toString(36).slice(2);

      const validation = await referralService.validateCode('INVALID-CODE', newUserId);

      assert.equal(validation.valid, false);
      assert.equal(validation.error, 'Invalid referral code');
    });

    it('should reject when user tries to use own code', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const codeResult = await referralService.generateCode(userId, 'User');
      assert.ok(codeResult.success);

      const validation = await referralService.validateCode(codeResult.data.code, userId);

      assert.equal(validation.valid, false);
      assert.equal(validation.error, 'You cannot use your own referral code');
    });

    it('should reject when user has already used a referral code', async () => {
      const referrerId = 'test-referrer-' + Math.random().toString(36).slice(2);
      const refereeId = 'test-referee-' + Math.random().toString(36).slice(2);

      const codeResult = await referralService.generateCode(referrerId, 'Referrer');
      assert.ok(codeResult.success);

      // Apply referral first time
      await referralService.applyReferralCode(refereeId, 'Referee', codeResult.data.code);

      // Try different code
      const otherReferrerId = 'test-other-' + Math.random().toString(36).slice(2);
      const otherCodeResult = await referralService.generateCode(otherReferrerId, 'Other');
      assert.ok(otherCodeResult.success);

      const validation = await referralService.validateCode(otherCodeResult.data.code, refereeId);

      assert.equal(validation.valid, false);
      assert.equal(validation.error, 'You have already used a referral code');
    });
  });

  describe('applyReferralCode', () => {
    it('should apply referral code successfully', async () => {
      const referrerId = 'test-referrer-' + Math.random().toString(36).slice(2);
      const refereeId = 'test-referee-' + Math.random().toString(36).slice(2);

      const codeResult = await referralService.generateCode(referrerId, 'Referrer');
      assert.ok(codeResult.success);

      const result = await referralService.applyReferralCode(
        refereeId,
        'Referee Name',
        codeResult.data.code
      );

      assert.ok(result.success);
      assert.ok(result.referral);
      assert.equal(result.referral.referrerId, referrerId);
      assert.equal(result.referral.refereeId, refereeId);
      assert.equal(result.referral.status, 'PENDING');
      assert.equal(result.referral.creditAwarded, 0);
    });

    it('should fail with invalid code', async () => {
      const refereeId = 'test-referee-' + Math.random().toString(36).slice(2);

      const result = await referralService.applyReferralCode(
        refereeId,
        'Referee Name',
        'INVALID-CODE'
      );

      assert.equal(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('getReferralStats', () => {
    it('should return stats for user with no referrals', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const result = await referralService.getReferralStats(userId);

      assert.ok(result.success);
      assert.equal(result.data.userId, userId);
      assert.equal(result.data.totalEarned, 0);
      assert.equal(result.data.referredCount, 0);
      assert.equal(result.data.pendingCount, 0);
      assert.ok(result.data.currentCode);
    });
  });

  describe('getReferralHistory', () => {
    it('should return empty array for user with no referrals', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const history = await referralService.getReferralHistory(userId);

      assert.equal(history.length, 0);
    });

    it('should respect limit parameter', async () => {
      const referrerId = 'test-referrer-' + Math.random().toString(36).slice(2);
      const codeResult = await referralService.generateCode(referrerId, 'Referrer');
      assert.ok(codeResult.success);

      // Create 3 referrals
      for (let i = 0; i < 3; i++) {
        const refereeId = 'test-referee-' + i + '-' + Math.random().toString(36).slice(2);
        await referralService.applyReferralCode(
          refereeId,
          `Referee ${i}`,
          codeResult.data.code
        );
      }

      const history = await referralService.getReferralHistory(referrerId, 2);

      assert.equal(history.length, 2);
    });
  });

  describe('wasUserReferred', () => {
    it('should return false for user who was not referred', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const result = await referralService.wasUserReferred(userId);

      assert.equal(result, false);
    });

    it('should return true for user who was referred', async () => {
      const referrerId = 'test-referrer-' + Math.random().toString(36).slice(2);
      const refereeId = 'test-referee-' + Math.random().toString(36).slice(2);

      const codeResult = await referralService.generateCode(referrerId, 'Referrer');
      assert.ok(codeResult.success);

      await referralService.applyReferralCode(refereeId, 'Referee', codeResult.data.code);

      const result = await referralService.wasUserReferred(refereeId);

      assert.equal(result, true);
    });
  });

  describe('getShareUrl', () => {
    it('should generate share URL with code', () => {
      const url = referralService.getShareUrl('JOHN-ABC123');

      assert.ok(url.includes('JOHN-ABC123'));
      assert.ok(url.startsWith('https://'));
    });
  });

  describe('formatCredit', () => {
    it('should format credit amount as currency', () => {
      const formatted = referralService.formatCredit(10.5);

      assert.equal(formatted, '£10.50');
    });

    it('should handle zero amount', () => {
      const formatted = referralService.formatCredit(0);

      assert.equal(formatted, '£0.00');
    });
  });

  describe('getStatusInfo', () => {
    it('should return correct info for COMPLETED status', () => {
      const info = referralService.getStatusInfo('COMPLETED');

      assert.equal(info.label, 'Completed');
      assert.equal(info.color, '#10B981');
    });

    it('should return correct info for PENDING status', () => {
      const info = referralService.getStatusInfo('PENDING');

      assert.equal(info.label, 'Pending');
      assert.equal(info.color, '#F59E0B');
    });

    it('should return correct info for EXPIRED status', () => {
      const info = referralService.getStatusInfo('EXPIRED');

      assert.equal(info.label, 'Expired');
      assert.equal(info.color, '#6B7280');
    });
  });
});
