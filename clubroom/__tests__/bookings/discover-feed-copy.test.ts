import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('booking discovery presents a direct coach-search action', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'components/bookings/discover-feed.tsx'),
    'utf8',
  );

  assert.match(source, /<FindCoachAction onPress=\{handleFindCoachPress\} \/>/);
  assert.match(source, /accessibilityLabel="Find a coach"/);
  assert.match(source, /Search nearby coaches and book a session\./);
  assert.doesNotMatch(source, /Map-first coach search/);
  assert.doesNotMatch(source, /trusted nearby coaches/);
});
