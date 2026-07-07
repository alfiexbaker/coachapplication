import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('logout clears legacy session bookings with explicit local cleanup only', () => {
  const source = readSource('hooks/use-auth.tsx');
  const logoutStart = source.indexOf('const logout = async () => {');
  assert.ok(logoutStart >= 0, 'test should find logout');

  const genericRemove = source.indexOf("apiClient.remove('session_bookings')", logoutStart);
  const localRemove = source.indexOf("apiClient.removeLocal('session_bookings')", logoutStart);

  assert.equal(
    genericRemove,
    -1,
    'logout must not use generic server-owned storage delete for session_bookings',
  );
  assert.ok(localRemove >= 0, 'logout should clear stale legacy session_bookings locally');
});
