import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { networkError } from '@/types/result';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

const apiBooking = {
  id: 'booking_api_runtime_mirror',
  coachUserId: 'usr_coach_api',
  bookedByUserId: 'usr_parent_api',
  status: 'CONFIRMED',
  scheduledAt: '2026-07-06T10:00:00.000Z',
  durationMinutes: 60,
  location: 'Pitch 1',
  serviceType: 'COACHING',
  sessionTemplateId: null,
  objectives: ['Passing'],
  notes: null,
  priceMinor: 2500,
  currency: 'GBP',
  participants: [
    { athleteId: 'ath_api_child', guardianUserId: 'usr_parent_api', status: 'confirmed' },
  ],
  version: 1,
  createdAt: '2026-07-01T10:00:00.000Z',
  updatedAt: '2026-07-01T10:00:00.000Z',
  cancelledAt: null,
};

describe('BookingCrudService API mode', () => {
  it('surfaces API read failures instead of empty booking state', async () => {
    const [{ bookingCrudService }, { bookingAuthorityService }] = await Promise.all([
      import('@/services/booking/booking-crud-service'),
      import('@/services/booking/booking-authority-service'),
    ]);

    const originalListBookings = bookingAuthorityService.listBookings;
    const originalGetBooking = bookingAuthorityService.getBooking;

    try {
      bookingAuthorityService.listBookings = async () =>
        ({
          success: true,
          data: [apiBooking],
        }) as Awaited<ReturnType<typeof bookingAuthorityService.listBookings>>;
      bookingAuthorityService.getBooking = async () =>
        ({
          success: true,
          data: apiBooking,
        }) as Awaited<ReturnType<typeof bookingAuthorityService.getBooking>>;

      assert.equal((await bookingCrudService.list()).length, 1);
      assert.equal((await bookingCrudService.getBooking(apiBooking.id))?.id, apiBooking.id);

      bookingAuthorityService.listBookings = async () =>
        ({
          success: false,
          error: networkError('bookings api unavailable'),
        }) as Awaited<ReturnType<typeof bookingAuthorityService.listBookings>>;
      bookingAuthorityService.getBooking = async () =>
        ({
          success: false,
          error: networkError('booking api unavailable'),
        }) as Awaited<ReturnType<typeof bookingAuthorityService.getBooking>>;

      await assert.rejects(() => bookingCrudService.list(), /bookings api unavailable/i);
      await assert.rejects(
        () => bookingCrudService.getBooking(apiBooking.id),
        /booking api unavailable/i,
      );
    } finally {
      bookingAuthorityService.listBookings = originalListBookings;
      bookingAuthorityService.getBooking = originalGetBooking;
    }
  });

  it('does not serve cached booking lists in API mode', async () => {
    const [{ bookingCrudService }, { bookingAuthorityService }] = await Promise.all([
      import('@/services/booking/booking-crud-service'),
      import('@/services/booking/booking-authority-service'),
    ]);

    const originalListBookings = bookingAuthorityService.listBookings;
    let listCalls = 0;

    try {
      bookingAuthorityService.listBookings = async () => {
        listCalls += 1;
        if (listCalls === 1) {
          return {
            success: true,
            data: [apiBooking],
          } as Awaited<ReturnType<typeof bookingAuthorityService.listBookings>>;
        }
        return {
          success: false,
          error: networkError('bookings api unavailable after cache seed'),
        } as Awaited<ReturnType<typeof bookingAuthorityService.listBookings>>;
      };

      assert.deepEqual(
        (await bookingCrudService.list()).map((booking) => booking.id),
        [apiBooking.id],
      );
      await assert.rejects(
        () => bookingCrudService.list(),
        /bookings api unavailable after cache seed/i,
      );
      assert.equal(listCalls, 2);
    } finally {
      bookingAuthorityService.listBookings = originalListBookings;
    }
  });

  it('updates booking detail fields through v1 in API mode', async () => {
    const [{ bookingCrudService }, { bookingAuthorityService }] = await Promise.all([
      import('@/services/booking/booking-crud-service'),
      import('@/services/booking/booking-authority-service'),
    ]);

    const originalGetBooking = bookingAuthorityService.getBooking;
    const originalUpdateBooking = bookingAuthorityService.updateBooking;
    let updateCall: {
      bookingId: string;
      input: {
        location?: string;
        notes?: string;
        objectives?: string[];
        priceMinor?: number;
        currency?: 'GBP';
        expectedVersion?: number;
      };
    } | null = null;

    try {
      bookingAuthorityService.getBooking = async () =>
        ({
          success: true,
          data: apiBooking,
        }) as Awaited<ReturnType<typeof bookingAuthorityService.getBooking>>;
      bookingAuthorityService.updateBooking = async (bookingId, input) => {
        updateCall = { bookingId, input };
        return {
          success: true,
          data: {
            ...apiBooking,
            location: input.location ?? apiBooking.location,
            notes: input.notes ?? apiBooking.notes,
            objectives: input.objectives ?? apiBooking.objectives,
            priceMinor: input.priceMinor ?? apiBooking.priceMinor,
            version: 2,
            updatedAt: '2026-07-02T10:00:00.000Z',
          },
        } as Awaited<ReturnType<typeof bookingAuthorityService.updateBooking>>;
      };

      const result = await bookingCrudService.updateBooking(apiBooking.id, {
        location: 'Pitch 2',
        notes: 'Bring water.',
        objectives: ['Scanning'],
        price: 30,
      });

      assert.equal(result.success, true);
      assert.deepEqual(updateCall, {
        bookingId: apiBooking.id,
        input: {
          location: 'Pitch 2',
          notes: 'Bring water.',
          objectives: ['Scanning'],
          priceMinor: 3000,
          currency: 'GBP',
          expectedVersion: 1,
        },
      });
      if (result.success) {
        assert.equal(result.data.location, 'Pitch 2');
        assert.deepEqual(result.data.objectives, ['Scanning']);
        assert.equal(result.data.price, 30);
        assert.equal(result.data.version, 2);
      }
    } finally {
      bookingAuthorityService.getBooking = originalGetBooking;
      bookingAuthorityService.updateBooking = originalUpdateBooking;
    }
  });

  it('surfaces API status update rejections instead of returning undefined', async () => {
    const [{ bookingCrudService }, { bookingAuthorityService }] = await Promise.all([
      import('@/services/booking/booking-crud-service'),
      import('@/services/booking/booking-authority-service'),
    ]);

    const originalGetBooking = bookingAuthorityService.getBooking;
    const originalUpdateBooking = bookingAuthorityService.updateBooking;

    try {
      bookingAuthorityService.getBooking = async () =>
        ({
          success: true,
          data: apiBooking,
        }) as Awaited<ReturnType<typeof bookingAuthorityService.getBooking>>;
      bookingAuthorityService.updateBooking = async () =>
        ({
          success: false,
          error: networkError('status update api unavailable'),
        }) as Awaited<ReturnType<typeof bookingAuthorityService.updateBooking>>;

      await assert.rejects(
        () => bookingCrudService.updateStatus(apiBooking.id, 'CANCELLED'),
        /explicit \/v1 lifecycle contract/,
      );
    } finally {
      bookingAuthorityService.getBooking = originalGetBooking;
      bookingAuthorityService.updateBooking = originalUpdateBooking;
    }
  });

  it('surfaces API cancel rejections instead of returning undefined', async () => {
    const [{ bookingCrudService }, { bookingAuthorityService }] = await Promise.all([
      import('@/services/booking/booking-crud-service'),
      import('@/services/booking/booking-authority-service'),
    ]);

    const originalGetBooking = bookingAuthorityService.getBooking;
    const originalCancelBooking = bookingAuthorityService.cancelBooking;
    const futureBooking = {
      ...apiBooking,
      scheduledAt: '2030-07-06T10:00:00.000Z',
    };

    try {
      bookingAuthorityService.getBooking = async () =>
        ({
          success: true,
          data: futureBooking,
        }) as Awaited<ReturnType<typeof bookingAuthorityService.getBooking>>;
      bookingAuthorityService.cancelBooking = async () =>
        ({
          success: false,
          error: networkError('cancel api unavailable'),
        }) as Awaited<ReturnType<typeof bookingAuthorityService.cancelBooking>>;

      await assert.rejects(
        () => bookingCrudService.cancel(apiBooking.id, 'weather', 'coach'),
        /cancel api unavailable/i,
      );
    } finally {
      bookingAuthorityService.getBooking = originalGetBooking;
      bookingAuthorityService.cancelBooking = originalCancelBooking;
    }
  });

  it('surfaces API reopen rejections instead of returning undefined', async () => {
    const [{ bookingCrudService }, { bookingAuthorityService }] = await Promise.all([
      import('@/services/booking/booking-crud-service'),
      import('@/services/booking/booking-authority-service'),
    ]);

    const originalGetBooking = bookingAuthorityService.getBooking;
    const originalReopenBooking = bookingAuthorityService.reopenBooking;
    const cancelledBooking = {
      ...apiBooking,
      status: 'CANCELLED' as const,
      scheduledAt: '2030-07-06T10:00:00.000Z',
      cancelledAt: '2026-07-01T11:00:00.000Z',
    };

    try {
      bookingAuthorityService.getBooking = async () =>
        ({
          success: true,
          data: cancelledBooking,
        }) as Awaited<ReturnType<typeof bookingAuthorityService.getBooking>>;
      bookingAuthorityService.reopenBooking = async () =>
        ({
          success: false,
          error: networkError('reopen api unavailable'),
        }) as Awaited<ReturnType<typeof bookingAuthorityService.reopenBooking>>;

      await assert.rejects(
        () => bookingCrudService.reopen(apiBooking.id, 'coach'),
        /reopen api unavailable/i,
      );
    } finally {
      bookingAuthorityService.getBooking = originalGetBooking;
      bookingAuthorityService.reopenBooking = originalReopenBooking;
    }
  });

  it('fails closed for local-only booking fields in API mode', async () => {
    const [{ bookingCrudService }, { bookingAuthorityService }] = await Promise.all([
      import('@/services/booking/booking-crud-service'),
      import('@/services/booking/booking-authority-service'),
    ]);

    const originalGetBooking = bookingAuthorityService.getBooking;
    const originalUpdateBooking = bookingAuthorityService.updateBooking;
    let updateCalled = false;

    try {
      bookingAuthorityService.getBooking = async () =>
        ({
          success: true,
          data: apiBooking,
        }) as Awaited<ReturnType<typeof bookingAuthorityService.getBooking>>;
      bookingAuthorityService.updateBooking = async (...args) => {
        updateCalled = true;
        return originalUpdateBooking.apply(bookingAuthorityService, args);
      };

      const result = await bookingCrudService.updateBooking(apiBooking.id, {
        groupSessionId: 'gse_local_only',
      });

      assert.equal(result.success, false);
      assert.equal(updateCalled, false);
      if (!result.success) {
        assert.equal(result.error.code, 'UNSUPPORTED');
      }
    } finally {
      bookingAuthorityService.getBooking = originalGetBooking;
      bookingAuthorityService.updateBooking = originalUpdateBooking;
    }
  });

  it('fails closed for incomplete drafts instead of defaulting API create payloads', async () => {
    const [{ bookingCrudService }, { bookingAuthorityService }] = await Promise.all([
      import('@/services/booking/booking-crud-service'),
      import('@/services/booking/booking-authority-service'),
    ]);

    const originalCreateBooking = bookingAuthorityService.createBooking;
    let createCalled = false;

    try {
      bookingCrudService.resetDraft();
      bookingCrudService.updateDraft({
        coachId: 'usr_coach_api',
        coachName: 'API Coach',
        childId: 'ath_api_child',
        athleteName: 'API Athlete',
      });
      bookingAuthorityService.createBooking = async (...args) => {
        createCalled = true;
        return originalCreateBooking.apply(bookingAuthorityService, args);
      };

      const result = await bookingCrudService.createFromDraft();

      assert.equal(result.success, false);
      assert.equal(createCalled, false);
      if (!result.success) {
        assert.equal(result.error.code, 'VALIDATION');
        assert.match(result.error.message, /missing scheduled date or time/i);
      }
    } finally {
      bookingCrudService.resetDraft();
      bookingAuthorityService.createBooking = originalCreateBooking;
    }
  });

  it('fails closed for generic draft athlete names before API create', async () => {
    const [{ bookingCrudService }, { bookingAuthorityService }] = await Promise.all([
      import('@/services/booking/booking-crud-service'),
      import('@/services/booking/booking-authority-service'),
    ]);

    const originalCreateBooking = bookingAuthorityService.createBooking;
    let createCalled = false;

    try {
      bookingCrudService.resetDraft();
      bookingCrudService.updateDraft({
        coachId: 'usr_coach_api',
        coachName: 'Amelia Shaw',
        athleteId: 'ath_api_child',
        athleteName: 'Athlete',
        createdByUserId: 'usr_parent_api',
        date: '2030-01-10',
        slot: '10:00',
        duration: 60,
        locationText: 'Pitch 1',
        sessionType: 'COACHING',
        sessionTypeLabel: '1-to-1 coaching',
        price: 25,
      });
      bookingAuthorityService.createBooking = async (...args) => {
        createCalled = true;
        return originalCreateBooking.apply(bookingAuthorityService, args);
      };

      const result = await bookingCrudService.createFromDraft();

      assert.equal(result.success, false);
      assert.equal(createCalled, false);
      if (!result.success) {
        assert.equal(result.error.code, 'VALIDATION');
        assert.match(result.error.message, /missing athlete information/i);
      }
    } finally {
      bookingCrudService.resetDraft();
      bookingAuthorityService.createBooking = originalCreateBooking;
    }
  });

  it('rejects generic booking metadata before API create', async () => {
    const [{ bookingCrudService }, { bookingAuthorityService }] = await Promise.all([
      import('@/services/booking/booking-crud-service'),
      import('@/services/booking/booking-authority-service'),
    ]);

    const originalCreateBooking = bookingAuthorityService.createBooking;
    let createCalled = false;

    try {
      bookingAuthorityService.createBooking = async (...args) => {
        createCalled = true;
        return originalCreateBooking.apply(bookingAuthorityService, args);
      };

      const result = await bookingCrudService.createBooking({
        coachId: 'usr_coach_api',
        coachName: 'Coach',
        athleteIds: ['ath_api_child'],
        athleteNames: ['Alex Barton'],
        bookedById: 'usr_parent_api',
        bookedByName: 'Olivia Barton',
        scheduledAt: '2030-01-10T10:00:00.000Z',
        duration: 60,
        location: 'Pitch 1',
        service: '1-to-1 coaching',
        serviceType: 'COACHING',
        price: 25,
        skipAvailabilityValidation: true,
      });

      assert.equal(result.success, false);
      assert.equal(createCalled, false);
      if (!result.success) {
        assert.equal(result.error.code, 'VALIDATION');
        assert.match(result.error.message, /missing coach information/i);
      }
    } finally {
      bookingAuthorityService.createBooking = originalCreateBooking;
    }
  });
});
