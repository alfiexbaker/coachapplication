/**
 * Video Service
 *
 * Handles session video upload, storage, and playback.
 * Enables coaches to share training footage with parents/athletes.
 *
 * API Integration Notes:
 * - POST /api/videos/upload-url - Get signed upload URL (S3/GCS)
 * - POST /api/videos - Create video record after upload
 * - GET /api/videos?coachId=X - Coach's videos
 * - GET /api/videos?athleteId=X - Videos featuring athlete
 * - POST /api/videos/:id/annotations - Add annotation
 * - PATCH /api/videos/:id/share - Update sharing
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SessionVideo, VideoAnnotation, VideoAnnotationType } from '@/constants/types';

const STORAGE_KEY = 'session_videos';
const USE_MOCK = true;

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
    console.error('[VideoService] Failed to load from storage:', error);
  }
  return [...MOCK_VIDEOS];
}

async function saveToStorage(videos: SessionVideo[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
  } catch (error) {
    console.error('[VideoService] Failed to save to storage:', error);
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
