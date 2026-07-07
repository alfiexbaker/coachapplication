import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('useDevBadges fails closed before local COACH_SESSIONS access in API mode', () => {
  const source = readSource('hooks/use-dev-badges.ts');

  const guard = source.indexOf('if (!apiClient.isMockMode)');
  const localRead = source.indexOf('apiClient.get<Session[]>(STORAGE_KEYS.COACH_SESSIONS');

  assert.ok(guard >= 0, 'dev badges load path must guard API mode');
  assert.ok(localRead >= 0, 'test should find the local session read');
  assert.ok(guard < localRead, 'dev badges must reject API mode before local session reads');
  assert.match(source, /\/v1\/sessions\/:sessionId\/badges/);
  assert.match(source, /\/v1\/athletes\/:athleteId\/badge-awards/);
});
