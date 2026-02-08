/**
 * Calendar Helpers Tests
 *
 * Unit tests for the calendar helper utility functions:
 * - buildCalendarTitle: formats the event title from booking info
 * - buildCalendarNotes: formats the event notes/description from booking info
 */

import assert from 'node:assert';
import test, { describe } from 'node:test';

import {
  buildCalendarTitle,
  buildCalendarNotes,
  type CalendarBookingInfo,
} from '../../utils/calendar-helpers';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fullBooking: CalendarBookingInfo = {
  coachName: 'Coach Sarah',
  scheduledAt: '2026-02-15T14:00:00.000Z',
  duration: 60,
  location: 'Hackney Marshes',
  sessionType: '1-on-1 Training',
  price: 45,
};

const minimalBooking: CalendarBookingInfo = {
  coachName: 'Coach Dave',
  scheduledAt: '2026-03-01T10:00:00.000Z',
  duration: 90,
};

// ---------------------------------------------------------------------------
// buildCalendarTitle
// ---------------------------------------------------------------------------

describe('buildCalendarTitle', () => {
  test('should include session type when provided', () => {
    const title = buildCalendarTitle(fullBooking);
    assert.strictEqual(title, '1-on-1 Training with Coach Sarah');
  });

  test('should fall back to "Session" when no session type', () => {
    const title = buildCalendarTitle(minimalBooking);
    assert.strictEqual(title, 'Session with Coach Dave');
  });

  test('should include coach name in all cases', () => {
    const title = buildCalendarTitle(fullBooking);
    assert.ok(title.includes('Coach Sarah'));
  });

  test('should handle empty string session type as falsy', () => {
    const booking: CalendarBookingInfo = {
      ...minimalBooking,
      sessionType: '',
    };
    const title = buildCalendarTitle(booking);
    assert.strictEqual(title, 'Session with Coach Dave');
  });

  test('should handle various session type strings', () => {
    const types = ['Goalkeeping', 'Small Group', 'Assessment', 'Fitness'];
    for (const sessionType of types) {
      const title = buildCalendarTitle({ ...fullBooking, sessionType });
      assert.strictEqual(title, `${sessionType} with Coach Sarah`);
    }
  });
});

// ---------------------------------------------------------------------------
// buildCalendarNotes
// ---------------------------------------------------------------------------

describe('buildCalendarNotes', () => {
  test('should include session type when provided', () => {
    const notes = buildCalendarNotes(fullBooking);
    assert.ok(notes.includes('Type: 1-on-1 Training'));
  });

  test('should include price with pound sign when provided', () => {
    const notes = buildCalendarNotes(fullBooking);
    assert.ok(notes.includes('Price: \u00A345'));
  });

  test('should always include "Booked via Clubroom"', () => {
    const notes = buildCalendarNotes(fullBooking);
    assert.ok(notes.includes('Booked via Clubroom'));

    const notesMinimal = buildCalendarNotes(minimalBooking);
    assert.ok(notesMinimal.includes('Booked via Clubroom'));
  });

  test('should use newline separator between lines', () => {
    const notes = buildCalendarNotes(fullBooking);
    const lines = notes.split('\n');
    assert.strictEqual(lines.length, 3);
    assert.strictEqual(lines[0], 'Type: 1-on-1 Training');
    assert.strictEqual(lines[1], 'Price: \u00A345');
    assert.strictEqual(lines[2], 'Booked via Clubroom');
  });

  test('should omit session type line when not provided', () => {
    const notes = buildCalendarNotes(minimalBooking);
    assert.ok(!notes.includes('Type:'));
    // Should only have "Booked via Clubroom"
    assert.strictEqual(notes, 'Booked via Clubroom');
  });

  test('should omit price line when not provided', () => {
    const bookingNoPrice: CalendarBookingInfo = {
      ...fullBooking,
      price: undefined,
    };
    const notes = buildCalendarNotes(bookingNoPrice);
    assert.ok(!notes.includes('Price:'));
    const lines = notes.split('\n');
    assert.strictEqual(lines.length, 2);
    assert.strictEqual(lines[0], 'Type: 1-on-1 Training');
    assert.strictEqual(lines[1], 'Booked via Clubroom');
  });

  test('should include price of 0 (not null)', () => {
    const bookingFreeSession: CalendarBookingInfo = {
      ...fullBooking,
      price: 0,
    };
    const notes = buildCalendarNotes(bookingFreeSession);
    assert.ok(notes.includes('Price: \u00A30'));
  });

  test('should handle both session type and price missing', () => {
    const notes = buildCalendarNotes(minimalBooking);
    assert.strictEqual(notes, 'Booked via Clubroom');
  });
});
