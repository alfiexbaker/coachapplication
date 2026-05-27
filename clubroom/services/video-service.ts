/**
 * Video Service
 *
 * Handles session video upload, storage, playback, and annotations.
 * Enables coaches to share training footage with parents/athletes and add
 * timestamped annotations for feedback.
 *
 * Features:
 * - Video upload, storage, and playback management
 * - Video annotation CRUD operations
 * - Annotation filtering, search, and export
 * - Video sharing and visibility controls
 *
 * API Integration Notes:
 * - POST /v1/uploads/init - Initialize secure media upload
 * - POST /v1/uploads/:uploadSessionId/complete - Finalize upload and backend scan
 * - POST /v1/videos - Create authoritative video record after upload
 * - GET /v1/videos?coachId=X - Coach-owned videos
 * - GET /v1/videos?athleteId=X - Explicitly shared athlete videos
 * - GET /v1/videos/:id - Signed playback detail
 * - POST /v1/videos/:id/annotations - Add annotation
 * - PATCH /v1/videos/:id/annotations/:annotationId - Update annotation
 * - DELETE /v1/videos/:id/annotations/:annotationId - Delete annotation
 * - PATCH /v1/videos/:id/share - Update sharing
 */

import { apiClient } from './api-client';
import { apiFetch } from './api-client';
import { api } from '@/constants/config';
import type {
  SessionVideo,
  VideoAnnotation,
  VideoAnnotationType,
  AnnotatedVideo,
  AnnotationExport,
} from '@/constants/types';
import { type Result, type ServiceError, ok, err, notFound, storageError } from '@/types/result';
import { userService } from './user-service';
import { createLogger } from '@/utils/logger';
import { emitTyped, ServiceEvents } from './event-bus';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

import { STORAGE_KEYS } from '@/constants/storage-keys';

const logger = createLogger('VideoService');

const USE_MOCK = api.useMock;

async function resolveUserName(userId: string, fallback: string): Promise<string> {
  const userResult = await userService.getUserById(userId);
  if (!userResult.success) {
    return fallback;
  }

  return userResult.data.name?.trim() || fallback;
}

async function resolveUserNames(userIds: string[], fallbackPrefix: string): Promise<string[]> {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueUserIds.length === 0) {
    return [];
  }

  const usersResult = await userService.getUsersByIds(uniqueUserIds);
  if (!usersResult.success) {
    return userIds.map((_, index) => `${fallbackPrefix} ${index + 1}`);
  }

  const usersById = new Map(usersResult.data.map((user) => [user.id, user.name?.trim() || '']));
  return userIds.map((userId, index) => usersById.get(userId) || `${fallbackPrefix} ${index + 1}`);
}

/**
 * Annotation type configuration with colors and labels
 */
export const ANNOTATION_TYPE_CONFIG: Record<
  VideoAnnotationType,
  { label: string; color: string; icon: string; description: string }
> = {
  HIGHLIGHT: {
    label: 'Highlight',
    color: '#4CAF50',
    icon: 'star',
    description: 'Mark excellent technique or achievements',
  },
  IMPROVEMENT: {
    label: 'Improvement',
    color: '#FF9800',
    icon: 'trending-up',
    description: 'Note areas that need work',
  },
  TECHNIQUE: {
    label: 'Technique',
    color: '#2196F3',
    icon: 'football',
    description: 'Technical instruction or analysis',
  },
  GENERAL: {
    label: 'General',
    color: '#9E9E9E',
    icon: 'chatbubble',
    description: 'General comments or observations',
  },
};

// Mock videos for development
const MOCK_VIDEOS: SessionVideo[] = [
  {
    id: 'vid_1',
    sessionId: 'session_1',
    bookingId: 'booking_1',
    coachId: 'coach1',
    athleteIds: ['athlete_1'],
    title: 'Finishing Drills - Weak Foot Practice',
    description:
      'Great progress on weak foot finishing. Focus on body position at point of contact.',
    videoUrl: 'https://example.com/videos/session_1.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/vid1/400/225',
    duration: 180, // 3 minutes
    fileSize: 45000000, // 45MB
    annotations: [
      {
        id: 'ann_1',
        timestamp: 15,
        label: 'Good technique',
        note: 'Notice the planted foot position',
        type: 'TECHNIQUE',
      },
      {
        id: 'ann_2',
        timestamp: 45,
        label: 'Area to improve',
        note: 'Follow through needs work',
        type: 'IMPROVEMENT',
      },
      { id: 'ann_3', timestamp: 120, label: 'Great finish!', type: 'HIGHLIGHT' },
    ],
    visibility: 'SHARED',
    sharedWith: ['parent_1'],
    createdAt: '2026-01-08T17:30:00Z',
    uploadStatus: 'READY',
    viewCount: 5,
    tags: ['finishing', 'weak-foot', 'technique'],
  },
  {
    id: 'vid_2',
    bookingId: 'booking_2',
    coachId: 'coach1',
    athleteIds: ['athlete_1'],
    title: 'Dribbling Session Highlights',
    description: 'Key moments from dribbling practice',
    videoUrl: 'https://example.com/videos/session_2.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/vid2/400/225',
    duration: 240,
    fileSize: 60000000,
    annotations: [
      { id: 'ann_4', timestamp: 30, label: 'Close control', type: 'HIGHLIGHT' },
      { id: 'ann_5', timestamp: 90, label: 'Speed increase', type: 'IMPROVEMENT' },
    ],
    visibility: 'SHARED',
    sharedWith: ['parent_1'],
    createdAt: '2026-01-05T16:00:00Z',
    uploadStatus: 'READY',
    viewCount: 3,
    tags: ['dribbling', 'close-control'],
  },
  {
    id: 'vid_3',
    coachId: 'coach1',
    athleteIds: ['athlete_2', 'athlete_3'],
    title: 'Group Session - Passing Combinations',
    description: 'Team passing drill progression',
    videoUrl: 'https://example.com/videos/session_3.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/vid3/400/225',
    duration: 300,
    fileSize: 75000000,
    annotations: [],
    visibility: 'PRIVATE',
    sharedWith: [],
    createdAt: '2026-01-03T11:00:00Z',
    uploadStatus: 'READY',
    viewCount: 1,
    tags: ['passing', 'group', 'combinations'],
  },
];

let videosCache: SessionVideo[] = [...MOCK_VIDEOS];

async function loadFromStorage(): Promise<SessionVideo[]> {
  try {
    const stored = await apiClient.get<SessionVideo[] | null>(STORAGE_KEYS.SESSION_VIDEOS, null);
    if (stored) return stored;
  } catch (error) {
    logger.error('Failed to load from storage', error);
  }
  return [...MOCK_VIDEOS];
}

async function saveToStorage(videos: SessionVideo[]): Promise<Result<void, ServiceError>> {
  try {
    await apiClient.set(STORAGE_KEYS.SESSION_VIDEOS, videos);
    return ok(undefined);
  } catch (error) {
    logger.error('Failed to save to storage', error);
    return err(storageError(`Failed to save session videos: ${String(error)}`));
  }
}

export interface CreateVideoInput {
  coachId: string;
  coachName: string;
  athleteIds: string[];
  athleteNames: string[];
  title: string;
  description?: string;
  sessionId?: string;
  bookingId?: string;
  tags?: string[];
}

export type VideoCreateStage =
  | 'initializing-upload'
  | 'uploading-file'
  | 'finalizing-upload'
  | 'creating-record'
  | 'ready';

export interface CreateVideoOptions {
  onStageChange?: (stage: VideoCreateStage) => void;
}

export interface CreateAnnotationInput {
  timestamp: number;
  label: string;
  note?: string;
  type: VideoAnnotationType;
}

export interface UpdateAnnotationInput {
  timestamp?: number;
  label?: string;
  note?: string;
  type?: VideoAnnotationType;
}

interface ApiVideoAnnotation {
  id: string;
  timestamp?: number;
  label?: string;
  note?: string;
  type?: VideoAnnotationType;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiVideoRecord {
  id: string;
  coachUserId?: string;
  athleteId?: string;
  title?: string;
  description?: string;
  visibility?: 'PRIVATE' | 'SHARED';
  sharedWithUserIds?: string[];
  sourceContextType?: string;
  sourceContextId?: string;
  mediaObjectId?: string;
  uploadStatus?: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';
  playbackUrl?: string;
  playbackExpiresAt?: string;
  thumbnailUrl?: string;
  durationMs?: number;
  fileSizeBytes?: number;
  contentType?: string;
  createdAt?: string;
  updatedAt?: string;
  annotations?: ApiVideoAnnotation[];
}

interface ApiVideoListResponse {
  videos: ApiVideoRecord[];
}

interface ApiVideoDetailResponse {
  video: ApiVideoRecord;
}

interface ApiUploadInitResponse {
  uploadSessionId: string;
  mediaObjectId: string;
  uploadUrl: string;
  uploadHeaders?: Record<string, string>;
}

interface ApiUploadCompleteResponse {
  uploadSessionId: string;
  mediaObjectId: string;
  mediaStatus: 'AVAILABLE';
  scanVerdict: 'CLEAN';
}

interface ApiAnnotationResponse {
  annotation: ApiVideoAnnotation;
}

function requireApiResult<T>(result: Result<T, ServiceError>, fallbackMessage: string): T {
  if (!result.success) {
    throw new Error(result.error.message || fallbackMessage);
  }
  return result.data;
}

function mapApiAnnotation(annotation: ApiVideoAnnotation): VideoAnnotation {
  return {
    id: annotation.id,
    timestamp: annotation.timestamp ?? 0,
    label: annotation.label?.trim() || 'Annotation',
    note: annotation.note?.trim() || undefined,
    type: annotation.type ?? 'GENERAL',
    createdBy: annotation.createdBy,
    createdAt: annotation.createdAt,
    updatedAt: annotation.updatedAt,
  };
}

function mapApiVideo(video: ApiVideoRecord): SessionVideo {
  const sourceContextType = video.sourceContextType?.toLowerCase();
  return {
    id: video.id,
    sessionId: sourceContextType === 'session' ? video.sourceContextId : undefined,
    bookingId: sourceContextType === 'booking' ? video.sourceContextId : undefined,
    coachId: video.coachUserId || '',
    athleteIds: video.athleteId ? [video.athleteId] : [],
    title: video.title?.trim() || 'Video',
    description: video.description?.trim() || undefined,
    videoUrl: video.playbackUrl || '',
    thumbnailUrl: video.thumbnailUrl || video.playbackUrl || '',
    duration: Math.max(0, Math.round((video.durationMs ?? 0) / 1000)),
    fileSize: Math.max(0, video.fileSizeBytes ?? 0),
    annotations: (video.annotations ?? []).map(mapApiAnnotation).sort((left, right) => left.timestamp - right.timestamp),
    visibility: video.visibility === 'SHARED' ? 'SHARED' : 'PRIVATE',
    sharedWith: video.sharedWithUserIds ?? [],
    createdAt: video.createdAt || new Date().toISOString(),
    uploadStatus: video.uploadStatus ?? 'READY',
    viewCount: 0,
    tags: [],
  };
}

function inferVideoContentType(value: string): string {
  const normalized = value.toLowerCase();
  if (normalized.endsWith('.mov')) {
    return 'video/quicktime';
  }
  if (normalized.endsWith('.avi')) {
    return 'video/x-msvideo';
  }
  if (normalized.endsWith('.m4v')) {
    return 'video/x-m4v';
  }
  return 'video/mp4';
}

function buildUploadFileName(uri: string, title: string): string {
  const candidate = uri.split('/').pop()?.trim();
  if (candidate) {
    return candidate;
  }
  const normalizedTitle = title
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${normalizedTitle || 'video'}.mp4`;
}

async function uploadFileToSignedUrl(
  fileUri: string,
  uploadUrl: string,
  uploadHeaders: Record<string, string> | undefined,
): Promise<void> {
  if (Platform.OS === 'web') {
    const source = await fetch(fileUri);
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

export const videoService = {
  /**
   * Get all videos for a coach
   */
  async getCoachVideos(coachId: string): Promise<SessionVideo[]> {
    if (USE_MOCK) {
      videosCache = await loadFromStorage();
      return videosCache
        .filter((v) => v.coachId === coachId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const query = new URLSearchParams({ coachId });
    const result = await apiFetch<ApiVideoListResponse>(`/v1/videos?${query.toString()}`);
    return requireApiResult(result, 'Failed to load coach videos').videos.map(mapApiVideo);
  },

  /**
   * Get all videos featuring an athlete (shared with parent)
   */
  async getAthleteVideos(athleteId: string, parentId: string): Promise<SessionVideo[]> {
    if (USE_MOCK) {
      videosCache = await loadFromStorage();
      return videosCache
        .filter(
          (v) =>
            v.athleteIds.includes(athleteId) &&
            (v.visibility === 'PUBLIC' || v.sharedWith.includes(parentId)),
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const query = new URLSearchParams({ athleteId });
    const result = await apiFetch<ApiVideoListResponse>(`/v1/videos?${query.toString()}`);
    return requireApiResult(result, 'Failed to load athlete videos').videos.map(mapApiVideo);
  },

  /**
   * Get a single video by ID
   */
  async getVideo(videoId: string): Promise<SessionVideo | null> {
    if (USE_MOCK) {
      videosCache = await loadFromStorage();
      const video = videosCache.find((v) => v.id === videoId);
      if (video) {
        // Increment view count
        video.viewCount += 1;
        await saveToStorage(videosCache);
      }
      return video || null;
    }

    const result = await apiFetch<ApiVideoDetailResponse>(`/v1/videos/${videoId}`);
    if (!result.success) {
      return null;
    }
    return mapApiVideo(result.data.video);
  },

  /**
   * Create video record after upload
   */
  async createVideo(
    input: CreateVideoInput,
    videoUrl: string,
    thumbnailUrl: string,
    duration: number,
    fileSize: number,
    options: CreateVideoOptions = {},
  ): Promise<SessionVideo> {
    const reportStage = options.onStageChange;
    const newVideo: SessionVideo = {
      id: apiClient.generateId('vid'),
      coachId: input.coachId,
      athleteIds: input.athleteIds,
      sessionId: input.sessionId,
      bookingId: input.bookingId,
      title: input.title,
      description: input.description,
      videoUrl,
      thumbnailUrl,
      duration,
      fileSize,
      annotations: [],
      visibility: 'PRIVATE',
      sharedWith: [],
      createdAt: new Date().toISOString(),
      uploadStatus: 'READY',
      viewCount: 0,
      tags: input.tags || [],
    };

    if (USE_MOCK) {
      reportStage?.('creating-record');
      videosCache = await loadFromStorage();
      videosCache.unshift(newVideo);
      await saveToStorage(videosCache);
      reportStage?.('ready');
      return newVideo;
    }

    const fileName = buildUploadFileName(videoUrl, input.title);
    const contentType = inferVideoContentType(fileName);
    reportStage?.('initializing-upload');
    const uploadInit = requireApiResult(
      await apiFetch<ApiUploadInitResponse>('/v1/uploads/init', {
        method: 'POST',
        body: JSON.stringify({
          kind: 'VIDEO',
          contentType,
          fileName,
          sizeBytes: Math.max(1, fileSize),
          metadata: {
            coachId: input.coachId,
            athleteIds: input.athleteIds,
            sessionId: input.sessionId,
            bookingId: input.bookingId,
          },
        }),
      }),
      'Failed to initialize video upload',
    );

    reportStage?.('uploading-file');
    await uploadFileToSignedUrl(videoUrl, uploadInit.uploadUrl, uploadInit.uploadHeaders);

    reportStage?.('finalizing-upload');
    requireApiResult(
      await apiFetch<ApiUploadCompleteResponse>(`/v1/uploads/${uploadInit.uploadSessionId}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          mediaObjectId: uploadInit.mediaObjectId,
        }),
      }),
      'Failed to finalize video upload',
    );

    reportStage?.('creating-record');
    const created = requireApiResult(
      await apiFetch<ApiVideoDetailResponse>('/v1/videos', {
        method: 'POST',
        body: JSON.stringify({
          mediaObjectId: uploadInit.mediaObjectId,
          athleteIds: input.athleteIds,
          title: input.title,
          description: input.description,
          sessionId: input.sessionId,
          bookingId: input.bookingId,
          durationSeconds: Math.max(0, Math.round(duration)),
        }),
      }),
      'Failed to create video record',
    );

    const mappedVideo = mapApiVideo(created.video);
    reportStage?.('ready');
    return mappedVideo;
  },

  /**
   * Add annotation to video
   */
  async addAnnotation(
    videoId: string,
    timestamp: number,
    label: string,
    type: VideoAnnotationType,
    note?: string,
  ): Promise<VideoAnnotation> {
    if (USE_MOCK) {
      videosCache = await loadFromStorage();
      const video = videosCache.find((v) => v.id === videoId);
      if (video) {
        const normalizedLabel = label.trim();
        if (!normalizedLabel) {
          throw new Error('Annotation label is required');
        }
        if (timestamp < 0 || timestamp > video.duration) {
          throw new Error('Annotation timestamp is out of range');
        }
        if (video.annotations.some((annotation) => annotation.timestamp === timestamp)) {
          throw new Error('Annotation timestamp already exists');
        }
        const annotation: VideoAnnotation = {
          id: apiClient.generateId('ann'),
          timestamp,
          label: normalizedLabel,
          type,
          note: note?.trim() || undefined,
        };
        video.annotations.push(annotation);
        video.annotations.sort((a, b) => a.timestamp - b.timestamp);
        await saveToStorage(videosCache);
        return annotation;
      }
      throw new Error(`Video not found: ${videoId}`);
    }

    const result = await apiFetch<ApiAnnotationResponse>(`/v1/videos/${videoId}/annotations`, {
      method: 'POST',
      body: JSON.stringify({
        timestamp,
        label,
        type,
        note,
      }),
    });
    return mapApiAnnotation(requireApiResult(result, 'Failed to add video annotation').annotation);
  },

  /**
   * Remove annotation from video
   */
  async removeAnnotation(videoId: string, annotationId: string): Promise<void> {
    if (USE_MOCK) {
      videosCache = await loadFromStorage();
      const video = videosCache.find((v) => v.id === videoId);
      if (video) {
        video.annotations = video.annotations.filter((a) => a.id !== annotationId);
        await saveToStorage(videosCache);
        emitTyped(ServiceEvents.VIDEO_ANNOTATION_REMOVED, {
          videoId,
          annotationId,
        });
      }
      return;
    }

    requireApiResult(
      await apiFetch<void>(`/v1/videos/${videoId}/annotations/${annotationId}`, {
        method: 'DELETE',
      }),
      'Failed to remove video annotation',
    );
    emitTyped(ServiceEvents.VIDEO_ANNOTATION_REMOVED, {
      videoId,
      annotationId,
    });
  },

  /**
   * Share video with parents
   */
  async shareVideo(
    videoId: string,
    parentIds: string[],
  ): Promise<Result<SessionVideo, ServiceError>> {
    if (USE_MOCK) {
      videosCache = await loadFromStorage();
      const video = videosCache.find((v) => v.id === videoId);
      if (video) {
        video.visibility = 'SHARED';
        video.sharedWith = [...new Set([...video.sharedWith, ...parentIds])];
        await saveToStorage(videosCache);
        return ok(video);
      }
      return err(notFound('Video', videoId));
    }

    const result = await apiFetch<ApiVideoDetailResponse>(`/v1/videos/${videoId}/share`, {
      method: 'PATCH',
      body: JSON.stringify({
        visibility: 'SHARED',
        recipientUserIds: parentIds.length > 0 ? parentIds : undefined,
      }),
    });
    if (!result.success) {
      return err(result.error);
    }
    return ok(mapApiVideo(result.data.video));
  },

  /**
   * Unshare video (make private)
   */
  async makePrivate(videoId: string): Promise<Result<SessionVideo, ServiceError>> {
    if (USE_MOCK) {
      videosCache = await loadFromStorage();
      const video = videosCache.find((v) => v.id === videoId);
      if (video) {
        video.visibility = 'PRIVATE';
        video.sharedWith = [];
        await saveToStorage(videosCache);
        return ok(video);
      }
      return err(notFound('Video', videoId));
    }

    const result = await apiFetch<ApiVideoDetailResponse>(`/v1/videos/${videoId}/share`, {
      method: 'PATCH',
      body: JSON.stringify({ visibility: 'PRIVATE' }),
    });
    if (!result.success) {
      return err(result.error);
    }
    return ok(mapApiVideo(result.data.video));
  },

  /**
   * Delete video
   */
  async deleteVideo(videoId: string): Promise<void> {
    if (USE_MOCK) {
      videosCache = await loadFromStorage();
      const existing = videosCache.find((v) => v.id === videoId);
      videosCache = videosCache.filter((v) => v.id !== videoId);
      await saveToStorage(videosCache);
      if (existing) {
        emitTyped(ServiceEvents.VIDEO_DELETED, {
          videoId,
          coachId: existing.coachId,
          athleteIds: existing.athleteIds,
        });
      }
      return;
    }

    requireApiResult(
      await apiFetch<void>(`/v1/videos/${videoId}`, { method: 'DELETE' }),
      'Failed to delete video',
    );
    emitTyped(ServiceEvents.VIDEO_DELETED, {
      videoId,
      coachId: '',
      athleteIds: [],
    });
  },

  /**
   * Update video metadata
   */
  async updateVideo(
    videoId: string,
    updates: Partial<Pick<SessionVideo, 'title' | 'description' | 'tags'>>,
  ): Promise<Result<SessionVideo, ServiceError>> {
    if (USE_MOCK) {
      videosCache = await loadFromStorage();
      const video = videosCache.find((v) => v.id === videoId);
      if (video) {
        Object.assign(video, updates);
        await saveToStorage(videosCache);
        return ok(video);
      }
      return err(notFound('Video', videoId));
    }

    const result = await apiFetch<ApiVideoDetailResponse>(`/v1/videos/${videoId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: updates.title,
        description: updates.description,
      }),
    });
    if (!result.success) {
      return err(result.error);
    }
    return ok(mapApiVideo(result.data.video));
  },

  /**
   * Get video statistics for a coach
   */
  async getCoachVideoStats(coachId: string): Promise<{
    totalVideos: number;
    totalViews: number;
    totalDuration: number;
    sharedCount: number;
    annotationCount: number;
  }> {
    const videos = await this.getCoachVideos(coachId);

    return {
      totalVideos: videos.length,
      totalViews: videos.reduce((sum, v) => sum + v.viewCount, 0),
      totalDuration: videos.reduce((sum, v) => sum + v.duration, 0),
      sharedCount: videos.filter((v) => v.visibility === 'SHARED').length,
      annotationCount: videos.reduce((sum, v) => sum + v.annotations.length, 0),
    };
  },

  // ==================== ANNOTATION METHODS ====================

  /**
   * Get an annotated video with all its annotations
   */
  async getAnnotatedVideo(videoId: string): Promise<AnnotatedVideo | null> {
    const video = await this.getVideo(videoId);
    if (!video) return null;

    return {
      id: video.id,
      sessionId: video.sessionId,
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration,
      title: video.title,
      description: video.description,
      coachId: video.coachId,
      athleteIds: video.athleteIds,
      annotations: video.annotations.sort((a, b) => a.timestamp - b.timestamp),
      createdAt: video.createdAt,
      visibility: video.visibility,
      sharedWith: video.sharedWith,
      viewCount: video.viewCount,
      tags: video.tags,
    };
  },

  /**
   * Get all annotations for a video
   */
  async getVideoAnnotations(videoId: string): Promise<VideoAnnotation[]> {
    const video = await this.getVideo(videoId);
    if (!video) return [];

    return video.annotations.sort((a, b) => a.timestamp - b.timestamp);
  },

  /**
   * Add a new annotation to a video (enhanced version with creator info)
   */
  async createAnnotation(
    videoId: string,
    input: CreateAnnotationInput,
    createdBy?: string,
    createdByName?: string,
  ): Promise<VideoAnnotation> {
    const annotation = await this.addAnnotation(
      videoId,
      input.timestamp,
      input.label,
      input.type,
      input.note,
    );

    // Enhance with creator info if provided
    if (createdBy || createdByName) {
      return {
        ...annotation,
        createdBy,
        createdAt: new Date().toISOString(),
      };
    }

    return annotation;
  },

  /**
   * Update an existing annotation
   */
  async updateAnnotation(
    videoId: string,
    annotationId: string,
    updates: UpdateAnnotationInput,
  ): Promise<VideoAnnotation | null> {
    const video = await this.getVideo(videoId);
    if (!video) return null;

    const annotationIndex = video.annotations.findIndex((a) => a.id === annotationId);
    if (annotationIndex === -1) return null;

    const existingAnnotation = video.annotations[annotationIndex];
    const nextTimestamp = updates.timestamp ?? existingAnnotation.timestamp;
    const nextLabel = (updates.label ?? existingAnnotation.label).trim();
    if (!nextLabel) {
      logger.warn('Annotation update rejected: empty label', { videoId, annotationId });
      return null;
    }
    if (nextTimestamp < 0 || nextTimestamp > video.duration) {
      logger.warn('Annotation update rejected: timestamp out of range', {
        videoId,
        annotationId,
        timestamp: nextTimestamp,
        duration: video.duration,
      });
      return null;
    }
    const duplicateTimestamp = video.annotations.some(
      (annotation, index) => index !== annotationIndex && annotation.timestamp === nextTimestamp,
    );
    if (duplicateTimestamp) {
      logger.warn('Annotation update rejected: duplicate timestamp', {
        videoId,
        annotationId,
        timestamp: nextTimestamp,
      });
      return null;
    }
    const updatedAnnotation: VideoAnnotation = {
      ...existingAnnotation,
      timestamp: nextTimestamp,
      label: nextLabel,
      note: updates.note ?? existingAnnotation.note,
      type: updates.type ?? existingAnnotation.type,
      updatedAt: new Date().toISOString(),
    };

    if (USE_MOCK) {
      videosCache = await loadFromStorage();
      const mutableVideo = videosCache.find((entry) => entry.id === videoId);
      if (!mutableVideo) return null;
      const mutableIndex = mutableVideo.annotations.findIndex((a) => a.id === annotationId);
      if (mutableIndex === -1) return null;
      mutableVideo.annotations[mutableIndex] = {
        ...updatedAnnotation,
        id: annotationId,
      };
      mutableVideo.annotations.sort((a, b) => a.timestamp - b.timestamp);
      await saveToStorage(videosCache);
      emitTyped(ServiceEvents.VIDEO_ANNOTATION_UPDATED, {
        videoId,
        annotationId,
        annotation: mutableVideo.annotations[mutableIndex],
      });
      logger.info('Annotation updated', { videoId, annotationId });
      return mutableVideo.annotations[mutableIndex];
    }

    const result = await apiFetch<ApiAnnotationResponse>(`/v1/videos/${videoId}/annotations/${annotationId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        timestamp: nextTimestamp,
        label: nextLabel,
        note: updates.note ?? existingAnnotation.note,
        type: updates.type ?? existingAnnotation.type,
      }),
    });

    if (!result.success) {
      return null;
    }
    return mapApiAnnotation(result.data.annotation);
  },

  /**
   * Delete an annotation from a video
   */
  async deleteAnnotation(videoId: string, annotationId: string): Promise<boolean> {
    try {
      await this.removeAnnotation(videoId, annotationId);
      emitTyped(ServiceEvents.VIDEO_ANNOTATION_DELETED, {
        videoId,
        annotationId,
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Export annotations for sharing/download
   */
  async exportAnnotations(videoId: string): Promise<AnnotationExport | null> {
    const video = await this.getVideo(videoId);
    if (!video) return null;

    const [coachName, athleteNames] = await Promise.all([
      resolveUserName(video.coachId, 'Coach'),
      resolveUserNames(video.athleteIds, 'Athlete'),
    ]);

    const formatTimestamp = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getTypeLabel = (type: VideoAnnotationType): string => {
      return ANNOTATION_TYPE_CONFIG[type]?.label ?? type;
    };

    return {
      videoTitle: video.title,
      videoDuration: video.duration,
      coachName,
      athleteNames,
      exportedAt: new Date().toISOString(),
      annotations: video.annotations
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((ann) => ({
          timestamp: ann.timestamp,
          timestampFormatted: formatTimestamp(ann.timestamp),
          label: ann.label,
          note: ann.note,
          type: ann.type,
          typeLabel: getTypeLabel(ann.type),
        })),
    };
  },

  /**
   * Get annotations grouped by type
   */
  async getAnnotationsByType(
    videoId: string,
  ): Promise<Record<VideoAnnotationType, VideoAnnotation[]>> {
    const annotations = await this.getVideoAnnotations(videoId);

    const grouped: Record<VideoAnnotationType, VideoAnnotation[]> = {
      HIGHLIGHT: [],
      IMPROVEMENT: [],
      TECHNIQUE: [],
      GENERAL: [],
    };

    for (const annotation of annotations) {
      grouped[annotation.type].push(annotation);
    }

    return grouped;
  },

  /**
   * Get annotation statistics for a video
   */
  async getAnnotationStats(videoId: string): Promise<{
    total: number;
    byType: Record<VideoAnnotationType, number>;
    averagePerMinute: number;
  }> {
    const video = await this.getVideo(videoId);
    if (!video) {
      return {
        total: 0,
        byType: { HIGHLIGHT: 0, IMPROVEMENT: 0, TECHNIQUE: 0, GENERAL: 0 },
        averagePerMinute: 0,
      };
    }

    const byType: Record<VideoAnnotationType, number> = {
      HIGHLIGHT: 0,
      IMPROVEMENT: 0,
      TECHNIQUE: 0,
      GENERAL: 0,
    };

    for (const ann of video.annotations) {
      byType[ann.type]++;
    }

    const durationMinutes = video.duration / 60;
    const averagePerMinute = durationMinutes > 0 ? video.annotations.length / durationMinutes : 0;

    return {
      total: video.annotations.length,
      byType,
      averagePerMinute: Math.round(averagePerMinute * 10) / 10,
    };
  },

  /**
   * Find annotations near a specific timestamp
   */
  async findAnnotationsNearTimestamp(
    videoId: string,
    timestamp: number,
    thresholdSeconds: number = 5,
  ): Promise<VideoAnnotation[]> {
    const annotations = await this.getVideoAnnotations(videoId);

    return annotations.filter((ann) => Math.abs(ann.timestamp - timestamp) <= thresholdSeconds);
  },

  /**
   * Get the next annotation after a given timestamp
   */
  async getNextAnnotation(
    videoId: string,
    currentTimestamp: number,
  ): Promise<VideoAnnotation | null> {
    const annotations = await this.getVideoAnnotations(videoId);

    for (const ann of annotations) {
      if (ann.timestamp > currentTimestamp) {
        return ann;
      }
    }

    return null;
  },

  /**
   * Get the previous annotation before a given timestamp
   */
  async getPreviousAnnotation(
    videoId: string,
    currentTimestamp: number,
  ): Promise<VideoAnnotation | null> {
    const annotations = await this.getVideoAnnotations(videoId);

    let previous: VideoAnnotation | null = null;
    for (const ann of annotations) {
      if (ann.timestamp >= currentTimestamp) break;
      previous = ann;
    }

    return previous;
  },

  /**
   * Bulk add annotations (useful for importing)
   */
  async bulkAddAnnotations(
    videoId: string,
    inputs: CreateAnnotationInput[],
    createdBy?: string,
    createdByName?: string,
  ): Promise<VideoAnnotation[]> {
    const results: VideoAnnotation[] = [];

    for (const input of inputs) {
      const annotation = await this.createAnnotation(videoId, input, createdBy, createdByName);
      results.push(annotation);
    }

    return results;
  },

  /**
   * Clear all annotations from a video
   */
  async clearAnnotations(videoId: string): Promise<boolean> {
    const video = await this.getVideo(videoId);
    if (!video) return false;

    for (const annotation of video.annotations) {
      await this.removeAnnotation(videoId, annotation.id);
    }

    return true;
  },

  /**
   * Format timestamp for display
   */
  formatTimestamp(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  /**
   * Parse timestamp from string format (e.g., "1:30")
   */
  parseTimestamp(timestampStr: string): number {
    const parts = timestampStr.split(':');
    if (parts.length !== 2) return 0;

    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;

    return mins * 60 + secs;
  },

  /**
   * Get annotation type info
   */
  getTypeInfo(type: VideoAnnotationType): {
    label: string;
    color: string;
    icon: string;
    description: string;
  } {
    return ANNOTATION_TYPE_CONFIG[type];
  },

  /**
   * Get all annotation types
   */
  getAllTypes(): VideoAnnotationType[] {
    return ['HIGHLIGHT', 'IMPROVEMENT', 'TECHNIQUE', 'GENERAL'];
  },

  /**
   * Validate annotation input
   */
  validateInput(input: CreateAnnotationInput, videoDuration: number): string[] {
    const errors: string[] = [];

    if (!input.label || input.label.trim().length === 0) {
      errors.push('Label is required');
    }

    if (input.label && input.label.length > 100) {
      errors.push('Label must be 100 characters or less');
    }

    if (input.note && input.note.length > 500) {
      errors.push('Note must be 500 characters or less');
    }

    if (input.timestamp < 0) {
      errors.push('Timestamp cannot be negative');
    }

    if (input.timestamp > videoDuration) {
      errors.push('Timestamp cannot exceed video duration');
    }

    if (!this.getAllTypes().includes(input.type)) {
      errors.push('Invalid annotation type');
    }

    return errors;
  },

  /**
   * Generate shareable text summary of annotations
   */
  async generateTextSummary(videoId: string): Promise<string> {
    const exportData = await this.exportAnnotations(videoId);
    if (!exportData) return '';

    let summary = `Video: ${exportData.videoTitle}\n`;
    summary += `Coach: ${exportData.coachName}\n`;
    summary += `Athletes: ${(exportData.athleteNames ?? []).join(', ')}\n`;
    summary += `Duration: ${this.formatTimestamp(exportData.videoDuration)}\n\n`;
    summary += `--- Annotations ---\n\n`;

    for (const ann of exportData.annotations) {
      summary += `[${ann.timestampFormatted}] ${ann.typeLabel}: ${ann.label}\n`;
      if (ann.note) {
        summary += `   ${ann.note}\n`;
      }
      summary += '\n';
    }

    return summary;
  },

  // ==================== UTILITY METHODS ====================

  /**
   * Format duration for display
   */
  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  },
};
