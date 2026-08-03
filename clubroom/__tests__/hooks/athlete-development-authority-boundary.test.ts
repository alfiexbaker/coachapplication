import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();
const readSource = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('athlete development authority boundary', () => {
  it('proves mock self, family, or assigned-coach access before any child data read', () => {
    const hook = readSource('hooks/use-athlete-development.ts');

    assert.match(hook, /import \{ rosterService \} from '@\/services\/roster-service';/);
    assert.match(hook, /if \(currentUser\.id === athleteId\) \{\s+return ok\(true\);/);
    assert.match(hook, /childService\.canManageChildProfile\(athleteId, currentUser\)/);
    assert.match(hook, /rosterService\.getRosterEntry\(currentUser\.id, athleteId\)/);
    assert.ok(
      hook.indexOf('canReadAthleteDevelopment(athleteId, currentUser)') <
        hook.indexOf('childService.getChild(athleteId)'),
    );
    assert.match(hook, /serviceError\('UNAUTHORIZED', 'You do not have permission to view this player\.'/);
  });

  it('protects the needs route and leaves denied states without a retry action', () => {
    const needsHook = readSource('hooks/use-special-needs.ts');
    const detailScreen = readSource('app/development/athlete/[athleteId]/index.tsx');
    const needsScreen = readSource('app/development/athlete/[athleteId]/special-needs.tsx');

    assert.ok(
      needsHook.indexOf('canReadAthleteDevelopment(athleteId, currentUser)') <
        needsHook.indexOf('childService.getChild(athleteId)'),
    );
    assert.match(detailScreen, /onRetry=\{accessDenied \? undefined : retry\}/);
    assert.match(needsScreen, /title=\{accessDenied \? 'Needs and notes unavailable' : undefined\}/);
    assert.match(needsScreen, /onRetry=\{accessDenied \? undefined : retry\}/);
  });
});
