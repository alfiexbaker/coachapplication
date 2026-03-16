import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getCoachRelationshipDisplay } from '@/utils/coach-conversion';

describe('coach conversion relationship display', () => {
  it('uses professional follow and contact language for a new coach relationship', () => {
    const display = getCoachRelationshipDisplay('none');

    assert.equal(display.relationshipLabel, 'Follow coach');
    assert.equal(display.contactLabel, 'Request contact');
    assert.match(display.profileSummary, /follow or save/i);
  });

  it('shows blocked-state copy that disables contact and booking intent', () => {
    const display = getCoachRelationshipDisplay('following', { blocked: true });

    assert.equal(display.relationshipLabel, 'Coach blocked');
    assert.equal(display.contactLabel, 'Contact unavailable');
    assert.match(display.profileSummary, /blocked/i);
  });
});
