"use strict";
/**
 * Annotation Service
 *
 * Handles video annotation CRUD operations for the Session Recording & Annotation feature.
 * Enables coaches to add timestamped comments on session videos and athletes to review them.
 *
 * API Integration Notes:
 * - GET /api/videos/:id/annotations - Get all annotations for a video
 * - POST /api/videos/:id/annotations - Create new annotation
 * - PATCH /api/videos/:id/annotations/:annotationId - Update annotation
 * - DELETE /api/videos/:id/annotations/:annotationId - Delete annotation
 * - GET /api/videos/:id/annotations/export - Export annotations as structured data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.annotationService = exports.ANNOTATION_TYPE_CONFIG = void 0;
const video_service_1 = require("./video-service");
const STORAGE_KEY = 'video_annotations';
const USE_MOCK = true;
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
exports.annotationService = {
    /**
     * Get an annotated video with all its annotations
     */
    async getAnnotatedVideo(videoId) {
        const video = await video_service_1.videoService.getVideo(videoId);
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
    async getVideoAnnotations(videoId) {
        const video = await video_service_1.videoService.getVideo(videoId);
        if (!video)
            return [];
        return video.annotations.sort((a, b) => a.timestamp - b.timestamp);
    },
    /**
     * Add a new annotation to a video
     */
    async addAnnotation(videoId, input, createdBy, createdByName) {
        const annotation = await video_service_1.videoService.addAnnotation(videoId, input.timestamp, input.label, input.type, input.note);
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
    async updateAnnotation(videoId, annotationId, updates) {
        const video = await video_service_1.videoService.getVideo(videoId);
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
            await video_service_1.videoService.removeAnnotation(videoId, annotationId);
            await video_service_1.videoService.addAnnotation(videoId, updatedAnnotation.timestamp, updatedAnnotation.label, updatedAnnotation.type, updatedAnnotation.note);
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
            await video_service_1.videoService.removeAnnotation(videoId, annotationId);
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
        const video = await video_service_1.videoService.getVideo(videoId);
        if (!video)
            return null;
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
        const video = await video_service_1.videoService.getVideo(videoId);
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
            const annotation = await this.addAnnotation(videoId, input, createdBy, createdByName);
            results.push(annotation);
        }
        return results;
    },
    /**
     * Clear all annotations from a video
     */
    async clearAnnotations(videoId) {
        const video = await video_service_1.videoService.getVideo(videoId);
        if (!video)
            return false;
        for (const annotation of video.annotations) {
            await video_service_1.videoService.removeAnnotation(videoId, annotation.id);
        }
        return true;
    },
    // Helper functions
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
};
