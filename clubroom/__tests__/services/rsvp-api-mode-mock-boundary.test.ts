import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('session RSVP mock fixtures are not initialized as API-mode cache', () => {
  const source = readProjectFile('services/rsvp-service.ts');

  assert.doesNotMatch(source, /let rsvpCache:[^=]+=\s*MOCK_RSVPS\.map\(cloneRsvp\);/);
  assert.ok(source.includes('isMockMode() ? MOCK_RSVPS.map(cloneRsvp) : []'));
  assert.ok(source.includes('if (!isMockMode()) {\n      rsvpCache = [];\n      return;\n    }'));
  assert.ok(source.includes('if (!isMockMode()) {\n      return;\n    }\n    rsvpCache = rsvps.map(cloneRsvp);'));
});
