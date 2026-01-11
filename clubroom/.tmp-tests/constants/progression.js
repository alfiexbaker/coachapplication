"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryInfo = exports.TierNames = exports.TierPointValues = exports.ProgressionThresholds = void 0;
exports.getLevelFromPoints = getLevelFromPoints;
exports.getProgressToNextLevel = getProgressToNextLevel;
exports.getCategoryMilestoneStatus = getCategoryMilestoneStatus;
exports.ProgressionThresholds = {
    levels: [
        { level: 1, name: 'Beginner', pointsRequired: 0 },
        { level: 2, name: 'Developing', pointsRequired: 50 },
        { level: 3, name: 'Intermediate', pointsRequired: 150 },
        { level: 4, name: 'Advanced', pointsRequired: 300 },
        { level: 5, name: 'Elite', pointsRequired: 500 },
    ],
    categoryMilestones: {
        // Unlock when X badges earned in category
        bronze: 3,
        silver: 7,
        gold: 15,
    },
};
// Point values for each tier
exports.TierPointValues = {
    1: 10, // Bronze
    2: 25, // Silver
    3: 50, // Gold
};
// Tier display names
exports.TierNames = {
    1: 'Bronze',
    2: 'Silver',
    3: 'Gold',
};
// Category display names and icons
exports.CategoryInfo = {
    leadership: { label: 'Leadership', icon: 'people' },
    consistency: { label: 'Consistency', icon: 'refresh' },
    technique: { label: 'Technique', icon: 'football' },
    mindset: { label: 'Mindset', icon: 'bulb' },
    teamwork: { label: 'Teamwork', icon: 'hand-left' },
    resilience: { label: 'Resilience', icon: 'fitness' },
};
// Helper function to get current level from points
function getLevelFromPoints(points) {
    const levels = exports.ProgressionThresholds.levels;
    for (let i = levels.length - 1; i >= 0; i--) {
        if (points >= levels[i].pointsRequired) {
            return levels[i];
        }
    }
    return levels[0];
}
// Helper function to get next level and progress
function getProgressToNextLevel(points) {
    const currentLevel = getLevelFromPoints(points);
    const levels = exports.ProgressionThresholds.levels;
    const currentIndex = levels.findIndex(l => l.level === currentLevel.level);
    const nextLevel = currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
    if (!nextLevel) {
        return {
            currentLevel,
            nextLevel: null,
            progressPercent: 100,
            pointsToNext: 0,
        };
    }
    const pointsInCurrentLevel = points - currentLevel.pointsRequired;
    const pointsNeededForNextLevel = nextLevel.pointsRequired - currentLevel.pointsRequired;
    const progressPercent = Math.round((pointsInCurrentLevel / pointsNeededForNextLevel) * 100);
    const pointsToNext = nextLevel.pointsRequired - points;
    return {
        currentLevel,
        nextLevel,
        progressPercent: Math.min(100, Math.max(0, progressPercent)),
        pointsToNext,
    };
}
// Helper function to get category milestone status
function getCategoryMilestoneStatus(badgeCount) {
    const milestones = exports.ProgressionThresholds.categoryMilestones;
    if (badgeCount >= milestones.gold) {
        return {
            currentMilestone: 'Gold',
            nextMilestone: null,
            badgesToNext: 0,
            progressPercent: 100,
        };
    }
    if (badgeCount >= milestones.silver) {
        return {
            currentMilestone: 'Silver',
            nextMilestone: 'Gold',
            badgesToNext: milestones.gold - badgeCount,
            progressPercent: Math.round(((badgeCount - milestones.silver) / (milestones.gold - milestones.silver)) * 100),
        };
    }
    if (badgeCount >= milestones.bronze) {
        return {
            currentMilestone: 'Bronze',
            nextMilestone: 'Silver',
            badgesToNext: milestones.silver - badgeCount,
            progressPercent: Math.round(((badgeCount - milestones.bronze) / (milestones.silver - milestones.bronze)) * 100),
        };
    }
    return {
        currentMilestone: 'None',
        nextMilestone: 'Bronze',
        badgesToNext: milestones.bronze - badgeCount,
        progressPercent: Math.round((badgeCount / milestones.bronze) * 100),
    };
}
