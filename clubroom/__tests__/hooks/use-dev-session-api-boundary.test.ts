import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('useDevSession fails closed before local COACH_SESSIONS access in API mode', () => {
  const source = readSource('hooks/use-dev-session.ts');

  const loadGuard = source.indexOf('if (!apiClient.isMockMode)');
  const loadRead = source.indexOf('apiClient.get<SessionRecord[]>(STORAGE_KEYS.COACH_SESSIONS');
  assert.ok(loadGuard >= 0, 'load path must guard API mode');
  assert.ok(loadRead >= 0, 'test should find the local session read');
  assert.ok(loadGuard < loadRead, 'load path must reject API mode before local session reads');

  const saveStart = source.indexOf('const handleSave = async () => {');
  const saveGuard = source.indexOf('if (!apiClient.isMockMode)', saveStart);
  const saveRead = source.indexOf(
    'apiClient.get<SessionRecord[]>(STORAGE_KEYS.COACH_SESSIONS',
    saveStart,
  );
  assert.ok(saveStart >= 0, 'test should find save handler');
  assert.ok(saveGuard >= 0, 'save path must guard API mode');
  assert.ok(saveRead >= 0, 'test should find the local session read in save path');
  assert.ok(saveGuard < saveRead, 'save path must reject API mode before local session reads');
});
