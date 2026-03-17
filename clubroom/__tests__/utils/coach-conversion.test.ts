import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getCoachRelationshipDisplay } from '@/utils/coach-conversion';

describe('coach conversion relationship display', () => {
  it('uses professional connection and contact language for a new coach relationship', () => {
    const display = getCoachRelationshipDisplay('none');

    assert.equal(display.relationshipLabel, 'Connect');
    assert.equal(display.contactLabel, 'Message');
    assert.match(display.profileSummary, /connect/i);
  });

  it('shows blocked-state copy that disables contact and booking intent', () => {
    const display = getCoachRelationshipDisplay('connected', { blocked: true });

    assert.equal(display.relationshipLabel, 'Coach blocked');
    assert.equal(display.contactLabel, 'Contact unavailable');
    assert.match(display.profileSummary, /blocked/i);
  });
});
