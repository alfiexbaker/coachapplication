"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const analytics_service_1 = require("@/services/analytics-service");
const analytics_query_service_1 = require("@/services/analytics/analytics-query-service");
const analytics_export_service_1 = require("@/services/analytics/analytics-export-service");
const result_1 = require("@/types/result");
(0, node_test_1.describe)('analyticsService facade', () => {
    (0, node_test_1.it)('delegates getAthleteAnalytics success result', async () => {
        const queryInternals = analytics_query_service_1.analyticsQueryService;
        const original = queryInternals.getAthleteAnalytics;
        const sample = {
            athleteId: 'athlete_test_1',
            period: 'WEEK',
            totalSessions: 4,
            sessionsThisPeriod: 3,
            attendanceRate: 75,
            averageSessionRating: 4.3,
            skills: [],
            activeGoals: 0,
            completedGoals: 0,
            improvementRate: 10,
            consistencyScore: 80,
            percentileRank: 70,
        };
        queryInternals.getAthleteAnalytics = async () => (0, result_1.ok)(sample);
        try {
            const result = await analytics_service_1.analyticsService.getAthleteAnalytics('athlete_test_1', 'WEEK');
            strict_1.default.equal(result.success, true);
            if (!result.success || !result.data)
                return;
            strict_1.default.equal(result.data.athleteId, 'athlete_test_1');
            strict_1.default.equal(result.data.sessionsThisPeriod, 3);
        }
        finally {
            queryInternals.getAthleteAnalytics = original;
        }
    });
    (0, node_test_1.it)('delegates getAthleteAnalytics error result', async () => {
        const queryInternals = analytics_query_service_1.analyticsQueryService;
        const original = queryInternals.getAthleteAnalytics;
        queryInternals.getAthleteAnalytics = async () => (0, result_1.err)((0, result_1.storageError)('forced analytics failure'));
        try {
            const result = await analytics_service_1.analyticsService.getAthleteAnalytics('athlete_err', 'MONTH');
            strict_1.default.equal(result.success, false);
            if (result.success)
                return;
            strict_1.default.equal(result.error.code, 'STORAGE');
        }
        finally {
            queryInternals.getAthleteAnalytics = original;
        }
    });
    (0, node_test_1.it)('delegates coach analytics export methods', async () => {
        const exportInternals = analytics_export_service_1.analyticsExportService;
        const original = exportInternals.getRevenueChart;
        exportInternals.getRevenueChart = async () => (0, result_1.ok)([
            { date: '2026-01-01', amount: 100, sessionCount: 2 },
            { date: '2026-02-01', amount: 200, sessionCount: 3 },
        ]);
        try {
            const result = await analytics_service_1.coachAnalyticsService.getRevenueChart('coach_1', 'MONTH');
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data.length, 2);
            strict_1.default.equal(result.data[0].amount, 100);
        }
        finally {
            exportInternals.getRevenueChart = original;
        }
    });
});
