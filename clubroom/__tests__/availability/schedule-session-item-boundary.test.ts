import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('schedule session rows do not expose internal athlete ids as labels', () => {
  const itemSource = readSource('components/schedule/schedule-session-item.tsx');
  const scheduleHookSource = readSource('hooks/use-schedule.ts');

  assert.ok(
    itemSource.includes('INTERNAL_ID_PREFIX'),
    'schedule row should sanitize id-shaped labels',
  );
  assert.ok(
    itemSource.includes('{displayLabel}'),
    'schedule row should render sanitized display label',
  );
  assert.ok(
    !itemSource.includes('session.athleteName || session.title'),
    'schedule row should not directly render raw athleteName/title fallback',
  );
  assert.ok(
    !scheduleHookSource.includes('athleteName: b.athleteId'),
    'schedule hook should not use athlete id as display name',
  );
});
