/**
 * Booking Service Module
 *
 * Manages session bookings between coaches and athletes.
 * Handles creation, validation, status transitions, and queries.
 *
 * This module is split into focused services:
 * - bookingCrudService: Basic CRUD operations, draft state, validation
 * - bookingStatusService: Status transitions, confirmations, reminders
 * - bookingSearchService: Queries, filtering, user-based lookups
 *
 * This index file provides a unified facade (bookingService) for backward
 * compatibility, re-exporting all functionality from the split services.
 */

// Re-export individual services for direct use
export { bookingAuthorityService } from './booking-authority-service';
export { bookingCrudService } from './booking-crud-service';
export { bookingStatusService } from './booking-status-service';
export { bookingSearchService } from './booking-search-service';

// Re-export types
export type { BookingDraft, CreateBookingParams } from './booking-crud-service';

// Import services for the unified facade
import { bookingAuthorityService } from './booking-authority-service';
import { bookingCrudService } from './booking-crud-service';
import { bookingStatusService } from './booking-status-service';
import { bookingSearchService } from './booking-search-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('BookingFacade');
void logger;

// ============================================================================
// UNIFIED FACADE FOR BACKWARD COMPATIBILITY
// ============================================================================

/**
 * Unified booking service facade that maintains the original BookingService API.
 * Delegates to the appropriate focused service under the hood.
 *
 * This object replicates the exact same interface as the original BookingService
 * class instance, so all existing callers continue to work without modification.
 */
export const bookingService = {
  // ==========================================================================
  // DRAFT METHODS (from bookingCrudService)
  // ==========================================================================

  getDraft: bookingCrudService.getDraft.bind(bookingCrudService),
  updateDraft: bookingCrudService.updateDraft.bind(bookingCrudService),
  resetDraft: bookingCrudService.resetDraft.bind(bookingCrudService),

  // ==========================================================================
  // CRUD METHODS (from bookingCrudService)
  // ==========================================================================

  list: bookingCrudService.list.bind(bookingCrudService),
  getBooking: bookingCrudService.getBooking.bind(bookingCrudService),
  getById: bookingCrudService.getById.bind(bookingCrudService),
  createBookingViaApi: bookingAuthorityService.createBooking.bind(bookingAuthorityService),
  cancelBookingViaApi: bookingAuthorityService.cancelBooking.bind(bookingAuthorityService),
  reopenBookingViaApi: bookingAuthorityService.reopenBooking.bind(bookingAuthorityService),
  updateBooking: bookingCrudService.updateBooking.bind(bookingCrudService),
  updateStatus: bookingCrudService.updateStatus.bind(bookingCrudService),
  cancel: bookingCrudService.cancel.bind(bookingCrudService),
  reopen: bookingCrudService.reopen.bind(bookingCrudService),
  validateBooking: bookingCrudService.validateBooking.bind(bookingCrudService),
  createBooking: bookingCrudService.createBooking.bind(bookingCrudService),
  createBookingNotifications:
    bookingCrudService.createBookingNotifications.bind(bookingCrudService),
  createFromDraft: bookingCrudService.createFromDraft.bind(bookingCrudService),
  saveBookingDirect: bookingCrudService.saveBookingDirect.bind(bookingCrudService),

  // ==========================================================================
  // STATUS METHODS (from bookingStatusService)
  // ==========================================================================

  confirmBooking: bookingStatusService.confirmBooking.bind(bookingStatusService),
  checkAndTransitionStatus:
    bookingStatusService.checkAndTransitionStatus.bind(bookingStatusService),
  scheduleSessionReminders:
    bookingStatusService.scheduleSessionReminders.bind(bookingStatusService),

  // ==========================================================================
  // SEARCH METHODS (from bookingSearchService)
  // ==========================================================================

  getBookingsForUser: bookingSearchService.getBookingsForUser.bind(bookingSearchService),
  getAwaitingCompletion: bookingSearchService.getAwaitingCompletion.bind(bookingSearchService),
  getUpcomingBookings: bookingSearchService.getUpcomingBookings.bind(bookingSearchService),
};
