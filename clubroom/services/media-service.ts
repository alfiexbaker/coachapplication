import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Sharing from 'expo-sharing';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Platform } from 'react-native';

import { apiClient, apiFetch } from '@/services/api-client';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
  toApiAthleteId,
} from '@/services/api-auth-context';
import { consentService } from '@/services/consent-service';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { waitForUploadScanCompletion } from '@/services/upload-authority-service';
import { err, ok, unsupportedError, type Result, type ServiceError } from '@/types/result';
import { createLogger } from '@/utils/logger';
import type { PhotoAsset, SessionMedia, VideoAsset } from '@/types/progress-types';

const logger = createLogger('MediaService');

let sessionMediaCache: SessionMedia[] = [];

type ApiUploadInitResponse = {
  uploadSessionId: string;
  mediaObjectId: string;
  uploadUrl: string;
  uploadHeaders?: Record<string, string>;
};

type ApiSessionMediaResponse = {
  media: SessionMedia | null;
};

type ApiSessionMediaListResponse = {
  media: SessionMedia[];
};

type ApiSessionMediaAssetInput = {
  id?: string;
  kind: 'photo' | 'video';
  mediaObjectId: string;
  thumbnailMediaObjectId?: string;
  width?: number;
  height?: number;
  duration?: number;
  capturedAt: string;
};

function sessionMediaApiUnsupported(): ServiceError {
  return unsupportedError(
    'Session media retention cleanup requires a backend retention job in API mode.',
  );
}

function requireMockSessionMedia(): Result<void, ServiceError> {
  if (!apiClient.isMockMode) {
    return err(sessionMediaApiUnsupported());
  }
  return ok(undefined);
}

function clonePhotoAsset(photo: PhotoAsset): PhotoAsset {
  return { ...photo };
}

function cloneVideoAsset(video: VideoAsset | null): VideoAsset | null {
  return video ? { ...video } : null;
}

function cloneSessionMedia(media: SessionMedia): SessionMedia {
  return {
    ...media,
    photos: media.photos.map(clonePhotoAsset),
    video: cloneVideoAsset(media.video),
  };
}

function getAllSessionMedia(): SessionMedia[] {
  return sessionMediaCache.map(cloneSessionMedia);
}

function replaceAllSessionMedia(media: SessionMedia[]): void {
  sessionMediaCache = media.map(cloneSessionMedia);
}

function requireApiData<T>(result: Result<T, ServiceError>, fallbackMessage: string): T {
  if (!result.success) {
    throw new Error(result.error.message || fallbackMessage);
  }
  return result.data;
}

async function resolveMediaApiAccess(
  athleteId: string,
): Promise<{ apiAthleteId: string; headers: Record<string, string> }> {
  const currentUserResult = await resolveSignedInApiUser('Sign in to view session media.');
  if (!currentUserResult.success) {
    throw new Error(currentUserResult.error.message);
  }

  const currentUser = currentUserResult.data;
  const apiAthleteId = toApiAthleteId(athleteId);
  const actingRole = deriveApiActingRole(currentUser);
  return {
    apiAthleteId,
    headers: buildApiAuthHeaders({
      actingRole,
      coachAthleteIds: actingRole === 'coach' ? [apiAthleteId] : undefined,
      guardianAthleteIds: actingRole === 'parent' ? [apiAthleteId] : undefined,
      coachVerified: actingRole === 'coach' && currentUser.isVerified,
    }),
  };
}

function inferContentType(uri: string, kind: 'photo' | 'video'): string {
  const normalized = uri.toLowerCase().split('?')[0] ?? uri.toLowerCase();
  if (kind === 'photo') {
    if (normalized.endsWith('.png')) return 'image/png';
    if (normalized.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }
  if (normalized.endsWith('.mov')) return 'video/quicktime';
  if (normalized.endsWith('.m4v')) return 'video/x-m4v';
  return 'video/mp4';
}

function uploadFileName(uri: string, kind: 'photo' | 'video'): string {
  const candidate = uri.split('?')[0]?.split('/').pop()?.trim();
  if (candidate) {
    return candidate;
  }
  return kind === 'photo' ? 'session-photo.jpg' : 'session-video.mp4';
}

async function fileSizeBytes(uri: string): Promise<number> {
  const size =
    Platform.OS === 'web'
      ? await (async () => {
          const response = await fetch(uri);
          if (!response.ok) {
            throw new Error(`Unable to read upload file (${response.status})`);
          }
          return (await response.blob()).size;
        })()
      : await (async () => {
          const info = await FileSystem.getInfoAsync(uri);
          return info.exists ? info.size : undefined;
        })();
  if (!Number.isSafeInteger(size) || (size ?? 0) <= 0) {
    throw new Error('Upload file size could not be determined');
  }
  return size as number;
}

async function uploadFileToSignedUrl(
  fileUri: string,
  uploadUrl: string,
  uploadHeaders: Record<string, string> | undefined,
): Promise<void> {
  if (Platform.OS === 'web') {
    const source = await fetch(fileUri);
    if (!source.ok) {
      throw new Error(`Unable to read upload file (${source.status})`);
    }
    const blob = await source.blob();
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: uploadHeaders,
      body: blob,
    });
    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }
    return;
  }

  const response = await FileSystem.uploadAsync(uploadUrl, fileUri, {
    httpMethod: 'PUT',
    headers: uploadHeaders,
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
  });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Upload failed with status ${response.status}`);
  }
}

async function uploadSessionMediaObject(params: {
  uri: string;
  kind: 'photo' | 'video';
  sessionId: string;
  athleteId: string;
  coachId: string;
  role: 'media' | 'thumbnail';
}): Promise<string> {
  const contentKind = params.kind === 'photo' || params.role === 'thumbnail' ? 'IMAGE' : 'VIDEO';
  const uploadInit = requireApiData(
    await apiFetch<ApiUploadInitResponse>('/v1/uploads/init', {
      method: 'POST',
      body: JSON.stringify({
        kind: contentKind,
        contentType: inferContentType(params.uri, contentKind === 'IMAGE' ? 'photo' : 'video'),
        fileName: uploadFileName(params.uri, contentKind === 'IMAGE' ? 'photo' : 'video'),
        sizeBytes: await fileSizeBytes(params.uri),
        metadata: {
          source: 'session-media',
          role: params.role,
          sessionId: params.sessionId,
          athleteId: params.athleteId,
          coachId: params.coachId,
        },
      }),
    }),
    'Failed to initialize media upload',
  );

  await uploadFileToSignedUrl(params.uri, uploadInit.uploadUrl, uploadInit.uploadHeaders);

  requireApiData(
    await waitForUploadScanCompletion({
      uploadSessionId: uploadInit.uploadSessionId,
      mediaObjectId: uploadInit.mediaObjectId,
    }),
    'Failed to finalize media upload',
  );

  return uploadInit.mediaObjectId;
}

async function photoToApiAsset(
  photo: PhotoAsset,
  media: SessionMedia,
): Promise<ApiSessionMediaAssetInput> {
  const mediaObjectId =
    photo.mediaObjectId ??
    (await uploadSessionMediaObject({
      uri: photo.uri,
      kind: 'photo',
      role: 'media',
      sessionId: media.sessionId,
      athleteId: media.athleteId,
      coachId: media.coachId,
    }));
  const shouldUploadThumbnail =
    photo.thumbnailUri && photo.thumbnailUri !== photo.uri && !photo.thumbnailMediaObjectId;
  const thumbnailMediaObjectId = shouldUploadThumbnail
    ? await uploadSessionMediaObject({
        uri: photo.thumbnailUri,
        kind: 'photo',
        role: 'thumbnail',
        sessionId: media.sessionId,
        athleteId: media.athleteId,
        coachId: media.coachId,
      })
    : photo.thumbnailMediaObjectId;
  return {
    id: photo.id,
    kind: 'photo',
    mediaObjectId,
    thumbnailMediaObjectId,
    width: photo.width,
    height: photo.height,
    capturedAt: photo.capturedAt,
  };
}

async function videoToApiAsset(
  video: VideoAsset,
  media: SessionMedia,
): Promise<ApiSessionMediaAssetInput> {
  const mediaObjectId =
    video.mediaObjectId ??
    (await uploadSessionMediaObject({
      uri: video.uri,
      kind: 'video',
      role: 'media',
      sessionId: media.sessionId,
      athleteId: media.athleteId,
      coachId: media.coachId,
    }));
  const shouldUploadThumbnail =
    video.thumbnailUri && video.thumbnailUri !== video.uri && !video.thumbnailMediaObjectId;
  const thumbnailMediaObjectId = shouldUploadThumbnail
    ? await uploadSessionMediaObject({
        uri: video.thumbnailUri,
        kind: 'photo',
        role: 'thumbnail',
        sessionId: media.sessionId,
        athleteId: media.athleteId,
        coachId: media.coachId,
      })
    : video.thumbnailMediaObjectId;
  return {
    id: video.id,
    kind: 'video',
    mediaObjectId,
    thumbnailMediaObjectId,
    duration: video.duration,
    capturedAt: video.capturedAt,
  };
}

async function safeDelete(uri: string | undefined): Promise<void> {
  if (!uri) {
    return;
  }
  await FileSystem.deleteAsync(uri, { idempotent: true });
}

async function saveSessionMedia(
  media: SessionMedia,
  coachId?: string,
): Promise<Result<SessionMedia, ServiceError>> {
  try {
    // SAFEGUARDING: Check photo/video consent when coachId provided
    if (coachId && media.athleteId) {
      const photoConsentResult = await consentService.checkConsent(
        media.athleteId,
        'PHOTO',
        coachId,
      );
      const videoConsentResult = await consentService.checkConsent(
        media.athleteId,
        'VIDEO',
        coachId,
      );

      const hasPhotoConsent = photoConsentResult.success && photoConsentResult.data;
      const hasVideoConsent = videoConsentResult.success && videoConsentResult.data;

      if (!hasPhotoConsent && !hasVideoConsent) {
        logger.warn('Media upload blocked - no photo/video consent', {
          coachId,
          athleteId: media.athleteId,
          sessionId: media.sessionId,
        });
        return err({
          code: 'UNAUTHORIZED',
          message: "Photo/video consent required from athlete's parent before uploading media",
        });
      }
    }

    if (!apiClient.isMockMode) {
      const photos = await Promise.all(media.photos.map((photo) => photoToApiAsset(photo, media)));
      const video = media.video ? await videoToApiAsset(media.video, media) : null;
      const result = await apiFetch<ApiSessionMediaResponse>('/v1/session-media', {
        method: 'PUT',
        body: JSON.stringify({
          sessionId: media.sessionId,
          athleteId: media.athleteId,
          coachId: media.coachId,
          photos,
          video,
        }),
      });
      if (!result.success) {
        return err(result.error);
      }
      if (!result.data.media) {
        return err({
          code: 'UNKNOWN',
          message: 'Session media save did not return media',
        });
      }
      emitTyped(ServiceEvents.SESSION_MEDIA_CAPTURED, {
        sessionId: result.data.media.sessionId,
        athleteId: result.data.media.athleteId,
        photoCount: result.data.media.photos.length,
        hasVideo: result.data.media.video !== null,
      });
      return ok(cloneSessionMedia(result.data.media));
    }

    const mockGuard = requireMockSessionMedia();
    if (!mockGuard.success) {
      return err(mockGuard.error);
    }

    const allMedia = getAllSessionMedia();
    const existingIndex = allMedia.findIndex(
      (entry) => entry.sessionId === media.sessionId && entry.athleteId === media.athleteId,
    );

    if (existingIndex >= 0) {
      allMedia[existingIndex] = cloneSessionMedia(media);
    } else {
      allMedia.unshift(cloneSessionMedia(media));
    }

    replaceAllSessionMedia(allMedia);

    emitTyped(ServiceEvents.SESSION_MEDIA_CAPTURED, {
      sessionId: media.sessionId,
      athleteId: media.athleteId,
      photoCount: media.photos.length,
      hasVideo: media.video !== null,
    });

    return ok(cloneSessionMedia(media));
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
    if (!apiClient.isMockMode) {
      const query = new URLSearchParams({ sessionId, athleteId });
      const result = await apiFetch<ApiSessionMediaResponse>(
        `/v1/session-media?${query.toString()}`,
      );
      if (!result.success) {
        return err(result.error);
      }
      return ok(result.data.media ? cloneSessionMedia(result.data.media) : null);
    }

    const mockGuard = requireMockSessionMedia();
    if (!mockGuard.success) {
      return err(mockGuard.error);
    }

    const allMedia = getAllSessionMedia();
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

async function listMediaForSession(
  sessionId: string,
): Promise<Result<SessionMedia[], ServiceError>> {
  try {
    if (!apiClient.isMockMode) {
      const result = await apiFetch<ApiSessionMediaListResponse>(
        `/v1/sessions/${encodeURIComponent(sessionId)}/media`,
      );
      if (!result.success) {
        return err(result.error);
      }
      return ok(result.data.media.map(cloneSessionMedia));
    }

    const mockGuard = requireMockSessionMedia();
    if (!mockGuard.success) {
      return err(mockGuard.error);
    }

    const allMedia = getAllSessionMedia();
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

async function listMediaForAthlete(
  athleteId: string,
): Promise<Result<SessionMedia[], ServiceError>> {
  try {
    if (!apiClient.isMockMode) {
      const access = await resolveMediaApiAccess(athleteId);
      const result = await apiFetch<ApiSessionMediaListResponse>(
        `/v1/athletes/${encodeURIComponent(access.apiAthleteId)}/session-media`,
        { headers: access.headers },
      );
      if (!result.success) {
        return err(result.error);
      }
      return ok(result.data.media.map(cloneSessionMedia));
    }

    const mockGuard = requireMockSessionMedia();
    if (!mockGuard.success) {
      return err(mockGuard.error);
    }

    const allMedia = getAllSessionMedia();
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
  assetKey: string,
): Promise<Result<SessionMedia | null, ServiceError>> {
  try {
    if (!apiClient.isMockMode) {
      const normalizedAssetKey = assetKey.trim();
      if (!normalizedAssetKey) {
        return err({
          code: 'VALIDATION',
          message: 'Session media asset id is required for removal',
        });
      }
      const current = await getSessionMedia(sessionId, athleteId);
      if (!current.success) {
        return err(current.error);
      }
      const asset =
        current.data?.photos.find(
          (photo) =>
            photo.id === normalizedAssetKey ||
            photo.mediaObjectId === normalizedAssetKey ||
            photo.thumbnailMediaObjectId === normalizedAssetKey ||
            photo.uri === normalizedAssetKey ||
            photo.thumbnailUri === normalizedAssetKey,
        ) ??
        (current.data?.video &&
        (current.data.video.id === normalizedAssetKey ||
          current.data.video.mediaObjectId === normalizedAssetKey ||
          current.data.video.thumbnailMediaObjectId === normalizedAssetKey ||
          current.data.video.uri === normalizedAssetKey ||
          current.data.video.thumbnailUri === normalizedAssetKey)
          ? current.data.video
          : null);
      if (!asset?.id) {
        return err({
          code: 'VALIDATION',
          message: 'Session media asset was not found for removal',
        });
      }
      const result = await apiFetch<ApiSessionMediaResponse>(
        `/v1/session-media/assets/${encodeURIComponent(asset.id)}`,
        {
          method: 'DELETE',
        },
      );
      if (!result.success) {
        return err(result.error);
      }
      return ok(result.data.media ? cloneSessionMedia(result.data.media) : null);
    }

    const mockGuard = requireMockSessionMedia();
    if (!mockGuard.success) {
      return err(mockGuard.error);
    }

    const allMedia = getAllSessionMedia();
    const targetIndex = allMedia.findIndex(
      (entry) => entry.sessionId === sessionId && entry.athleteId === athleteId,
    );
    if (targetIndex < 0) {
      return ok(null);
    }

    const existing = allMedia[targetIndex];
    const nextPhotos = existing.photos.filter((photo) => photo.uri !== assetKey);
    const removedPhoto = existing.photos.find((photo) => photo.uri === assetKey);
    const removedVideo = existing.video?.uri === assetKey ? existing.video : null;
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
      replaceAllSessionMedia(allMedia);
      return ok(null);
    }

    const nextMedia: SessionMedia = {
      ...existing,
      photos: nextPhotos,
      video: nextVideo,
      createdAt: new Date().toISOString(),
    };
    allMedia[targetIndex] = nextMedia;
    replaceAllSessionMedia(allMedia);

    return ok(cloneSessionMedia(nextMedia));
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

async function cleanupOldMedia(olderThanMonths: number = 6): Promise<Result<number, ServiceError>> {
  try {
    const mockGuard = requireMockSessionMedia();
    if (!mockGuard.success) {
      return err(mockGuard.error);
    }

    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth() - olderThanMonths, now.getDate());
    const allMedia = getAllSessionMedia();
    let deletedCount = 0;

    const compactedEntries = await Promise.all(
      allMedia.map(async (entry) => {
        const keptPhotos: SessionMedia['photos'] = [];
        let entryDeletedCount = 0;
        await Promise.all(
          entry.photos.map(async (photo) => {
            const capturedAt = new Date(photo.capturedAt);
            if (!Number.isNaN(capturedAt.getTime()) && capturedAt < cutoff) {
              await safeDelete(photo.uri);
              if (photo.thumbnailUri !== photo.uri) {
                await safeDelete(photo.thumbnailUri);
              }
              entryDeletedCount += 1;
            } else {
              keptPhotos.push(photo);
            }
          }),
        );

        let keptVideo = entry.video;
        if (entry.video) {
          const capturedAt = new Date(entry.video.capturedAt);
          if (!Number.isNaN(capturedAt.getTime()) && capturedAt < cutoff) {
            await safeDelete(entry.video.uri);
            if (entry.video.thumbnailUri !== entry.video.uri) {
              await safeDelete(entry.video.thumbnailUri);
            }
            keptVideo = null;
            entryDeletedCount += 1;
          }
        }

        if (keptPhotos.length > 0 || keptVideo) {
          return {
            deletedCount: entryDeletedCount,
            entry: {
              ...entry,
              photos: keptPhotos,
              video: keptVideo,
            },
          };
        }
        return { deletedCount: entryDeletedCount, entry: null };
      }),
    );
    const compacted = compactedEntries
      .map((entryResult) => entryResult.entry)
      .filter((entry): entry is SessionMedia => entry !== null);
    deletedCount = compactedEntries.reduce((sum, entryResult) => sum + entryResult.deletedCount, 0);

    replaceAllSessionMedia(compacted);
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
  __resetMockMedia(): void {
    sessionMediaCache = [];
  },
  __seedMockMedia(media: SessionMedia[]): void {
    replaceAllSessionMedia(media);
  },
};
