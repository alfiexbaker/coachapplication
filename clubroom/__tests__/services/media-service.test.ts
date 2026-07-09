/**
 * Media Service Tests
 *
 * Tests for session media save/get/list/remove operations.
 * Note: Expo native modules (ImageManipulator, VideoThumbnails, Sharing, FileSystem)
 * are mocked by test-register.js, so tests focus on storage CRUD logic.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test, { describe, beforeEach } from 'node:test';

import { mediaService } from '@/services/media-service';
import { apiClient } from '@/services/api-client';
import { authService } from '@/services/auth-service';
import type { Result, ServiceError } from '@/types/result';
import type { SessionMedia, PhotoAsset } from '@/types/progress-types';

const rid = () => Math.random().toString(36).slice(2, 10);

function expectOk<T>(result: Result<T, ServiceError>): T {
  assert.equal(result.success, true);
  return result.data;
}

function makePhoto(uri?: string): PhotoAsset {
  return {
    uri: uri ?? `file:///photo_${rid()}.jpg`,
    thumbnailUri: `file:///thumb_${rid()}.jpg`,
    width: 640,
    height: 480,
    capturedAt: new Date().toISOString(),
  };
}

function makeMedia(overrides: Partial<SessionMedia> = {}): SessionMedia {
  return {
    sessionId: `session_${rid()}`,
    athleteId: `athlete_${rid()}`,
    coachId: `coach_${rid()}`,
    photos: [makePhoto()],
    video: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('mediaService', () => {
  beforeEach(async () => {
    mediaService.__resetMockMedia();
  });

  // ---------------------------------------------------------------------------
  // saveSessionMedia
  // ---------------------------------------------------------------------------
  describe('saveSessionMedia', () => {
    test('saves media and returns it', async () => {
      const media = makeMedia();
      const saved = expectOk(await mediaService.saveSessionMedia(media));

      assert.equal(saved.sessionId, media.sessionId);
      assert.equal(saved.athleteId, media.athleteId);
      assert.equal(saved.photos.length, 1);
    });

    test('updates existing media for same session+athlete', async () => {
      const sessionId = `session_${rid()}`;
      const athleteId = `athlete_${rid()}`;

      const first = makeMedia({
        sessionId,
        athleteId,
        photos: [makePhoto('file:///photo1.jpg')],
      });

      expectOk(await mediaService.saveSessionMedia(first));

      const second = makeMedia({
        sessionId,
        athleteId,
        photos: [makePhoto('file:///photo1.jpg'), makePhoto('file:///photo2.jpg')],
      });

      expectOk(await mediaService.saveSessionMedia(second));

      // Should have updated rather than duplicated
      const result = expectOk(await mediaService.getSessionMedia(sessionId, athleteId));
      assert.ok(result);
      assert.equal(result!.photos.length, 2);
    });
  });

  // ---------------------------------------------------------------------------
  // getSessionMedia
  // ---------------------------------------------------------------------------
  describe('getSessionMedia', () => {
    test('returns null when no media exists', async () => {
      const result = expectOk(
        await mediaService.getSessionMedia(`session_${rid()}`, `athlete_${rid()}`),
      );
      assert.equal(result, null);
    });

    test('returns saved media', async () => {
      const media = makeMedia();
      expectOk(await mediaService.saveSessionMedia(media));

      const result = expectOk(
        await mediaService.getSessionMedia(media.sessionId, media.athleteId),
      );
      assert.ok(result);
      assert.equal(result!.sessionId, media.sessionId);
      assert.equal(result!.athleteId, media.athleteId);
    });
  });

  // ---------------------------------------------------------------------------
  // listMediaForSession
  // ---------------------------------------------------------------------------
  describe('listMediaForSession', () => {
    test('returns empty array for session with no media', async () => {
      const list = expectOk(await mediaService.listMediaForSession(`session_${rid()}`));
      assert.ok(Array.isArray(list));
      assert.equal(list.length, 0);
    });

    test('returns all media entries for a session', async () => {
      const sessionId = `session_${rid()}`;

      expectOk(await mediaService.saveSessionMedia(
        makeMedia({ sessionId, athleteId: `ath1_${rid()}` }),
      ));
      expectOk(await mediaService.saveSessionMedia(
        makeMedia({ sessionId, athleteId: `ath2_${rid()}` }),
      ));

      const list = expectOk(await mediaService.listMediaForSession(sessionId));
      assert.equal(list.length, 2);
      assert.ok(list.every((m) => m.sessionId === sessionId));
    });
  });

  // ---------------------------------------------------------------------------
  // listMediaForAthlete
  // ---------------------------------------------------------------------------
  describe('listMediaForAthlete', () => {
    test('returns empty array for athlete with no media', async () => {
      const list = expectOk(await mediaService.listMediaForAthlete(`athlete_${rid()}`));
      assert.ok(Array.isArray(list));
      assert.equal(list.length, 0);
    });

    test('returns all media entries for an athlete', async () => {
      const athleteId = `athlete_${rid()}`;

      expectOk(await mediaService.saveSessionMedia(
        makeMedia({ sessionId: `s1_${rid()}`, athleteId }),
      ));
      expectOk(await mediaService.saveSessionMedia(
        makeMedia({ sessionId: `s2_${rid()}`, athleteId }),
      ));

      const list = expectOk(await mediaService.listMediaForAthlete(athleteId));
      assert.equal(list.length, 2);
      assert.ok(list.every((m) => m.athleteId === athleteId));
    });

    test('API mode uses signed-in actor scope for athlete media history', async () => {
      const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
      const originalGetCurrentUser = authService.getCurrentUser;
      const originalFetch = globalThis.fetch;
      const requestedUrls: string[] = [];
      const requestedHeaders: unknown[] = [];

      Object.defineProperty(apiClient, 'isMockMode', {
        configurable: true,
        get: () => false,
      });
      authService.getCurrentUser = async () => ({
        id: 'coach_api_media',
        email: 'coach.api.media@example.test',
        accountType: 'COACH',
        firstName: 'API',
        lastName: 'Coach',
        isVerified: true,
        onboardingComplete: true,
        createdAt: '2026-07-05T10:00:00.000Z',
        updatedAt: '2026-07-05T10:00:00.000Z',
      });
      globalThis.fetch = (async (
        input: Parameters<typeof fetch>[0],
        init?: Parameters<typeof fetch>[1],
      ) => {
        requestedUrls.push(String(input));
        requestedHeaders.push(init?.headers ?? {});
        return new Response(
          JSON.stringify({
            media: [
              makeMedia({
                sessionId: 'session_api_media',
                athleteId: 'ath_api_media',
                coachId: 'coach_api_media',
              }),
            ],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }) as typeof fetch;

      try {
        const list = expectOk(await mediaService.listMediaForAthlete('usr_api_media'));

        assert.equal(
          requestedUrls[0],
          'http://localhost:4000/v1/athletes/ath_api_media/session-media',
        );
        assert.equal((requestedHeaders[0] as Record<string, string>)['x-acting-role'], 'coach');
        assert.equal(
          (requestedHeaders[0] as Record<string, string>)['x-coach-athlete-ids'],
          'ath_api_media',
        );
        assert.equal((requestedHeaders[0] as Record<string, string>)['x-coach-verified'], '1');
        assert.equal(list[0].athleteId, 'ath_api_media');
      } finally {
        if (originalIsMockMode) {
          Object.defineProperty(apiClient, 'isMockMode', originalIsMockMode);
        }
        authService.getCurrentUser = originalGetCurrentUser;
        globalThis.fetch = originalFetch;
      }
    });

    test('API mode returns an error when athlete media history cannot load', async () => {
      const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
      const originalGetCurrentUser = authService.getCurrentUser;
      const originalFetch = globalThis.fetch;
      const requestedUrls: string[] = [];

      Object.defineProperty(apiClient, 'isMockMode', {
        configurable: true,
        get: () => false,
      });
      authService.getCurrentUser = async () => ({
        id: 'coach_api_media',
        email: 'coach.api.media@example.test',
        accountType: 'COACH',
        firstName: 'API',
        lastName: 'Coach',
        isVerified: true,
        onboardingComplete: true,
        createdAt: '2026-07-05T10:00:00.000Z',
        updatedAt: '2026-07-05T10:00:00.000Z',
      });
      globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
        requestedUrls.push(String(input));
        return jsonResponse({ message: 'athlete media down' }, 503);
      }) as typeof fetch;

      try {
        const result = await mediaService.listMediaForAthlete('usr_api_media');

        assert.equal(result.success, false);
        assert.match(result.success ? '' : result.error.message, /athlete media down/i);
        assert.equal(
          requestedUrls[0],
          'http://localhost:4000/v1/athletes/ath_api_media/session-media',
        );
      } finally {
        if (originalIsMockMode) {
          Object.defineProperty(apiClient, 'isMockMode', originalIsMockMode);
        }
        authService.getCurrentUser = originalGetCurrentUser;
        globalThis.fetch = originalFetch;
      }
    });
  });

  // ---------------------------------------------------------------------------
  // removeSessionMediaAsset
  // ---------------------------------------------------------------------------
  describe('removeSessionMediaAsset', () => {
    test('returns null when no media exists for session+athlete', async () => {
      const result = expectOk(
        await mediaService.removeSessionMediaAsset(
          `session_${rid()}`,
          `athlete_${rid()}`,
          'file:///nonexistent.jpg',
        ),
      );
      assert.equal(result, null);
    });

    test('removes a photo from media entry', async () => {
      const sessionId = `session_${rid()}`;
      const athleteId = `athlete_${rid()}`;
      const photoUri = `file:///photo_target_${rid()}.jpg`;

      expectOk(await mediaService.saveSessionMedia(
        makeMedia({
          sessionId,
          athleteId,
          photos: [makePhoto(photoUri), makePhoto()],
        }),
      ));

      const result = expectOk(
        await mediaService.removeSessionMediaAsset(sessionId, athleteId, photoUri),
      );

      assert.ok(result);
      assert.equal(result!.photos.length, 1);
      assert.ok(!result!.photos.some((p) => p.uri === photoUri));
    });

    test('removes entire entry when last asset is removed', async () => {
      const sessionId = `session_${rid()}`;
      const athleteId = `athlete_${rid()}`;
      const photoUri = `file:///only_photo_${rid()}.jpg`;

      expectOk(await mediaService.saveSessionMedia(
        makeMedia({
          sessionId,
          athleteId,
          photos: [makePhoto(photoUri)],
          video: null,
        }),
      ));

      const result = expectOk(
        await mediaService.removeSessionMediaAsset(sessionId, athleteId, photoUri),
      );

      assert.equal(result, null);

      // Verify it's gone from storage
      const check = expectOk(await mediaService.getSessionMedia(sessionId, athleteId));
      assert.equal(check, null);
    });

    test('API mode deletes the resolved backend media asset id', async () => {
      const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
      const originalFetch = globalThis.fetch;
      const requestedUrls: string[] = [];
      const requestedMethods: string[] = [];

      Object.defineProperty(apiClient, 'isMockMode', {
        configurable: true,
        get: () => false,
      });
      globalThis.fetch = (async (
        input: Parameters<typeof fetch>[0],
        init?: Parameters<typeof fetch>[1],
      ) => {
        requestedUrls.push(String(input));
        requestedMethods.push(init?.method ?? 'GET');
        if (String(input).includes('/v1/session-media?')) {
          return jsonResponse({
            media: makeMedia({
              sessionId: 'session_api_remove',
              athleteId: 'athlete_api_remove',
              photos: [
                {
                  id: 'asset_photo_api_remove',
                  mediaObjectId: 'mo_photo_api_remove',
                  thumbnailMediaObjectId: 'mo_thumb_api_remove',
                  uri: 'https://signed.example/photo.jpg',
                  thumbnailUri: 'https://signed.example/thumb.jpg',
                  width: 640,
                  height: 480,
                  capturedAt: '2026-07-06T10:00:00.000Z',
                },
              ],
              video: null,
            }),
          });
        }
        if (String(input).endsWith('/v1/session-media/assets/asset_photo_api_remove')) {
          return jsonResponse({ media: null });
        }
        return jsonResponse({ message: `Unexpected ${String(input)}` }, 500);
      }) as typeof fetch;

      try {
        const result = expectOk(
          await mediaService.removeSessionMediaAsset(
            'session_api_remove',
            'athlete_api_remove',
            'asset_photo_api_remove',
          ),
        );

        assert.equal(result, null);
        assert.deepEqual(requestedMethods, ['GET', 'DELETE']);
        assert.equal(
          requestedUrls[1],
          'http://localhost:4000/v1/session-media/assets/asset_photo_api_remove',
        );
      } finally {
        if (originalIsMockMode) {
          Object.defineProperty(apiClient, 'isMockMode', originalIsMockMode);
        }
        globalThis.fetch = originalFetch;
      }
    });

    test('API mode rejects unresolved media removal instead of returning unchanged media', async () => {
      const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
      const originalFetch = globalThis.fetch;
      let deleteCalled = false;

      Object.defineProperty(apiClient, 'isMockMode', {
        configurable: true,
        get: () => false,
      });
      globalThis.fetch = (async (
        input: Parameters<typeof fetch>[0],
        init?: Parameters<typeof fetch>[1],
      ) => {
        if (init?.method === 'DELETE') {
          deleteCalled = true;
        }
        if (String(input).includes('/v1/session-media?')) {
          return jsonResponse({
            media: makeMedia({
              sessionId: 'session_api_unresolved',
              athleteId: 'athlete_api_unresolved',
              photos: [
                {
                  id: 'asset_photo_api_unresolved',
                  mediaObjectId: 'mo_photo_api_unresolved',
                  uri: 'https://signed.example/photo.jpg',
                  thumbnailUri: 'https://signed.example/thumb.jpg',
                  width: 640,
                  height: 480,
                  capturedAt: '2026-07-06T10:00:00.000Z',
                },
              ],
              video: null,
            }),
          });
        }
        return jsonResponse({ media: null });
      }) as typeof fetch;

      try {
        const result = await mediaService.removeSessionMediaAsset(
          'session_api_unresolved',
          'athlete_api_unresolved',
          'file:///stale-local-photo.jpg',
        );

        assert.equal(result.success, false);
        if (!result.success) {
          assert.equal(result.error.code, 'VALIDATION');
        }
        assert.equal(deleteCalled, false);
      } finally {
        if (originalIsMockMode) {
          Object.defineProperty(apiClient, 'isMockMode', originalIsMockMode);
        }
        globalThis.fetch = originalFetch;
      }
    });

    test('hook keeps persisted media identities for API-mode removal', () => {
      const source = readFileSync(path.join(process.cwd(), 'hooks/use-session-media.ts'), 'utf8');

      assert.match(source, /photo\.id \?\? photo\.mediaObjectId \?\? photo\.uri/);
      assert.match(source, /setPhotos\(persisted\.photos\)/);
      assert.match(source, /const assetKey = resolveAssetRemovalKey\(photos, video, uri\)/);
      assert.match(
        source,
        /mediaService\.removeSessionMediaAsset\(sessionId, athleteId, assetKey\)/,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Mock cache isolation
  // ---------------------------------------------------------------------------
  describe('mock cache isolation', () => {
    test('returns defensive copies of saved media', async () => {
      const media = makeMedia();
      const saved = expectOk(await mediaService.saveSessionMedia(media));
      saved.photos[0].uri = 'file:///mutated.jpg';

      const result = expectOk(await mediaService.getSessionMedia(media.sessionId, media.athleteId));
      assert.ok(result);
      assert.notEqual(result!.photos[0].uri, 'file:///mutated.jpg');
    });
  });
});
