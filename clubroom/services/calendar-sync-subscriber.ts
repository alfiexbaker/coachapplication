/**
 * Calendar Sync Subscriber
 *
 * Event bus handlers that automatically sync bookings with the phone's
 * native calendar. Operations are best-effort: calendar failures never
 * crash the app or block booking flows.
 *
 * Handles:
 * - BOOKING_CREATED  -> create calendar event if autoSync enabled
 * - BOOKING_UPDATED  -> update calendar event if calendarEventId exists
 * - BOOKING_CANCELLED -> delete calendar event if calendarEventId exists
 */

import * as Calendar from 'expo-calendar';
import { createLogger } from '@/utils/logger';
import {
  getDefaultCalendarId,
  buildCalendarTitle,
  buildCalendarNotes,
} from '@/utils/calendar-helpers';
import type { EventPayloads } from '@/services/event-bus';
import { ServiceEvents } from '@/services/event-bus';
import type { Booking } from '@/constants/app-types';
import type { CalendarSyncSettings } from '@/constants/types';

const logger = createLogger('CalendarSyncSubscriber');

// ---------------------------------------------------------------------------
// Lazy service accessors (avoid circular deps at import time)
// ---------------------------------------------------------------------------

function getBookingService() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@/services/booking-service').bookingService;
}

function getCalendarService() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@/services/calendar-service').calendarService;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check whether auto-sync is enabled for a given user.
 * Returns false on any failure so we never block on calendar settings.
 */
async function isAutoSyncEnabled(userId: string): Promise<boolean> {
  try {
    const calendarSvc = getCalendarService();
    const settings: CalendarSyncSettings | null = await calendarSvc.getSyncSettings(userId);
    return Boolean(settings?.enabled && settings?.autoSync);
  } catch {
    return false;
  }
}

/**
 * Check if the device has calendar permission (without prompting).
 */
async function hasCalendarPermission(): Promise<boolean> {
  try {
    const { status } = await Calendar.getCalendarPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/**
 * When a booking is created, optionally create a matching calendar event.
 */
export async function handleBookingCreated(
  data: EventPayloads[typeof ServiceEvents.BOOKING_CREATED],
): Promise<void> {
  try {
    const userId = data.userId;
    if (!userId) return;

    // Check if auto-sync is enabled and permission granted
    const [autoSync, hasPermission] = await Promise.all([
      isAutoSyncEnabled(userId),
      hasCalendarPermission(),
    ]);

    if (!autoSync || !hasPermission) {
      logger.debug('Auto-sync not enabled or no calendar permission, skipping', {
        bookingId: data.bookingId,
        autoSync,
        hasPermission,
      });
      return;
    }

    // Fetch the full booking to get all fields
    const bookingSvc = getBookingService();
    const booking: Booking | undefined = await bookingSvc.getById(data.bookingId);
    if (!booking) {
      logger.warn('Booking not found for calendar sync', { bookingId: data.bookingId });
      return;
    }

    // Skip if already has a calendar event
    if (booking.calendarEventId) return;

    // Find writable calendar
    const calendarId = await getDefaultCalendarId();
    if (!calendarId) {
      logger.warn('No writable calendar found');
      return;
    }

    // Build and create event
    const startDate = new Date(booking.scheduledAt);
    const endDate = new Date(startDate.getTime() + (booking.duration ?? 60) * 60 * 1000);
    const title = buildCalendarTitle({
      coachName: booking.coachName ?? 'Coach',
      scheduledAt: booking.scheduledAt,
      duration: booking.duration ?? 60,
      location: booking.location,
      sessionType: booking.serviceType ?? booking.service,
      price: booking.price,
    });
    const notes = buildCalendarNotes({
      coachName: booking.coachName ?? 'Coach',
      scheduledAt: booking.scheduledAt,
      duration: booking.duration ?? 60,
      sessionType: booking.serviceType ?? booking.service,
      price: booking.price,
    });

    const calendarEventId = await Calendar.createEventAsync(calendarId, {
      title,
      startDate,
      endDate,
      location: booking.location || undefined,
      notes,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      alarms: [{ relativeOffset: -60 }],
    });

    // Persist calendarEventId back to booking
    if (calendarEventId) {
      await bookingSvc.updateBooking(data.bookingId, { calendarEventId });
      logger.info('Calendar event created for booking', {
        bookingId: data.bookingId,
        calendarEventId,
      });
    }
  } catch (error) {
    logger.error('Failed to auto-create calendar event', error);
  }
}

/**
 * When a booking is updated, update the matching calendar event if one exists.
 * Guards against infinite loops by skipping updates that only contain calendarEventId.
 */
export async function handleBookingUpdated(
  data: EventPayloads[typeof ServiceEvents.BOOKING_UPDATED],
): Promise<void> {
  try {
    // Guard: skip if changes only contain calendarEventId (prevent infinite loop)
    const changeKeys = Object.keys(data.changes);
    if (changeKeys.length === 1 && changeKeys[0] === 'calendarEventId') {
      return;
    }

    // Fetch the booking
    const bookingSvc = getBookingService();
    const booking: Booking | undefined = await bookingSvc.getById(data.bookingId);
    if (!booking?.calendarEventId) return;

    // Check permission
    if (!(await hasCalendarPermission())) return;

    // Rebuild event details
    const startDate = new Date(booking.scheduledAt);
    const endDate = new Date(startDate.getTime() + (booking.duration ?? 60) * 60 * 1000);
    const title = buildCalendarTitle({
      coachName: booking.coachName ?? 'Coach',
      scheduledAt: booking.scheduledAt,
      duration: booking.duration ?? 60,
      location: booking.location,
      sessionType: booking.serviceType ?? booking.service,
      price: booking.price,
    });
    const notes = buildCalendarNotes({
      coachName: booking.coachName ?? 'Coach',
      scheduledAt: booking.scheduledAt,
      duration: booking.duration ?? 60,
      sessionType: booking.serviceType ?? booking.service,
      price: booking.price,
    });

    await Calendar.updateEventAsync(booking.calendarEventId, {
      title,
      startDate,
      endDate,
      location: booking.location || undefined,
      notes,
    });

    logger.info('Calendar event updated for booking', {
      bookingId: data.bookingId,
      calendarEventId: booking.calendarEventId,
    });
  } catch (error) {
    logger.error('Failed to update calendar event', error);
  }
}

/**
 * When a booking is cancelled, delete the matching calendar event if one exists
 * and clear the calendarEventId from the booking.
 */
export async function handleBookingCancelled(
  data: EventPayloads[typeof ServiceEvents.BOOKING_CANCELLED],
): Promise<void> {
  try {
    // Fetch the booking
    const bookingSvc = getBookingService();
    const booking: Booking | undefined = await bookingSvc.getById(data.bookingId);
    if (!booking?.calendarEventId) return;

    // Check permission
    if (!(await hasCalendarPermission())) return;

    const calendarEventId = booking.calendarEventId;

    // Delete the calendar event
    await Calendar.deleteEventAsync(calendarEventId);

    // Clear calendarEventId from booking
    await bookingSvc.updateBooking(data.bookingId, { calendarEventId: undefined });

    logger.info('Calendar event deleted for cancelled booking', {
      bookingId: data.bookingId,
      calendarEventId,
    });
  } catch (error) {
    logger.error('Failed to delete calendar event for cancelled booking', error);
  }
}
