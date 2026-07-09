import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('BookingStatusService API mode', () => {
  it('does not write local awaiting-completion status for past confirmed bookings', async () => {
    const [{ bookingStatusService }, { bookingCrudService }] = await Promise.all([
      import('@/services/booking/booking-status-service'),
      import('@/services/booking/booking-crud-service'),
    ]);

    const originalGetBooking = bookingCrudService.getBooking;
    const originalUpdateBooking = bookingCrudService.updateBooking;
    let updateCalled = false;

    try {
      bookingCrudService.getBooking = async () =>
        ({
          id: 'booking_api_past_confirmed',
          coachId: 'usr_coach_api',
          coachName: 'API Coach',
          bookedById: 'usr_parent_api',
          athleteIds: ['ath_api_child'],
          status: 'CONFIRMED',
          scheduledAt: '2026-01-01T10:00:00.000Z',
          duration: 60,
          location: 'Pitch 1',
          service: 'Session',
          serviceType: '1-to-1',
          objectives: [],
          price: 0,
          notes: '',
          createdAt: '2026-01-01T09:00:00.000Z',
          updatedAt: '2026-01-01T09:00:00.000Z',
          version: 1,
        }) as Awaited<ReturnType<typeof bookingCrudService.getBooking>>;
      bookingCrudService.updateBooking = async () => {
        updateCalled = true;
        throw new Error('API mode must not write AWAITING_COMPLETION through updateBooking');
      };

      const result =
        await bookingStatusService.checkAndTransitionStatus('booking_api_past_confirmed');

      assert.equal(result.success, true);
      assert.equal(updateCalled, false);
      if (result.success) {
        assert.equal(result.data.status, 'CONFIRMED');
      }
    } finally {
      bookingCrudService.getBooking = originalGetBooking;
      bookingCrudService.updateBooking = originalUpdateBooking;
    }
  });
});
