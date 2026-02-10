import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { eventAttendanceService } from '@/services/event/event-attendance-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { CheckInInput, ClubEvent } from '@/constants/types';

describe('EventAttendanceService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.EVENT_ATTENDANCE);
    await apiClient.remove(STORAGE_KEYS.EVENT_RSVPS);
    await apiClient.remove(STORAGE_KEYS.CLUB_EVENTS);
  });

  describe('checkIn', () => {
    it('should check in user successfully', async () => {
      const input: CheckInInput = {
        eventId: 'test-event-' + Math.random().toString(36).slice(2),
        userId: 'test-user-' + Math.random().toString(36).slice(2),
        userName: 'Test User',
        userRole: 'PARENT',
        checkedInBy: 'test-coach-' + Math.random().toString(36).slice(2),
        checkedInByName: 'Coach Name',
        checkInMethod: 'COACH',
        guestsCheckedIn: 2,
      };

      const result = await eventAttendanceService.checkIn(input);

      assert.ok(result);
      assert.equal(result.eventId, input.eventId);
      assert.equal(result.userId, input.userId);
      assert.equal(result.userName, input.userName);
      assert.equal(result.guestsCheckedIn, 2);
      assert.ok(result.checkedInAt);
    });

    it('should validate location when provided', async () => {
      const input: CheckInInput = {
        eventId: 'test-event-' + Math.random().toString(36).slice(2),
        userId: 'test-user-' + Math.random().toString(36).slice(2),
        userName: 'Test User',
        userRole: 'COACH',
        checkedInBy: 'test-coach-' + Math.random().toString(36).slice(2),
        checkedInByName: 'Coach Name',
        checkInMethod: 'SELF',
        location: {
          latitude: 51.5074,
          longitude: -0.1278,
        },
      };

      const result = await eventAttendanceService.checkIn(input);

      assert.ok(result.locationValidated !== undefined);
      assert.ok(result.distanceFromVenue !== undefined);
      assert.equal(typeof result.distanceFromVenue, 'number');
    });

    it('should update existing check-in for same user', async () => {
      const input: CheckInInput = {
        eventId: 'test-event-' + Math.random().toString(36).slice(2),
        userId: 'test-user-' + Math.random().toString(36).slice(2),
        userName: 'Test User',
        userRole: 'PARENT',
        checkedInBy: 'test-coach-' + Math.random().toString(36).slice(2),
        checkedInByName: 'Coach Name',
        checkInMethod: 'COACH',
        guestsCheckedIn: 2,
      };

      const result1 = await eventAttendanceService.checkIn(input);
      const updatedInput = { ...input, guestsCheckedIn: 3 };
      const result2 = await eventAttendanceService.checkIn(updatedInput);

      assert.equal(result1.id, result2.id);
      assert.equal(result2.guestsCheckedIn, 3);
    });
  });

  describe('removeCheckIn', () => {
    it('should remove check-in successfully', async () => {
      const eventId = 'test-event-' + Math.random().toString(36).slice(2);
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const input: CheckInInput = {
        eventId,
        userId,
        userName: 'Test User',
        userRole: 'PARENT',
        checkedInBy: 'test-coach-' + Math.random().toString(36).slice(2),
        checkedInByName: 'Coach Name',
        checkInMethod: 'COACH',
      };

      await eventAttendanceService.checkIn(input);
      await eventAttendanceService.removeCheckIn(eventId, userId);

      const isCheckedIn = await eventAttendanceService.isUserCheckedIn(eventId, userId);
      assert.equal(isCheckedIn, false);
    });
  });

  describe('getAttendeeList', () => {
    it('should return attendees for an event', async () => {
      const eventId = 'test-event-' + Math.random().toString(36).slice(2);
      const userId1 = 'test-user-1-' + Math.random().toString(36).slice(2);
      const userId2 = 'test-user-2-' + Math.random().toString(36).slice(2);

      await eventAttendanceService.checkIn({
        eventId,
        userId: userId1,
        userName: 'User 1',
        userRole: 'PARENT',
        checkedInBy: 'coach',
        checkedInByName: 'Coach',
        checkInMethod: 'COACH',
      });

      await eventAttendanceService.checkIn({
        eventId,
        userId: userId2,
        userName: 'User 2',
        userRole: 'ATHLETE',
        checkedInBy: 'coach',
        checkedInByName: 'Coach',
        checkInMethod: 'COACH',
      });

      const attendees = await eventAttendanceService.getAttendeeList(eventId);
      assert.equal(attendees.length, 2);
    });

    it('should return empty array for event with no attendees', async () => {
      const eventId = 'test-event-no-attendees-' + Math.random().toString(36).slice(2);
      const attendees = await eventAttendanceService.getAttendeeList(eventId);
      assert.equal(attendees.length, 0);
    });
  });

  describe('isUserCheckedIn', () => {
    it('should return true when user is checked in', async () => {
      const eventId = 'test-event-' + Math.random().toString(36).slice(2);
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      await eventAttendanceService.checkIn({
        eventId,
        userId,
        userName: 'Test User',
        userRole: 'PARENT',
        checkedInBy: 'coach',
        checkedInByName: 'Coach',
        checkInMethod: 'COACH',
      });

      const isCheckedIn = await eventAttendanceService.isUserCheckedIn(eventId, userId);
      assert.equal(isCheckedIn, true);
    });

    it('should return false when user is not checked in', async () => {
      const eventId = 'test-event-' + Math.random().toString(36).slice(2);
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const isCheckedIn = await eventAttendanceService.isUserCheckedIn(eventId, userId);
      assert.equal(isCheckedIn, false);
    });
  });

  describe('getUserAttendance', () => {
    it('should return attendance record when exists', async () => {
      const eventId = 'test-event-' + Math.random().toString(36).slice(2);
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      await eventAttendanceService.checkIn({
        eventId,
        userId,
        userName: 'Test User',
        userRole: 'PARENT',
        checkedInBy: 'coach',
        checkedInByName: 'Coach',
        checkInMethod: 'COACH',
        guestsCheckedIn: 1,
      });

      const attendance = await eventAttendanceService.getUserAttendance(eventId, userId);
      assert.ok(attendance);
      assert.equal(attendance.userId, userId);
      assert.equal(attendance.guestsCheckedIn, 1);
    });

    it('should return null when no attendance record exists', async () => {
      const eventId = 'test-event-' + Math.random().toString(36).slice(2);
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const attendance = await eventAttendanceService.getUserAttendance(eventId, userId);
      assert.equal(attendance, null);
    });
  });

  describe('getAttendanceStats', () => {
    it('should calculate attendance statistics', async () => {
      const eventId = 'test-event-' + Math.random().toString(36).slice(2);

      await eventAttendanceService.checkIn({
        eventId,
        userId: 'test-user-1-' + Math.random().toString(36).slice(2),
        userName: 'User 1',
        userRole: 'PARENT',
        checkedInBy: 'coach',
        checkedInByName: 'Coach',
        checkInMethod: 'COACH',
        guestsCheckedIn: 2,
      });

      const stats = await eventAttendanceService.getAttendanceStats(eventId);
      assert.ok(stats);
      assert.equal(stats.eventId, eventId);
      assert.equal(stats.checkedInCount, 1);
      assert.equal(stats.guestsCheckedInCount, 2);
      assert.ok(stats.updatedAt);
    });
  });

  describe('isEventToday', () => {
    it('should return true for today\'s event', () => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const event: ClubEvent = {
        id: 'test',
        clubId: 'club1',
        clubName: 'Test Club',
        createdBy: 'coach1',
        createdByName: 'Coach',
        title: 'Test Event',
        description: 'Test',
        eventType: 'TOURNAMENT',
        date: dateStr,
        startTime: '10:00',
        venue: 'Test Venue',
        isVirtual: false,
        targetAudience: 'ALL',
        price: 0,
        currency: 'GBP',
        rsvpRequired: false,
        attendees: [],
        status: 'PUBLISHED',
        createdAt: new Date().toISOString(),
      };

      const result = eventAttendanceService.isEventToday(event);
      assert.equal(result, true);
    });

    it('should return false for past event', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];
      const event: ClubEvent = {
        id: 'test',
        clubId: 'club1',
        clubName: 'Test Club',
        createdBy: 'coach1',
        createdByName: 'Coach',
        title: 'Test Event',
        description: 'Test',
        eventType: 'TOURNAMENT',
        date: dateStr,
        startTime: '10:00',
        venue: 'Test Venue',
        isVirtual: false,
        targetAudience: 'ALL',
        price: 0,
        currency: 'GBP',
        rsvpRequired: false,
        attendees: [],
        status: 'PUBLISHED',
        createdAt: new Date().toISOString(),
      };

      const result = eventAttendanceService.isEventToday(event);
      assert.equal(result, false);
    });
  });
});
