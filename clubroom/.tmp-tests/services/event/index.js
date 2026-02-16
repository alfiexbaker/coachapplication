"use strict";
/**
 * Event Service Module
 *
 * Manages club events including tournaments, social events, meetings, and presentations.
 * Supports RSVP management, attendance tracking, and event notifications.
 *
 * This module is split into focused services:
 * - eventCrudService: Basic CRUD operations, publish/cancel, invitations
 * - eventRsvpService: RSVP management, attendee queries, calendar integration
 * - eventAttendanceService: Check-in, attendance tracking, statistics
 * - eventDisplayService: Formatting and display utilities
 *
 * This index file provides a unified facade (eventService) for backward
 * compatibility, re-exporting all functionality from the split services.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventService = exports.eventDisplayService = exports.eventAttendanceService = exports.eventRsvpService = exports.eventCrudService = void 0;
const event_crud_service_1 = require("./event-crud-service");
Object.defineProperty(exports, "eventCrudService", { enumerable: true, get: function () { return event_crud_service_1.eventCrudService; } });
const event_rsvp_service_1 = require("./event-rsvp-service");
Object.defineProperty(exports, "eventRsvpService", { enumerable: true, get: function () { return event_rsvp_service_1.eventRsvpService; } });
const event_attendance_service_1 = require("./event-attendance-service");
Object.defineProperty(exports, "eventAttendanceService", { enumerable: true, get: function () { return event_attendance_service_1.eventAttendanceService; } });
const event_display_service_1 = require("./event-display-service");
Object.defineProperty(exports, "eventDisplayService", { enumerable: true, get: function () { return event_display_service_1.eventDisplayService; } });
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('EventFacade');
void logger;
// ============================================================================
// UNIFIED FACADE FOR BACKWARD COMPATIBILITY
// ============================================================================
/**
 * Unified event service facade that maintains the original eventService API.
 * Delegates to the appropriate focused service under the hood.
 *
 * This object replicates the exact same interface as the original eventService
 * object, so all existing callers continue to work without modification.
 */
exports.eventService = {
    // ==========================================================================
    // CRUD METHODS (from eventCrudService)
    // ==========================================================================
    createEvent: event_crud_service_1.eventCrudService.createEvent.bind(event_crud_service_1.eventCrudService),
    publishEvent: event_crud_service_1.eventCrudService.publishEvent.bind(event_crud_service_1.eventCrudService),
    cancelEvent: event_crud_service_1.eventCrudService.cancelEvent.bind(event_crud_service_1.eventCrudService),
    getEvent: event_crud_service_1.eventCrudService.getEvent.bind(event_crud_service_1.eventCrudService),
    getUpcomingEvents: event_crud_service_1.eventCrudService.getUpcomingEvents.bind(event_crud_service_1.eventCrudService),
    getAllClubEvents: event_crud_service_1.eventCrudService.getAllClubEvents.bind(event_crud_service_1.eventCrudService),
    inviteClub: event_crud_service_1.eventCrudService.inviteClub.bind(event_crud_service_1.eventCrudService),
    inviteSquads: event_crud_service_1.eventCrudService.inviteSquads.bind(event_crud_service_1.eventCrudService),
    // ==========================================================================
    // RSVP METHODS (from eventRsvpService)
    // ==========================================================================
    rsvp: event_rsvp_service_1.eventRsvpService.rsvp.bind(event_rsvp_service_1.eventRsvpService),
    getEventAttendees: event_rsvp_service_1.eventRsvpService.getEventAttendees.bind(event_rsvp_service_1.eventRsvpService),
    getAttendeeCounts: event_rsvp_service_1.eventRsvpService.getAttendeeCounts.bind(event_rsvp_service_1.eventRsvpService),
    getUserRSVP: event_rsvp_service_1.eventRsvpService.getUserRSVP.bind(event_rsvp_service_1.eventRsvpService),
    isRSVPClosed: event_rsvp_service_1.eventRsvpService.isRSVPClosed.bind(event_rsvp_service_1.eventRsvpService),
    isEventFull: event_rsvp_service_1.eventRsvpService.isEventFull.bind(event_rsvp_service_1.eventRsvpService),
    submitRSVP: event_rsvp_service_1.eventRsvpService.submitRSVP.bind(event_rsvp_service_1.eventRsvpService),
    updateRSVP: event_rsvp_service_1.eventRsvpService.updateRSVP.bind(event_rsvp_service_1.eventRsvpService),
    getEventRSVPs: event_rsvp_service_1.eventRsvpService.getEventRSVPs.bind(event_rsvp_service_1.eventRsvpService),
    getUserRSVPs: event_rsvp_service_1.eventRsvpService.getUserRSVPs.bind(event_rsvp_service_1.eventRsvpService),
    getUserEventRSVP: event_rsvp_service_1.eventRsvpService.getUserEventRSVP.bind(event_rsvp_service_1.eventRsvpService),
    sendReminderToMaybes: event_rsvp_service_1.eventRsvpService.sendReminderToMaybes.bind(event_rsvp_service_1.eventRsvpService),
    getEventsForCalendar: event_rsvp_service_1.eventRsvpService.getEventsForCalendar.bind(event_rsvp_service_1.eventRsvpService),
    getUpcomingUserEvents: event_rsvp_service_1.eventRsvpService.getUpcomingUserEvents.bind(event_rsvp_service_1.eventRsvpService),
    // ==========================================================================
    // ATTENDANCE METHODS (from eventAttendanceService)
    // ==========================================================================
    checkIn: event_attendance_service_1.eventAttendanceService.checkIn.bind(event_attendance_service_1.eventAttendanceService),
    removeCheckIn: event_attendance_service_1.eventAttendanceService.removeCheckIn.bind(event_attendance_service_1.eventAttendanceService),
    getAttendeeList: event_attendance_service_1.eventAttendanceService.getAttendeeList.bind(event_attendance_service_1.eventAttendanceService),
    isUserCheckedIn: event_attendance_service_1.eventAttendanceService.isUserCheckedIn.bind(event_attendance_service_1.eventAttendanceService),
    getUserAttendance: event_attendance_service_1.eventAttendanceService.getUserAttendance.bind(event_attendance_service_1.eventAttendanceService),
    getAttendanceStats: event_attendance_service_1.eventAttendanceService.getAttendanceStats.bind(event_attendance_service_1.eventAttendanceService),
    isEventToday: event_attendance_service_1.eventAttendanceService.isEventToday.bind(event_attendance_service_1.eventAttendanceService),
    isCheckInAvailable: event_attendance_service_1.eventAttendanceService.isCheckInAvailable.bind(event_attendance_service_1.eventAttendanceService),
    // ==========================================================================
    // DISPLAY METHODS (from eventDisplayService)
    // ==========================================================================
    formatEventType: event_display_service_1.eventDisplayService.formatEventType.bind(event_display_service_1.eventDisplayService),
    getEventTypeIcon: event_display_service_1.eventDisplayService.getEventTypeIcon.bind(event_display_service_1.eventDisplayService),
    getEventTypeColor: event_display_service_1.eventDisplayService.getEventTypeColor.bind(event_display_service_1.eventDisplayService),
    formatAudience: event_display_service_1.eventDisplayService.formatAudience.bind(event_display_service_1.eventDisplayService),
    formatPrice: event_display_service_1.eventDisplayService.formatPrice.bind(event_display_service_1.eventDisplayService),
    formatEventDate: event_display_service_1.eventDisplayService.formatEventDate.bind(event_display_service_1.eventDisplayService),
    formatEventTime: event_display_service_1.eventDisplayService.formatEventTime.bind(event_display_service_1.eventDisplayService),
    formatRSVPStatus: event_display_service_1.eventDisplayService.formatRSVPStatus.bind(event_display_service_1.eventDisplayService),
    getRSVPStatusColor: event_display_service_1.eventDisplayService.getRSVPStatusColor.bind(event_display_service_1.eventDisplayService),
    getRSVPStatusIcon: event_display_service_1.eventDisplayService.getRSVPStatusIcon.bind(event_display_service_1.eventDisplayService),
    formatTimeAgo: event_display_service_1.eventDisplayService.formatTimeAgo.bind(event_display_service_1.eventDisplayService),
};
