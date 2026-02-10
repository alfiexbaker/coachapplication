/**
 * Tests for the RecurringBookingService
 *
 * These tests verify the core functionality of recurring booking subscriptions
 * including creation, pause/resume, cancellation, and booking generation.
 */

import assert from 'node:assert';
import test from 'node:test';

import {
  recurringBookingService,
  getDayName,
  getFrequencyLabel,
  getStatusLabel,
} from '../../services/recurring-booking-service';
import type {
  CreateRecurringBookingParams,
  RecurrenceFrequency,
} from '../../constants/types';

// Test data
const mockCreateParams: CreateRecurringBookingParams = {
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

test('getDayName returns correct day names', () => {
  assert.strictEqual(getDayName(0), 'Sunday');
  assert.strictEqual(getDayName(1), 'Monday');
  assert.strictEqual(getDayName(2), 'Tuesday');
  assert.strictEqual(getDayName(3), 'Wednesday');
  assert.strictEqual(getDayName(4), 'Thursday');
  assert.strictEqual(getDayName(5), 'Friday');
  assert.strictEqual(getDayName(6), 'Saturday');
  assert.strictEqual(getDayName(7), 'Unknown');
});

test('getFrequencyLabel returns correct labels', () => {
  assert.strictEqual(getFrequencyLabel('WEEKLY'), 'Every week');
  assert.strictEqual(getFrequencyLabel('BIWEEKLY'), 'Every 2 weeks');
  assert.strictEqual(getFrequencyLabel('MONTHLY'), 'Every month');
});

test('getStatusLabel returns correct labels', () => {
  assert.strictEqual(getStatusLabel('ACTIVE'), 'Active');
  assert.strictEqual(getStatusLabel('PAUSED'), 'Paused');
  assert.strictEqual(getStatusLabel('CANCELLED'), 'Cancelled');
  assert.strictEqual(getStatusLabel('EXPIRED'), 'Expired');
});

// ============================================================================
// Service CRUD Tests
// ============================================================================

test('createRecurring creates a new recurring booking', async () => {
  // Clear existing data
  await recurringBookingService.clearAll();

  const result = await recurringBookingService.createRecurring(mockCreateParams);

  assert.strictEqual(result.success, true, 'Creation should succeed');
  assert.ok(result.data, 'Should return created booking');
  assert.ok(result.data.id, 'Should have an ID');
  assert.strictEqual(result.data.userId, mockCreateParams.userId);
  assert.strictEqual(result.data.coachId, mockCreateParams.coachId);
  assert.strictEqual(result.data.dayOfWeek, mockCreateParams.dayOfWeek);
  assert.strictEqual(result.data.frequency, mockCreateParams.frequency);
  assert.strictEqual(result.data.status, 'ACTIVE');
  assert.strictEqual(result.data.sessionsCompleted, 0);
  assert.deepStrictEqual(result.data.generatedBookingIds, []);
});

test('list returns all recurring bookings', async () => {
  // Clear and seed
  await recurringBookingService.clearAll();
  await recurringBookingService.createRecurring(mockCreateParams);
  await recurringBookingService.createRecurring({
    ...mockCreateParams,
    userId: 'test_user_2',
    userName: 'Test User 2',
  });

  const bookings = await recurringBookingService.list();

  assert.strictEqual(bookings.success ? bookings.data.length : 0, 2, 'Should return 2 bookings');
});

test('getById returns specific booking', async () => {
  await recurringBookingService.clearAll();
  const result = await recurringBookingService.createRecurring(mockCreateParams);
  const id = result.data?.id;

  assert.ok(id, 'Should have created booking with ID');

  const booking = await recurringBookingService.getById(id);

  assert.ok(booking.success && booking.data, 'Should find booking by ID');
  assert.strictEqual(booking.success && booking.data ? booking.data.id : undefined, id);
});

test('getById returns undefined for non-existent ID', async () => {
  const booking = await recurringBookingService.getById('non_existent_id');

  assert.strictEqual(booking.success, true);
  assert.strictEqual(booking.data, undefined);
});

test('getUserRecurringBookings returns bookings for specific user', async () => {
  await recurringBookingService.clearAll();

  // Create bookings for different users
  await recurringBookingService.createRecurring(mockCreateParams);
  await recurringBookingService.createRecurring({
    ...mockCreateParams,
    userId: 'test_user_2',
    userName: 'Test User 2',
  });

  const userBookings = await recurringBookingService.getUserRecurringBookings('test_user_1');

  assert.strictEqual(userBookings.success ? userBookings.data.length : 0, 1);
  assert.strictEqual(userBookings.success ? userBookings.data[0].userId : '', 'test_user_1');
});

test('getCoachRecurringBookings returns bookings for specific coach', async () => {
  await recurringBookingService.clearAll();

  // Create bookings for different coaches
  await recurringBookingService.createRecurring(mockCreateParams);
  await recurringBookingService.createRecurring({
    ...mockCreateParams,
    userId: 'test_user_2',
    coachId: 'test_coach_2',
    coachName: 'Test Coach 2',
  });

  const coachBookings = await recurringBookingService.getCoachRecurringBookings('test_coach_1');

  assert.strictEqual(coachBookings.success ? coachBookings.data.length : 0, 1);
  assert.strictEqual(coachBookings.success ? coachBookings.data[0].coachId : '', 'test_coach_1');
});

// ============================================================================
// Pause/Resume Tests
// ============================================================================

test('pauseRecurring pauses an active subscription', async () => {
  await recurringBookingService.clearAll();
  const createResult = await recurringBookingService.createRecurring(mockCreateParams);
  const id = createResult.data?.id;

  assert.ok(id, 'Should have created booking');

  const pauseResult = await recurringBookingService.pauseRecurring(id, 'Going on vacation');

  assert.strictEqual(pauseResult.success, true);
  assert.ok(pauseResult.data);
  assert.strictEqual(pauseResult.data.status, 'PAUSED');
  assert.ok(pauseResult.data.pausedAt);
  assert.strictEqual(pauseResult.data.pauseReason, 'Going on vacation');
});

test('pauseRecurring fails for already paused subscription', async () => {
  await recurringBookingService.clearAll();
  const createResult = await recurringBookingService.createRecurring(mockCreateParams);
  const id = createResult.data?.id;

  assert.ok(id);

  await recurringBookingService.pauseRecurring(id);
  const secondPauseResult = await recurringBookingService.pauseRecurring(id);

  assert.strictEqual(secondPauseResult.success, false);
  assert.ok(secondPauseResult.error?.message.includes('paused'));
});

test('resumeRecurring resumes a paused subscription', async () => {
  await recurringBookingService.clearAll();
  const createResult = await recurringBookingService.createRecurring(mockCreateParams);
  const id = createResult.data?.id;

  assert.ok(id);

  await recurringBookingService.pauseRecurring(id);
  const resumeResult = await recurringBookingService.resumeRecurring(id);

  assert.strictEqual(resumeResult.success, true);
  assert.ok(resumeResult.data);
  assert.strictEqual(resumeResult.data.status, 'ACTIVE');
  assert.strictEqual(resumeResult.data.pausedAt, undefined);
  assert.strictEqual(resumeResult.data.pauseReason, undefined);
});

test('resumeRecurring fails for non-paused subscription', async () => {
  await recurringBookingService.clearAll();
  const createResult = await recurringBookingService.createRecurring(mockCreateParams);
  const id = createResult.data?.id;

  assert.ok(id);

  const resumeResult = await recurringBookingService.resumeRecurring(id);

  assert.strictEqual(resumeResult.success, false);
  assert.ok(resumeResult.error?.message.includes('active'));
});

// ============================================================================
// Cancellation Tests
// ============================================================================

test('cancelRecurring cancels an active subscription', async () => {
  await recurringBookingService.clearAll();
  const createResult = await recurringBookingService.createRecurring(mockCreateParams);
  const id = createResult.data?.id;

  assert.ok(id);

  const cancelResult = await recurringBookingService.cancelRecurring(id, 'No longer needed');

  assert.strictEqual(cancelResult.success, true);
  assert.ok(cancelResult.data);
  assert.strictEqual(cancelResult.data.status, 'CANCELLED');
  assert.ok(cancelResult.data.cancelledAt);
  assert.strictEqual(cancelResult.data.cancellationReason, 'No longer needed');
});

test('cancelRecurring fails for already cancelled subscription', async () => {
  await recurringBookingService.clearAll();
  const createResult = await recurringBookingService.createRecurring(mockCreateParams);
  const id = createResult.data?.id;

  assert.ok(id);

  await recurringBookingService.cancelRecurring(id);
  const secondCancelResult = await recurringBookingService.cancelRecurring(id);

  assert.strictEqual(secondCancelResult.success, false);
  assert.ok(secondCancelResult.error?.message.includes('cancelled'));
});

test('cancelRecurring can cancel a paused subscription', async () => {
  await recurringBookingService.clearAll();
  const createResult = await recurringBookingService.createRecurring(mockCreateParams);
  const id = createResult.data?.id;

  assert.ok(id);

  await recurringBookingService.pauseRecurring(id);
  const cancelResult = await recurringBookingService.cancelRecurring(id);

  assert.strictEqual(cancelResult.success, true);
  assert.ok(cancelResult.data);
  assert.strictEqual(cancelResult.data.status, 'CANCELLED');
});

// ============================================================================
// Booking Generation Tests
// ============================================================================

test('generateUpcomingBookings creates bookings for active subscription', async () => {
  await recurringBookingService.clearAll();
  const createResult = await recurringBookingService.createRecurring(mockCreateParams);
  const id = createResult.data?.id;

  assert.ok(id);

  const generateResult = await recurringBookingService.generateUpcomingBookings(id, 4);

  assert.strictEqual(generateResult.success, true);
  assert.ok(generateResult.data);
  assert.ok(generateResult.data.length > 0, 'Should generate at least 1 booking');
  assert.ok(generateResult.data.length <= 4, 'Should not exceed requested count');

  // Verify booking data
  const firstBooking = generateResult.data[0];
  assert.ok(firstBooking.bookingId);
  assert.strictEqual(firstBooking.recurringBookingId, id);
  assert.ok(firstBooking.scheduledAt);
  assert.strictEqual(firstBooking.status, 'CONFIRMED');
});

test('generateUpcomingBookings fails for paused subscription', async () => {
  await recurringBookingService.clearAll();
  const createResult = await recurringBookingService.createRecurring(mockCreateParams);
  const id = createResult.data?.id;

  assert.ok(id);

  await recurringBookingService.pauseRecurring(id);
  const generateResult = await recurringBookingService.generateUpcomingBookings(id);

  assert.strictEqual(generateResult.success, false);
  assert.ok(generateResult.error?.message.includes('paused'));
});

test('generateUpcomingBookings updates recurring booking with generated IDs', async () => {
  await recurringBookingService.clearAll();
  const createResult = await recurringBookingService.createRecurring(mockCreateParams);
  const id = createResult.data?.id;

  assert.ok(id);

  await recurringBookingService.generateUpcomingBookings(id, 2);

  const updatedBooking = await recurringBookingService.getById(id);

  assert.ok(updatedBooking.success && updatedBooking.data);
  assert.ok(
    updatedBooking.success && updatedBooking.data
      ? updatedBooking.data.generatedBookingIds.length > 0
      : false,
    'Should have generated booking IDs'
  );
});

// ============================================================================
// Update Tests
// ============================================================================

test('updateRecurring updates allowed fields', async () => {
  await recurringBookingService.clearAll();
  const createResult = await recurringBookingService.createRecurring(mockCreateParams);
  const id = createResult.data?.id;

  assert.ok(id);

  const updateResult = await recurringBookingService.updateRecurring(id, {
    time: '16:00',
    location: 'New Location',
    notes: 'Updated notes',
  });

  assert.strictEqual(updateResult.success, true);
  assert.ok(updateResult.data);
  assert.strictEqual(updateResult.data.time, '16:00');
  assert.strictEqual(updateResult.data.location, 'New Location');
  assert.strictEqual(updateResult.data.notes, 'Updated notes');
});

test('updateRecurring fails for cancelled subscription', async () => {
  await recurringBookingService.clearAll();
  const createResult = await recurringBookingService.createRecurring(mockCreateParams);
  const id = createResult.data?.id;

  assert.ok(id);

  await recurringBookingService.cancelRecurring(id);
  const updateResult = await recurringBookingService.updateRecurring(id, { time: '16:00' });

  assert.strictEqual(updateResult.success, false);
  assert.ok(updateResult.error?.message.includes('cancelled'));
});

// ============================================================================
// Session Completion Tests
// ============================================================================

test('markSessionCompleted increments session count', async () => {
  await recurringBookingService.clearAll();
  const createResult = await recurringBookingService.createRecurring(mockCreateParams);
  const id = createResult.data?.id;

  assert.ok(id);
  assert.strictEqual(createResult.data?.sessionsCompleted, 0);

  const completeResult = await recurringBookingService.markSessionCompleted(id);

  assert.strictEqual(completeResult.success, true);
  assert.ok(completeResult.data);
  assert.strictEqual(completeResult.data.sessionsCompleted, 1);
});

test('markSessionCompleted decrements remaining sessions', async () => {
  await recurringBookingService.clearAll();

  // Create with end date to have sessionsRemaining
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1);

  const createResult = await recurringBookingService.createRecurring({
    ...mockCreateParams,
    endDate: endDate.toISOString(),
  });
  const id = createResult.data?.id;

  assert.ok(id);

  const initialRemaining = createResult.data?.sessionsRemaining;
  assert.ok(initialRemaining !== undefined, 'Should have sessionsRemaining');

  const completeResult = await recurringBookingService.markSessionCompleted(id);

  assert.strictEqual(completeResult.success, true);
  assert.ok(completeResult.data);
  assert.strictEqual(completeResult.data.sessionsRemaining, initialRemaining - 1);
});

// ============================================================================
// Delete Tests
// ============================================================================

test('deleteRecurring removes booking', async () => {
  await recurringBookingService.clearAll();
  const createResult = await recurringBookingService.createRecurring(mockCreateParams);
  const id = createResult.data?.id;

  assert.ok(id);

  const deleteResult = await recurringBookingService.deleteRecurring(id);

  assert.strictEqual(deleteResult.success, true);

  const booking = await recurringBookingService.getById(id);
  assert.strictEqual(booking.success, true);
  assert.strictEqual(booking.data, undefined, 'Booking should be deleted');
});

test('deleteRecurring fails for non-existent booking', async () => {
  const deleteResult = await recurringBookingService.deleteRecurring('non_existent_id');

  assert.strictEqual(deleteResult.success, false);
  assert.ok(deleteResult.error?.message.includes('not found'));
});

// ============================================================================
// Frequency-Specific Tests
// ============================================================================

test('recurring booking supports all frequency types', async () => {
  await recurringBookingService.clearAll();

  const frequencies: RecurrenceFrequency[] = ['WEEKLY', 'BIWEEKLY', 'MONTHLY'];

  for (const frequency of frequencies) {
    const result = await recurringBookingService.createRecurring({
      ...mockCreateParams,
      frequency,
    });

    assert.strictEqual(result.success, true, `Should create ${frequency} booking`);
    assert.strictEqual(result.data?.frequency, frequency);
  }

  const bookings = await recurringBookingService.list();
  assert.strictEqual(bookings.success ? bookings.data.length : 0, 3, 'Should have 3 bookings');
});

// ============================================================================
// Active Bookings Filter Tests
// ============================================================================

test('getActiveUserRecurringBookings returns only active bookings', async () => {
  await recurringBookingService.clearAll();

  // Create active booking
  await recurringBookingService.createRecurring(mockCreateParams);

  // Create and pause another booking
  const paused = await recurringBookingService.createRecurring({
    ...mockCreateParams,
    dayOfWeek: 4,
  });
  if (paused.data?.id) {
    await recurringBookingService.pauseRecurring(paused.data.id);
  }

  const activeBookings = await recurringBookingService.getActiveUserRecurringBookings(
    mockCreateParams.userId
  );

  assert.strictEqual(activeBookings.success ? activeBookings.data.length : 0, 1, 'Should only return active booking');
  assert.strictEqual(activeBookings.success ? activeBookings.data[0].status : '', 'ACTIVE');
});

// Clean up after all tests
test('cleanup test data', async () => {
  await recurringBookingService.clearAll();
  const bookings = await recurringBookingService.list();
  assert.strictEqual(bookings.success ? bookings.data.length : 0, 0, 'Should be empty after cleanup');
});
