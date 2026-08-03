import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatRosterNextSession } from '@/utils/roster-next-session-display';

describe('formatRosterNextSession', () => {
  it('does not invent midnight for a date-only session', () => {
    assert.equal(
      formatRosterNextSession('2026-01-12'),
      'Mon, 12 Jan · Time TBC',
    );
  });

  it('keeps the time when the session has one', () => {
    assert.match(
      formatRosterNextSession('2026-01-12T18:30:00'),
      /^Mon, 12 Jan at \d{2}:\d{2}$/,
    );
  });

  it('falls back cleanly for an invalid date', () => {
    assert.equal(formatRosterNextSession('not-a-date'), 'Date to be confirmed');
  });
});
