import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { walletUtilsService } from '@/services/wallet/wallet-utils-service';

describe('WalletUtilsService', () => {
  describe('formatCurrency', () => {
    it('should format amount as GBP', () => {
      const formatted = walletUtilsService.formatCurrency(100);

      assert.ok(formatted.includes('100'));
      assert.ok(formatted.includes('£') || formatted.includes('GBP'));
    });

    it('should format with decimals', () => {
      const formatted = walletUtilsService.formatCurrency(99.99);

      assert.ok(formatted.includes('99.99'));
    });

    it('should handle zero', () => {
      const formatted = walletUtilsService.formatCurrency(0);

      assert.ok(formatted.includes('0'));
    });
  });

  describe('calculateFee', () => {
    it('should calculate fee correctly', () => {
      const fee = walletUtilsService.calculateFee(100, 5);

      assert.equal(fee, 5);
    });

    it('should handle zero percentage', () => {
      const fee = walletUtilsService.calculateFee(100, 0);

      assert.equal(fee, 0);
    });
  });

  describe('validateAmount', () => {
    it('should return true for valid positive amount', () => {
      const isValid = walletUtilsService.validateAmount(50);

      assert.equal(isValid, true);
    });

    it('should return false for negative amount', () => {
      const isValid = walletUtilsService.validateAmount(-10);

      assert.equal(isValid, false);
    });

    it('should return false for zero', () => {
      const isValid = walletUtilsService.validateAmount(0);

      assert.equal(isValid, false);
    });
  });

  describe('roundAmount', () => {
    it('should round to 2 decimal places', () => {
      const rounded = walletUtilsService.roundAmount(10.567);

      assert.equal(rounded, 10.57);
    });

    it('should handle whole numbers', () => {
      const rounded = walletUtilsService.roundAmount(10);

      assert.equal(rounded, 10.00);
    });
  });
});
