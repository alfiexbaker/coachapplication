import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('emergency access keeps authorization denials terminal in the route', () => {
  const hook = readSource('hooks/use-emergency-access.ts');
  const screen = readSource('app/roster/[athleteId]/emergency.tsx');

  assert.match(hook, /if \(!dataResult\.success\) \{\s*return err\(dataResult\.error\);\s*\}/);
  assert.doesNotMatch(
    hook,
    /return err\(serviceError\('UNKNOWN', dataResult\.error\.message, dataResult\.error\)\);/,
  );
  assert.match(
    screen,
    /const terminalAccessError = e\.error\?\.code === 'NOT_FOUND' \|\| e\.error\?\.code === 'UNAUTHORIZED';/,
  );
  assert.match(screen, /onRetry=\{terminalAccessError \? undefined : e\.retry\}/);
});
