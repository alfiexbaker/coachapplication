import assert from 'node:assert';
import test from 'node:test';

import type { RecurringBooking } from '../../constants/types';
import {
  getRecurringAthleteName,
  getRecurringCoachName,
  getRecurringUserName,
} from '../../utils/recurring-display';

function createRecurring(overrides?: Partial<RecurringBooking>): RecurringBooking {
  const now = new Date().toISOString();
  return {
    id: 'recurring_display_1',
    userId: 'parent_1',
    coachId: 'coach_1',
    athleteId: 'child_1',
    dayOfWeek: 2,
    time: '17:00',
    duration: 60,
    location: 'North Pitch',
    sessionType: 'Technical Session',
    frequency: 'WEEKLY',
    startDate: now,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
    generatedBookingIds: [],
    sessionsCompleted: 0,
    ...overrides,
  };
}

test('recurring display prefers hydrated coach, parent, and athlete names', () => {
  const recurring = createRecurring({
    coachName: 'Casey Coach',
    userName: 'Pat Parent',
    athleteName: 'Taylor Child',
  });

  assert.strictEqual(getRecurringCoachName(recurring), 'Casey Coach');
  assert.strictEqual(getRecurringUserName(recurring), 'Pat Parent');
  assert.strictEqual(getRecurringAthleteName(recurring), 'Taylor Child');
});

test('recurring display falls back to ids when names are unavailable', () => {
  const recurring = createRecurring();

  assert.strictEqual(getRecurringCoachName(recurring), 'coach_1');
  assert.strictEqual(getRecurringUserName(recurring), 'parent_1');
  assert.strictEqual(getRecurringAthleteName(recurring), 'child_1');
});
