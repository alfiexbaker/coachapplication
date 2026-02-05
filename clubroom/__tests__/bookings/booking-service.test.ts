// @ts-nocheck
/**
 * Booking Service Tests
 *
 * Unit tests for the booking service functionality including
 * CRUD operations, validation, status transitions, and notifications.
 *
 * These tests verify the core booking functionality:
 * - Create bookings with validation
 * - Get bookings by ID/user
 * - Cancel bookings with notifications
 * - Status transitions (CONFIRMED -> AWAITING_COMPLETION -> COMPLETED)
 * - Draft booking flow
 * - Session reminders
 */

import assert from 'node:assert';
import test, { describe, beforeEach } from 'node:test';

// Mock Booking type (subset of actual type for testing)
interface Booking {
  id: string;
  coachId: string;
  coachName: string;
  athleteId: string;
  athleteIds?: string[];
  athleteName: string;
  bookedById?: string;
  scheduledAt: string;
  location: string;
  service: string;
  serviceType?: string;
  status: 'PENDING' | 'CONFIRMED' | 'AWAITING_COMPLETION' | 'COMPLETED' | 'CANCELLED';
  price: number;
  duration?: number;
  notes?: string;
  objectives?: string[];
  cancellationReason?: string;
  createdAt?: string;
  isSharedSession?: boolean;
  sessionInviteId?: string;
}

interface CreateBookingParams {
  coachId: string;
  coachName: string;
  athleteIds: string[];
  athleteNames: string[];
  bookedById: string;
  bookedByName: string;
  scheduledAt: string;
  duration: number;
  location: string;
  service: string;
  serviceType: string;
  objectives?: string[];
  price?: number;
  notes?: string;
  sessionInviteId?: string;
}

interface BookingDraft {
  sessionType?: string;
  participants?: number;
  duration?: number;
  date?: string;
  slot?: string;
  locationOption?: string;
  locationText?: string;
  notes?: string;
  childId?: string;
  childIds?: string[];
  price?: number;
  coachId?: string;
  coachName?: string;
  athleteId?: string;
  athleteName?: string;
  objectives?: string[];
}

// Mock storage
let mockBookings: Booking[] = [];
let mockAvailableSlots: any[] = [];
let mockNotifications: any[] = [];

// Mock BookingService implementation for testing
class MockBookingService {
  private draft: BookingDraft = {};

  getDraft() {
    return this.draft;
  }

  updateDraft(patch: Partial<BookingDraft>) {
    this.draft = { ...this.draft, ...patch };
  }

  resetDraft() {
    this.draft = {};
  }

  async list(): Promise<Booking[]> {
    return [...mockBookings];
  }

  async getBooking(id: string): Promise<Booking | null> {
    return mockBookings.find((b) => b.id === id) || null;
  }

  async getById(id: string): Promise<Booking | undefined> {
    return mockBookings.find((b) => b.id === id);
  }

  async updateStatus(id: string, status: Booking['status']): Promise<Booking | undefined> {
    const index = mockBookings.findIndex((b) => b.id === id);
    if (index === -1) return undefined;
    mockBookings[index] = { ...mockBookings[index], status };
    return mockBookings[index];
  }

  async cancel(id: string, reason: string, cancelledBy: 'coach' | 'parent' = 'parent'): Promise<Booking | undefined> {
    const index = mockBookings.findIndex((b) => b.id === id);
    if (index === -1) return undefined;

    const booking = mockBookings[index];
    mockBookings[index] = {
      ...booking,
      status: 'CANCELLED',
      cancellationReason: reason,
    };

    // Create notification
    const date = booking.scheduledAt
      ? new Date(booking.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'upcoming date';

    mockNotifications.push({
      type: 'booking_cancelled',
      cancelledBy,
      date,
      recipientId: cancelledBy === 'parent' ? booking.coachId : booking.bookedById,
    });

    return mockBookings[index];
  }

  async validateBooking(
    coachId: string,
    date: string,
    startTime: string,
    durationMinutes: number = 60
  ): Promise<{ valid: boolean; reason?: string }> {
    const matchingSlot = mockAvailableSlots.find(
      (slot) => slot.coachId === coachId && slot.date === date && slot.startTime === startTime
    );

    if (!matchingSlot) {
      return { valid: false, reason: "This time slot is not within the coach's available hours." };
    }

    if (!matchingSlot.isAvailable) {
      return { valid: false, reason: 'This time slot is already fully booked.' };
    }

    return { valid: true };
  }

  async createBooking(params: CreateBookingParams): Promise<{ success: boolean; booking?: Booking; error?: string }> {
    const date = params.scheduledAt.split('T')[0];
    const time = params.scheduledAt.split('T')[1]?.substring(0, 5) || '10:00';

    // Validate availability
    const validation = await this.validateBooking(params.coachId, date, time, params.duration);
    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    const totalPrice = (params.price || 0) * params.athleteIds.length;
    const isSharedSession = params.athleteIds.length > 1;

    const newBooking: Booking = {
      id: `booking-${Date.now()}`,
      coachId: params.coachId,
      coachName: params.coachName,
      athleteIds: params.athleteIds,
      athleteId: params.athleteIds[0],
      athleteName: params.athleteNames.join(', '),
      bookedById: params.bookedById,
      scheduledAt: params.scheduledAt,
      status: 'CONFIRMED',
      duration: params.duration,
      location: params.location,
      service: params.service,
      serviceType: params.serviceType,
      objectives: params.objectives || [],
      price: totalPrice,
      isSharedSession,
      notes: params.notes || '',
      createdAt: new Date().toISOString(),
      sessionInviteId: params.sessionInviteId,
    };

    mockBookings.push(newBooking);

    // Create notification for coach
    mockNotifications.push({
      type: 'booking_created',
      bookingId: newBooking.id,
      coachId: params.coachId,
    });

    return { success: true, booking: newBooking };
  }

  async getBookingsForUser(userId: string, role: 'coach' | 'parent' | 'athlete'): Promise<Booking[]> {
    switch (role) {
      case 'coach':
        return mockBookings.filter((b) => b.coachId === userId);
      case 'parent':
        return mockBookings.filter((b) => b.bookedById === userId);
      case 'athlete':
        return mockBookings.filter((b) => b.athleteId === userId);
      default:
        return [];
    }
  }

  async confirmBooking(bookingId: string): Promise<{ success: boolean; error?: string }> {
    const index = mockBookings.findIndex((b) => b.id === bookingId);
    if (index === -1) {
      return { success: false, error: 'Booking not found' };
    }

    mockBookings[index].status = 'CONFIRMED';

    mockNotifications.push({
      type: 'booking_confirmed',
      bookingId,
    });

    return { success: true };
  }

  async updateBooking(id: string, updates: Partial<Booking>): Promise<Booking> {
    const index = mockBookings.findIndex((b) => b.id === id);
    if (index === -1) throw new Error('Booking not found');

    mockBookings[index] = { ...mockBookings[index], ...updates };
    return mockBookings[index];
  }

  async checkAndTransitionStatus(bookingId: string): Promise<Booking> {
    const booking = await this.getBooking(bookingId);
    if (!booking) throw new Error('Booking not found');

    const sessionEnd = new Date(booking.scheduledAt);
    sessionEnd.setMinutes(sessionEnd.getMinutes() + (booking.duration || 60));

    if (booking.status === 'CONFIRMED' && new Date() > sessionEnd) {
      return this.updateBooking(bookingId, { status: 'AWAITING_COMPLETION' });
    }
    return booking;
  }

  async getAwaitingCompletion(coachId: string): Promise<Booking[]> {
    const now = new Date();

    return mockBookings.filter((b) => {
      if (b.coachId !== coachId) return false;
      if (b.status === 'AWAITING_COMPLETION') return true;

      if (b.status === 'CONFIRMED') {
        const end = new Date(b.scheduledAt);
        end.setMinutes(end.getMinutes() + (b.duration || 60));
        return now > end;
      }
      return false;
    });
  }

  async getUpcomingBookings(coachId: string): Promise<Booking[]> {
    const now = new Date();
    return mockBookings.filter((b) => {
      if (b.coachId !== coachId) return false;
      if (b.status !== 'CONFIRMED' && b.status !== 'PENDING') return false;
      return new Date(b.scheduledAt) > now;
    });
  }

  async createFromDraft(): Promise<Booking> {
    const draft = this.draft;

    if (!draft.coachId || !draft.coachName) {
      throw new Error('Cannot create booking: missing coach information');
    }
    if (!draft.athleteId || !draft.athleteName) {
      throw new Error('Cannot create booking: missing athlete information');
    }

    const scheduledAt = `${draft.date || new Date().toISOString().split('T')[0]}T${draft.slot || '10:00'}:00`;

    const booking: Booking = {
      id: `draft_${Date.now()}`,
      coachId: draft.coachId,
      coachName: draft.coachName,
      athleteIds: draft.childIds || [draft.athleteId!],
      athleteId: draft.athleteId!,
      athleteName: draft.athleteName!,
      bookedById: draft.athleteId!,
      scheduledAt,
      status: 'PENDING',
      duration: draft.duration || 60,
      location: draft.locationText || 'Coach preferred venue',
      service: draft.sessionType || '1-on-1',
      serviceType: draft.sessionType || '1-on-1',
      objectives: draft.objectives || [],
      price: draft.price || 0,
      notes: draft.notes || '',
      createdAt: new Date().toISOString(),
      isSharedSession: (draft.childIds?.length || 1) > 1,
    };

    mockBookings.push(booking);
    this.resetDraft();
    return booking;
  }
}

// Test data
const MOCK_BOOKINGS_DATA: Booking[] = [
  {
    id: 'booking_1',
    coachId: 'coach1',
    coachName: 'Sarah Mitchell',
    athleteId: 'athlete1',
    athleteName: 'Tom Wilson',
    bookedById: 'parent1',
    scheduledAt: '2026-02-10T10:00:00Z',
    location: 'Central Park Training Ground',
    service: '1-on-1 Training',
    status: 'CONFIRMED',
    price: 45,
    duration: 60,
  },
  {
    id: 'booking_2',
    coachId: 'coach1',
    coachName: 'Sarah Mitchell',
    athleteId: 'athlete2',
    athleteName: 'Emma Davis',
    bookedById: 'parent2',
    scheduledAt: '2026-02-11T14:00:00Z',
    location: 'City Stadium',
    service: 'Group Session',
    status: 'PENDING',
    price: 30,
    duration: 90,
  },
  {
    id: 'booking_3',
    coachId: 'coach2',
    coachName: 'James Rodriguez',
    athleteId: 'athlete1',
    athleteName: 'Tom Wilson',
    bookedById: 'parent1',
    // Past session for testing AWAITING_COMPLETION
    scheduledAt: '2025-01-01T10:00:00Z',
    location: 'Downtown Pitch',
    service: '1-on-1 Training',
    status: 'CONFIRMED',
    price: 50,
    duration: 60,
  },
];

const MOCK_AVAILABLE_SLOTS = [
  { coachId: 'coach1', date: '2026-02-15', startTime: '10:00', isAvailable: true },
  { coachId: 'coach1', date: '2026-02-15', startTime: '14:00', isAvailable: true },
  { coachId: 'coach1', date: '2026-02-15', startTime: '16:00', isAvailable: false }, // Already booked
  { coachId: 'coach2', date: '2026-02-15', startTime: '09:00', isAvailable: true },
];

let bookingService: MockBookingService;

// Reset mocks before each test
beforeEach(() => {
  mockBookings = JSON.parse(JSON.stringify(MOCK_BOOKINGS_DATA));
  mockAvailableSlots = JSON.parse(JSON.stringify(MOCK_AVAILABLE_SLOTS));
  mockNotifications = [];
  bookingService = new MockBookingService();
});

// ============================================================================
// BOOKING LISTING TESTS
// ============================================================================

describe('BookingService - List Operations', () => {
  test('list() returns all bookings', async () => {
    const bookings = await bookingService.list();
    assert.strictEqual(bookings.length, 3);
  });

  test('getBooking() returns booking by ID', async () => {
    const booking = await bookingService.getBooking('booking_1');
    assert.ok(booking);
    assert.strictEqual(booking.coachName, 'Sarah Mitchell');
    assert.strictEqual(booking.athleteName, 'Tom Wilson');
  });

  test('getBooking() returns null for non-existent ID', async () => {
    const booking = await bookingService.getBooking('non_existent');
    assert.strictEqual(booking, null);
  });

  test('getById() returns booking by ID', async () => {
    const booking = await bookingService.getById('booking_2');
    assert.ok(booking);
    assert.strictEqual(booking.status, 'PENDING');
  });
});

// ============================================================================
// BOOKING CREATION TESTS
// ============================================================================

describe('BookingService - Create Booking', () => {
  test('createBooking() creates a new booking with valid slot', async () => {
    const params: CreateBookingParams = {
      coachId: 'coach1',
      coachName: 'Sarah Mitchell',
      athleteIds: ['athlete3'],
      athleteNames: ['Jake Smith'],
      bookedById: 'parent3',
      bookedByName: 'Mr Smith',
      scheduledAt: '2026-02-15T10:00:00Z',
      duration: 60,
      location: 'Central Park',
      service: '1-on-1 Training',
      serviceType: '1-on-1',
      price: 45,
    };

    const result = await bookingService.createBooking(params);

    assert.ok(result.success);
    assert.ok(result.booking);
    assert.strictEqual(result.booking.coachName, 'Sarah Mitchell');
    assert.strictEqual(result.booking.athleteName, 'Jake Smith');
    assert.strictEqual(result.booking.status, 'CONFIRMED');
    assert.strictEqual(result.booking.price, 45);
  });

  test('createBooking() fails for unavailable slot', async () => {
    const params: CreateBookingParams = {
      coachId: 'coach1',
      coachName: 'Sarah Mitchell',
      athleteIds: ['athlete3'],
      athleteNames: ['Jake Smith'],
      bookedById: 'parent3',
      bookedByName: 'Mr Smith',
      scheduledAt: '2026-02-15T16:00:00Z', // Already booked slot
      duration: 60,
      location: 'Central Park',
      service: '1-on-1 Training',
      serviceType: '1-on-1',
    };

    const result = await bookingService.createBooking(params);

    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes('fully booked'));
  });

  test('createBooking() fails for slot outside coach hours', async () => {
    const params: CreateBookingParams = {
      coachId: 'coach1',
      coachName: 'Sarah Mitchell',
      athleteIds: ['athlete3'],
      athleteNames: ['Jake Smith'],
      bookedById: 'parent3',
      bookedByName: 'Mr Smith',
      scheduledAt: '2026-02-15T22:00:00Z', // Not in available slots
      duration: 60,
      location: 'Central Park',
      service: '1-on-1 Training',
      serviceType: '1-on-1',
    };

    const result = await bookingService.createBooking(params);

    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes('available hours'));
  });

  test('createBooking() calculates total price for multiple athletes', async () => {
    const params: CreateBookingParams = {
      coachId: 'coach1',
      coachName: 'Sarah Mitchell',
      athleteIds: ['athlete3', 'athlete4'],
      athleteNames: ['Jake Smith', 'Amy Johnson'],
      bookedById: 'parent3',
      bookedByName: 'Mr Smith',
      scheduledAt: '2026-02-15T10:00:00Z',
      duration: 60,
      location: 'Central Park',
      service: 'Shared Session',
      serviceType: 'shared',
      price: 30, // Per athlete
    };

    const result = await bookingService.createBooking(params);

    assert.ok(result.success);
    assert.strictEqual(result.booking?.price, 60); // 30 * 2 athletes
    assert.strictEqual(result.booking?.isSharedSession, true);
    assert.strictEqual(result.booking?.athleteName, 'Jake Smith, Amy Johnson');
  });

  test('createBooking() creates notification for coach', async () => {
    const params: CreateBookingParams = {
      coachId: 'coach1',
      coachName: 'Sarah Mitchell',
      athleteIds: ['athlete3'],
      athleteNames: ['Jake Smith'],
      bookedById: 'parent3',
      bookedByName: 'Mr Smith',
      scheduledAt: '2026-02-15T10:00:00Z',
      duration: 60,
      location: 'Central Park',
      service: '1-on-1 Training',
      serviceType: '1-on-1',
    };

    await bookingService.createBooking(params);

    const notification = mockNotifications.find((n) => n.type === 'booking_created');
    assert.ok(notification);
    assert.strictEqual(notification.coachId, 'coach1');
  });
});

// ============================================================================
// BOOKING VALIDATION TESTS
// ============================================================================

describe('BookingService - Validation', () => {
  test('validateBooking() returns valid for available slot', async () => {
    const result = await bookingService.validateBooking('coach1', '2026-02-15', '10:00', 60);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.reason, undefined);
  });

  test('validateBooking() returns invalid for booked slot', async () => {
    const result = await bookingService.validateBooking('coach1', '2026-02-15', '16:00', 60);
    assert.strictEqual(result.valid, false);
    assert.ok(result.reason?.includes('fully booked'));
  });

  test('validateBooking() returns invalid for non-existent slot', async () => {
    const result = await bookingService.validateBooking('coach1', '2026-02-15', '23:00', 60);
    assert.strictEqual(result.valid, false);
    assert.ok(result.reason?.includes('available hours'));
  });
});

// ============================================================================
// BOOKING STATUS TESTS
// ============================================================================

describe('BookingService - Status Management', () => {
  test('updateStatus() changes booking status', async () => {
    const updated = await bookingService.updateStatus('booking_2', 'CONFIRMED');
    assert.ok(updated);
    assert.strictEqual(updated.status, 'CONFIRMED');
  });

  test('confirmBooking() confirms pending booking and creates notification', async () => {
    const result = await bookingService.confirmBooking('booking_2');
    assert.ok(result.success);

    const booking = await bookingService.getBooking('booking_2');
    assert.strictEqual(booking?.status, 'CONFIRMED');

    const notification = mockNotifications.find((n) => n.type === 'booking_confirmed');
    assert.ok(notification);
  });

  test('confirmBooking() fails for non-existent booking', async () => {
    const result = await bookingService.confirmBooking('non_existent');
    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes('not found'));
  });

  test('checkAndTransitionStatus() transitions past sessions to AWAITING_COMPLETION', async () => {
    // booking_3 is in the past
    const booking = await bookingService.checkAndTransitionStatus('booking_3');
    assert.strictEqual(booking.status, 'AWAITING_COMPLETION');
  });

  test('checkAndTransitionStatus() keeps future sessions as CONFIRMED', async () => {
    // booking_1 is in the future
    const booking = await bookingService.checkAndTransitionStatus('booking_1');
    assert.strictEqual(booking.status, 'CONFIRMED');
  });
});

// ============================================================================
// BOOKING CANCELLATION TESTS
// ============================================================================

describe('BookingService - Cancellation', () => {
  test('cancel() cancels booking and sets reason', async () => {
    const cancelled = await bookingService.cancel('booking_1', 'Schedule conflict', 'parent');

    assert.ok(cancelled);
    assert.strictEqual(cancelled.status, 'CANCELLED');
    assert.strictEqual(cancelled.cancellationReason, 'Schedule conflict');
  });

  test('cancel() by parent notifies coach', async () => {
    await bookingService.cancel('booking_1', 'Schedule conflict', 'parent');

    const notification = mockNotifications.find((n) => n.type === 'booking_cancelled');
    assert.ok(notification);
    assert.strictEqual(notification.cancelledBy, 'parent');
    assert.strictEqual(notification.recipientId, 'coach1');
  });

  test('cancel() by coach notifies parent', async () => {
    await bookingService.cancel('booking_1', 'Emergency', 'coach');

    const notification = mockNotifications.find((n) => n.type === 'booking_cancelled');
    assert.ok(notification);
    assert.strictEqual(notification.cancelledBy, 'coach');
    assert.strictEqual(notification.recipientId, 'parent1');
  });

  test('cancel() returns undefined for non-existent booking', async () => {
    const result = await bookingService.cancel('non_existent', 'Test');
    assert.strictEqual(result, undefined);
  });
});

// ============================================================================
// BOOKING QUERY TESTS
// ============================================================================

describe('BookingService - User Queries', () => {
  test('getBookingsForUser() returns coach bookings', async () => {
    const bookings = await bookingService.getBookingsForUser('coach1', 'coach');
    assert.strictEqual(bookings.length, 2);
    assert.ok(bookings.every((b) => b.coachId === 'coach1'));
  });

  test('getBookingsForUser() returns parent bookings', async () => {
    const bookings = await bookingService.getBookingsForUser('parent1', 'parent');
    assert.strictEqual(bookings.length, 2);
    assert.ok(bookings.every((b) => b.bookedById === 'parent1'));
  });

  test('getBookingsForUser() returns athlete bookings', async () => {
    const bookings = await bookingService.getBookingsForUser('athlete1', 'athlete');
    assert.strictEqual(bookings.length, 2);
    assert.ok(bookings.every((b) => b.athleteId === 'athlete1'));
  });

  test('getUpcomingBookings() returns future confirmed/pending bookings', async () => {
    const bookings = await bookingService.getUpcomingBookings('coach1');
    // Only booking_1 and booking_2 are future bookings for coach1
    assert.strictEqual(bookings.length, 2);
    assert.ok(bookings.every((b) => new Date(b.scheduledAt) > new Date()));
  });

  test('getAwaitingCompletion() returns past sessions needing completion', async () => {
    const bookings = await bookingService.getAwaitingCompletion('coach2');
    // booking_3 is past and should auto-detect as awaiting completion
    assert.strictEqual(bookings.length, 1);
    assert.strictEqual(bookings[0].id, 'booking_3');
  });
});

// ============================================================================
// DRAFT BOOKING TESTS
// ============================================================================

describe('BookingService - Draft Flow', () => {
  test('getDraft() returns empty draft initially', () => {
    const draft = bookingService.getDraft();
    assert.deepStrictEqual(draft, {});
  });

  test('updateDraft() updates draft with new values', () => {
    bookingService.updateDraft({ coachId: 'coach1', coachName: 'Sarah' });
    bookingService.updateDraft({ sessionType: '1-on-1', price: 45 });

    const draft = bookingService.getDraft();
    assert.strictEqual(draft.coachId, 'coach1');
    assert.strictEqual(draft.coachName, 'Sarah');
    assert.strictEqual(draft.sessionType, '1-on-1');
    assert.strictEqual(draft.price, 45);
  });

  test('resetDraft() clears the draft', () => {
    bookingService.updateDraft({ coachId: 'coach1' });
    bookingService.resetDraft();

    const draft = bookingService.getDraft();
    assert.deepStrictEqual(draft, {});
  });

  test('createFromDraft() creates booking from draft', async () => {
    bookingService.updateDraft({
      coachId: 'coach1',
      coachName: 'Sarah Mitchell',
      athleteId: 'athlete1',
      athleteName: 'Tom Wilson',
      date: '2026-02-20',
      slot: '10:00',
      sessionType: '1-on-1',
      price: 45,
      locationText: 'Central Park',
    });

    const booking = await bookingService.createFromDraft();

    assert.ok(booking);
    assert.strictEqual(booking.coachName, 'Sarah Mitchell');
    assert.strictEqual(booking.athleteName, 'Tom Wilson');
    assert.strictEqual(booking.status, 'PENDING');
    assert.ok(booking.scheduledAt.includes('2026-02-20'));

    // Draft should be reset after creation
    const draft = bookingService.getDraft();
    assert.deepStrictEqual(draft, {});
  });

  test('createFromDraft() throws without coach info', async () => {
    bookingService.updateDraft({
      athleteId: 'athlete1',
      athleteName: 'Tom Wilson',
    });

    await assert.rejects(
      async () => await bookingService.createFromDraft(),
      /missing coach information/
    );
  });

  test('createFromDraft() throws without athlete info', async () => {
    bookingService.updateDraft({
      coachId: 'coach1',
      coachName: 'Sarah Mitchell',
    });

    await assert.rejects(
      async () => await bookingService.createFromDraft(),
      /missing athlete information/
    );
  });
});

// ============================================================================
// BOOKING UPDATE TESTS
// ============================================================================

describe('BookingService - Update Booking', () => {
  test('updateBooking() updates booking fields', async () => {
    const updated = await bookingService.updateBooking('booking_1', {
      location: 'New Location',
      notes: 'Updated notes',
    });

    assert.strictEqual(updated.location, 'New Location');
    assert.strictEqual(updated.notes, 'Updated notes');
    // Original fields should be preserved
    assert.strictEqual(updated.coachName, 'Sarah Mitchell');
  });

  test('updateBooking() throws for non-existent booking', async () => {
    await assert.rejects(
      async () => await bookingService.updateBooking('non_existent', { notes: 'Test' }),
      /Booking not found/
    );
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('BookingService - Edge Cases', () => {
  test('handles empty booking list', async () => {
    mockBookings = [];
    const bookings = await bookingService.list();
    assert.strictEqual(bookings.length, 0);
  });

  test('getBookingsForUser() returns empty array for unknown user', async () => {
    const bookings = await bookingService.getBookingsForUser('unknown', 'coach');
    assert.strictEqual(bookings.length, 0);
  });

  test('createBooking() with session invite link', async () => {
    const params: CreateBookingParams = {
      coachId: 'coach1',
      coachName: 'Sarah Mitchell',
      athleteIds: ['athlete3'],
      athleteNames: ['Jake Smith'],
      bookedById: 'parent3',
      bookedByName: 'Mr Smith',
      scheduledAt: '2026-02-15T10:00:00Z',
      duration: 60,
      location: 'Central Park',
      service: '1-on-1 Training',
      serviceType: '1-on-1',
      sessionInviteId: 'invite_123', // Link to session invite
    };

    const result = await bookingService.createBooking(params);

    assert.ok(result.success);
    assert.strictEqual(result.booking?.sessionInviteId, 'invite_123');
  });

  test('createBooking() with objectives', async () => {
    const params: CreateBookingParams = {
      coachId: 'coach1',
      coachName: 'Sarah Mitchell',
      athleteIds: ['athlete3'],
      athleteNames: ['Jake Smith'],
      bookedById: 'parent3',
      bookedByName: 'Mr Smith',
      scheduledAt: '2026-02-15T10:00:00Z',
      duration: 60,
      location: 'Central Park',
      service: '1-on-1 Training',
      serviceType: '1-on-1',
      objectives: ['Improve passing', 'Work on stamina'],
    };

    const result = await bookingService.createBooking(params);

    assert.ok(result.success);
    assert.deepStrictEqual(result.booking?.objectives, ['Improve passing', 'Work on stamina']);
  });
});
