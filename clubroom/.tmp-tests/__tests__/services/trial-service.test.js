"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const storage_keys_1 = require("@/constants/storage-keys");
const api_client_1 = require("@/services/api-client");
const trial_service_1 = require("@/services/trial-service");
(0, node_test_1.describe)('trialService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.TRIAL_OFFERINGS);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.TRIAL_USAGES);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.TRIAL_CONVERSIONS);
    });
    (0, node_test_1.it)('upserts and retrieves trial offering (happy path)', async () => {
        const offering = await trial_service_1.trialService.upsertTrialOffering('coach_trial_1', {
            enabled: true,
            trialPrice: 10,
            normalPrice: 50,
            durationMinutes: 60,
            limitPerFamily: 1,
            description: 'Intro offer',
        });
        strict_1.default.equal(offering.coachId, 'coach_trial_1');
        strict_1.default.equal(offering.enabled, true);
        const fetched = await trial_service_1.trialService.getTrialOffering('coach_trial_1');
        strict_1.default.ok(fetched);
        strict_1.default.equal(fetched?.id, offering.id);
    });
    (0, node_test_1.it)('returns not eligible when no active trial offering exists (empty path)', async () => {
        const eligible = await trial_service_1.trialService.isTrialEligible('coach_none', 'parent_none');
        strict_1.default.equal(eligible, false);
    });
    (0, node_test_1.it)('tracks usage count and enforces limit per family', async () => {
        await trial_service_1.trialService.upsertTrialOffering('coach_trial_2', {
            enabled: true,
            trialPrice: 5,
            normalPrice: 45,
            durationMinutes: 60,
            limitPerFamily: 1,
            description: 'Single trial',
        });
        await trial_service_1.trialService.recordTrialUsage('coach_trial_2', 'parent_trial_1', 'booking_trial_1');
        const usageCount = await trial_service_1.trialService.getTrialUsageCount('coach_trial_2', 'parent_trial_1');
        strict_1.default.equal(usageCount, 1);
        const eligible = await trial_service_1.trialService.isTrialEligible('coach_trial_2', 'parent_trial_1');
        strict_1.default.equal(eligible, false);
    });
    (0, node_test_1.it)('propagates storage failures (error path)', async () => {
        const apiClientInternals = api_client_1.apiClient;
        const originalGet = apiClientInternals.get;
        apiClientInternals.get = async () => {
            throw new Error('forced trial storage failure');
        };
        try {
            await strict_1.default.rejects(async () => {
                await trial_service_1.trialService.getTrialOffering('coach_err');
            }, /forced trial storage failure/);
        }
        finally {
            apiClientInternals.get = originalGet;
        }
    });
});
