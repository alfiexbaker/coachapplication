// @ts-nocheck
/**
 * Accept Revert Tests
 *
 * Verifies that when booking creation fails during invite acceptance,
 * the invite status is reverted back to PENDING and an err() Result is returned.
 *
 * This tests the critical bug fix in session-invite-service.ts where previously
 * a failed bookingService.createBooking() would leave the invite stuck in
 * ACCEPTED status with no booking created.
 */

import assert from 'node:assert';
import test, { describe, beforeEach } from 'node:test';

// ============================================================================
// TYPES (subset of actual types for testing)
// ============================================================================

interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
}

interface SessionInvite {
  id: string;
  coachId: string;
  coachName: string;
  athleteIds: string[];
  athleteNames: string[];
  parentId: string;
  parentName: string;
  proposedSlots: TimeSlot[];
  sessionType: string;
  focus: string;
  priceUsd?: number;
  duration?: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'COUNTERED';
  expiresAt: string;
  createdAt: string;
  respondedAt?: string;
  selectedSlot?: TimeSlot;
  bookingId?: string;
  notes?: string;
}

interface RespondToInviteInput {
  inviteId: string;
  response: 'ACCEPTED' | 'DECLINED' | 'COUNTERED';
  selectedSlot?: TimeSlot;
  declineReason?: string;
  declineNote?: string;
}

interface ServiceError {
  code: string;
  message: string;
}

type Result<T, E = ServiceError> =
  | { success: true; data: T }
  | { success: false; error: E };

// ============================================================================
// MOCK INFRASTRUCTURE
// ============================================================================

let invitesCache: SessionInvite[] = [];
let mockNotifications: any[] = [];
let bookingCreateResult: { success: boolean; data?: any; error?: { code: string; message: string } } = {
  success: true,
  data: { id: 'booking_123' },
};
let availableSlots: { date: string; startTime: string; isAvailable: boolean }[] = [];
let releasedInviteIds: string[] = [];

// Mock bookingService
const bookingService = {
  async createBooking(_params: any): Promise<typeof bookingCreateResult> {
    return bookingCreateResult;
  },
};

// Mock notificationService
const notificationService = {
  async create(notification: any): Promise<any[]> {
    mockNotifications.push(notification);
    return mockNotifications;
  },
};

// Mock availabilityService
const availabilityService = {
  async getAvailableSlots(
    _coachId: string,
    _startDate: string,
    _endDate: string,
    _duration: number
  ): Promise<{ date: string; startTime: string; isAvailable: boolean }[]> {
    return availableSlots;
  },
};

// Mock inviteHoldService
const inviteHoldService = {
  async releaseHoldsForInvite(inviteId: string): Promise<void> {
    releasedInviteIds.push(inviteId);
  },
};

// Helper functions
const ok = <T>(data: T): Result<T, never> => ({ success: true, data });
const err = <E>(error: E): Result<never, E> => ({ success: false, error });
const serviceError = (code: string, message: string): ServiceError => ({ code, message });

// ============================================================================
// SERVICE UNDER TEST (mirrors respondToInvite accept logic)
// ============================================================================

/**
 * This replicates the ACCEPTED path of respondToInvite from
 * session-invite-service.ts, including the critical revert logic.
 */
async function respondToInvite(input: RespondToInviteInput): Promise<Result<SessionInvite, ServiceError>> {
  const index = invitesCache.findIndex((inv) => inv.id === input.inviteId);

  if (index === -1) {
    return err(serviceError('NOT_FOUND', `Invite not found: ${input.inviteId}`));
  }

  const invite = invitesCache[index];

  // Set status to ACCEPTED (optimistic)
  invitesCache[index] = {
    ...invite,
    status: input.response,
    respondedAt: new Date().toISOString(),
    selectedSlot: input.selectedSlot,
  };

  if (input.response === 'ACCEPTED') {
    const effectiveSlot = input.selectedSlot ?? (invite.proposedSlots.length > 0 ? invite.proposedSlots[0] : undefined);

    // Validate slot availability
    if (effectiveSlot) {
      const slotDate = effectiveSlot.date;
      const slotStart = effectiveSlot.startTime;
      const slots = await availabilityService.getAvailableSlots(
        invite.coachId, slotDate, slotDate, invite.duration || 60
      );
      const matchingSlot = slots.find(
        (s) => s.date === slotDate && s.startTime === slotStart
      );

      if (matchingSlot && !matchingSlot.isAvailable) {
        // Slot taken - revert to PENDING
        invitesCache[index] = { ...invite, status: 'PENDING' };

        const remainingSlots = invite.proposedSlots.filter(
          (ps) => !(ps.date === slotDate && ps.startTime === slotStart)
        );

        return err(serviceError(
          'CONFLICT',
          `This time slot is no longer available.${remainingSlots.length > 0 ? ' Please pick another time.' : ' All proposed times have been taken.'}`
        ));
      }
    }

    // CRITICAL: Create the actual booking
    if (effectiveSlot) {
      const scheduledAt = `${effectiveSlot.date}T${effectiveSlot.startTime}:00`;
      const endTime = effectiveSlot.endTime;
      const startTime = effectiveSlot.startTime;
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

      const bookingResult = await bookingService.createBooking({
        coachId: invite.coachId,
        coachName: invite.coachName,
        athleteIds: [invite.athleteIds[0]],
        athleteNames: [invite.athleteNames[0]],
        bookedById: invite.parentId,
        bookedByName: invite.parentName,
        scheduledAt,
        duration: durationMinutes > 0 ? durationMinutes : 60,
        location: effectiveSlot.location || 'Coach preferred location',
        service: invite.sessionType,
        serviceType: invite.sessionType,
        objectives: invite.focus ? [invite.focus] : [],
        price: invite.priceUsd,
        notes: invite.notes,
        sessionInviteId: invite.id,
      });

      if (bookingResult.success && bookingResult.data) {
        invitesCache[index].bookingId = bookingResult.data.id;
      } else if (!bookingResult.success) {
        // CRITICAL BUG FIX: Revert invite status back to PENDING
        invitesCache[index] = { ...invite, status: 'PENDING' };
        return err(serviceError(
          'CONFLICT',
          bookingResult.error?.message || 'Failed to create booking. Please try again.'
        ));
      }
    }

    // Release holds
    await inviteHoldService.releaseHoldsForInvite(invite.id);
  }

  // Create notification
  const athleteNames = invite.athleteNames.join(', ');
  const notification = {
    id: `notif_${Date.now()}`,
    type: 'booking',
    title: 'Invite Accepted!',
    body: `${invite.parentName} accepted your invite for ${athleteNames}.`,
    timeLabel: 'Just now',
    read: false,
  };
  await notificationService.create(notification);

  return ok(invitesCache[index]);
}

// ============================================================================
// TEST DATA
// ============================================================================

const MOCK_INVITE: SessionInvite = {
  id: 'inv_test_1',
  coachId: 'coach_1',
  coachName: 'Marcus Thompson',
  athleteIds: ['athlete_1'],
  athleteNames: ['Tom Baker'],
  parentId: 'parent_1',
  parentName: 'Sarah Baker',
  proposedSlots: [
    { date: '2026-03-15', startTime: '16:00', endTime: '17:00', location: 'Hackney Marshes' },
    { date: '2026-03-17', startTime: '16:00', endTime: '17:00', location: 'Hackney Marshes' },
  ],
  sessionType: '1:1 Coaching',
  focus: 'Finishing',
  priceUsd: 60,
  duration: 60,
  status: 'PENDING',
  expiresAt: '2026-03-14T23:59:59Z',
  createdAt: '2026-03-10T10:00:00Z',
};

const SELECTED_SLOT: TimeSlot = {
  date: '2026-03-15',
  startTime: '16:00',
  endTime: '17:00',
  location: 'Hackney Marshes',
};

// ============================================================================
// TESTS
// ============================================================================

beforeEach(() => {
  invitesCache = [JSON.parse(JSON.stringify(MOCK_INVITE))];
  mockNotifications = [];
  releasedInviteIds = [];
  // Default: booking succeeds, slots are available
  bookingCreateResult = { success: true, data: { id: 'booking_new_123' } };
  availableSlots = [
    { date: '2026-03-15', startTime: '16:00', isAvailable: true },
    { date: '2026-03-17', startTime: '16:00', isAvailable: true },
  ];
});

// --------------------------------------------------------------------------
// ACCEPT + BOOKING SUCCESS (baseline)
// --------------------------------------------------------------------------

describe('Accept Invite - Booking Success (baseline)', () => {
  test('successful accept sets status to ACCEPTED and links bookingId', async () => {
    const result = await respondToInvite({
      inviteId: 'inv_test_1',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.status, 'ACCEPTED');
      assert.strictEqual(result.data.bookingId, 'booking_new_123');
      assert.ok(result.data.respondedAt);
      assert.deepStrictEqual(result.data.selectedSlot, SELECTED_SLOT);
    }
  });

  test('successful accept releases holds for the invite', async () => {
    await respondToInvite({
      inviteId: 'inv_test_1',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    assert.ok(releasedInviteIds.includes('inv_test_1'));
  });

  test('successful accept creates a notification', async () => {
    await respondToInvite({
      inviteId: 'inv_test_1',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    assert.strictEqual(mockNotifications.length, 1);
    assert.strictEqual(mockNotifications[0].title, 'Invite Accepted!');
  });
});

// --------------------------------------------------------------------------
// ACCEPT + BOOKING FAILURE -> REVERT TO PENDING
// --------------------------------------------------------------------------

describe('Accept Invite - Booking Failure Reverts to PENDING', () => {
  test('when createBooking fails, invite reverts to PENDING', async () => {
    bookingCreateResult = {
      success: false,
      error: { code: 'VALIDATION', message: 'Coach is no longer available at this time.' },
    };

    const result = await respondToInvite({
      inviteId: 'inv_test_1',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    // Result should be err
    assert.strictEqual(result.success, false);

    // Invite in cache must be PENDING, not ACCEPTED
    assert.strictEqual(invitesCache[0].status, 'PENDING');
  });

  test('when createBooking fails, error result has CONFLICT code', async () => {
    bookingCreateResult = {
      success: false,
      error: { code: 'VALIDATION', message: 'Slot already booked.' },
    };

    const result = await respondToInvite({
      inviteId: 'inv_test_1',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.strictEqual(result.error.code, 'CONFLICT');
    }
  });

  test('when createBooking fails, error message is passed through', async () => {
    bookingCreateResult = {
      success: false,
      error: { code: 'VALIDATION', message: 'Coach is no longer available at this time.' },
    };

    const result = await respondToInvite({
      inviteId: 'inv_test_1',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.strictEqual(result.error.message, 'Coach is no longer available at this time.');
    }
  });

  test('when createBooking fails with no message, default message is used', async () => {
    bookingCreateResult = {
      success: false,
      error: { code: 'UNKNOWN', message: '' },
    };

    const result = await respondToInvite({
      inviteId: 'inv_test_1',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.strictEqual(result.error.message, 'Failed to create booking. Please try again.');
    }
  });

  test('when createBooking fails, invite does NOT have a bookingId', async () => {
    bookingCreateResult = {
      success: false,
      error: { code: 'VALIDATION', message: 'Slot conflict.' },
    };

    await respondToInvite({
      inviteId: 'inv_test_1',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    assert.strictEqual(invitesCache[0].bookingId, undefined);
  });

  test('when createBooking fails, respondedAt is NOT set on reverted invite', async () => {
    bookingCreateResult = {
      success: false,
      error: { code: 'VALIDATION', message: 'Nope.' },
    };

    await respondToInvite({
      inviteId: 'inv_test_1',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    // The reverted invite should restore original state (no respondedAt)
    assert.strictEqual(invitesCache[0].respondedAt, undefined);
  });
});

// --------------------------------------------------------------------------
// ACCEPT + SLOT UNAVAILABLE -> REVERT TO PENDING
// --------------------------------------------------------------------------

describe('Accept Invite - Slot Unavailable Reverts to PENDING', () => {
  test('when selected slot is taken, invite reverts to PENDING', async () => {
    availableSlots = [
      { date: '2026-03-15', startTime: '16:00', isAvailable: false }, // Taken!
      { date: '2026-03-17', startTime: '16:00', isAvailable: true },
    ];

    const result = await respondToInvite({
      inviteId: 'inv_test_1',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(invitesCache[0].status, 'PENDING');
  });

  test('when slot is taken with remaining slots, message suggests picking another', async () => {
    availableSlots = [
      { date: '2026-03-15', startTime: '16:00', isAvailable: false },
      { date: '2026-03-17', startTime: '16:00', isAvailable: true },
    ];

    const result = await respondToInvite({
      inviteId: 'inv_test_1',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.ok(result.error.message.includes('Please pick another time'));
    }
  });

  test('when all proposed slots are taken, message says all taken', async () => {
    // Set up invite with only one proposed slot
    invitesCache = [{
      ...JSON.parse(JSON.stringify(MOCK_INVITE)),
      proposedSlots: [SELECTED_SLOT],
    }];

    availableSlots = [
      { date: '2026-03-15', startTime: '16:00', isAvailable: false },
    ];

    const result = await respondToInvite({
      inviteId: 'inv_test_1',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.ok(result.error.message.includes('All proposed times have been taken'));
    }
  });
});

// --------------------------------------------------------------------------
// EDGE CASES
// --------------------------------------------------------------------------

describe('Accept Invite - Edge Cases', () => {
  test('accept non-existent invite returns NOT_FOUND', async () => {
    const result = await respondToInvite({
      inviteId: 'inv_does_not_exist',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.strictEqual(result.error.code, 'NOT_FOUND');
    }
  });

  test('accept without selectedSlot falls back to first proposed slot', async () => {
    const result = await respondToInvite({
      inviteId: 'inv_test_1',
      response: 'ACCEPTED',
      // No selectedSlot - should use proposedSlots[0]
    });

    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.status, 'ACCEPTED');
      assert.strictEqual(result.data.bookingId, 'booking_new_123');
    }
  });

  test('accept with booking failure does not release holds (early return)', async () => {
    bookingCreateResult = {
      success: false,
      error: { code: 'VALIDATION', message: 'Slot conflict.' },
    };

    await respondToInvite({
      inviteId: 'inv_test_1',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    // Holds should NOT be released when booking fails (early return before releaseHolds)
    assert.strictEqual(releasedInviteIds.length, 0);
  });
});
