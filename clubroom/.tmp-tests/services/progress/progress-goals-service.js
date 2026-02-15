"use strict";
/**
 * Progress Goals Service
 *
 * Handles goals and milestones: CRUD operations, progress tracking,
 * milestone management, goal analytics, and helper functions.
 *
 * API Integration Notes:
 * - Goals are persisted via apiClient (AsyncStorage in dev, API in prod)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.progressGoalsService = void 0;
const api_client_1 = require("../api-client");
const logger_1 = require("@/utils/logger");
const storage_keys_1 = require("@/constants/storage-keys");
const logger = (0, logger_1.createLogger)('ProgressGoalsService');
// ============================================================================
// MOCK DATA
// ============================================================================
const MOCK_GOALS = [
    {
        id: 'goal_1',
        userId: 'user1',
        athleteId: 'user1',
        title: 'Improve Sprint Speed',
        description: 'Reduce my 100m sprint time by 0.5 seconds before the end of the season.',
        category: 'SPEED',
        targetDate: '2026-06-30',
        status: 'ACTIVE',
        progress: 40,
        milestones: [
            {
                id: 'ms_1',
                goalId: 'goal_1',
                title: 'Complete baseline speed test',
                isCompleted: true,
                completedAt: '2026-01-05T10:00:00Z',
                order: 0,
            },
            {
                id: 'ms_2',
                goalId: 'goal_1',
                title: 'Improve starting technique',
                isCompleted: true,
                completedAt: '2026-01-10T15:00:00Z',
                order: 1,
            },
            {
                id: 'ms_3',
                goalId: 'goal_1',
                title: 'Achieve 0.2s improvement',
                isCompleted: false,
                order: 2,
            },
            {
                id: 'ms_4',
                goalId: 'goal_1',
                title: 'Maintain improvement for 3 sessions',
                isCompleted: false,
                order: 3,
            },
            {
                id: 'ms_5',
                goalId: 'goal_1',
                title: 'Achieve full 0.5s improvement',
                isCompleted: false,
                order: 4,
            },
        ],
        createdBy: 'ATHLETE',
        createdById: 'user1',
        createdAt: '2026-01-01T09:00:00Z',
        updatedAt: '2026-01-10T15:00:00Z',
    },
    {
        id: 'goal_2',
        userId: 'user1',
        athleteId: 'user1',
        title: 'Master Ball Control',
        description: 'Improve dribbling skills and first touch to elite level.',
        category: 'TECHNIQUE',
        targetDate: '2026-05-15',
        status: 'ACTIVE',
        progress: 66,
        milestones: [
            {
                id: 'ms_6',
                goalId: 'goal_2',
                title: 'Complete 10 juggling sessions',
                isCompleted: true,
                completedAt: '2026-01-08T14:00:00Z',
                order: 0,
            },
            {
                id: 'ms_7',
                goalId: 'goal_2',
                title: 'Master inside-outside dribble',
                isCompleted: true,
                completedAt: '2026-01-09T16:00:00Z',
                order: 1,
            },
            {
                id: 'ms_8',
                goalId: 'goal_2',
                title: 'Perfect first touch control',
                isCompleted: false,
                order: 2,
            },
        ],
        createdBy: 'COACH',
        createdById: 'coach1',
        createdAt: '2026-01-02T10:00:00Z',
        updatedAt: '2026-01-09T16:00:00Z',
    },
    {
        id: 'goal_3',
        userId: 'user1',
        athleteId: 'user1',
        title: 'Build Mental Resilience',
        description: 'Develop better focus and composure during high-pressure situations.',
        category: 'MENTAL',
        status: 'ACTIVE',
        progress: 25,
        milestones: [
            {
                id: 'ms_9',
                goalId: 'goal_3',
                title: 'Learn breathing techniques',
                isCompleted: true,
                completedAt: '2026-01-07T11:00:00Z',
                order: 0,
            },
            {
                id: 'ms_10',
                goalId: 'goal_3',
                title: 'Practice visualization daily for 2 weeks',
                isCompleted: false,
                order: 1,
            },
            {
                id: 'ms_11',
                goalId: 'goal_3',
                title: 'Apply techniques in practice match',
                isCompleted: false,
                order: 2,
            },
            {
                id: 'ms_12',
                goalId: 'goal_3',
                title: 'Demonstrate composure in competitive match',
                isCompleted: false,
                order: 3,
            },
        ],
        createdBy: 'ATHLETE',
        createdById: 'user1',
        createdAt: '2026-01-03T08:00:00Z',
        updatedAt: '2026-01-07T11:00:00Z',
    },
    {
        id: 'goal_4',
        userId: 'user1',
        athleteId: 'user1',
        title: 'Increase Endurance',
        description: 'Build stamina to maintain performance throughout full matches.',
        category: 'FITNESS',
        targetDate: '2026-03-01',
        status: 'COMPLETED',
        progress: 100,
        milestones: [
            {
                id: 'ms_13',
                goalId: 'goal_4',
                title: 'Run 5km without stopping',
                isCompleted: true,
                completedAt: '2025-12-15T08:00:00Z',
                order: 0,
            },
            {
                id: 'ms_14',
                goalId: 'goal_4',
                title: 'Complete interval training program',
                isCompleted: true,
                completedAt: '2025-12-28T09:00:00Z',
                order: 1,
            },
            {
                id: 'ms_15',
                goalId: 'goal_4',
                title: 'Play full 90 minutes in training',
                isCompleted: true,
                completedAt: '2026-01-04T17:00:00Z',
                order: 2,
            },
        ],
        createdBy: 'COACH',
        createdById: 'coach1',
        createdAt: '2025-12-01T10:00:00Z',
        updatedAt: '2026-01-04T17:00:00Z',
    },
    {
        id: 'goal_5',
        userId: 'user2',
        athleteId: 'user2',
        title: 'Improve Tactical Awareness',
        description: 'Better understand positioning and movement off the ball.',
        category: 'TACTICAL',
        status: 'ACTIVE',
        progress: 50,
        milestones: [
            {
                id: 'ms_16',
                goalId: 'goal_5',
                title: 'Watch 5 match analysis videos',
                isCompleted: true,
                completedAt: '2026-01-06T19:00:00Z',
                order: 0,
            },
            {
                id: 'ms_17',
                goalId: 'goal_5',
                title: 'Practice positioning drills',
                isCompleted: false,
                order: 1,
            },
        ],
        createdBy: 'ATHLETE',
        createdById: 'user2',
        createdAt: '2026-01-04T12:00:00Z',
        updatedAt: '2026-01-06T19:00:00Z',
    },
];
// ============================================================================
// GOALS MANAGEMENT
// ============================================================================
async function getAllGoals() {
    const goals = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.GOALS, []);
    // Return mock data if no goals stored
    if (goals.length === 0) {
        return [...MOCK_GOALS];
    }
    return goals;
}
async function saveGoals(goals) {
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.GOALS, goals);
}
async function getGoalsForAthlete(athleteId) {
    const allGoals = await getAllGoals();
    const athleteGoals = allGoals.filter((g) => g.athleteId === athleteId);
    return {
        active: athleteGoals.filter((g) => g.status === 'ACTIVE'),
        completed: athleteGoals.filter((g) => g.status === 'COMPLETED'),
    };
}
async function createGoal(userId, params, createdBy = 'ATHLETE', createdById = userId) {
    const allGoals = await getAllGoals();
    const now = new Date().toISOString();
    const goalId = `goal_${Date.now()}`;
    // Handle both old and new parameter formats
    const isCreateInput = 'milestones' in params &&
        Array.isArray(params.milestones) &&
        typeof params.milestones[0] === 'string';
    let milestones;
    if (isCreateInput) {
        // New format: params.milestones is string[]
        const input = params;
        milestones = (input.milestones ?? []).map((title, index) => ({
            id: `ms_${Date.now()}_${index}`,
            goalId,
            title,
            isCompleted: false,
            order: index,
        }));
    }
    else {
        // Old format: goal object with milestone objects
        const goalParams = params;
        milestones = goalParams.milestones || [];
    }
    const newGoal = {
        id: goalId,
        userId: 'userId' in params ? params.userId : userId,
        athleteId: 'athleteId' in params ? params.athleteId : userId,
        title: params.title,
        description: params.description,
        category: params.category,
        targetDate: params.targetDate,
        status: 'status' in params ? params.status : 'ACTIVE',
        progress: 'progress' in params ? params.progress : 0,
        milestones,
        createdBy: 'createdBy' in params ? params.createdBy : createdBy,
        createdById: 'createdById' in params ? params.createdById : createdById,
        createdAt: now,
        updatedAt: now,
    };
    allGoals.unshift(newGoal);
    await saveGoals(allGoals);
    logger.info('goal_created', {
        goalId: newGoal.id,
        athleteId: newGoal.athleteId,
        category: params.category,
        milestoneCount: milestones.length,
    });
    return newGoal;
}
async function getUserGoals(userId, status) {
    const goals = await getAllGoals();
    let filtered = goals.filter((g) => g.userId === userId || g.athleteId === userId);
    if (status) {
        filtered = filtered.filter((g) => g.status === status);
    }
    // Sort by status (active first), then by updated date
    return filtered.sort((a, b) => {
        if (a.status === 'ACTIVE' && b.status !== 'ACTIVE')
            return -1;
        if (b.status === 'ACTIVE' && a.status !== 'ACTIVE')
            return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
}
async function getGoalById(id) {
    const goals = await getAllGoals();
    return goals.find((g) => g.id === id) ?? null;
}
async function updateGoal(id, updates) {
    const goals = await getAllGoals();
    const goalIndex = goals.findIndex((g) => g.id === id);
    if (goalIndex === -1) {
        logger.warn('goal_not_found', { goalId: id });
        return null;
    }
    const goal = goals[goalIndex];
    const updatedGoal = {
        ...goal,
        ...updates,
        updatedAt: new Date().toISOString(),
    };
    goals[goalIndex] = updatedGoal;
    await saveGoals(goals);
    logger.info('goal_updated', {
        goalId: id,
        updates: Object.keys(updates),
    });
    return updatedGoal;
}
async function deleteGoal(id) {
    const goals = await getAllGoals();
    const goalIndex = goals.findIndex((g) => g.id === id);
    if (goalIndex === -1) {
        logger.warn('goal_not_found_for_delete', { goalId: id });
        return false;
    }
    goals.splice(goalIndex, 1);
    await saveGoals(goals);
    logger.info('goal_deleted', { goalId: id });
    return true;
}
async function updateGoalProgress(goalId, progress, completedMilestones) {
    const allGoals = await getAllGoals();
    const goalIndex = allGoals.findIndex((g) => g.id === goalId);
    if (goalIndex === -1)
        return null;
    const goal = allGoals[goalIndex];
    goal.progress = progress;
    goal.updatedAt = new Date().toISOString();
    // Update milestones if provided
    if (completedMilestones) {
        goal.milestones = goal.milestones.map((m) => ({
            ...m,
            isCompleted: completedMilestones.includes(m.id),
            completedAt: completedMilestones.includes(m.id) ? new Date().toISOString() : m.completedAt,
        }));
    }
    // Auto-complete if progress is 100
    if (progress >= 100) {
        goal.status = 'COMPLETED';
    }
    allGoals[goalIndex] = goal;
    await saveGoals(allGoals);
    logger.info('goal_progress_updated', {
        goalId,
        progress,
        status: goal.status,
    });
    return goal;
}
// ============================================================================
// MILESTONE MANAGEMENT
// ============================================================================
async function addMilestone(goalId, title) {
    const goals = await getAllGoals();
    const goalIndex = goals.findIndex((g) => g.id === goalId);
    if (goalIndex === -1) {
        logger.warn('goal_not_found_for_milestone', { goalId });
        return null;
    }
    const goal = goals[goalIndex];
    const maxOrder = Math.max(...goal.milestones.map((m) => m.order), -1);
    const newMilestone = {
        id: `ms_${Date.now()}`,
        goalId,
        title,
        isCompleted: false,
        order: maxOrder + 1,
    };
    goal.milestones.push(newMilestone);
    goal.progress = calculateGoalProgress(goal);
    goal.updatedAt = new Date().toISOString();
    goals[goalIndex] = goal;
    await saveGoals(goals);
    logger.info('milestone_added', {
        goalId,
        milestoneId: newMilestone.id,
        title,
    });
    return goal;
}
async function completeMilestone(milestoneId) {
    const goals = await getAllGoals();
    // Find the goal containing this milestone
    const goalIndex = goals.findIndex((g) => g.milestones.some((m) => m.id === milestoneId));
    if (goalIndex === -1) {
        logger.warn('milestone_not_found', { milestoneId });
        return null;
    }
    const goal = goals[goalIndex];
    const milestoneIndex = goal.milestones.findIndex((m) => m.id === milestoneId);
    const milestone = goal.milestones[milestoneIndex];
    // Mark as completed
    milestone.isCompleted = true;
    milestone.completedAt = new Date().toISOString();
    // Recalculate progress
    goal.progress = calculateGoalProgress(goal);
    goal.updatedAt = new Date().toISOString();
    // Auto-complete goal if all milestones are done
    if (goal.progress === 100 && goal.status === 'ACTIVE') {
        goal.status = 'COMPLETED';
        logger.info('goal_auto_completed', { goalId: goal.id });
    }
    goals[goalIndex] = goal;
    await saveGoals(goals);
    logger.info('milestone_completed', {
        milestoneId,
        goalId: goal.id,
        newProgress: goal.progress,
    });
    return goal;
}
async function uncompleteMilestone(milestoneId) {
    const goals = await getAllGoals();
    const goalIndex = goals.findIndex((g) => g.milestones.some((m) => m.id === milestoneId));
    if (goalIndex === -1) {
        logger.warn('milestone_not_found', { milestoneId });
        return null;
    }
    const goal = goals[goalIndex];
    const milestoneIndex = goal.milestones.findIndex((m) => m.id === milestoneId);
    const milestone = goal.milestones[milestoneIndex];
    // Mark as incomplete
    milestone.isCompleted = false;
    milestone.completedAt = undefined;
    // Recalculate progress
    goal.progress = calculateGoalProgress(goal);
    goal.updatedAt = new Date().toISOString();
    // Reactivate goal if it was completed
    if (goal.status === 'COMPLETED') {
        goal.status = 'ACTIVE';
        logger.info('goal_reactivated', { goalId: goal.id });
    }
    goals[goalIndex] = goal;
    await saveGoals(goals);
    logger.info('milestone_uncompleted', {
        milestoneId,
        goalId: goal.id,
        newProgress: goal.progress,
    });
    return goal;
}
async function deleteMilestone(milestoneId) {
    const goals = await getAllGoals();
    const goalIndex = goals.findIndex((g) => g.milestones.some((m) => m.id === milestoneId));
    if (goalIndex === -1) {
        logger.warn('milestone_not_found_for_delete', { milestoneId });
        return null;
    }
    const goal = goals[goalIndex];
    goal.milestones = goal.milestones.filter((m) => m.id !== milestoneId);
    // Reorder remaining milestones
    goal.milestones.forEach((m, idx) => {
        m.order = idx;
    });
    // Recalculate progress
    goal.progress = calculateGoalProgress(goal);
    goal.updatedAt = new Date().toISOString();
    goals[goalIndex] = goal;
    await saveGoals(goals);
    logger.info('milestone_deleted', {
        milestoneId,
        goalId: goal.id,
    });
    return goal;
}
// ============================================================================
// GOAL PROGRESS HELPERS
// ============================================================================
function calculateGoalProgress(goal) {
    if (goal.milestones.length === 0) {
        return 0;
    }
    const completed = goal.milestones.filter((m) => m.isCompleted).length;
    return Math.round((completed / goal.milestones.length) * 100);
}
async function getGoalProgress(goalId) {
    const goal = await getGoalById(goalId);
    if (!goal) {
        return 0;
    }
    return calculateGoalProgress(goal);
}
async function getAthleteGoals(athleteId) {
    const goals = await getUserGoals(athleteId);
    return {
        active: goals.filter((g) => g.status === 'ACTIVE'),
        completed: goals.filter((g) => g.status === 'COMPLETED'),
        paused: goals.filter((g) => g.status === 'PAUSED'),
    };
}
async function getGoalStats(userId) {
    const goals = await getUserGoals(userId);
    const activeGoals = goals.filter((g) => g.status === 'ACTIVE');
    const completedGoals = goals.filter((g) => g.status === 'COMPLETED');
    const averageProgress = activeGoals.length > 0
        ? Math.round(activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length)
        : 0;
    const categories = [
        'SPEED',
        'TECHNIQUE',
        'FITNESS',
        'TACTICAL',
        'MENTAL',
        'OTHER',
    ];
    const goalsByCategory = categories.reduce((acc, cat) => {
        acc[cat] = goals.filter((g) => g.category === cat).length;
        return acc;
    }, {});
    return {
        totalGoals: goals.length,
        activeGoals: activeGoals.length,
        completedGoals: completedGoals.length,
        averageProgress,
        goalsByCategory,
    };
}
// ============================================================================
// GOAL HELPER FUNCTIONS
// ============================================================================
function getCategoryInfo(category) {
    const categoryInfo = {
        SPEED: { label: 'Speed', icon: 'flash', color: '#F59E0B' },
        TECHNIQUE: { label: 'Technique', icon: 'football', color: '#3B82F6' },
        FITNESS: { label: 'Fitness', icon: 'fitness', color: '#10B981' },
        TACTICAL: { label: 'Tactical', icon: 'bulb', color: '#8B5CF6' },
        MENTAL: { label: 'Mental', icon: 'sparkles', color: '#EC4899' },
        OTHER: { label: 'Other', icon: 'star', color: '#6B7280' },
    };
    return categoryInfo[category] ?? categoryInfo.OTHER;
}
function getStatusInfo(status) {
    const statusInfo = {
        ACTIVE: { label: 'Active', color: '#10B981' },
        COMPLETED: { label: 'Completed', color: '#3B82F6' },
        PAUSED: { label: 'Paused', color: '#F59E0B' },
        ABANDONED: { label: 'Abandoned', color: '#6B7280' },
    };
    return statusInfo[status] ?? statusInfo.ACTIVE;
}
function formatTargetDate(date) {
    if (!date)
        return 'No deadline';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}
function isOverdue(goal) {
    if (!goal.targetDate || goal.status === 'COMPLETED')
        return false;
    const target = new Date(goal.targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return target < today;
}
async function resetToMockData() {
    await saveGoals([...MOCK_GOALS]);
    logger.info('goals_reset_to_mock');
}
// ============================================================================
// EXPORTS
// ============================================================================
exports.progressGoalsService = {
    // Goals - CRUD operations
    createGoal,
    getUserGoals,
    getGoalById,
    updateGoal,
    deleteGoal,
    getGoalsForAthlete,
    updateGoalProgress,
    // Milestones
    addMilestone,
    completeMilestone,
    uncompleteMilestone,
    deleteMilestone,
    // Goal progress
    getGoalProgress,
    calculateGoalProgress,
    // Goal analytics
    getAthleteGoals,
    getGoalStats,
    // Goal helpers
    getCategoryInfo,
    getStatusInfo,
    formatTargetDate,
    isOverdue,
    // Development
    resetToMockData,
};
