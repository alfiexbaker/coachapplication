"use strict";
/**
 * Coach Analytics Service Tests
 *
 * Unit tests for the coach analytics service functionality including
 * getCoachAnalytics, getRevenueChart, getRetentionMetrics,
 * getCancellationPatterns, getPeakHours, and getTopSkills.
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
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = __importStar(require("node:test"));
const analytics_service_1 = require("../../services/analytics-service");
const expectOk = (result) => {
    node_assert_1.default.strictEqual(result.success, true);
    if (!result.success) {
        throw new Error('Expected successful result');
    }
    return result.data;
};
// Reset to mock data before each test
(0, node_test_1.beforeEach)(async () => {
    expectOk(await analytics_service_1.coachAnalyticsService.resetToMockData());
});
(0, node_test_1.describe)('Coach Analytics Service', () => {
    (0, node_test_1.describe)('getCoachAnalytics', () => {
        (0, node_test_1.default)('should return analytics for a known coach', async () => {
            const analytics = expectOk(await analytics_service_1.coachAnalyticsService.getCoachAnalytics('coach1'));
            node_assert_1.default.ok(analytics);
            node_assert_1.default.strictEqual(analytics.coachId, 'coach1');
            node_assert_1.default.strictEqual(analytics.coachName, 'Marcus Thompson');
            node_assert_1.default.ok(analytics.totalRevenue > 0);
            node_assert_1.default.ok(analytics.sessions);
            node_assert_1.default.ok(analytics.retention);
            node_assert_1.default.ok(analytics.cancellations);
            node_assert_1.default.ok(Array.isArray(analytics.peakHours));
            node_assert_1.default.ok(Array.isArray(analytics.topSkills));
            node_assert_1.default.ok(Array.isArray(analytics.revenueChart));
        });
        (0, node_test_1.default)('should return default analytics for unknown coach', async () => {
            const analytics = expectOk(await analytics_service_1.coachAnalyticsService.getCoachAnalytics('unknown_coach'));
            node_assert_1.default.ok(analytics);
            node_assert_1.default.strictEqual(analytics.coachId, 'unknown_coach');
            node_assert_1.default.strictEqual(analytics.totalRevenue, 0);
            node_assert_1.default.strictEqual(analytics.sessions.totalSessions, 0);
            node_assert_1.default.strictEqual(analytics.retention.totalActiveClients, 0);
        });
        (0, node_test_1.default)('should respect period parameter', async () => {
            const periods = ['WEEK', 'MONTH', 'QUARTER', 'YEAR'];
            for (const period of periods) {
                const analytics = expectOk(await analytics_service_1.coachAnalyticsService.getCoachAnalytics('coach1', period));
                node_assert_1.default.ok(analytics);
                node_assert_1.default.strictEqual(analytics.period, period);
                node_assert_1.default.ok(analytics.dateRange);
                node_assert_1.default.ok(analytics.dateRange.startDate);
                node_assert_1.default.ok(analytics.dateRange.endDate);
            }
        });
        (0, node_test_1.default)('should include all required analytics fields', async () => {
            const analytics = expectOk(await analytics_service_1.coachAnalyticsService.getCoachAnalytics('coach1'));
            node_assert_1.default.ok(analytics);
            // Revenue fields
            node_assert_1.default.ok(typeof analytics.totalRevenue === 'number');
            node_assert_1.default.ok(typeof analytics.revenueChange === 'number');
            node_assert_1.default.ok(typeof analytics.revenueChangePercent === 'number');
            node_assert_1.default.ok(['UP', 'DOWN', 'STABLE'].includes(analytics.revenueTrend));
            node_assert_1.default.ok(typeof analytics.avgRevenuePerSession === 'number');
            // Session fields
            node_assert_1.default.ok(typeof analytics.sessions.totalSessions === 'number');
            node_assert_1.default.ok(typeof analytics.sessions.sessionsChange === 'number');
            node_assert_1.default.ok(typeof analytics.sessions.avgSessionsPerWeek === 'number');
            node_assert_1.default.ok(typeof analytics.sessions.avgDuration === 'number');
            node_assert_1.default.ok(typeof analytics.sessions.popularSessionType === 'string');
            node_assert_1.default.ok(Array.isArray(analytics.sessions.bySessionType));
            // Retention fields
            node_assert_1.default.ok(typeof analytics.retention.newClients === 'number');
            node_assert_1.default.ok(typeof analytics.retention.returningClients === 'number');
            node_assert_1.default.ok(typeof analytics.retention.churnRate === 'number');
            node_assert_1.default.ok(typeof analytics.retention.retentionRate === 'number');
            // Cancellation fields
            node_assert_1.default.ok(typeof analytics.cancellations.totalCancellations === 'number');
            node_assert_1.default.ok(typeof analytics.cancellations.cancellationRate === 'number');
            node_assert_1.default.ok(Array.isArray(analytics.cancellations.byReason));
            node_assert_1.default.ok(Array.isArray(analytics.cancellations.byDayOfWeek));
            // Schedule insights
            node_assert_1.default.ok(analytics.busiestDay);
            node_assert_1.default.ok(typeof analytics.busiestDay.dayOfWeek === 'number');
            node_assert_1.default.ok(typeof analytics.busiestDay.dayName === 'string');
            node_assert_1.default.ok(analytics.busiestHour);
            node_assert_1.default.ok(typeof analytics.busiestHour.hour === 'number');
            // Performance metrics
            node_assert_1.default.ok(typeof analytics.avgRating === 'number');
            node_assert_1.default.ok(typeof analytics.reviewCount === 'number');
            // Timestamp
            node_assert_1.default.ok(analytics.computedAt);
        });
        (0, node_test_1.default)('should return correct trend direction based on revenue change', async () => {
            // Coach1 has positive revenue change (UP trend)
            const coach1Analytics = expectOk(await analytics_service_1.coachAnalyticsService.getCoachAnalytics('coach1'));
            node_assert_1.default.ok(coach1Analytics);
            node_assert_1.default.ok(coach1Analytics.revenueChangePercent > 0);
            node_assert_1.default.strictEqual(coach1Analytics.revenueTrend, 'UP');
            // Coach2 has negative revenue change (DOWN trend)
            const coach2Analytics = expectOk(await analytics_service_1.coachAnalyticsService.getCoachAnalytics('coach2'));
            node_assert_1.default.ok(coach2Analytics);
            node_assert_1.default.ok(coach2Analytics.revenueChangePercent < 0);
            node_assert_1.default.strictEqual(coach2Analytics.revenueTrend, 'DOWN');
        });
    });
    (0, node_test_1.describe)('getRevenueChart', () => {
        (0, node_test_1.default)('should return revenue data points', async () => {
            const revenueData = expectOk(await analytics_service_1.coachAnalyticsService.getRevenueChart('coach1', 'MONTH'));
            node_assert_1.default.ok(Array.isArray(revenueData));
            node_assert_1.default.ok(revenueData.length > 0);
            revenueData.forEach((point) => {
                node_assert_1.default.ok(point.date);
                node_assert_1.default.ok(typeof point.amount === 'number');
            });
        });
        (0, node_test_1.default)('should return different data points for different periods', async () => {
            const weekData = expectOk(await analytics_service_1.coachAnalyticsService.getRevenueChart('coach1', 'WEEK'));
            const monthData = expectOk(await analytics_service_1.coachAnalyticsService.getRevenueChart('coach1', 'MONTH'));
            const yearData = expectOk(await analytics_service_1.coachAnalyticsService.getRevenueChart('coach1', 'YEAR'));
            // Week should have 7 data points (daily)
            node_assert_1.default.strictEqual(weekData.length, 7);
            // Month should have 4 data points (weekly)
            node_assert_1.default.strictEqual(monthData.length, 4);
            // Year should have 12 data points (monthly)
            node_assert_1.default.strictEqual(yearData.length, 12);
        });
        (0, node_test_1.default)('should include session count in revenue data points', async () => {
            const revenueData = expectOk(await analytics_service_1.coachAnalyticsService.getRevenueChart('coach1', 'MONTH'));
            revenueData.forEach((point) => {
                node_assert_1.default.ok(typeof point.sessionCount === 'number');
            });
        });
    });
    (0, node_test_1.describe)('getRetentionMetrics', () => {
        (0, node_test_1.default)('should return retention metrics', async () => {
            const metrics = expectOk(await analytics_service_1.coachAnalyticsService.getRetentionMetrics('coach1'));
            node_assert_1.default.ok(metrics);
            node_assert_1.default.ok(typeof metrics.newClients === 'number');
            node_assert_1.default.ok(typeof metrics.returningClients === 'number');
            node_assert_1.default.ok(typeof metrics.churnRate === 'number');
            node_assert_1.default.ok(typeof metrics.retentionRate === 'number');
            node_assert_1.default.ok(typeof metrics.avgSessionsPerClient === 'number');
            node_assert_1.default.ok(typeof metrics.totalActiveClients === 'number');
            node_assert_1.default.ok(typeof metrics.clientsLost === 'number');
        });
        (0, node_test_1.default)('should return default metrics for unknown coach', async () => {
            const metrics = expectOk(await analytics_service_1.coachAnalyticsService.getRetentionMetrics('unknown_coach'));
            node_assert_1.default.ok(metrics);
            node_assert_1.default.strictEqual(metrics.newClients, 0);
            node_assert_1.default.strictEqual(metrics.returningClients, 0);
            node_assert_1.default.strictEqual(metrics.totalActiveClients, 0);
            node_assert_1.default.strictEqual(metrics.retentionRate, 100);
        });
        (0, node_test_1.default)('should have retention rate between 0 and 100', async () => {
            const metrics = expectOk(await analytics_service_1.coachAnalyticsService.getRetentionMetrics('coach1'));
            node_assert_1.default.ok(metrics.retentionRate >= 0);
            node_assert_1.default.ok(metrics.retentionRate <= 100);
            node_assert_1.default.ok(metrics.churnRate >= 0);
            node_assert_1.default.ok(metrics.churnRate <= 100);
        });
    });
    (0, node_test_1.describe)('getCancellationPatterns', () => {
        (0, node_test_1.default)('should return cancellation statistics', async () => {
            const stats = expectOk(await analytics_service_1.coachAnalyticsService.getCancellationPatterns('coach1'));
            node_assert_1.default.ok(stats);
            node_assert_1.default.ok(typeof stats.totalCancellations === 'number');
            node_assert_1.default.ok(typeof stats.cancellationRate === 'number');
            node_assert_1.default.ok(Array.isArray(stats.byReason));
            node_assert_1.default.ok(Array.isArray(stats.byDayOfWeek));
            node_assert_1.default.ok(typeof stats.avgNoticeHours === 'number');
            node_assert_1.default.ok(typeof stats.revenueLost === 'number');
        });
        (0, node_test_1.default)('should include valid cancellation reasons', async () => {
            const stats = expectOk(await analytics_service_1.coachAnalyticsService.getCancellationPatterns('coach1'));
            const validReasons = [
                'CLIENT_REQUEST',
                'WEATHER',
                'ILLNESS',
                'SCHEDULING_CONFLICT',
                'NO_SHOW',
                'COACH_CANCELLED',
                'OTHER',
            ];
            stats.byReason.forEach((reason) => {
                node_assert_1.default.ok(validReasons.includes(reason.reason));
                node_assert_1.default.ok(typeof reason.count === 'number');
                node_assert_1.default.ok(typeof reason.percentage === 'number');
            });
        });
        (0, node_test_1.default)('should include day of week breakdown with valid days', async () => {
            const stats = expectOk(await analytics_service_1.coachAnalyticsService.getCancellationPatterns('coach1'));
            stats.byDayOfWeek.forEach((day) => {
                node_assert_1.default.ok(day.dayOfWeek >= 0 && day.dayOfWeek <= 6);
                node_assert_1.default.ok(typeof day.dayName === 'string');
                node_assert_1.default.ok(typeof day.count === 'number');
                node_assert_1.default.ok(typeof day.percentage === 'number');
            });
        });
    });
    (0, node_test_1.describe)('getPeakHours', () => {
        (0, node_test_1.default)('should return peak hours data', async () => {
            const peakHours = expectOk(await analytics_service_1.coachAnalyticsService.getPeakHours('coach1'));
            node_assert_1.default.ok(Array.isArray(peakHours));
            node_assert_1.default.ok(peakHours.length > 0);
        });
        (0, node_test_1.default)('should have valid day and hour values', async () => {
            const peakHours = expectOk(await analytics_service_1.coachAnalyticsService.getPeakHours('coach1'));
            peakHours.forEach((data) => {
                node_assert_1.default.ok(data.dayOfWeek >= 0 && data.dayOfWeek <= 6);
                node_assert_1.default.ok(data.hour >= 0 && data.hour <= 23);
                node_assert_1.default.ok(typeof data.dayName === 'string');
                node_assert_1.default.ok(typeof data.sessionCount === 'number');
                node_assert_1.default.ok(typeof data.intensity === 'number');
                node_assert_1.default.ok(data.intensity >= 0 && data.intensity <= 1);
            });
        });
        (0, node_test_1.default)('should cover all days of the week', async () => {
            const peakHours = expectOk(await analytics_service_1.coachAnalyticsService.getPeakHours('coach1'));
            const daysFound = new Set(peakHours.map((d) => d.dayOfWeek));
            // Should have data for all 7 days
            for (let day = 0; day < 7; day++) {
                node_assert_1.default.ok(daysFound.has(day), `Missing day ${day}`);
            }
        });
    });
    (0, node_test_1.describe)('getTopSkills', () => {
        (0, node_test_1.default)('should return top skills data', async () => {
            const topSkills = expectOk(await analytics_service_1.coachAnalyticsService.getTopSkills('coach1'));
            node_assert_1.default.ok(Array.isArray(topSkills));
            node_assert_1.default.ok(topSkills.length > 0);
        });
        (0, node_test_1.default)('should have valid skill data structure', async () => {
            const topSkills = expectOk(await analytics_service_1.coachAnalyticsService.getTopSkills('coach1'));
            topSkills.forEach((skill) => {
                node_assert_1.default.ok(typeof skill.skill === 'string');
                node_assert_1.default.ok(typeof skill.sessionCount === 'number');
                node_assert_1.default.ok(typeof skill.percentage === 'number');
                node_assert_1.default.ok(typeof skill.revenue === 'number');
            });
        });
        (0, node_test_1.default)('should return empty array for unknown coach', async () => {
            const topSkills = expectOk(await analytics_service_1.coachAnalyticsService.getTopSkills('unknown_coach'));
            node_assert_1.default.ok(Array.isArray(topSkills));
            node_assert_1.default.strictEqual(topSkills.length, 0);
        });
        (0, node_test_1.default)('should have percentages that are non-negative', async () => {
            const topSkills = expectOk(await analytics_service_1.coachAnalyticsService.getTopSkills('coach1'));
            topSkills.forEach((skill) => {
                node_assert_1.default.ok(skill.percentage >= 0);
                node_assert_1.default.ok(skill.percentage <= 100);
            });
        });
    });
    (0, node_test_1.describe)('getSessionStats', () => {
        (0, node_test_1.default)('should return session statistics', async () => {
            const stats = expectOk(await analytics_service_1.coachAnalyticsService.getSessionStats('coach1'));
            node_assert_1.default.ok(stats);
            node_assert_1.default.ok(typeof stats.totalSessions === 'number');
            node_assert_1.default.ok(typeof stats.sessionsChange === 'number');
            node_assert_1.default.ok(typeof stats.sessionsChangePercent === 'number');
            node_assert_1.default.ok(typeof stats.avgSessionsPerWeek === 'number');
            node_assert_1.default.ok(typeof stats.avgDuration === 'number');
            node_assert_1.default.ok(typeof stats.popularSessionType === 'string');
            node_assert_1.default.ok(Array.isArray(stats.bySessionType));
        });
        (0, node_test_1.default)('should include session type breakdown', async () => {
            const stats = expectOk(await analytics_service_1.coachAnalyticsService.getSessionStats('coach1'));
            stats.bySessionType.forEach((sessionType) => {
                node_assert_1.default.ok(typeof sessionType.type === 'string');
                node_assert_1.default.ok(typeof sessionType.count === 'number');
                node_assert_1.default.ok(typeof sessionType.percentage === 'number');
                node_assert_1.default.ok(typeof sessionType.revenue === 'number');
            });
        });
        (0, node_test_1.default)('should return default stats for unknown coach', async () => {
            const stats = expectOk(await analytics_service_1.coachAnalyticsService.getSessionStats('unknown_coach'));
            node_assert_1.default.ok(stats);
            node_assert_1.default.strictEqual(stats.totalSessions, 0);
            node_assert_1.default.strictEqual(stats.popularSessionType, 'N/A');
            node_assert_1.default.strictEqual(stats.bySessionType.length, 0);
        });
    });
    (0, node_test_1.describe)('Multiple Coaches', () => {
        (0, node_test_1.default)('should return different data for different coaches', async () => {
            const coach1Analytics = expectOk(await analytics_service_1.coachAnalyticsService.getCoachAnalytics('coach1'));
            const coach2Analytics = expectOk(await analytics_service_1.coachAnalyticsService.getCoachAnalytics('coach2'));
            const coach3Analytics = expectOk(await analytics_service_1.coachAnalyticsService.getCoachAnalytics('coach3'));
            node_assert_1.default.ok(coach1Analytics);
            node_assert_1.default.ok(coach2Analytics);
            node_assert_1.default.ok(coach3Analytics);
            // Each coach should have their own ID
            node_assert_1.default.strictEqual(coach1Analytics.coachId, 'coach1');
            node_assert_1.default.strictEqual(coach2Analytics.coachId, 'coach2');
            node_assert_1.default.strictEqual(coach3Analytics.coachId, 'coach3');
            // Revenue should be different for each coach
            node_assert_1.default.notStrictEqual(coach1Analytics.totalRevenue, coach2Analytics.totalRevenue);
            node_assert_1.default.notStrictEqual(coach2Analytics.totalRevenue, coach3Analytics.totalRevenue);
        });
    });
});
