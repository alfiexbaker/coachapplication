import assert from 'node:assert/strict';
import test from 'node:test';

import { formatBookingPrice } from '@/components/bookings/multi-week-picker-helpers';
import { selectRecurringWeekSlots } from '@/utils/multi-week-availability';

test('multi-week prices retain pence in review and confirmation', () => {
  assert.equal(formatBookingPrice(40, '£'), '£40');
  assert.equal(formatBookingPrice(40.5, '£'), '£40.50');
});

test('multi-week rows use the recurring offering slot instead of an unrelated availability pattern', () => {
  const rows = selectRecurringWeekSlots(
    [
      {
        date: '2026-08-03',
        startTime: '09:00',
        endTime: '10:00',
        isAvailable: true,
        bookedCount: 0,
        maxBookings: 1,
        location: 'North pitch',
      },
      {
        date: '2026-08-10',
        startTime: '09:00',
        endTime: '10:00',
        isAvailable: true,
        bookedCount: 0,
        maxBookings: 1,
        location: 'North pitch',
      },
      {
        date: '2026-08-17',
        startTime: '09:00',
        endTime: '10:00',
        isAvailable: true,
        bookedCount: 0,
        maxBookings: 1,
        location: 'North pitch',
      },
      {
        date: '2026-08-04',
        startTime: '16:00',
        endTime: '17:00',
        isAvailable: true,
        bookedCount: 0,
        maxBookings: 1,
        location: 'South pitch',
      },
      {
        date: '2026-08-11',
        startTime: '16:00',
        endTime: '17:00',
        isAvailable: true,
        bookedCount: 0,
        maxBookings: 1,
        location: 'South pitch',
      },
    ],
    40,
    8,
    {
      date: '2026-08-04',
      startTime: '16:00',
      location: 'Offering venue',
    },
  );

  assert.deepEqual(
    rows.map((row) => row.weekDate),
    ['2026-08-04', '2026-08-11'],
  );
  assert.ok(rows.every((row) => row.dayName === 'Tue'));
  assert.ok(rows.every((row) => row.startTime === '16:00'));
  assert.ok(rows.every((row) => row.location === 'Offering venue'));
});

test('multi-week rows preserve an explicit unavailable recurrence without mixing another slot', () => {
  const rows = selectRecurringWeekSlots(
    [
      {
        date: '2026-08-03',
        startTime: '09:00',
        endTime: '10:00',
        isAvailable: true,
        bookedCount: 0,
        maxBookings: 1,
        location: 'North pitch',
      },
      {
        date: '2026-08-10',
        startTime: '09:00',
        endTime: '10:00',
        isAvailable: false,
        bookedCount: 1,
        maxBookings: 1,
        location: 'North pitch',
      },
      {
        date: '2026-08-10',
        startTime: '16:00',
        endTime: '17:00',
        isAvailable: true,
        bookedCount: 0,
        maxBookings: 1,
        location: 'South pitch',
      },
      {
        date: '2026-08-17',
        startTime: '09:00',
        endTime: '10:00',
        isAvailable: true,
        bookedCount: 0,
        maxBookings: 1,
        location: 'North pitch',
      },
    ],
    40.5,
    8,
    {
      date: '2026-08-03',
      startTime: '09:00',
      location: 'Offering venue',
    },
  );

  assert.deepEqual(
    rows.map((row) => row.weekDate),
    ['2026-08-03', '2026-08-10', '2026-08-17'],
  );
  assert.equal(rows[1].available, false);
  assert.equal(rows[1].unavailableReason, 'No longer available');
  assert.ok(rows.every((row) => row.startTime === '09:00' && row.location === 'Offering venue'));
});
