import assert from 'node:assert/strict';
import test from 'node:test';

import { buildBookingDraftPatchFromOffering } from '../../utils/booking-draft-prefill';
import type { SessionOffering } from '../../constants/session-types';

const offering: SessionOffering = {
  id: 'offering_1',
  coachId: 'coach_1',
  title: '1-to-1 Session',
  description: 'Focused technical work.',
  sessionType: '1on1',
  price: 45,
  location: 'Main Pitch',
  scheduledAt: '2026-03-25T18:00:00.000Z',
  isRecurring: false,
  recurrenceType: 'none',
  duration: 60,
  maxParticipants: 1,
  status: 'active',
  registrations: [],
  createdAt: '2026-03-01T12:00:00.000Z',
  source: 'direct',
  sourceEntityId: 'offering_1',
  createdByUserId: 'coach_1',
  createdByRole: 'COACH',
  actingAs: 'self',
};

test('buildBookingDraftPatchFromOffering locks the booking target when a child is preselected', () => {
  const patch = buildBookingDraftPatchFromOffering({
    coachId: 'coach_1',
    offering,
    child: {
      id: 'athlete_1',
      name: 'Alex Barton',
    },
    entrySource: 'retrospective_follow_up',
  });

  assert.equal(patch.targetLocked, true);
  assert.equal(patch.childId, 'athlete_1');
  assert.equal(patch.athleteName, 'Alex Barton');
});

test('buildBookingDraftPatchFromOffering leaves the booking target unlocked when no child is preselected', () => {
  const patch = buildBookingDraftPatchFromOffering({
    coachId: 'coach_1',
    offering,
    entrySource: 'discover_feed',
  });

  assert.equal(patch.targetLocked, false);
  assert.equal(patch.childId, undefined);
});
