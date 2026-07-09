import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('analytics mock fixtures are not initialized as API-mode caches', () => {
  const query = readSource('services/analytics/analytics-query-service.ts');
  const tracking = readSource('services/analytics/analytics-tracking-service.ts');
  const exportService = readSource('services/analytics/analytics-export-service.ts');
  const athleteSources = [query, tracking].join('\n');

  assert.equal(athleteSources.includes('= [...MOCK_ANALYTICS];'), false);
  assert.equal(athleteSources.includes('= [...MOCK_GOALS];'), false);
  assert.doesNotMatch(exportService, /let coachAnalyticsCache:[^=]+=\s*\{ \.\.\.MOCK_COACH_ANALYTICS \};/);
  assert.ok(athleteSources.includes('USE_MOCK ? [...MOCK_ANALYTICS] : []'));
  assert.ok(athleteSources.includes('USE_MOCK ? [...MOCK_GOALS] : []'));
  assert.match(
    exportService,
    /let coachAnalyticsCache:[\s\S]+USE_MOCK\s+\?\s+\{ \.\.\.MOCK_COACH_ANALYTICS \}\s+: \{\};/,
  );
});
