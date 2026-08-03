import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

describe('roster athlete terminal errors', () => {
  it('does not render a retry action for non-enumerating access failures', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/roster/[athleteId]/index.tsx'),
      'utf8',
    );

    assert.match(source, /error\?\.code === 'NOT_FOUND' \|\| error\?\.code === 'UNAUTHORIZED'/);
    assert.match(source, /title=\{terminalAccessError \? 'Athlete unavailable' : undefined\}/);
    assert.match(source, /onRetry=\{terminalAccessError \? undefined : retry\}/);
  });
});
