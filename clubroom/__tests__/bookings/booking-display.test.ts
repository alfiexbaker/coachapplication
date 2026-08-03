import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatServiceTypeLabel, getBookingRelationshipContext } from '@/utils/booking-display';

describe('formatServiceTypeLabel', () => {
  it('keeps canonical service labels stable when mapped twice', () => {
    assert.equal(formatServiceTypeLabel('one_to_one'), '1-on-1 session');
    assert.equal(formatServiceTypeLabel(formatServiceTypeLabel('one_to_one')), '1-on-1 session');
  });
});

describe('getBookingRelationshipContext', () => {
  it('describes org-owned club bookings with organization billing and support', () => {
    const result = getBookingRelationshipContext({
      actingAs: 'club',
      organizationLabel: 'Johnny Coaching LTD',
      coachLabel: 'Coach Sarah',
      deliveredByLabel: 'Coach Sarah',
      commercialMode: 'ORG_OWNED',
    });

    assert.equal(result.bookedWithLabel, 'Johnny Coaching LTD');
    assert.equal(result.deliveredByLabel, 'Coach Sarah');
    assert.equal(result.billingLabel, 'Johnny Coaching LTD');
    assert.equal(result.supportLabel, 'Johnny Coaching LTD');
    assert.match(result.paymentSummary, /Johnny Coaching LTD/);
    assert.match(result.reassignmentSummary, /Johnny Coaching LTD/);
    assert.match(result.visibilitySummary, /supervising Johnny Coaching LTD staff/);
    assert.equal(result.reportProblemLabel, 'Report to organization');
  });

  it('describes coach-owned club bookings with coach billing and support', () => {
    const result = getBookingRelationshipContext({
      actingAs: 'club',
      organizationLabel: 'Johnny Coaching LTD',
      coachLabel: 'Coach Sarah',
      deliveredByLabel: 'Coach Sarah',
      commercialMode: 'COACH_OWNED',
    });

    assert.equal(result.bookedWithLabel, 'Coach Sarah');
    assert.equal(result.billingLabel, 'Coach Sarah');
    assert.equal(result.supportLabel, 'Coach Sarah');
    assert.match(result.paymentSummary, /Coach Sarah/);
    assert.match(result.supportSummary, /Johnny Coaching LTD/);
    assert.match(result.sharedHealthSummary, /supervising Johnny Coaching LTD staff/);
    assert.equal(result.reportProblemLabel, 'Report booking issue');
  });

  it('does not invent coach-owned billing while club commercial mode is unresolved', () => {
    const result = getBookingRelationshipContext({
      actingAs: 'club',
      organizationLabel: 'Johnny Coaching LTD',
      coachLabel: 'Coach Sarah',
      deliveredByLabel: 'Coach Sarah',
    });

    assert.equal(result.commercialMode, null);
    assert.equal(result.bookedWithLabel, 'Organization billing unavailable');
    assert.equal(result.billingLabel, 'Organization billing unavailable');
    assert.equal(result.supportLabel, 'Organization billing unavailable');
    assert.equal(
      result.paymentSummary,
      'Billing details are unavailable. Try again before confirming.',
    );
    assert.doesNotMatch(result.paymentSummary, /API|Coach Sarah/);
  });

  it('keeps independent bookings scoped to the assigned coach', () => {
    const result = getBookingRelationshipContext({
      actingAs: 'self',
      coachLabel: 'Coach Sarah',
      deliveredByLabel: 'Coach Sarah',
    });

    assert.equal(result.supportLabel, 'Coach Sarah');
    assert.match(result.visibilitySummary, /Coach Sarah/);
    assert.match(result.sharedHealthSummary, /Coach Sarah/);
    assert.equal(result.reportProblemLabel, 'Report problem');
  });
});
