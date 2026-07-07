import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { bookingCrudService } from '@/services/booking/booking-crud-service';
import { bookingAuthorityService } from '@/services/booking/booking-authority-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { blockService } from '@/services/block-service';
import { authService } from '@/services/auth-service';
import { notificationService } from '@/services/notification-service';
import { notificationTriggers } from '@/services/notification-trigger';

/** Helper to create a valid booking params object with overrides. */
function makeParams(overrides: Record<string, unknown> = {}) {
  return {
    coachId: 'coach-' + Math.random().toString(36).slice(2),
    coachName: 'Test Coach',
    athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
    athleteNames: ['Test Athlete'],
    bookedById: 'parent-' + Math.random().toString(36).slice(2),
    bookedByName: 'Test Parent',
    scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
    duration: 60,
    location: 'Test Field',
    service: '1-on-1 Coaching',
    serviceType: 'COACHING',
    skipAvailabilityValidation: true,
    ...overrides,
  };
}

describe('BookingCrudService — error paths', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.BOOKINGS);
    await apiClient.remove(STORAGE_KEYS.NOTIFICATIONS);
    await apiClient.remove(STORAGE_KEYS.COACH_SESSIONS);
    await apiClient.remove(STORAGE_KEYS.PROGRESS_SELF_ASSESSMENT_PROMPTS);
    await apiClient.remove(STORAGE_KEYS.PROGRESS_SELF_ASSESSMENTS);
    await apiClient.remove(STORAGE_KEYS.SESSION_JOURNAL);
    await apiClient.remove(STORAGE_KEYS.BLOCKED_USERS);
    bookingCrudService.resetDraft();
  });

  it('should return err() when updating with invalid id', async () => {
    const result = await bookingCrudService.updateBooking(
      'nonexistent-id-' + Math.random().toString(36).slice(2),
      { status: 'CONFIRMED' },
    );

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, 'NOT_FOUND');
    }
  });

  it('should return err() when cancelling already-cancelled booking', async () => {
    // Create a booking first
    const createResult = await bookingCrudService.createBooking(makeParams());
    assert.equal(createResult.success, true);
    if (!createResult.success) return;

    // First cancel succeeds
    const firstCancel = await bookingCrudService.cancel(
      createResult.data.id,
      'Changed plans',
      'parent',
    );
    assert.ok(firstCancel);
    assert.equal(firstCancel.status, 'CANCELLED');

    // Second cancel should return undefined (gracefully blocked)
    const secondCancel = await bookingCrudService.cancel(
      createResult.data.id,
      'Trying again',
      'parent',
    );
    assert.equal(secondCancel, undefined);
  });

  it('should return err() for missing coachId', async () => {
    // createBooking with empty coachId — the availability validation (not skipped)
    // will fail because coachId is empty. With skipAvailabilityValidation the booking
    // will be created but with an empty coachId. The service doesn't have explicit
    // coachId validation, so we test without skipAvailabilityValidation.
    const result = await bookingCrudService.createBooking(
      makeParams({
        coachId: '',
        skipAvailabilityValidation: false,
      }),
    );

    // Availability validation will fail for empty coachId
    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, 'VALIDATION');
    }
  });

  it('should return err() for past scheduledAt date', async () => {
    // A date in the past won't have available slots, so availability validation fails
    const pastDate = new Date(Date.now() - 86_400_000).toISOString();
    const result = await bookingCrudService.createBooking(
      makeParams({
        scheduledAt: pastDate,
        skipAvailabilityValidation: false,
      }),
    );

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, 'VALIDATION');
    }
  });

  it('should return err() for zero duration', async () => {
    // Zero duration will cause the availability validation to fail
    const result = await bookingCrudService.createBooking(
      makeParams({
        duration: 0,
        skipAvailabilityValidation: false,
      }),
    );

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, 'VALIDATION');
    }
  });

  it('should not emit BOOKING_CREATED on validation failure', async () => {
    const events: unknown[] = [];
    const unsub = onTyped(ServiceEvents.BOOKING_CREATED, (payload) => {
      events.push(payload);
    });

    try {
      // Missing scheduledAt → VALIDATION error, no event should be emitted
      const result = await bookingCrudService.createBooking(makeParams({ scheduledAt: '' }));

      assert.equal(result.success, false);
      // Allow a tick for any async event emission
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.equal(events.length, 0, 'BOOKING_CREATED should not fire on validation failure');
    } finally {
      unsub();
    }
  });

  it('should return a block-specific conflict error when booking is blocked', async () => {
    const coachId = 'coach_blocked';
    const bookedById = 'parent_blocked';
    await blockService.blockUser(bookedById, coachId);

    const result = await bookingCrudService.createBooking(
      makeParams({
        coachId,
        bookedById,
      }),
    );

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, 'CONFLICT');
      assert.equal(
        result.error.message,
        'Booking is unavailable because one side has blocked the other.',
      );
    }
  });

  it('does not create local notification overlays after API booking create', async () => {
    const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
    const originalGetCurrentUser = authService.getCurrentUser;
    const originalCreateBooking = bookingAuthorityService.createBooking;
    const originalCreateNotification = notificationService.create;
    const originalBookingConfirmed = notificationTriggers.bookingConfirmed;
    let notificationCreates = 0;
    let notificationTriggersCount = 0;

    Object.defineProperty(apiClient, 'isMockMode', {
      configurable: true,
      get: () => false,
    });
    authService.getCurrentUser = async () => ({
      id: 'parent_api_booking',
      email: 'parent.api.booking@example.com',
      accountType: 'PARENT',
      firstName: 'API',
      lastName: 'Parent',
      isVerified: true,
      onboardingComplete: true,
      createdAt: '2026-07-03T10:00:00.000Z',
      updatedAt: '2026-07-03T10:00:00.000Z',
    });
    bookingAuthorityService.createBooking = async () => ({
      success: true,
      data: {
        id: 'bok_api_no_local_notif',
        coachUserId: 'coach_api_booking',
        bookedByUserId: 'parent_api_booking',
        status: 'CONFIRMED',
        scheduledAt: '2026-07-04T10:00:00.000Z',
        durationMinutes: 60,
        location: 'Test Field',
        serviceType: 'COACHING',
        objectives: [],
        notes: null,
        priceMinor: 5000,
        currency: 'GBP',
        participants: [
          {
            athleteId: 'parent_api_booking',
            guardianUserId: 'parent_api_booking',
            status: 'confirmed',
          },
        ],
        version: 1,
        createdAt: '2026-07-03T10:00:00.000Z',
        updatedAt: '2026-07-03T10:00:00.000Z',
      },
    });
    notificationService.create = (async () => {
      notificationCreates += 1;
      return { success: true, data: [] };
    }) as typeof notificationService.create;
    notificationTriggers.bookingConfirmed = (async () => {
      notificationTriggersCount += 1;
      return { success: true, data: undefined };
    }) as typeof notificationTriggers.bookingConfirmed;

    try {
      const result = await bookingCrudService.createBooking(
        makeParams({
          coachId: 'coach_api_booking',
          athleteIds: ['parent_api_booking'],
          athleteNames: ['API Parent'],
          bookedById: 'parent_api_booking',
          bookedByName: 'API Parent',
          scheduledAt: '2026-07-04T10:00:00.000Z',
          price: 50,
        }),
      );

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.id, 'bok_api_no_local_notif');
      }
      assert.equal(notificationCreates, 0);
      assert.equal(notificationTriggersCount, 0);
    } finally {
      if (originalIsMockMode) {
        Object.defineProperty(apiClient, 'isMockMode', originalIsMockMode);
      }
      authService.getCurrentUser = originalGetCurrentUser;
      bookingAuthorityService.createBooking = originalCreateBooking;
      notificationService.create = originalCreateNotification;
      notificationTriggers.bookingConfirmed = originalBookingConfirmed;
    }
  });
});
