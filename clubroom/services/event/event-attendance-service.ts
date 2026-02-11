/**
 * Event Attendance Service
 *
 * Handles check-in and attendance tracking for club events.
 * Supports location validation for in-person events.
 *
 * API Integration Notes:
 * - POST /api/events/:id/checkin - Check in user
 * - DELETE /api/events/:id/checkin/:userId - Remove check-in
 * - GET /api/events/:id/attendance - Get attendance list
 * - GET /api/events/:id/stats - Get attendance statistics
 */

import { apiClient } from '../api-client';
import { api } from '@/constants/config';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';
import type {
  ClubEvent,
  EventAttendance,
  EventAttendanceStats,
  CheckInInput,
} from '@/constants/types';
import { loadEvents } from './event-crud-service';
import { loadRSVPs } from './event-rsvp-service';

const USE_MOCK = api.useMock;
const logger = createLogger('EventAttendanceService');

// Location validation threshold in meters
const LOCATION_VALIDATION_THRESHOLD = 500;

// ============================================================================
// MOCK ATTENDANCE DATA
// ============================================================================

const MOCK_ATTENDANCE: EventAttendance[] = [
  {
    id: 'attendance_1',
    eventId: 'event_1',
    userId: 'parent_1',
    userRole: 'PARENT',
    checkedInAt: '2026-06-15T13:45:00Z',
    checkedInBy: 'coach1',
    checkInMethod: 'COACH',
    guestsCheckedIn: 2,
    locationValidated: true,
    distanceFromVenue: 25,
  },
];

let attendanceCache: EventAttendance[] = [...MOCK_ATTENDANCE];

// ============================================================================
// PERSISTENCE HELPERS
// ============================================================================

async function loadAttendance(): Promise<EventAttendance[]> {
  try {
    const stored = await apiClient.get<EventAttendance[] | null>(
      STORAGE_KEYS.EVENT_ATTENDANCE,
      null,
    );
    if (stored) return stored;
  } catch (error) {
    logger.error('Failed to load attendance', error);
  }
  return [...MOCK_ATTENDANCE];
}

async function saveAttendance(attendance: EventAttendance[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.EVENT_ATTENDANCE, attendance);
    attendanceCache = attendance;
  } catch (error) {
    logger.error('Failed to save attendance', error);
  }
}

// ============================================================================
// GEO HELPERS
// ============================================================================

/**
 * Calculate distance between two coordinates in meters using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================================================
// ATTENDANCE SERVICE
// ============================================================================

export const eventAttendanceService = {
  /**
   * Check in a user to an event
   * Supports location validation for in-person events
   */
  async checkIn(input: CheckInInput): Promise<EventAttendance> {
    const attendance: EventAttendance = {
      id: `attendance_${Date.now()}`,
      eventId: input.eventId,
      userId: input.userId,
      userRole: input.userRole,
      checkedInAt: new Date().toISOString(),
      checkedInBy: input.checkedInBy,
      checkInMethod: input.checkInMethod,
      checkInLocation: input.location,
      guestsCheckedIn: input.guestsCheckedIn ?? 0,
      notes: input.notes,
    };

    // Location validation for in-person events
    if (input.location) {
      // For mock data, we'll use a fixed venue location
      // In production, this would come from the event's venue geocoding
      const venueLocation = { latitude: 51.5074, longitude: -0.1278 }; // London
      const distance = calculateDistance(
        input.location.latitude,
        input.location.longitude,
        venueLocation.latitude,
        venueLocation.longitude,
      );
      attendance.distanceFromVenue = Math.round(distance);
      attendance.locationValidated = distance <= LOCATION_VALIDATION_THRESHOLD;
    }

    if (USE_MOCK) {
      attendanceCache = await loadAttendance();

      // Check if already checked in
      const existingIndex = attendanceCache.findIndex(
        (a) => a.eventId === input.eventId && a.userId === input.userId,
      );

      if (existingIndex >= 0) {
        // Update existing check-in (e.g., for guest count updates)
        attendance.id = attendanceCache[existingIndex].id;
        attendanceCache[existingIndex] = attendance;
      } else {
        attendanceCache.push(attendance);
      }

      await saveAttendance(attendanceCache);
      return attendance;
    }

    const response = await fetch(`/api/events/${input.eventId}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attendance),
    });
    return response.json();
  },

  /**
   * Remove a check-in (undo check-in)
   */
  async removeCheckIn(eventId: string, userId: string): Promise<void> {
    if (USE_MOCK) {
      attendanceCache = await loadAttendance();
      const index = attendanceCache.findIndex((a) => a.eventId === eventId && a.userId === userId);
      if (index >= 0) {
        attendanceCache.splice(index, 1);
        await saveAttendance(attendanceCache);
      }
      return;
    }

    await fetch(`/api/events/${eventId}/checkin/${userId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get attendee list (checked-in users) for an event
   */
  async getAttendeeList(eventId: string): Promise<EventAttendance[]> {
    if (USE_MOCK) {
      attendanceCache = await loadAttendance();
      return attendanceCache.filter((a) => a.eventId === eventId);
    }

    const response = await fetch(`/api/events/${eventId}/attendance`);
    return response.json();
  },

  /**
   * Check if a user has checked in to an event
   */
  async isUserCheckedIn(eventId: string, userId: string): Promise<boolean> {
    if (USE_MOCK) {
      attendanceCache = await loadAttendance();
      return attendanceCache.some((a) => a.eventId === eventId && a.userId === userId);
    }

    const response = await fetch(`/api/events/${eventId}/attendance/${userId}`);
    return response.ok;
  },

  /**
   * Get a user's attendance record for an event
   */
  async getUserAttendance(eventId: string, userId: string): Promise<EventAttendance | null> {
    if (USE_MOCK) {
      attendanceCache = await loadAttendance();
      return attendanceCache.find((a) => a.eventId === eventId && a.userId === userId) || null;
    }

    const response = await fetch(`/api/events/${eventId}/attendance/${userId}`);
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Get attendance statistics for an event
   */
  async getAttendanceStats(eventId: string): Promise<EventAttendanceStats> {
    if (USE_MOCK) {
      const rsvpsCache = await loadRSVPs();
      attendanceCache = await loadAttendance();
      const eventsCache = await loadEvents();

      const event = eventsCache.find((e) => e.id === eventId);
      const eventRSVPs = rsvpsCache.filter((r) => r.eventId === eventId);
      const eventAttendance = attendanceCache.filter((a) => a.eventId === eventId);

      // Calculate RSVP counts
      const rsvpCounts = {
        going: eventRSVPs.filter((r) => r.status === 'GOING').length,
        notGoing: eventRSVPs.filter((r) => r.status === 'NOT_GOING').length,
        maybe: eventRSVPs.filter((r) => r.status === 'MAYBE').length,
        noResponse: 0, // Would need invited list to calculate
      };

      // Calculate expected guests
      const expectedGuests = eventRSVPs
        .filter((r) => r.status === 'GOING')
        .reduce((sum, r) => sum + r.guestCount, 0);

      // Calculate checked-in counts
      const checkedInCount = eventAttendance.length;
      const guestsCheckedInCount = eventAttendance.reduce((sum, a) => sum + a.guestsCheckedIn, 0);

      // Calculate attendance rate
      const goingCount = rsvpCounts.going;
      const attendanceRate = goingCount > 0 ? Math.round((checkedInCount / goingCount) * 100) : 0;

      // Breakdown by role
      const byRole = {
        coaches: {
          rsvp: eventRSVPs.filter((r) => r.userRole === 'COACH' && r.status === 'GOING').length,
          checkedIn: eventAttendance.filter((a) => a.userRole === 'COACH').length,
        },
        parents: {
          rsvp: eventRSVPs.filter((r) => r.userRole === 'PARENT' && r.status === 'GOING').length,
          checkedIn: eventAttendance.filter((a) => a.userRole === 'PARENT').length,
        },
        athletes: {
          rsvp: eventRSVPs.filter((r) => r.userRole === 'ATHLETE' && r.status === 'GOING').length,
          checkedIn: eventAttendance.filter((a) => a.userRole === 'ATHLETE').length,
        },
      };

      return {
        eventId,
        rsvpCounts,
        expectedGuests,
        capacity: event?.maxAttendees,
        checkedInCount,
        guestsCheckedInCount,
        attendanceRate,
        byRole,
        updatedAt: new Date().toISOString(),
      };
    }

    const response = await fetch(`/api/events/${eventId}/stats`);
    return response.json();
  },

  // ============================================================================
  // CHECK-IN AVAILABILITY HELPERS
  // ============================================================================

  /**
   * Check if event is happening today
   */
  isEventToday(event: ClubEvent): boolean {
    const today = toDateStr(new Date());
    return event.date === today;
  },

  /**
   * Check if check-in is available for an event
   * (Event must be today and within reasonable time window)
   */
  isCheckInAvailable(event: ClubEvent): boolean {
    if (event.status !== 'PUBLISHED') return false;

    const now = new Date();
    const today = toDateStr(now);

    // Event must be today
    if (event.date !== today) return false;

    // Parse event times
    const [startHour, startMin] = event.startTime.split(':').map(Number);
    const eventStart = new Date(now);
    eventStart.setHours(startHour, startMin, 0, 0);

    // Check-in available 2 hours before and until event end
    const checkInStart = new Date(eventStart);
    checkInStart.setHours(checkInStart.getHours() - 2);

    let eventEnd: Date;
    if (event.endTime) {
      const [endHour, endMin] = event.endTime.split(':').map(Number);
      eventEnd = new Date(now);
      eventEnd.setHours(endHour, endMin, 0, 0);
    } else {
      // Default to 3 hours after start
      eventEnd = new Date(eventStart);
      eventEnd.setHours(eventEnd.getHours() + 3);
    }

    return now >= checkInStart && now <= eventEnd;
  },
};
