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
  it('does not use runtime booking mirrors as fallback when API reads fail', async () => {
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

      assert.deepEqual(await bookingCrudService.list(), []);
      assert.equal(await bookingCrudService.getBooking(apiBooking.id), null);
    } finally {
      bookingAuthorityService.listBookings = originalListBookings;
      bookingAuthorityService.getBooking = originalGetBooking;
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
});
