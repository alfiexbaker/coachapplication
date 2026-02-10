import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { payoutService } from '@/services/earnings/payout-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('PayoutService', () => {
  beforeEach(async () => {
    // Clear storage
    await apiClient.remove(STORAGE_KEYS.PAYOUT_METHODS);
    await apiClient.remove(STORAGE_KEYS.WITHDRAWAL_REQUESTS);
  });

  describe('addPayoutMethod', () => {
    it('should return ok() and create payout method', async () => {
      const params = {
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        type: 'BANK_TRANSFER' as const,
        accountHolderName: 'Test Coach',
        accountNumber: '12345678',
        sortCode: '12-34-56',
      };

      const result = await payoutService.addPayoutMethod(params);

      assert.ok(result.success);
      assert.ok(result.data.id);
      assert.equal(result.data.coachId, params.coachId);
      assert.equal(result.data.type, params.type);
      assert.equal(result.data.status, 'ACTIVE');
    });

    it('should return err() when required fields missing', async () => {
      const params = {
        coachId: 'coach1',
        type: 'BANK_TRANSFER' as const,
        accountHolderName: '',
        accountNumber: '',
        sortCode: '',
      };

      const result = await payoutService.addPayoutMethod(params);

      assert.ok(!result.success);
      assert.equal(result.error.code, 'VALIDATION_ERROR');
    });

    it('should set as default if first method', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);

      const result = await payoutService.addPayoutMethod({
        coachId,
        type: 'BANK_TRANSFER' as const,
        accountHolderName: 'Test Coach',
        accountNumber: '12345678',
        sortCode: '12-34-56',
      });

      assert.ok(result.success);
      assert.equal(result.data.isDefault, true);
    });

    it('should not set as default if other methods exist', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);

      // Add first method
      await payoutService.addPayoutMethod({
        coachId,
        type: 'BANK_TRANSFER' as const,
        accountHolderName: 'Test Coach',
        accountNumber: '12345678',
        sortCode: '12-34-56',
      });

      // Add second method
      const result = await payoutService.addPayoutMethod({
        coachId,
        type: 'PAYPAL' as const,
        accountHolderName: 'Test Coach',
        email: 'test@example.com',
      });

      assert.ok(result.success);
      assert.equal(result.data.isDefault, false);
    });
  });

  describe('getPayoutMethods', () => {
    it('should return ok() with payout methods list', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);

      await payoutService.addPayoutMethod({
        coachId,
        type: 'BANK_TRANSFER' as const,
        accountHolderName: 'Test Coach',
        accountNumber: '12345678',
        sortCode: '12-34-56',
      });

      const result = await payoutService.getPayoutMethods(coachId);

      assert.ok(result.success);
      assert.ok(Array.isArray(result.data));
      assert.ok(result.data.length > 0);
    });

    it('should return empty array for coach with no methods', async () => {
      const coachId = 'coach-nonexistent-' + Math.random().toString(36).slice(2);
      const result = await payoutService.getPayoutMethods(coachId);

      assert.ok(result.success);
      assert.ok(Array.isArray(result.data));
      assert.equal(result.data.length, 0);
    });

    it('should filter by coach id', async () => {
      const coachId1 = 'coach-' + Math.random().toString(36).slice(2);
      const coachId2 = 'coach-' + Math.random().toString(36).slice(2);

      await payoutService.addPayoutMethod({
        coachId: coachId1,
        type: 'BANK_TRANSFER' as const,
        accountHolderName: 'Coach 1',
        accountNumber: '12345678',
        sortCode: '12-34-56',
      });

      await payoutService.addPayoutMethod({
        coachId: coachId2,
        type: 'BANK_TRANSFER' as const,
        accountHolderName: 'Coach 2',
        accountNumber: '87654321',
        sortCode: '65-43-21',
      });

      const result = await payoutService.getPayoutMethods(coachId1);

      assert.ok(result.success);
      assert.ok(result.data.every((m) => m.coachId === coachId1));
    });
  });

  describe('removePayoutMethod', () => {
    it('should return ok() and remove method', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);

      const addResult = await payoutService.addPayoutMethod({
        coachId,
        type: 'BANK_TRANSFER' as const,
        accountHolderName: 'Test Coach',
        accountNumber: '12345678',
        sortCode: '12-34-56',
      });

      assert.ok(addResult.success);

      const removeResult = await payoutService.removePayoutMethod(coachId, addResult.data.id);

      assert.ok(removeResult.success);

      const methods = await payoutService.getPayoutMethods(coachId);
      assert.ok(methods.success);
      assert.ok(!methods.data.some((m) => m.id === addResult.data.id));
    });

    it('should return err() for non-existent method', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);
      const result = await payoutService.removePayoutMethod(coachId, 'fake-method-id');

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });

    it('should return err() when removing another coachs method', async () => {
      const coachId1 = 'coach-' + Math.random().toString(36).slice(2);
      const coachId2 = 'coach-' + Math.random().toString(36).slice(2);

      const addResult = await payoutService.addPayoutMethod({
        coachId: coachId1,
        type: 'BANK_TRANSFER' as const,
        accountHolderName: 'Coach 1',
        accountNumber: '12345678',
        sortCode: '12-34-56',
      });

      assert.ok(addResult.success);

      const removeResult = await payoutService.removePayoutMethod(coachId2, addResult.data.id);

      assert.ok(!removeResult.success);
      assert.equal(removeResult.error.code, 'UNAUTHORIZED');
    });
  });

  describe('setDefaultPayoutMethod', () => {
    it('should return ok() and set method as default', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);

      const method1 = await payoutService.addPayoutMethod({
        coachId,
        type: 'BANK_TRANSFER' as const,
        accountHolderName: 'Test Coach',
        accountNumber: '12345678',
        sortCode: '12-34-56',
      });

      const method2 = await payoutService.addPayoutMethod({
        coachId,
        type: 'PAYPAL' as const,
        accountHolderName: 'Test Coach',
        email: 'test@example.com',
      });

      assert.ok(method2.success);

      const result = await payoutService.setDefaultPayoutMethod(coachId, method2.data.id);

      assert.ok(result.success);
      assert.equal(result.data.isDefault, true);

      // Check that old default is no longer default
      const methods = await payoutService.getPayoutMethods(coachId);
      assert.ok(methods.success);

      const oldDefault = methods.data.find((m) => m.id === method1.value?.id);
      assert.ok(oldDefault);
      assert.equal(oldDefault.isDefault, false);
    });

    it('should return err() for non-existent method', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);
      const result = await payoutService.setDefaultPayoutMethod(coachId, 'fake-method-id');

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });

  describe('requestWithdrawal', () => {
    it('should return ok() and create withdrawal request', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);

      const methodResult = await payoutService.addPayoutMethod({
        coachId,
        type: 'BANK_TRANSFER' as const,
        accountHolderName: 'Test Coach',
        accountNumber: '12345678',
        sortCode: '12-34-56',
      });

      assert.ok(methodResult.success);

      const result = await payoutService.requestWithdrawal({
        coachId,
        amount: 100,
        payoutMethodId: methodResult.data.id,
      });

      assert.ok(result.success);
      assert.ok(result.data.id);
      assert.equal(result.data.coachId, coachId);
      assert.equal(result.data.amount, 100);
      assert.equal(result.data.status, 'PENDING');
    });

    it('should return err() when amount is invalid', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);

      const methodResult = await payoutService.addPayoutMethod({
        coachId,
        type: 'BANK_TRANSFER' as const,
        accountHolderName: 'Test Coach',
        accountNumber: '12345678',
        sortCode: '12-34-56',
      });

      assert.ok(methodResult.success);

      const result = await payoutService.requestWithdrawal({
        coachId,
        amount: 0,
        payoutMethodId: methodResult.data.id,
      });

      assert.ok(!result.success);
      assert.equal(result.error.code, 'VALIDATION_ERROR');
    });

    it('should return err() when payout method not found', async () => {
      const result = await payoutService.requestWithdrawal({
        coachId: 'coach1',
        amount: 100,
        payoutMethodId: 'fake-method-id',
      });

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });

  describe('getWithdrawalHistory', () => {
    it('should return ok() with withdrawal list', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);

      const methodResult = await payoutService.addPayoutMethod({
        coachId,
        type: 'BANK_TRANSFER' as const,
        accountHolderName: 'Test Coach',
        accountNumber: '12345678',
        sortCode: '12-34-56',
      });

      assert.ok(methodResult.success);

      await payoutService.requestWithdrawal({
        coachId,
        amount: 100,
        payoutMethodId: methodResult.data.id,
      });

      const result = await payoutService.getWithdrawalHistory(coachId);

      assert.ok(result.success);
      assert.ok(Array.isArray(result.data));
      assert.ok(result.data.length > 0);
    });

    it('should return empty array for coach with no withdrawals', async () => {
      const coachId = 'coach-nonexistent-' + Math.random().toString(36).slice(2);
      const result = await payoutService.getWithdrawalHistory(coachId);

      assert.ok(result.success);
      assert.ok(Array.isArray(result.data));
      assert.equal(result.data.length, 0);
    });
  });

  describe('getPendingWithdrawals', () => {
    it('should return ok() with pending withdrawals only', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);

      const methodResult = await payoutService.addPayoutMethod({
        coachId,
        type: 'BANK_TRANSFER' as const,
        accountHolderName: 'Test Coach',
        accountNumber: '12345678',
        sortCode: '12-34-56',
      });

      assert.ok(methodResult.success);

      await payoutService.requestWithdrawal({
        coachId,
        amount: 100,
        payoutMethodId: methodResult.data.id,
      });

      const result = await payoutService.getPendingWithdrawals(coachId);

      assert.ok(result.success);
      assert.ok(Array.isArray(result.data));
      assert.ok(result.data.every((w) => w.status === 'PENDING'));
    });
  });

  describe('cancelWithdrawal', () => {
    it('should return ok() and cancel withdrawal', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);

      const methodResult = await payoutService.addPayoutMethod({
        coachId,
        type: 'BANK_TRANSFER' as const,
        accountHolderName: 'Test Coach',
        accountNumber: '12345678',
        sortCode: '12-34-56',
      });

      assert.ok(methodResult.success);

      const withdrawalResult = await payoutService.requestWithdrawal({
        coachId,
        amount: 100,
        payoutMethodId: methodResult.data.id,
      });

      assert.ok(withdrawalResult.success);

      const cancelResult = await payoutService.cancelWithdrawal(withdrawalResult.data.id);

      assert.ok(cancelResult.success);
      assert.equal(cancelResult.data.status, 'CANCELLED');
    });

    it('should return err() for non-existent withdrawal', async () => {
      const result = await payoutService.cancelWithdrawal('fake-withdrawal-id');

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });
});
