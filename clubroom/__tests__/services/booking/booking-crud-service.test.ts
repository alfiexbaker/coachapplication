import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { bookingCrudService } from '@/services/booking/booking-crud-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { onTyped, ServiceEvents } from '@/services/event-bus';

describe('BookingCrudService', () => {
  beforeEach(async () => {
    // Clear storage and reset draft
    await apiClient.remove(STORAGE_KEYS.BOOKINGS);
    bookingCrudService.resetDraft();
  });

  describe('draft management', () => {
    it('should get empty draft initially', () => {
      const draft = bookingCrudService.getDraft();
      assert.deepEqual(draft, {});
    });

    it('should update draft with partial data', () => {
      bookingCrudService.updateDraft({ sessionType: '1-on-1', duration: 60 });
      const draft = bookingCrudService.getDraft();

      assert.equal(draft.sessionType, '1-on-1');
      assert.equal(draft.duration, 60);
    });

    it('should merge draft updates', () => {
      bookingCrudService.updateDraft({ sessionType: '1-on-1' });
      bookingCrudService.updateDraft({ duration: 60 });
      const draft = bookingCrudService.getDraft();

      assert.equal(draft.sessionType, '1-on-1');
      assert.equal(draft.duration, 60);
    });

    it('should reset draft to empty', () => {
      bookingCrudService.updateDraft({ sessionType: '1-on-1', duration: 60 });
      bookingCrudService.resetDraft();
      const draft = bookingCrudService.getDraft();

      assert.deepEqual(draft, {});
    });
  });

  describe('create', () => {
    it('should return ok() when creating valid booking', async () => {
      const params = {
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Test Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Test Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Test Field',
        service: '1-on-1 Coaching',
        serviceType: 'COACHING',
        price: 50,
        skipAvailabilityValidation: true,
      };

      const result = await bookingCrudService.createBooking(params);

      assert.ok(result.success);
      assert.ok(result.data.id);
      assert.equal(result.data.coachId, params.coachId);
      assert.equal(result.data.status, 'CONFIRMED');
    });

    it('should return err() when scheduledAt is missing', async () => {
      const params = {
        coachId: 'coach1',
        coachName: 'Test Coach',
        athleteIds: ['athlete1'],
        athleteNames: ['Test Athlete'],
        bookedById: 'parent1',
        bookedByName: 'Test Parent',
        scheduledAt: '',
        duration: 60,
        location: 'Test Field',
        service: '1-on-1 Coaching',
        serviceType: 'COACHING',
        skipAvailabilityValidation: true,
      };

      const result = await bookingCrudService.createBooking(params);

      assert.ok(!result.success);
      assert.equal(result.error.code, 'VALIDATION');
    });

    it('should emit BOOKING_CREATED event on success', async () => {
      const events: any[] = [];
      const unsub = onTyped(ServiceEvents.BOOKING_CREATED, (payload) => {
        events.push(payload);
      });

      const params = {
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Test Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Test Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Test Field',
        service: '1-on-1 Coaching',
        serviceType: 'COACHING',
        skipAvailabilityValidation: true,
      };

      const result = await bookingCrudService.createBooking(params);
      assert.ok(result.success);
      await new Promise((resolve) => setTimeout(resolve, 0));

      assert.ok(events.some((event) => event.bookingId === result.data.id));
      assert.ok(events.some((event) => event.coachId === params.coachId));
      unsub();
    });

    it('should handle multiple athletes in booking', async () => {
      const athleteIds = [
        'athlete-' + Math.random().toString(36).slice(2),
        'athlete-' + Math.random().toString(36).slice(2),
      ];
      const params = {
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds,
        athleteNames: ['Athlete 1', 'Athlete 2'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Test Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Test Field',
        service: 'Group Session',
        serviceType: 'GROUP',
        skipAvailabilityValidation: true,
      };

      const result = await bookingCrudService.createBooking(params);

      assert.ok(result.success);
      assert.equal(result.data.athleteIds?.length, 2);
    });

    it('should return err() when booking persistence fails', async () => {
      const apiClientMutable = apiClient as unknown as { set: typeof apiClient.set };
      const originalSet = apiClientMutable.set;
      apiClientMutable.set = async () => {
        throw new Error('forced write failure');
      };

      try {
        const result = await bookingCrudService.createBooking({
          coachId: 'coach-' + Math.random().toString(36).slice(2),
          coachName: 'Test Coach',
          athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
          athleteNames: ['Test Athlete'],
          bookedById: 'parent-' + Math.random().toString(36).slice(2),
          bookedByName: 'Test Parent',
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
          duration: 60,
          location: 'Test Field',
          service: '1-on-1 Coaching',
          serviceType: 'COACHING',
          skipAvailabilityValidation: true,
        });

        assert.equal(result.success, false);
        if (!result.success) {
          assert.equal(result.error.code, 'STORAGE');
        }
      } finally {
        apiClientMutable.set = originalSet;
      }
    });
  });

  describe('list', () => {
    it('should return empty array initially', async () => {
      const bookings = await bookingCrudService.list();
      assert.ok(Array.isArray(bookings));
      assert.equal(bookings.length, 0);
    });

    it('should return all bookings after creation', async () => {
      await bookingCrudService.createBooking({
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Coach 1',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Athlete 1'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Field',
        service: '1-on-1',
        serviceType: 'COACHING',
        skipAvailabilityValidation: true,
      });

      const bookings = await bookingCrudService.list();
      assert.equal(bookings.length, 1);
    });
  });

  describe('getBooking', () => {
    it('should return booking by id', async () => {
      const createResult = await bookingCrudService.createBooking({
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Test Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Test Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Test Field',
        service: '1-on-1',
        serviceType: 'COACHING',
        skipAvailabilityValidation: true,
      });

      assert.ok(createResult.success);
      const booking = await bookingCrudService.getBooking(createResult.data.id);

      assert.ok(booking);
      assert.equal(booking.id, createResult.data.id);
    });

    it('should return null for non-existent booking', async () => {
      const booking = await bookingCrudService.getBooking('fake-id-' + Math.random().toString(36).slice(2));
      assert.equal(booking, null);
    });
  });

  describe('updateBooking', () => {
    it('should return ok() and update booking', async () => {
      const createResult = await bookingCrudService.createBooking({
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Test Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Test Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Test Field',
        service: '1-on-1',
        serviceType: 'COACHING',
        skipAvailabilityValidation: true,
      });

      assert.ok(createResult.success);
      const updateResult = await bookingCrudService.updateBooking(createResult.data.id, {
        status: 'CONFIRMED',
        notes: 'Updated notes',
      });

      assert.ok(updateResult.success);
      assert.equal(updateResult.data.status, 'CONFIRMED');
      assert.equal(updateResult.data.notes, 'Updated notes');
    });

    it('should return error for non-existent booking', async () => {
      const result = await bookingCrudService.updateBooking('fake-id-' + Math.random().toString(36).slice(2), {
        status: 'CONFIRMED',
      });

      assert.ok(!result.success);
    });
  });

  describe('cancel', () => {
    it('should return ok() and cancel booking', async () => {
      const createResult = await bookingCrudService.createBooking({
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Test Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Test Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Test Field',
        service: '1-on-1',
        serviceType: 'COACHING',
        skipAvailabilityValidation: true,
      });

      assert.ok(createResult.success);
      const cancelResult = await bookingCrudService.cancel(
        createResult.data.id,
        'Schedule conflict',
        'coach'
      );

      assert.ok(cancelResult);
      assert.equal(cancelResult.status, 'CANCELLED');
      assert.equal(cancelResult.cancellationReason, 'Schedule conflict');
    });

    it('should return err() for non-existent booking', async () => {
      const result = await bookingCrudService.cancel(
        'fake-id-' + Math.random().toString(36).slice(2),
        'Test',
        'coach'
      );

      assert.equal(result, undefined);
    });

    it('should emit BOOKING_CANCELLED event', async () => {
      const events: any[] = [];
      const unsub = onTyped(ServiceEvents.BOOKING_CANCELLED, (payload) => {
        events.push(payload);
      });

      const createResult = await bookingCrudService.createBooking({
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Test Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Test Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Test Field',
        service: '1-on-1',
        serviceType: 'COACHING',
        skipAvailabilityValidation: true,
      });

      assert.ok(createResult.success);
      await bookingCrudService.cancel(createResult.data.id, 'Test reason', 'coach');

      assert.equal(events.length, 1);
      assert.equal(events[0].bookingId, createResult.data.id);
      unsub();
    });

    it('should not emit BOOKING_CANCELLED when persistence fails', async () => {
      const createResult = await bookingCrudService.createBooking({
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Test Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Test Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Test Field',
        service: '1-on-1',
        serviceType: 'COACHING',
        skipAvailabilityValidation: true,
      });
      assert.ok(createResult.success);

      const events: any[] = [];
      const unsub = onTyped(ServiceEvents.BOOKING_CANCELLED, (payload) => {
        events.push(payload);
      });

      const apiClientMutable = apiClient as unknown as { set: typeof apiClient.set };
      const originalSet = apiClientMutable.set;
      apiClientMutable.set = async () => {
        throw new Error('forced cancel write failure');
      };

      try {
        const result = await bookingCrudService.cancel(createResult.data.id, 'Schedule conflict', 'coach');
        assert.equal(result, undefined);
        assert.equal(events.length, 0);
      } finally {
        apiClientMutable.set = originalSet;
        unsub();
      }
    });
  });
});
