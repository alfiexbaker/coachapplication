/**
 * Group Session Service Module
 *
 * Manages group sessions like camps, clinics, and team training.
 * Supports waitlists, capacity management, and attendance tracking.
 *
 * This module is split into focused services:
 * - sessionCrudService: Basic CRUD operations, publish/cancel, discovery
 * - sessionRegistrationService: Registration, cancellation, roster, attendance
 * - sessionSchedulingService: Club/squad/child training queries, recurring patterns
 * - sessionDisplayService: Formatting and display utilities
 *
 * This index file provides a unified facade (groupSessionService) for backward
 * compatibility, re-exporting all functionality from the split services.
 */

// Re-export individual services for direct use
export { sessionCrudService } from './session-crud-service';
export { sessionRegistrationService } from './session-registration-service';
export { sessionSchedulingService } from './session-scheduling-service';
export { sessionDisplayService } from './session-display-service';

// Re-export types
export type { CreateGroupSessionInput } from './session-crud-service';

// Import services for the unified facade
import { sessionCrudService } from './session-crud-service';
import { sessionRegistrationService } from './session-registration-service';
import { sessionSchedulingService } from './session-scheduling-service';
import { sessionDisplayService } from './session-display-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('GroupSessionFacade');
void logger;

// ============================================================================
// UNIFIED FACADE FOR BACKWARD COMPATIBILITY
// ============================================================================

/**
 * Unified group session service facade that maintains the original groupSessionService API.
 * Delegates to the appropriate focused service under the hood.
 *
 * This object replicates the exact same interface as the original groupSessionService
 * object, so all existing callers continue to work without modification.
 */
export const groupSessionService = {
  // ==========================================================================
  // CRUD METHODS (from sessionCrudService)
  // ==========================================================================

  getCoachSessions: (...args: Parameters<typeof sessionCrudService.getCoachSessions>) =>
    sessionCrudService.getCoachSessions(...args),
  discoverSessions: (...args: Parameters<typeof sessionCrudService.discoverSessions>) =>
    sessionCrudService.discoverSessions(...args),
  getSession: (...args: Parameters<typeof sessionCrudService.getSession>) =>
    sessionCrudService.getSession(...args),
  createSession: (...args: Parameters<typeof sessionCrudService.createSession>) =>
    sessionCrudService.createSession(...args),
  publishSession: (...args: Parameters<typeof sessionCrudService.publishSession>) =>
    sessionCrudService.publishSession(...args),
  cancelSession: (...args: Parameters<typeof sessionCrudService.cancelSession>) =>
    sessionCrudService.cancelSession(...args),
  updateOffPlatformParticipants: (
    ...args: Parameters<typeof sessionCrudService.updateOffPlatformParticipants>
  ) => sessionCrudService.updateOffPlatformParticipants(...args),
  cancelInstance: (...args: Parameters<typeof sessionCrudService.cancelInstance>) =>
    sessionCrudService.cancelInstance(...args),
  endSeries: (...args: Parameters<typeof sessionCrudService.endSeries>) =>
    sessionCrudService.endSeries(...args),

  // ==========================================================================
  // REGISTRATION METHODS (from sessionRegistrationService)
  // ==========================================================================

  register: (...args: Parameters<typeof sessionRegistrationService.register>) =>
    sessionRegistrationService.register(...args),
  joinWaitlist: (...args: Parameters<typeof sessionRegistrationService.joinWaitlist>) =>
    sessionRegistrationService.joinWaitlist(...args),
  cancelRegistration: (
    ...args: Parameters<typeof sessionRegistrationService.cancelRegistration>
  ) => sessionRegistrationService.cancelRegistration(...args),
  getSessionRoster: (...args: Parameters<typeof sessionRegistrationService.getSessionRoster>) =>
    sessionRegistrationService.getSessionRoster(...args),
  markAttendance: (...args: Parameters<typeof sessionRegistrationService.markAttendance>) =>
    sessionRegistrationService.markAttendance(...args),
  getParentRegistrations: (
    ...args: Parameters<typeof sessionRegistrationService.getParentRegistrations>
  ) => sessionRegistrationService.getParentRegistrations(...args),

  // ==========================================================================
  // SCHEDULING METHODS (from sessionSchedulingService)
  // ==========================================================================

  getClubTrainingSessions: (
    ...args: Parameters<typeof sessionSchedulingService.getClubTrainingSessions>
  ) => sessionSchedulingService.getClubTrainingSessions(...args),
  getClubActivitySessions: (
    ...args: Parameters<typeof sessionSchedulingService.getClubActivitySessions>
  ) => sessionSchedulingService.getClubActivitySessions(...args),
  getSquadTrainingSessions: (
    ...args: Parameters<typeof sessionSchedulingService.getSquadTrainingSessions>
  ) => sessionSchedulingService.getSquadTrainingSessions(...args),
  getChildTrainingSessions: (
    ...args: Parameters<typeof sessionSchedulingService.getChildTrainingSessions>
  ) => sessionSchedulingService.getChildTrainingSessions(...args),
  formatDayOfWeek: (...args: Parameters<typeof sessionSchedulingService.formatDayOfWeek>) =>
    sessionSchedulingService.formatDayOfWeek(...args),
  formatRecurringPattern: (
    ...args: Parameters<typeof sessionSchedulingService.formatRecurringPattern>
  ) => sessionSchedulingService.formatRecurringPattern(...args),
  getNextTrainingDate: (
    ...args: Parameters<typeof sessionSchedulingService.getNextTrainingDate>
  ) => sessionSchedulingService.getNextTrainingDate(...args),

  // ==========================================================================
  // DISPLAY METHODS (from sessionDisplayService)
  // ==========================================================================

  formatPrice: (...args: Parameters<typeof sessionDisplayService.formatPrice>) =>
    sessionDisplayService.formatPrice(...args),
  formatSessionType: (...args: Parameters<typeof sessionDisplayService.formatSessionType>) =>
    sessionDisplayService.formatSessionType(...args),
};
