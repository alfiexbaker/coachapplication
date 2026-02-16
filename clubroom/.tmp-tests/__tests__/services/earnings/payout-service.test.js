"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const payout_service_1 = require("@/services/earnings/payout-service");
const earnings_report_service_1 = require("@/services/earnings/earnings-report-service");
function expectOk(result) {
    strict_1.default.equal(result.success, true);
    return result.data;
}
function expectErr(result, code) {
    strict_1.default.equal(result.success, false);
    return result.error.code === code ? result.error : strict_1.default.fail(`Expected error code ${code}`);
}
let seq = 0;
function nextId(prefix) {
    seq += 1;
    return `${prefix}_${seq}`;
}
async function verifyMethod(methodId) {
    const methods = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.PAYOUT_METHODS, []);
    const updated = methods.map((method) => method.id === methodId
        ? { ...method, isVerified: true, verifiedAt: new Date().toISOString() }
        : method);
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.PAYOUT_METHODS, updated);
}
async function addVerifiedBankMethod(coachId, isDefault = true) {
    const method = expectOk(await payout_service_1.payoutService.addPayoutMethod(coachId, {
        type: 'BANK_ACCOUNT',
        isDefault,
        bankName: 'Barclays',
        accountLastFour: '1234',
        sortCode: '12-34-56',
        nickname: 'Primary',
    }));
    await verifyMethod(method.id);
    return method.id;
}
(0, node_test_1.describe)('PayoutService', () => {
    (0, node_test_1.beforeEach)(async () => {
        seq = 0;
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.PAYOUT_METHODS, []);
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.WITHDRAWALS, []);
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.EARNING_TRANSACTIONS, []);
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.EARNINGS, {});
    });
    (0, node_test_1.describe)('addPayoutMethod/getPayoutMethods', () => {
        (0, node_test_1.it)('adds payout methods and returns coach-specific list', async () => {
            const coachId = nextId('coach');
            const method = expectOk(await payout_service_1.payoutService.addPayoutMethod(coachId, {
                type: 'PAYPAL',
                isDefault: true,
                paypalEmail: 'coach@example.com',
                nickname: 'PayPal',
            }));
            strict_1.default.ok(method.id);
            strict_1.default.equal(method.coachId, coachId);
            strict_1.default.equal(method.type, 'PAYPAL');
            strict_1.default.equal(method.isDefault, true);
            const methods = expectOk(await payout_service_1.payoutService.getPayoutMethods(coachId));
            strict_1.default.equal(methods.length, 1);
            strict_1.default.equal(methods[0].id, method.id);
        });
        (0, node_test_1.it)('filters methods by coach id', async () => {
            const coachA = nextId('coach');
            const coachB = nextId('coach');
            expectOk(await payout_service_1.payoutService.addPayoutMethod(coachA, {
                type: 'PAYPAL',
                isDefault: true,
                paypalEmail: 'a@example.com',
            }));
            expectOk(await payout_service_1.payoutService.addPayoutMethod(coachB, {
                type: 'PAYPAL',
                isDefault: true,
                paypalEmail: 'b@example.com',
            }));
            const methodsA = expectOk(await payout_service_1.payoutService.getPayoutMethods(coachA));
            strict_1.default.equal(methodsA.length, 1);
            strict_1.default.equal(methodsA[0].coachId, coachA);
        });
    });
    (0, node_test_1.describe)('removePayoutMethod', () => {
        (0, node_test_1.it)('removes a non-default method', async () => {
            const coachId = nextId('coach');
            await addVerifiedBankMethod(coachId, true);
            const removable = expectOk(await payout_service_1.payoutService.addPayoutMethod(coachId, {
                type: 'PAYPAL',
                isDefault: false,
                paypalEmail: 'remove-me@example.com',
            }));
            const removed = expectOk(await payout_service_1.payoutService.removePayoutMethod(coachId, removable.id));
            strict_1.default.equal(removed, true);
            const methods = expectOk(await payout_service_1.payoutService.getPayoutMethods(coachId));
            strict_1.default.ok(!methods.some((method) => method.id === removable.id));
        });
        (0, node_test_1.it)('rejects removing a default method', async () => {
            const coachId = nextId('coach');
            const defaultId = await addVerifiedBankMethod(coachId, true);
            const result = await payout_service_1.payoutService.removePayoutMethod(coachId, defaultId);
            expectErr(result, 'VALIDATION');
        });
    });
    (0, node_test_1.describe)('setDefaultPayoutMethod', () => {
        (0, node_test_1.it)('sets a verified method as default', async () => {
            const coachId = nextId('coach');
            const firstId = await addVerifiedBankMethod(coachId, true);
            const second = expectOk(await payout_service_1.payoutService.addPayoutMethod(coachId, {
                type: 'PAYPAL',
                isDefault: false,
                paypalEmail: 'new-default@example.com',
            }));
            await verifyMethod(second.id);
            const updated = expectOk(await payout_service_1.payoutService.setDefaultPayoutMethod(coachId, second.id));
            strict_1.default.equal(updated.id, second.id);
            strict_1.default.equal(updated.isDefault, true);
            const methods = expectOk(await payout_service_1.payoutService.getPayoutMethods(coachId));
            const first = methods.find((method) => method.id === firstId);
            const newer = methods.find((method) => method.id === second.id);
            strict_1.default.equal(first?.isDefault, false);
            strict_1.default.equal(newer?.isDefault, true);
        });
    });
    (0, node_test_1.describe)('withdrawals', () => {
        (0, node_test_1.it)('creates a pending withdrawal and returns it in history/pending', async () => {
            const coachId = nextId('coach');
            const payoutMethodId = await addVerifiedBankMethod(coachId, true);
            expectOk(await earnings_report_service_1.earningsReportService.recordSessionPayment(coachId, nextId('booking'), 200));
            const withdrawal = expectOk(await payout_service_1.payoutService.requestWithdrawal(coachId, 50, payoutMethodId));
            strict_1.default.equal(withdrawal.coachId, coachId);
            strict_1.default.equal(withdrawal.amount, 50);
            strict_1.default.equal(withdrawal.status, 'PENDING');
            const history = expectOk(await payout_service_1.payoutService.getWithdrawalHistory(coachId));
            strict_1.default.ok(history.some((item) => item.id === withdrawal.id));
            const pending = expectOk(await payout_service_1.payoutService.getPendingWithdrawals(coachId));
            strict_1.default.ok(pending.some((item) => item.id === withdrawal.id));
        });
        (0, node_test_1.it)('cancels a pending withdrawal', async () => {
            const coachId = nextId('coach');
            const payoutMethodId = await addVerifiedBankMethod(coachId, true);
            expectOk(await earnings_report_service_1.earningsReportService.recordSessionPayment(coachId, nextId('booking'), 300));
            const withdrawal = expectOk(await payout_service_1.payoutService.requestWithdrawal(coachId, 80, payoutMethodId));
            expectOk(await payout_service_1.payoutService.cancelWithdrawal(withdrawal.id));
            const history = expectOk(await payout_service_1.payoutService.getWithdrawalHistory(coachId));
            const cancelled = history.find((item) => item.id === withdrawal.id);
            strict_1.default.equal(cancelled?.status, 'CANCELLED');
        });
    });
});
