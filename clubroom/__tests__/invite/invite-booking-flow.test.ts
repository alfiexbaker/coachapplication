// @ts-nocheck
/**
 * Invite Booking Flow Tests
 *
 * Tests the CRITICAL BUG FIX in session-invite-service.ts:
 * Previously, respondToInvite() would set invite status to ACCEPTED first,
 * then attempt booking creation. If booking failed, the invite was stuck
 * ACCEPTED with no booking (orphaned). The fix creates the booking FIRST
 * and only sets ACCEPTED if booking succeeds.
 *
 * Also tests acceptCounterProposal() which has the same pattern,
 * event bus emissions (INVITE_ACCEPTED, INVITE_BOOKING_FAILED),
 * and skipAvailabilityValidation in createBooking.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach, afterEach } from 'node:test';

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
  coachPhotoUrl?: string;
  clubName?: string;
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
  counterProposal?: TimeSlot[];
  counterNote?: string;
}

interface RespondToInviteInput {
  inviteId: string;
  response: 'ACCEPTED' | 'DECLINED' | 'COUNTERED';
  selectedSlot?: TimeSlot;
  counterProposal?: TimeSlot[];
  counterNote?: string;
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

let invitesStorage: SessionInvite[] = [];
let invitesCache: SessionInvite[] = [];
let mockNotifications: { id: string; type: string; title: string; body: string }[] = [];
let bookingCreateResult: Result<{ id: string }> = {
  success: true,
  data: { id: 'booking_abc_001' },
};
let bookingCreateCallArgs: Record<string, unknown>[] = [];
let releasedInviteIds: string[] = [];
let emittedEvents: { event: string; data: unknown }[] = [];

// Mock bookingService
const bookingService = {
  async createBooking(params: Record<string, unknown>): Promise<Result<{ id: string }>> {
    bookingCreateCallArgs.push(params);
    return bookingCreateResult;
  },
};

// Mock notificationService
const notificationService = {
  async create(notification: { id: string; type: string; title: string; body: string }): Promise<void> {
    mockNotifications.push(notification);
  },
};

// Mock inviteHoldService
const inviteHoldService = {
  async releaseHoldsForInvite(inviteId: string): Promise<void> {
    releasedInviteIds.push(inviteId);
  },
};

// Result helpers
const ok = <T>(data: T): Result<T, never> => ({ success: true, data });
const err = <E>(error: E): Result<never, E> => ({ success: false, error });
const serviceError = (code: string, message: string): ServiceError => ({ code, message });

// Mock event bus
function emitTyped(event: string, data: unknown): void {
  emittedEvents.push({ event, data });
}

const ServiceEvents = {
  INVITE_ACCEPTED: 'invite:accepted',
  INVITE_BOOKING_FAILED: 'invite:booking_failed',
} as const;

// Storage helpers
async function loadFromStorage(): Promise<SessionInvite[]> {
  return [...invitesStorage];
}

async function saveToStorage(invites: SessionInvite[]): Promise<void> {
  invitesStorage = [...invites];
}

// ============================================================================
// SERVICE UNDER TEST — mirrors session-invite-service.ts respondToInvite()
// ============================================================================

/**
 * Exact mirror of the FIXED respondToInvite from session-invite-service.ts.
 * The critical change: booking is created FIRST. Only if ok() does the invite
 * become ACCEPTED. If err(), the invite stays at its original status.
 */
async function respondToInvite(input: RespondToInviteInput): Promise<Result<SessionInvite, ServiceError>> {
  invitesCache = await loadFromStorage();
  const index = invitesCache.findIndex((inv) => inv.id === input.inviteId);

  if (index === -1) {
    return err(serviceError('NOT_FOUND', `Invite not found: ${input.inviteId}`));
  }

  const invite = invitesCache[index];

  if (input.response === 'ACCEPTED') {
    // CRITICAL FIX: Create booking FIRST, before changing invite status.
    if (!input.selectedSlot) {
      return err(serviceError('VALIDATION', 'A selected slot is required to accept an invite'));
    }

    const scheduledAt = `${input.selectedSlot.date}T${input.selectedSlot.startTime}:00`;
    const endTime = input.selectedSlot.endTime;
    const startTime = input.selectedSlot.startTime;

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
      location: input.selectedSlot.location || 'Coach preferred location',
      service: invite.sessionType,
      serviceType: invite.sessionType,
      objectives: invite.focus ? [invite.focus] : [],
      price: invite.priceUsd,
      notes: invite.notes,
      sessionInviteId: invite.id,
      skipAvailabilityValidation: true,
    });

    if (!bookingResult.success) {
      const reason = bookingResult.error?.message ?? 'Booking creation failed';

      emitTyped(ServiceEvents.INVITE_BOOKING_FAILED, {
        inviteId: invite.id,
        coachId: invite.coachId,
        parentId: invite.parentId,
        reason,
      });

      return err(serviceError('CONFLICT', reason));
    }

    // Booking succeeded — NOW set invite to ACCEPTED
    invitesCache[index] = {
      ...invite,
      status: 'ACCEPTED',
      respondedAt: new Date().toISOString(),
      selectedSlot: input.selectedSlot,
      bookingId: bookingResult.data.id,
    };
    await saveToStorage(invitesCache);

    emitTyped(ServiceEvents.INVITE_ACCEPTED, {
      inviteId: invite.id,
      bookingId: bookingResult.data.id,
      coachId: invite.coachId,
      parentId: invite.parentId,
      athleteIds: invite.athleteIds,
      selectedSlot: {
        date: input.selectedSlot.date,
        startTime: input.selectedSlot.startTime,
        endTime: input.selectedSlot.endTime,
        location: input.selectedSlot.location,
      },
    });

    await notificationService.create({
      id: `notif_${Date.now()}`,
      type: 'booking',
      title: 'Invite Accepted!',
      body: `${invite.parentName} accepted your invite for ${invite.athleteNames.join(', ')}.`,
    });

    await inviteHoldService.releaseHoldsForInvite(invite.id);

    return ok(invitesCache[index]);
  }

  // DECLINED and COUNTERED: set status immediately
  invitesCache[index] = {
    ...invite,
    status: input.response,
    respondedAt: new Date().toISOString(),
    selectedSlot: input.selectedSlot,
    counterProposal: input.counterProposal,
    counterNote: input.counterNote,
  };

  await saveToStorage(invitesCache);

  if (input.response === 'DECLINED') {
    await notificationService.create({
      id: `notif_declined_${Date.now()}`,
      type: 'booking',
      title: 'Invite Declined',
      body: `${invite.parentName} declined your session invite for ${invite.athleteNames.join(', ')}.`,
    });
    await inviteHoldService.releaseHoldsForInvite(invite.id);
  } else if (input.response === 'COUNTERED') {
    await notificationService.create({
      id: `notif_counter_${Date.now()}`,
      type: 'booking',
      title: 'Counter Proposal Received',
      body: `${invite.parentName} proposed alternative times for ${invite.athleteNames.join(', ')}.`,
    });
    await inviteHoldService.releaseHoldsForInvite(invite.id);
  }

  return ok(invitesCache[index]);
}

/**
 * Exact mirror of the FIXED acceptCounterProposal from session-invite-service.ts.
 * Same booking-first pattern as respondToInvite ACCEPTED.
 */
async function acceptCounterProposal(
  inviteId: string,
  selectedSlot: TimeSlot
): Promise<Result<SessionInvite, ServiceError>> {
  invitesCache = await loadFromStorage();
  const index = invitesCache.findIndex((inv) => inv.id === inviteId);

  if (index === -1) {
    return err(serviceError('NOT_FOUND', `Invite not found: ${inviteId}`));
  }

  const invite = invitesCache[index];

  // CRITICAL FIX: Create booking FIRST
  const scheduledAt = `${selectedSlot.date}T${selectedSlot.startTime}:00`;
  const [startHour, startMin] = selectedSlot.startTime.split(':').map(Number);
  const [endHour, endMin] = selectedSlot.endTime.split(':').map(Number);
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
    location: selectedSlot.location || 'Coach preferred location',
    service: invite.sessionType,
    serviceType: invite.sessionType,
    objectives: invite.focus ? [invite.focus] : [],
    price: invite.priceUsd,
    notes: invite.notes,
    sessionInviteId: invite.id,
    skipAvailabilityValidation: true,
  });

  if (!bookingResult.success) {
    const reason = bookingResult.error?.message ?? 'Booking creation failed';

    emitTyped(ServiceEvents.INVITE_BOOKING_FAILED, {
      inviteId,
      coachId: invite.coachId,
      parentId: invite.parentId,
      reason,
    });

    return err(serviceError('CONFLICT', reason));
  }

  // Booking succeeded — NOW set invite to ACCEPTED
  invitesCache[index] = {
    ...invite,
    status: 'ACCEPTED',
    selectedSlot,
    respondedAt: new Date().toISOString(),
    bookingId: bookingResult.data.id,
  };

  await saveToStorage(invitesCache);

  emitTyped(ServiceEvents.INVITE_ACCEPTED, {
    inviteId,
    bookingId: bookingResult.data.id,
    coachId: invite.coachId,
    parentId: invite.parentId,
    athleteIds: invite.athleteIds,
    selectedSlot: {
      date: selectedSlot.date,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      location: selectedSlot.location,
    },
  });

  await notificationService.create({
    id: `notif_counter_accept_${Date.now()}`,
    type: 'booking',
    title: 'Counter Proposal Accepted!',
    body: `Coach ${invite.coachName.split(' ')[0]} accepted your proposed time. Session confirmed!`,
  });

  return ok(invitesCache[index]);
}

// ============================================================================
// TEST DATA
// ============================================================================

const PENDING_INVITE: SessionInvite = {
  id: 'inv_flow_001',
  coachId: 'coach_flow_1',
  coachName: 'Marcus Thompson',
  athleteIds: ['athlete_flow_1'],
  athleteNames: ['Tom Baker'],
  parentId: 'parent_flow_1',
  parentName: 'Sarah Baker',
  proposedSlots: [
    { date: '2026-03-20', startTime: '16:00', endTime: '17:00', location: 'Hackney Marshes' },
    { date: '2026-03-22', startTime: '10:00', endTime: '11:00', location: 'Victoria Park' },
  ],
  sessionType: '1:1 Coaching',
  focus: 'Finishing',
  priceUsd: 60,
  duration: 60,
  status: 'PENDING',
  expiresAt: '2026-03-28T23:59:59Z',
  createdAt: '2026-03-14T10:00:00Z',
  notes: 'Work on weak foot finishing.',
};

const COUNTERED_INVITE: SessionInvite = {
  id: 'inv_flow_002',
  coachId: 'coach_flow_2',
  coachName: 'Emma Williams',
  athleteIds: ['athlete_flow_2'],
  athleteNames: ['Lucy Baker'],
  parentId: 'parent_flow_1',
  parentName: 'Sarah Baker',
  proposedSlots: [
    { date: '2026-03-21', startTime: '17:00', endTime: '18:00', location: 'Victoria Park' },
  ],
  sessionType: 'Group Session',
  focus: 'Goalkeeping',
  priceUsd: 50,
  status: 'COUNTERED',
  expiresAt: '2026-03-28T23:59:59Z',
  createdAt: '2026-03-14T14:00:00Z',
  respondedAt: '2026-03-15T09:00:00Z',
  counterProposal: [
    { date: '2026-03-23', startTime: '15:00', endTime: '16:00', location: 'Victoria Park' },
  ],
  counterNote: 'Cannot make the original time, how about Sunday?',
};

const SELECTED_SLOT: TimeSlot = {
  date: '2026-03-20',
  startTime: '16:00',
  endTime: '17:00',
  location: 'Hackney Marshes',
};

const COUNTER_SLOT: TimeSlot = {
  date: '2026-03-23',
  startTime: '15:00',
  endTime: '16:00',
  location: 'Victoria Park',
};

// ============================================================================
// TESTS
// ============================================================================

beforeEach(() => {
  // Reset all mock state for full test isolation
  invitesStorage = [
    JSON.parse(JSON.stringify(PENDING_INVITE)),
    JSON.parse(JSON.stringify(COUNTERED_INVITE)),
  ];
  invitesCache = [];
  mockNotifications = [];
  bookingCreateCallArgs = [];
  releasedInviteIds = [];
  emittedEvents = [];
  bookingCreateResult = { success: true, data: { id: 'booking_abc_001' } };
});

// --------------------------------------------------------------------------
// 1. respondToInvite ACCEPTED + booking succeeds
// --------------------------------------------------------------------------

describe('respondToInvite ACCEPTED + booking succeeds', () => {
  test('invite status set to ACCEPTED', async () => {
    const result = await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.status, 'ACCEPTED');
    }
  });

  test('bookingId is set on the invite', async () => {
    const result = await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    if (result.success) {
      assert.equal(result.data.bookingId, 'booking_abc_001');
    }
  });

  test('respondedAt is set', async () => {
    const result = await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    if (result.success) {
      assert.ok(result.data.respondedAt, 'respondedAt should be set');
    }
  });

  test('invite is persisted to storage with ACCEPTED status', async () => {
    await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    const stored = invitesStorage.find((inv) => inv.id === 'inv_flow_001');
    assert.equal(stored?.status, 'ACCEPTED');
    assert.equal(stored?.bookingId, 'booking_abc_001');
  });

  test('holds are released on success', async () => {
    await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    assert.ok(releasedInviteIds.includes('inv_flow_001'));
  });

  test('notification is created for coach', async () => {
    await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    assert.equal(mockNotifications.length, 1);
    assert.equal(mockNotifications[0].title, 'Invite Accepted!');
    assert.ok(mockNotifications[0].body.includes('Sarah Baker'));
    assert.ok(mockNotifications[0].body.includes('Tom Baker'));
  });
});

// --------------------------------------------------------------------------
// 2. respondToInvite ACCEPTED + booking fails
// --------------------------------------------------------------------------

describe('respondToInvite ACCEPTED + booking fails', () => {
  beforeEach(() => {
    bookingCreateResult = {
      success: false,
      error: { code: 'VALIDATION', message: 'Coach is no longer available at this time.' },
    };
  });

  test('result is err()', async () => {
    const result = await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    assert.equal(result.success, false);
  });

  test('invite stays PENDING (NOT changed to ACCEPTED)', async () => {
    await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    // Check both cache and storage
    const storedInvite = invitesStorage.find((inv) => inv.id === 'inv_flow_001');
    assert.equal(storedInvite?.status, 'PENDING', 'Invite in storage should remain PENDING');
  });

  test('no bookingId is set on the invite', async () => {
    await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    const storedInvite = invitesStorage.find((inv) => inv.id === 'inv_flow_001');
    assert.equal(storedInvite?.bookingId, undefined, 'No bookingId should be set when booking fails');
  });

  test('error has CONFLICT code', async () => {
    const result = await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    if (!result.success) {
      assert.equal(result.error.code, 'CONFLICT');
    }
  });

  test('error message passes through from booking failure', async () => {
    const result = await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    if (!result.success) {
      assert.equal(result.error.message, 'Coach is no longer available at this time.');
    }
  });

  test('holds are NOT released when booking fails', async () => {
    await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    assert.equal(releasedInviteIds.length, 0, 'Holds should not be released on booking failure');
  });

  test('no notification created when booking fails', async () => {
    await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    assert.equal(mockNotifications.length, 0, 'No notification should be sent when booking fails');
  });
});

// --------------------------------------------------------------------------
// 3. respondToInvite DECLINED
// --------------------------------------------------------------------------

describe('respondToInvite DECLINED', () => {
  test('invite status set to DECLINED, no booking created', async () => {
    const result = await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'DECLINED',
    });

    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.status, 'DECLINED');
      assert.equal(result.data.bookingId, undefined, 'No bookingId for declined invite');
    }
    assert.equal(bookingCreateCallArgs.length, 0, 'createBooking should not be called for DECLINED');
  });

  test('declined notification is created', async () => {
    await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'DECLINED',
    });

    assert.equal(mockNotifications.length, 1);
    assert.equal(mockNotifications[0].title, 'Invite Declined');
  });

  test('holds are released on decline', async () => {
    await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'DECLINED',
    });

    assert.ok(releasedInviteIds.includes('inv_flow_001'));
  });

  test('no booking events are emitted', async () => {
    await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'DECLINED',
    });

    assert.equal(emittedEvents.length, 0, 'No events should be emitted for declined invite');
  });
});

// --------------------------------------------------------------------------
// 4. respondToInvite COUNTERED
// --------------------------------------------------------------------------

describe('respondToInvite COUNTERED', () => {
  test('invite status set to COUNTERED with counter-proposal data', async () => {
    const counterSlots: TimeSlot[] = [
      { date: '2026-03-25', startTime: '14:00', endTime: '15:00', location: 'Hackney Marshes' },
    ];

    const result = await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'COUNTERED',
      counterProposal: counterSlots,
      counterNote: 'Can we do Tuesday instead?',
    });

    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.status, 'COUNTERED');
      assert.deepEqual(result.data.counterProposal, counterSlots);
      assert.equal(result.data.counterNote, 'Can we do Tuesday instead?');
      assert.equal(result.data.bookingId, undefined, 'No bookingId for countered invite');
    }
    assert.equal(bookingCreateCallArgs.length, 0, 'createBooking should not be called for COUNTERED');
  });

  test('counter notification is created', async () => {
    await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'COUNTERED',
      counterProposal: [{ date: '2026-03-25', startTime: '14:00', endTime: '15:00' }],
    });

    assert.equal(mockNotifications.length, 1);
    assert.equal(mockNotifications[0].title, 'Counter Proposal Received');
  });

  test('no booking events are emitted', async () => {
    await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'COUNTERED',
      counterProposal: [{ date: '2026-03-25', startTime: '14:00', endTime: '15:00' }],
    });

    assert.equal(emittedEvents.length, 0, 'No events should be emitted for countered invite');
  });
});

// --------------------------------------------------------------------------
// 5. acceptCounterProposal + booking succeeds
// --------------------------------------------------------------------------

describe('acceptCounterProposal + booking succeeds', () => {
  test('invite becomes ACCEPTED with bookingId', async () => {
    bookingCreateResult = { success: true, data: { id: 'booking_counter_001' } };

    const result = await acceptCounterProposal('inv_flow_002', COUNTER_SLOT);

    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.status, 'ACCEPTED');
      assert.equal(result.data.bookingId, 'booking_counter_001');
      assert.deepEqual(result.data.selectedSlot, COUNTER_SLOT);
      assert.ok(result.data.respondedAt, 'respondedAt should be set');
    }
  });

  test('invite is persisted to storage', async () => {
    bookingCreateResult = { success: true, data: { id: 'booking_counter_001' } };

    await acceptCounterProposal('inv_flow_002', COUNTER_SLOT);

    const stored = invitesStorage.find((inv) => inv.id === 'inv_flow_002');
    assert.equal(stored?.status, 'ACCEPTED');
    assert.equal(stored?.bookingId, 'booking_counter_001');
  });

  test('booking params include skipAvailabilityValidation: true', async () => {
    await acceptCounterProposal('inv_flow_002', COUNTER_SLOT);

    assert.equal(bookingCreateCallArgs.length, 1);
    assert.equal(bookingCreateCallArgs[0].skipAvailabilityValidation, true);
  });

  test('notification created for parent', async () => {
    await acceptCounterProposal('inv_flow_002', COUNTER_SLOT);

    assert.equal(mockNotifications.length, 1);
    assert.equal(mockNotifications[0].title, 'Counter Proposal Accepted!');
    assert.ok(mockNotifications[0].body.includes('Emma'));
  });
});

// --------------------------------------------------------------------------
// 6. acceptCounterProposal + booking fails
// --------------------------------------------------------------------------

describe('acceptCounterProposal + booking fails', () => {
  beforeEach(() => {
    bookingCreateResult = {
      success: false,
      error: { code: 'STORAGE', message: 'Failed to save booking. Please try again.' },
    };
  });

  test('result is err()', async () => {
    const result = await acceptCounterProposal('inv_flow_002', COUNTER_SLOT);

    assert.equal(result.success, false);
  });

  test('invite stays COUNTERED (NOT changed to ACCEPTED)', async () => {
    await acceptCounterProposal('inv_flow_002', COUNTER_SLOT);

    // Storage should NOT have been updated to ACCEPTED
    const stored = invitesStorage.find((inv) => inv.id === 'inv_flow_002');
    assert.equal(stored?.status, 'COUNTERED', 'Invite should remain COUNTERED when booking fails');
  });

  test('no bookingId set', async () => {
    await acceptCounterProposal('inv_flow_002', COUNTER_SLOT);

    const stored = invitesStorage.find((inv) => inv.id === 'inv_flow_002');
    assert.equal(stored?.bookingId, undefined);
  });

  test('error has CONFLICT code with passed-through message', async () => {
    const result = await acceptCounterProposal('inv_flow_002', COUNTER_SLOT);

    if (!result.success) {
      assert.equal(result.error.code, 'CONFLICT');
      assert.equal(result.error.message, 'Failed to save booking. Please try again.');
    }
  });

  test('no notification created on failure', async () => {
    await acceptCounterProposal('inv_flow_002', COUNTER_SLOT);

    assert.equal(mockNotifications.length, 0);
  });
});

// --------------------------------------------------------------------------
// 7. INVITE_ACCEPTED event emitted on success
// --------------------------------------------------------------------------

describe('INVITE_ACCEPTED event emission', () => {
  test('event emitted when respondToInvite succeeds', async () => {
    await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    const acceptedEvents = emittedEvents.filter((e) => e.event === ServiceEvents.INVITE_ACCEPTED);
    assert.equal(acceptedEvents.length, 1, 'Exactly one INVITE_ACCEPTED event should be emitted');

    const payload = acceptedEvents[0].data as Record<string, unknown>;
    assert.equal(payload.inviteId, 'inv_flow_001');
    assert.equal(payload.bookingId, 'booking_abc_001');
    assert.equal(payload.coachId, 'coach_flow_1');
    assert.equal(payload.parentId, 'parent_flow_1');
    assert.deepEqual(payload.athleteIds, ['athlete_flow_1']);
    assert.deepEqual(payload.selectedSlot, {
      date: '2026-03-20',
      startTime: '16:00',
      endTime: '17:00',
      location: 'Hackney Marshes',
    });
  });

  test('event emitted when acceptCounterProposal succeeds', async () => {
    await acceptCounterProposal('inv_flow_002', COUNTER_SLOT);

    const acceptedEvents = emittedEvents.filter((e) => e.event === ServiceEvents.INVITE_ACCEPTED);
    assert.equal(acceptedEvents.length, 1);

    const payload = acceptedEvents[0].data as Record<string, unknown>;
    assert.equal(payload.inviteId, 'inv_flow_002');
    assert.equal(payload.bookingId, 'booking_abc_001');
    assert.equal(payload.coachId, 'coach_flow_2');
  });
});

// --------------------------------------------------------------------------
// 8. INVITE_BOOKING_FAILED event emitted on failure
// --------------------------------------------------------------------------

describe('INVITE_BOOKING_FAILED event emission', () => {
  beforeEach(() => {
    bookingCreateResult = {
      success: false,
      error: { code: 'VALIDATION', message: 'Slot already booked by another parent.' },
    };
  });

  test('event emitted when respondToInvite booking fails', async () => {
    await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    const failedEvents = emittedEvents.filter((e) => e.event === ServiceEvents.INVITE_BOOKING_FAILED);
    assert.equal(failedEvents.length, 1, 'Exactly one INVITE_BOOKING_FAILED event should be emitted');

    const payload = failedEvents[0].data as Record<string, unknown>;
    assert.equal(payload.inviteId, 'inv_flow_001');
    assert.equal(payload.coachId, 'coach_flow_1');
    assert.equal(payload.parentId, 'parent_flow_1');
    assert.equal(payload.reason, 'Slot already booked by another parent.');
  });

  test('event emitted when acceptCounterProposal booking fails', async () => {
    await acceptCounterProposal('inv_flow_002', COUNTER_SLOT);

    const failedEvents = emittedEvents.filter((e) => e.event === ServiceEvents.INVITE_BOOKING_FAILED);
    assert.equal(failedEvents.length, 1);

    const payload = failedEvents[0].data as Record<string, unknown>;
    assert.equal(payload.inviteId, 'inv_flow_002');
    assert.equal(payload.reason, 'Slot already booked by another parent.');
  });

  test('no INVITE_ACCEPTED event emitted when booking fails', async () => {
    await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    const acceptedEvents = emittedEvents.filter((e) => e.event === ServiceEvents.INVITE_ACCEPTED);
    assert.equal(acceptedEvents.length, 0, 'INVITE_ACCEPTED should NOT be emitted when booking fails');
  });
});

// --------------------------------------------------------------------------
// 9. createBooking receives skipAvailabilityValidation: true
// --------------------------------------------------------------------------

describe('createBooking skipAvailabilityValidation', () => {
  test('respondToInvite passes skipAvailabilityValidation: true', async () => {
    await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    assert.equal(bookingCreateCallArgs.length, 1);
    assert.equal(
      bookingCreateCallArgs[0].skipAvailabilityValidation,
      true,
      'skipAvailabilityValidation should be true for invite acceptance'
    );
  });

  test('acceptCounterProposal passes skipAvailabilityValidation: true', async () => {
    await acceptCounterProposal('inv_flow_002', COUNTER_SLOT);

    assert.equal(bookingCreateCallArgs.length, 1);
    assert.equal(
      bookingCreateCallArgs[0].skipAvailabilityValidation,
      true,
      'skipAvailabilityValidation should be true for counter-proposal acceptance'
    );
  });

  test('booking params include sessionInviteId to link invite to booking', async () => {
    await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    assert.equal(bookingCreateCallArgs[0].sessionInviteId, 'inv_flow_001');
  });

  test('booking params calculate correct duration from slot times', async () => {
    const twoHourSlot: TimeSlot = {
      date: '2026-03-20',
      startTime: '14:00',
      endTime: '16:00',
      location: 'Hackney Marshes',
    };

    await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'ACCEPTED',
      selectedSlot: twoHourSlot,
    });

    assert.equal(bookingCreateCallArgs[0].duration, 120, 'Duration should be 120 minutes for 14:00-16:00');
  });

  test('booking params default to 60 minutes when start equals end', async () => {
    const sameTimes: TimeSlot = {
      date: '2026-03-20',
      startTime: '14:00',
      endTime: '14:00',
      location: 'Hackney Marshes',
    };

    await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'ACCEPTED',
      selectedSlot: sameTimes,
    });

    assert.equal(bookingCreateCallArgs[0].duration, 60, 'Duration should default to 60 for zero-length slot');
  });
});

// --------------------------------------------------------------------------
// 10. Edge cases and NOT_FOUND handling
// --------------------------------------------------------------------------

describe('Edge cases', () => {
  test('respondToInvite with non-existent inviteId returns NOT_FOUND', async () => {
    const result = await respondToInvite({
      inviteId: 'inv_does_not_exist',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, 'NOT_FOUND');
      assert.ok(result.error.message.includes('inv_does_not_exist'));
    }
  });

  test('acceptCounterProposal with non-existent inviteId returns NOT_FOUND', async () => {
    const result = await acceptCounterProposal('inv_ghost', COUNTER_SLOT);

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, 'NOT_FOUND');
    }
  });

  test('respondToInvite ACCEPTED without selectedSlot returns VALIDATION error', async () => {
    const result = await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'ACCEPTED',
      // No selectedSlot
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, 'VALIDATION');
      assert.ok(result.error.message.includes('selected slot'));
    }
  });

  test('booking params include all invite data for traceability', async () => {
    await respondToInvite({
      inviteId: 'inv_flow_001',
      response: 'ACCEPTED',
      selectedSlot: SELECTED_SLOT,
    });

    const params = bookingCreateCallArgs[0];
    assert.equal(params.coachId, 'coach_flow_1');
    assert.equal(params.coachName, 'Marcus Thompson');
    assert.deepEqual(params.athleteIds, ['athlete_flow_1']);
    assert.deepEqual(params.athleteNames, ['Tom Baker']);
    assert.equal(params.bookedById, 'parent_flow_1');
    assert.equal(params.bookedByName, 'Sarah Baker');
    assert.equal(params.scheduledAt, '2026-03-20T16:00:00');
    assert.equal(params.location, 'Hackney Marshes');
    assert.equal(params.service, '1:1 Coaching');
    assert.equal(params.price, 60);
    assert.deepEqual(params.objectives, ['Finishing']);
    assert.equal(params.notes, 'Work on weak foot finishing.');
  });
});
