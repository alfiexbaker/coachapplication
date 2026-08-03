import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();
const readSource = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('add-to-session authority boundary', () => {
  it('requires a coach and assigned roster entry before rendering session actions', () => {
    const screen = readSource('app/roster/[athleteId]/add-to-session.tsx');

    assert.match(screen, /currentUser\?\.role !== 'COACH'/);
    assert.ok(
      screen.indexOf("currentUser?.role !== 'COACH'") <
        screen.indexOf('rosterService.getRosterEntry(coachId, athleteId)'),
    );
    assert.match(screen, /if \(!entry\) \{\s+return err\(serviceError\('NOT_FOUND', 'Player is unavailable\.'/);
    assert.match(screen, /onRetry=\{terminalAccessError \? undefined : retry\}/);
  });

  it('keeps one direct action per session choice', () => {
    const cards = readSource('components/roster/add-to-session-sections.tsx');

    assert.doesNotMatch(cards, /New Flow|Existing Flow|Start Builder|Pick Session/);
  });
});
