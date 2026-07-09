import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('updates tab uses live post and club authority in API mode', () => {
  const source = readSource('app/(tabs)/feed.tsx');
  const apiBranchStart = source.indexOf('if (!api.useMock) {');
  const mockBranchStart = source.indexOf('const baseFeed = isCoach');
  const handlerEnd = source.indexOf('const handleCommentPost');

  assert.ok(apiBranchStart >= 0, 'test should find the API-mode branch');
  assert.ok(mockBranchStart > apiBranchStart, 'test should find the mock branch after API mode');
  assert.ok(handlerEnd > mockBranchStart, 'test should find the like handler boundary');

  const apiBranch = source.slice(apiBranchStart, mockBranchStart);
  const mockBranch = source.slice(mockBranchStart, handlerEnd);

  assert.ok(
    source.includes("import { clubAuthorityService } from '@/services/club-authority-service';"),
    'Updates should import the /v1-backed club authority service',
  );
  assert.ok(
    apiBranch.includes('const clubsResult = await clubAuthorityService.listClubs();'),
    'API mode should load clubs from /v1 club authority',
  );
  assert.ok(
    apiBranch.includes('socialFeedService.getUpdatesFeedAuthority(feedFilter)'),
    'API mode should load feed posts from the /v1 posts authority helper',
  );
  assert.ok(
    apiBranch.includes('socialFeedService.getFollowingFeedAuthority(feedFilter)'),
    'API mode should load followed posts from the /v1 following-feed authority helper',
  );
  assert.equal(
    apiBranch.includes('followService.getFollowingIds'),
    false,
    'API mode must not read local following mirrors for the Updates tab',
  );
  assert.equal(
    apiBranch.includes('socialFeedService.getUserClubs(currentUser.id)'),
    false,
    'API mode must not read local club mirrors for the Updates tab',
  );
  assert.equal(
    apiBranch.includes('socialFeedService.getAggregatedFeed'),
    false,
    'API mode must not read local aggregated feed mirrors',
  );
  assert.ok(
    mockBranch.includes('socialFeedService.getUserClubs(currentUser.id)'),
    'mock mode keeps local club feed compatibility',
  );
  assert.ok(
    mockBranch.includes('socialFeedService.toggleReaction(postId, currentUser.id)'),
    'local reaction mutation should only remain in the mock branch',
  );
  assert.ok(
    source.includes('const result = await socialFeedService.toggleReactionAuthority(postId);'),
    'API mode likes should use the /v1 reaction toggle route',
  );
});

test('updates feed authority helper reads the viewer-scoped v1 post list', () => {
  const source = readSource('services/social-feed-service.ts');
  const methodStart = source.indexOf('async getUpdatesFeedAuthority(');
  const methodEnd = source.indexOf('async getFollowingFeedAuthority(');

  assert.ok(methodStart >= 0, 'test should find getUpdatesFeedAuthority');
  assert.ok(methodEnd > methodStart, 'test should find the helper boundary');

  const method = source.slice(methodStart, methodEnd);

  assert.ok(
    method.includes('apiFetch<ApiPostListResponse>("/v1/posts"'),
    'updates feed authority should call the viewer-scoped GET /v1/posts contract',
  );
  assert.equal(
    method.includes('`/v1/posts?clubId='),
    false,
    'updates feed should not make one club-scoped request per local mirror',
  );
  assert.ok(
    method.includes('mapApiPostToClubFeedPost(post, context)'),
    'updates feed should normalize backend post payloads through the shared mapper',
  );
});

test('following feed authority helper reads the backend following-only v1 post list', () => {
  const source = readSource('services/social-feed-service.ts');
  const methodStart = source.indexOf('async getFollowingFeedAuthority(');
  const methodEnd = source.indexOf('getUserClubs(userId: string): Club[]');

  assert.ok(methodStart >= 0, 'test should find getFollowingFeedAuthority');
  assert.ok(methodEnd > methodStart, 'test should find the helper boundary');

  const method = source.slice(methodStart, methodEnd);

  assert.ok(
    method.includes('apiFetch<ApiPostListResponse>("/v1/posts?followingOnly=true"'),
    'following feed authority should call the backend following-only GET /v1/posts contract',
  );
  assert.ok(
    method.includes('mapApiPostToClubFeedPost(post, context)'),
    'following feed should normalize backend post payloads through the shared mapper',
  );
});

test('updates feed renders author display names instead of raw backend ids', () => {
  const serviceSource = readSource('services/social-feed-service.ts');
  const cardSource = readSource('components/social/feed-post-card.tsx');
  const detailSource = readSource('hooks/use-post-detail.ts');

  assert.ok(
    serviceSource.includes('authorName = safePostAuthorName('),
    'backend posts should normalize an author display name separately from authorId',
  );
  assert.ok(
    serviceSource.includes('authorName,'),
    'mapped feed posts should carry authorName for rendering',
  );
  assert.ok(
    cardSource.includes('post.authorName?.trim()'),
    'feed cards should display authorName when present',
  );
  assert.equal(
    cardSource.includes('const authorName = post.authorId'),
    false,
    'feed cards must not render raw author ids as display names',
  );
  assert.ok(
    detailSource.includes('displayAuthorName(post.authorName'),
    'post detail should use the safe author display name for club feed posts',
  );
});
