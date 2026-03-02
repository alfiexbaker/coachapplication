# Development + Analytics V1 Traceability Matrix (UI <-> API <-> Data <-> AuthZ)

**Contract status**: Signed for pre-API freeze (2026-03-01)  
**Spine**: Development & Analytics

This matrix freezes Development/Analytics behavior expected by current UI routes, including progress, goals, skills, badges, drills, and media/video dependencies.

## Backend Dependency Owners
| Owner key | Module owner scope (planned) | Primary sprint anchor |
|---|---|---|
| `progress-core` | `apps/api/modules/progress-core` (progress reads, notes, goals, skills, badges) | Sprint 07 |
| `drills-assignments` | `apps/api/modules/drills` (drill library, assignment lifecycle, submissions) | Sprint 07 |
| `media-video` | `apps/api/modules/media-video` (upload pipeline, video records, annotations) | Sprint 08 |
| `analytics-readmodels` | `apps/api/modules/analytics-readmodels` (rollups for dashboards) | Sprint 07 + Sprint 11 |
| `trust-safeguarding` | `apps/api/modules/trust-ops` (concern handoff paths from development screens) | Sprint 10 |

## Critical UI Contract Table
| Flow | Critical UI route(s) | UI anchors (components/services) | Planned API endpoint(s) | Backend dependency owner | Mock-only assumption now | Migration order |
|---|---|---|---|---|---|---|
| Athlete + parent progress dashboards | `/development/my-progress`, `/development/child-progress/[childId]`, `/analytics/[athleteId]` | `services/progress-service.ts`, progress components | `GET /v1/athletes/:athleteId/progress`, `GET /v1/athletes/:athleteId/progress/timeline`, `GET /v1/athletes/:athleteId/analytics` | `progress-core` + `analytics-readmodels` | progress values are seeded/derived locally | Development step 1 |
| Session completion feedback (group) | `/session/[id]/complete` | `components/session/*`, progress write handlers | `POST /v1/session-notes`, `POST /v1/athletes/:athleteId/skills/assessments`, `POST /v1/athletes/:athleteId/progress-events` | `progress-core` | completion writes are local only | Development step 1 |
| Session review + concern handoff (1:1) | `/development/session/[sessionId]` | session screen + concern CTA wiring | `GET /v1/session-notes?bookingId=:bookingId`, `PATCH /v1/session-notes/:noteId`, `POST /v1/safeguarding/incidents` | `progress-core` + `trust-safeguarding` | concern handoff currently routes within UI only | Development step 1 |
| Session notes detail | `/session-notes/[bookingId]` | session notes screens/components | `GET /v1/session-notes?bookingId=:bookingId`, `POST /v1/session-notes`, `PATCH /v1/session-notes/:noteId` | `progress-core` | note visibility is local-role filtered | Development step 2 |
| Goals CRUD | `/goals`, `/goals/create`, `/goals/[id]` | goals components + hooks | `GET /v1/athletes/:athleteId/goals`, `POST /v1/athletes/:athleteId/goals`, `PATCH /v1/goals/:goalId` | `progress-core` | goal completion state is device-local | Development step 2 |
| Skills and category details | `/skills`, `/skills/[category]` | skills hooks/components | `GET /v1/athletes/:athleteId/skills`, `POST /v1/athletes/:athleteId/skills/assessments` | `progress-core` | rollups computed from local fixtures | Development step 2 |
| Badges and achievements | `/(tabs)/badges`, `/badges`, `/development/badges`, `/children/badges/[childId]` | badge services/components | `GET /v1/athletes/:athleteId/badges`, `POST /v1/athletes/:athleteId/badges` | `progress-core` | badge awards seeded and static | Development step 3 |
| Athlete journal | `/athlete/journal` | journal screens + entry forms | `GET /v1/athletes/:athleteId/journal-entries`, `POST /v1/athletes/:athleteId/journal-entries`, `PATCH /v1/journal-entries/:entryId` | `progress-core` | journal storage is AsyncStorage only | Development step 3 |
| Drill library + assignment + evidence | `/drills`, `/drills/[id]`, `/drills/assign`, `/drills/create`, `/drills/library` | `services/drill-service.ts`, drills UI | `GET /v1/drills`, `POST /v1/drills`, `POST /v1/drill-assignments`, `POST /v1/drill-assignments/:id/submissions` | `drills-assignments` | challenge/submission lifecycle not durable across devices | Development step 4 |
| Video upload/view/annotation | `/videos/upload`, `/videos/[id]` | `services/video-service.ts`, media/video components | `POST /v1/uploads/init`, `POST /v1/uploads/:uploadSessionId/complete`, `POST /v1/videos`, `GET /v1/videos/:videoId`, `POST /v1/videos/:videoId/annotations`, `PATCH /v1/videos/:videoId/annotations/:annotationId` | `media-video` | upload pipeline is local-only and bypasses malware/consent gates | Development step 5 |

## Migration Order (Development Spine)
1. Progress read models + session completion/notes contracts
2. Goals + skills APIs with visibility and version checks
3. Badges + journal durability and dedupe/idempotency
4. Drill assignment/submission workflows
5. Video/media upload + annotation pipeline with scan/consent gates

## Freeze Notes
- Routes include trust crossover for concern handoff because end-flow context comes from development screens.
- Any new development route (progress/goals/skills/badges/drills/video) must map here before backend cutover.
