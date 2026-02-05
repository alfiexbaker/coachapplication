"use strict";
/**
 * Progress Report Service
 *
 * Handles comprehensive athlete progress data aggregation.
 * Combines skill levels, feedback, goals, and badges into
 * a unified progress view.
 *
 * API Integration Notes:
 * - Aggregates data from multiple sub-services
 * - Supports role-based visibility filtering
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.progressReportService = void 0;
const badge_service_1 = require("../badge-service");
const logger_1 = require("@/utils/logger");
const progress_skills_service_1 = require("./progress-skills-service");
const progress_feedback_service_1 = require("./progress-feedback-service");
const progress_goals_service_1 = require("./progress-goals-service");
const logger = (0, logger_1.createLogger)('ProgressReportService');
// ============================================================================
// COMPREHENSIVE PROGRESS DATA
// ============================================================================
async function getAthleteProgress(athleteId, viewerRole = 'parent') {
    // Fetch all data in parallel
    const [skillLevels, feedback, goals, badgeProgress, badges,] = await Promise.all([
        progress_skills_service_1.progressSkillsService.getAthleteSkillLevels(athleteId),
        progress_feedback_service_1.progressFeedbackService.getFeedbackForAthlete(athleteId, viewerRole, 10),
        progress_goals_service_1.progressGoalsService.getGoalsForAthlete(athleteId),
        badge_service_1.badgeService.getProgressToNextLevel(athleteId),
        badge_service_1.badgeService.listAwardsForAthlete(athleteId),
    ]);
    // Convert skills to array
    const skills = skillLevels
        ? Object.values(skillLevels.skills)
        : [];
    // Calculate metrics from feedback
    const totalSessions = feedback.length;
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sessionsThisMonth = feedback.filter(f => new Date(f.createdAt) >= monthAgo).length;
    const avgPerformance = feedback.length > 0
        ? feedback.reduce((sum, f) => sum + f.overallPerformance, 0) / feedback.length
        : 0;
    const avgEffort = feedback.length > 0
        ? feedback.reduce((sum, f) => sum + f.effortRating, 0) / feedback.length
        : 0;
    // Calculate overall trend
    const improvingSkills = skills.filter(s => s.trend === 'improving').length;
    const decliningSkills = skills.filter(s => s.trend === 'declining').length;
    let overallTrend = 'steady';
    if (improvingSkills > decliningSkills + 1)
        overallTrend = 'improving';
    else if (decliningSkills > improvingSkills + 1)
        overallTrend = 'declining';
    // Calculate improvement rate
    const improvementRate = skills.length > 0
        ? Math.round((improvingSkills / skills.length) * 100)
        : 0;
    // Filter badges for visibility
    const visibleBadges = viewerRole === 'coach'
        ? badges
        : badges.filter(b => b.visibility !== 'coach_only');
    return {
        athleteId,
        athleteName: '', // Will be filled by caller
        totalSessions,
        sessionsThisMonth,
        averagePerformance: Math.round(avgPerformance * 10) / 10,
        averageEffort: Math.round(avgEffort * 10) / 10,
        attendanceRate: 100, // Would calculate from actual session data
        skills,
        overallTrend,
        improvementRate,
        activeGoals: goals.active,
        completedGoals: goals.completed,
        recentFeedback: feedback.slice(0, 5),
        totalBadges: visibleBadges.length,
        recentBadges: visibleBadges.slice(0, 5).map(b => ({
            id: b.id,
            label: b.badgeLabel,
            awardedAt: b.awardedAt,
            category: b.badgeCategory,
        })),
        currentLevel: badgeProgress.currentLevel,
        totalPoints: badgeProgress.totalPoints,
        progressToNextLevel: badgeProgress.progressPercent,
    };
}
// ============================================================================
// EXPORTS
// ============================================================================
exports.progressReportService = {
    getAthleteProgress,
};
