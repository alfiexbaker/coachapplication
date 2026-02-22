import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Sharing from 'expo-sharing';
import * as VideoThumbnails from 'expo-video-thumbnails';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { err, ok, type Result, type ServiceError } from '@/types/result';
import { createLogger } from '@/utils/logger';
import type { SessionMedia } from '@/types/progress-types';

const logger = createLogger('MediaService');

async function getAllSessionMedia(): Promise<SessionMedia[]> {
  return apiClient.get<SessionMedia[]>(STORAGE_KEYS.SESSION_MEDIA, []);
}

async function safeDelete(uri: string | undefined): Promise<void> {
  if (!uri) {
    return;
  }
  await FileSystem.deleteAsync(uri, { idempotent: true });
}

async function saveSessionMedia(media: SessionMedia): Promise<Result<SessionMedia, ServiceError>> {
  try {
    const allMedia = await getAllSessionMedia();
    const existingIndex = allMedia.findIndex(
      (entry) => entry.sessionId === media.sessionId && entry.athleteId === media.athleteId,
    );

    if (existingIndex >= 0) {
      allMedia[existingIndex] = media;
    } else {
      allMedia.unshift(media);
    }

    await apiClient.set(STORAGE_KEYS.SESSION_MEDIA, allMedia);

    emitTyped(ServiceEvents.SESSION_MEDIA_CAPTURED, {
      sessionId: media.sessionId,
      athleteId: media.athleteId,
      photoCount: media.photos.length,
      hasVideo: media.video !== null,
    });

    return ok(media);
  } catch (error) {
    logger.error('Failed to save session media', error);
    return err({
      code: 'STORAGE',
      message: 'Failed to save session media',
      details: error,
    });
  }
}

async function getSessionMedia(
  sessionId: string,
  athleteId: string,
): Promise<Result<SessionMedia | null, ServiceError>> {
  try {
    const allMedia = await getAllSessionMedia();
    const found =
      allMedia.find((entry) => entry.sessionId === sessionId && entry.athleteId === athleteId) ??
      null;
    return ok(found);
  } catch (error) {
    logger.error('Failed to load session media', error);
    return err({
      code: 'STORAGE',
      message: 'Failed to load session media',
      details: error,
    });
  }
}

async function listMediaForSession(sessionId: string): Promise<Result<SessionMedia[], ServiceError>> {
  try {
    const allMedia = await getAllSessionMedia();
    return ok(allMedia.filter((entry) => entry.sessionId === sessionId));
  } catch (error) {
    logger.error('Failed to list session media', error);
    return err({
      code: 'STORAGE',
      message: 'Failed to list session media',
      details: error,
    });
  }
}

async function listMediaForAthlete(athleteId: string): Promise<Result<SessionMedia[], ServiceError>> {
  try {
    const allMedia = await getAllSessionMedia();
    return ok(allMedia.filter((entry) => entry.athleteId === athleteId));
  } catch (error) {
    logger.error('Failed to list athlete media', error);
    return err({
      code: 'STORAGE',
      message: 'Failed to list athlete media',
      details: error,
    });
  }
}

async function removeSessionMediaAsset(
  sessionId: string,
  athleteId: string,
  uri: string,
): Promise<Result<SessionMedia | null, ServiceError>> {
  try {
    const allMedia = await getAllSessionMedia();
    const targetIndex = allMedia.findIndex(
      (entry) => entry.sessionId === sessionId && entry.athleteId === athleteId,
    );
    if (targetIndex < 0) {
      return ok(null);
    }

    const existing = allMedia[targetIndex];
    const nextPhotos = existing.photos.filter((photo) => photo.uri !== uri);
    const removedPhoto = existing.photos.find((photo) => photo.uri === uri);
    const removedVideo = existing.video?.uri === uri ? existing.video : null;
    const nextVideo = removedVideo ? null : existing.video;

    if (removedPhoto?.uri) {
      await FileSystem.deleteAsync(removedPhoto.uri, { idempotent: true });
    }
    if (removedPhoto?.thumbnailUri && removedPhoto.thumbnailUri !== removedPhoto.uri) {
      await FileSystem.deleteAsync(removedPhoto.thumbnailUri, { idempotent: true });
    }
    if (removedVideo?.uri) {
      await FileSystem.deleteAsync(removedVideo.uri, { idempotent: true });
    }
    if (removedVideo?.thumbnailUri && removedVideo.thumbnailUri !== removedVideo.uri) {
      await FileSystem.deleteAsync(removedVideo.thumbnailUri, { idempotent: true });
    }

    if (nextPhotos.length === 0 && nextVideo === null) {
      allMedia.splice(targetIndex, 1);
      await apiClient.set(STORAGE_KEYS.SESSION_MEDIA, allMedia);
      return ok(null);
    }

    const nextMedia: SessionMedia = {
      ...existing,
      photos: nextPhotos,
      video: nextVideo,
      createdAt: new Date().toISOString(),
    };
    allMedia[targetIndex] = nextMedia;
    await apiClient.set(STORAGE_KEYS.SESSION_MEDIA, allMedia);

    return ok(nextMedia);
  } catch (error) {
    logger.error('Failed to remove media asset', error);
    return err({
      code: 'STORAGE',
      message: 'Failed to remove media asset',
      details: error,
    });
  }
}

async function generateThumbnail(
  uri: string,
  size: number = 200,
): Promise<Result<string, ServiceError>> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: size, height: size } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
    );
    return ok(result.uri);
  } catch (error) {
    logger.error('Failed to generate image thumbnail', { uri, error });
    return err({
      code: 'UNKNOWN',
      message: 'Failed to generate image thumbnail',
      details: error,
    });
  }
}

async function generateVideoThumbnail(videoUri: string): Promise<Result<string, ServiceError>> {
  try {
    const result = await VideoThumbnails.getThumbnailAsync(videoUri, {
      time: 1000,
      quality: 0.7,
    });
    return ok(result.uri);
  } catch (error) {
    logger.error('Failed to generate video thumbnail', { videoUri, error });
    return err({
      code: 'UNKNOWN',
      message: 'Failed to generate video thumbnail',
      details: error,
    });
  }
}

async function shareMedia(
  uri: string,
  type: 'photo' | 'video',
): Promise<Result<void, ServiceError>> {
  try {
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      return err({
        code: 'UNKNOWN',
        message: 'Sharing is unavailable on this device',
      });
    }

    await Sharing.shareAsync(uri, {
      mimeType: type === 'photo' ? 'image/jpeg' : 'video/mp4',
      dialogTitle: 'Share training moment',
    });

    return ok(undefined);
  } catch (error) {
    logger.error('Failed to share media', { uri, type, error });
    return err({
      code: 'UNKNOWN',
      message: 'Failed to share media',
      details: error,
    });
  }
}

async function cleanupOldMedia(
  olderThanMonths: number = 6,
): Promise<Result<number, ServiceError>> {
  try {
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth() - olderThanMonths, now.getDate());
    const allMedia = await getAllSessionMedia();
    let deletedCount = 0;

    const compacted: SessionMedia[] = [];
    for (const entry of allMedia) {
      const keptPhotos: SessionMedia['photos'] = [];
      for (const photo of entry.photos) {
        const capturedAt = new Date(photo.capturedAt);
        if (!Number.isNaN(capturedAt.getTime()) && capturedAt < cutoff) {
          await safeDelete(photo.uri);
          if (photo.thumbnailUri !== photo.uri) {
            await safeDelete(photo.thumbnailUri);
          }
          deletedCount += 1;
        } else {
          keptPhotos.push(photo);
        }
      }

      let keptVideo = entry.video;
      if (entry.video) {
        const capturedAt = new Date(entry.video.capturedAt);
        if (!Number.isNaN(capturedAt.getTime()) && capturedAt < cutoff) {
          await safeDelete(entry.video.uri);
          if (entry.video.thumbnailUri !== entry.video.uri) {
            await safeDelete(entry.video.thumbnailUri);
          }
          keptVideo = null;
          deletedCount += 1;
        }
      }

      if (keptPhotos.length > 0 || keptVideo) {
        compacted.push({
          ...entry,
          photos: keptPhotos,
          video: keptVideo,
        });
      }
    }

    await apiClient.set(STORAGE_KEYS.SESSION_MEDIA, compacted);
    return ok(deletedCount);
  } catch (error) {
    logger.error('Failed to cleanup old media', error);
    return err({
      code: 'UNKNOWN',
      message: 'Failed to cleanup old media',
      details: error,
    });
  }
}

export const mediaService = {
  saveSessionMedia,
  getSessionMedia,
  listMediaForSession,
  listMediaForAthlete,
  removeSessionMediaAsset,
  generateThumbnail,
  generateVideoThumbnail,
  shareMedia,
  cleanupOldMedia,
};
