import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('the recovery timeline has a renderable empty state', () => {
  const timeline = fs.readFileSync(
    path.join(process.cwd(), 'components/health/RecoveryTimeline.tsx'),
    'utf8',
  );
  const sections = fs.readFileSync(
    path.join(process.cwd(), 'components/health/recovery-timeline-sections.tsx'),
    'utf8',
  );

  assert.match(timeline, /import \{[\s\S]*TimelineEmptyState,[\s\S]*\}/);
  assert.match(timeline, /<TimelineEmptyState palette=\{palette\} \/>/);
  assert.match(sections, /export function TimelineEmptyState/);
  assert.match(sections, /No recovery notes/);
});
