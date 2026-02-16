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
const logger_1 = require("@/utils/logger");
const event_bus_1 = require("@/services/event-bus");
const result_1 = require("@/types/result");
const booking_crud_service_1 = require("./booking-crud-service");
const user_service_1 = require("../user-service");
const logger = (0, logger_1.createLogger)('BookingStatusService');
async function resolveAthleteName(booking, fallback = 'Athlete') {
    const athleteId = booking.athleteIds?.[0] ?? booking.athleteId;
    if (!athleteId)
        return fallback;
    const athleteResult = await user_service_1.userService.getUserById(athleteId);
    if (!athleteResult.success)
        return fallback;
    const name = athleteResult.data.name?.trim();
    return name || fallback;
}
exports.bookingStatusService = {
    /**
     * Confirm a pending booking (for coach).
     * Delegates to bookingCrudService.updateBooking() so the write goes through
     * the cache-aware path instead of hitting apiClient directly.
     */
    async confirmBooking(bookingId) {
        try {
            const result = await booking_crud_service_1.bookingCrudService.updateBooking(bookingId, { status: 'CONFIRMED' });
            if (!result.success) {
                return { success: false, error: 'Booking not found' };
            }
            // Create confirmation notification
            const booking = result.data;
            const athleteName = await resolveAthleteName(booking);
            await notification_service_1.notificationService.create({
                id: `notif-confirmed-${Date.now()}`,
                type: 'booking',
                notificationType: 'BOOKING_CONFIRMED',
                title: 'Booking Confirmed',
                body: `Coach ${booking.coachName} has confirmed your session for ${athleteName}.`,
                timeLabel: 'Just now',
                read: false,
                recipientId: booking.bookedById,
                recipientRole: 'parent',
                deepLink: `/bookings/${bookingId}`,
                data: { bookingId },
            });
            // Emit typed event for cross-service reactions
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.BOOKING_CONFIRMED, {
                bookingId,
                userId: booking.bookedById ?? booking.athleteId ?? '',
                coachId: booking.coachId,
                coachName: booking.coachName,
                athleteName,
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
            const athleteName = await resolveAthleteName(session);
            // Notify coach if we have a valid coachId
            if (session.coachId) {
                await notification_service_1.notificationService.notifyCoachSessionReminder({
                    coachId: session.coachId,
                    athleteName,
                    bookingId: session.id,
                });
            }
            // Notify parent if we have a valid bookedById
            if (session.bookedById) {
                await notification_service_1.notificationService.notifyParentSessionReminder({
                    parentId: session.bookedById,
                    childName: athleteName,
                    coachName: session.coachName || 'Coach',
                    bookingId: session.id,
                });
            }
        }
    },
};
