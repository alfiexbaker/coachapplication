import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('group-session mock fixtures are not initialized as API-mode caches', () => {
  const sessionsSource = readProjectFile('services/group-session/session-crud-service.ts');
  const registrationsSource = readProjectFile(
    'services/group-session/session-registration-service.ts',
  );

  assert.doesNotMatch(sessionsSource, /let sessionsCache:[^=]+=\s*\[\.\.\.MOCK_SESSIONS\];/);
  assert.doesNotMatch(
    registrationsSource,
    /let registrationsCache:[^=]+=\s*\[\.\.\.MOCK_REGISTRATIONS\];/,
  );
  assert.ok(sessionsSource.includes('USE_MOCK ? [...MOCK_SESSIONS] : []'));
  assert.ok(registrationsSource.includes('isMockMode() ? [...MOCK_REGISTRATIONS] : []'));
});
