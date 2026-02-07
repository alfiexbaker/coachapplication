"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventAttendanceService = void 0;
const api_client_1 = require("../api-client");
const config_1 = require("@/constants/config");
const storage_keys_1 = require("@/constants/storage-keys");
const logger_1 = require("@/utils/logger");
const event_crud_service_1 = require("./event-crud-service");
const event_rsvp_service_1 = require("./event-rsvp-service");
const USE_MOCK = config_1.api.useMock;
const logger = (0, logger_1.createLogger)('EventAttendanceService');
// Location validation threshold in meters
const LOCATION_VALIDATION_THRESHOLD = 500;
// ============================================================================
// MOCK ATTENDANCE DATA
// ============================================================================
const MOCK_ATTENDANCE = [
    {
        id: 'attendance_1',
        eventId: 'event_1',
        userId: 'parent_1',
        userName: 'Sarah Baker',
        userRole: 'PARENT',
        checkedInAt: '2026-06-15T13:45:00Z',
        checkedInBy: 'coach1',
        checkedInByName: 'Director Kelly',
        checkInMethod: 'COACH',
        guestsCheckedIn: 2,
        locationValidated: true,
        distanceFromVenue: 25,
    },
];
let attendanceCache = [...MOCK_ATTENDANCE];
// ============================================================================
// PERSISTENCE HELPERS
// ============================================================================
async function loadAttendance() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.EVENT_ATTENDANCE, null);
        if (stored)
            return stored;
    }
    catch (error) {
        logger.error('Failed to load attendance', error);
    }
    return [...MOCK_ATTENDANCE];
}
async function saveAttendance(attendance) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.EVENT_ATTENDANCE, attendance);
        attendanceCache = attendance;
    }
    catch (error) {
        logger.error('Failed to save attendance', error);
    }
}
// ============================================================================
// GEO HELPERS
// ============================================================================
/**
 * Calculate distance between two coordinates in meters using Haversine formula
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
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
exports.eventAttendanceService = {
    /**
     * Check in a user to an event
     * Supports location validation for in-person events
     */
    async checkIn(input) {
        const attendance = {
            id: `attendance_${Date.now()}`,
            eventId: input.eventId,
            userId: input.userId,
            userName: input.userName,
            userPhotoUrl: input.userPhotoUrl,
            userRole: input.userRole,
            checkedInAt: new Date().toISOString(),
            checkedInBy: input.checkedInBy,
            checkedInByName: input.checkedInByName,
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
            const distance = calculateDistance(input.location.latitude, input.location.longitude, venueLocation.latitude, venueLocation.longitude);
            attendance.distanceFromVenue = Math.round(distance);
            attendance.locationValidated = distance <= LOCATION_VALIDATION_THRESHOLD;
        }
        if (USE_MOCK) {
            attendanceCache = await loadAttendance();
            // Check if already checked in
            const existingIndex = attendanceCache.findIndex((a) => a.eventId === input.eventId && a.userId === input.userId);
            if (existingIndex >= 0) {
                // Update existing check-in (e.g., for guest count updates)
                attendance.id = attendanceCache[existingIndex].id;
                attendanceCache[existingIndex] = attendance;
            }
            else {
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
    async removeCheckIn(eventId, userId) {
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
    async getAttendeeList(eventId) {
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
    async isUserCheckedIn(eventId, userId) {
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
    async getUserAttendance(eventId, userId) {
        if (USE_MOCK) {
            attendanceCache = await loadAttendance();
            return attendanceCache.find((a) => a.eventId === eventId && a.userId === userId) || null;
        }
        const response = await fetch(`/api/events/${eventId}/attendance/${userId}`);
        if (!response.ok)
            return null;
        return response.json();
    },
    /**
     * Get attendance statistics for an event
     */
    async getAttendanceStats(eventId) {
        if (USE_MOCK) {
            const rsvpsCache = await (0, event_rsvp_service_1.loadRSVPs)();
            attendanceCache = await loadAttendance();
            const eventsCache = await (0, event_crud_service_1.loadEvents)();
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
    isEventToday(event) {
        const today = new Date().toISOString().split('T')[0];
        return event.date === today;
    },
    /**
     * Check if check-in is available for an event
     * (Event must be today and within reasonable time window)
     */
    isCheckInAvailable(event) {
        if (event.status !== 'PUBLISHED')
            return false;
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        // Event must be today
        if (event.date !== today)
            return false;
        // Parse event times
        const [startHour, startMin] = event.startTime.split(':').map(Number);
        const eventStart = new Date(now);
        eventStart.setHours(startHour, startMin, 0, 0);
        // Check-in available 2 hours before and until event end
        const checkInStart = new Date(eventStart);
        checkInStart.setHours(checkInStart.getHours() - 2);
        let eventEnd;
        if (event.endTime) {
            const [endHour, endMin] = event.endTime.split(':').map(Number);
            eventEnd = new Date(now);
            eventEnd.setHours(endHour, endMin, 0, 0);
        }
        else {
            // Default to 3 hours after start
            eventEnd = new Date(eventStart);
            eventEnd.setHours(eventEnd.getHours() + 3);
        }
        return now >= checkInStart && now <= eventEnd;
    },
};
