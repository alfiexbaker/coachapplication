"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const storage_keys_1 = require("@/constants/storage-keys");
const api_client_1 = require("@/services/api-client");
const verification_service_1 = require("@/services/verification-service");
(0, node_test_1.describe)('verificationService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.VERIFICATION);
    });
    (0, node_test_1.it)('returns default status and updates identity verification (happy path)', async () => {
        const statusResult = await verification_service_1.verificationService.getStatus('coach_verify_1');
        strict_1.default.equal(statusResult.success, true);
        if (!statusResult.success)
            return;
        strict_1.default.equal(statusResult.data.overallLevel, 'BASIC');
        const updateResult = await verification_service_1.verificationService.submitIdVerification('coach_verify_1', 'mock://id-document.jpg');
        strict_1.default.equal(updateResult.success, true);
        if (!updateResult.success)
            return;
        strict_1.default.equal(updateResult.data.identity.status, 'PENDING');
    });
    (0, node_test_1.it)('calculates helper labels and tones', () => {
        strict_1.default.equal(verification_service_1.verificationService.getStatusLabel({ status: 'VERIFIED' }), 'Verified');
        strict_1.default.equal(verification_service_1.verificationService.getStatusTone('PENDING'), 'warning');
    });
    (0, node_test_1.it)('returns err when verification storage fails (error path)', async () => {
        const apiClientInternals = api_client_1.apiClient;
        const originalGet = apiClientInternals.get;
        apiClientInternals.get = async () => {
            throw new Error('forced verification read failure');
        };
        try {
            const result = await verification_service_1.verificationService.getStatus('coach_verify_err');
            strict_1.default.equal(result.success, false);
            if (result.success)
                return;
            strict_1.default.equal(result.error.code, 'STORAGE');
        }
        finally {
            apiClientInternals.get = originalGet;
        }
    });
});
