import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('invite slot holds are mock-only in API mode', () => {
  const source = readSource('services/invite-hold-service.ts');

  const loadStart = source.indexOf('async function loadHolds()');
  const loadGuard = source.indexOf('if (!isMockMode())', loadStart);
  const loadRead = source.indexOf('apiClient.get<InviteSlotHold[] | null>', loadStart);

  assert.ok(loadStart >= 0, 'test should find loadHolds');
  assert.ok(loadGuard >= 0, 'loadHolds must guard API mode');
  assert.ok(loadRead >= 0, 'test should find local hold read');
  assert.ok(loadGuard < loadRead, 'API mode must return before reading local invite holds');

  const saveStart = source.indexOf('async function saveHolds(');
  const saveGuard = source.indexOf('if (!isMockMode())', saveStart);
  const saveWrite = source.indexOf('apiClient.set(STORAGE_KEYS.INVITE_SLOT_HOLDS', saveStart);

  assert.ok(saveStart >= 0, 'test should find saveHolds');
  assert.ok(saveGuard >= 0, 'saveHolds must guard API mode');
  assert.ok(saveWrite >= 0, 'test should find local hold write');
  assert.ok(saveGuard < saveWrite, 'API mode must skip local invite hold writes');

  const createStart = source.indexOf('async createHolds(');
  const createGuard = source.indexOf('if (!isMockMode())', createStart);
  const createReturn = source.indexOf('return [];', createGuard);
  const createLoad = source.indexOf('const holds = await loadHolds()', createStart);

  assert.ok(createStart >= 0, 'test should find createHolds');
  assert.ok(createGuard >= 0, 'createHolds must guard API mode');
  assert.ok(createReturn >= 0, 'createHolds should return no local holds in API mode');
  assert.ok(createLoad >= 0, 'test should find mock hold load');
  assert.ok(createGuard < createLoad, 'API mode must return before creating local invite holds');
});
