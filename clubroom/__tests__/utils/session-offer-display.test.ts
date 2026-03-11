import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getDraftSessionOfferDisplay,
  getGroupSessionOfferDisplay,
  getOfferCapacityDisplay,
  getProgramOwnershipDisplay,
} from '@/utils/session-offer-display';

test('getDraftSessionOfferDisplay marks recurring drafts as programs', () => {
  const result = getDraftSessionOfferDisplay({
    sessionType: 'group',
    recurrence: 'weekly',
    maxParticipants: 14,
  });

  assert.equal(result.kind, 'recurring_program');
  assert.match(result.label, /Recurring/);
  assert.match(result.registrationLabel, /registering into a recurring program/i);
});

test('getGroupSessionOfferDisplay marks camps as camp blocks', () => {
  const result = getGroupSessionOfferDisplay({
    sessionType: 'CAMP',
    isRecurring: false,
    maxParticipants: 20,
  });

  assert.equal(result.kind, 'camp_block');
  assert.equal(result.label, 'Camp block');
});

test('getOfferCapacityDisplay explains full sessions with waitlists', () => {
  const result = getOfferCapacityDisplay({
    maxParticipants: 12,
    currentParticipants: 12,
    waitlistEnabled: true,
    waitlistCount: 3,
  });

  assert.equal(result.capacityLabel, '12 seats in total');
  assert.match(result.availabilityLabel, /Waitlist open/);
  assert.match(result.availabilityLabel, /3 waiting/);
});

test('getProgramOwnershipDisplay keeps org-owned support with the organization', () => {
  const result = getProgramOwnershipDisplay({
    actingAs: 'club',
    commercialMode: 'ORG_OWNED',
    organizationLabel: 'Johnny Coaching LTD',
    coachLabel: 'Coach Sarah',
    deliveredByLabel: 'Coach Sarah',
  });

  assert.equal(result.bookedWithLabel, 'Johnny Coaching LTD');
  assert.equal(result.billingLabel, 'Johnny Coaching LTD');
  assert.equal(result.supportLabel, 'Johnny Coaching LTD');
  assert.match(result.supportSummary, /Johnny Coaching LTD/);
});
