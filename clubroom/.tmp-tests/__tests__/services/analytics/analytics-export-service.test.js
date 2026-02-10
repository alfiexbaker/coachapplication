"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const analytics_export_service_1 = require("@/services/analytics/analytics-export-service");
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
(0, node_test_1.describe)('AnalyticsExportService', () => {
    (0, node_test_1.beforeEach)(async () => {
        // Clear storage
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.COACH_ANALYTICS);
    });
    (0, node_test_1.describe)('getCoachAnalytics', () => {
        (0, node_test_1.it)('should return analytics for known coach', async () => {
            const analytics = await analytics_export_service_1.analyticsExportService.getCoachAnalytics('coach1', 'MONTH');
            strict_1.default.ok(analytics);
            strict_1.default.equal(analytics.coachId, 'coach1');
            strict_1.default.equal(analytics.period, 'MONTH');
            strict_1.default.ok(analytics.totalRevenue > 0);
            strict_1.default.ok(Array.isArray(analytics.revenueChart));
            strict_1.default.ok(analytics.revenueChart.length > 0);
        });
        (0, node_test_1.it)('should return default analytics for unknown coach', async () => {
            const coachId = 'test-unknown-' + Math.random().toString(36).slice(2);
            const analytics = await analytics_export_service_1.analyticsExportService.getCoachAnalytics(coachId, 'WEEK');
            strict_1.default.ok(analytics);
            strict_1.default.equal(analytics.coachId, coachId);
            strict_1.default.equal(analytics.period, 'WEEK');
            strict_1.default.equal(analytics.totalRevenue, 0);
        });
        (0, node_test_1.it)('should update period and date range dynamically', async () => {
            const week = await analytics_export_service_1.analyticsExportService.getCoachAnalytics('coach1', 'WEEK');
            const month = await analytics_export_service_1.analyticsExportService.getCoachAnalytics('coach1', 'MONTH');
            strict_1.default.ok(week);
            strict_1.default.ok(month);
            strict_1.default.equal(week.period, 'WEEK');
            strict_1.default.equal(month.period, 'MONTH');
            strict_1.default.notDeepEqual(week.dateRange, month.dateRange);
        });
        (0, node_test_1.it)('should regenerate revenue chart for different periods', async () => {
            const weekAnalytics = await analytics_export_service_1.analyticsExportService.getCoachAnalytics('coach1', 'WEEK');
            const yearAnalytics = await analytics_export_service_1.analyticsExportService.getCoachAnalytics('coach1', 'YEAR');
            strict_1.default.ok(weekAnalytics);
            strict_1.default.ok(yearAnalytics);
            strict_1.default.ok(weekAnalytics.revenueChart.length < yearAnalytics.revenueChart.length);
        });
    });
    (0, node_test_1.describe)('getRevenueChart', () => {
        (0, node_test_1.it)('should return revenue data points', async () => {
            const chart = await analytics_export_service_1.analyticsExportService.getRevenueChart('coach1', 'MONTH');
            strict_1.default.ok(Array.isArray(chart));
            strict_1.default.ok(chart.length > 0);
            strict_1.default.ok(chart[0].date);
            strict_1.default.ok(typeof chart[0].amount === 'number');
            strict_1.default.ok(typeof chart[0].sessionCount === 'number');
        });
        (0, node_test_1.it)('should return mock data for unknown coach', async () => {
            const coachId = 'test-unknown-' + Math.random().toString(36).slice(2);
            const chart = await analytics_export_service_1.analyticsExportService.getRevenueChart(coachId, 'WEEK');
            strict_1.default.ok(Array.isArray(chart));
            strict_1.default.ok(chart.length > 0);
        });
        (0, node_test_1.it)('should vary data points by period', async () => {
            const weekChart = await analytics_export_service_1.analyticsExportService.getRevenueChart('coach1', 'WEEK');
            const yearChart = await analytics_export_service_1.analyticsExportService.getRevenueChart('coach1', 'YEAR');
            strict_1.default.ok(weekChart.length < yearChart.length);
        });
    });
    (0, node_test_1.describe)('getRetentionMetrics', () => {
        (0, node_test_1.it)('should return retention data for known coach', async () => {
            const retention = await analytics_export_service_1.analyticsExportService.getRetentionMetrics('coach1');
            strict_1.default.ok(retention);
            strict_1.default.ok(typeof retention.newClients === 'number');
            strict_1.default.ok(typeof retention.returningClients === 'number');
            strict_1.default.ok(typeof retention.churnRate === 'number');
            strict_1.default.ok(typeof retention.retentionRate === 'number');
        });
        (0, node_test_1.it)('should return default retention for unknown coach', async () => {
            const coachId = 'test-unknown-' + Math.random().toString(36).slice(2);
            const retention = await analytics_export_service_1.analyticsExportService.getRetentionMetrics(coachId);
            strict_1.default.ok(retention);
            strict_1.default.equal(retention.newClients, 0);
            strict_1.default.equal(retention.retentionRate, 100);
        });
    });
    (0, node_test_1.describe)('getCancellationPatterns', () => {
        (0, node_test_1.it)('should return cancellation stats for known coach', async () => {
            const stats = await analytics_export_service_1.analyticsExportService.getCancellationPatterns('coach1');
            strict_1.default.ok(stats);
            strict_1.default.ok(typeof stats.totalCancellations === 'number');
            strict_1.default.ok(typeof stats.cancellationRate === 'number');
            strict_1.default.ok(Array.isArray(stats.byReason));
            strict_1.default.ok(Array.isArray(stats.byDayOfWeek));
        });
        (0, node_test_1.it)('should return empty stats for unknown coach', async () => {
            const coachId = 'test-unknown-' + Math.random().toString(36).slice(2);
            const stats = await analytics_export_service_1.analyticsExportService.getCancellationPatterns(coachId);
            strict_1.default.ok(stats);
            strict_1.default.equal(stats.totalCancellations, 0);
            strict_1.default.equal(stats.byReason.length, 0);
        });
    });
    (0, node_test_1.describe)('getPeakHours', () => {
        (0, node_test_1.it)('should return peak hours heatmap data', async () => {
            const peakHours = await analytics_export_service_1.analyticsExportService.getPeakHours('coach1');
            strict_1.default.ok(Array.isArray(peakHours));
            strict_1.default.ok(peakHours.length > 0);
            strict_1.default.ok(typeof peakHours[0].dayOfWeek === 'number');
            strict_1.default.ok(typeof peakHours[0].hour === 'number');
            strict_1.default.ok(typeof peakHours[0].sessionCount === 'number');
            strict_1.default.ok(typeof peakHours[0].intensity === 'number');
        });
        (0, node_test_1.it)('should return generated peak hours for unknown coach', async () => {
            const coachId = 'test-unknown-' + Math.random().toString(36).slice(2);
            const peakHours = await analytics_export_service_1.analyticsExportService.getPeakHours(coachId);
            strict_1.default.ok(Array.isArray(peakHours));
            strict_1.default.ok(peakHours.length > 0);
        });
    });
    (0, node_test_1.describe)('getTopSkills', () => {
        (0, node_test_1.it)('should return top skills for known coach', async () => {
            const skills = await analytics_export_service_1.analyticsExportService.getTopSkills('coach1');
            strict_1.default.ok(Array.isArray(skills));
            strict_1.default.ok(skills.length > 0);
            strict_1.default.ok(skills[0].skill);
            strict_1.default.ok(typeof skills[0].sessionCount === 'number');
            strict_1.default.ok(typeof skills[0].percentage === 'number');
            strict_1.default.ok(typeof skills[0].revenue === 'number');
        });
        (0, node_test_1.it)('should return empty array for unknown coach', async () => {
            const coachId = 'test-unknown-' + Math.random().toString(36).slice(2);
            const skills = await analytics_export_service_1.analyticsExportService.getTopSkills(coachId);
            strict_1.default.ok(Array.isArray(skills));
        });
        (0, node_test_1.it)('should sort skills by session count descending', async () => {
            const skills = await analytics_export_service_1.analyticsExportService.getTopSkills('coach1');
            if (skills.length > 1) {
                strict_1.default.ok(skills[0].sessionCount >= skills[1].sessionCount);
            }
        });
    });
    (0, node_test_1.describe)('getSessionStats', () => {
        (0, node_test_1.it)('should return session statistics for known coach', async () => {
            const stats = await analytics_export_service_1.analyticsExportService.getSessionStats('coach1');
            strict_1.default.ok(stats);
            strict_1.default.ok(typeof stats.totalSessions === 'number');
            strict_1.default.ok(typeof stats.avgSessionsPerWeek === 'number');
            strict_1.default.ok(Array.isArray(stats.bySessionType));
        });
        (0, node_test_1.it)('should return default stats for unknown coach', async () => {
            const coachId = 'test-unknown-' + Math.random().toString(36).slice(2);
            const stats = await analytics_export_service_1.analyticsExportService.getSessionStats(coachId);
            strict_1.default.ok(stats);
            strict_1.default.equal(stats.totalSessions, 0);
        });
    });
    (0, node_test_1.describe)('resetToMockData', () => {
        (0, node_test_1.it)('should reset analytics to mock data', async () => {
            await analytics_export_service_1.analyticsExportService.resetToMockData();
            const analytics = await analytics_export_service_1.analyticsExportService.getCoachAnalytics('coach1', 'MONTH');
            strict_1.default.ok(analytics);
            strict_1.default.equal(analytics.coachId, 'coach1');
        });
    });
});
