# Video & Annotations System

> Session video upload, playback, and coach annotations for visual feedback sharing with parents and athletes.

---

## Overview

The Video system enables coaches to record and upload training session footage, add timestamped annotations highlighting techniques and areas for improvement, and share videos with parents for review.

### Key Features

| Feature | Description |
|---------|-------------|
| Video Upload | Upload session recordings |
| Annotations | Timestamped markers with notes |
| Annotation Types | Technique, Improvement, Highlight |
| Sharing | Share videos with specific parents |
| Visibility Control | Private, Shared, or Public |
| Stats Tracking | View counts and engagement |

---

## Video Flow

```
COACH RECORDS SESSION            UPLOADS VIDEO
        │                            │
        ▼                            ▼
┌───────────────┐            ┌───────────────┐
│  Film session │            │  Get Upload   │
│  on device    │───────────▶│  URL (S3/GCS) │
└───────────────┘            └───────────────┘
                                    │
                                    ▼
                            ┌───────────────┐
                            │  Upload File  │
                            │  (Direct to   │
                            │   storage)    │
                            └───────────────┘
                                    │
                                    ▼
                            ┌───────────────┐
                            │  Create Video │
                            │  Record       │
                            └───────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│ Add Timestamp │          │ Share with    │          │ Parent Views  │
│ Annotations   │          │ Parents       │          │ Video         │
└───────────────┘          └───────────────┘          └───────────────┘
```

---

## Data Models

### SessionVideo

```typescript
interface SessionVideo {
  id: string;

  // Associations
  sessionId?: string;         // Linked session
  bookingId?: string;         // Linked booking
  coachId: string;
  coachName: string;
  athleteIds: string[];       // Athletes in video
  athleteNames: string[];

  // Content
  title: string;
  description?: string;
  videoUrl: string;           // Playback URL
  thumbnailUrl: string;       // Preview image
  duration: number;           // Seconds
  fileSize: number;           // Bytes

  // Annotations
  annotations: VideoAnnotation[];

  // Sharing
  visibility: VideoVisibility;
  sharedWith: string[];       // Parent IDs

  // Metadata
  createdAt: string;
  uploadStatus: UploadStatus;
  viewCount: number;
  tags: string[];
}
```

### VideoAnnotation

```typescript
interface VideoAnnotation {
  id: string;
  timestamp: number;          // Seconds into video
  label: string;              // Short title
  note?: string;              // Detailed explanation
  type: VideoAnnotationType;
}
```

### VideoAnnotationType

```typescript
type VideoAnnotationType =
  | 'TECHNIQUE'    // Good form/execution
  | 'IMPROVEMENT'  // Area to work on
  | 'HIGHLIGHT';   // Great moment
```

### VideoVisibility

```typescript
type VideoVisibility =
  | 'PRIVATE'      // Only coach can see
  | 'SHARED'       // Shared with specific parents
  | 'PUBLIC';      // Anyone can view
```

### UploadStatus

```typescript
type UploadStatus =
  | 'UPLOADING'    // Currently uploading
  | 'PROCESSING'   // Server processing
  | 'READY'        // Available for playback
  | 'FAILED';      // Upload/processing failed
```

---

## Annotation Types

| Type | Color | Icon | Use Case |
|------|-------|------|----------|
| TECHNIQUE | Blue | checkmark | Good execution to praise |
| IMPROVEMENT | Orange | arrow-up | Areas needing work |
| HIGHLIGHT | Gold | star | Exceptional moments |

---

## Video Service

**File:** `services/video-service.ts`

### Upload Operations

```typescript
const videoService = {
  // Get signed upload URL for direct-to-storage upload
  getUploadUrl(fileName, fileType): Promise<{
    uploadUrl: string;   // Pre-signed upload URL
    videoUrl: string;    // Final playback URL
  }>;

  // Create video record after successful upload
  createVideo(
    input: CreateVideoInput,
    videoUrl: string,
    thumbnailUrl: string,
    duration: number,
    fileSize: number
  ): Promise<SessionVideo>;
}
```

### Video Management

```typescript
const videoService = {
  // Retrieve videos
  getCoachVideos(coachId): Promise<SessionVideo[]>;
  getAthleteVideos(athleteId, parentId): Promise<SessionVideo[]>;
  getVideo(videoId): Promise<SessionVideo | null>;

  // Update & delete
  updateVideo(videoId, updates): Promise<SessionVideo>;
  deleteVideo(videoId): Promise<void>;
}
```

### Annotation Operations

```typescript
const videoService = {
  // Add annotation at specific timestamp
  addAnnotation(
    videoId: string,
    timestamp: number,
    label: string,
    type: VideoAnnotationType,
    note?: string
  ): Promise<VideoAnnotation>;

  // Remove annotation
  removeAnnotation(videoId, annotationId): Promise<void>;
}
```

### Sharing Operations

```typescript
const videoService = {
  // Share with parents
  shareVideo(videoId, parentIds): Promise<SessionVideo>;

  // Make private (remove all sharing)
  makePrivate(videoId): Promise<SessionVideo>;
}
```

### Statistics

```typescript
const videoService = {
  getCoachVideoStats(coachId): Promise<{
    totalVideos: number;
    totalViews: number;
    totalDuration: number;
    sharedCount: number;
    annotationCount: number;
  }>;
}
```

### Formatting Helpers

```typescript
const videoService = {
  formatDuration(seconds): string;  // "3:45"
  formatFileSize(bytes): string;    // "45 MB"
}
```

---

## UI Components

### Video Player
**File:** `components/video/video-player.tsx`

Custom video player with:
- Play/pause controls
- Seek bar with annotation markers
- Annotation list overlay
- Full-screen toggle
- Playback speed control

### Video Upload
**File:** `components/video/video-upload.tsx`

Upload interface with:
- File picker
- Upload progress indicator
- Thumbnail preview
- Title/description inputs
- Athlete tagging

### Video Annotation
**File:** `components/video/video-annotation.tsx`

Annotation creator/viewer:
- Tap-to-add at current timestamp
- Type selector
- Note editor
- Timeline markers

---

## Example Videos

### Session Video

```typescript
{
  id: 'vid_1',
  title: 'Finishing Drills - Weak Foot Practice',
  description: 'Great progress on weak foot finishing.',
  duration: 180,  // 3 minutes
  fileSize: 45000000,  // 45MB
  annotations: [
    {
      id: 'ann_1',
      timestamp: 15,
      label: 'Good technique',
      note: 'Notice the planted foot position',
      type: 'TECHNIQUE'
    },
    {
      id: 'ann_2',
      timestamp: 45,
      label: 'Area to improve',
      note: 'Follow through needs work',
      type: 'IMPROVEMENT'
    },
    {
      id: 'ann_3',
      timestamp: 120,
      label: 'Great finish!',
      type: 'HIGHLIGHT'
    }
  ],
  visibility: 'SHARED',
  sharedWith: ['parent_1'],
  viewCount: 5,
  tags: ['finishing', 'weak-foot', 'technique']
}
```

---

## Storage Architecture

### Cloud Storage (Production)

```
┌─────────────────┐
│  Mobile App     │
└────────┬────────┘
         │ 1. Request upload URL
         ▼
┌─────────────────┐
│  Backend API    │
└────────┬────────┘
         │ 2. Generate signed URL
         ▼
┌─────────────────┐
│  S3 / GCS       │◀──── 3. Direct upload
│  (Storage)      │
└────────┬────────┘
         │ 4. Webhook/poll
         ▼
┌─────────────────┐
│  Video Record   │
│  Created        │
└─────────────────┘
```

### Local Storage (Development)

Videos stored in AsyncStorage with mock URLs.

---

## Storage Keys

| Key | Purpose |
|-----|---------|
| `session_videos` | All video records |

---

## API Contracts

### Get Upload URL

```http
POST /api/videos/upload-url
Body: { fileName: string; fileType: string }
Response: { uploadUrl: string; videoUrl: string }
```

### Create Video

```http
POST /api/videos
Body: SessionVideo
Response: SessionVideo
```

### Get Coach Videos

```http
GET /api/videos?coachId=coach_1
Response: SessionVideo[]
```

### Get Athlete Videos

```http
GET /api/videos?athleteId=athlete_1
Response: SessionVideo[]
```

### Add Annotation

```http
POST /api/videos/:videoId/annotations
Body: { timestamp, label, type, note? }
Response: VideoAnnotation
```

### Share Video

```http
PATCH /api/videos/:videoId/share
Body: { parentIds: string[] }
Response: SessionVideo
```

---

## Integration Points

### With Booking Service
- Videos can be linked to specific bookings
- Session context provides athlete information

### With Notification Service
- Notify parents when videos are shared
- Alert on new annotations

### With Progress Tracking
- Video annotations inform skill assessments
- Visual evidence for progress reports

---

## Best Practices

### For Coaches

1. **Keep videos focused** - 3-5 minutes per clip
2. **Add context** - Use annotations to explain
3. **Highlight positives** - Balance improvement notes with praise
4. **Tag appropriately** - Makes videos searchable
5. **Share promptly** - Parents appreciate timely feedback

### For Video Naming

Use descriptive titles:
- ✅ "Passing Drill - Alex - Jan 15"
- ✅ "Match Highlights - U12 Final"
- ❌ "video_001.mp4"
- ❌ "Training"

---

## File References

| Purpose | Path |
|---------|------|
| Service | `services/video-service.ts` |
| Player Component | `components/video/video-player.tsx` |
| Upload Component | `components/video/video-upload.tsx` |
| Annotation Component | `components/video/video-annotation.tsx` |
| Types | `constants/types.ts` |
