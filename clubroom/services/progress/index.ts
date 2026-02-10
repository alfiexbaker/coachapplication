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

// Re-export individual services for direct use
export { progressSkillsService } from './progress-skills-service';
export { progressFeedbackService } from './progress-feedback-service';
export { progressGoalsService } from './progress-goals-service';
export { progressReportService } from './progress-report-service';

// Re-export types
export type { SkillLevel, AthleteSkillLevels } from './progress-skills-service';
export type { SessionFeedback, SessionNoteFields, SessionNoteRecord } from './progress-feedback-service';
export type { AthleteProgress } from './progress-report-service';

// Import services for the unified facade
import { progressSkillsService } from './progress-skills-service';
import { progressFeedbackService } from './progress-feedback-service';
import { progressGoalsService } from './progress-goals-service';
import { progressReportService } from './progress-report-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ProgressFacade');
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
export const progressService = {
  // ==========================================================================
  // SKILL LEVELS (from progressSkillsService)
  // ==========================================================================

  getAthleteSkillLevels: progressSkillsService.getAthleteSkillLevels,
  updateSkillLevel: progressSkillsService.updateSkillLevel,
  updateMultipleSkillLevels: progressSkillsService.updateMultipleSkillLevels,

  // ==========================================================================
  // SESSION FEEDBACK (from progressFeedbackService)
  // ==========================================================================

  addSessionFeedback: progressFeedbackService.addSessionFeedback,
  getSessionFeedback: progressFeedbackService.getSessionFeedback,
  getFeedbackForAthlete: progressFeedbackService.getFeedbackForAthlete,

  // ==========================================================================
  // SESSION NOTES (from progressFeedbackService)
  // ==========================================================================

  getSessionNote: progressFeedbackService.getSessionNote,
  saveSessionNote: progressFeedbackService.saveSessionNote,

  // ==========================================================================
  // GOALS - CRUD OPERATIONS (from progressGoalsService)
  // ==========================================================================

  createGoal: progressGoalsService.createGoal,
  getUserGoals: progressGoalsService.getUserGoals,
  getGoalById: progressGoalsService.getGoalById,
  updateGoal: progressGoalsService.updateGoal,
  deleteGoal: progressGoalsService.deleteGoal,
  getGoalsForAthlete: progressGoalsService.getGoalsForAthlete,
  updateGoalProgress: progressGoalsService.updateGoalProgress,

  // ==========================================================================
  // MILESTONES (from progressGoalsService)
  // ==========================================================================

  addMilestone: progressGoalsService.addMilestone,
  completeMilestone: progressGoalsService.completeMilestone,
  uncompleteMilestone: progressGoalsService.uncompleteMilestone,
  deleteMilestone: progressGoalsService.deleteMilestone,

  // ==========================================================================
  // GOAL PROGRESS (from progressGoalsService)
  // ==========================================================================

  getGoalProgress: progressGoalsService.getGoalProgress,
  calculateGoalProgress: progressGoalsService.calculateGoalProgress,

  // ==========================================================================
  // GOAL ANALYTICS (from progressGoalsService)
  // ==========================================================================

  getAthleteGoals: progressGoalsService.getAthleteGoals,
  getGoalStats: progressGoalsService.getGoalStats,

  // ==========================================================================
  // GOAL HELPERS (from progressGoalsService)
  // ==========================================================================

  getCategoryInfo: progressGoalsService.getCategoryInfo,
  getStatusInfo: progressGoalsService.getStatusInfo,
  formatTargetDate: progressGoalsService.formatTargetDate,
  isOverdue: progressGoalsService.isOverdue,

  // ==========================================================================
  // DEVELOPMENT (from progressGoalsService)
  // ==========================================================================

  resetToMockData: progressGoalsService.resetToMockData,

  // ==========================================================================
  // COMPREHENSIVE PROGRESS (from progressReportService)
  // ==========================================================================

  getAthleteProgress: progressReportService.getAthleteProgress,
};
