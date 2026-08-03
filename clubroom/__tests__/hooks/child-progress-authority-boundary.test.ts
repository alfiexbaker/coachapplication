import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();
const readSource = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('child progress authority boundary', () => {
  it('proves child management authority before loading a requested child profile or progress', () => {
    const hook = readSource('hooks/use-child-progress.ts');

    assert.match(hook, /childService\.canManageChildProfile\(effectiveChildId, currentUser\)/);
    assert.ok(
      hook.indexOf('childService.canManageChildProfile(effectiveChildId, currentUser)') <
        hook.indexOf('childService.getChild(effectiveChildId)'),
    );
    assert.match(hook, /serviceError\('UNAUTHORIZED', 'You do not have permission to view this player’s progress\.'/);
    assert.match(
      hook,
      /selectedChildId \?\? paramChildId \?\? contextActiveChildId \?\? contextChildren\[0\]\?\.id/,
    );
  });

  it('does not offer a retry control when access is denied', () => {
    const screen = readSource('app/development/child-progress/[childId].tsx');
    assert.match(screen, /title=\{accessDenied \? 'Player progress unavailable' : undefined\}/);
    assert.match(screen, /onRetry=\{accessDenied \? undefined : retry\}/);
  });
});
