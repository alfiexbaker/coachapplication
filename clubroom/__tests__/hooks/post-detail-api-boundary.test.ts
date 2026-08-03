import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('post detail establishes post access before loading comments', () => {
  const source = readSource('hooks/use-post-detail.ts');
  const loadStart = source.indexOf('const loadDetail = async () => {');
  const loadEnd = source.indexOf('const screen = useScreen<PostDetailData>({');
  assert.ok(loadStart >= 0, 'test should find the detail loader');
  assert.ok(loadEnd > loadStart, 'test should find the detail screen boundary');
  const loadBlock = source.slice(loadStart, loadEnd);
  const postRead = loadBlock.indexOf('socialFeedService.getPostAuthority(postId)');
  const commentRead = loadBlock.indexOf('commentService.getCommentsForPost(postId)');

  assert.ok(postRead >= 0, 'detail should read the authoritative post');
  assert.ok(commentRead > postRead, 'comments must load only after the post read succeeds');
  assert.ok(
    loadBlock.includes('if (!postResult.success)'),
    'failed or denied post access must stop the detail load',
  );
  assert.equal(
    loadBlock.includes('getAggregatedFeed'),
    false,
    'the detail route must not own a parallel feed lookup',
  );
});

test('post detail service and screen expose live post read path', () => {
  const serviceSource = readSource('services/social-feed-service.ts');
  const screenSource = readSource('app/(modal)/post-detail.tsx');
  const inventorySource = readSource('docs/backend-api/ROUTE_INVENTORY_V1.md');

  assert.ok(
    serviceSource.includes('async getPostAuthority(postId: string)'),
    'social feed service should expose a post detail authority read',
  );
  assert.ok(
    serviceSource.includes('`/v1/posts/${encodeURIComponent(postId)}`'),
    'post detail authority read should call /v1/posts/:postId',
  );
  assert.ok(
    screenSource.includes("detail.loadError?.code === 'NOT_FOUND'"),
    'screen should distinguish unavailable posts from retryable failures',
  );
  assert.ok(
    screenSource.includes('title="Could not load update"'),
    'retryable failures should render an honest error state',
  );
  assert.ok(
    inventorySource.includes('| `/v1/posts/:postId`'),
    'route inventory should document the post detail route',
  );
});

test('post detail exposes explicit guarded mutations and preserves comment retry identity', () => {
  const hookSource = readSource('hooks/use-post-detail.ts');
  const serviceSource = readSource('services/comment-service.ts');
  const inputSource = readSource('components/social/comment-input.tsx');
  const cardSource = readSource('components/social/comment-card.tsx');
  const actionSource = readSource('components/social/comment-card-sections.tsx');

  assert.ok(hookSource.includes('postReactionPendingRef.current'), 'post reactions need a mutex');
  assert.ok(
    hookSource.includes('submittingCommentRef.current'),
    'comment submission needs a mutex',
  );
  assert.ok(
    hookSource.includes("apiClient.generateId('comment-create-intent')"),
    'a comment submit intent should own a stable idempotency key',
  );
  assert.ok(
    serviceSource.includes('input.idempotencyKey ?? apiClient.generateId'),
    'the comment service should reuse a caller-owned retry key',
  );
  assert.ok(inputSource.includes('submitting?: boolean'), 'the composer should expose busy state');
  assert.ok(
    inputSource.includes('value.length > warnThreshold ?'),
    'the character count should stay hidden until useful',
  );
  assert.equal(
    cardSource.includes('onLongPress'),
    false,
    'delete must not be hidden on long-press',
  );
  assert.ok(
    actionSource.includes('accessibilityLabel={`Delete comment by ${authorName}`}'),
    'an author should get an explicit labelled delete action',
  );
  assert.ok(actionSource.includes('minHeight: 44'), 'comment actions need 44pt targets');
});
