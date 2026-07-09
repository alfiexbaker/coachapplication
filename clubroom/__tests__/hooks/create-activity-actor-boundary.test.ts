import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('event and match create flows require resolved actor names before writes', () => {
  const eventSource = readSource('hooks/use-create-event.ts');
  const matchSource = readSource('hooks/use-create-match.ts');

  assert.doesNotMatch(eventSource, /createdByName:\s*currentUser\.name\s*\|\|\s*'Coach'/);
  assert.doesNotMatch(matchSource, /coachName:\s*currentUser\?\.fullName\s*\|\|[^,\n]*'Coach'/);
  assert.ok(
    eventSource.includes('Complete your account name before creating an event.') &&
      eventSource.includes('createdByName'),
    'event create should fail closed before sending a placeholder creator name',
  );
  assert.ok(
    matchSource.includes('Complete your account name before creating a match.') &&
      matchSource.includes('coachName'),
    'match create should fail closed before sending a placeholder coach name',
  );
});
