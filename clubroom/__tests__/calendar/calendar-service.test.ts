/**
 * Calendar Service Tests
 *
 * Unit tests for the calendar service functionality including
 * ICS generation, calendar event conversion, and sync settings management.
 */

import assert from 'node:assert';
import test, { describe } from 'node:test';

import { calendarService } from '../../services/calendar-service';
import type { Booking } from '../../constants/app-types';
import type { CalendarProvider } from '../../constants/types';

// Mock booking data
const mockBooking: Booking = {
  id: 'booking_123',
  coachId: 'coach_1',
  athleteId: 'athlete_1',
  bookedById: 'parent_1',
  status: 'CONFIRMED',
  scheduledAt: '2026-02-15T14:00:00.000Z',
  duration: 60,
  location: 'Hackney Marshes',
  notes: 'Focus on dribbling',
  coachName: 'Coach Sarah',
  athleteName: 'Tom Henderson',
  service: '1-on-1 Training',
};

const mockBookingNoOptionals: Booking = {
  id: 'booking_456',
  coachId: 'coach_2',
  athleteId: 'athlete_2',
  bookedById: 'parent_2',
  status: 'PENDING',
  scheduledAt: '2026-03-01T10:00:00.000Z',
  duration: 90,
  location: '',
};

describe('Calendar Service', () => {
  describe('bookingToEvent', () => {
    test('should convert a booking to a calendar event', () => {
      const event = calendarService.bookingToEvent(mockBooking);

      assert.strictEqual(event.id, 'booking_123');
      assert.strictEqual(event.title, 'Training Session with Coach Sarah');
      assert.strictEqual(event.startTime, '2026-02-15T14:00:00.000Z');
      assert.strictEqual(event.location, 'Hackney Marshes');
      assert.ok(event.description.includes('1-on-1 Training'));
      assert.ok(event.description.includes('Focus on dribbling'));
      assert.ok(event.description.includes('Tom Henderson'));
      assert.strictEqual(event.coachName, 'Coach Sarah');
      assert.strictEqual(event.athleteName, 'Tom Henderson');
      assert.strictEqual(event.bookingId, 'booking_123');
    });

    test('should calculate end time based on duration', () => {
      const event = calendarService.bookingToEvent(mockBooking);

      const startTime = new Date(event.startTime);
      const endTime = new Date(event.endTime);
      const diffMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

      assert.strictEqual(diffMinutes, 60);
    });

    test('should handle booking without optional fields', () => {
      const event = calendarService.bookingToEvent(mockBookingNoOptionals);

      assert.strictEqual(event.id, 'booking_456');
      assert.strictEqual(event.title, 'Training Session');
      assert.strictEqual(event.location, '');
      assert.strictEqual(event.coachName, undefined);
      assert.strictEqual(event.athleteName, undefined);
    });

    test('should handle different durations', () => {
      const shortBooking: Booking = { ...mockBooking, duration: 30 };
      const longBooking: Booking = { ...mockBooking, duration: 120 };

      const shortEvent = calendarService.bookingToEvent(shortBooking);
      const longEvent = calendarService.bookingToEvent(longBooking);

      const shortDiff =
        (new Date(shortEvent.endTime).getTime() - new Date(shortEvent.startTime).getTime()) /
        (1000 * 60);
      const longDiff =
        (new Date(longEvent.endTime).getTime() - new Date(longEvent.startTime).getTime()) /
        (1000 * 60);

      assert.strictEqual(shortDiff, 30);
      assert.strictEqual(longDiff, 120);
    });
  });

  describe('getICSContent', () => {
    test('should generate valid ICS format', async () => {
      const icsContent = await calendarService.getICSContent(mockBooking);

      // Check ICS structure
      assert.ok(icsContent.includes('BEGIN:VCALENDAR'));
      assert.ok(icsContent.includes('END:VCALENDAR'));
      assert.ok(icsContent.includes('BEGIN:VEVENT'));
      assert.ok(icsContent.includes('END:VEVENT'));
      assert.ok(icsContent.includes('VERSION:2.0'));
      assert.ok(icsContent.includes('PRODID:-//Clubroom//Calendar Export//EN'));
    });

    test('should include event details in ICS', async () => {
      const icsContent = await calendarService.getICSContent(mockBooking);

      assert.ok(icsContent.includes('SUMMARY:Training Session with Coach Sarah'));
      assert.ok(icsContent.includes('LOCATION:Hackney Marshes'));
      assert.ok(icsContent.includes('UID:booking_123@clubroom.app'));
    });

    test('should include DTSTART and DTEND', async () => {
      const icsContent = await calendarService.getICSContent(mockBooking);

      assert.ok(icsContent.includes('DTSTART:'));
      assert.ok(icsContent.includes('DTEND:'));
    });

    test('should handle special characters in content', async () => {
      const bookingWithSpecialChars: Booking = {
        ...mockBooking,
        notes: 'Work on: passing, shooting; avoid injuries',
        location: 'Victoria Park, London',
      };

      const icsContent = await calendarService.getICSContent(bookingWithSpecialChars);

      // Special characters should be escaped
      assert.ok(icsContent.includes('Victoria Park\\, London'));
    });
  });

  describe('generateCalendarLink', () => {
    test('should generate Google Calendar link', () => {
      const link = calendarService.generateCalendarLink(mockBooking, 'GOOGLE');

      assert.ok(link.startsWith('https://calendar.google.com/calendar/render'));
      assert.ok(link.includes('action=TEMPLATE'));
      assert.ok(link.includes('text='));
      assert.ok(link.includes('dates='));
      assert.ok(link.includes('location='));
    });

    test('should generate Outlook link', () => {
      const link = calendarService.generateCalendarLink(mockBooking, 'OUTLOOK');

      assert.ok(link.startsWith('https://outlook.live.com/calendar/0/deeplink/compose'));
      assert.ok(link.includes('subject='));
      assert.ok(link.includes('startdt='));
      assert.ok(link.includes('enddt='));
    });

    test('should generate Apple Calendar link', () => {
      const link = calendarService.generateCalendarLink(mockBooking, 'APPLE');

      assert.ok(link.startsWith('webcal://'));
      assert.ok(link.includes('.ics'));
    });

    test('should URL-encode special characters', () => {
      const bookingWithSpaces: Booking = {
        ...mockBooking,
        location: 'Victoria Park Stadium',
        notes: 'Test notes with spaces',
      };

      const link = calendarService.generateCalendarLink(bookingWithSpaces, 'GOOGLE');

      // Should contain encoded spaces
      assert.ok(link.includes('Victoria%20Park'));
    });
  });

  describe('getSyncSettings', () => {
    test('should return null for non-existent user settings', async () => {
      const settings = await calendarService.getSyncSettings('non_existent_user');

      assert.strictEqual(settings, null);
    });
  });

  describe('updateSyncSettings', () => {
    test('should create new settings for user', async () => {
      const userId = `test_user_${Date.now()}`;

      const result = await calendarService.updateSyncSettings(userId, {
        enabled: true,
        provider: 'GOOGLE',
        autoSync: true,
        reminderMinutes: 30,
      });

      assert.strictEqual(result.success, true);
      assert.ok(result.settings);
      assert.strictEqual(result.settings.enabled, true);
      assert.strictEqual(result.settings.provider, 'GOOGLE');
      assert.strictEqual(result.settings.autoSync, true);
      assert.strictEqual(result.settings.reminderMinutes, 30);
      assert.strictEqual(result.settings.userId, userId);
    });

    test('should update existing settings', async () => {
      const userId = `test_user_${Date.now()}`;

      // Create initial settings
      await calendarService.updateSyncSettings(userId, {
        enabled: true,
        provider: 'APPLE',
      });

      // Update settings
      const result = await calendarService.updateSyncSettings(userId, {
        provider: 'OUTLOOK',
        reminderMinutes: 120,
      });

      assert.strictEqual(result.success, true);
      assert.ok(result.settings);
      assert.strictEqual(result.settings.provider, 'OUTLOOK');
      assert.strictEqual(result.settings.reminderMinutes, 120);
      assert.strictEqual(result.settings.enabled, true); // Preserved from first update
    });

    test('should persist settings between calls', async () => {
      const userId = `persist_test_${Date.now()}`;

      await calendarService.updateSyncSettings(userId, {
        enabled: true,
        provider: 'GOOGLE',
        autoSync: true,
        reminderMinutes: 60,
        includeLocation: true,
        includeNotes: false,
      });

      const retrieved = await calendarService.getSyncSettings(userId);

      assert.ok(retrieved);
      assert.strictEqual(retrieved.enabled, true);
      assert.strictEqual(retrieved.provider, 'GOOGLE');
      assert.strictEqual(retrieved.autoSync, true);
      assert.strictEqual(retrieved.reminderMinutes, 60);
      assert.strictEqual(retrieved.includeLocation, true);
      assert.strictEqual(retrieved.includeNotes, false);
    });
  });

  describe('getDefaultSettings', () => {
    test('should return default settings object', () => {
      const defaults = calendarService.getDefaultSettings();

      assert.strictEqual(defaults.enabled, false);
      assert.strictEqual(defaults.provider, 'APPLE');
      assert.strictEqual(defaults.autoSync, false);
      assert.strictEqual(defaults.reminderMinutes, 60);
      assert.strictEqual(defaults.includeLocation, true);
      assert.strictEqual(defaults.includeNotes, true);
    });

    test('should return a new object each time', () => {
      const defaults1 = calendarService.getDefaultSettings();
      const defaults2 = calendarService.getDefaultSettings();

      assert.notStrictEqual(defaults1, defaults2);
      assert.deepStrictEqual(defaults1, defaults2);
    });
  });

  describe('ICS Date Formatting', () => {
    test('should format dates correctly for ICS', async () => {
      const icsContent = await calendarService.getICSContent(mockBooking);

      // ICS dates should be in format: YYYYMMDDTHHMMSSZ
      const dtStartMatch = icsContent.match(/DTSTART:(\d{8}T\d{6}Z)/);
      const dtEndMatch = icsContent.match(/DTEND:(\d{8}T\d{6}Z)/);

      assert.ok(dtStartMatch, 'DTSTART should be in correct format');
      assert.ok(dtEndMatch, 'DTEND should be in correct format');

      // Verify the date matches our booking
      const dtStart = dtStartMatch[1];
      assert.ok(dtStart.startsWith('20260215'), 'Date should be February 15, 2026');
    });
  });

  describe('Calendar Provider Validation', () => {
    test('should handle all provider types', () => {
      const providers: CalendarProvider[] = ['GOOGLE', 'APPLE', 'OUTLOOK'];

      providers.forEach((provider) => {
        const link = calendarService.generateCalendarLink(mockBooking, provider);
        assert.ok(link.length > 0, `${provider} should generate a non-empty link`);
      });
    });
  });

  describe('Multiple Bookings', () => {
    test('should handle multiple bookings', async () => {
      const bookings: Booking[] = [mockBooking, mockBookingNoOptionals];

      const result = await calendarService.generateICSFile(bookings, 'test-export.ics');

      assert.strictEqual(result.success, true);
      assert.ok(result.filePath);
      assert.ok(result.filePath.includes('test-export.ics'));
    });
  });

  describe('Edge Cases', () => {
    test('should handle booking with undefined duration', () => {
      const bookingNoDuration: Booking = {
        ...mockBooking,
        duration: undefined as unknown as number,
      };

      // Should default to 60 minutes
      const event = calendarService.bookingToEvent(bookingNoDuration);
      const diffMinutes =
        (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / (1000 * 60);

      assert.strictEqual(diffMinutes, 60);
    });

    test('should handle empty notes', () => {
      const bookingEmptyNotes: Booking = {
        ...mockBooking,
        notes: '',
      };

      const event = calendarService.bookingToEvent(bookingEmptyNotes);

      // Should still have description with service and athlete info
      assert.ok(event.description.includes('1-on-1 Training'));
    });
  });
});
