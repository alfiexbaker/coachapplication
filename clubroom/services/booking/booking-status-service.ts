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

import { Booking } from '@/constants/app-types';
import { notificationService } from '../notification-service';
import { createLogger } from '@/utils/logger';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { type Result, type ServiceError, ok, err, notFound } from '@/types/result';
import { bookingCrudService } from './booking-crud-service';
import { userService } from '../user-service';

const logger = createLogger('BookingStatusService');

async function resolveAthleteName(booking: Booking, fallback = 'Athlete'): Promise<string> {
  const athleteId = booking.athleteIds?.[0] ?? booking.athleteId;
  if (!athleteId) return fallback;

  const athleteResult = await userService.getUserById(athleteId);
  if (!athleteResult.success) return fallback;

  const name = athleteResult.data.name?.trim();
  return name || fallback;
}

export const bookingStatusService = {
  /**
   * Confirm a pending booking (for coach).
   * Delegates to bookingCrudService.updateBooking() so the write goes through
   * the cache-aware path instead of hitting apiClient directly.
   */
  async confirmBooking(bookingId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await bookingCrudService.updateBooking(bookingId, { status: 'CONFIRMED' });
      if (!result.success) {
        return { success: false, error: 'Booking not found' };
      }

      // Create confirmation notification
      const booking = result.data;
      const athleteName = await resolveAthleteName(booking);
      await notificationService.create({
        id: `notif-confirmed-${Date.now()}`,
        type: 'booking',
        title: 'Booking Confirmed',
        body: `Coach ${booking.coachName} has confirmed your session for ${athleteName}.`,
        timeLabel: 'Just now',
        read: false,
      });

      // Emit typed event for cross-service reactions
      emitTyped(ServiceEvents.BOOKING_CONFIRMED, {
        bookingId,
        userId: booking.bookedById ?? booking.athleteId ?? '',
        coachId: booking.coachId,
        coachName: booking.coachName,
        athleteName,
        scheduledAt: booking.scheduledAt,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to confirm booking', error);
      return { success: false, error: 'Failed to confirm booking' };
    }
  },

  /**
   * Check if a confirmed booking has passed its session end time and
   * transition it to AWAITING_COMPLETION status automatically.
   */
  async checkAndTransitionStatus(bookingId: string): Promise<Result<Booking, ServiceError>> {
    const booking = await bookingCrudService.getBooking(bookingId);
    if (!booking) return err(notFound('Booking', bookingId));

    const sessionEnd = new Date(booking.scheduledAt);
    sessionEnd.setMinutes(sessionEnd.getMinutes() + (booking.duration || 60));

    if (booking.status === 'CONFIRMED' && new Date() > sessionEnd) {
      return bookingCrudService.updateBooking(bookingId, { status: 'AWAITING_COMPLETION' });
    }
    return ok(booking);
  },

  /**
   * Schedule session reminders (would be triggered by a scheduler in production)
   * This method checks for sessions happening in the next hour and sends reminders
   */
  async scheduleSessionReminders(): Promise<void> {
    const bookings = await bookingCrudService.list();
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    const upcomingSessions = bookings.filter((booking) => {
      if (booking.status !== 'CONFIRMED' && booking.status !== 'PENDING') return false;
      const sessionTime = new Date(booking.scheduledAt);
      return sessionTime > now && sessionTime <= oneHourFromNow;
    });

    for (const session of upcomingSessions) {
      const athleteName = await resolveAthleteName(session);

      // Notify coach if we have a valid coachId
      if (session.coachId) {
        await notificationService.notifyCoachSessionReminder({
          coachId: session.coachId,
          athleteName,
          bookingId: session.id,
        });
      }

      // Notify parent if we have a valid bookedById
      if (session.bookedById) {
        await notificationService.notifyParentSessionReminder({
          parentId: session.bookedById,
          childName: athleteName,
          coachName: session.coachName || 'Coach',
          bookingId: session.id,
        });
      }
    }
  },
};
