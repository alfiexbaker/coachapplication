import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('progress hooks do not bootstrap demo seed data before live reads', () => {
  const source = readSource('hooks/use-my-progress.ts');
  const homeSource = readSource('hooks/use-home-screen.ts');

  assert.equal(
    source.includes("import { preApiLive } from '@/constants/config';"),
    false,
    'progress seed bootstrapping must not depend on pre-API live config',
  );
  for (const hookSource of [source, homeSource]) {
    assert.equal(hookSource.includes('ENABLE_PROGRESS_DEMO_SEED'), false);
    assert.equal(hookSource.includes('ensureProgressDemoSeeded'), false);
    assert.equal(hookSource.includes('ensureUser1DiamondTestDataSeeded'), false);
    assert.equal(hookSource.includes('clearProgressDemoSeedData'), false);
    assert.equal(hookSource.includes('ensureRelationalDemoSeeded'), false);
  }
});

test('my progress uses static coach fixture profile fallbacks only in mock mode', () => {
  const source = readSource('hooks/use-my-progress.ts');

  const occurrences = source.match(/resolveCoachAndProfile/g) ?? [];
  assert.equal(occurrences.length, 3, 'expected one import and two guarded fallback call sites');
  assert.ok(
    source.includes('apiClient.isMockMode\n        ? resolveCoachAndProfile(entry.coachId)'),
    'coach qualification fallback must be mock-mode guarded',
  );
  assert.ok(
    source.includes('apiClient.isMockMode\n      ? resolveCoachAndProfile(latestFeedback.coachId)'),
    'latest coach badge fallback must be mock-mode guarded',
  );
});

test('my progress attendance enrichment uses live booking authority outside mock mode', () => {
  const source = readSource('hooks/use-my-progress.ts');
  const helperStart = source.indexOf('async function listOptionalAttendanceBookings()');
  const helperEnd = source.indexOf('interface StreakInfo', helperStart);

  assert.ok(helperStart >= 0, 'optional attendance helper should exist');
  assert.ok(helperEnd > helperStart, 'optional attendance helper should precede progress types');

  const helperSource = source.slice(helperStart, helperEnd);
  assert.ok(
    helperSource.includes('if (apiClient.isMockMode) {\n    return bookingService.list();\n  }'),
    'local booking service access must remain mock-mode guarded',
  );
  assert.ok(
    helperSource.includes('const result = await bookingAuthorityService.listBookings();'),
    'API mode must use booking authority service',
  );
  assert.ok(
    helperSource.includes('throw new Error(result.error.message);'),
    'API-mode attendance booking authority failures should surface instead of disappearing',
  );
  assert.ok(
    helperSource.includes('mapApiBookingToBooking'),
    'API booking responses should use the shared projection mapper',
  );
});
