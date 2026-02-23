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

// Import services for the unified facade
import { progressSkillsService } from './progress-skills-service';
import { progressFeedbackService } from './progress-feedback-service';
import { progressGoalsService } from './progress-goals-service';
import { progressReportService } from './progress-report-service';
import { progressChallengeService } from './progress-challenge-service';
import { monthlySummaryService } from './monthly-summary-service';
import { progressAttendanceService } from './progress-attendance-service';
import { progressSelfAssessmentService } from './progress-self-assessment-service';
import { progressPracticeLogService } from './progress-practice-log-service';
import { progressWeeklyRecapNotificationService } from './progress-weekly-recap-notification-service';
import { progressSquadActivityService } from './progress-squad-activity-service';
import { progressTermlyReportService } from './progress-termly-report-service';
import { progressPositionService } from './progress-position-service';
import { createLogger } from '@/utils/logger';

// Re-export individual services for direct use
export { progressSkillsService } from './progress-skills-service';
export { progressFeedbackService } from './progress-feedback-service';
export { progressGoalsService } from './progress-goals-service';
export { progressReportService } from './progress-report-service';
export { progressChallengeService } from './progress-challenge-service';
export { monthlySummaryService } from './monthly-summary-service';
export { progressAttendanceService } from './progress-attendance-service';
export { progressSelfAssessmentService } from './progress-self-assessment-service';
export { progressPracticeLogService } from './progress-practice-log-service';
export { progressWeeklyRecapNotificationService } from './progress-weekly-recap-notification-service';
export { progressSquadActivityService } from './progress-squad-activity-service';
export { progressTermlyReportService } from './progress-termly-report-service';
export { progressPositionService } from './progress-position-service';

// Re-export types
export type { SkillLevel, AthleteSkillLevels, PositionRateUpdateResult } from './progress-skills-service';
export type {
  SessionFeedback,
  SessionNoteFields,
  SessionNoteRecord,
} from './progress-feedback-service';
export type { AthleteProgress } from './progress-report-service';
export type { ProgressChallenge } from '@/types/progress-types';
export type { MonthlySummaryCopy } from './monthly-summary-service';
export type { PositionHistoryEntry } from './progress-position-service';
export type {
  SelfAssessmentPrompt,
  SelfAssessmentEntry,
  SubmitSelfAssessmentInput,
} from './progress-self-assessment-service';
export type { PracticeLogEntry, LogPracticeInput } from './progress-practice-log-service';
export type {
  SquadActivityFeed,
  SquadActivityItem,
  SquadActivitySummary,
  SquadActivityType,
} from './progress-squad-activity-service';
export type {
  TermlyProgressReport,
  TermlyReportSnapshot,
} from './progress-termly-report-service';

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
  updateFromPositionRate: progressSkillsService.updateFromPositionRate,

  // ==========================================================================
  // SESSION FEEDBACK (from progressFeedbackService)
  // ==========================================================================

  addSessionFeedback: progressFeedbackService.addSessionFeedback,
  getSessionFeedback: progressFeedbackService.getSessionFeedback,
  getFeedbackForAthlete: progressFeedbackService.getFeedbackForAthlete,
  getLatestForAthlete: progressFeedbackService.getLatestForAthlete,
  getPreviousCorners: progressFeedbackService.getPreviousCorners,
  createFeedbackFromQuickRate: progressFeedbackService.createFeedbackFromQuickRate,

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

  // ==========================================================================
  // ATTENDANCE INGESTION (from progressAttendanceService)
  // ==========================================================================

  upsertCompletedBookingSessions: progressAttendanceService.upsertCompletedBookingSessions,

  // ==========================================================================
  // SELF-ASSESSMENT (from progressSelfAssessmentService)
  // ==========================================================================

  scheduleSelfAssessmentPromptsForCompletedBooking:
    progressSelfAssessmentService.schedulePromptsForCompletedBooking,
  dispatchDueSelfAssessmentPrompts: progressSelfAssessmentService.dispatchDuePrompts,
  getPendingSelfAssessmentPromptForAthlete:
    progressSelfAssessmentService.getPendingPromptForAthlete,
  listSelfAssessmentsForAthlete: progressSelfAssessmentService.listAssessmentsForAthlete,
  submitSelfAssessment: progressSelfAssessmentService.submitAssessment,

  // ==========================================================================
  // PRACTICE LOGS (from progressPracticeLogService)
  // ==========================================================================

  listPracticeLogsForAthlete: progressPracticeLogService.listAthleteLogs,
  getTodayPracticeLogForAthlete: progressPracticeLogService.getTodayLog,
  logPracticeForAthlete: progressPracticeLogService.logPractice,

  // ==========================================================================
  // WEEKLY RECAP NOTIFICATIONS (from progressWeeklyRecapNotificationService)
  // ==========================================================================

  dispatchWeeklyRecapForParent: progressWeeklyRecapNotificationService.dispatchIfDue,

  // ==========================================================================
  // SQUAD ACTIVITY FEED (from progressSquadActivityService)
  // ==========================================================================

  getSquadActivityFeedForAthlete: progressSquadActivityService.getFeedForAthlete,

  // ==========================================================================
  // TERMLY REPORT EXPORTS (from progressTermlyReportService)
  // ==========================================================================

  generateTermlyReportForAthlete: progressTermlyReportService.generateTermlyReport,
  saveTermlyReportSnapshot: progressTermlyReportService.saveReportSnapshot,
  listTermlyReportSnapshots: progressTermlyReportService.listReportSnapshots,
  buildTermlyReportShareMessage: progressTermlyReportService.buildShareMessage,
  buildTermlyReportCsv: progressTermlyReportService.buildCsv,

  // ==========================================================================
  // POSITION HISTORY (from progressPositionService)
  // ==========================================================================

  recordPosition: progressPositionService.recordPosition,
  getPositionHistory: progressPositionService.getPositionHistory,
  getMostPlayedPosition: progressPositionService.getMostPlayedPosition,

  // ==========================================================================
  // PROGRESS CHALLENGES (from progressChallengeService)
  // ==========================================================================

  getActiveChallenge: progressChallengeService.getActiveChallenge,
  updateChallengeProgress: progressChallengeService.updateProgress,
  completeProgressChallenge: progressChallengeService.completeChallenge,
  checkExpiredChallenges: progressChallengeService.checkExpired,
  getChallengeHistory: progressChallengeService.getChallengeHistory,
  buildMonthlySummary: monthlySummaryService.buildMonthlySummary,
};
