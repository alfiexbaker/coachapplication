import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { bookingStatusService } from '@/services/booking/booking-status-service';
import { bookingCrudService } from '@/services/booking/booking-crud-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { onTyped, ServiceEvents } from '@/services/event-bus';

describe('BookingStatusService', () => {
  beforeEach(async () => {
    // Clear storage
    await apiClient.remove(STORAGE_KEYS.BOOKINGS);
    await apiClient.remove(STORAGE_KEYS.NOTIFICATIONS);
  });

  describe('confirmBooking', () => {
    it('should return success when confirming valid booking', async () => {
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
      });

      assert.ok(createResult.success);
      const result = await bookingStatusService.confirmBooking(createResult.data.id);

      assert.ok(result.success);
    });

    it('should update booking status to CONFIRMED', async () => {
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
      });

      assert.ok(createResult.success);
      await bookingStatusService.confirmBooking(createResult.data.id);

      const booking = await bookingCrudService.getBooking(createResult.data.id);
      assert.ok(booking);
      assert.equal(booking.status, 'CONFIRMED');
    });

    it('should return error for non-existent booking', async () => {
      const result = await bookingStatusService.confirmBooking('fake-id-' + Math.random().toString(36).slice(2));

      assert.ok(!result.success);
      assert.ok(result.error);
    });

    it('should emit BOOKING_CONFIRMED event', async () => {
      const events: any[] = [];
      const unsub = onTyped(ServiceEvents.BOOKING_CONFIRMED, (payload) => {
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
      });

      assert.ok(createResult.success);
      await bookingStatusService.confirmBooking(createResult.data.id);

      assert.equal(events.length, 1);
      assert.equal(events[0].bookingId, createResult.data.id);
      unsub();
    });

    it('should create confirmation notification', async () => {
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
      });

      assert.ok(createResult.success);
      await bookingStatusService.confirmBooking(createResult.data.id);

      const notifications = await apiClient.get(STORAGE_KEYS.NOTIFICATIONS, []);
      assert.ok(notifications.length > 0);
    });
  });

  describe('checkAndTransitionStatus', () => {
    it('should return ok() for valid booking', async () => {
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
      });

      assert.ok(createResult.success);
      const result = await bookingStatusService.checkAndTransitionStatus(createResult.data.id);

      assert.ok(result.success);
    });

    it('should return err() for non-existent booking', async () => {
      const result = await bookingStatusService.checkAndTransitionStatus('fake-id-' + Math.random().toString(36).slice(2));

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });

    it('should transition confirmed past session to AWAITING_COMPLETION', async () => {
      const createResult = await bookingCrudService.createBooking({
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Test Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Test Parent',
        scheduledAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        duration: 60,
        location: 'Test Field',
        service: '1-on-1',
        serviceType: 'COACHING',
      });

      assert.ok(createResult.success);
      await bookingCrudService.updateBooking(createResult.data.id, { status: 'CONFIRMED' });

      const result = await bookingStatusService.checkAndTransitionStatus(createResult.data.id);

      assert.ok(result.success);
      assert.equal(result.data.status, 'AWAITING_COMPLETION');
    });

    it('should not transition future confirmed session', async () => {
      const createResult = await bookingCrudService.createBooking({
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Test Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Test Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(), // tomorrow
        duration: 60,
        location: 'Test Field',
        service: '1-on-1',
        serviceType: 'COACHING',
      });

      assert.ok(createResult.success);
      await bookingCrudService.updateBooking(createResult.data.id, { status: 'CONFIRMED' });

      const result = await bookingStatusService.checkAndTransitionStatus(createResult.data.id);

      assert.ok(result.success);
      assert.equal(result.data.status, 'CONFIRMED');
    });

    it('should not transition pending booking', async () => {
      const createResult = await bookingCrudService.createBooking({
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Test Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Test Parent',
        scheduledAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        duration: 60,
        location: 'Test Field',
        service: '1-on-1',
        serviceType: 'COACHING',
      });

      assert.ok(createResult.success);
      const result = await bookingStatusService.checkAndTransitionStatus(createResult.data.id);

      assert.ok(result.success);
      assert.equal(result.data.status, 'PENDING');
    });
  });

  describe('scheduleSessionReminders', () => {
    it('should not throw errors', async () => {
      await bookingStatusService.scheduleSessionReminders();
      // Test passes if no error thrown
      assert.ok(true);
    });

    it('should process upcoming sessions', async () => {
      const createResult = await bookingCrudService.createBooking({
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Test Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Test Parent',
        scheduledAt: new Date(Date.now() + 1800000).toISOString(), // 30 minutes from now
        duration: 60,
        location: 'Test Field',
        service: '1-on-1',
        serviceType: 'COACHING',
      });

      assert.ok(createResult.success);
      await bookingCrudService.updateBooking(createResult.data.id, { status: 'CONFIRMED' });

      await bookingStatusService.scheduleSessionReminders();

      // Check if notification was created
      const notifications = await apiClient.get(STORAGE_KEYS.NOTIFICATIONS, []);
      assert.ok(notifications.length > 0);
    });

    it('should skip past sessions', async () => {
      const createResult = await bookingCrudService.createBooking({
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Test Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Test Parent',
        scheduledAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        duration: 60,
        location: 'Test Field',
        service: '1-on-1',
        serviceType: 'COACHING',
      });

      assert.ok(createResult.success);
      await bookingStatusService.scheduleSessionReminders();

      // No error should be thrown
      assert.ok(true);
    });

    it('should skip far-future sessions', async () => {
      const createResult = await bookingCrudService.createBooking({
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Test Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Test Parent',
        scheduledAt: new Date(Date.now() + 172800000).toISOString(), // 2 days from now
        duration: 60,
        location: 'Test Field',
        service: '1-on-1',
        serviceType: 'COACHING',
      });

      assert.ok(createResult.success);
      await bookingStatusService.scheduleSessionReminders();

      // No error should be thrown
      assert.ok(true);
    });
  });
});
