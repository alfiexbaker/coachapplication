import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('profile posts use viewer-scoped post authority in API mode', () => {
  const source = readSource('app/profile/[userId].tsx');
  const loadStart = source.indexOf('load: async () => {', source.indexOf('useScreen<AggregatedFeedPost[]>'));
  const apiBranchStart = source.indexOf('if (!api.useMock) {', loadStart);
  const mockReturnStart = source.indexOf('return ok(socialFeedService.getFollowingFeed([data.id],', apiBranchStart);
  const loadEnd = source.indexOf('deps: [userId, data?.id]', loadStart);

  assert.ok(loadStart >= 0, 'test should find profile posts loader');
  assert.ok(apiBranchStart > loadStart, 'test should find API branch');
  assert.ok(mockReturnStart > apiBranchStart, 'test should find mock fallback');
  assert.ok(loadEnd > mockReturnStart, 'test should find loader boundary');

  const apiBranch = source.slice(apiBranchStart, mockReturnStart);
  const mockBranch = source.slice(mockReturnStart, loadEnd);

  assert.ok(
    source.includes("import { api } from '@/constants/config';"),
    'profile screen should branch on runtime mode',
  );
  assert.ok(
    apiBranch.includes("const result = await socialFeedService.getUpdatesFeedAuthority('all');"),
    'API mode should use viewer-scoped post authority',
  );
  assert.ok(
    apiBranch.includes('result.data.filter((post) => post.authorId === data.id)'),
    'API mode should filter live readable posts to the profile author',
  );
  assert.equal(
    apiBranch.includes('getFollowingFeed'),
    false,
    'API mode must not read local following-feed mirrors for profile posts',
  );
  assert.ok(
    mockBranch.includes('socialFeedService.getFollowingFeed([data.id],'),
    'mock mode may keep local following-feed profile posts',
  );
});

test('profile post reactions use backend authority in API mode', () => {
  const source = readSource('app/profile/[userId].tsx');
  const likeStart = source.indexOf('const handleLikePost = async (postId: string) => {');
  const likeEnd = source.indexOf('const handleCommentPost =', likeStart);

  assert.ok(likeStart >= 0, 'test should find profile post like handler');
  assert.ok(likeEnd > likeStart, 'test should find like handler boundary');

  const likeBlock = source.slice(likeStart, likeEnd);
  const apiBranchStart = likeBlock.indexOf('if (!api.useMock) {');
  const localToggleStart = likeBlock.indexOf('socialFeedService.toggleReaction(postId, currentUser.id)');

  assert.ok(apiBranchStart >= 0, 'profile post likes should guard API mode');
  assert.ok(
    likeBlock.includes('const result = await socialFeedService.toggleReactionAuthority(postId);'),
    'API mode should call backend reaction authority',
  );
  assert.ok(
    localToggleStart > apiBranchStart,
    'local reaction toggles should sit behind the API guard',
  );
});
