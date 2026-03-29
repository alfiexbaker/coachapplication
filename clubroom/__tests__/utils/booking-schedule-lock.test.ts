import assert from 'node:assert/strict';
import test from 'node:test';

import type { SessionOffering } from '../../constants/session-types';
import { isBookingScheduleLocked } from '../../utils/booking-schedule-lock';

const offering: SessionOffering = {
  id: 'offering_1',
  coachId: 'coach_1',
  title: 'Transition Lab',
  description: 'Live transition work.',
  sessionType: '1on1',
  maxParticipants: 1,
  location: 'Main Pitch',
  scheduledAt: '2026-03-27T18:00:00.000Z',
  isRecurring: false,
  recurrenceType: 'none',
  status: 'active',
  registrations: [],
  createdAt: '2026-03-01T12:00:00.000Z',
  source: 'direct',
  sourceEntityId: 'offering_1',
  createdByUserId: 'coach_1',
  createdByRole: 'COACH',
  actingAs: 'self',
  commercialMode: 'COACH_OWNED',
};

test('isBookingScheduleLocked locks when the draft still matches a fixed offering schedule', () => {
  assert.equal(
    isBookingScheduleLocked({
      draft: {
        entrySource: 'coach_profile',
        sessionOfferingId: offering.id,
        date: '2026-03-27',
        slot: '18:00',
      },
      offering,
    }),
    true,
  );
});

test('isBookingScheduleLocked unlocks when the draft diverges from the offering schedule', () => {
  assert.equal(
    isBookingScheduleLocked({
      draft: {
        entrySource: 'coach_profile',
        sessionOfferingId: offering.id,
        date: '2026-03-28',
        slot: '18:30',
      },
      offering,
    }),
    false,
  );
});

test('isBookingScheduleLocked preserves discover fast-track locking while offering context hydrates', () => {
  assert.equal(
    isBookingScheduleLocked({
      draft: {
        entrySource: 'discover_map',
        sessionOfferingId: offering.id,
        date: '2026-03-27',
        slot: '18:00',
      },
    }),
    true,
  );
});

test('isBookingScheduleLocked stays open when no fixed schedule evidence exists', () => {
  assert.equal(
    isBookingScheduleLocked({
      draft: {
        entrySource: 'coach_profile',
        sessionOfferingId: offering.id,
        date: undefined,
        slot: undefined,
      },
    }),
    false,
  );
});
