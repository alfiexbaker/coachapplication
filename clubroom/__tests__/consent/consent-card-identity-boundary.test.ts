import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('consent cards bind async names to the rendered athlete', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'components/consent/ConsentCard.tsx'),
    'utf8',
  );

  assert.ok(source.includes('const controller = new AbortController();'));
  assert.ok(source.includes('const athleteId = athleteConsent.athleteId;'));
  assert.ok(source.includes('void userService.getUserById(athleteId).then((result) => {'));
  assert.ok(
    source.includes('if (!controller.signal.aborted && result.success && result.data.name)'),
  );
  assert.ok(source.includes('return () => controller.abort();'));
  assert.ok(
    source.includes('resolvedAthleteName?.athleteId === athleteConsent.athleteId'),
    'a previously resolved name must not render for a different athlete consent record',
  );
});
