"use strict";
/**
 * Analytics Tracking Service Tests
 *
 * Tests for athlete analytics mutations: updateSkillLevel, createGoal,
 * updateGoalProgress, completeMilestone, addMilestone, abandonGoal.
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
const analytics_tracking_service_1 = require("../../services/analytics/analytics-tracking-service");
const analytics_query_service_1 = require("../../services/analytics/analytics-query-service");
const api_client_1 = require("../../services/api-client");
const rid = () => Math.random().toString(36).slice(2, 10);
(0, node_test_1.describe)('analyticsTrackingService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove('athlete_analytics');
        await api_client_1.apiClient.remove('athlete_goals');
    });
    // ---------------------------------------------------------------------------
    // updateSkillLevel
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('updateSkillLevel', () => {
        (0, node_test_1.default)('updates skill level for existing athlete', async () => {
            const athleteId = `ath_${rid()}`;
            await analytics_tracking_service_1.analyticsTrackingService.updateSkillLevel(athleteId, 'Dribbling', 80);
            const analytics = await analytics_query_service_1.analyticsQueryService.getAthleteAnalytics(athleteId);
            strict_1.default.ok(analytics);
            const skill = analytics.skills.find((s) => s.skillName === 'Dribbling');
            strict_1.default.ok(skill);
            strict_1.default.equal(skill.currentLevel, 80);
        });
        (0, node_test_1.default)('creates new skill entry if not present', async () => {
            const athleteId = `ath_${rid()}`;
            await analytics_tracking_service_1.analyticsTrackingService.updateSkillLevel(athleteId, 'Defending', 55);
            const analytics = await analytics_query_service_1.analyticsQueryService.getAthleteAnalytics(athleteId);
            const skill = analytics.skills.find((s) => s.skillName === 'Defending');
            strict_1.default.ok(skill);
            strict_1.default.equal(skill.currentLevel, 55);
        });
    });
    // ---------------------------------------------------------------------------
    // createGoal
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('createGoal', () => {
        (0, node_test_1.default)('creates a goal with correct fields', async () => {
            const athleteId = `ath_${rid()}`;
            const goal = await analytics_tracking_service_1.analyticsTrackingService.createGoal({
                athleteId,
                title: 'Improve Passing',
                description: 'Get passing to 80',
                category: 'TECHNIQUE',
                createdBy: 'COACH',
                createdById: `c_${rid()}`,
                milestones: ['Complete 10 drills', 'Score 80 on assessment'],
            });
            strict_1.default.ok(goal.id);
            strict_1.default.equal(goal.title, 'Improve Passing');
            strict_1.default.equal(goal.status, 'ACTIVE');
            strict_1.default.equal(goal.progress, 0);
            strict_1.default.equal(goal.milestones.length, 2);
        });
    });
    // ---------------------------------------------------------------------------
    // updateGoalProgress
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('updateGoalProgress', () => {
        (0, node_test_1.default)('updates progress and returns ok', async () => {
            const goal = await analytics_tracking_service_1.analyticsTrackingService.createGoal({
                athleteId: `ath_${rid()}`,
                title: 'Test Goal',
                createdBy: 'ATHLETE',
                createdById: `a_${rid()}`,
            });
            const result = await analytics_tracking_service_1.analyticsTrackingService.updateGoalProgress(goal.id, 50);
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.progress, 50);
            }
        });
        (0, node_test_1.default)('auto-completes at 100%', async () => {
            const goal = await analytics_tracking_service_1.analyticsTrackingService.createGoal({
                athleteId: `ath_${rid()}`,
                title: 'Complete Me',
                createdBy: 'COACH',
                createdById: `c_${rid()}`,
            });
            const result = await analytics_tracking_service_1.analyticsTrackingService.updateGoalProgress(goal.id, 100);
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.status, 'COMPLETED');
            }
        });
        (0, node_test_1.default)('returns err for nonexistent goal', async () => {
            const result = await analytics_tracking_service_1.analyticsTrackingService.updateGoalProgress(`goal_${rid()}`, 50);
            strict_1.default.equal(result.success, false);
        });
    });
    // ---------------------------------------------------------------------------
    // completeMilestone
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('completeMilestone', () => {
        (0, node_test_1.default)('marks milestone as completed and recalculates progress', async () => {
            const goal = await analytics_tracking_service_1.analyticsTrackingService.createGoal({
                athleteId: `ath_${rid()}`,
                title: 'Milestone Goal',
                createdBy: 'COACH',
                createdById: `c_${rid()}`,
                milestones: ['Step 1', 'Step 2'],
            });
            const msId = goal.milestones[0].id;
            const result = await analytics_tracking_service_1.analyticsTrackingService.completeMilestone(goal.id, msId);
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.progress, 50);
                strict_1.default.ok(result.data.milestones[0].isCompleted);
            }
        });
        (0, node_test_1.default)('returns err for nonexistent goal', async () => {
            const result = await analytics_tracking_service_1.analyticsTrackingService.completeMilestone(`goal_${rid()}`, 'ms_1');
            strict_1.default.equal(result.success, false);
        });
    });
    // ---------------------------------------------------------------------------
    // addMilestone
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('addMilestone', () => {
        (0, node_test_1.default)('adds milestone and recalculates progress', async () => {
            const goal = await analytics_tracking_service_1.analyticsTrackingService.createGoal({
                athleteId: `ath_${rid()}`,
                title: 'Add MS Goal',
                createdBy: 'COACH',
                createdById: `c_${rid()}`,
                milestones: ['Existing'],
            });
            const result = await analytics_tracking_service_1.analyticsTrackingService.addMilestone(goal.id, 'New Milestone');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.milestones.length, 2);
            }
        });
        (0, node_test_1.default)('returns err for nonexistent goal', async () => {
            const result = await analytics_tracking_service_1.analyticsTrackingService.addMilestone(`goal_${rid()}`, 'New');
            strict_1.default.equal(result.success, false);
        });
    });
    // ---------------------------------------------------------------------------
    // abandonGoal
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('abandonGoal', () => {
        (0, node_test_1.default)('sets status to ABANDONED', async () => {
            const goal = await analytics_tracking_service_1.analyticsTrackingService.createGoal({
                athleteId: `ath_${rid()}`,
                title: 'Abandon Me',
                createdBy: 'ATHLETE',
                createdById: `a_${rid()}`,
            });
            const result = await analytics_tracking_service_1.analyticsTrackingService.abandonGoal(goal.id);
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.status, 'ABANDONED');
            }
        });
        (0, node_test_1.default)('returns err for nonexistent goal', async () => {
            const result = await analytics_tracking_service_1.analyticsTrackingService.abandonGoal(`goal_${rid()}`);
            strict_1.default.equal(result.success, false);
        });
    });
});
