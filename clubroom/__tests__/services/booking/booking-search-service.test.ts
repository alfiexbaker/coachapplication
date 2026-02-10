import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { bookingSearchService } from '@/services/booking/booking-search-service';
import { bookingCrudService } from '@/services/booking/booking-crud-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('BookingSearchService', () => {
  beforeEach(async () => {
    // Clear storage
    await apiClient.remove(STORAGE_KEYS.BOOKINGS);
  });

  describe('getBookingsForUser', () => {
    it('should return empty array when no bookings exist', async () => {
      const bookings = await bookingSearchService.getBookingsForUser('coach1', 'coach');
      assert.ok(Array.isArray(bookings));
      assert.equal(bookings.length, 0);
    });

    it('should filter bookings by coach', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);
      const otherCoachId = 'coach-' + Math.random().toString(36).slice(2);

      // Create booking for coachId
      await bookingCrudService.createBooking({
        coachId,
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
      });

      // Create booking for other coach
      await bookingCrudService.createBooking({
        coachId: otherCoachId,
        coachName: 'Coach 2',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Athlete 2'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Field',
        service: '1-on-1',
        serviceType: 'COACHING',
      });

      const bookings = await bookingSearchService.getBookingsForUser(coachId, 'coach');

      assert.equal(bookings.length, 1);
      assert.equal(bookings[0].coachId, coachId);
    });

    it('should filter bookings by parent', async () => {
      const parentId = 'parent-' + Math.random().toString(36).slice(2);

      await bookingCrudService.createBooking({
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Athlete'],
        bookedById: parentId,
        bookedByName: 'Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Field',
        service: '1-on-1',
        serviceType: 'COACHING',
      });

      const bookings = await bookingSearchService.getBookingsForUser(parentId, 'parent');

      assert.equal(bookings.length, 1);
      assert.equal(bookings[0].bookedById, parentId);
    });

    it('should filter bookings by athlete', async () => {
      const athleteId = 'athlete-' + Math.random().toString(36).slice(2);

      await bookingCrudService.createBooking({
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Coach',
        athleteIds: [athleteId],
        athleteNames: ['Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Field',
        service: '1-on-1',
        serviceType: 'COACHING',
      });

      const bookings = await bookingSearchService.getBookingsForUser(athleteId, 'athlete');

      assert.equal(bookings.length, 1);
      assert.equal(bookings[0].athleteId, athleteId);
    });

    it('should handle errors and return empty array', async () => {
      const bookings = await bookingSearchService.getBookingsForUser('invalid-user', 'coach');
      assert.ok(Array.isArray(bookings));
    });
  });

  describe('getAwaitingCompletion', () => {
    it('should return bookings with AWAITING_COMPLETION status', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);

      const createResult = await bookingCrudService.createBooking({
        coachId,
        coachName: 'Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Parent',
        scheduledAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        duration: 60,
        location: 'Field',
        service: '1-on-1',
        serviceType: 'COACHING',
      });

      // Update to AWAITING_COMPLETION
      if (createResult.success) {
        await bookingCrudService.updateBooking(createResult.data.id, {
          status: 'AWAITING_COMPLETION',
        });
      }

      const bookings = await bookingSearchService.getAwaitingCompletion(coachId);

      assert.ok(bookings.length > 0);
      assert.equal(bookings[0].status, 'AWAITING_COMPLETION');
    });

    it('should include confirmed sessions that have passed', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);

      await bookingCrudService.createBooking({
        coachId,
        coachName: 'Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Parent',
        scheduledAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        duration: 60,
        location: 'Field',
        service: '1-on-1',
        serviceType: 'COACHING',
      });

      const bookings = await bookingSearchService.getAwaitingCompletion(coachId);

      // Should auto-detect the past confirmed session
      assert.ok(bookings.length > 0);
    });

    it('should not include future confirmed sessions', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);

      await bookingCrudService.createBooking({
        coachId,
        coachName: 'Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(), // tomorrow
        duration: 60,
        location: 'Field',
        service: '1-on-1',
        serviceType: 'COACHING',
      });

      const bookings = await bookingSearchService.getAwaitingCompletion(coachId);

      // Future sessions should not be included
      assert.equal(bookings.length, 0);
    });

    it('should filter by coach id', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);
      const otherCoachId = 'coach-' + Math.random().toString(36).slice(2);

      const createResult = await bookingCrudService.createBooking({
        coachId: otherCoachId,
        coachName: 'Other Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Parent',
        scheduledAt: new Date(Date.now() - 3600000).toISOString(),
        duration: 60,
        location: 'Field',
        service: '1-on-1',
        serviceType: 'COACHING',
      });

      if (createResult.success) {
        await bookingCrudService.updateBooking(createResult.data.id, {
          status: 'AWAITING_COMPLETION',
        });
      }

      const bookings = await bookingSearchService.getAwaitingCompletion(coachId);

      assert.equal(bookings.length, 0);
    });
  });

  describe('getUpcomingBookings', () => {
    it('should return future confirmed bookings', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);

      const createResult = await bookingCrudService.createBooking({
        coachId,
        coachName: 'Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(), // tomorrow
        duration: 60,
        location: 'Field',
        service: '1-on-1',
        serviceType: 'COACHING',
      });

      if (createResult.success) {
        await bookingCrudService.updateBooking(createResult.data.id, { status: 'CONFIRMED' });
      }

      const bookings = await bookingSearchService.getUpcomingBookings(coachId);

      assert.ok(bookings.length > 0);
      assert.equal(bookings[0].status, 'CONFIRMED');
    });

    it('should return future pending bookings', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);

      await bookingCrudService.createBooking({
        coachId,
        coachName: 'Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Field',
        service: '1-on-1',
        serviceType: 'COACHING',
      });

      const bookings = await bookingSearchService.getUpcomingBookings(coachId);

      assert.ok(bookings.length > 0);
      assert.ok(['CONFIRMED', 'PENDING'].includes(bookings[0].status));
    });

    it('should not include past bookings', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);

      const createResult = await bookingCrudService.createBooking({
        coachId,
        coachName: 'Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Parent',
        scheduledAt: new Date(Date.now() - 86400000).toISOString(), // yesterday
        duration: 60,
        location: 'Field',
        service: '1-on-1',
        serviceType: 'COACHING',
      });

      if (createResult.success) {
        await bookingCrudService.updateBooking(createResult.data.id, { status: 'CONFIRMED' });
      }

      const bookings = await bookingSearchService.getUpcomingBookings(coachId);

      assert.equal(bookings.length, 0);
    });

    it('should not include cancelled bookings', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);

      const createResult = await bookingCrudService.createBooking({
        coachId,
        coachName: 'Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Field',
        service: '1-on-1',
        serviceType: 'COACHING',
      });

      if (createResult.success) {
        await bookingCrudService.cancel(createResult.data.id, 'COACH', coachId, 'Test');
      }

      const bookings = await bookingSearchService.getUpcomingBookings(coachId);

      assert.equal(bookings.length, 0);
    });

    it('should filter by coach id', async () => {
      const coachId = 'coach-' + Math.random().toString(36).slice(2);
      const otherCoachId = 'coach-' + Math.random().toString(36).slice(2);

      await bookingCrudService.createBooking({
        coachId: otherCoachId,
        coachName: 'Other Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Field',
        service: '1-on-1',
        serviceType: 'COACHING',
      });

      const bookings = await bookingSearchService.getUpcomingBookings(coachId);

      assert.equal(bookings.length, 0);
    });
  });
});
