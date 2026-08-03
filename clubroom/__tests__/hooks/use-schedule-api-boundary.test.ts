import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('useSchedule does not read legacy session offering or blocked-date mirrors', () => {
  const source = readSource('hooks/use-schedule.ts');

  assert.equal(
    source.includes('STORAGE_KEYS.SESSION_OFFERINGS'),
    false,
    'schedule offerings should not be read from local mirrors in the hook',
  );
  assert.equal(
    source.includes('STORAGE_KEYS.BLOCKED_DATES'),
    false,
    'legacy blocked-date mirrors should not be read from the hook',
  );
  assert.equal(source.includes('apiClient.get'), false, 'schedule hook should not own local reads');
  assert.equal(
    source.includes("scheduledAt?.split('T')[0]"),
    false,
    'schedule hook should use local date keys, not raw ISO string splits',
  );
  assert.equal(
    source.includes("scheduledAt.split('T')[0]"),
    false,
    'schedule hook should use local date keys, not raw ISO string splits',
  );
});

test('useSchedule fails closed when scheduling rules authority is unavailable', () => {
  const source = readSource('hooks/use-schedule.ts');
  const rulesReadStart = source.indexOf('schedulingRulesService.getCoachRules(coachId)');
  const scheduleReturnStart = source.indexOf('return ok({', rulesReadStart);

  assert.ok(rulesReadStart >= 0, 'expected schedule load to read coach scheduling rules');
  assert.ok(scheduleReturnStart > rulesReadStart, 'expected schedule return after rules read');

  const beforeReturn = source.slice(rulesReadStart, scheduleReturnStart);

  assert.equal(
    source.includes('rulesResult.success ? rulesResult.data : null'),
    false,
    'scheduling rules authority failures must not render as null rules',
  );
  assert.ok(
    beforeReturn.includes('if (!rulesResult.success)') &&
      beforeReturn.includes('return err(rulesResult.error);'),
    'scheduling rules authority failure should fail the schedule load',
  );
  assert.ok(
    source.includes('rules: rulesResult.data'),
    'successful schedule loads should use authoritative /v1 scheduling rules',
  );
});
