/**
 * Event Attendance Service Tests
 *
 * Tests for check-in, attendance tracking, and stats.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { eventAttendanceService } from '../../services/event/event-attendance-service';
import type { ClubEvent } from '../../constants/types';

describe('eventAttendanceService', () => {
  describe('checkIn', () => {
    test('creates an attendance record', async () => {
      const attendance = await eventAttendanceService.checkIn({
        eventId: 'event_1',
        userId: 'user_checkin_1',
        userName: 'Test User',
        userRole: 'PARENT',
        checkedInBy: 'user_checkin_1',
        checkedInByName: 'Test User',
        checkInMethod: 'SELF',
        guestsCheckedIn: 0,
      });

      assert.ok(attendance.id);
      assert.equal(attendance.eventId, 'event_1');
      assert.equal(attendance.userId, 'user_checkin_1');
      assert.ok(attendance.checkedInAt);
    });
  });

  describe('getAttendeeList', () => {
    test('returns array of attendance records', async () => {
      const list = await eventAttendanceService.getAttendeeList('event_1');
      assert.ok(Array.isArray(list));
    });
  });

  describe('isUserCheckedIn', () => {
    test('returns false for user who has not checked in', async () => {
      const result = await eventAttendanceService.isUserCheckedIn('event_1', 'random_user_xyz');
      assert.equal(result, false);
    });
  });

  describe('getAttendanceStats', () => {
    test('returns stats object with required fields', async () => {
      const stats = await eventAttendanceService.getAttendanceStats('event_1');
      assert.equal(typeof stats.checkedInCount, 'number');
      assert.equal(typeof stats.guestsCheckedInCount, 'number');
    });
  });

  describe('isEventToday', () => {
    test('returns true for an event dated today', () => {
      const today = new Date().toISOString().split('T')[0];
      const event = { date: today } as ClubEvent;
      assert.equal(eventAttendanceService.isEventToday(event), true);
    });

    test('returns false for a past event', () => {
      const event = { date: '2020-01-01' } as ClubEvent;
      assert.equal(eventAttendanceService.isEventToday(event), false);
    });
  });

  describe('isCheckInAvailable', () => {
    test('returns false for non-published event', () => {
      const today = new Date().toISOString().split('T')[0];
      const event = { date: today, status: 'DRAFT', startTime: '09:00', endTime: '10:00' } as ClubEvent;
      assert.equal(eventAttendanceService.isCheckInAvailable(event), false);
    });

    test('returns boolean for published event', () => {
      const today = new Date().toISOString().split('T')[0];
      const event = { date: today, status: 'PUBLISHED', startTime: '09:00', endTime: '17:00' } as ClubEvent;
      const result = eventAttendanceService.isCheckInAvailable(event);
      assert.equal(typeof result, 'boolean');
    });
  });
});
