"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const analytics_tracking_service_1 = require("@/services/analytics/analytics-tracking-service");
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
(0, node_test_1.describe)('AnalyticsTrackingService', () => {
    (0, node_test_1.beforeEach)(async () => {
        // Clear storage
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.ATHLETE_ANALYTICS);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.ATHLETE_GOALS);
    });
    (0, node_test_1.describe)('updateSkillLevel', () => {
        (0, node_test_1.it)('should update skill level for existing skill', async () => {
            await analytics_tracking_service_1.analyticsTrackingService.updateSkillLevel('athlete_1', 'Dribbling', 80);
            const analytics = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.ATHLETE_ANALYTICS, []);
            const athlete = analytics.find((a) => a.athleteId === 'athlete_1');
            const skill = athlete?.skills.find((s) => s.skillName === 'Dribbling');
            strict_1.default.ok(skill);
            strict_1.default.equal(skill.currentLevel, 80);
        });
        (0, node_test_1.it)('should create new analytics record for unknown athlete', async () => {
            const athleteId = 'test-athlete-' + Math.random().toString(36).slice(2);
            await analytics_tracking_service_1.analyticsTrackingService.updateSkillLevel(athleteId, 'Passing', 65);
            const analytics = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.ATHLETE_ANALYTICS, []);
            const athlete = analytics.find((a) => a.athleteId === athleteId);
            strict_1.default.ok(athlete);
            strict_1.default.equal(athlete.athleteId, athleteId);
        });
        (0, node_test_1.it)('should add new skill to existing athlete', async () => {
            const athleteId = 'test-athlete-' + Math.random().toString(36).slice(2);
            await analytics_tracking_service_1.analyticsTrackingService.updateSkillLevel(athleteId, 'Defending', 50);
            await analytics_tracking_service_1.analyticsTrackingService.updateSkillLevel(athleteId, 'Finishing', 55);
            const analytics = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.ATHLETE_ANALYTICS, []);
            const athlete = analytics.find((a) => a.athleteId === athleteId);
            strict_1.default.ok(athlete);
            strict_1.default.equal(athlete.skills.length, 2);
        });
        (0, node_test_1.it)('should calculate change percent on update', async () => {
            const athleteId = 'test-athlete-' + Math.random().toString(36).slice(2);
            await analytics_tracking_service_1.analyticsTrackingService.updateSkillLevel(athleteId, 'Dribbling', 50);
            await analytics_tracking_service_1.analyticsTrackingService.updateSkillLevel(athleteId, 'Dribbling', 60);
            const analytics = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.ATHLETE_ANALYTICS, []);
            const athlete = analytics.find((a) => a.athleteId === athleteId);
            const skill = athlete?.skills.find((s) => s.skillName === 'Dribbling');
            strict_1.default.ok(skill);
            strict_1.default.equal(skill.previousLevel, 50);
            strict_1.default.equal(skill.currentLevel, 60);
            strict_1.default.equal(skill.changePercent, 20);
        });
        (0, node_test_1.it)('should append to skill history', async () => {
            const athleteId = 'test-athlete-' + Math.random().toString(36).slice(2);
            await analytics_tracking_service_1.analyticsTrackingService.updateSkillLevel(athleteId, 'Passing', 60);
            const analytics = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.ATHLETE_ANALYTICS, []);
            const athlete = analytics.find((a) => a.athleteId === athleteId);
            const skill = athlete?.skills.find((s) => s.skillName === 'Passing');
            strict_1.default.ok(skill);
            strict_1.default.ok(Array.isArray(skill.history));
            strict_1.default.ok(skill.history.length > 0);
        });
    });
    (0, node_test_1.describe)('createGoal', () => {
        (0, node_test_1.it)('should create new goal with required fields', async () => {
            const goal = await analytics_tracking_service_1.analyticsTrackingService.createGoal({
                athleteId: 'athlete_1',
                title: 'Improve weak foot',
                createdBy: 'COACH',
                createdById: 'coach1',
            });
            strict_1.default.ok(goal);
            strict_1.default.ok(goal.id);
            strict_1.default.equal(goal.athleteId, 'athlete_1');
            strict_1.default.equal(goal.title, 'Improve weak foot');
            strict_1.default.equal(goal.status, 'ACTIVE');
            strict_1.default.equal(goal.progress, 0);
        });
        (0, node_test_1.it)('should create goal with milestones', async () => {
            const goal = await analytics_tracking_service_1.analyticsTrackingService.createGoal({
                athleteId: 'athlete_1',
                title: 'Complete 10 sessions',
                milestones: ['5 sessions', '8 sessions', '10 sessions'],
                createdBy: 'ATHLETE',
                createdById: 'athlete_1',
            });
            strict_1.default.ok(goal);
            strict_1.default.equal(goal.milestones.length, 3);
            strict_1.default.ok(goal.milestones.every((m) => !m.isCompleted));
        });
        (0, node_test_1.it)('should save goal to storage', async () => {
            const goal = await analytics_tracking_service_1.analyticsTrackingService.createGoal({
                athleteId: 'athlete_1',
                title: 'Test goal',
                createdBy: 'COACH',
                createdById: 'coach1',
            });
            const goals = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.ATHLETE_GOALS, []);
            const saved = goals.find((g) => g.id === goal.id);
            strict_1.default.ok(saved);
            strict_1.default.equal(saved.title, 'Test goal');
        });
        (0, node_test_1.it)('should set default category if not provided', async () => {
            const goal = await analytics_tracking_service_1.analyticsTrackingService.createGoal({
                athleteId: 'athlete_1',
                title: 'Generic goal',
                createdBy: 'PARENT',
                createdById: 'parent1',
            });
            strict_1.default.equal(goal.category, 'OTHER');
        });
    });
    (0, node_test_1.describe)('updateGoalProgress', () => {
        (0, node_test_1.it)('should return success on successful update', async () => {
            const goal = await analytics_tracking_service_1.analyticsTrackingService.createGoal({
                athleteId: 'athlete_1',
                title: 'Test goal',
                createdBy: 'COACH',
                createdById: 'coach1',
            });
            const result = await analytics_tracking_service_1.analyticsTrackingService.updateGoalProgress(goal.id, 50);
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.progress, 50);
        });
        (0, node_test_1.it)('should return error for non-existent goal', async () => {
            const fakeId = 'goal-fake-' + Math.random().toString(36).slice(2);
            const result = await analytics_tracking_service_1.analyticsTrackingService.updateGoalProgress(fakeId, 50);
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
        (0, node_test_1.it)('should clamp progress between 0 and 100', async () => {
            const goal = await analytics_tracking_service_1.analyticsTrackingService.createGoal({
                athleteId: 'athlete_1',
                title: 'Test goal',
                createdBy: 'COACH',
                createdById: 'coach1',
            });
            const result1 = await analytics_tracking_service_1.analyticsTrackingService.updateGoalProgress(goal.id, 150);
            strict_1.default.ok(result1.success);
            strict_1.default.equal(result1.data.progress, 100);
            const result2 = await analytics_tracking_service_1.analyticsTrackingService.updateGoalProgress(goal.id, -10);
            strict_1.default.ok(result2.success);
            strict_1.default.equal(result2.data.progress, 0);
        });
        (0, node_test_1.it)('should mark goal as COMPLETED when progress reaches 100', async () => {
            const goal = await analytics_tracking_service_1.analyticsTrackingService.createGoal({
                athleteId: 'athlete_1',
                title: 'Test goal',
                createdBy: 'COACH',
                createdById: 'coach1',
            });
            const result = await analytics_tracking_service_1.analyticsTrackingService.updateGoalProgress(goal.id, 100);
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.status, 'COMPLETED');
        });
    });
    (0, node_test_1.describe)('completeMilestone', () => {
        (0, node_test_1.it)('should return success and mark milestone as completed', async () => {
            const goal = await analytics_tracking_service_1.analyticsTrackingService.createGoal({
                athleteId: 'athlete_1',
                title: 'Test goal',
                milestones: ['Step 1', 'Step 2', 'Step 3'],
                createdBy: 'COACH',
                createdById: 'coach1',
            });
            const milestoneId = goal.milestones[0].id;
            const result = await analytics_tracking_service_1.analyticsTrackingService.completeMilestone(goal.id, milestoneId);
            strict_1.default.ok(result.success);
            const milestone = result.data.milestones.find((m) => m.id === milestoneId);
            strict_1.default.ok(milestone?.isCompleted);
            strict_1.default.ok(milestone?.completedAt);
        });
        (0, node_test_1.it)('should return error for non-existent goal', async () => {
            const fakeGoalId = 'goal-fake-' + Math.random().toString(36).slice(2);
            const result = await analytics_tracking_service_1.analyticsTrackingService.completeMilestone(fakeGoalId, 'ms_1');
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
        (0, node_test_1.it)('should recalculate progress based on completed milestones', async () => {
            const goal = await analytics_tracking_service_1.analyticsTrackingService.createGoal({
                athleteId: 'athlete_1',
                title: 'Test goal',
                milestones: ['Step 1', 'Step 2', 'Step 3', 'Step 4'],
                createdBy: 'COACH',
                createdById: 'coach1',
            });
            // Complete 2 out of 4 milestones
            await analytics_tracking_service_1.analyticsTrackingService.completeMilestone(goal.id, goal.milestones[0].id);
            const result = await analytics_tracking_service_1.analyticsTrackingService.completeMilestone(goal.id, goal.milestones[1].id);
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.progress, 50);
        });
        (0, node_test_1.it)('should mark goal as COMPLETED when all milestones done', async () => {
            const goal = await analytics_tracking_service_1.analyticsTrackingService.createGoal({
                athleteId: 'athlete_1',
                title: 'Test goal',
                milestones: ['Step 1', 'Step 2'],
                createdBy: 'COACH',
                createdById: 'coach1',
            });
            await analytics_tracking_service_1.analyticsTrackingService.completeMilestone(goal.id, goal.milestones[0].id);
            const result = await analytics_tracking_service_1.analyticsTrackingService.completeMilestone(goal.id, goal.milestones[1].id);
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.progress, 100);
            strict_1.default.equal(result.data.status, 'COMPLETED');
        });
    });
    (0, node_test_1.describe)('addMilestone', () => {
        (0, node_test_1.it)('should return success and add milestone to goal', async () => {
            const goal = await analytics_tracking_service_1.analyticsTrackingService.createGoal({
                athleteId: 'athlete_1',
                title: 'Test goal',
                createdBy: 'COACH',
                createdById: 'coach1',
            });
            const result = await analytics_tracking_service_1.analyticsTrackingService.addMilestone(goal.id, 'New milestone');
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.milestones.length, 1);
            strict_1.default.equal(result.data.milestones[0].title, 'New milestone');
        });
        (0, node_test_1.it)('should return error for non-existent goal', async () => {
            const fakeId = 'goal-fake-' + Math.random().toString(36).slice(2);
            const result = await analytics_tracking_service_1.analyticsTrackingService.addMilestone(fakeId, 'Test');
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
        (0, node_test_1.it)('should recalculate progress when milestone added', async () => {
            const goal = await analytics_tracking_service_1.analyticsTrackingService.createGoal({
                athleteId: 'athlete_1',
                title: 'Test goal',
                milestones: ['Step 1', 'Step 2'],
                createdBy: 'COACH',
                createdById: 'coach1',
            });
            // Complete one milestone (50%)
            await analytics_tracking_service_1.analyticsTrackingService.completeMilestone(goal.id, goal.milestones[0].id);
            // Add a new milestone (now 1/3 = 33%)
            const result = await analytics_tracking_service_1.analyticsTrackingService.addMilestone(goal.id, 'Step 3');
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.progress, 33);
        });
    });
    (0, node_test_1.describe)('abandonGoal', () => {
        (0, node_test_1.it)('should return success and mark goal as ABANDONED', async () => {
            const goal = await analytics_tracking_service_1.analyticsTrackingService.createGoal({
                athleteId: 'athlete_1',
                title: 'Test goal',
                createdBy: 'COACH',
                createdById: 'coach1',
            });
            const result = await analytics_tracking_service_1.analyticsTrackingService.abandonGoal(goal.id);
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.status, 'ABANDONED');
        });
        (0, node_test_1.it)('should return error for non-existent goal', async () => {
            const fakeId = 'goal-fake-' + Math.random().toString(36).slice(2);
            const result = await analytics_tracking_service_1.analyticsTrackingService.abandonGoal(fakeId);
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
        (0, node_test_1.it)('should preserve progress when abandoning', async () => {
            const goal = await analytics_tracking_service_1.analyticsTrackingService.createGoal({
                athleteId: 'athlete_1',
                title: 'Test goal',
                createdBy: 'COACH',
                createdById: 'coach1',
            });
            await analytics_tracking_service_1.analyticsTrackingService.updateGoalProgress(goal.id, 75);
            const result = await analytics_tracking_service_1.analyticsTrackingService.abandonGoal(goal.id);
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.progress, 75);
            strict_1.default.equal(result.data.status, 'ABANDONED');
        });
    });
});
