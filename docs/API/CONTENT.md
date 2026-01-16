# Content API

> **Security Level: HIGH**

## Overview

The Content API manages videos, drills, and media uploads. Security focuses on access control, content ownership, and preventing unauthorized distribution.

---

## Security Implementation

### Upload Security
- **File type validation** (magic bytes, not just extension)
- **Size limits** enforced server-side
- **Virus scanning** on all uploads
- **Content scanning** for inappropriate material

### Access Control
- **Signed URLs** for all private content
- **Token-based streaming** for videos
- **Expiring links** (default 1 hour)
- **Geographic restrictions** available

### Content Protection
- **Watermarking** for coach content
- **DRM** for premium content
- **Download restrictions** configurable
- **Screenshot detection** (mobile)

---

## Video Endpoints

### GET /videos

List user's videos.

**Security:**
- User sees own videos
- Coaches see their content
- Athletes see shared videos

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| type | string | "uploaded", "received", "annotated" |
| athleteId | string | Filter by athlete (coaches) |
| limit | number | Max 50, default 20 |
| cursor | string | Pagination cursor |

**Response (200):**
```json
{
  "videos": [
    {
      "id": "vid_abc123",
      "title": "Backhand Technique Session",
      "thumbnail": "https://cdn.clubroom.app/videos/.../thumb.jpg",
      "duration": 180,
      "uploadedAt": "2026-01-15T14:00:00Z",
      "uploadedBy": {
        "id": "usr_coach",
        "name": "Sarah Johnson"
      },
      "sharedWith": ["ath_123"],
      "hasAnnotations": true,
      "annotationCount": 5
    }
  ],
  "nextCursor": "cursor_xyz",
  "hasMore": true
}
```

---

### GET /videos/:videoId

Get video details with playback URL.

**Security:**
- Authorized users only
- Signed streaming URL
- Access logged

**Response (200):**
```json
{
  "video": {
    "id": "vid_abc123",
    "title": "Backhand Technique Session",
    "description": "Focus on follow-through and footwork",
    "duration": 180,
    "resolution": "1080p",
    "uploadedAt": "2026-01-15T14:00:00Z",
    "uploadedBy": {
      "id": "usr_coach",
      "name": "Sarah Johnson"
    },
    "sharedWith": [
      {
        "id": "ath_123",
        "name": "Tom Smith"
      }
    ],
    "annotations": [
      {
        "id": "ann_001",
        "timestamp": 45.5,
        "type": "CIRCLE",
        "content": "Watch the racket angle here",
        "createdBy": "usr_coach"
      }
    ],
    "playback": {
      "url": "https://stream.clubroom.app/videos/vid_abc123/playlist.m3u8?token=xxx",
      "expiresAt": "2026-01-16T11:00:00Z"
    }
  }
}
```

---

### POST /videos/upload

Initiate video upload.

**Security:**
- Authenticated users
- Size limit: 500 MB
- Allowed formats: MP4, MOV, AVI
- Virus scanned before processing

**Request:**
```json
{
  "filename": "training_session.mp4",
  "contentType": "video/mp4",
  "size": 52428800,
  "title": "Training Session - Jan 15"
}
```

**Response (200):**
```json
{
  "upload": {
    "id": "upload_abc123",
    "uploadUrl": "https://upload.clubroom.app/videos/upload_abc123",
    "expiresAt": "2026-01-16T11:00:00Z",
    "maxSize": 524288000
  }
}
```

---

### POST /videos/upload/:uploadId/complete

Complete upload and process video.

**Security:**
- Validates upload completion
- Triggers processing pipeline
- Scans for inappropriate content

**Response (200):**
```json
{
  "video": {
    "id": "vid_new123",
    "status": "PROCESSING",
    "estimatedCompletion": "2026-01-16T10:15:00Z"
  }
}
```

**Processing Pipeline:**
1. Virus scan
2. Content moderation scan
3. Transcoding (multiple resolutions)
4. Thumbnail generation
5. Available for playback

---

### PUT /videos/:videoId

Update video metadata.

**Security:**
- Owner only
- Cannot change ownership

**Request:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "sharedWith": ["ath_123", "ath_456"]
}
```

**Response (200):**
```json
{
  "video": {
    "id": "vid_abc123",
    "title": "Updated Title",
    "updatedAt": "2026-01-16T10:00:00Z"
  }
}
```

---

### DELETE /videos/:videoId

Delete a video.

**Security:**
- Owner only
- Soft delete (recoverable 30 days)
- Removes all shares

**Response (204):**
No content.

---

### POST /videos/:videoId/annotations

Add annotation to video.

**Security:**
- Video owner or authorized coach
- Annotations linked to user

**Request:**
```json
{
  "timestamp": 45.5,
  "type": "ARROW",
  "coordinates": {
    "x1": 100,
    "y1": 200,
    "x2": 150,
    "y2": 250
  },
  "content": "Notice the foot placement"
}
```

**Response (201):**
```json
{
  "annotation": {
    "id": "ann_002",
    "timestamp": 45.5,
    "type": "ARROW",
    "content": "Notice the foot placement",
    "createdAt": "2026-01-16T10:00:00Z"
  }
}
```

**Annotation Types:**
| Type | Description |
|------|-------------|
| CIRCLE | Highlight area |
| ARROW | Point to element |
| LINE | Draw line |
| TEXT | Text overlay |
| DRAWING | Freeform drawing |

---

## Drill Endpoints

### GET /drills

List available drills.

**Security:**
- Public drills visible to all
- Coach's own drills
- Purchased/shared drills

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| sport | string | Filter by sport |
| level | string | Beginner/Intermediate/Advanced |
| category | string | Drill category |
| owned | boolean | Only owned drills |

**Response (200):**
```json
{
  "drills": [
    {
      "id": "drill_abc123",
      "title": "Forehand Cross-Court",
      "description": "Develop consistent cross-court forehands",
      "sport": "Tennis",
      "level": "Intermediate",
      "duration": 15,
      "thumbnail": "https://cdn.clubroom.app/drills/.../thumb.jpg",
      "createdBy": {
        "id": "usr_coach",
        "name": "Sarah Johnson"
      },
      "isPublic": true,
      "rating": 4.5,
      "usageCount": 234
    }
  ]
}
```

---

### POST /drills

Create a new drill.

**Security:**
- Coaches only
- Content validated
- Ownership recorded

**Request:**
```json
{
  "title": "Serve Toss Practice",
  "description": "Perfect your serve toss consistency",
  "sport": "Tennis",
  "level": "Beginner",
  "duration": 10,
  "steps": [
    {
      "order": 1,
      "instruction": "Stand at baseline with ball in tossing hand",
      "duration": 30
    },
    {
      "order": 2,
      "instruction": "Toss ball to target height without swinging",
      "duration": 60,
      "repetitions": 10
    }
  ],
  "equipment": ["Tennis balls", "Target marker"],
  "isPublic": false
}
```

**Response (201):**
```json
{
  "drill": {
    "id": "drill_new123",
    "title": "Serve Toss Practice",
    "createdAt": "2026-01-16T10:00:00Z"
  }
}
```

---

### POST /drills/:drillId/assign

Assign drill to athlete.

**Security:**
- Coach must have relationship with athlete
- Parent notified for minors
- Due date validated

**Request:**
```json
{
  "athleteId": "ath_123",
  "dueDate": "2026-01-20",
  "notes": "Complete before our next session",
  "frequency": "DAILY",
  "repetitions": 3
}
```

**Response (201):**
```json
{
  "assignment": {
    "id": "assign_abc123",
    "drillId": "drill_abc123",
    "athleteId": "ath_123",
    "dueDate": "2026-01-20",
    "status": "ASSIGNED",
    "createdAt": "2026-01-16T10:00:00Z"
  }
}
```

---

## File Upload Security

### Validation Pipeline

```
Upload Request
      │
      ▼
┌─────────────────┐
│ Size Validation │ ── Reject if > limit
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Type Validation │ ── Check magic bytes
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Virus Scan     │ ── ClamAV
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Content Scan    │ ── Inappropriate content
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Process & Store │ ── S3 with encryption
└─────────────────┘
```

### Upload Limits

| Content Type | Max Size | Formats |
|--------------|----------|---------|
| Video | 500 MB | MP4, MOV, AVI |
| Image | 10 MB | JPEG, PNG, HEIC |
| Document | 25 MB | PDF |
| Drill media | 50 MB | Mixed |

---

## Signed URL Security

### URL Generation

```
https://cdn.clubroom.app/videos/{videoId}/stream
  ?token={jwt_token}
  &expires={timestamp}
  &signature={hmac_signature}
```

### Token Contents

```json
{
  "sub": "usr_abc123",
  "resource": "vid_xyz789",
  "permissions": ["stream", "download"],
  "exp": 1705410000,
  "iat": 1705406400
}
```

### Signature Validation

- HMAC-SHA256 with server secret
- Validates: token + expires + resource
- Prevents URL tampering

---

## Data Protection

### Content Storage

| Type | Location | Encryption | Backup |
|------|----------|------------|--------|
| Videos | S3 | AES-256 at rest | Cross-region |
| Images | S3 | AES-256 at rest | Cross-region |
| Thumbnails | CDN | TLS in transit | Edge cached |
| Drills | Database | At rest | Daily |

### Retention

| Content | Retention |
|---------|-----------|
| Active videos | Until deleted |
| Deleted videos | 30 days (recoverable) |
| Thumbnails | With parent video |
| Access logs | 90 days |

---

## Error Codes

| Code | Description |
|------|-------------|
| CNT_001 | Video not found |
| CNT_002 | Upload too large |
| CNT_003 | Invalid file type |
| CNT_004 | Processing failed |
| CNT_005 | Access denied |
| CNT_006 | Signed URL expired |
| CNT_007 | Content policy violation |
| CNT_008 | Drill not found |
