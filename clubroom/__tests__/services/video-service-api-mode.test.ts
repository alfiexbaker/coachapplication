import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('videoService API mode', () => {
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
});
