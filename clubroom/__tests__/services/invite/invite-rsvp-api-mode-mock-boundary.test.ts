import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('invite RSVP mock fixtures are not initialized as API-mode cache', () => {
  const source = readProjectFile('services/invite/invite-rsvp-service.ts');

  assert.doesNotMatch(
    source,
    /let responsesCache:[^=]+=\s*MOCK_INVITE_RSVPS\.map\(cloneResponse\);/,
  );
  assert.ok(
    source.includes('isMockMode()') &&
      source.includes('MOCK_INVITE_RSVPS.map(cloneResponse)') &&
      source.includes(': []'),
  );
});
