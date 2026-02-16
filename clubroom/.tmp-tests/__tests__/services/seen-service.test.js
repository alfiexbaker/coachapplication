"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const storage_keys_1 = require("@/constants/storage-keys");
const api_client_1 = require("@/services/api-client");
const seen_service_1 = require("@/services/seen-service");
(0, node_test_1.describe)('seenService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SEEN_STATUSES);
    });
    (0, node_test_1.it)('marks seen status and retrieves it (happy path)', async () => {
        const markResult = await seen_service_1.seenService.markSeen('message', 'msg-1', 'user-1');
        strict_1.default.equal(markResult.success, true);
        const statusResult = await seen_service_1.seenService.getSeenStatus('message', 'msg-1');
        strict_1.default.equal(statusResult.success, true);
        if (!statusResult.success)
            return;
        strict_1.default.equal(statusResult.data?.seenBy, 'user-1');
        strict_1.default.ok(statusResult.data?.seenAt);
    });
    (0, node_test_1.it)('returns empty list when no statuses are present (empty path)', async () => {
        const statusesResult = await seen_service_1.seenService.getSeenStatuses('message', ['msg-1', 'msg-2']);
        strict_1.default.equal(statusesResult.success, true);
        if (!statusesResult.success)
            return;
        strict_1.default.deepEqual(statusesResult.data, []);
    });
    (0, node_test_1.it)('returns err when storage read fails (error path)', async () => {
        const apiClientInternals = api_client_1.apiClient;
        const originalGet = apiClientInternals.get;
        apiClientInternals.get = async () => {
            throw new Error('forced seen storage failure');
        };
        try {
            const result = await seen_service_1.seenService.markSeen('message', 'msg-err', 'user-err');
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
