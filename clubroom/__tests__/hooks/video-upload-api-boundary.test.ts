import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('video upload preserves backend upload authority errors', () => {
  const source = readSource('hooks/use-video-upload.ts');
  const helperStart = source.indexOf('export function resolveVideoUploadErrorMessage');
  const submitStart = source.indexOf('const handleSubmit = async () => {');
  const catchStart = source.indexOf('} catch (error) {', submitStart);
  const catchEnd = source.indexOf('  };', catchStart);

  assert.ok(helperStart >= 0, 'expected upload error message helper');
  assert.ok(submitStart >= 0, 'expected upload submit handler');
  assert.ok(catchStart >= 0, 'expected upload catch block');
  assert.ok(catchEnd > catchStart, 'expected bounded upload catch block');

  const helperBlock = source.slice(helperStart, submitStart);
  const catchBlock = source.slice(catchStart, catchEnd);

  assert.ok(helperBlock.includes('error instanceof Error'));
  assert.ok(helperBlock.includes('error.message.trim()'));
  assert.ok(helperBlock.includes('return GENERIC_VIDEO_UPLOAD_ERROR;'));
  assert.ok(
    catchBlock.includes("uiFeedback.showToast(resolveVideoUploadErrorMessage(error), 'error');"),
    'upload failures should surface backend/provider error messages',
  );
  assert.equal(
    catchBlock.includes('There was an error uploading your video. Please try again.'),
    false,
    'catch block must not overwrite backend upload errors with a generic toast',
  );
});
