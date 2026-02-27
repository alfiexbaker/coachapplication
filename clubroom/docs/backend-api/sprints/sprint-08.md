# Sprint 08 - Media, Video, Annotations, and Secure Upload Pipeline

## Goal
Provide production-safe media/video APIs with signed URLs, quarantine + malware scan, consent enforcement, and annotation support.

## Dependencies
- Sprint 03 (consents)
- Sprint 07 (progress/video consumers)

## Scope
- media object registry
- upload session initialization/finalization
- signed upload/download URLs
- quarantine workflow and malware scan integration
- video metadata and annotations
- consent-gated publishing/visibility rules

## Codebase Alignment Anchors
- `app/videos/**`
- `components/video/*`
- `components/session/media-*`
- `services/video-service.ts`
- `services/media-service.ts`
- progress session completion flows in `components/session/*`

## Tables / Schema
- `media_objects`
- `upload_sessions`
- `malware_scan_results`
- `videos`
- `video_annotations`

## Endpoints (examples)
- `POST /v1/uploads/init`
- `POST /v1/uploads/:uploadSessionId/complete`
- `GET /v1/media/:mediaId/download-url`
- `POST /v1/videos`
- `GET /v1/videos/:videoId`
- `POST /v1/videos/:videoId/annotations`
- `PATCH /v1/videos/:videoId/annotations/:annotationId`

## Security / AuthZ / Audit Notes
- object storage buckets are private only
- signed URLs expire quickly and are resource/user scoped
- unscanned or quarantined objects are not exposed to UI consumers
- consent checks apply before media/video visibility grants
- media and annotation writes audited; sensitive views audited when applicable

## Test Gates
- upload init/complete contract tests
- signed URL expiry and wrong-user denial tests
- malware-positive quarantine tests
- consent-gated media access tests
- annotation authz and update tests

## Exit Criteria
- Media/video uploads and annotations are secure, auditable, and usable by existing UI flows
