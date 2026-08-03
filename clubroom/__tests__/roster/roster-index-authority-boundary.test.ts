import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

describe('roster index authority boundary', () => {
  it('allows only a coach to load the roster and leaves terminal denials without retry', () => {
    const screen = fs.readFileSync(path.join(process.cwd(), 'app/roster/index.tsx'), 'utf8');

    assert.match(screen, /currentUser\?\.role !== 'COACH'/);
    assert.match(screen, /currentUser\?\.role, filters, searchQuery/);
    assert.match(screen, /title=\{terminalAccessError \? 'Roster access unavailable' : undefined\}/);
    assert.match(screen, /onRetry=\{terminalAccessError \? undefined : retry\}/);
  });
});
