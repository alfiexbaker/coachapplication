"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const storage_keys_1 = require("@/constants/storage-keys");
const api_client_1 = require("@/services/api-client");
const report_service_1 = require("@/services/report-service");
(0, node_test_1.describe)('reportService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.REPORTS);
    });
    (0, node_test_1.it)('submits and lists reports (happy path)', async () => {
        const submitResult = await report_service_1.reportService.submitReport({
            reportedUserId: 'user_reported_1',
            reportedByUserId: 'user_reporter_1',
            type: 'spam',
            context: 'profile',
            description: 'Repeated spam messages',
        });
        strict_1.default.equal(submitResult.success, true);
        if (!submitResult.success)
            return;
        const listResult = await report_service_1.reportService.getReports();
        strict_1.default.equal(listResult.success, true);
        if (!listResult.success)
            return;
        strict_1.default.ok(listResult.data.some((item) => item.id === submitResult.data.id));
    });
    (0, node_test_1.it)('returns empty list when no reports exist (empty path)', async () => {
        const result = await report_service_1.reportService.getReports();
        strict_1.default.equal(result.success, true);
        if (!result.success)
            return;
        strict_1.default.deepEqual(result.data, []);
    });
    (0, node_test_1.it)('returns err when storage fails (error path)', async () => {
        const apiClientInternals = api_client_1.apiClient;
        const originalGet = apiClientInternals.get;
        apiClientInternals.get = async () => {
            throw new Error('forced reports read failure');
        };
        try {
            const result = await report_service_1.reportService.getReports();
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
