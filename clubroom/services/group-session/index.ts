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

  getCoachSessions: sessionCrudService.getCoachSessions.bind(sessionCrudService),
  discoverSessions: sessionCrudService.discoverSessions.bind(sessionCrudService),
  getSession: sessionCrudService.getSession.bind(sessionCrudService),
  createSession: sessionCrudService.createSession.bind(sessionCrudService),
  publishSession: sessionCrudService.publishSession.bind(sessionCrudService),
  cancelSession: sessionCrudService.cancelSession.bind(sessionCrudService),

  // ==========================================================================
  // REGISTRATION METHODS (from sessionRegistrationService)
  // ==========================================================================

  register: sessionRegistrationService.register.bind(sessionRegistrationService),
  cancelRegistration: sessionRegistrationService.cancelRegistration.bind(sessionRegistrationService),
  getSessionRoster: sessionRegistrationService.getSessionRoster.bind(sessionRegistrationService),
  markAttendance: sessionRegistrationService.markAttendance.bind(sessionRegistrationService),
  getParentRegistrations: sessionRegistrationService.getParentRegistrations.bind(sessionRegistrationService),

  // ==========================================================================
  // SCHEDULING METHODS (from sessionSchedulingService)
  // ==========================================================================

  getClubTrainingSessions: sessionSchedulingService.getClubTrainingSessions.bind(sessionSchedulingService),
  getSquadTrainingSessions: sessionSchedulingService.getSquadTrainingSessions.bind(sessionSchedulingService),
  getChildTrainingSessions: sessionSchedulingService.getChildTrainingSessions.bind(sessionSchedulingService),
  formatDayOfWeek: sessionSchedulingService.formatDayOfWeek.bind(sessionSchedulingService),
  formatRecurringPattern: sessionSchedulingService.formatRecurringPattern.bind(sessionSchedulingService),
  getNextTrainingDate: sessionSchedulingService.getNextTrainingDate.bind(sessionSchedulingService),

  // ==========================================================================
  // DISPLAY METHODS (from sessionDisplayService)
  // ==========================================================================

  formatPrice: sessionDisplayService.formatPrice.bind(sessionDisplayService),
  formatSessionType: sessionDisplayService.formatSessionType.bind(sessionDisplayService),
};
