import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('my progress media failures surface instead of empty gallery fallback', () => {
  const source = readProjectFile('hooks/use-my-progress.ts');
  const mediaFailureStart = source.indexOf('if (!mediaResult.success)');
  const loadedLogStart = source.indexOf("logger.info('My progress loaded'", mediaFailureStart);

  assert.ok(mediaFailureStart >= 0, 'media failure branch should exist');
  assert.ok(loadedLogStart > mediaFailureStart, 'success path should follow media failure branch');

  const failureBlock = source.slice(mediaFailureStart, loadedLogStart);
  assert.ok(failureBlock.includes('return err(mediaResult.error);'));
  assert.equal(source.includes('const media = mediaResult.success ? mediaResult.data : []'), false);
  assert.ok(source.includes('const media = mediaResult.data;'));
});
