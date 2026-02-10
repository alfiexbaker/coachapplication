"use strict";
/**
 * Tests for the RecurringBookingService
 *
 * These tests verify the core functionality of recurring booking subscriptions
 * including creation, pause/resume, cancellation, and booking generation.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = __importDefault(require("node:test"));
const recurring_booking_service_1 = require("../../services/recurring-booking-service");
// Test data
const mockCreateParams = {
    userId: 'test_user_1',
    userName: 'Test User',
    coachId: 'test_coach_1',
    coachName: 'Test Coach',
    coachPhotoUrl: 'https://example.com/photo.jpg',
    athleteId: 'test_athlete_1',
    athleteName: 'Test Athlete',
    dayOfWeek: 2, // Tuesday
    time: '14:00',
    duration: 60,
    location: 'Test Location',
    sessionType: '1-on-1 Training',
    frequency: 'WEEKLY',
    startDate: new Date().toISOString(),
    pricePerSession: 75,
    notes: 'Test notes',
};
// ============================================================================
// Utility Function Tests
// ============================================================================
(0, node_test_1.default)('getDayName returns correct day names', () => {
    node_assert_1.default.strictEqual((0, recurring_booking_service_1.getDayName)(0), 'Sunday');
    node_assert_1.default.strictEqual((0, recurring_booking_service_1.getDayName)(1), 'Monday');
    node_assert_1.default.strictEqual((0, recurring_booking_service_1.getDayName)(2), 'Tuesday');
    node_assert_1.default.strictEqual((0, recurring_booking_service_1.getDayName)(3), 'Wednesday');
    node_assert_1.default.strictEqual((0, recurring_booking_service_1.getDayName)(4), 'Thursday');
    node_assert_1.default.strictEqual((0, recurring_booking_service_1.getDayName)(5), 'Friday');
    node_assert_1.default.strictEqual((0, recurring_booking_service_1.getDayName)(6), 'Saturday');
    node_assert_1.default.strictEqual((0, recurring_booking_service_1.getDayName)(7), 'Unknown');
});
(0, node_test_1.default)('getFrequencyLabel returns correct labels', () => {
    node_assert_1.default.strictEqual((0, recurring_booking_service_1.getFrequencyLabel)('WEEKLY'), 'Every week');
    node_assert_1.default.strictEqual((0, recurring_booking_service_1.getFrequencyLabel)('BIWEEKLY'), 'Every 2 weeks');
    node_assert_1.default.strictEqual((0, recurring_booking_service_1.getFrequencyLabel)('MONTHLY'), 'Every month');
});
(0, node_test_1.default)('getStatusLabel returns correct labels', () => {
    node_assert_1.default.strictEqual((0, recurring_booking_service_1.getStatusLabel)('ACTIVE'), 'Active');
    node_assert_1.default.strictEqual((0, recurring_booking_service_1.getStatusLabel)('PAUSED'), 'Paused');
    node_assert_1.default.strictEqual((0, recurring_booking_service_1.getStatusLabel)('CANCELLED'), 'Cancelled');
    node_assert_1.default.strictEqual((0, recurring_booking_service_1.getStatusLabel)('EXPIRED'), 'Expired');
});
// ============================================================================
// Service CRUD Tests
// ============================================================================
(0, node_test_1.default)('createRecurring creates a new recurring booking', async () => {
    // Clear existing data
    await recurring_booking_service_1.recurringBookingService.clearAll();
    const result = await recurring_booking_service_1.recurringBookingService.createRecurring(mockCreateParams);
    node_assert_1.default.strictEqual(result.success, true, 'Creation should succeed');
    node_assert_1.default.ok(result.data, 'Should return created booking');
    node_assert_1.default.ok(result.data.id, 'Should have an ID');
    node_assert_1.default.strictEqual(result.data.userId, mockCreateParams.userId);
    node_assert_1.default.strictEqual(result.data.coachId, mockCreateParams.coachId);
    node_assert_1.default.strictEqual(result.data.dayOfWeek, mockCreateParams.dayOfWeek);
    node_assert_1.default.strictEqual(result.data.frequency, mockCreateParams.frequency);
    node_assert_1.default.strictEqual(result.data.status, 'ACTIVE');
    node_assert_1.default.strictEqual(result.data.sessionsCompleted, 0);
    node_assert_1.default.deepStrictEqual(result.data.generatedBookingIds, []);
});
(0, node_test_1.default)('list returns all recurring bookings', async () => {
    // Clear and seed
    await recurring_booking_service_1.recurringBookingService.clearAll();
    await recurring_booking_service_1.recurringBookingService.createRecurring(mockCreateParams);
    await recurring_booking_service_1.recurringBookingService.createRecurring({
        ...mockCreateParams,
        userId: 'test_user_2',
        userName: 'Test User 2',
    });
    const bookings = await recurring_booking_service_1.recurringBookingService.list();
    node_assert_1.default.strictEqual(bookings.success ? bookings.data.length : 0, 2, 'Should return 2 bookings');
});
(0, node_test_1.default)('getById returns specific booking', async () => {
    await recurring_booking_service_1.recurringBookingService.clearAll();
    const result = await recurring_booking_service_1.recurringBookingService.createRecurring(mockCreateParams);
    const id = result.data?.id;
    node_assert_1.default.ok(id, 'Should have created booking with ID');
    const booking = await recurring_booking_service_1.recurringBookingService.getById(id);
    node_assert_1.default.ok(booking.success && booking.data, 'Should find booking by ID');
    node_assert_1.default.strictEqual(booking.success && booking.data ? booking.data.id : undefined, id);
});
(0, node_test_1.default)('getById returns undefined for non-existent ID', async () => {
    const booking = await recurring_booking_service_1.recurringBookingService.getById('non_existent_id');
    node_assert_1.default.strictEqual(booking.success, true);
    node_assert_1.default.strictEqual(booking.data, undefined);
});
(0, node_test_1.default)('getUserRecurringBookings returns bookings for specific user', async () => {
    await recurring_booking_service_1.recurringBookingService.clearAll();
    // Create bookings for different users
    await recurring_booking_service_1.recurringBookingService.createRecurring(mockCreateParams);
    await recurring_booking_service_1.recurringBookingService.createRecurring({
        ...mockCreateParams,
        userId: 'test_user_2',
        userName: 'Test User 2',
    });
    const userBookings = await recurring_booking_service_1.recurringBookingService.getUserRecurringBookings('test_user_1');
    node_assert_1.default.strictEqual(userBookings.success ? userBookings.data.length : 0, 1);
    node_assert_1.default.strictEqual(userBookings.success ? userBookings.data[0].userId : '', 'test_user_1');
});
(0, node_test_1.default)('getCoachRecurringBookings returns bookings for specific coach', async () => {
    await recurring_booking_service_1.recurringBookingService.clearAll();
    // Create bookings for different coaches
    await recurring_booking_service_1.recurringBookingService.createRecurring(mockCreateParams);
    await recurring_booking_service_1.recurringBookingService.createRecurring({
        ...mockCreateParams,
        userId: 'test_user_2',
        coachId: 'test_coach_2',
        coachName: 'Test Coach 2',
    });
    const coachBookings = await recurring_booking_service_1.recurringBookingService.getCoachRecurringBookings('test_coach_1');
    node_assert_1.default.strictEqual(coachBookings.success ? coachBookings.data.length : 0, 1);
    node_assert_1.default.strictEqual(coachBookings.success ? coachBookings.data[0].coachId : '', 'test_coach_1');
});
// ============================================================================
// Pause/Resume Tests
// ============================================================================
(0, node_test_1.default)('pauseRecurring pauses an active subscription', async () => {
    await recurring_booking_service_1.recurringBookingService.clearAll();
    const createResult = await recurring_booking_service_1.recurringBookingService.createRecurring(mockCreateParams);
    const id = createResult.data?.id;
    node_assert_1.default.ok(id, 'Should have created booking');
    const pauseResult = await recurring_booking_service_1.recurringBookingService.pauseRecurring(id, 'Going on vacation');
    node_assert_1.default.strictEqual(pauseResult.success, true);
    node_assert_1.default.ok(pauseResult.data);
    node_assert_1.default.strictEqual(pauseResult.data.status, 'PAUSED');
    node_assert_1.default.ok(pauseResult.data.pausedAt);
    node_assert_1.default.strictEqual(pauseResult.data.pauseReason, 'Going on vacation');
});
(0, node_test_1.default)('pauseRecurring fails for already paused subscription', async () => {
    await recurring_booking_service_1.recurringBookingService.clearAll();
    const createResult = await recurring_booking_service_1.recurringBookingService.createRecurring(mockCreateParams);
    const id = createResult.data?.id;
    node_assert_1.default.ok(id);
    await recurring_booking_service_1.recurringBookingService.pauseRecurring(id);
    const secondPauseResult = await recurring_booking_service_1.recurringBookingService.pauseRecurring(id);
    node_assert_1.default.strictEqual(secondPauseResult.success, false);
    node_assert_1.default.ok(secondPauseResult.error?.message.includes('paused'));
});
(0, node_test_1.default)('resumeRecurring resumes a paused subscription', async () => {
    await recurring_booking_service_1.recurringBookingService.clearAll();
    const createResult = await recurring_booking_service_1.recurringBookingService.createRecurring(mockCreateParams);
    const id = createResult.data?.id;
    node_assert_1.default.ok(id);
    await recurring_booking_service_1.recurringBookingService.pauseRecurring(id);
    const resumeResult = await recurring_booking_service_1.recurringBookingService.resumeRecurring(id);
    node_assert_1.default.strictEqual(resumeResult.success, true);
    node_assert_1.default.ok(resumeResult.data);
    node_assert_1.default.strictEqual(resumeResult.data.status, 'ACTIVE');
    node_assert_1.default.strictEqual(resumeResult.data.pausedAt, undefined);
    node_assert_1.default.strictEqual(resumeResult.data.pauseReason, undefined);
});
(0, node_test_1.default)('resumeRecurring fails for non-paused subscription', async () => {
    await recurring_booking_service_1.recurringBookingService.clearAll();
    const createResult = await recurring_booking_service_1.recurringBookingService.createRecurring(mockCreateParams);
    const id = createResult.data?.id;
    node_assert_1.default.ok(id);
    const resumeResult = await recurring_booking_service_1.recurringBookingService.resumeRecurring(id);
    node_assert_1.default.strictEqual(resumeResult.success, false);
    node_assert_1.default.ok(resumeResult.error?.message.includes('active'));
});
// ============================================================================
// Cancellation Tests
// ============================================================================
(0, node_test_1.default)('cancelRecurring cancels an active subscription', async () => {
    await recurring_booking_service_1.recurringBookingService.clearAll();
    const createResult = await recurring_booking_service_1.recurringBookingService.createRecurring(mockCreateParams);
    const id = createResult.data?.id;
    node_assert_1.default.ok(id);
    const cancelResult = await recurring_booking_service_1.recurringBookingService.cancelRecurring(id, 'No longer needed');
    node_assert_1.default.strictEqual(cancelResult.success, true);
    node_assert_1.default.ok(cancelResult.data);
    node_assert_1.default.strictEqual(cancelResult.data.status, 'CANCELLED');
    node_assert_1.default.ok(cancelResult.data.cancelledAt);
    node_assert_1.default.strictEqual(cancelResult.data.cancellationReason, 'No longer needed');
});
(0, node_test_1.default)('cancelRecurring fails for already cancelled subscription', async () => {
    await recurring_booking_service_1.recurringBookingService.clearAll();
    const createResult = await recurring_booking_service_1.recurringBookingService.createRecurring(mockCreateParams);
    const id = createResult.data?.id;
    node_assert_1.default.ok(id);
    await recurring_booking_service_1.recurringBookingService.cancelRecurring(id);
    const secondCancelResult = await recurring_booking_service_1.recurringBookingService.cancelRecurring(id);
    node_assert_1.default.strictEqual(secondCancelResult.success, false);
    node_assert_1.default.ok(secondCancelResult.error?.message.includes('cancelled'));
});
(0, node_test_1.default)('cancelRecurring can cancel a paused subscription', async () => {
    await recurring_booking_service_1.recurringBookingService.clearAll();
    const createResult = await recurring_booking_service_1.recurringBookingService.createRecurring(mockCreateParams);
    const id = createResult.data?.id;
    node_assert_1.default.ok(id);
    await recurring_booking_service_1.recurringBookingService.pauseRecurring(id);
    const cancelResult = await recurring_booking_service_1.recurringBookingService.cancelRecurring(id);
    node_assert_1.default.strictEqual(cancelResult.success, true);
    node_assert_1.default.ok(cancelResult.data);
    node_assert_1.default.strictEqual(cancelResult.data.status, 'CANCELLED');
});
// ============================================================================
// Booking Generation Tests
// ============================================================================
(0, node_test_1.default)('generateUpcomingBookings creates bookings for active subscription', async () => {
    await recurring_booking_service_1.recurringBookingService.clearAll();
    const createResult = await recurring_booking_service_1.recurringBookingService.createRecurring(mockCreateParams);
    const id = createResult.data?.id;
    node_assert_1.default.ok(id);
    const generateResult = await recurring_booking_service_1.recurringBookingService.generateUpcomingBookings(id, 4);
    node_assert_1.default.strictEqual(generateResult.success, true);
    node_assert_1.default.ok(generateResult.data);
    node_assert_1.default.ok(generateResult.data.length > 0, 'Should generate at least 1 booking');
    node_assert_1.default.ok(generateResult.data.length <= 4, 'Should not exceed requested count');
    // Verify booking data
    const firstBooking = generateResult.data[0];
    node_assert_1.default.ok(firstBooking.bookingId);
    node_assert_1.default.strictEqual(firstBooking.recurringBookingId, id);
    node_assert_1.default.ok(firstBooking.scheduledAt);
    node_assert_1.default.strictEqual(firstBooking.status, 'CONFIRMED');
});
(0, node_test_1.default)('generateUpcomingBookings fails for paused subscription', async () => {
    await recurring_booking_service_1.recurringBookingService.clearAll();
    const createResult = await recurring_booking_service_1.recurringBookingService.createRecurring(mockCreateParams);
    const id = createResult.data?.id;
    node_assert_1.default.ok(id);
    await recurring_booking_service_1.recurringBookingService.pauseRecurring(id);
    const generateResult = await recurring_booking_service_1.recurringBookingService.generateUpcomingBookings(id);
    node_assert_1.default.strictEqual(generateResult.success, false);
    node_assert_1.default.ok(generateResult.error?.message.includes('paused'));
});
(0, node_test_1.default)('generateUpcomingBookings updates recurring booking with generated IDs', async () => {
    await recurring_booking_service_1.recurringBookingService.clearAll();
    const createResult = await recurring_booking_service_1.recurringBookingService.createRecurring(mockCreateParams);
    const id = createResult.data?.id;
    node_assert_1.default.ok(id);
    await recurring_booking_service_1.recurringBookingService.generateUpcomingBookings(id, 2);
    const updatedBooking = await recurring_booking_service_1.recurringBookingService.getById(id);
    node_assert_1.default.ok(updatedBooking.success && updatedBooking.data);
    node_assert_1.default.ok(updatedBooking.success && updatedBooking.data
        ? updatedBooking.data.generatedBookingIds.length > 0
        : false, 'Should have generated booking IDs');
});
// ============================================================================
// Update Tests
// ============================================================================
(0, node_test_1.default)('updateRecurring updates allowed fields', async () => {
    await recurring_booking_service_1.recurringBookingService.clearAll();
    const createResult = await recurring_booking_service_1.recurringBookingService.createRecurring(mockCreateParams);
    const id = createResult.data?.id;
    node_assert_1.default.ok(id);
    const updateResult = await recurring_booking_service_1.recurringBookingService.updateRecurring(id, {
        time: '16:00',
        location: 'New Location',
        notes: 'Updated notes',
    });
    node_assert_1.default.strictEqual(updateResult.success, true);
    node_assert_1.default.ok(updateResult.data);
    node_assert_1.default.strictEqual(updateResult.data.time, '16:00');
    node_assert_1.default.strictEqual(updateResult.data.location, 'New Location');
    node_assert_1.default.strictEqual(updateResult.data.notes, 'Updated notes');
});
(0, node_test_1.default)('updateRecurring fails for cancelled subscription', async () => {
    await recurring_booking_service_1.recurringBookingService.clearAll();
    const createResult = await recurring_booking_service_1.recurringBookingService.createRecurring(mockCreateParams);
    const id = createResult.data?.id;
    node_assert_1.default.ok(id);
    await recurring_booking_service_1.recurringBookingService.cancelRecurring(id);
    const updateResult = await recurring_booking_service_1.recurringBookingService.updateRecurring(id, { time: '16:00' });
    node_assert_1.default.strictEqual(updateResult.success, false);
    node_assert_1.default.ok(updateResult.error?.message.includes('cancelled'));
});
// ============================================================================
// Session Completion Tests
// ============================================================================
(0, node_test_1.default)('markSessionCompleted increments session count', async () => {
    await recurring_booking_service_1.recurringBookingService.clearAll();
    const createResult = await recurring_booking_service_1.recurringBookingService.createRecurring(mockCreateParams);
    const id = createResult.data?.id;
    node_assert_1.default.ok(id);
    node_assert_1.default.strictEqual(createResult.data?.sessionsCompleted, 0);
    const completeResult = await recurring_booking_service_1.recurringBookingService.markSessionCompleted(id);
    node_assert_1.default.strictEqual(completeResult.success, true);
    node_assert_1.default.ok(completeResult.data);
    node_assert_1.default.strictEqual(completeResult.data.sessionsCompleted, 1);
});
(0, node_test_1.default)('markSessionCompleted decrements remaining sessions', async () => {
    await recurring_booking_service_1.recurringBookingService.clearAll();
    // Create with end date to have sessionsRemaining
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    const createResult = await recurring_booking_service_1.recurringBookingService.createRecurring({
        ...mockCreateParams,
        endDate: endDate.toISOString(),
    });
    const id = createResult.data?.id;
    node_assert_1.default.ok(id);
    const initialRemaining = createResult.data?.sessionsRemaining;
    node_assert_1.default.ok(initialRemaining !== undefined, 'Should have sessionsRemaining');
    const completeResult = await recurring_booking_service_1.recurringBookingService.markSessionCompleted(id);
    node_assert_1.default.strictEqual(completeResult.success, true);
    node_assert_1.default.ok(completeResult.data);
    node_assert_1.default.strictEqual(completeResult.data.sessionsRemaining, initialRemaining - 1);
});
// ============================================================================
// Delete Tests
// ============================================================================
(0, node_test_1.default)('deleteRecurring removes booking', async () => {
    await recurring_booking_service_1.recurringBookingService.clearAll();
    const createResult = await recurring_booking_service_1.recurringBookingService.createRecurring(mockCreateParams);
    const id = createResult.data?.id;
    node_assert_1.default.ok(id);
    const deleteResult = await recurring_booking_service_1.recurringBookingService.deleteRecurring(id);
    node_assert_1.default.strictEqual(deleteResult.success, true);
    const booking = await recurring_booking_service_1.recurringBookingService.getById(id);
    node_assert_1.default.strictEqual(booking.success, true);
    node_assert_1.default.strictEqual(booking.data, undefined, 'Booking should be deleted');
});
(0, node_test_1.default)('deleteRecurring fails for non-existent booking', async () => {
    const deleteResult = await recurring_booking_service_1.recurringBookingService.deleteRecurring('non_existent_id');
    node_assert_1.default.strictEqual(deleteResult.success, false);
    node_assert_1.default.ok(deleteResult.error?.message.includes('not found'));
});
// ============================================================================
// Frequency-Specific Tests
// ============================================================================
(0, node_test_1.default)('recurring booking supports all frequency types', async () => {
    await recurring_booking_service_1.recurringBookingService.clearAll();
    const frequencies = ['WEEKLY', 'BIWEEKLY', 'MONTHLY'];
    for (const frequency of frequencies) {
        const result = await recurring_booking_service_1.recurringBookingService.createRecurring({
            ...mockCreateParams,
            frequency,
        });
        node_assert_1.default.strictEqual(result.success, true, `Should create ${frequency} booking`);
        node_assert_1.default.strictEqual(result.data?.frequency, frequency);
    }
    const bookings = await recurring_booking_service_1.recurringBookingService.list();
    node_assert_1.default.strictEqual(bookings.success ? bookings.data.length : 0, 3, 'Should have 3 bookings');
});
// ============================================================================
// Active Bookings Filter Tests
// ============================================================================
(0, node_test_1.default)('getActiveUserRecurringBookings returns only active bookings', async () => {
    await recurring_booking_service_1.recurringBookingService.clearAll();
    // Create active booking
    await recurring_booking_service_1.recurringBookingService.createRecurring(mockCreateParams);
    // Create and pause another booking
    const paused = await recurring_booking_service_1.recurringBookingService.createRecurring({
        ...mockCreateParams,
        dayOfWeek: 4,
    });
    if (paused.data?.id) {
        await recurring_booking_service_1.recurringBookingService.pauseRecurring(paused.data.id);
    }
    const activeBookings = await recurring_booking_service_1.recurringBookingService.getActiveUserRecurringBookings(mockCreateParams.userId);
    node_assert_1.default.strictEqual(activeBookings.success ? activeBookings.data.length : 0, 1, 'Should only return active booking');
    node_assert_1.default.strictEqual(activeBookings.success ? activeBookings.data[0].status : '', 'ACTIVE');
});
// Clean up after all tests
(0, node_test_1.default)('cleanup test data', async () => {
    await recurring_booking_service_1.recurringBookingService.clearAll();
    const bookings = await recurring_booking_service_1.recurringBookingService.list();
    node_assert_1.default.strictEqual(bookings.success ? bookings.data.length : 0, 0, 'Should be empty after cleanup');
});
