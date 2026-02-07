"use strict";
/**
 * Availability Location Drift & Bulk Update Tests
 *
 * Tests the new service methods added for Coach-Side Location Improvements:
 *
 *   1. updateBookingLocations(bookingIds, newLocation) — bulk-updates location on bookings
 *   2. checkLocationDrift(coachId, dayOfWeek, newLocation) — finds future bookings
 *      on a day-of-week with a different location
 *   3. checkConflicts() expanded return — now includes `id` and `location` fields
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = require("node:test");
const api_client_1 = require("@/services/api-client");
const availability_service_1 = require("@/services/availability-service");
const storage_keys_1 = require("@/constants/storage-keys");
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function resetStorage() {
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.AVAILABILITY_TEMPLATES, []);
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.AVAILABILITY_OVERRIDES, []);
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BOOKINGS, []);
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SESSION_OFFERINGS, []);
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.INVITE_SLOT_HOLDS, []);
}
const COACH_ID = 'coach_loc_drift';
const OTHER_COACH_ID = 'coach_other';
/**
 * Build a minimal Booking object for testing.
 * scheduledAt is an ISO string; dayOfWeek is derived from it.
 */
function makeBooking(overrides) {
    return {
        coachId: COACH_ID,
        status: 'CONFIRMED',
        location: 'Hyde Park',
        ...overrides,
    };
}
/**
 * Return the next occurrence (today or later) of a given dayOfWeek (0=Sun..6=Sat),
 * offset by `weeksAhead` weeks, formatted as an ISO date+time string.
 * This mirrors the logic inside checkLocationDrift so our test bookings
 * will always land on dates the method is looking at.
 */
function futureDate(dayOfWeek, weeksAhead, time = '10:00') {
    const today = new Date();
    const diff = ((dayOfWeek - today.getDay() + 7) % 7) + weeksAhead * 7;
    const d = new Date(today);
    d.setDate(today.getDate() + diff);
    const dateStr = d.toISOString().split('T')[0];
    return `${dateStr}T${time}:00`;
}
// ---------------------------------------------------------------------------
// Test Suite 1: updateBookingLocations
// ---------------------------------------------------------------------------
(0, node_test_1.describe)('updateBookingLocations', () => {
    (0, node_test_1.beforeEach)(async () => {
        await resetStorage();
    });
    (0, node_test_1.it)('updates location on specified booking IDs', async () => {
        const bookings = [
            makeBooking({ id: 'b1', scheduledAt: '2026-03-02T10:00:00', location: 'Hyde Park' }),
            makeBooking({ id: 'b2', scheduledAt: '2026-03-02T11:00:00', location: 'Hyde Park' }),
        ];
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BOOKINGS, bookings);
        await availability_service_1.availabilityService.updateBookingLocations(['b1', 'b2'], 'Victoria Park');
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.BOOKINGS, []);
        node_assert_1.default.strictEqual(stored[0].location, 'Victoria Park', 'b1 should be updated');
        node_assert_1.default.strictEqual(stored[1].location, 'Victoria Park', 'b2 should be updated');
    });
    (0, node_test_1.it)('does not change bookings not in the ID list', async () => {
        const bookings = [
            makeBooking({ id: 'b1', scheduledAt: '2026-03-02T10:00:00', location: 'Hyde Park' }),
            makeBooking({ id: 'b2', scheduledAt: '2026-03-02T11:00:00', location: 'Regent Park' }),
        ];
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BOOKINGS, bookings);
        await availability_service_1.availabilityService.updateBookingLocations(['b1'], 'Victoria Park');
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.BOOKINGS, []);
        node_assert_1.default.strictEqual(stored[0].location, 'Victoria Park', 'b1 should be updated');
        node_assert_1.default.strictEqual(stored[1].location, 'Regent Park', 'b2 should remain unchanged');
    });
    (0, node_test_1.it)('does nothing when bookingIds is empty', async () => {
        const bookings = [
            makeBooking({ id: 'b1', scheduledAt: '2026-03-02T10:00:00', location: 'Hyde Park' }),
        ];
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BOOKINGS, bookings);
        await availability_service_1.availabilityService.updateBookingLocations([], 'Victoria Park');
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.BOOKINGS, []);
        node_assert_1.default.strictEqual(stored[0].location, 'Hyde Park', 'booking should remain unchanged');
    });
    (0, node_test_1.it)('handles case where booking ID does not exist (no error)', async () => {
        const bookings = [
            makeBooking({ id: 'b1', scheduledAt: '2026-03-02T10:00:00', location: 'Hyde Park' }),
        ];
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BOOKINGS, bookings);
        // Should not throw
        await availability_service_1.availabilityService.updateBookingLocations(['nonexistent_id'], 'Victoria Park');
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.BOOKINGS, []);
        node_assert_1.default.strictEqual(stored[0].location, 'Hyde Park', 'existing booking should remain unchanged');
    });
});
// ---------------------------------------------------------------------------
// Test Suite 2: checkLocationDrift
// ---------------------------------------------------------------------------
(0, node_test_1.describe)('checkLocationDrift', () => {
    (0, node_test_1.beforeEach)(async () => {
        await resetStorage();
    });
    (0, node_test_1.it)('returns affected bookings when future bookings exist at a different location', async () => {
        // Use Wednesday (dayOfWeek=3) for this test
        const DOW = 3;
        const bookings = [
            makeBooking({
                id: 'b1',
                scheduledAt: futureDate(DOW, 0),
                location: 'Hyde Park',
                athleteName: 'Alice',
            }),
            makeBooking({
                id: 'b2',
                scheduledAt: futureDate(DOW, 1),
                location: 'Hyde Park',
                athleteName: 'Bob',
            }),
        ];
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BOOKINGS, bookings);
        const result = await availability_service_1.availabilityService.checkLocationDrift(COACH_ID, DOW, 'Victoria Park');
        node_assert_1.default.strictEqual(result.affectedCount, 2, 'Should find 2 affected bookings');
        node_assert_1.default.strictEqual(result.affectedBookings.length, 2);
        node_assert_1.default.strictEqual(result.affectedBookings[0].location, 'Hyde Park');
        node_assert_1.default.ok(result.affectedBookings[0].id, 'Should include booking id');
    });
    (0, node_test_1.it)('returns empty when all future bookings are at the same location as newLocation', async () => {
        const DOW = 4; // Thursday
        const bookings = [
            makeBooking({
                id: 'b1',
                scheduledAt: futureDate(DOW, 0),
                location: 'Victoria Park',
            }),
            makeBooking({
                id: 'b2',
                scheduledAt: futureDate(DOW, 1),
                location: 'Victoria Park',
            }),
        ];
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BOOKINGS, bookings);
        const result = await availability_service_1.availabilityService.checkLocationDrift(COACH_ID, DOW, 'Victoria Park');
        node_assert_1.default.strictEqual(result.affectedCount, 0, 'No bookings should be affected');
        node_assert_1.default.strictEqual(result.affectedBookings.length, 0);
    });
    (0, node_test_1.it)('returns empty when no bookings exist on that day-of-week', async () => {
        // Seed bookings on Monday (1), but query for Saturday (6)
        const bookings = [
            makeBooking({
                id: 'b1',
                scheduledAt: futureDate(1, 0), // Monday
                location: 'Hyde Park',
            }),
        ];
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BOOKINGS, bookings);
        const result = await availability_service_1.availabilityService.checkLocationDrift(COACH_ID, 6, 'Victoria Park');
        node_assert_1.default.strictEqual(result.affectedCount, 0, 'No bookings on Saturday');
        node_assert_1.default.strictEqual(result.affectedBookings.length, 0);
    });
    (0, node_test_1.it)('ignores cancelled bookings', async () => {
        const DOW = 2; // Tuesday
        const bookings = [
            makeBooking({
                id: 'b_cancelled',
                scheduledAt: futureDate(DOW, 0),
                location: 'Hyde Park',
                status: 'CANCELLED',
            }),
            makeBooking({
                id: 'b_active',
                scheduledAt: futureDate(DOW, 1),
                location: 'Hyde Park',
                status: 'CONFIRMED',
            }),
        ];
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BOOKINGS, bookings);
        const result = await availability_service_1.availabilityService.checkLocationDrift(COACH_ID, DOW, 'Victoria Park');
        node_assert_1.default.strictEqual(result.affectedCount, 1, 'Only non-cancelled booking should be affected');
        node_assert_1.default.strictEqual(result.affectedBookings[0].id, 'b_active');
    });
    (0, node_test_1.it)('only looks at bookings for the specified coachId', async () => {
        const DOW = 5; // Friday
        const bookings = [
            makeBooking({
                id: 'b_mine',
                coachId: COACH_ID,
                scheduledAt: futureDate(DOW, 0),
                location: 'Hyde Park',
            }),
            makeBooking({
                id: 'b_other',
                coachId: OTHER_COACH_ID,
                scheduledAt: futureDate(DOW, 0),
                location: 'Hyde Park',
            }),
        ];
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BOOKINGS, bookings);
        const result = await availability_service_1.availabilityService.checkLocationDrift(COACH_ID, DOW, 'Victoria Park');
        node_assert_1.default.strictEqual(result.affectedCount, 1, 'Only our coach booking should be found');
        node_assert_1.default.strictEqual(result.affectedBookings[0].id, 'b_mine');
    });
});
// ---------------------------------------------------------------------------
// Test Suite 3: checkConflicts expanded return
// ---------------------------------------------------------------------------
(0, node_test_1.describe)('checkConflicts – id and location in bookings', () => {
    (0, node_test_1.beforeEach)(async () => {
        await resetStorage();
    });
    (0, node_test_1.it)('returned bookings include id and location fields', async () => {
        const targetDate = '2026-04-06'; // A Monday well in the future
        const bookings = [
            makeBooking({
                id: 'conflict_b1',
                scheduledAt: `${targetDate}T09:00:00`,
                location: 'Battersea Park',
                athleteName: 'Charlie',
            }),
        ];
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BOOKINGS, bookings);
        const result = await availability_service_1.availabilityService.checkConflicts(COACH_ID, [targetDate]);
        node_assert_1.default.strictEqual(result.bookingCount, 1, 'Should find 1 conflicting booking');
        node_assert_1.default.strictEqual(result.bookings.length, 1);
        const b = result.bookings[0];
        node_assert_1.default.strictEqual(b.id, 'conflict_b1', 'Should include the booking id');
        node_assert_1.default.strictEqual(b.location, 'Battersea Park', 'Should include the booking location');
        node_assert_1.default.strictEqual(b.date, targetDate, 'Should include the date');
        node_assert_1.default.strictEqual(b.time, '09:00', 'Should include the time');
        node_assert_1.default.strictEqual(b.athleteName, 'Charlie', 'Should include athleteName');
    });
});
