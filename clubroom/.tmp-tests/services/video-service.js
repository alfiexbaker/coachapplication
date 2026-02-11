"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoService = exports.ANNOTATION_TYPE_CONFIG = void 0;
const api_client_1 = require("./api-client");
const config_1 = require("@/constants/config");
const result_1 = require("@/types/result");
const user_service_1 = require("./user-service");
const logger_1 = require("@/utils/logger");
const storage_keys_1 = require("@/constants/storage-keys");
const logger = (0, logger_1.createLogger)('VideoService');
const USE_MOCK = config_1.api.useMock;
async function resolveUserName(userId, fallback) {
    const userResult = await user_service_1.userService.getUserById(userId);
    if (!userResult.success) {
        return fallback;
    }
    return userResult.data.name?.trim() || fallback;
}
async function resolveUserNames(userIds, fallbackPrefix) {
    const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
    if (uniqueUserIds.length === 0) {
        return [];
    }
    const usersResult = await user_service_1.userService.getUsersByIds(uniqueUserIds);
    if (!usersResult.success) {
        return userIds.map((_, index) => `${fallbackPrefix} ${index + 1}`);
    }
    const usersById = new Map(usersResult.data.map((user) => [user.id, user.name?.trim() || '']));
    return userIds.map((userId, index) => usersById.get(userId) || `${fallbackPrefix} ${index + 1}`);
}
/**
 * Annotation type configuration with colors and labels
 */
exports.ANNOTATION_TYPE_CONFIG = {
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
const MOCK_VIDEOS = [
    {
        id: 'vid_1',
        sessionId: 'session_1',
        bookingId: 'booking_1',
        coachId: 'coach1',
        athleteIds: ['athlete_1'],
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
let videosCache = [...MOCK_VIDEOS];
async function loadFromStorage() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.SESSION_VIDEOS, null);
        if (stored)
            return stored;
    }
    catch (error) {
        logger.error('Failed to load from storage', error);
    }
    return [...MOCK_VIDEOS];
}
async function saveToStorage(videos) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SESSION_VIDEOS, videos);
        return (0, result_1.ok)(undefined);
    }
    catch (error) {
        logger.error('Failed to save to storage', error);
        return (0, result_1.err)((0, result_1.storageError)(`Failed to save session videos: ${String(error)}`));
    }
}
exports.videoService = {
    /**
     * Get all videos for a coach
     */
    async getCoachVideos(coachId) {
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
    async getAthleteVideos(athleteId, parentId) {
        if (USE_MOCK) {
            videosCache = await loadFromStorage();
            return videosCache
                .filter((v) => v.athleteIds.includes(athleteId) &&
                (v.visibility === 'PUBLIC' || v.sharedWith.includes(parentId)))
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        const response = await fetch(`/api/videos?athleteId=${athleteId}`);
        return response.json();
    },
    /**
     * Get a single video by ID
     */
    async getVideo(videoId) {
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
        if (!response.ok)
            return null;
        return response.json();
    },
    /**
     * Get signed upload URL (mock returns a fake URL)
     */
    async getUploadUrl(fileName, fileType) {
        if (USE_MOCK) {
            // In mock mode, return fake URLs
            const videoId = api_client_1.apiClient.generateId('vid');
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
    async createVideo(input, videoUrl, thumbnailUrl, duration, fileSize) {
        const newVideo = {
            id: api_client_1.apiClient.generateId('vid'),
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
    async addAnnotation(videoId, timestamp, label, type, note) {
        const annotation = {
            id: api_client_1.apiClient.generateId('ann'),
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
    async removeAnnotation(videoId, annotationId) {
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
    async shareVideo(videoId, parentIds) {
        if (USE_MOCK) {
            videosCache = await loadFromStorage();
            const video = videosCache.find((v) => v.id === videoId);
            if (video) {
                video.visibility = 'SHARED';
                video.sharedWith = [...new Set([...video.sharedWith, ...parentIds])];
                await saveToStorage(videosCache);
                return (0, result_1.ok)(video);
            }
            return (0, result_1.err)((0, result_1.notFound)('Video', videoId));
        }
        const response = await fetch(`/api/videos/${videoId}/share`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parentIds }),
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Unshare video (make private)
     */
    async makePrivate(videoId) {
        if (USE_MOCK) {
            videosCache = await loadFromStorage();
            const video = videosCache.find((v) => v.id === videoId);
            if (video) {
                video.visibility = 'PRIVATE';
                video.sharedWith = [];
                await saveToStorage(videosCache);
                return (0, result_1.ok)(video);
            }
            return (0, result_1.err)((0, result_1.notFound)('Video', videoId));
        }
        const response = await fetch(`/api/videos/${videoId}/share`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visibility: 'PRIVATE' }),
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Delete video
     */
    async deleteVideo(videoId) {
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
    async updateVideo(videoId, updates) {
        if (USE_MOCK) {
            videosCache = await loadFromStorage();
            const video = videosCache.find((v) => v.id === videoId);
            if (video) {
                Object.assign(video, updates);
                await saveToStorage(videosCache);
                return (0, result_1.ok)(video);
            }
            return (0, result_1.err)((0, result_1.notFound)('Video', videoId));
        }
        const response = await fetch(`/api/videos/${videoId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Get video statistics for a coach
     */
    async getCoachVideoStats(coachId) {
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
    async getAnnotatedVideo(videoId) {
        const video = await this.getVideo(videoId);
        if (!video)
            return null;
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
    async getVideoAnnotations(videoId) {
        const video = await this.getVideo(videoId);
        if (!video)
            return [];
        return video.annotations.sort((a, b) => a.timestamp - b.timestamp);
    },
    /**
     * Add a new annotation to a video (enhanced version with creator info)
     */
    async createAnnotation(videoId, input, createdBy, createdByName) {
        const annotation = await this.addAnnotation(videoId, input.timestamp, input.label, input.type, input.note);
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
    async updateAnnotation(videoId, annotationId, updates) {
        const video = await this.getVideo(videoId);
        if (!video)
            return null;
        const annotationIndex = video.annotations.findIndex((a) => a.id === annotationId);
        if (annotationIndex === -1)
            return null;
        const existingAnnotation = video.annotations[annotationIndex];
        const updatedAnnotation = {
            ...existingAnnotation,
            label: updates.label ?? existingAnnotation.label,
            note: updates.note ?? existingAnnotation.note,
            type: updates.type ?? existingAnnotation.type,
            updatedAt: new Date().toISOString(),
        };
        // In mock mode, we need to remove and re-add to update
        if (USE_MOCK) {
            await this.removeAnnotation(videoId, annotationId);
            await this.addAnnotation(videoId, updatedAnnotation.timestamp, updatedAnnotation.label, updatedAnnotation.type, updatedAnnotation.note);
            // Return the updated annotation with the original ID
            return updatedAnnotation;
        }
        const response = await fetch(`/api/videos/${videoId}/annotations/${annotationId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        if (!response.ok)
            return null;
        return response.json();
    },
    /**
     * Delete an annotation from a video
     */
    async deleteAnnotation(videoId, annotationId) {
        try {
            await this.removeAnnotation(videoId, annotationId);
            return true;
        }
        catch {
            return false;
        }
    },
    /**
     * Export annotations for sharing/download
     */
    async exportAnnotations(videoId) {
        const video = await this.getVideo(videoId);
        if (!video)
            return null;
        const [coachName, athleteNames] = await Promise.all([
            resolveUserName(video.coachId, 'Coach'),
            resolveUserNames(video.athleteIds, 'Athlete'),
        ]);
        const formatTimestamp = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };
        const getTypeLabel = (type) => {
            return exports.ANNOTATION_TYPE_CONFIG[type]?.label ?? type;
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
    async getAnnotationsByType(videoId) {
        const annotations = await this.getVideoAnnotations(videoId);
        const grouped = {
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
    async getAnnotationStats(videoId) {
        const video = await this.getVideo(videoId);
        if (!video) {
            return {
                total: 0,
                byType: { HIGHLIGHT: 0, IMPROVEMENT: 0, TECHNIQUE: 0, GENERAL: 0 },
                averagePerMinute: 0,
            };
        }
        const byType = {
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
    async findAnnotationsNearTimestamp(videoId, timestamp, thresholdSeconds = 5) {
        const annotations = await this.getVideoAnnotations(videoId);
        return annotations.filter((ann) => Math.abs(ann.timestamp - timestamp) <= thresholdSeconds);
    },
    /**
     * Get the next annotation after a given timestamp
     */
    async getNextAnnotation(videoId, currentTimestamp) {
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
    async getPreviousAnnotation(videoId, currentTimestamp) {
        const annotations = await this.getVideoAnnotations(videoId);
        let previous = null;
        for (const ann of annotations) {
            if (ann.timestamp >= currentTimestamp)
                break;
            previous = ann;
        }
        return previous;
    },
    /**
     * Bulk add annotations (useful for importing)
     */
    async bulkAddAnnotations(videoId, inputs, createdBy, createdByName) {
        const results = [];
        for (const input of inputs) {
            const annotation = await this.createAnnotation(videoId, input, createdBy, createdByName);
            results.push(annotation);
        }
        return results;
    },
    /**
     * Clear all annotations from a video
     */
    async clearAnnotations(videoId) {
        const video = await this.getVideo(videoId);
        if (!video)
            return false;
        for (const annotation of video.annotations) {
            await this.removeAnnotation(videoId, annotation.id);
        }
        return true;
    },
    /**
     * Format timestamp for display
     */
    formatTimestamp(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },
    /**
     * Parse timestamp from string format (e.g., "1:30")
     */
    parseTimestamp(timestampStr) {
        const parts = timestampStr.split(':');
        if (parts.length !== 2)
            return 0;
        const mins = parseInt(parts[0], 10) || 0;
        const secs = parseInt(parts[1], 10) || 0;
        return mins * 60 + secs;
    },
    /**
     * Get annotation type info
     */
    getTypeInfo(type) {
        return exports.ANNOTATION_TYPE_CONFIG[type];
    },
    /**
     * Get all annotation types
     */
    getAllTypes() {
        return ['HIGHLIGHT', 'IMPROVEMENT', 'TECHNIQUE', 'GENERAL'];
    },
    /**
     * Validate annotation input
     */
    validateInput(input, videoDuration) {
        const errors = [];
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
    async generateTextSummary(videoId) {
        const exportData = await this.exportAnnotations(videoId);
        if (!exportData)
            return '';
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
    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },
    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes < 1024 * 1024) {
            return `${Math.round(bytes / 1024)} KB`;
        }
        return `${Math.round(bytes / (1024 * 1024))} MB`;
    },
};
