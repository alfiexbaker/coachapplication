"use strict";
/**
 * Progress Service Module
 *
 * Manages athlete progress tracking: skill levels, session feedback,
 * session notes, goals, milestones, and comprehensive progress reports.
 *
 * This module is split into focused services:
 * - progressSkillsService: Skill level management and trend tracking
 * - progressFeedbackService: Session feedback and session notes
 * - progressGoalsService: Goals CRUD, milestones, analytics, helpers
 * - progressReportService: Comprehensive athlete progress aggregation
 *
 * This index file provides a unified facade (progressService) for backward
 * compatibility, re-exporting all functionality from the split services.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.progressService = exports.progressReportService = exports.progressGoalsService = exports.progressFeedbackService = exports.progressSkillsService = void 0;
// Re-export individual services for direct use
var progress_skills_service_1 = require("./progress-skills-service");
Object.defineProperty(exports, "progressSkillsService", { enumerable: true, get: function () { return progress_skills_service_1.progressSkillsService; } });
var progress_feedback_service_1 = require("./progress-feedback-service");
Object.defineProperty(exports, "progressFeedbackService", { enumerable: true, get: function () { return progress_feedback_service_1.progressFeedbackService; } });
var progress_goals_service_1 = require("./progress-goals-service");
Object.defineProperty(exports, "progressGoalsService", { enumerable: true, get: function () { return progress_goals_service_1.progressGoalsService; } });
var progress_report_service_1 = require("./progress-report-service");
Object.defineProperty(exports, "progressReportService", { enumerable: true, get: function () { return progress_report_service_1.progressReportService; } });
// Import services for the unified facade
const progress_skills_service_2 = require("./progress-skills-service");
const progress_feedback_service_2 = require("./progress-feedback-service");
const progress_goals_service_2 = require("./progress-goals-service");
const progress_report_service_2 = require("./progress-report-service");
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('ProgressFacade');
void logger;
// ============================================================================
// UNIFIED FACADE FOR BACKWARD COMPATIBILITY
// ============================================================================
/**
 * Unified progress service facade that maintains the original progressService API.
 * Delegates to the appropriate focused service under the hood.
 *
 * This object replicates the exact same interface as the original progressService
 * object, so all existing callers continue to work without modification.
 */
exports.progressService = {
    // ==========================================================================
    // SKILL LEVELS (from progressSkillsService)
    // ==========================================================================
    getAthleteSkillLevels: progress_skills_service_2.progressSkillsService.getAthleteSkillLevels,
    updateSkillLevel: progress_skills_service_2.progressSkillsService.updateSkillLevel,
    updateMultipleSkillLevels: progress_skills_service_2.progressSkillsService.updateMultipleSkillLevels,
    // ==========================================================================
    // SESSION FEEDBACK (from progressFeedbackService)
    // ==========================================================================
    addSessionFeedback: progress_feedback_service_2.progressFeedbackService.addSessionFeedback,
    getSessionFeedback: progress_feedback_service_2.progressFeedbackService.getSessionFeedback,
    getFeedbackForAthlete: progress_feedback_service_2.progressFeedbackService.getFeedbackForAthlete,
    // ==========================================================================
    // SESSION NOTES (from progressFeedbackService)
    // ==========================================================================
    getSessionNote: progress_feedback_service_2.progressFeedbackService.getSessionNote,
    saveSessionNote: progress_feedback_service_2.progressFeedbackService.saveSessionNote,
    // ==========================================================================
    // GOALS - CRUD OPERATIONS (from progressGoalsService)
    // ==========================================================================
    createGoal: progress_goals_service_2.progressGoalsService.createGoal,
    getUserGoals: progress_goals_service_2.progressGoalsService.getUserGoals,
    getGoalById: progress_goals_service_2.progressGoalsService.getGoalById,
    updateGoal: progress_goals_service_2.progressGoalsService.updateGoal,
    deleteGoal: progress_goals_service_2.progressGoalsService.deleteGoal,
    getGoalsForAthlete: progress_goals_service_2.progressGoalsService.getGoalsForAthlete,
    updateGoalProgress: progress_goals_service_2.progressGoalsService.updateGoalProgress,
    // ==========================================================================
    // MILESTONES (from progressGoalsService)
    // ==========================================================================
    addMilestone: progress_goals_service_2.progressGoalsService.addMilestone,
    completeMilestone: progress_goals_service_2.progressGoalsService.completeMilestone,
    uncompleteMilestone: progress_goals_service_2.progressGoalsService.uncompleteMilestone,
    deleteMilestone: progress_goals_service_2.progressGoalsService.deleteMilestone,
    // ==========================================================================
    // GOAL PROGRESS (from progressGoalsService)
    // ==========================================================================
    getGoalProgress: progress_goals_service_2.progressGoalsService.getGoalProgress,
    calculateGoalProgress: progress_goals_service_2.progressGoalsService.calculateGoalProgress,
    // ==========================================================================
    // GOAL ANALYTICS (from progressGoalsService)
    // ==========================================================================
    getAthleteGoals: progress_goals_service_2.progressGoalsService.getAthleteGoals,
    getGoalStats: progress_goals_service_2.progressGoalsService.getGoalStats,
    // ==========================================================================
    // GOAL HELPERS (from progressGoalsService)
    // ==========================================================================
    getCategoryInfo: progress_goals_service_2.progressGoalsService.getCategoryInfo,
    getStatusInfo: progress_goals_service_2.progressGoalsService.getStatusInfo,
    formatTargetDate: progress_goals_service_2.progressGoalsService.formatTargetDate,
    isOverdue: progress_goals_service_2.progressGoalsService.isOverdue,
    // ==========================================================================
    // DEVELOPMENT (from progressGoalsService)
    // ==========================================================================
    resetToMockData: progress_goals_service_2.progressGoalsService.resetToMockData,
    // ==========================================================================
    // COMPREHENSIVE PROGRESS (from progressReportService)
    // ==========================================================================
    getAthleteProgress: progress_report_service_2.progressReportService.getAthleteProgress,
};
