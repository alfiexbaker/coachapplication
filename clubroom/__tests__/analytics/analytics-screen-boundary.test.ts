import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('coach analytics screen shows load errors instead of fake zero metrics', () => {
  const source = readProjectFile('components/coach/analytics-screen.tsx');
  const failureStart = source.indexOf('if (!result.success || !result.data)');
  const successStart = source.indexOf('const data = result.data;', failureStart);

  assert.ok(failureStart >= 0, 'analytics load failure branch should exist');
  assert.ok(successStart > failureStart, 'analytics success branch should follow failure branch');

  const failureBlock = source.slice(failureStart, successStart);
  assert.ok(failureBlock.includes('setAnalytics(null)'));
  assert.ok(failureBlock.includes('setLoadError('));
  assert.equal(failureBlock.includes('sessionsCount: 0'), false);
  assert.equal(failureBlock.includes('activeClients: 0'), false);
  assert.ok(source.includes('<ErrorState'));
  assert.ok(source.includes('Unable to load analytics'));
});
