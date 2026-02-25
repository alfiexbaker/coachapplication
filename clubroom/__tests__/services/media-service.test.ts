/**
 * Media Service Tests
 *
 * Tests for session media save/get/list/remove operations.
 * Note: Expo native modules (ImageManipulator, VideoThumbnails, Sharing, FileSystem)
 * are mocked by test-register.js, so tests focus on storage CRUD logic.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { mediaService } from '@/services/media-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
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

describe('mediaService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SESSION_MEDIA);
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
  });

  // ---------------------------------------------------------------------------
  // Storage failure handling
  // ---------------------------------------------------------------------------
  describe('storage failure handling', () => {
    test('saveSessionMedia returns error on storage failure', async () => {
      const originalSet = apiClient.set.bind(apiClient);
      try {
        (apiClient as Record<string, unknown>).set = () => {
          throw new Error('Storage full');
        };

        const result = await mediaService.saveSessionMedia(makeMedia());
        assert.equal(result.success, false);
        assert.equal(result.error.code, 'STORAGE');
      } finally {
        (apiClient as Record<string, unknown>).set = originalSet;
      }
    });
  });
});
