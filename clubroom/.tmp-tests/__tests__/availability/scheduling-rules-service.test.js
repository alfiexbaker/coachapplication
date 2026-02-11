"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const storage_keys_1 = require("@/constants/storage-keys");
const api_client_1 = require("@/services/api-client");
const scheduling_rules_service_1 = require("@/services/scheduling-rules-service");
(0, node_test_1.describe)('schedulingRulesService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SCHEDULING_RULES);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.CANCELLATION_POLICIES);
        scheduling_rules_service_1.schedulingRulesService.clearCache();
    });
    (0, node_test_1.it)('returns default rules for new coach (happy path)', async () => {
        const result = await scheduling_rules_service_1.schedulingRulesService.getCoachRules('coach-rules-1');
        strict_1.default.equal(result.success, true);
        if (!result.success)
            return;
        strict_1.default.equal(result.data.coachId, 'coach-rules-1');
        strict_1.default.equal(result.data.minimumAdvanceBookingHours, 24);
        strict_1.default.equal(result.data.maxAdvanceBookingDays, 30);
        strict_1.default.equal(result.data.allowRescheduling, true);
    });
    (0, node_test_1.it)('updates rules and validates booking window', async () => {
        const updateResult = await scheduling_rules_service_1.schedulingRulesService.updateCoachRules('coach-rules-2', {
            minimumAdvanceBookingHours: 48,
            allowSameDayBookings: false,
        });
        strict_1.default.equal(updateResult.success, true);
        const nearFuture = new Date();
        nearFuture.setHours(nearFuture.getHours() + 2);
        const validationResult = await scheduling_rules_service_1.schedulingRulesService.validateBookingTime('coach-rules-2', nearFuture);
        strict_1.default.equal(validationResult.success, true);
        if (!validationResult.success)
            return;
        strict_1.default.equal(validationResult.data.isValid, false);
        strict_1.default.ok(validationResult.data.errorMessage?.includes('advance'));
    });
    (0, node_test_1.it)('returns null cancellation policy when none configured (empty path)', async () => {
        const result = await scheduling_rules_service_1.schedulingRulesService.getCancellationPolicy('coach-rules-3');
        strict_1.default.equal(result.success, true);
        if (!result.success)
            return;
        strict_1.default.equal(result.data, null);
    });
    (0, node_test_1.it)('sets cancellation policy and calculates refund', async () => {
        const policyResult = await scheduling_rules_service_1.schedulingRulesService.setCancellationPolicy('coach-rules-4', 'flexible');
        strict_1.default.equal(policyResult.success, true);
        if (!policyResult.success)
            return;
        const sessionStart = new Date();
        sessionStart.setHours(sessionStart.getHours() + 10);
        const refund = scheduling_rules_service_1.schedulingRulesService.calculateRefund(100, sessionStart, policyResult.data);
        strict_1.default.equal(refund.originalAmount, 100);
        strict_1.default.equal(refund.refundPercentage, 100);
        strict_1.default.equal(refund.isEligible, true);
        strict_1.default.ok(refund.refundAmount > 0);
        strict_1.default.ok(refund.netRefundAmount <= refund.refundAmount);
    });
    (0, node_test_1.it)('returns validation error for unknown preset', async () => {
        const result = await scheduling_rules_service_1.schedulingRulesService.applyPreset('coach-rules-5', 'unknown_preset');
        strict_1.default.equal(result.success, false);
        if (result.success)
            return;
        strict_1.default.equal(result.error.code, 'VALIDATION');
    });
    (0, node_test_1.it)('returns err when saving rules fails (error path)', async () => {
        const apiClientInternals = api_client_1.apiClient;
        const originalSet = apiClientInternals.set;
        apiClientInternals.set = async () => {
            throw new Error('forced scheduling save failure');
        };
        try {
            const result = await scheduling_rules_service_1.schedulingRulesService.updateCoachRules('coach-rules-6', {
                minimumAdvanceBookingHours: 12,
            });
            strict_1.default.equal(result.success, false);
            if (result.success)
                return;
            strict_1.default.equal(result.error.code, 'STORAGE');
        }
        finally {
            apiClientInternals.set = originalSet;
        }
    });
});
