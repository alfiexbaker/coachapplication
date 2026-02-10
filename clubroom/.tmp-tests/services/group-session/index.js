"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupSessionService = exports.sessionDisplayService = exports.sessionSchedulingService = exports.sessionRegistrationService = exports.sessionCrudService = void 0;
// Re-export individual services for direct use
var session_crud_service_1 = require("./session-crud-service");
Object.defineProperty(exports, "sessionCrudService", { enumerable: true, get: function () { return session_crud_service_1.sessionCrudService; } });
var session_registration_service_1 = require("./session-registration-service");
Object.defineProperty(exports, "sessionRegistrationService", { enumerable: true, get: function () { return session_registration_service_1.sessionRegistrationService; } });
var session_scheduling_service_1 = require("./session-scheduling-service");
Object.defineProperty(exports, "sessionSchedulingService", { enumerable: true, get: function () { return session_scheduling_service_1.sessionSchedulingService; } });
var session_display_service_1 = require("./session-display-service");
Object.defineProperty(exports, "sessionDisplayService", { enumerable: true, get: function () { return session_display_service_1.sessionDisplayService; } });
// Import services for the unified facade
const session_crud_service_2 = require("./session-crud-service");
const session_registration_service_2 = require("./session-registration-service");
const session_scheduling_service_2 = require("./session-scheduling-service");
const session_display_service_2 = require("./session-display-service");
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
exports.groupSessionService = {
    // ==========================================================================
    // CRUD METHODS (from sessionCrudService)
    // ==========================================================================
    getCoachSessions: session_crud_service_2.sessionCrudService.getCoachSessions.bind(session_crud_service_2.sessionCrudService),
    discoverSessions: session_crud_service_2.sessionCrudService.discoverSessions.bind(session_crud_service_2.sessionCrudService),
    getSession: session_crud_service_2.sessionCrudService.getSession.bind(session_crud_service_2.sessionCrudService),
    createSession: session_crud_service_2.sessionCrudService.createSession.bind(session_crud_service_2.sessionCrudService),
    publishSession: session_crud_service_2.sessionCrudService.publishSession.bind(session_crud_service_2.sessionCrudService),
    cancelSession: session_crud_service_2.sessionCrudService.cancelSession.bind(session_crud_service_2.sessionCrudService),
    // ==========================================================================
    // REGISTRATION METHODS (from sessionRegistrationService)
    // ==========================================================================
    register: session_registration_service_2.sessionRegistrationService.register.bind(session_registration_service_2.sessionRegistrationService),
    cancelRegistration: session_registration_service_2.sessionRegistrationService.cancelRegistration.bind(session_registration_service_2.sessionRegistrationService),
    getSessionRoster: session_registration_service_2.sessionRegistrationService.getSessionRoster.bind(session_registration_service_2.sessionRegistrationService),
    markAttendance: session_registration_service_2.sessionRegistrationService.markAttendance.bind(session_registration_service_2.sessionRegistrationService),
    getParentRegistrations: session_registration_service_2.sessionRegistrationService.getParentRegistrations.bind(session_registration_service_2.sessionRegistrationService),
    // ==========================================================================
    // SCHEDULING METHODS (from sessionSchedulingService)
    // ==========================================================================
    getClubTrainingSessions: session_scheduling_service_2.sessionSchedulingService.getClubTrainingSessions.bind(session_scheduling_service_2.sessionSchedulingService),
    getSquadTrainingSessions: session_scheduling_service_2.sessionSchedulingService.getSquadTrainingSessions.bind(session_scheduling_service_2.sessionSchedulingService),
    getChildTrainingSessions: session_scheduling_service_2.sessionSchedulingService.getChildTrainingSessions.bind(session_scheduling_service_2.sessionSchedulingService),
    formatDayOfWeek: session_scheduling_service_2.sessionSchedulingService.formatDayOfWeek.bind(session_scheduling_service_2.sessionSchedulingService),
    formatRecurringPattern: session_scheduling_service_2.sessionSchedulingService.formatRecurringPattern.bind(session_scheduling_service_2.sessionSchedulingService),
    getNextTrainingDate: session_scheduling_service_2.sessionSchedulingService.getNextTrainingDate.bind(session_scheduling_service_2.sessionSchedulingService),
    // ==========================================================================
    // DISPLAY METHODS (from sessionDisplayService)
    // ==========================================================================
    formatPrice: session_display_service_2.sessionDisplayService.formatPrice.bind(session_display_service_2.sessionDisplayService),
    formatSessionType: session_display_service_2.sessionDisplayService.formatSessionType.bind(session_display_service_2.sessionDisplayService),
};
