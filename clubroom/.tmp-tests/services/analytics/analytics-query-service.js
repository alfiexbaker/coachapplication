"use strict";
/**
 * Analytics Query Service
 *
 * Handles querying and aggregation of athlete analytics data.
 * Provides read-only access to analytics, skill history, goals,
 * and skill comparison data.
 *
 * API Integration Notes:
 * - GET /api/athletes/:id/analytics?period=MONTH - Get analytics
 * - GET /api/athletes/:id/skills/history - Skill progression
 * - GET /api/athletes/:id/goals - Get goals
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsQueryService = void 0;
const api_client_1 = require("../api-client");
const logger_1 = require("@/utils/logger");
const config_1 = require("@/constants/config");
const storage_keys_1 = require("@/constants/storage-keys");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('AnalyticsQueryService');
const USE_MOCK = config_1.api.useMock;
// ============================================================================
// MOCK DATA (shared references for query operations)
// ============================================================================
const MOCK_ANALYTICS = [
    {
        athleteId: 'athlete_1',
        athleteName: 'Tom Baker',
        period: 'MONTH',
        totalSessions: 24,
        sessionsThisPeriod: 8,
        averageSessionRating: 4.5,
        attendanceRate: 95,
        skills: [
            {
                skillName: 'Dribbling',
                category: 'Technical',
                currentLevel: 72,
                previousLevel: 65,
                changePercent: 10.8,
                history: [
                    { date: '2025-10-01', level: 58 },
                    { date: '2025-11-01', level: 62 },
                    { date: '2025-12-01', level: 65 },
                    { date: '2026-01-01', level: 72 },
                ],
            },
            {
                skillName: 'Passing',
                category: 'Technical',
                currentLevel: 68,
                previousLevel: 64,
                changePercent: 6.3,
                history: [
                    { date: '2025-10-01', level: 55 },
                    { date: '2025-11-01', level: 60 },
                    { date: '2025-12-01', level: 64 },
                    { date: '2026-01-01', level: 68 },
                ],
            },
            {
                skillName: 'Finishing',
                category: 'Technical',
                currentLevel: 58,
                previousLevel: 52,
                changePercent: 11.5,
                history: [
                    { date: '2025-10-01', level: 42 },
                    { date: '2025-11-01', level: 48 },
                    { date: '2025-12-01', level: 52 },
                    { date: '2026-01-01', level: 58 },
                ],
            },
            {
                skillName: 'Defending',
                category: 'Tactical',
                currentLevel: 45,
                previousLevel: 45,
                changePercent: 0,
                history: [
                    { date: '2025-10-01', level: 40 },
                    { date: '2025-11-01', level: 42 },
                    { date: '2025-12-01', level: 45 },
                    { date: '2026-01-01', level: 45 },
                ],
            },
            {
                skillName: 'Conditioning',
                category: 'Physical',
                currentLevel: 75,
                previousLevel: 70,
                changePercent: 7.1,
                history: [
                    { date: '2025-10-01', level: 60 },
                    { date: '2025-11-01', level: 65 },
                    { date: '2025-12-01', level: 70 },
                    { date: '2026-01-01', level: 75 },
                ],
            },
        ],
        activeGoals: [],
        completedGoals: [],
        improvementRate: 8.9,
        consistencyScore: 85,
        percentileRank: 78,
        lastSessionDate: '2026-01-08',
        nextSessionDate: '2026-01-15',
    },
];
const MOCK_GOALS = [
    {
        id: 'goal_1',
        userId: 'athlete_1',
        athleteId: 'athlete_1',
        title: 'Master weak foot finishing',
        description: 'Be confident shooting with left foot from inside the box',
        category: 'TECHNIQUE',
        targetDate: '2026-03-01',
        progress: 45,
        milestones: [
            { id: 'ms_1', goalId: 'goal_1', title: 'Complete 5 weak foot drills', isCompleted: true, completedAt: '2025-12-15', order: 0 },
            { id: 'ms_2', goalId: 'goal_1', title: 'Score 3 goals in training with weak foot', isCompleted: true, completedAt: '2026-01-05', order: 1 },
            { id: 'ms_3', goalId: 'goal_1', title: 'Score weak foot goal in match', isCompleted: false, order: 2 },
            { id: 'ms_4', goalId: 'goal_1', title: 'Consistent accuracy from 15 yards', isCompleted: false, order: 3 },
        ],
        status: 'ACTIVE',
        createdBy: 'COACH',
        createdById: 'coach1',
        createdAt: '2025-11-01T10:00:00Z',
        updatedAt: '2026-01-05T14:00:00Z',
    },
    {
        id: 'goal_2',
        userId: 'athlete_1',
        athleteId: 'athlete_1',
        title: 'Improve first touch under pressure',
        description: 'Control the ball cleanly when defenders are close',
        category: 'TECHNIQUE',
        targetDate: '2026-02-15',
        progress: 70,
        milestones: [
            { id: 'ms_5', goalId: 'goal_2', title: 'Practice receiving drills for 4 weeks', isCompleted: true, completedAt: '2025-12-20', order: 0 },
            { id: 'ms_6', goalId: 'goal_2', title: 'Demonstrate in 1v1 scenarios', isCompleted: true, completedAt: '2026-01-03', order: 1 },
            { id: 'ms_7', goalId: 'goal_2', title: 'Apply in match situations', isCompleted: false, order: 2 },
        ],
        status: 'ACTIVE',
        createdBy: 'COACH',
        createdById: 'coach1',
        createdAt: '2025-11-15T09:00:00Z',
        updatedAt: '2026-01-03T16:00:00Z',
    },
    {
        id: 'goal_3',
        userId: 'athlete_1',
        athleteId: 'athlete_1',
        title: 'Complete 10 consecutive sessions',
        description: 'Build consistency and commitment',
        category: 'FITNESS',
        targetDate: '2025-12-31',
        progress: 100,
        milestones: [
            { id: 'ms_8', goalId: 'goal_3', title: '5 sessions', isCompleted: true, completedAt: '2025-11-20', order: 0 },
            { id: 'ms_9', goalId: 'goal_3', title: '8 sessions', isCompleted: true, completedAt: '2025-12-10', order: 1 },
            { id: 'ms_10', goalId: 'goal_3', title: '10 sessions', isCompleted: true, completedAt: '2025-12-28', order: 2 },
        ],
        status: 'COMPLETED',
        createdBy: 'ATHLETE',
        createdById: 'athlete_1',
        createdAt: '2025-10-15T11:00:00Z',
        updatedAt: '2025-12-28T17:00:00Z',
    },
];
// ============================================================================
// STORAGE HELPERS
// ============================================================================
let analyticsCache = [...MOCK_ANALYTICS];
let goalsCache = [...MOCK_GOALS];
async function loadAnalytics() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.ATHLETE_ANALYTICS, null);
        if (stored)
            return stored;
    }
    catch (error) {
        logger.error('Failed to load analytics', error);
    }
    return [...MOCK_ANALYTICS];
}
async function loadGoals() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.ATHLETE_GOALS, null);
        if (stored)
            return stored;
    }
    catch (error) {
        logger.error('Failed to load goals', error);
    }
    return [...MOCK_GOALS];
}
// ============================================================================
// ANALYTICS QUERY SERVICE
// ============================================================================
exports.analyticsQueryService = {
    /**
     * Get analytics for an athlete
     */
    async getAthleteAnalytics(athleteId, period = 'MONTH') {
        try {
            if (USE_MOCK) {
                analyticsCache = await loadAnalytics();
                goalsCache = await loadGoals();
                const analytics = analyticsCache.find((a) => a.athleteId === athleteId);
                if (analytics) {
                    // Attach goals
                    analytics.activeGoals = goalsCache.filter((g) => g.athleteId === athleteId && g.status === 'ACTIVE');
                    analytics.completedGoals = goalsCache.filter((g) => g.athleteId === athleteId && g.status === 'COMPLETED');
                    analytics.period = period;
                    return (0, result_1.ok)(analytics);
                }
                // Return mock analytics for any athlete
                return (0, result_1.ok)({
                    athleteId,
                    athleteName: 'Athlete',
                    period,
                    totalSessions: 0,
                    sessionsThisPeriod: 0,
                    averageSessionRating: 0,
                    attendanceRate: 0,
                    skills: [],
                    activeGoals: goalsCache.filter((g) => g.athleteId === athleteId && g.status === 'ACTIVE'),
                    completedGoals: goalsCache.filter((g) => g.athleteId === athleteId && g.status === 'COMPLETED'),
                    improvementRate: 0,
                    consistencyScore: 0,
                    percentileRank: 50,
                });
            }
            const response = await fetch(`/api/athletes/${athleteId}/analytics?period=${period}`);
            if (!response.ok) {
                return (0, result_1.ok)(null);
            }
            return (0, result_1.ok)(await response.json());
        }
        catch (error) {
            logger.error('Failed to get athlete analytics', { athleteId, period, error });
            return (0, result_1.err)((0, result_1.networkError)('Failed to load athlete analytics'));
        }
    },
    /**
     * Get skill progression history for an athlete
     */
    async getSkillHistory(athleteId, skillName) {
        try {
            if (USE_MOCK) {
                analyticsCache = await loadAnalytics();
                const analytics = analyticsCache.find((a) => a.athleteId === athleteId);
                if (!analytics)
                    return (0, result_1.ok)([]);
                if (skillName) {
                    const skill = analytics.skills.find((s) => s.skillName === skillName);
                    return (0, result_1.ok)(skill ? [skill] : []);
                }
                return (0, result_1.ok)(analytics.skills);
            }
            let url = `/api/athletes/${athleteId}/skills/history`;
            if (skillName)
                url += `?skill=${encodeURIComponent(skillName)}`;
            const response = await fetch(url);
            if (!response.ok) {
                return (0, result_1.err)((0, result_1.networkError)('Failed to load skill history'));
            }
            return (0, result_1.ok)(await response.json());
        }
        catch (error) {
            logger.error('Failed to get skill history', { athleteId, skillName, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to load skill history'));
        }
    },
    /**
     * Get all goals for an athlete
     */
    async getAthleteGoals(athleteId, status) {
        try {
            if (USE_MOCK) {
                goalsCache = await loadGoals();
                let filtered = goalsCache.filter((g) => g.athleteId === athleteId);
                if (status) {
                    filtered = filtered.filter((g) => g.status === status);
                }
                return (0, result_1.ok)(filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
            }
            let url = `/api/athletes/${athleteId}/goals`;
            if (status)
                url += `?status=${status}`;
            const response = await fetch(url);
            if (!response.ok) {
                return (0, result_1.err)((0, result_1.networkError)('Failed to load athlete goals'));
            }
            return (0, result_1.ok)(await response.json());
        }
        catch (error) {
            logger.error('Failed to get athlete goals', { athleteId, status, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to load athlete goals'));
        }
    },
    /**
     * Get comparison stats (for radar chart)
     */
    async getSkillComparison(athleteId) {
        try {
            const analyticsResult = await this.getAthleteAnalytics(athleteId);
            if (!analyticsResult.success) {
                return analyticsResult;
            }
            if (!analyticsResult.data) {
                return (0, result_1.ok)({ skills: [] });
            }
            // Mock average levels for comparison
            const averageLevels = {
                Dribbling: 60,
                Passing: 62,
                Finishing: 55,
                Defending: 50,
                Goalkeeping: 45,
                Conditioning: 65,
            };
            return (0, result_1.ok)({
                skills: analyticsResult.data.skills.map((s) => ({
                    name: s.skillName,
                    athleteLevel: s.currentLevel,
                    averageLevel: averageLevels[s.skillName] || 50,
                })),
            });
        }
        catch (error) {
            logger.error('Failed to get skill comparison', { athleteId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to load skill comparison'));
        }
    },
};
