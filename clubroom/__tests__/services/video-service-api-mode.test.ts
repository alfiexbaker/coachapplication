import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { Platform } from 'react-native';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function apiVideo() {
  return {
    id: 'vid_api',
    coachUserId: 'coach_api',
    athleteId: 'ath_api',
    title: 'API Video',
    visibility: 'PRIVATE',
    playbackUrl: 'https://media.example.test/video.mp4',
    durationMs: 120000,
    fileSizeBytes: 1000,
    createdAt: '2026-07-01T10:00:00.000Z',
    annotations: [
      {
        id: 'ann_api',
        timestamp: 10,
        label: 'Original',
        type: 'GENERAL',
      },
    ],
  };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('videoService API mode', () => {
  it('initializes video fixture cache empty outside mock mode', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'services/video-service.ts'), 'utf8');

    assert.ok(
      source.includes('let videosCache: SessionVideo[] = USE_MOCK ? cloneVideos(MOCK_VIDEOS) : []'),
    );
    assert.ok(source.includes('videosCache = USE_MOCK ? cloneVideos(MOCK_VIDEOS) : []'));
  });

  it('describes API-mode destructive video actions as archive or remove', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'services/video-service.ts'), 'utf8');

    assert.ok(source.includes('Archive video from active views while preserving audit history.'));
    assert.ok(source.includes('Archive annotation'));
    assert.ok(source.includes('Failed to archive video'));
    assert.ok(source.includes('Failed to archive video annotation'));
    assert.equal(source.includes('Failed to delete video'), false);
    assert.equal(source.includes('Failed to delete video annotation'), false);
  });

  it('returns null only for real video not-found responses', async () => {
    const { videoService } = await import('@/services/video-service');
    const fetchCalls: string[] = [];
    globalThis.fetch = (async (input) => {
      fetchCalls.push(String(input));
      return jsonResponse({ message: 'Video not found' }, 404);
    }) as typeof fetch;

    const video = await videoService.getVideo('vid_missing_api');

    assert.equal(video, null);
    assert.deepEqual(fetchCalls, ['http://localhost:4000/v1/videos/vid_missing_api']);
  });

  it('rejects non-not-found video detail API failures instead of returning an empty state', async () => {
    const { videoService } = await import('@/services/video-service');
    globalThis.fetch = (async () =>
      jsonResponse({ message: 'Video database unavailable' }, 500)) as typeof fetch;

    await assert.rejects(
      () => videoService.getVideo('vid_backend_failure'),
      /Video database unavailable/,
    );
  });

  it('rejects a failed web video source before sending a signed upload', async () => {
    const { videoService } = await import('@/services/video-service');
    const originalPlatform = Platform.OS;
    const videoUri = 'https://local.example/session-video.mp4';
    const signedUploadUrl = 'https://signed.example/video-upload';
    const calls: string[] = [];
    Platform.OS = 'web';
    globalThis.fetch = (async (input) => {
      const url = String(input);
      calls.push(url);

      if (url === videoUri && calls.filter((value) => value === videoUri).length === 1) {
        return new Response('video');
      }
      if (url.endsWith('/v1/uploads/init')) {
        return jsonResponse({
          uploadSessionId: 'upload_session_video',
          mediaObjectId: 'media_object_video',
          uploadUrl: signedUploadUrl,
        });
      }
      if (url === videoUri) {
        return new Response('source unavailable', { status: 503 });
      }
      return jsonResponse({ message: `Unexpected ${url}` }, 500);
    }) as typeof fetch;

    try {
      await assert.rejects(
        () =>
          videoService.createVideo(
            {
              coachId: 'coach_api',
              coachName: 'API Coach',
              athleteIds: ['ath_api'],
              athleteNames: ['API Athlete'],
              title: 'API Video',
            },
            videoUri,
            'https://local.example/session-thumb.jpg',
            60,
            5,
          ),
        /Unable to read video file \(503\)/,
      );
      assert.equal(calls.includes(signedUploadUrl), false);
    } finally {
      Platform.OS = originalPlatform;
    }
  });

  it('rejects annotation update API failures instead of returning null', async () => {
    const { videoService } = await import('@/services/video-service');
    const calls: string[] = [];
    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      calls.push(`${init?.method ?? 'GET'} ${url.pathname}`);

      if (url.pathname === '/v1/videos/vid_api' && !init?.method) {
        return jsonResponse({ video: apiVideo() });
      }

      if (url.pathname === '/v1/videos/vid_api/annotations/ann_api' && init?.method === 'PATCH') {
        return jsonResponse({ message: 'Annotation database unavailable' }, 500);
      }

      return jsonResponse({ message: `Unhandled ${url.pathname}` }, 500);
    }) as typeof fetch;

    await assert.rejects(
      () => videoService.updateAnnotation('vid_api', 'ann_api', { label: 'Updated' }),
      /Annotation database unavailable/,
    );
    assert.deepEqual(calls, [
      'GET /v1/videos/vid_api',
      'PATCH /v1/videos/vid_api/annotations/ann_api',
    ]);
  });

  it('preserves backend annotation actor metadata in API mode', async () => {
    const { videoService } = await import('@/services/video-service');
    const calls: string[] = [];
    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      calls.push(`${init?.method ?? 'GET'} ${url.pathname}`);

      if (url.pathname === '/v1/videos/vid_api/annotations' && init?.method === 'POST') {
        return jsonResponse({
          annotation: {
            id: 'ann_api_new',
            timestamp: 25,
            label: 'Footwork',
            type: 'TECHNIQUE',
            createdBy: 'coach_backend',
            createdAt: '2026-07-24T08:00:00.000Z',
          },
        });
      }

      return jsonResponse({ message: `Unhandled ${url.pathname}` }, 500);
    }) as typeof fetch;

    const annotation = await videoService.createAnnotation(
      'vid_api',
      { timestamp: 25, label: 'Footwork', type: 'TECHNIQUE' },
      'coach_client_forged',
      'Client Coach',
    );

    assert.equal(annotation.createdBy, 'coach_backend');
    assert.equal(annotation.createdAt, '2026-07-24T08:00:00.000Z');
    assert.deepEqual(calls, ['POST /v1/videos/vid_api/annotations']);
  });

  it('returns false only for annotation delete not-found responses', async () => {
    const { videoService } = await import('@/services/video-service');
    const calls: string[] = [];
    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      calls.push(`${init?.method ?? 'GET'} ${url.pathname}`);

      if (url.pathname === '/v1/videos/vid_api/annotations/missing_ann') {
        return jsonResponse({ message: 'Annotation not found' }, 404);
      }

      if (url.pathname === '/v1/videos/vid_api/annotations/api_down') {
        return jsonResponse({ message: 'Annotation archive unavailable' }, 500);
      }

      return jsonResponse({ message: `Unhandled ${url.pathname}` }, 500);
    }) as typeof fetch;

    assert.equal(await videoService.deleteAnnotation('vid_api', 'missing_ann'), false);
    await assert.rejects(
      () => videoService.deleteAnnotation('vid_api', 'api_down'),
      /Annotation archive unavailable/,
    );
    assert.deepEqual(calls, [
      'DELETE /v1/videos/vid_api/annotations/missing_ann',
      'DELETE /v1/videos/vid_api/annotations/api_down',
    ]);
  });

  it('describes direct annotation removal failures as archive failures in API mode', async () => {
    const { videoService } = await import('@/services/video-service');
    const calls: string[] = [];
    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      calls.push(`${init?.method ?? 'GET'} ${url.pathname}`);
      return jsonResponse({ message: 'Annotation archive unavailable' }, 500);
    }) as typeof fetch;

    await assert.rejects(
      () => videoService.removeAnnotation('vid_api', 'ann_api'),
      /Annotation archive unavailable/,
    );
    assert.deepEqual(calls, ['DELETE /v1/videos/vid_api/annotations/ann_api']);
  });
});
