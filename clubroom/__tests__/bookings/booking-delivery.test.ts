import assert from 'node:assert/strict';
import test from 'node:test';

import type { SessionFeedback, SessionNoteRecord } from '../../services/progress-service';
import {
  buildBookingDeliverySummary,
  canCoachCompleteBooking,
} from '../../utils/booking-delivery';

function createFeedback(overrides?: Partial<SessionFeedback>): SessionFeedback {
  return {
    id: 'feedback_1',
    sessionId: 'booking_1',
    bookingId: 'booking_1',
    coachId: 'coach_1',
    coachName: 'Coach Casey',
    athleteId: 'child_1',
    athleteName: 'Taylor Child',
    createdAt: new Date().toISOString(),
    publicSummary: 'Strong session on receiving under pressure.',
    skillsWorkedOn: ['Receiving', 'Scanning'],
    skillRatings: [],
    improvements: 'Check shoulder earlier.',
    homework: 'Wall passes for 10 minutes.',
    effortRating: 4,
    overallPerformance: 4,
    visibility: 'parent',
    ...overrides,
  };
}

function createNote(overrides?: Partial<SessionNoteRecord>): SessionNoteRecord {
  return {
    summary: 'Good energy and sharper scanning.',
    focus: ['Scanning'],
    improvements: 'Speed up first touch decisions.',
    homework: 'Two-touch passing.',
    effort: 5,
    attendance: '1 present, 0 absent',
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

test('user story: coach can complete a past confirmed booking', () => {
  const result = canCoachCompleteBooking({
    status: 'Confirmed',
    start: '2026-03-10T10:00:00.000Z',
    now: new Date('2026-03-12T10:00:00.000Z').getTime(),
  });

  assert.equal(result, true);
});

test('user story: coach cannot complete a future confirmed booking', () => {
  const result = canCoachCompleteBooking({
    status: 'Confirmed',
    start: '2026-03-15T10:00:00.000Z',
    now: new Date('2026-03-12T10:00:00.000Z').getTime(),
  });

  assert.equal(result, false);
});

test('user story: parent session outcome prefers structured coach feedback when it exists', () => {
  const summary = buildBookingDeliverySummary({
    feedback: createFeedback(),
    note: createNote(),
  });

  assert.ok(summary);
  assert.equal(summary?.headline, 'Strong session on receiving under pressure.');
  assert.deepEqual(summary?.focusAreas, ['Receiving', 'Scanning']);
  assert.equal(summary?.homework, 'Wall passes for 10 minutes.');
  assert.equal(summary?.effortLabel, '4/5 effort');
});

test('user story: parent session outcome falls back to session notes when feedback is not present', () => {
  const summary = buildBookingDeliverySummary({
    feedback: null,
    note: createNote(),
  });

  assert.ok(summary);
  assert.equal(summary?.headline, 'Good energy and sharper scanning.');
  assert.deepEqual(summary?.focusAreas, ['Scanning']);
  assert.equal(summary?.improvements, 'Speed up first touch decisions.');
  assert.equal(summary?.effortLabel, '5/5 effort');
});
