/**
 * Calendar Helpers
 *
 * Shared utilities for phone calendar integration.
 * Used by AddToCalendar component and CalendarSyncSubscriber service.
 */

import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalendarBookingInfo {
  coachName: string;
  scheduledAt: string;
  duration: number;
  location?: string;
  sessionType?: string;
  price?: number;
}

// ---------------------------------------------------------------------------
// getDefaultCalendarId
// ---------------------------------------------------------------------------

/**
 * Find the best writable calendar, or create one if necessary.
 * Returns the calendar ID, or null if no suitable calendar was found.
 */
export async function getDefaultCalendarId(calendarColor?: string): Promise<string | null> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

  // Try to find the default calendar
  const defaultCalendar = calendars.find((cal) => cal.isPrimary);
  if (defaultCalendar) return defaultCalendar.id;

  // Fallback: find a writable local calendar
  const writable = calendars.find(
    (cal) =>
      cal.allowsModifications &&
      (cal.source?.type === 'local' ||
        cal.source?.type === 'LOCAL' ||
        cal.type === 'local'),
  );
  if (writable) return writable.id;

  // Last resort: create a new calendar on iOS
  if (Platform.OS === 'ios') {
    const defaultSource = calendars.find(
      (cal) => cal.source?.name === 'iCloud' || cal.source?.name === 'Default',
    )?.source;

    if (defaultSource) {
      const newCalendarId = await Calendar.createCalendarAsync({
        title: 'Clubroom Sessions',
        color: calendarColor ?? '#6366F1',
        entityType: Calendar.EntityTypes.EVENT,
        sourceId: defaultSource.id,
        source: defaultSource,
        name: 'clubroom',
        ownerAccount: 'personal',
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      });
      return newCalendarId;
    }
  }

  // Android: use the first writable calendar
  if (Platform.OS === 'android') {
    const writableCalendar = calendars.find((cal) => cal.allowsModifications);
    if (writableCalendar) return writableCalendar.id;
  }

  return null;
}

// ---------------------------------------------------------------------------
// buildCalendarTitle
// ---------------------------------------------------------------------------

/**
 * Build the calendar event title from booking info.
 */
export function buildCalendarTitle(booking: CalendarBookingInfo): string {
  return booking.sessionType
    ? `${booking.sessionType} with ${booking.coachName}`
    : `Session with ${booking.coachName}`;
}

// ---------------------------------------------------------------------------
// buildCalendarNotes
// ---------------------------------------------------------------------------

/**
 * Build the calendar event notes/description from booking info.
 */
export function buildCalendarNotes(booking: CalendarBookingInfo): string {
  return [
    booking.sessionType && `Type: ${booking.sessionType}`,
    booking.price != null && `Price: \u00A3${booking.price}`,
    'Booked via Clubroom',
  ]
    .filter(Boolean)
    .join('\n');
}
