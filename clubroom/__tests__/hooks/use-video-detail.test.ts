import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { assertVideoMutationSucceeded } from '@/hooks/use-video-detail';
import type { SessionVideo } from '@/constants/types';
import { err, ok, serviceError } from '@/types/result';

describe('useVideoDetail visibility actions', () => {
  it('throws failed video mutation results before the UI reports success', () => {
    const result = err(serviceError('UNAUTHORIZED', 'Video is not shareable by this actor.'));

    assert.throws(
      () => assertVideoMutationSucceeded(result, 'Failed to share video.'),
      /Video is not shareable by this actor/,
    );
  });

  it('returns successful video mutation payloads unchanged', () => {
    const video = {
      id: 'vid_detail_success',
      coachId: 'coach_detail_success',
      athleteIds: ['athlete_detail_success'],
      title: 'Technique review',
      videoUrl: 'https://example.test/video.mp4',
      thumbnailUrl: 'https://example.test/thumb.jpg',
      duration: 60,
      fileSize: 1000,
      annotations: [],
      visibility: 'SHARED',
      sharedWith: ['parent_detail_success'],
      createdAt: '2026-01-01T10:00:00.000Z',
      uploadStatus: 'READY',
      viewCount: 0,
      tags: [],
    } satisfies SessionVideo;

    assert.equal(assertVideoMutationSucceeded(ok(video), 'Failed to share video.'), video);
  });

  it('keeps the toggle handler wired through Result validation', () => {
    const source = readFileSync(path.join(process.cwd(), 'hooks/use-video-detail.ts'), 'utf8');
    const toggleHandler = source.match(
      /const handleToggleVisibility = async \(\) => \{[\s\S]*?const handleDelete = \(\) => \{/,
    )?.[0];

    assert.ok(toggleHandler, 'handleToggleVisibility block should be present');
    assert.match(toggleHandler, /assertVideoMutationSucceeded\(\s*await videoService\.shareVideo/);
    assert.match(toggleHandler, /assertVideoMutationSucceeded\(\s*await videoService\.makePrivate/);
    assert.match(toggleHandler, /uiFeedback\.showToast\([\s\S]*'error'/);
  });
});
