import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('comment previews bind async results to the current post snapshot', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'components/social/comment-preview.tsx'),
    'utf8',
  );

  assert.ok(source.includes('const controller = new AbortController();'));
  assert.ok(source.includes('if (!controller.signal.aborted && result.success)'));
  assert.ok(source.includes('return () => controller.abort();'));
  assert.ok(source.includes('setResolvedPreview({ postId, commentCount, comment: result.data })'));
  assert.ok(source.includes('resolvedPreview?.postId === postId'));
  assert.ok(source.includes('resolvedPreview.commentCount === commentCount'));
});
