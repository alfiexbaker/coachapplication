"use strict";
/**
 * Report Service — Handles user reporting functionality.
 *
 * Allows users to report profiles, messages, and reviews for
 * inappropriate content, safety concerns, fake profiles, or spam.
 *
 * Usage:
 *   import { reportService } from './report-service';
 *   await reportService.submitReport({ ... });
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportService = void 0;
const api_client_1 = require("./api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const logger_1 = require("@/utils/logger");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('ReportService');
exports.reportService = {
    /**
     * Submit a new report against a user.
     */
    async submitReport(report) {
        try {
            const newReport = {
                ...report,
                id: api_client_1.apiClient.generateId('report'),
                createdAt: new Date().toISOString(),
                status: 'pending',
            };
            const existing = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.REPORTS, []);
            existing.push(newReport);
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.REPORTS, existing);
            return (0, result_1.ok)(newReport);
        }
        catch (error) {
            logger.error('Failed to submit report', { report, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to submit report'));
        }
    },
    /**
     * Get all reports submitted by the current user or against a user.
     */
    async getReports() {
        try {
            const reports = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.REPORTS, []);
            return (0, result_1.ok)(reports);
        }
        catch (error) {
            logger.error('Failed to get reports', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to load reports'));
        }
    },
};
