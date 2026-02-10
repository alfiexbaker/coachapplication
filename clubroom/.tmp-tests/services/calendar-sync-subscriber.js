"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleBookingCreated = handleBookingCreated;
exports.handleBookingUpdated = handleBookingUpdated;
exports.handleBookingCancelled = handleBookingCancelled;
const Calendar = __importStar(require("expo-calendar"));
const logger_1 = require("@/utils/logger");
const calendar_helpers_1 = require("@/utils/calendar-helpers");
const logger = (0, logger_1.createLogger)('CalendarSyncSubscriber');
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
async function isAutoSyncEnabled(userId) {
    try {
        const calendarSvc = getCalendarService();
        const settings = await calendarSvc.getSyncSettings(userId);
        return Boolean(settings?.enabled && settings?.autoSync);
    }
    catch {
        return false;
    }
}
/**
 * Check if the device has calendar permission (without prompting).
 */
async function hasCalendarPermission() {
    try {
        const { status } = await Calendar.getCalendarPermissionsAsync();
        return status === 'granted';
    }
    catch {
        return false;
    }
}
// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------
/**
 * When a booking is created, optionally create a matching calendar event.
 */
async function handleBookingCreated(data) {
    try {
        const userId = data.userId;
        if (!userId)
            return;
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
        const booking = await bookingSvc.getById(data.bookingId);
        if (!booking) {
            logger.warn('Booking not found for calendar sync', { bookingId: data.bookingId });
            return;
        }
        // Skip if already has a calendar event
        if (booking.calendarEventId)
            return;
        // Find writable calendar
        const calendarId = await (0, calendar_helpers_1.getDefaultCalendarId)();
        if (!calendarId) {
            logger.warn('No writable calendar found');
            return;
        }
        // Build and create event
        const startDate = new Date(booking.scheduledAt);
        const endDate = new Date(startDate.getTime() + (booking.duration ?? 60) * 60 * 1000);
        const title = (0, calendar_helpers_1.buildCalendarTitle)({
            coachName: booking.coachName,
            scheduledAt: booking.scheduledAt,
            duration: booking.duration ?? 60,
            location: booking.location,
            sessionType: booking.serviceType ?? booking.service,
            price: booking.price,
        });
        const notes = (0, calendar_helpers_1.buildCalendarNotes)({
            coachName: booking.coachName,
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
    }
    catch (error) {
        logger.error('Failed to auto-create calendar event', error);
    }
}
/**
 * When a booking is updated, update the matching calendar event if one exists.
 * Guards against infinite loops by skipping updates that only contain calendarEventId.
 */
async function handleBookingUpdated(data) {
    try {
        // Guard: skip if changes only contain calendarEventId (prevent infinite loop)
        const changeKeys = Object.keys(data.changes);
        if (changeKeys.length === 1 && changeKeys[0] === 'calendarEventId') {
            return;
        }
        // Fetch the booking
        const bookingSvc = getBookingService();
        const booking = await bookingSvc.getById(data.bookingId);
        if (!booking?.calendarEventId)
            return;
        // Check permission
        if (!(await hasCalendarPermission()))
            return;
        // Rebuild event details
        const startDate = new Date(booking.scheduledAt);
        const endDate = new Date(startDate.getTime() + (booking.duration ?? 60) * 60 * 1000);
        const title = (0, calendar_helpers_1.buildCalendarTitle)({
            coachName: booking.coachName,
            scheduledAt: booking.scheduledAt,
            duration: booking.duration ?? 60,
            location: booking.location,
            sessionType: booking.serviceType ?? booking.service,
            price: booking.price,
        });
        const notes = (0, calendar_helpers_1.buildCalendarNotes)({
            coachName: booking.coachName,
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
    }
    catch (error) {
        logger.error('Failed to update calendar event', error);
    }
}
/**
 * When a booking is cancelled, delete the matching calendar event if one exists
 * and clear the calendarEventId from the booking.
 */
async function handleBookingCancelled(data) {
    try {
        // Fetch the booking
        const bookingSvc = getBookingService();
        const booking = await bookingSvc.getById(data.bookingId);
        if (!booking?.calendarEventId)
            return;
        // Check permission
        if (!(await hasCalendarPermission()))
            return;
        const calendarEventId = booking.calendarEventId;
        // Delete the calendar event
        await Calendar.deleteEventAsync(calendarEventId);
        // Clear calendarEventId from booking
        await bookingSvc.updateBooking(data.bookingId, { calendarEventId: undefined });
        logger.info('Calendar event deleted for cancelled booking', {
            bookingId: data.bookingId,
            calendarEventId,
        });
    }
    catch (error) {
        logger.error('Failed to delete calendar event for cancelled booking', error);
    }
}
