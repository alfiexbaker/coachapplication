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

test('group-session create API failures do not log raw create payload text', () => {
  const source = readProjectFile('services/group-session/group-session-authority-service.ts');

  assert.doesNotMatch(
    source,
    /logger\.error\('Failed to create group session via API',\s*\{\s*input,/,
    'group-session create failure logs must not include the full input payload',
  );
  assert.match(
    source,
    /scheduleFields: Array\.isArray\(input\.schedule\)/,
    'schedule diagnostics should log field names instead of raw schedule values',
  );
  assert.match(
    source,
    /focusCount: input\.focus\?\.length \?\? 0/,
    'focus diagnostics should log counts instead of raw focus values',
  );
  assert.match(
    source,
    /equipmentCount: input\.equipment\?\.length \?\? 0/,
    'equipment diagnostics should log counts instead of raw equipment values',
  );
  assert.match(
    source,
    /titleLength: input\.title\.trim\(\)\.length/,
    'title diagnostics should log length instead of raw title text',
  );
  assert.match(
    source,
    /locationLength: input\.location\.trim\(\)\.length/,
    'location diagnostics should log length instead of raw location text',
  );
});
