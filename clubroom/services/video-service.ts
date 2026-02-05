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
 * - POST /api/videos/upload-url - Get signed upload URL (S3/GCS)
 * - POST /api/videos - Create video record after upload
 * - GET /api/videos?coachId=X - Coach's videos
 * - GET /api/videos?athleteId=X - Videos featuring athlete
 * - POST /api/videos/:id/annotations - Add annotation
 * - PATCH /api/videos/:id/annotations/:annotationId - Update annotation
 * - DELETE /api/videos/:id/annotations/:annotationId - Delete annotation
 * - GET /api/videos/:id/annotations/export - Export annotations
 * - PATCH /api/videos/:id/share - Update sharing
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/constants/config';
import type { SessionVideo, VideoAnnotation, VideoAnnotationType, AnnotatedVideo, AnnotationExport } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('VideoService');

const STORAGE_KEY = 'session_videos';
const USE_MOCK = api.useMock;

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
    coachId: 'coach_1',
    coachName: 'Marcus Thompson',
    athleteIds: ['athlete_1'],
    athleteNames: ['Tom Baker'],
    title: 'Finishing Drills - Weak Foot Practice',
    description: 'Great progress on weak foot finishing. Focus on body position at point of contact.',
    videoUrl: 'https://example.com/videos/session_1.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/vid1/400/225',
    duration: 180, // 3 minutes
    fileSize: 45000000, // 45MB
    annotations: [
      { id: 'ann_1', timestamp: 15, label: 'Good technique', note: 'Notice the planted foot position', type: 'TECHNIQUE' },
      { id: 'ann_2', timestamp: 45, label: 'Area to improve', note: 'Follow through needs work', type: 'IMPROVEMENT' },
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
    coachId: 'coach_1',
    coachName: 'Marcus Thompson',
    athleteIds: ['athlete_1'],
    athleteNames: ['Tom Baker'],
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
    coachId: 'coach_1',
    coachName: 'Marcus Thompson',
    athleteIds: ['athlete_2', 'athlete_3'],
    athleteNames: ['Lucy Baker', 'James Wilson'],
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
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (error) {
    logger.error('Failed to load from storage', error);
  }
  return [...MOCK_VIDEOS];
}

async function saveToStorage(videos: SessionVideo[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
  } catch (error) {
    logger.error('Failed to save to storage', error);
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

export interface UploadProgress {
  videoId: string;
  progress: number; // 0-100
  status: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';
}

export interface CreateAnnotationInput {
  timestamp: number;
  label: string;
  note?: string;
  type: VideoAnnotationType;
}

export interface UpdateAnnotationInput {
  label?: string;
  note?: string;
  type?: VideoAnnotationType;
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

    const response = await fetch(`/api/videos?coachId=${coachId}`);
    return response.json();
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
            (v.visibility === 'PUBLIC' || v.sharedWith.includes(parentId))
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const response = await fetch(`/api/videos?athleteId=${athleteId}`);
    return response.json();
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

    const response = await fetch(`/api/videos/${videoId}`);
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Get signed upload URL (mock returns a fake URL)
   */
  async getUploadUrl(fileName: string, fileType: string): Promise<{ uploadUrl: string; videoUrl: string }> {
    if (USE_MOCK) {
      // In mock mode, return fake URLs
      const videoId = `vid_${Date.now()}`;
      return {
        uploadUrl: `https://mock-upload.example.com/upload/${videoId}`,
        videoUrl: `https://example.com/videos/${videoId}.mp4`,
      };
    }

    const response = await fetch('/api/videos/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, fileType }),
    });
    return response.json();
  },

  /**
   * Create video record after upload
   */
  async createVideo(input: CreateVideoInput, videoUrl: string, thumbnailUrl: string, duration: number, fileSize: number): Promise<SessionVideo> {
    const newVideo: SessionVideo = {
      id: `vid_${Date.now()}`,
      coachId: input.coachId,
      coachName: input.coachName,
      athleteIds: input.athleteIds,
      athleteNames: input.athleteNames,
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
      videosCache = await loadFromStorage();
      videosCache.unshift(newVideo);
      await saveToStorage(videosCache);
      return newVideo;
    }

    const response = await fetch('/api/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newVideo),
    });
    return response.json();
  },

  /**
   * Add annotation to video
   */
  async addAnnotation(
    videoId: string,
    timestamp: number,
    label: string,
    type: VideoAnnotationType,
    note?: string
  ): Promise<VideoAnnotation> {
    const annotation: VideoAnnotation = {
      id: `ann_${Date.now()}`,
      timestamp,
      label,
      type,
      note,
    };

    if (USE_MOCK) {
      videosCache = await loadFromStorage();
      const video = videosCache.find((v) => v.id === videoId);
      if (video) {
        video.annotations.push(annotation);
        video.annotations.sort((a, b) => a.timestamp - b.timestamp);
        await saveToStorage(videosCache);
      }
      return annotation;
    }

    const response = await fetch(`/api/videos/${videoId}/annotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(annotation),
    });
    return response.json();
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
      }
      return;
    }

    await fetch(`/api/videos/${videoId}/annotations/${annotationId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Share video with parents
   */
  async shareVideo(videoId: string, parentIds: string[]): Promise<SessionVideo> {
    if (USE_MOCK) {
      videosCache = await loadFromStorage();
      const video = videosCache.find((v) => v.id === videoId);
      if (video) {
        video.visibility = 'SHARED';
        video.sharedWith = [...new Set([...video.sharedWith, ...parentIds])];
        await saveToStorage(videosCache);
        return video;
      }
      throw new Error('Video not found');
    }

    const response = await fetch(`/api/videos/${videoId}/share`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentIds }),
    });
    return response.json();
  },

  /**
   * Unshare video (make private)
   */
  async makePrivate(videoId: string): Promise<SessionVideo> {
    if (USE_MOCK) {
      videosCache = await loadFromStorage();
      const video = videosCache.find((v) => v.id === videoId);
      if (video) {
        video.visibility = 'PRIVATE';
        video.sharedWith = [];
        await saveToStorage(videosCache);
        return video;
      }
      throw new Error('Video not found');
    }

    const response = await fetch(`/api/videos/${videoId}/share`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility: 'PRIVATE' }),
    });
    return response.json();
  },

  /**
   * Delete video
   */
  async deleteVideo(videoId: string): Promise<void> {
    if (USE_MOCK) {
      videosCache = await loadFromStorage();
      videosCache = videosCache.filter((v) => v.id !== videoId);
      await saveToStorage(videosCache);
      return;
    }

    await fetch(`/api/videos/${videoId}`, { method: 'DELETE' });
  },

  /**
   * Update video metadata
   */
  async updateVideo(videoId: string, updates: Partial<Pick<SessionVideo, 'title' | 'description' | 'tags'>>): Promise<SessionVideo> {
    if (USE_MOCK) {
      videosCache = await loadFromStorage();
      const video = videosCache.find((v) => v.id === videoId);
      if (video) {
        Object.assign(video, updates);
        await saveToStorage(videosCache);
        return video;
      }
      throw new Error('Video not found');
    }

    const response = await fetch(`/api/videos/${videoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return response.json();
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
      coachName: video.coachName,
      athleteIds: video.athleteIds,
      athleteNames: video.athleteNames,
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
    createdByName?: string
  ): Promise<VideoAnnotation> {
    const annotation = await this.addAnnotation(
      videoId,
      input.timestamp,
      input.label,
      input.type,
      input.note
    );

    // Enhance with creator info if provided
    if (createdBy || createdByName) {
      return {
        ...annotation,
        createdBy,
        createdByName,
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
    updates: UpdateAnnotationInput
  ): Promise<VideoAnnotation | null> {
    const video = await this.getVideo(videoId);
    if (!video) return null;

    const annotationIndex = video.annotations.findIndex((a) => a.id === annotationId);
    if (annotationIndex === -1) return null;

    const existingAnnotation = video.annotations[annotationIndex];
    const updatedAnnotation: VideoAnnotation = {
      ...existingAnnotation,
      label: updates.label ?? existingAnnotation.label,
      note: updates.note ?? existingAnnotation.note,
      type: updates.type ?? existingAnnotation.type,
      updatedAt: new Date().toISOString(),
    };

    // In mock mode, we need to remove and re-add to update
    if (USE_MOCK) {
      await this.removeAnnotation(videoId, annotationId);
      await this.addAnnotation(
        videoId,
        updatedAnnotation.timestamp,
        updatedAnnotation.label,
        updatedAnnotation.type,
        updatedAnnotation.note
      );

      // Return the updated annotation with the original ID
      return updatedAnnotation;
    }

    const response = await fetch(`/api/videos/${videoId}/annotations/${annotationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Delete an annotation from a video
   */
  async deleteAnnotation(videoId: string, annotationId: string): Promise<boolean> {
    try {
      await this.removeAnnotation(videoId, annotationId);
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
      coachName: video.coachName,
      athleteNames: video.athleteNames,
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
    videoId: string
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
    const averagePerMinute = durationMinutes > 0
      ? video.annotations.length / durationMinutes
      : 0;

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
    thresholdSeconds: number = 5
  ): Promise<VideoAnnotation[]> {
    const annotations = await this.getVideoAnnotations(videoId);

    return annotations.filter(
      (ann) => Math.abs(ann.timestamp - timestamp) <= thresholdSeconds
    );
  },

  /**
   * Get the next annotation after a given timestamp
   */
  async getNextAnnotation(
    videoId: string,
    currentTimestamp: number
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
    currentTimestamp: number
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
    createdByName?: string
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
  getTypeInfo(
    type: VideoAnnotationType
  ): { label: string; color: string; icon: string; description: string } {
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
    summary += `Athletes: ${exportData.athleteNames.join(', ')}\n`;
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
