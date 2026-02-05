"use strict";
/**
 * Booking Status Service
 *
 * Handles booking status transitions: confirm, complete, no-show,
 * and automatic status detection based on session timing.
 *
 * API Integration Notes:
 * - Status transitions are persisted via apiClient
 * - Notifications are triggered on status changes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingStatusService = void 0;
const notification_service_1 = require("../notification-service");
const api_client_1 = require("../api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const logger_1 = require("@/utils/logger");
const event_bus_1 = require("@/services/event-bus");
const result_1 = require("@/types/result");
const booking_crud_service_1 = require("./booking-crud-service");
const logger = (0, logger_1.createLogger)('BookingStatusService');
exports.bookingStatusService = {
    /**
     * Confirm a pending booking (for coach)
     */
    async confirmBooking(bookingId) {
        try {
            const bookings = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.BOOKINGS, []);
            const bookingIndex = bookings.findIndex((b) => b.id === bookingId);
            if (bookingIndex === -1) {
                return { success: false, error: 'Booking not found' };
            }
            bookings[bookingIndex].status = 'CONFIRMED';
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BOOKINGS, bookings);
            // Create confirmation notification
            const booking = bookings[bookingIndex];
            await notification_service_1.notificationService.create({
                id: `notif-confirmed-${Date.now()}`,
                type: 'booking',
                title: 'Booking Confirmed',
                body: `Coach ${booking.coachName} has confirmed your session for ${booking.athleteName}.`,
                timeLabel: 'Just now',
                read: false,
            });
            // Emit typed event for cross-service reactions
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.BOOKING_CONFIRMED, {
                bookingId,
                userId: booking.bookedById ?? booking.athleteId ?? '',
                coachId: booking.coachId,
                coachName: booking.coachName,
                athleteName: booking.athleteName,
                scheduledAt: booking.scheduledAt,
            });
            return { success: true };
        }
        catch (error) {
            logger.error('Failed to confirm booking', error);
            return { success: false, error: 'Failed to confirm booking' };
        }
    },
    /**
     * Check if a confirmed booking has passed its session end time and
     * transition it to AWAITING_COMPLETION status automatically.
     */
    async checkAndTransitionStatus(bookingId) {
        const booking = await booking_crud_service_1.bookingCrudService.getBooking(bookingId);
        if (!booking)
            return (0, result_1.err)((0, result_1.notFound)('Booking', bookingId));
        const sessionEnd = new Date(booking.scheduledAt);
        sessionEnd.setMinutes(sessionEnd.getMinutes() + (booking.duration || 60));
        if (booking.status === 'CONFIRMED' && new Date() > sessionEnd) {
            return booking_crud_service_1.bookingCrudService.updateBooking(bookingId, { status: 'AWAITING_COMPLETION' });
        }
        return (0, result_1.ok)(booking);
    },
    /**
     * Schedule session reminders (would be triggered by a scheduler in production)
     * This method checks for sessions happening in the next hour and sends reminders
     */
    async scheduleSessionReminders() {
        const bookings = await booking_crud_service_1.bookingCrudService.list();
        const now = new Date();
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
        const upcomingSessions = bookings.filter((booking) => {
            if (booking.status !== 'CONFIRMED' && booking.status !== 'PENDING')
                return false;
            const sessionTime = new Date(booking.scheduledAt);
            return sessionTime > now && sessionTime <= oneHourFromNow;
        });
        for (const session of upcomingSessions) {
            // Notify coach if we have a valid coachId
            if (session.coachId) {
                await notification_service_1.notificationService.notifyCoachSessionReminder({
                    coachId: session.coachId,
                    athleteName: session.athleteName || 'Athlete',
                    bookingId: session.id,
                });
            }
            // Notify parent if we have a valid bookedById
            if (session.bookedById) {
                await notification_service_1.notificationService.notifyParentSessionReminder({
                    parentId: session.bookedById,
                    childName: session.athleteName || 'Athlete',
                    coachName: session.coachName || 'Coach',
                    bookingId: session.id,
                });
            }
        }
    },
};
