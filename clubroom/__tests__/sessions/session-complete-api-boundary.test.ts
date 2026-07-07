import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('session completion personal feedback fails closed before local COACH_SESSIONS writes in API mode', () => {
  const source = readSource('app/session/[id]/complete.tsx');

  const flag = source.indexOf('const canOpenPersonalFeedback = apiClient.isMockMode;');
  const handler = source.indexOf('const handlePersonalFeedback = async');
  const guard = source.indexOf('if (!canOpenPersonalFeedback)', handler);
  const unsupportedCopy = source.indexOf(
    'Detailed per-athlete feedback needs a backend session-feedback route',
    guard,
  );
  const localRead = source.indexOf('apiClient.get<Record<string, unknown>[]>', handler);
  const localWrite = source.indexOf('apiClient.set(STORAGE_KEYS.COACH_SESSIONS', handler);
  const navigation = source.indexOf('Routes.developmentSession', handler);

  assert.ok(flag >= 0, 'personal feedback must derive availability from API/mock mode');
  assert.ok(handler >= 0, 'test should find the personal feedback handler');
  assert.ok(guard >= 0, 'handler must guard API mode before local session writes');
  assert.ok(unsupportedCopy >= 0, 'API mode should explain the missing backend route');
  assert.ok(localRead >= 0, 'test should find the local COACH_SESSIONS read');
  assert.ok(localWrite >= 0, 'test should find the local COACH_SESSIONS write');
  assert.ok(navigation >= 0, 'test should find development-session navigation');
  assert.ok(guard < localRead, 'API-mode guard must run before local COACH_SESSIONS reads');
  assert.ok(guard < localWrite, 'API-mode guard must run before local COACH_SESSIONS writes');
  assert.ok(guard < navigation, 'API-mode guard must run before local dev-session navigation');
});
