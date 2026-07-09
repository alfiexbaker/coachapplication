import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('RSVP summary shows load errors instead of fake empty attendance', () => {
  const source = readProjectFile('components/session/rsvp-summary.tsx');

  assert.ok(source.includes("setLoadError('Unable to load RSVPs')"));
  assert.ok(source.includes('if (loadError)'));
  assert.equal(source.includes('Fail silently, show empty state'), false);
});
