import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('auth does not bootstrap coach-session demo data', () => {
  const source = readSource('hooks/use-auth.tsx');

  assert.equal(source.includes('coach-session-seed-service'), false);
  assert.equal(source.includes('ensureCoachSessionsSeeded'), false);
});

test('API mode does not expose a hardcoded auth user directory', () => {
  const source = readSource('hooks/use-auth.tsx');

  assert.equal(source.includes('API_DEV_USERS'), false);
  assert.equal(source.includes('resolveApiLoginEmail'), false);
  assert.equal(source.includes('clubroom.demo'), false);
  assert.equal(source.includes('MOCK_API_MODE ? registeredUsers : []'), true);
});
