"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const analytics_query_service_1 = require("@/services/analytics/analytics-query-service");
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
function expectOk(result) {
    strict_1.default.equal(result.success, true);
    return result.data;
}
(0, node_test_1.describe)('AnalyticsQueryService', () => {
    (0, node_test_1.beforeEach)(async () => {
        // Clear storage
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.ATHLETE_ANALYTICS);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.ATHLETE_GOALS);
    });
    (0, node_test_1.describe)('getAthleteAnalytics', () => {
        (0, node_test_1.it)('should return analytics for known athlete', async () => {
            const analytics = expectOk(await analytics_query_service_1.analyticsQueryService.getAthleteAnalytics('athlete_1', 'MONTH'));
            strict_1.default.ok(analytics);
            strict_1.default.equal(analytics.athleteId, 'athlete_1');
            strict_1.default.equal(analytics.period, 'MONTH');
            strict_1.default.ok(analytics.totalSessions >= 0);
            strict_1.default.ok(Array.isArray(analytics.skills));
        });
        (0, node_test_1.it)('should return default analytics for unknown athlete', async () => {
            const athleteId = 'test-unknown-' + Math.random().toString(36).slice(2);
            const analytics = expectOk(await analytics_query_service_1.analyticsQueryService.getAthleteAnalytics(athleteId, 'WEEK'));
            strict_1.default.ok(analytics);
            strict_1.default.equal(analytics.athleteId, athleteId);
            strict_1.default.equal(analytics.period, 'WEEK');
            strict_1.default.equal(analytics.totalSessions, 0);
        });
        (0, node_test_1.it)('should attach active goals to analytics', async () => {
            const analytics = expectOk(await analytics_query_service_1.analyticsQueryService.getAthleteAnalytics('athlete_1', 'MONTH'));
            strict_1.default.ok(analytics);
            strict_1.default.ok(Array.isArray(analytics.activeGoals));
            strict_1.default.ok(Array.isArray(analytics.completedGoals));
        });
        (0, node_test_1.it)('should update period dynamically', async () => {
            const week = expectOk(await analytics_query_service_1.analyticsQueryService.getAthleteAnalytics('athlete_1', 'WEEK'));
            const weekPeriod = week?.period;
            const year = expectOk(await analytics_query_service_1.analyticsQueryService.getAthleteAnalytics('athlete_1', 'YEAR'));
            strict_1.default.ok(week);
            strict_1.default.ok(year);
            strict_1.default.equal(weekPeriod, 'WEEK');
            strict_1.default.equal(year.period, 'YEAR');
        });
        (0, node_test_1.it)('should filter goals by athlete', async () => {
            const analytics = expectOk(await analytics_query_service_1.analyticsQueryService.getAthleteAnalytics('athlete_1', 'MONTH'));
            strict_1.default.ok(analytics);
            analytics.activeGoals.forEach((goal) => {
                strict_1.default.equal(goal.athleteId, 'athlete_1');
            });
        });
    });
    (0, node_test_1.describe)('getSkillHistory', () => {
        (0, node_test_1.it)('should return all skills for athlete', async () => {
            const skills = expectOk(await analytics_query_service_1.analyticsQueryService.getSkillHistory('athlete_1'));
            strict_1.default.ok(Array.isArray(skills));
            strict_1.default.ok(skills.length > 0);
            strict_1.default.ok(skills[0].skillName);
            strict_1.default.ok(typeof skills[0].currentLevel === 'number');
            strict_1.default.ok(Array.isArray(skills[0].history));
        });
        (0, node_test_1.it)('should return empty array for unknown athlete', async () => {
            const athleteId = 'test-unknown-' + Math.random().toString(36).slice(2);
            const skills = expectOk(await analytics_query_service_1.analyticsQueryService.getSkillHistory(athleteId));
            strict_1.default.ok(Array.isArray(skills));
            strict_1.default.equal(skills.length, 0);
        });
        (0, node_test_1.it)('should filter by skill name when provided', async () => {
            const skills = expectOk(await analytics_query_service_1.analyticsQueryService.getSkillHistory('athlete_1', 'Dribbling'));
            strict_1.default.ok(Array.isArray(skills));
            if (skills.length > 0) {
                strict_1.default.equal(skills[0].skillName, 'Dribbling');
            }
        });
        (0, node_test_1.it)('should include skill history data points', async () => {
            const skills = expectOk(await analytics_query_service_1.analyticsQueryService.getSkillHistory('athlete_1'));
            strict_1.default.ok(skills.length > 0);
            const skill = skills[0];
            strict_1.default.ok(Array.isArray(skill.history));
            if (skill.history.length > 0) {
                strict_1.default.ok(skill.history[0].date);
                strict_1.default.ok(typeof skill.history[0].level === 'number');
            }
        });
    });
    (0, node_test_1.describe)('getAthleteGoals', () => {
        (0, node_test_1.it)('should return all goals for athlete', async () => {
            const goals = expectOk(await analytics_query_service_1.analyticsQueryService.getAthleteGoals('athlete_1'));
            strict_1.default.ok(Array.isArray(goals));
            strict_1.default.ok(goals.length > 0);
            goals.forEach((goal) => {
                strict_1.default.equal(goal.athleteId, 'athlete_1');
            });
        });
        (0, node_test_1.it)('should return empty array for unknown athlete', async () => {
            const athleteId = 'test-unknown-' + Math.random().toString(36).slice(2);
            const goals = expectOk(await analytics_query_service_1.analyticsQueryService.getAthleteGoals(athleteId));
            strict_1.default.ok(Array.isArray(goals));
            strict_1.default.equal(goals.length, 0);
        });
        (0, node_test_1.it)('should filter by status when provided', async () => {
            const activeGoals = expectOk(await analytics_query_service_1.analyticsQueryService.getAthleteGoals('athlete_1', 'ACTIVE'));
            strict_1.default.ok(Array.isArray(activeGoals));
            activeGoals.forEach((goal) => {
                strict_1.default.equal(goal.status, 'ACTIVE');
            });
        });
        (0, node_test_1.it)('should sort goals by updatedAt descending', async () => {
            const goals = expectOk(await analytics_query_service_1.analyticsQueryService.getAthleteGoals('athlete_1'));
            if (goals.length > 1) {
                const time1 = new Date(goals[0].updatedAt).getTime();
                const time2 = new Date(goals[1].updatedAt).getTime();
                strict_1.default.ok(time1 >= time2);
            }
        });
        (0, node_test_1.it)('should include goal milestones', async () => {
            const goals = expectOk(await analytics_query_service_1.analyticsQueryService.getAthleteGoals('athlete_1'));
            if (goals.length > 0) {
                const goal = goals[0];
                strict_1.default.ok(Array.isArray(goal.milestones));
            }
        });
    });
    (0, node_test_1.describe)('getSkillComparison', () => {
        (0, node_test_1.it)('should return skill comparison data', async () => {
            const comparison = expectOk(await analytics_query_service_1.analyticsQueryService.getSkillComparison('athlete_1'));
            strict_1.default.ok(comparison);
            strict_1.default.ok(Array.isArray(comparison.skills));
        });
        (0, node_test_1.it)('should return empty skills for unknown athlete', async () => {
            const athleteId = 'test-unknown-' + Math.random().toString(36).slice(2);
            const comparison = expectOk(await analytics_query_service_1.analyticsQueryService.getSkillComparison(athleteId));
            strict_1.default.ok(comparison);
            strict_1.default.ok(Array.isArray(comparison.skills));
            strict_1.default.equal(comparison.skills.length, 0);
        });
        (0, node_test_1.it)('should include athlete and average levels', async () => {
            const comparison = expectOk(await analytics_query_service_1.analyticsQueryService.getSkillComparison('athlete_1'));
            if (comparison.skills.length > 0) {
                const skill = comparison.skills[0];
                strict_1.default.ok(skill.name);
                strict_1.default.ok(typeof skill.athleteLevel === 'number');
                strict_1.default.ok(typeof skill.averageLevel === 'number');
            }
        });
        (0, node_test_1.it)('should match skills from athlete analytics', async () => {
            const analytics = expectOk(await analytics_query_service_1.analyticsQueryService.getAthleteAnalytics('athlete_1'));
            const comparison = expectOk(await analytics_query_service_1.analyticsQueryService.getSkillComparison('athlete_1'));
            if (!analytics) {
                strict_1.default.fail('Expected athlete analytics for known athlete');
            }
            if (comparison.skills.length > 0) {
                strict_1.default.equal(comparison.skills.length, analytics.skills.length);
            }
        });
    });
});
