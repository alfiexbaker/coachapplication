import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('expensive component state defaults use lazy initializers', () => {
  const schedulingRulesSource = fs.readFileSync(
    path.join(process.cwd(), 'components/coach/scheduling-rules-modal.tsx'),
    'utf8',
  );
  const familyCalendarSource = fs.readFileSync(
    path.join(process.cwd(), 'components/family/FamilyCalendar.tsx'),
    'utf8',
  );

  assert.match(
    schedulingRulesSource,
    /useState<RefundTier\[\]>\(\s*\(\) => schedulingRulesService\.getDefaultCancellationPolicy\(\)\.tiers/,
  );
  assert.match(familyCalendarSource, /useState\(\(\) => new Date\(selectedDate\)\)/);
});
