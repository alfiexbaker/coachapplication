import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

test('match creation rejects invalid squad sizes and preserves server validation feedback', () => {
  const hook = fs.readFileSync(path.join(ROOT, 'hooks/use-create-match.ts'), 'utf8');
  const routes = fs.readFileSync(
    path.join(ROOT, 'apps/api/src/modules/coach-club/matches.ts'),
    'utf8',
  );

  assert.ok(hook.includes('const parsedMaxPlayers = Number(maxPlayers);'));
  assert.ok(hook.includes("uiFeedback.showToast('Enter a squad size from 1 to 30.', 'error');"));
  assert.ok(hook.includes('maxPlayers: parsedMaxPlayers,'));
  assert.equal(hook.includes('parseInt(maxPlayers, 10) || 14'), false);
  assert.ok(hook.includes("error.message ? error.message : 'Could not create match.'"));
  assert.ok(routes.includes('function isMatchValidationError(error: unknown): boolean'));
  assert.ok(routes.includes("throw badRequest('Request payload did not match contract');"));
});
