import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('video detail cache is scoped to the authenticated actor', () => {
  const source = readSource('hooks/use-video-detail.ts');

  assert.ok(source.includes('deps: [id, currentUser?.id]'));
  assert.ok(
    source.includes(
      "? `video-detail:${currentUser?.id ?? 'anonymous'}:${id}`",
    ),
  );
});

test('video detail does not present a generic link as a sharing control', () => {
  const route = readSource('app/videos/[id].tsx');
  const hook = readSource('hooks/use-video-detail.ts');
  const details = readSource('components/video/video-details-card.tsx');

  assert.doesNotMatch(route, /accessibilityLabel="Share video"/);
  assert.doesNotMatch(hook, /Share\.share/);
  assert.doesNotMatch(details, /coachName/);
});

test('video upload reflects supported formats and labels essential controls', () => {
  const upload = readSource('components/video/video-upload.tsx');
  const sections = readSource('components/video/video-upload-sections.tsx');
  const route = readSource('app/videos/upload.tsx');

  assert.ok(upload.includes("new Set(['mp4', 'mov', 'm4v'])"));
  assert.ok(upload.includes("'Choose an MP4, MOV, or M4V video.'"));
  assert.ok(sections.includes("'Formats: MP4, MOV, M4V'"));
  assert.ok(route.includes('accessibilityLabel="Back"'));
  assert.ok(route.includes('accessibilityLabel="Upload video"'));
  assert.ok(route.includes('accessibilityLabel="Video title"'));
  assert.ok(route.includes('accessibilityLabel="Video description"'));
  assert.ok(route.includes('It stays private until upload and safety checks complete.'));
});
