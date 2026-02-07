"use strict";
/**
 * Booking Search Service
 *
 * Handles booking queries and filtering: get bookings by user/role,
 * upcoming bookings, awaiting completion, etc.
 *
 * API Integration Notes:
 * - Queries are performed against local storage in mock mode
 * - Would map to various GET /api/bookings?... endpoints in production
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingSearchService = void 0;
const logger_1 = require("@/utils/logger");
const booking_crud_service_1 = require("./booking-crud-service");
const logger = (0, logger_1.createLogger)('BookingSearchService');
exports.bookingSearchService = {
    /**
     * Get all bookings for a specific user (coach, parent, or athlete).
     * Reads through bookingCrudService.list() so the in-memory cache is used.
     */
    async getBookingsForUser(userId, role) {
        try {
            const bookings = await booking_crud_service_1.bookingCrudService.list();
            switch (role) {
                case 'coach':
                    return bookings.filter((b) => b.coachId === userId);
                case 'parent':
                    return bookings.filter((b) => b.bookedById === userId);
                case 'athlete':
                    return bookings.filter((b) => b.athleteId === userId);
                default:
                    return [];
            }
        }
        catch (error) {
            logger.error('Failed to get bookings', error);
            return [];
        }
    },
    /**
     * Get all bookings for a coach that are awaiting completion.
     * Also auto-detects confirmed sessions whose time has passed.
     */
    async getAwaitingCompletion(coachId) {
        const bookings = await booking_crud_service_1.bookingCrudService.list();
        const now = new Date();
        return bookings.filter((b) => {
            if (b.coachId !== coachId)
                return false;
            if (b.status === 'AWAITING_COMPLETION')
                return true;
            // Auto-transition confirmed sessions that have passed
            if (b.status === 'CONFIRMED') {
                const end = new Date(b.scheduledAt);
                end.setMinutes(end.getMinutes() + (b.duration || 60));
                return now > end;
            }
            return false;
        });
    },
    /**
     * Get upcoming bookings for a coach (confirmed/pending, scheduled in the future)
     */
    async getUpcomingBookings(coachId) {
        const bookings = await booking_crud_service_1.bookingCrudService.list();
        const now = new Date();
        return bookings.filter((b) => {
            if (b.coachId !== coachId)
                return false;
            if (b.status !== 'CONFIRMED' && b.status !== 'PENDING')
                return false;
            return new Date(b.scheduledAt) > now;
        });
    },
};
