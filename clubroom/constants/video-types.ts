/**
 * Video Types
 *
 * Video management, annotations, and related types.
 */

// ============================================================================
// VIDEO MANAGEMENT
// ============================================================================

export type VideoAnnotationType = 'HIGHLIGHT' | 'IMPROVEMENT' | 'TECHNIQUE' | 'GENERAL';

export interface VideoAnnotation {
  id: string;
  timestamp: number;
  label: string;
  note?: string;
  type: VideoAnnotationType;
  /** ID of the user who created the annotation */
  createdBy?: string;
  /** Name of the user who created the annotation */
  createdByName?: string;
  /** When the annotation was created */
  createdAt?: string;
  /** When the annotation was last updated */
  updatedAt?: string;
}

export interface SessionVideo {
  id: string;
  sessionId?: string;
  bookingId?: string;
  coachId: string;
  coachName: string;
  athleteIds: string[];
  athleteNames: string[];
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  fileSize: number;
  annotations: VideoAnnotation[];
  visibility: 'PRIVATE' | 'SHARED' | 'PUBLIC';
  sharedWith: string[];
  createdAt: string;
  uploadStatus: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';
  viewCount: number;
  tags: string[];
}

/**
 * Extended annotation data for export/sharing purposes
 */
export interface AnnotationExport {
  /** Video title */
  videoTitle: string;
  /** Video duration in seconds */
  videoDuration: number;
  /** Coach name */
  coachName: string;
  /** Athlete names */
  athleteNames: string[];
  /** Export timestamp */
  exportedAt: string;
  /** Annotations sorted by timestamp */
  annotations: {
    timestamp: number;
    timestampFormatted: string;
    label: string;
    note?: string;
    type: VideoAnnotationType;
    typeLabel: string;
  }[];
}

/**
 * Annotated video with full annotation details
 */
export interface AnnotatedVideo {
  /** Unique video ID */
  id: string;
  /** Optional session ID this video belongs to */
  sessionId?: string;
  /** Video URL for playback */
  videoUrl: string;
  /** Thumbnail URL for preview */
  thumbnailUrl: string;
  /** Video duration in seconds */
  duration: number;
  /** Video title */
  title: string;
  /** Video description */
  description?: string;
  /** Coach who uploaded the video */
  coachId: string;
  /** Coach name */
  coachName: string;
  /** Athletes featured in the video */
  athleteIds: string[];
  /** Athlete names */
  athleteNames: string[];
  /** All annotations on this video, sorted by timestamp */
  annotations: VideoAnnotation[];
  /** When the video was created */
  createdAt: string;
  /** Video visibility status */
  visibility: 'PRIVATE' | 'SHARED' | 'PUBLIC';
  /** List of user IDs the video is shared with */
  sharedWith: string[];
  /** Number of times the video has been viewed */
  viewCount: number;
  /** Tags for categorization */
  tags: string[];
}
