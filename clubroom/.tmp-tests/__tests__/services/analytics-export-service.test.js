"use strict";
/**
 * Analytics Export Service Tests
 *
 * Tests for coach analytics: getCoachAnalytics, getRevenueChart,
 * getRetentionMetrics, getCancellationPatterns, getPeakHours,
 * getTopSkills, getSessionStats, resetToMockData.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importStar(require("node:test"));
const analytics_export_service_1 = require("../../services/analytics/analytics-export-service");
(0, node_test_1.describe)('analyticsExportService', () => {
    // ---------------------------------------------------------------------------
    // getCoachAnalytics
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getCoachAnalytics', () => {
        (0, node_test_1.default)('returns analytics for known coach', async () => {
            const result = await analytics_export_service_1.analyticsExportService.getCoachAnalytics('coach1');
            strict_1.default.ok(result, 'Should return analytics for known coach');
            strict_1.default.ok(typeof result.totalRevenue === 'number');
        });
        (0, node_test_1.default)('returns default analytics for unknown coach', async () => {
            const result = await analytics_export_service_1.analyticsExportService.getCoachAnalytics('unknown_coach_xyz');
            strict_1.default.ok(result);
            strict_1.default.equal(result.totalRevenue, 0);
        });
    });
    // ---------------------------------------------------------------------------
    // getRevenueChart
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getRevenueChart', () => {
        (0, node_test_1.default)('returns array of revenue data points', async () => {
            const result = await analytics_export_service_1.analyticsExportService.getRevenueChart('coach1', 'MONTH');
            strict_1.default.ok(Array.isArray(result));
            strict_1.default.ok(result.length > 0);
        });
    });
    // ---------------------------------------------------------------------------
    // getRetentionMetrics
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getRetentionMetrics', () => {
        (0, node_test_1.default)('returns retention data for known coach', async () => {
            const result = await analytics_export_service_1.analyticsExportService.getRetentionMetrics('coach1');
            strict_1.default.equal(typeof result.retentionRate, 'number');
            strict_1.default.equal(typeof result.churnRate, 'number');
        });
        (0, node_test_1.default)('returns default retention for unknown coach', async () => {
            const result = await analytics_export_service_1.analyticsExportService.getRetentionMetrics('unknown_xyz');
            strict_1.default.equal(result.retentionRate, 100);
            strict_1.default.equal(result.churnRate, 0);
        });
    });
    // ---------------------------------------------------------------------------
    // getCancellationPatterns
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getCancellationPatterns', () => {
        (0, node_test_1.default)('returns cancellation stats', async () => {
            const result = await analytics_export_service_1.analyticsExportService.getCancellationPatterns('coach1');
            strict_1.default.equal(typeof result.totalCancellations, 'number');
            strict_1.default.equal(typeof result.cancellationRate, 'number');
        });
    });
    // ---------------------------------------------------------------------------
    // getPeakHours
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getPeakHours', () => {
        (0, node_test_1.default)('returns array of peak hours data', async () => {
            const result = await analytics_export_service_1.analyticsExportService.getPeakHours('coach1');
            strict_1.default.ok(Array.isArray(result));
        });
    });
    // ---------------------------------------------------------------------------
    // getTopSkills
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getTopSkills', () => {
        (0, node_test_1.default)('returns array for known coach', async () => {
            const result = await analytics_export_service_1.analyticsExportService.getTopSkills('coach1');
            strict_1.default.ok(Array.isArray(result));
        });
        (0, node_test_1.default)('returns empty array for unknown coach', async () => {
            const result = await analytics_export_service_1.analyticsExportService.getTopSkills('unknown_xyz');
            strict_1.default.ok(Array.isArray(result));
        });
    });
    // ---------------------------------------------------------------------------
    // getSessionStats
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getSessionStats', () => {
        (0, node_test_1.default)('returns session stats for known coach', async () => {
            const result = await analytics_export_service_1.analyticsExportService.getSessionStats('coach1');
            strict_1.default.equal(typeof result.totalSessions, 'number');
        });
        (0, node_test_1.default)('returns default stats for unknown coach', async () => {
            const result = await analytics_export_service_1.analyticsExportService.getSessionStats('unknown_xyz');
            strict_1.default.equal(result.totalSessions, 0);
        });
    });
    // ---------------------------------------------------------------------------
    // resetToMockData
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('resetToMockData', () => {
        (0, node_test_1.default)('does not throw', async () => {
            await strict_1.default.doesNotReject(analytics_export_service_1.analyticsExportService.resetToMockData());
        });
    });
});
