"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingService = exports.bookingSearchService = exports.bookingStatusService = exports.bookingCrudService = void 0;
// Re-export individual services for direct use
var booking_crud_service_1 = require("./booking-crud-service");
Object.defineProperty(exports, "bookingCrudService", { enumerable: true, get: function () { return booking_crud_service_1.bookingCrudService; } });
var booking_status_service_1 = require("./booking-status-service");
Object.defineProperty(exports, "bookingStatusService", { enumerable: true, get: function () { return booking_status_service_1.bookingStatusService; } });
var booking_search_service_1 = require("./booking-search-service");
Object.defineProperty(exports, "bookingSearchService", { enumerable: true, get: function () { return booking_search_service_1.bookingSearchService; } });
// Import services for the unified facade
const booking_crud_service_2 = require("./booking-crud-service");
const booking_status_service_2 = require("./booking-status-service");
const booking_search_service_2 = require("./booking-search-service");
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('BookingFacade');
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
exports.bookingService = {
    // ==========================================================================
    // DRAFT METHODS (from bookingCrudService)
    // ==========================================================================
    getDraft: booking_crud_service_2.bookingCrudService.getDraft.bind(booking_crud_service_2.bookingCrudService),
    updateDraft: booking_crud_service_2.bookingCrudService.updateDraft.bind(booking_crud_service_2.bookingCrudService),
    resetDraft: booking_crud_service_2.bookingCrudService.resetDraft.bind(booking_crud_service_2.bookingCrudService),
    // ==========================================================================
    // CRUD METHODS (from bookingCrudService)
    // ==========================================================================
    list: booking_crud_service_2.bookingCrudService.list.bind(booking_crud_service_2.bookingCrudService),
    getBooking: booking_crud_service_2.bookingCrudService.getBooking.bind(booking_crud_service_2.bookingCrudService),
    getById: booking_crud_service_2.bookingCrudService.getById.bind(booking_crud_service_2.bookingCrudService),
    updateBooking: booking_crud_service_2.bookingCrudService.updateBooking.bind(booking_crud_service_2.bookingCrudService),
    updateStatus: booking_crud_service_2.bookingCrudService.updateStatus.bind(booking_crud_service_2.bookingCrudService),
    cancel: booking_crud_service_2.bookingCrudService.cancel.bind(booking_crud_service_2.bookingCrudService),
    validateBooking: booking_crud_service_2.bookingCrudService.validateBooking.bind(booking_crud_service_2.bookingCrudService),
    createBooking: booking_crud_service_2.bookingCrudService.createBooking.bind(booking_crud_service_2.bookingCrudService),
    createBookingNotifications: booking_crud_service_2.bookingCrudService.createBookingNotifications.bind(booking_crud_service_2.bookingCrudService),
    createFromDraft: booking_crud_service_2.bookingCrudService.createFromDraft.bind(booking_crud_service_2.bookingCrudService),
    saveBookingDirect: booking_crud_service_2.bookingCrudService.saveBookingDirect.bind(booking_crud_service_2.bookingCrudService),
    // ==========================================================================
    // STATUS METHODS (from bookingStatusService)
    // ==========================================================================
    confirmBooking: booking_status_service_2.bookingStatusService.confirmBooking.bind(booking_status_service_2.bookingStatusService),
    checkAndTransitionStatus: booking_status_service_2.bookingStatusService.checkAndTransitionStatus.bind(booking_status_service_2.bookingStatusService),
    scheduleSessionReminders: booking_status_service_2.bookingStatusService.scheduleSessionReminders.bind(booking_status_service_2.bookingStatusService),
    // ==========================================================================
    // SEARCH METHODS (from bookingSearchService)
    // ==========================================================================
    getBookingsForUser: booking_search_service_2.bookingSearchService.getBookingsForUser.bind(booking_search_service_2.bookingSearchService),
    getAwaitingCompletion: booking_search_service_2.bookingSearchService.getAwaitingCompletion.bind(booking_search_service_2.bookingSearchService),
    getUpcomingBookings: booking_search_service_2.bookingSearchService.getUpcomingBookings.bind(booking_search_service_2.bookingSearchService),
};
