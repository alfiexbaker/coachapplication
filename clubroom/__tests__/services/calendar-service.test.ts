/**
 * Calendar Service Tests
 *
 * Tests for calendar sync settings, ICS content generation,
 * calendar link generation, and event conversion utilities.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { calendarService } from '@/services/calendar-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { Booking } from '@/constants/app-types';

const rid = () => Math.random().toString(36).slice(2, 10);

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: `bk_${rid()}`,
    coachId: `coach_${rid()}`,
    coachName: 'Test Coach',
    athleteId: `ath_${rid()}`,
    scheduledAt: '2026-04-15T10:00:00.000Z',
    duration: 60,
    service: '1-on-1 Training',
    location: 'Hyde Park',
    status: 'CONFIRMED',
    price: 20,
    notes: 'Focus on passing',
    ...overrides,
  } as Booking;
}

describe('calendarService', () => {
  beforeEach(async () => {
    // Clear the settings key for the current_user used internally
    await apiClient.remove(`${STORAGE_KEYS.CALENDAR_SYNC_SETTINGS}_current_user`);
  });

  // ---------------------------------------------------------------------------
  // getSyncSettings / updateSyncSettings
  // ---------------------------------------------------------------------------
  describe('getSyncSettings', () => {
    test('returns null when no settings exist', async () => {
      const settings = await calendarService.getSyncSettings(`user_${rid()}`);
      assert.equal(settings, null);
    });
  });

  describe('updateSyncSettings', () => {
    test('creates settings for a user', async () => {
      const userId = `user_${rid()}`;
      const result = await calendarService.updateSyncSettings(userId, {
        enabled: true,
        provider: 'GOOGLE',
        autoSync: true,
        reminderMinutes: 30,
      });

      assert.equal(result.success, true);
      assert.ok(result.settings);
      assert.equal(result.settings!.userId, userId);
      assert.equal(result.settings!.enabled, true);
      assert.equal(result.settings!.provider, 'GOOGLE');
      assert.equal(result.settings!.autoSync, true);
      assert.equal(result.settings!.reminderMinutes, 30);
    });

    test('merges with existing settings on update', async () => {
      const userId = `user_${rid()}`;
      await calendarService.updateSyncSettings(userId, {
        enabled: true,
        provider: 'APPLE',
      });

      const result = await calendarService.updateSyncSettings(userId, {
        reminderMinutes: 15,
      });

      assert.equal(result.success, true);
      assert.equal(result.settings!.enabled, true);
      assert.equal(result.settings!.provider, 'APPLE');
      assert.equal(result.settings!.reminderMinutes, 15);
    });

    test('persists settings across reads', async () => {
      const userId = `user_${rid()}`;
      await calendarService.updateSyncSettings(userId, {
        enabled: true,
        provider: 'OUTLOOK',
      });

      const settings = await calendarService.getSyncSettings(userId);
      assert.ok(settings);
      assert.equal(settings!.enabled, true);
      assert.equal(settings!.provider, 'OUTLOOK');
    });
  });

  // ---------------------------------------------------------------------------
  // getDefaultSettings
  // ---------------------------------------------------------------------------
  describe('getDefaultSettings', () => {
    test('returns default settings object', () => {
      const defaults = calendarService.getDefaultSettings();
      assert.equal(defaults.enabled, false);
      assert.equal(defaults.provider, 'APPLE');
      assert.equal(defaults.autoSync, false);
      assert.equal(defaults.reminderMinutes, 60);
      assert.equal(defaults.includeLocation, true);
      assert.equal(defaults.includeNotes, true);
    });
  });

  // ---------------------------------------------------------------------------
  // bookingToEvent
  // ---------------------------------------------------------------------------
  describe('bookingToEvent', () => {
    test('converts booking to CalendarEvent', () => {
      const booking = makeBooking({
        coachName: 'Sarah Johnson',
        location: 'Victoria Park',
      });

      const event = calendarService.bookingToEvent(booking);

      assert.equal(event.id, booking.id);
      assert.ok(event.title.includes('Sarah Johnson'));
      assert.equal(event.location, 'Victoria Park');
      assert.ok(event.startTime);
      assert.ok(event.endTime);
    });

    test('calculates end time based on duration', () => {
      const booking = makeBooking({
        scheduledAt: '2026-04-15T10:00:00.000Z',
        duration: 90,
      });

      const event = calendarService.bookingToEvent(booking);
      const endTime = new Date(event.endTime);
      const startTime = new Date(event.startTime);
      const durationMs = endTime.getTime() - startTime.getTime();

      assert.equal(durationMs, 90 * 60 * 1000);
    });

    test('includes session details in description', () => {
      const booking = makeBooking({
        service: 'Goalkeeper Training',
        notes: 'Bring gloves',
      });

      const event = calendarService.bookingToEvent(booking);
      assert.ok(event.description.includes('Goalkeeper Training'));
      assert.ok(event.description.includes('Bring gloves'));
    });
  });

  // ---------------------------------------------------------------------------
  // generateCalendarLink
  // ---------------------------------------------------------------------------
  describe('generateCalendarLink', () => {
    test('generates Google Calendar link', () => {
      const booking = makeBooking();
      const link = calendarService.generateCalendarLink(booking, 'GOOGLE');

      assert.ok(link.startsWith('https://calendar.google.com/'));
      assert.ok(link.includes('action=TEMPLATE'));
    });

    test('generates Outlook link', () => {
      const booking = makeBooking();
      const link = calendarService.generateCalendarLink(booking, 'OUTLOOK');

      assert.ok(link.startsWith('https://outlook.live.com/'));
      assert.ok(link.includes('deeplink/compose'));
    });

    test('generates Apple webcal link', () => {
      const booking = makeBooking();
      const link = calendarService.generateCalendarLink(booking, 'APPLE');

      assert.ok(link.startsWith('webcal://'));
    });
  });

  // ---------------------------------------------------------------------------
  // getICSContent
  // ---------------------------------------------------------------------------
  describe('getICSContent', () => {
    test('returns valid ICS string', async () => {
      const booking = makeBooking({ location: 'Clapham Common' });
      const ics = await calendarService.getICSContent(booking);

      assert.ok(ics.includes('BEGIN:VCALENDAR'));
      assert.ok(ics.includes('END:VCALENDAR'));
      assert.ok(ics.includes('BEGIN:VEVENT'));
      assert.ok(ics.includes('END:VEVENT'));
      assert.ok(ics.includes('PRODID:-//Clubroom//Calendar Export//EN'));
    });

    test('ICS content includes location', async () => {
      const booking = makeBooking({ location: 'Battersea Park' });
      const ics = await calendarService.getICSContent(booking);

      assert.ok(ics.includes('Battersea Park'));
    });

    test('ICS content includes UID based on booking ID', async () => {
      const booking = makeBooking();
      const ics = await calendarService.getICSContent(booking);

      assert.ok(ics.includes(`${booking.id}@clubroom.app`));
    });
  });

  // ---------------------------------------------------------------------------
  // groupSessionToEvent
  // ---------------------------------------------------------------------------
  describe('groupSessionToEvent', () => {
    test('converts group session to CalendarEvent', () => {
      const session = {
        id: `gs_${rid()}`,
        coachId: `coach_${rid()}`,
        title: 'Under 12s Training',
        description: 'Weekly skills session',
        sessionType: 'group' as const,
        location: 'Hyde Park',
        maxParticipants: 12,
        schedule: [
          { date: '2026-04-20', startTime: '10:00', endTime: '11:30' },
        ],
        registrations: [],
        status: 'active' as const,
        createdAt: '2026-04-01T00:00:00.000Z',
      };

      const event = calendarService.groupSessionToEvent(session as never);
      assert.equal(event.id, session.id);
      assert.equal(event.title, 'Under 12s Training');
      assert.ok(event.description.includes('group'));
    });
  });
});
