import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

test('raise concern preserves roster access denials as terminal state', () => {
  const screen = fs.readFileSync(path.join(ROOT, 'app/roster/[athleteId]/raise-concern.tsx'), 'utf8');

  assert.ok(screen.includes('function toConcernLoadError(error: unknown): ServiceError'));
  assert.ok(screen.includes('return err(toConcernLoadError(loadError));'));
  assert.ok(screen.includes("error?.code === 'NOT_FOUND' || error?.code === 'UNAUTHORIZED'"));
  assert.ok(screen.includes('onRetry={terminalAccessError ? undefined : retry}'));
});
