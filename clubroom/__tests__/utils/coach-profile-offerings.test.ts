import assert from 'node:assert/strict';
import test from 'node:test';

import type { SessionOffering } from '@/constants/types';
import { summarizeCoachOfferings } from '@/utils/coach-profile-offerings';

function makeOffering(overrides: Partial<SessionOffering> = {}): SessionOffering {
  return {
    id: overrides.id ?? 'offering_1',
    coachId: overrides.coachId ?? 'coach_1',
    title: overrides.title ?? 'Technical Session',
    sessionType: overrides.sessionType ?? '1on1',
    maxParticipants: overrides.maxParticipants ?? 1,
    location: overrides.location ?? 'Main Pitch',
    scheduledAt: overrides.scheduledAt ?? '2026-04-01T18:00:00.000Z',
    isRecurring: overrides.isRecurring ?? false,
    recurrenceType: overrides.recurrenceType ?? 'none',
    status: overrides.status ?? 'active',
    registrations: overrides.registrations ?? [],
    createdAt: overrides.createdAt ?? '2026-03-01T12:00:00.000Z',
    ...overrides,
  };
}

test('coach offering summary counts sessions without an event-offering bucket', () => {
  const summary = summarizeCoachOfferings([
    makeOffering({ id: 'direct_public', visibility: 'public', source: 'direct' }),
    makeOffering({
      id: 'club_group',
      source: 'group',
      sessionType: 'group',
      clubId: 'club_1',
      maxParticipants: 12,
    }),
  ]);

  assert.equal(summary.publicOfferingsCount, 1);
  assert.equal(summary.clubOfferingsCount, 1);
  assert.equal(summary.groupOfferingsCount, 1);
  assert.equal(summary.directOfferingsCount, 1);
  assert.equal('eventOfferingsCount' in summary, false);
});
