import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('coach profile tab posts use viewer-scoped post authority in API mode', () => {
  const source = readSource('hooks/use-coach-profile.ts');
  const loaderStart = source.indexOf('async function loadCoachFeedPostsIntoState');
  const mockBranchStart = source.indexOf('if (api.useMock) {', loaderStart);
  const apiBranchStart = source.indexOf("const result = await socialFeedService.getUpdatesFeedAuthority('all');");
  const loaderEnd = source.indexOf('export function useCoachProfile()', loaderStart);

  assert.ok(loaderStart >= 0, 'test should find coach profile feed loader');
  assert.ok(mockBranchStart > loaderStart, 'test should find mock branch');
  assert.ok(apiBranchStart > mockBranchStart, 'test should find API branch');
  assert.ok(loaderEnd > apiBranchStart, 'test should find loader boundary');

  const mockBranch = source.slice(mockBranchStart, apiBranchStart);
  const apiBranch = source.slice(apiBranchStart, loaderEnd);

  assert.ok(
    source.includes("import { api } from '@/constants/config';"),
    'hook should branch on runtime mode',
  );
  assert.ok(
    mockBranch.includes('socialFeedService.getFollowingFeed([coachId],'),
    'mock mode may keep local following-feed coach profile posts',
  );
  assert.equal(
    apiBranch.includes('getFollowingFeed'),
    false,
    'API mode must not read local following-feed mirrors for coach profile posts',
  );
  assert.ok(
    apiBranch.includes('result.data.filter((post) => post.authorId === coachId)'),
    'API mode should filter live readable posts to the coach author',
  );
  assert.ok(
    apiBranch.includes('targets.setFeedPosts([]);'),
    'API feed failures should fail closed instead of showing stale local posts',
  );
});
