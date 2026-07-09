import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('post detail loads API-mode post header from post authority', () => {
  const source = readSource('hooks/use-post-detail.ts');
  const localPostStart = source.indexOf('const localPost = (() => {');
  const authorityStateStart = source.indexOf('const [authorityPost, setAuthorityPost]');
  const loadPostStart = source.indexOf('const loadPost = async () => {');
  const loadPostEnd = source.indexOf('const post = api.useMock ? localPost : authorityPost;');

  assert.ok(localPostStart >= 0, 'test should find local post block');
  assert.ok(authorityStateStart > localPostStart, 'test should find authority state boundary');
  assert.ok(loadPostStart > authorityStateStart, 'test should find API post loader');
  assert.ok(loadPostEnd > loadPostStart, 'test should find post selection boundary');

  const localPostBlock = source.slice(localPostStart, authorityStateStart);
  const loadPostBlock = source.slice(loadPostStart, loadPostEnd);

  assert.ok(
    localPostBlock.includes('if (!api.useMock) return null;'),
    'local feed lookup must be mock-only',
  );
  assert.match(
    localPostBlock,
    /socialFeedService\s*\.\s*getAggregatedFeed\(currentUser\.id\)/,
    'mock mode may keep aggregated feed lookup',
  );
  assert.ok(
    loadPostBlock.includes('const result = await socialFeedService.getPostAuthority(postId);'),
    'API mode should load post header/body from post authority',
  );
  assert.equal(
    loadPostBlock.includes('getAggregatedFeed'),
    false,
    'API post loader must not read local aggregated feeds',
  );
  assert.ok(
    source.includes('const post = api.useMock ? localPost : authorityPost;'),
    'rendered post should come from authority outside mock mode',
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
  assert.ok(screenSource.includes('p.postLoading'), 'screen should render live post loading state');
  assert.ok(
    inventorySource.includes('| `/v1/posts/:postId`'),
    'route inventory should document the post detail route',
  );
});
