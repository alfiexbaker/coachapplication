import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('session completion personal feedback opens API draft before local COACH_SESSIONS writes', () => {
  const source = readSource('app/session/[id]/complete.tsx');

  const flag = source.indexOf(
    'apiClient.isMockMode || (!isGroupCompletion && sourceType === "booking")',
  );
  const handler = source.indexOf('const handlePersonalFeedback = async');
  const guard = source.indexOf('if (!canOpenPersonalFeedback)', handler);
  const apiBranch = source.indexOf('if (!apiClient.isMockMode)', handler);
  const apiWrite = source.indexOf(
    'await progressFeedbackService.addSessionFeedback',
    handler,
  );
  const apiNavigation = source.indexOf('Routes.developmentSession(session.id', handler);
  const localRead = source.indexOf('apiClient.get<Record<string, unknown>[]>', handler);
  const localWrite = source.indexOf('apiClient.set(STORAGE_KEYS.COACH_SESSIONS', handler);

  assert.ok(flag >= 0, 'personal feedback must allow API mode for individual bookings only');
  assert.ok(handler >= 0, 'test should find the personal feedback handler');
  assert.ok(guard >= 0, 'handler must still guard unsupported sources');
  assert.equal(
    source.includes('Detailed per-athlete feedback needs a backend session-feedback route'),
    false,
    'API mode should no longer use the old unsupported backend-route copy',
  );
  assert.ok(apiBranch >= 0, 'handler must branch into the API feedback write path');
  assert.ok(apiWrite >= 0, 'API path must create/update backend session feedback');
  assert.ok(apiNavigation >= 0, 'API path must open the editor against the backend session id');
  assert.ok(localRead >= 0, 'test should find the local COACH_SESSIONS read');
  assert.ok(localWrite >= 0, 'test should find the local COACH_SESSIONS write');
  assert.ok(guard < localRead, 'API-mode guard must run before local COACH_SESSIONS reads');
  assert.ok(guard < localWrite, 'API-mode guard must run before local COACH_SESSIONS writes');
  assert.ok(apiBranch < localRead, 'API branch must run before local COACH_SESSIONS reads');
  assert.ok(apiWrite < localRead, 'API feedback write must happen before local session reads');
  assert.ok(apiNavigation < localRead, 'API navigation must happen before local dev-session path');
});
