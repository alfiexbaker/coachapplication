/**
 * Tests for deduplicateBookings() — pure function that groups bookings by ID
 * and merges children who share the same booking into a single row.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deduplicateBookings } from '@/hooks/use-home-screen';
import type { Booking } from '@/constants/app-types';
import type { ChildInfo } from '@/types/child-context';

function makeChild(id: string, name: string, colorCode = '#FF0000'): ChildInfo {
  return {
    id,
    referenceId: id,
    profileId: `profile-${id}`,
    name,
    fullName: name,
    colorCode,
    initials: name.charAt(0),
    age: 10,
    avatarUrl: null,
    dateOfBirth: null,
    hasSpecialNeeds: false,
    profile: null,
    squadIds: [],
    clubIds: [],
  };
}

function makeBooking(overrides: Partial<Booking> & { id: string; scheduledAt: string }): Booking {
  return {
    coachId: 'coach-1',
    coachName: 'Coach A',
    athleteId: '',
    status: 'CONFIRMED',
    type: '1-on-1',
    duration: 60,
    price: 20,
    location: 'Field 1',
    ...overrides,
  } as Booking;
}

describe('deduplicateBookings', () => {
  const childA = makeChild('child-a', 'Alice', '#FF0000');
  const childB = makeChild('child-b', 'Bob', '#00FF00');
  const childC = makeChild('child-c', 'Charlie', '#0000FF');

  it('returns empty array for empty bookings', () => {
    const rows = deduplicateBookings([], [childA, childB]);
    assert.equal(rows.length, 0);
  });

  it('returns empty array for empty children', () => {
    const booking = makeBooking({
      id: 'b1',
      scheduledAt: '2026-03-01T10:00:00Z',
      athleteId: 'child-a',
    });
    const rows = deduplicateBookings([booking], []);
    // Booking has no matching children, so childEntries empty
    assert.equal(rows.length, 1);
    assert.equal(rows[0].children.length, 0);
    assert.equal(rows[0].isShared, false);
  });

  it('maps single child booking via athleteId', () => {
    const booking = makeBooking({
      id: 'b1',
      scheduledAt: '2026-03-01T10:00:00Z',
      athleteId: 'child-a',
    });
    const rows = deduplicateBookings([booking], [childA, childB]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].children.length, 1);
    assert.equal(rows[0].children[0].id, 'child-a');
    assert.equal(rows[0].children[0].name, 'Alice');
    assert.equal(rows[0].children[0].colorCode, '#FF0000');
    assert.equal(rows[0].isShared, false);
  });

  it('maps multiple children via athleteIds', () => {
    const booking = makeBooking({
      id: 'b1',
      scheduledAt: '2026-03-01T10:00:00Z',
      athleteIds: ['child-a', 'child-b'],
    });
    const rows = deduplicateBookings([booking], [childA, childB]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].children.length, 2);
    assert.equal(rows[0].isShared, true);
    const names = rows[0].children.map((c) => c.name);
    assert.ok(names.includes('Alice'));
    assert.ok(names.includes('Bob'));
  });

  it('deduplicates same booking ID appearing twice (different athleteId)', () => {
    const booking1 = makeBooking({
      id: 'b1',
      scheduledAt: '2026-03-01T10:00:00Z',
      athleteId: 'child-a',
    });
    const booking2 = makeBooking({
      id: 'b1',
      scheduledAt: '2026-03-01T10:00:00Z',
      athleteId: 'child-b',
    });
    const rows = deduplicateBookings([booking1, booking2], [childA, childB]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].children.length, 2);
    assert.equal(rows[0].isShared, true);
  });

  it('does not duplicate athleteId that also appears in athleteIds', () => {
    const booking = makeBooking({
      id: 'b1',
      scheduledAt: '2026-03-01T10:00:00Z',
      athleteId: 'child-a',
      athleteIds: ['child-a', 'child-b'],
    });
    const rows = deduplicateBookings([booking], [childA, childB]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].children.length, 2); // Not 3
    assert.equal(rows[0].isShared, true);
  });

  it('ignores athleteIds not in children list', () => {
    const booking = makeBooking({
      id: 'b1',
      scheduledAt: '2026-03-01T10:00:00Z',
      athleteIds: ['child-a', 'unknown-child'],
    });
    const rows = deduplicateBookings([booking], [childA]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].children.length, 1);
    assert.equal(rows[0].children[0].id, 'child-a');
    assert.equal(rows[0].isShared, false);
  });

  it('sorts output by scheduledAt ascending', () => {
    const laterBooking = makeBooking({
      id: 'b2',
      scheduledAt: '2026-03-02T10:00:00Z',
      athleteId: 'child-a',
    });
    const earlierBooking = makeBooking({
      id: 'b1',
      scheduledAt: '2026-03-01T10:00:00Z',
      athleteId: 'child-b',
    });
    const rows = deduplicateBookings([laterBooking, earlierBooking], [childA, childB]);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].booking.id, 'b1');
    assert.equal(rows[1].booking.id, 'b2');
  });

  it('handles three children sharing one booking', () => {
    const booking = makeBooking({
      id: 'b1',
      scheduledAt: '2026-03-01T10:00:00Z',
      athleteIds: ['child-a', 'child-b', 'child-c'],
    });
    const rows = deduplicateBookings([booking], [childA, childB, childC]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].children.length, 3);
    assert.equal(rows[0].isShared, true);
  });

  it('handles mix of shared and individual bookings', () => {
    const shared = makeBooking({
      id: 'b1',
      scheduledAt: '2026-03-01T10:00:00Z',
      athleteIds: ['child-a', 'child-b'],
    });
    const individual = makeBooking({
      id: 'b2',
      scheduledAt: '2026-03-01T11:00:00Z',
      athleteId: 'child-a',
    });
    const rows = deduplicateBookings([shared, individual], [childA, childB]);
    assert.equal(rows.length, 2);
    const sharedRow = rows.find((r) => r.booking.id === 'b1')!;
    const individualRow = rows.find((r) => r.booking.id === 'b2')!;
    assert.equal(sharedRow.isShared, true);
    assert.equal(sharedRow.children.length, 2);
    assert.equal(individualRow.isShared, false);
    assert.equal(individualRow.children.length, 1);
  });

  it('booking with no matching athleteId or athleteIds gets 0 children', () => {
    const booking = makeBooking({
      id: 'b1',
      scheduledAt: '2026-03-01T10:00:00Z',
      athleteId: 'other-athlete',
    });
    const rows = deduplicateBookings([booking], [childA]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].children.length, 0);
    assert.equal(rows[0].isShared, false);
  });
});
