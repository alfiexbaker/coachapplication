export { bookingAuthorityService } from './booking-authority-service';
export { bookingCrudService } from './booking-crud-service';
export { bookingStatusService } from './booking-status-service';
export { bookingSearchService } from './booking-search-service';

export type { BookingDraft, CreateBookingParams } from './booking-crud-service';

import { bookingAuthorityService } from './booking-authority-service';
import { bookingCrudService } from './booking-crud-service';
import { bookingStatusService } from './booking-status-service';
import { bookingSearchService } from './booking-search-service';

// Call-time wrappers preserve the legacy facade without reintroducing import cycles.
export const bookingService = {
  getDraft: (...args: Parameters<typeof bookingCrudService.getDraft>) =>
    bookingCrudService.getDraft(...args),
  updateDraft: (...args: Parameters<typeof bookingCrudService.updateDraft>) =>
    bookingCrudService.updateDraft(...args),
  resetDraft: (...args: Parameters<typeof bookingCrudService.resetDraft>) =>
    bookingCrudService.resetDraft(...args),

  list: (...args: Parameters<typeof bookingCrudService.list>) => bookingCrudService.list(...args),
  getBooking: (...args: Parameters<typeof bookingCrudService.getBooking>) =>
    bookingCrudService.getBooking(...args),
  getById: (...args: Parameters<typeof bookingCrudService.getById>) =>
    bookingCrudService.getById(...args),
  getRebookDraftContext: (...args: Parameters<typeof bookingCrudService.getRebookDraftContext>) =>
    bookingCrudService.getRebookDraftContext(...args),
  createBookingViaApi: (...args: Parameters<typeof bookingAuthorityService.createBooking>) =>
    bookingAuthorityService.createBooking(...args),
  cancelBookingViaApi: (...args: Parameters<typeof bookingAuthorityService.cancelBooking>) =>
    bookingAuthorityService.cancelBooking(...args),
  reopenBookingViaApi: (...args: Parameters<typeof bookingAuthorityService.reopenBooking>) =>
    bookingAuthorityService.reopenBooking(...args),
  completeBooking: (...args: Parameters<typeof bookingCrudService.completeBooking>) =>
    bookingCrudService.completeBooking(...args),
  updateBooking: (...args: Parameters<typeof bookingCrudService.updateBooking>) =>
    bookingCrudService.updateBooking(...args),
  updateStatus: (...args: Parameters<typeof bookingCrudService.updateStatus>) =>
    bookingCrudService.updateStatus(...args),
  cancel: (...args: Parameters<typeof bookingCrudService.cancel>) =>
    bookingCrudService.cancel(...args),
  reopen: (...args: Parameters<typeof bookingCrudService.reopen>) =>
    bookingCrudService.reopen(...args),
  validateBooking: (...args: Parameters<typeof bookingCrudService.validateBooking>) =>
    bookingCrudService.validateBooking(...args),
  createBooking: (...args: Parameters<typeof bookingCrudService.createBooking>) =>
    bookingCrudService.createBooking(...args),
  createBookingNotifications: (
    ...args: Parameters<typeof bookingCrudService.createBookingNotifications>
  ) => bookingCrudService.createBookingNotifications(...args),
  createFromDraft: (...args: Parameters<typeof bookingCrudService.createFromDraft>) =>
    bookingCrudService.createFromDraft(...args),
  saveBookingDirect: (...args: Parameters<typeof bookingCrudService.saveBookingDirect>) =>
    bookingCrudService.saveBookingDirect(...args),

  confirmBooking: (...args: Parameters<typeof bookingStatusService.confirmBooking>) =>
    bookingStatusService.confirmBooking(...args),
  checkAndTransitionStatus: (
    ...args: Parameters<typeof bookingStatusService.checkAndTransitionStatus>
  ) => bookingStatusService.checkAndTransitionStatus(...args),
  scheduleSessionReminders: (
    ...args: Parameters<typeof bookingStatusService.scheduleSessionReminders>
  ) => bookingStatusService.scheduleSessionReminders(...args),

  getBookingsForUser: (...args: Parameters<typeof bookingSearchService.getBookingsForUser>) =>
    bookingSearchService.getBookingsForUser(...args),
  getAwaitingCompletion: (...args: Parameters<typeof bookingSearchService.getAwaitingCompletion>) =>
    bookingSearchService.getAwaitingCompletion(...args),
  getUpcomingBookings: (...args: Parameters<typeof bookingSearchService.getUpcomingBookings>) =>
    bookingSearchService.getUpcomingBookings(...args),
};
