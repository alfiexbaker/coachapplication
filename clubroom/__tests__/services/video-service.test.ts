import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { videoService } from '@/services/video-service';

describe('videoService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SESSION_VIDEOS);
  });

  it('creates a video and shares it (happy path)', async () => {
    const created = await videoService.createVideo(
      {
        coachId: 'coach_video_1',
        coachName: 'Coach Video',
        athleteIds: ['athlete_video_1'],
        athleteNames: ['Athlete Video'],
        title: 'Finishing Session',
        description: 'Session recording',
      },
      'https://example.com/video.mp4',
      'https://example.com/thumb.jpg',
      120,
      1000
    );
    assert.ok(created.id);

    const shareResult = await videoService.shareVideo(created.id, ['parent_video_1']);
    assert.equal(shareResult.success, true);
    if (!shareResult.success) return;

    assert.equal(shareResult.data.visibility, 'SHARED');
    assert.ok(shareResult.data.sharedWith.includes('parent_video_1'));
  });

  it('returns empty annotations for unknown video (empty path)', async () => {
    const annotations = await videoService.getVideoAnnotations('video_missing');
    assert.deepEqual(annotations, []);
  });

  it('returns err when updating unknown video (error path)', async () => {
    const result = await videoService.updateVideo('video_missing', { title: 'Updated title' });
    assert.equal(result.success, false);
    if (result.success) return;

    assert.equal(result.error.code, 'NOT_FOUND');
  });
});
