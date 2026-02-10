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

// Re-export individual services for direct use
export { eventCrudService } from './event-crud-service';
export { eventRsvpService } from './event-rsvp-service';
export { eventAttendanceService } from './event-attendance-service';
export { eventDisplayService } from './event-display-service';

// Re-export types
export type { CreateEventInput } from './event-crud-service';

// Import services for the unified facade
import { eventCrudService } from './event-crud-service';
import { eventRsvpService } from './event-rsvp-service';
import { eventAttendanceService } from './event-attendance-service';
import { eventDisplayService } from './event-display-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('EventFacade');
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
export const eventService = {
  // ==========================================================================
  // CRUD METHODS (from eventCrudService)
  // ==========================================================================

  createEvent: eventCrudService.createEvent.bind(eventCrudService),
  publishEvent: eventCrudService.publishEvent.bind(eventCrudService),
  cancelEvent: eventCrudService.cancelEvent.bind(eventCrudService),
  getEvent: eventCrudService.getEvent.bind(eventCrudService),
  getUpcomingEvents: eventCrudService.getUpcomingEvents.bind(eventCrudService),
  getAllClubEvents: eventCrudService.getAllClubEvents.bind(eventCrudService),
  inviteClub: eventCrudService.inviteClub.bind(eventCrudService),
  inviteSquads: eventCrudService.inviteSquads.bind(eventCrudService),

  // ==========================================================================
  // RSVP METHODS (from eventRsvpService)
  // ==========================================================================

  rsvp: eventRsvpService.rsvp.bind(eventRsvpService),
  getEventAttendees: eventRsvpService.getEventAttendees.bind(eventRsvpService),
  getAttendeeCounts: eventRsvpService.getAttendeeCounts.bind(eventRsvpService),
  getUserRSVP: eventRsvpService.getUserRSVP.bind(eventRsvpService),
  isRSVPClosed: eventRsvpService.isRSVPClosed.bind(eventRsvpService),
  isEventFull: eventRsvpService.isEventFull.bind(eventRsvpService),
  submitRSVP: eventRsvpService.submitRSVP.bind(eventRsvpService),
  updateRSVP: eventRsvpService.updateRSVP.bind(eventRsvpService),
  getEventRSVPs: eventRsvpService.getEventRSVPs.bind(eventRsvpService),
  getUserRSVPs: eventRsvpService.getUserRSVPs.bind(eventRsvpService),
  getUserEventRSVP: eventRsvpService.getUserEventRSVP.bind(eventRsvpService),
  getEventsForCalendar: eventRsvpService.getEventsForCalendar.bind(eventRsvpService),
  getUpcomingUserEvents: eventRsvpService.getUpcomingUserEvents.bind(eventRsvpService),

  // ==========================================================================
  // ATTENDANCE METHODS (from eventAttendanceService)
  // ==========================================================================

  checkIn: eventAttendanceService.checkIn.bind(eventAttendanceService),
  removeCheckIn: eventAttendanceService.removeCheckIn.bind(eventAttendanceService),
  getAttendeeList: eventAttendanceService.getAttendeeList.bind(eventAttendanceService),
  isUserCheckedIn: eventAttendanceService.isUserCheckedIn.bind(eventAttendanceService),
  getUserAttendance: eventAttendanceService.getUserAttendance.bind(eventAttendanceService),
  getAttendanceStats: eventAttendanceService.getAttendanceStats.bind(eventAttendanceService),
  isEventToday: eventAttendanceService.isEventToday.bind(eventAttendanceService),
  isCheckInAvailable: eventAttendanceService.isCheckInAvailable.bind(eventAttendanceService),

  // ==========================================================================
  // DISPLAY METHODS (from eventDisplayService)
  // ==========================================================================

  formatEventType: eventDisplayService.formatEventType.bind(eventDisplayService),
  getEventTypeIcon: eventDisplayService.getEventTypeIcon.bind(eventDisplayService),
  getEventTypeColor: eventDisplayService.getEventTypeColor.bind(eventDisplayService),
  formatAudience: eventDisplayService.formatAudience.bind(eventDisplayService),
  formatPrice: eventDisplayService.formatPrice.bind(eventDisplayService),
  formatEventDate: eventDisplayService.formatEventDate.bind(eventDisplayService),
  formatEventTime: eventDisplayService.formatEventTime.bind(eventDisplayService),
  formatRSVPStatus: eventDisplayService.formatRSVPStatus.bind(eventDisplayService),
  getRSVPStatusColor: eventDisplayService.getRSVPStatusColor.bind(eventDisplayService),
  getRSVPStatusIcon: eventDisplayService.getRSVPStatusIcon.bind(eventDisplayService),
  formatTimeAgo: eventDisplayService.formatTimeAgo.bind(eventDisplayService),
};
