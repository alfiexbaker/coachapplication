import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('useChildrenHub derives child stats from athlete analytics instead of local coach sessions', () => {
  const source = readSource('hooks/use-children-hub.ts');

  assert.equal(source.includes('coach_sessions'), false);
  assert.equal(source.includes('apiClient.get'), false);
  assert.equal(source.includes('analytics?.totalSessions ?? 0'), false);
  assert.equal(source.includes('analytics?.averageSessionRating ?? 0'), false);
  assert.match(source, /analyticsQueryService\.getAthleteAnalytics\(child\.id, 'ALL'\)/);
  assert.match(source, /if \(!analyticsResult\.success \|\| !analyticsResult\.data\)/);
});
