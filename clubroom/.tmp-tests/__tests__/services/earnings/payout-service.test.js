"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const payout_service_1 = require("@/services/earnings/payout-service");
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
(0, node_test_1.describe)('PayoutService', () => {
    (0, node_test_1.beforeEach)(async () => {
        // Clear storage
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.PAYOUT_METHODS);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.WITHDRAWAL_REQUESTS);
    });
    (0, node_test_1.describe)('addPayoutMethod', () => {
        (0, node_test_1.it)('should return ok() and create payout method', async () => {
            const params = {
                coachId: 'coach-' + Math.random().toString(36).slice(2),
                type: 'BANK_TRANSFER',
                accountHolderName: 'Test Coach',
                accountNumber: '12345678',
                sortCode: '12-34-56',
            };
            const result = await payout_service_1.payoutService.addPayoutMethod(params);
            strict_1.default.ok(result.success);
            strict_1.default.ok(result.data.id);
            strict_1.default.equal(result.data.coachId, params.coachId);
            strict_1.default.equal(result.data.type, params.type);
            strict_1.default.equal(result.data.status, 'ACTIVE');
        });
        (0, node_test_1.it)('should return err() when required fields missing', async () => {
            const params = {
                coachId: 'coach1',
                type: 'BANK_TRANSFER',
                accountHolderName: '',
                accountNumber: '',
                sortCode: '',
            };
            const result = await payout_service_1.payoutService.addPayoutMethod(params);
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'VALIDATION_ERROR');
        });
        (0, node_test_1.it)('should set as default if first method', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const result = await payout_service_1.payoutService.addPayoutMethod({
                coachId,
                type: 'BANK_TRANSFER',
                accountHolderName: 'Test Coach',
                accountNumber: '12345678',
                sortCode: '12-34-56',
            });
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.isDefault, true);
        });
        (0, node_test_1.it)('should not set as default if other methods exist', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            // Add first method
            await payout_service_1.payoutService.addPayoutMethod({
                coachId,
                type: 'BANK_TRANSFER',
                accountHolderName: 'Test Coach',
                accountNumber: '12345678',
                sortCode: '12-34-56',
            });
            // Add second method
            const result = await payout_service_1.payoutService.addPayoutMethod({
                coachId,
                type: 'PAYPAL',
                accountHolderName: 'Test Coach',
                email: 'test@example.com',
            });
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.isDefault, false);
        });
    });
    (0, node_test_1.describe)('getPayoutMethods', () => {
        (0, node_test_1.it)('should return ok() with payout methods list', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            await payout_service_1.payoutService.addPayoutMethod({
                coachId,
                type: 'BANK_TRANSFER',
                accountHolderName: 'Test Coach',
                accountNumber: '12345678',
                sortCode: '12-34-56',
            });
            const result = await payout_service_1.payoutService.getPayoutMethods(coachId);
            strict_1.default.ok(result.success);
            strict_1.default.ok(Array.isArray(result.data));
            strict_1.default.ok(result.data.length > 0);
        });
        (0, node_test_1.it)('should return empty array for coach with no methods', async () => {
            const coachId = 'coach-nonexistent-' + Math.random().toString(36).slice(2);
            const result = await payout_service_1.payoutService.getPayoutMethods(coachId);
            strict_1.default.ok(result.success);
            strict_1.default.ok(Array.isArray(result.data));
            strict_1.default.equal(result.data.length, 0);
        });
        (0, node_test_1.it)('should filter by coach id', async () => {
            const coachId1 = 'coach-' + Math.random().toString(36).slice(2);
            const coachId2 = 'coach-' + Math.random().toString(36).slice(2);
            await payout_service_1.payoutService.addPayoutMethod({
                coachId: coachId1,
                type: 'BANK_TRANSFER',
                accountHolderName: 'Coach 1',
                accountNumber: '12345678',
                sortCode: '12-34-56',
            });
            await payout_service_1.payoutService.addPayoutMethod({
                coachId: coachId2,
                type: 'BANK_TRANSFER',
                accountHolderName: 'Coach 2',
                accountNumber: '87654321',
                sortCode: '65-43-21',
            });
            const result = await payout_service_1.payoutService.getPayoutMethods(coachId1);
            strict_1.default.ok(result.success);
            strict_1.default.ok(result.data.every((m) => m.coachId === coachId1));
        });
    });
    (0, node_test_1.describe)('removePayoutMethod', () => {
        (0, node_test_1.it)('should return ok() and remove method', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const addResult = await payout_service_1.payoutService.addPayoutMethod({
                coachId,
                type: 'BANK_TRANSFER',
                accountHolderName: 'Test Coach',
                accountNumber: '12345678',
                sortCode: '12-34-56',
            });
            strict_1.default.ok(addResult.success);
            const removeResult = await payout_service_1.payoutService.removePayoutMethod(coachId, addResult.data.id);
            strict_1.default.ok(removeResult.success);
            const methods = await payout_service_1.payoutService.getPayoutMethods(coachId);
            strict_1.default.ok(methods.success);
            strict_1.default.ok(!methods.data.some((m) => m.id === addResult.data.id));
        });
        (0, node_test_1.it)('should return err() for non-existent method', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const result = await payout_service_1.payoutService.removePayoutMethod(coachId, 'fake-method-id');
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
        (0, node_test_1.it)('should return err() when removing another coachs method', async () => {
            const coachId1 = 'coach-' + Math.random().toString(36).slice(2);
            const coachId2 = 'coach-' + Math.random().toString(36).slice(2);
            const addResult = await payout_service_1.payoutService.addPayoutMethod({
                coachId: coachId1,
                type: 'BANK_TRANSFER',
                accountHolderName: 'Coach 1',
                accountNumber: '12345678',
                sortCode: '12-34-56',
            });
            strict_1.default.ok(addResult.success);
            const removeResult = await payout_service_1.payoutService.removePayoutMethod(coachId2, addResult.data.id);
            strict_1.default.ok(!removeResult.success);
            strict_1.default.equal(removeResult.error.code, 'UNAUTHORIZED');
        });
    });
    (0, node_test_1.describe)('setDefaultPayoutMethod', () => {
        (0, node_test_1.it)('should return ok() and set method as default', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const method1 = await payout_service_1.payoutService.addPayoutMethod({
                coachId,
                type: 'BANK_TRANSFER',
                accountHolderName: 'Test Coach',
                accountNumber: '12345678',
                sortCode: '12-34-56',
            });
            const method2 = await payout_service_1.payoutService.addPayoutMethod({
                coachId,
                type: 'PAYPAL',
                accountHolderName: 'Test Coach',
                email: 'test@example.com',
            });
            strict_1.default.ok(method2.success);
            const result = await payout_service_1.payoutService.setDefaultPayoutMethod(coachId, method2.data.id);
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.isDefault, true);
            // Check that old default is no longer default
            const methods = await payout_service_1.payoutService.getPayoutMethods(coachId);
            strict_1.default.ok(methods.success);
            const oldDefault = methods.data.find((m) => m.id === method1.value?.id);
            strict_1.default.ok(oldDefault);
            strict_1.default.equal(oldDefault.isDefault, false);
        });
        (0, node_test_1.it)('should return err() for non-existent method', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const result = await payout_service_1.payoutService.setDefaultPayoutMethod(coachId, 'fake-method-id');
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
    });
    (0, node_test_1.describe)('requestWithdrawal', () => {
        (0, node_test_1.it)('should return ok() and create withdrawal request', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const methodResult = await payout_service_1.payoutService.addPayoutMethod({
                coachId,
                type: 'BANK_TRANSFER',
                accountHolderName: 'Test Coach',
                accountNumber: '12345678',
                sortCode: '12-34-56',
            });
            strict_1.default.ok(methodResult.success);
            const result = await payout_service_1.payoutService.requestWithdrawal({
                coachId,
                amount: 100,
                payoutMethodId: methodResult.data.id,
            });
            strict_1.default.ok(result.success);
            strict_1.default.ok(result.data.id);
            strict_1.default.equal(result.data.coachId, coachId);
            strict_1.default.equal(result.data.amount, 100);
            strict_1.default.equal(result.data.status, 'PENDING');
        });
        (0, node_test_1.it)('should return err() when amount is invalid', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const methodResult = await payout_service_1.payoutService.addPayoutMethod({
                coachId,
                type: 'BANK_TRANSFER',
                accountHolderName: 'Test Coach',
                accountNumber: '12345678',
                sortCode: '12-34-56',
            });
            strict_1.default.ok(methodResult.success);
            const result = await payout_service_1.payoutService.requestWithdrawal({
                coachId,
                amount: 0,
                payoutMethodId: methodResult.data.id,
            });
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'VALIDATION_ERROR');
        });
        (0, node_test_1.it)('should return err() when payout method not found', async () => {
            const result = await payout_service_1.payoutService.requestWithdrawal({
                coachId: 'coach1',
                amount: 100,
                payoutMethodId: 'fake-method-id',
            });
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
    });
    (0, node_test_1.describe)('getWithdrawalHistory', () => {
        (0, node_test_1.it)('should return ok() with withdrawal list', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const methodResult = await payout_service_1.payoutService.addPayoutMethod({
                coachId,
                type: 'BANK_TRANSFER',
                accountHolderName: 'Test Coach',
                accountNumber: '12345678',
                sortCode: '12-34-56',
            });
            strict_1.default.ok(methodResult.success);
            await payout_service_1.payoutService.requestWithdrawal({
                coachId,
                amount: 100,
                payoutMethodId: methodResult.data.id,
            });
            const result = await payout_service_1.payoutService.getWithdrawalHistory(coachId);
            strict_1.default.ok(result.success);
            strict_1.default.ok(Array.isArray(result.data));
            strict_1.default.ok(result.data.length > 0);
        });
        (0, node_test_1.it)('should return empty array for coach with no withdrawals', async () => {
            const coachId = 'coach-nonexistent-' + Math.random().toString(36).slice(2);
            const result = await payout_service_1.payoutService.getWithdrawalHistory(coachId);
            strict_1.default.ok(result.success);
            strict_1.default.ok(Array.isArray(result.data));
            strict_1.default.equal(result.data.length, 0);
        });
    });
    (0, node_test_1.describe)('getPendingWithdrawals', () => {
        (0, node_test_1.it)('should return ok() with pending withdrawals only', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const methodResult = await payout_service_1.payoutService.addPayoutMethod({
                coachId,
                type: 'BANK_TRANSFER',
                accountHolderName: 'Test Coach',
                accountNumber: '12345678',
                sortCode: '12-34-56',
            });
            strict_1.default.ok(methodResult.success);
            await payout_service_1.payoutService.requestWithdrawal({
                coachId,
                amount: 100,
                payoutMethodId: methodResult.data.id,
            });
            const result = await payout_service_1.payoutService.getPendingWithdrawals(coachId);
            strict_1.default.ok(result.success);
            strict_1.default.ok(Array.isArray(result.data));
            strict_1.default.ok(result.data.every((w) => w.status === 'PENDING'));
        });
    });
    (0, node_test_1.describe)('cancelWithdrawal', () => {
        (0, node_test_1.it)('should return ok() and cancel withdrawal', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const methodResult = await payout_service_1.payoutService.addPayoutMethod({
                coachId,
                type: 'BANK_TRANSFER',
                accountHolderName: 'Test Coach',
                accountNumber: '12345678',
                sortCode: '12-34-56',
            });
            strict_1.default.ok(methodResult.success);
            const withdrawalResult = await payout_service_1.payoutService.requestWithdrawal({
                coachId,
                amount: 100,
                payoutMethodId: methodResult.data.id,
            });
            strict_1.default.ok(withdrawalResult.success);
            const cancelResult = await payout_service_1.payoutService.cancelWithdrawal(withdrawalResult.data.id);
            strict_1.default.ok(cancelResult.success);
            strict_1.default.equal(cancelResult.data.status, 'CANCELLED');
        });
        (0, node_test_1.it)('should return err() for non-existent withdrawal', async () => {
            const result = await payout_service_1.payoutService.cancelWithdrawal('fake-withdrawal-id');
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
    });
});
