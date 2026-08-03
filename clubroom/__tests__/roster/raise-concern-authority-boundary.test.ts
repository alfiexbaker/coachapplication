import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

describe('raise concern authority boundary', () => {
  it('requires a verified assigned coach and leaves terminal roster denials without retry', () => {
    const screen = fs.readFileSync(
      path.join(process.cwd(), 'app/roster/[athleteId]/raise-concern.tsx'),
      'utf8',
    );

    assert.match(
      screen,
      /currentUser\?\.role === 'COACH' && currentUser\.isVerified/,
    );
    assert.match(screen, /if \(!coachId \|\| !hasVerifiedCoachAccess\) \{/);
    assert.match(screen, /if \(!entry\) \{/);
    assert.match(screen, /title=\{terminalAccessError \? 'Concern access unavailable' : undefined\}/);
    assert.match(screen, /onRetry=\{terminalAccessError \? undefined : retry\}/);
    assert.match(
      screen,
      /A verified coach account is required to raise a concern for a player\./,
    );
    assert.doesNotMatch(screen, /Athlete not found in your roster\./);
  });
});
