import { createLogger } from '@/utils/logger';
const logger = createLogger('ProgressService');

/**
 * Progress Service - Re-export Facade
 *
 * This file has been refactored into focused modules under services/progress/.
 * It re-exports everything for full backward compatibility.
 *
 * See:
 * - services/progress/progress-skills-service.ts (skill level management, trend tracking)
 * - services/progress/progress-feedback-service.ts (session feedback, session notes)
 * - services/progress/progress-goals-service.ts (goals CRUD, milestones, analytics, helpers)
 * - services/progress/progress-report-service.ts (comprehensive athlete progress)
 * - services/progress/index.ts (unified facade)
 */

export {
  progressService,
  progressPositionService,
  progressSelfAssessmentService,
  progressPracticeLogService,
  progressWeeklyRecapNotificationService,
  progressSquadActivityService,
  progressTermlyReportService,
} from './progress/index';
export type {
  SkillLevel,
  AthleteSkillLevels,
  PositionRateUpdateResult,
  SessionFeedback,
  SessionNoteFields,
  SessionNoteRecord,
  PositionHistoryEntry,
  AthleteProgress,
  SelfAssessmentPrompt,
  SelfAssessmentEntry,
  SubmitSelfAssessmentInput,
  PracticeLogEntry,
  LogPracticeInput,
  SquadActivityFeed,
  SquadActivityItem,
  SquadActivitySummary,
  SquadActivityType,
  TermlyProgressReport,
  TermlyReportSnapshot,
} from './progress/index';
