import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getBookingRelationshipContext } from '@/utils/booking-display';

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
