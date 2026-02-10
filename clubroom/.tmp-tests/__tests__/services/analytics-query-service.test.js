"use strict";
/**
 * Analytics Query Service Tests
 *
 * Tests for athlete analytics queries: getAthleteAnalytics,
 * getSkillHistory, getAthleteGoals, getSkillComparison.
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
const analytics_query_service_1 = require("../../services/analytics/analytics-query-service");
(0, node_test_1.describe)('analyticsQueryService', () => {
    // ---------------------------------------------------------------------------
    // getAthleteAnalytics
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getAthleteAnalytics', () => {
        (0, node_test_1.default)('returns analytics for known athlete', async () => {
            const result = await analytics_query_service_1.analyticsQueryService.getAthleteAnalytics('athlete_1');
            strict_1.default.ok(result);
            strict_1.default.equal(result.athleteId, 'athlete_1');
            strict_1.default.ok(result.skills.length > 0);
        });
        (0, node_test_1.default)('returns fallback analytics for unknown athlete', async () => {
            const result = await analytics_query_service_1.analyticsQueryService.getAthleteAnalytics('unknown_athlete_xyz');
            strict_1.default.ok(result);
            strict_1.default.equal(result.athleteId, 'unknown_athlete_xyz');
            strict_1.default.equal(result.totalSessions, 0);
        });
        (0, node_test_1.default)('respects period parameter', async () => {
            const result = await analytics_query_service_1.analyticsQueryService.getAthleteAnalytics('athlete_1', 'WEEK');
            strict_1.default.ok(result);
            strict_1.default.equal(result.period, 'WEEK');
        });
    });
    // ---------------------------------------------------------------------------
    // getSkillHistory
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getSkillHistory', () => {
        (0, node_test_1.default)('returns all skills for known athlete', async () => {
            const result = await analytics_query_service_1.analyticsQueryService.getSkillHistory('athlete_1');
            strict_1.default.ok(Array.isArray(result));
            strict_1.default.ok(result.length > 0);
        });
        (0, node_test_1.default)('filters by skill name', async () => {
            const result = await analytics_query_service_1.analyticsQueryService.getSkillHistory('athlete_1', 'Dribbling');
            strict_1.default.ok(result.length <= 1);
            if (result.length > 0) {
                strict_1.default.equal(result[0].skillName, 'Dribbling');
            }
        });
        (0, node_test_1.default)('returns empty for unknown athlete', async () => {
            const result = await analytics_query_service_1.analyticsQueryService.getSkillHistory('unknown_xyz');
            strict_1.default.deepEqual(result, []);
        });
    });
    // ---------------------------------------------------------------------------
    // getAthleteGoals
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getAthleteGoals', () => {
        (0, node_test_1.default)('returns goals for known athlete', async () => {
            const result = await analytics_query_service_1.analyticsQueryService.getAthleteGoals('athlete_1');
            strict_1.default.ok(Array.isArray(result));
        });
        (0, node_test_1.default)('filters by status', async () => {
            const result = await analytics_query_service_1.analyticsQueryService.getAthleteGoals('athlete_1', 'ACTIVE');
            for (const goal of result) {
                strict_1.default.equal(goal.status, 'ACTIVE');
            }
        });
    });
    // ---------------------------------------------------------------------------
    // getSkillComparison
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getSkillComparison', () => {
        (0, node_test_1.default)('returns comparison data for known athlete', async () => {
            const result = await analytics_query_service_1.analyticsQueryService.getSkillComparison('athlete_1');
            strict_1.default.ok(result.skills);
            strict_1.default.ok(Array.isArray(result.skills));
            if (result.skills.length > 0) {
                strict_1.default.ok('athleteLevel' in result.skills[0]);
                strict_1.default.ok('averageLevel' in result.skills[0]);
            }
        });
        (0, node_test_1.default)('returns empty skills for unknown athlete', async () => {
            const result = await analytics_query_service_1.analyticsQueryService.getSkillComparison('unknown_xyz');
            strict_1.default.deepEqual(result.skills, []);
        });
    });
});
