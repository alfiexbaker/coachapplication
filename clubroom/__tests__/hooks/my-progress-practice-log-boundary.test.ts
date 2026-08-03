import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('My Progress exposes live practice-log reads and writes without local authority', () => {
  const screen = readSource('app/development/my-progress.tsx');
  const hook = readSource('hooks/use-my-progress.ts');

  assert.ok(screen.includes('PracticeLogCard,'));
  assert.equal(screen.match(/<PracticeLogCard/g)?.length, 2);
  assert.ok(screen.includes('const result = await logPracticeMinutes(minutes);'));
  assert.ok(screen.includes("uiFeedback.showToast(result.error.message, 'error')"));

  assert.ok(hook.includes('progressPracticeLogService.listAthleteLogs(selectedAthleteId)'));
  assert.ok(hook.includes('progressPracticeLogService.getTodaySummary(selectedAthleteId)'));
  assert.ok(hook.includes('sumPracticeMinutesForDateWindow('));

  const mutationStart = hook.indexOf('const logPracticeMinutes = async (minutes: number) => {');
  const mutationEnd = hook.indexOf('const sortedFeedback', mutationStart);
  assert.ok(mutationStart >= 0 && mutationEnd > mutationStart);
  const mutation = hook.slice(mutationStart, mutationEnd);

  assert.ok(mutation.includes('practiceLogInFlightRef.current'));
  assert.match(mutation, /progressPracticeLogService\s*\.logPractice\(\{/);
  assert.ok(mutation.includes('if (result.success)'));
  assert.ok(mutation.includes('onRefresh();'));
  assert.doesNotMatch(mutation, /apiClient\.(get|set)|AsyncStorage|STORAGE_KEYS/);
});
