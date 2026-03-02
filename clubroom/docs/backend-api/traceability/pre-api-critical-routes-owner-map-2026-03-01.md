# Pre-API Critical Route Owner Map (2026-03-01)

**Purpose**: Define one canonical critical-route set for pre-API cutover and map each route cluster to backend dependency owner modules.

## Critical Route Set Definition
The critical set is the union of:
1. Runtime profile routes from `scripts/ui-flow-checks-50.mjs` (`pre-api-core` + `trust-core`)
2. Placement-gated routes from `scripts/pre-api-placement-gate.js`
3. Trust/Ops end-flow routes from `__tests__/safety/trust-ops-end-flows.test.ts`
4. Booking/Revenue bilateral contract anchors in `docs/backend-api/traceability/booking-revenue-v1.md`

## Owner Registry
| Owner key | Planned backend module | Spine |
|---|---|---|
| `home-aggregate` | `apps/api/modules/home-aggregate` | Cross-spine |
| `community-social` | `apps/api/modules/community-social` | Community & Growth |
| `messaging-realtime` | `apps/api/modules/messaging` | Community & Growth |
| `notifications-preferences` | `apps/api/modules/notifications` | Community & Growth |
| `clubs-memberships` | `apps/api/modules/clubs-memberships` | Community & Growth |
| `events-rsvp` | `apps/api/modules/events` | Community & Growth |
| `referrals-growth` | `apps/api/modules/referrals` | Community & Growth |
| `booking-core` | `apps/api/modules/booking-core` | Booking, Availability & Revenue |
| `group-sessions` | `apps/api/modules/group-sessions` | Booking, Availability & Revenue |
| `invite-orchestration` | `apps/api/modules/invites` | Booking, Availability & Revenue |
| `revenue-reconciler` | `apps/api/modules/revenue-reconciler` | Booking, Availability & Revenue |
| `progress-core` | `apps/api/modules/progress-core` | Development & Analytics |
| `drills-assignments` | `apps/api/modules/drills` | Development & Analytics |
| `media-video` | `apps/api/modules/media-video` | Development & Analytics |
| `analytics-readmodels` | `apps/api/modules/analytics-readmodels` | Development & Analytics |
| `family-athlete` | `apps/api/modules/family-athlete` | Trust, Safety & Ops |
| `trust-safeguarding` | `apps/api/modules/trust-ops` | Trust, Safety & Ops |
| `verification` | `apps/api/modules/verification` | Trust, Safety & Ops |
| `identity-access` | `apps/api/modules/identity-access` | Trust, Safety & Ops |
| `retention-legal` | `apps/api/modules/retention-legal` | Trust, Safety & Ops |

## Route Cluster Owner Map
| Critical route cluster | Why critical | Primary endpoint(s) | Backend dependency owner |
|---|---|---|---|
| `/` | role home is first render path for all users | `GET /v1/home` | `home-aggregate` |
| `/(tabs)/messages`, `/chat`, `/chat/[threadId]` | pre-api core runtime coverage | `GET/POST /v1/message-threads`, `GET/POST /v1/message-threads/:id/messages` | `messaging-realtime` |
| `/discover/map`, `/discover-sessions`, `/book-coach`, `/favourites` | find-coach/discovery entrypoints from placement + runtime | `GET /v1/discovery/coaches`, `GET /v1/discovery/sessions`, `POST/DELETE /v1/favourites*` | `community-social` |
| `/(tabs)/feed`, `/(modal)/create-post`, `/(modal)/post-detail` | social core surface | `GET/POST /v1/posts`, `POST /v1/posts/:id/comments`, `POST /v1/posts/:id/reactions` | `community-social` |
| `/community`, `/community/[groupId]` | group visibility and memberships | `GET/POST /v1/community-groups`, `POST /v1/community-groups/:id/memberships` | `community-social` |
| `/(tabs)/notifications`, `/settings/notifications*` | user preference and inbox settings | `GET /v1/me/notifications`, `GET/PATCH /v1/me/notification-preferences` | `notifications-preferences` |
| `/(tabs)/club-hub`, `/club/*`, `/squads/[id]/invite` | club/squad paths are user-visible and placement-gated | `GET/POST /v1/clubs`, `GET/POST/PATCH /v1/clubs/:clubId/memberships`, `GET/POST/PATCH /v1/clubs/:clubId/squads` | `clubs-memberships` |
| `/events*`, `/session/[id]/rsvp` | event participation/RSVP path | `GET/POST /v1/events`, `POST /v1/events/:eventId/rsvp` | `events-rsvp` |
| `/referrals/invite` | growth/referral flow | `POST /v1/referrals/codes`, `GET /v1/referrals/events` | `referrals-growth` |
| `/book/[coachId]/*` | booking wizard contract-critical flow | `GET /v1/coaches/:coachUserId/availability/slots`, `POST /v1/bookings` | `booking-core` |
| `/(tabs)/bookings`, `/(tabs)/bookings/[id]` | booking list/detail runtime core | `GET /v1/bookings`, `GET /v1/bookings/:bookingId` | `booking-core` |
| `/booking/[id]/cancel` | cancellation policy + status transition | `POST /v1/bookings/:bookingId/cancel` | `booking-core` |
| `/bookings/[id]/counter` | counter/reschedule path | `POST /v1/bookings/:bookingId/reschedule-request` | `booking-core` |
| `/(tabs)/bookings/objectives`, `/(tabs)/bookings/statistics` | placement gate requires these to remain wired | `GET /v1/bookings/:bookingId/objectives`, `GET /v1/bookings/:bookingId/statistics` | `booking-core` + `analytics-readmodels` |
| `/group-sessions`, `/group-sessions/[id]`, `/group-sessions/create` | coach + parent/athlete group-session lifecycle | `GET/POST /v1/group-sessions`, `GET /v1/group-sessions/:id` | `group-sessions` |
| `/group-sessions/[id]/roster` | trust/ops route for attendance + injury capture | `GET /v1/group-sessions/:id/roster`, `POST /v1/group-sessions/:id/attendance`, `POST /v1/athletes/:athleteId/injuries` | `group-sessions` + `family-athlete` |
| `/sessions/create`, `/session-invites/*`, `/invites`, `/coach-invites` | invite orchestration and booking creation path | `GET /v1/invites`, `POST /v1/invites/:inviteId/respond` | `invite-orchestration` |
| `/manage/bookings` | coach ops booking console | `GET /v1/bookings?scope=manage`, `PATCH /v1/bookings/:bookingId` | `booking-core` |
| `/(tabs)/earnings`, `/analytics/revenue`, `/invoices*`, `/payments` | revenue and reconciler paths | `GET /v1/coaches/me/invoices`, `GET /v1/invoices/:invoiceId`, `POST /v1/invoices/:invoiceId/mark-paid|mark-unpaid|write-off|restore` | `revenue-reconciler` |
| `/development/my-progress`, `/development/child-progress/[childId]` | runtime development core | `GET /v1/athletes/:athleteId/progress` | `progress-core` |
| `/development/session/[sessionId]`, `/session/[id]/complete`, `/session-notes/[bookingId]` | development end-flow writes and trust handoff | `GET/POST/PATCH /v1/session-notes`, `POST /v1/athletes/:athleteId/skills/assessments` | `progress-core` |
| `/goals*` | athlete objective lifecycle | `GET/POST/PATCH /v1/athletes/:athleteId/goals` | `progress-core` |
| `/skills*` | skill rollups and assessments | `GET /v1/athletes/:athleteId/skills`, `POST /v1/athletes/:athleteId/skills/assessments` | `progress-core` |
| `/(tabs)/badges`, `/badges`, `/development/badges`, `/children/badges/[childId]` | achievement surfaces across roles | `GET /v1/athletes/:athleteId/badges`, `POST /v1/athletes/:athleteId/badges` | `progress-core` |
| `/athlete/journal` | athlete reflection data path | `GET/POST/PATCH /v1/athletes/:athleteId/journal-entries` | `progress-core` |
| `/drills*` | assignment and completion evidence path | `GET/POST /v1/drills`, `POST /v1/drill-assignments`, `POST /v1/drill-assignments/:id/submissions` | `drills-assignments` |
| `/videos/upload`, `/videos/[id]` | media upload and annotation path | `POST /v1/uploads/init`, `POST /v1/uploads/:uploadSessionId/complete`, `POST /v1/videos`, `GET /v1/videos/:videoId`, `POST/PATCH /v1/videos/:videoId/annotations*` | `media-video` |
| `/analytics/[athleteId]`, `/analytics/[athleteId]/goals` | athlete analytics route contract | `GET /v1/athletes/:athleteId/analytics`, `GET /v1/athletes/:athleteId/analytics/goals` | `analytics-readmodels` |
| `/health`, `/health/injuries`, `/health/log`, `/health/[id]` | explicit injury reporting access requirement | `GET/POST/PATCH /v1/athletes/:athleteId/injuries` | `family-athlete` |
| `/child/[id]/medical` | trust-critical medical access | `GET/PATCH /v1/athletes/:athleteId/medical` | `family-athlete` |
| `/child/[id]/emergency` | trust-critical emergency data | `GET/PATCH /v1/athletes/:athleteId/emergency-contacts` | `family-athlete` |
| `/roster/[athleteId]/raise-concern` | safeguarding entrypoint for coach | `POST /v1/safeguarding/incidents` | `trust-safeguarding` |
| `/(tabs)/bookings/report-problem` | safeguarding escalation from booking flow | `POST /v1/safeguarding/incidents` | `trust-safeguarding` |
| `/verification*` | compliance onboarding | `POST /v1/coaches/me/verifications/:type/documents`, `GET /v1/coaches/me/verifications` | `verification` |
| `/family`, `/family/calendar`, `/family/spending`, `/children` | parent family operational core | `GET /v1/families/:familyId`, `GET /v1/families/:familyId/calendar`, `GET /v1/families/:familyId/spending` | `family-athlete` + `analytics-readmodels` |
| `/family/sharing`, `/(modal)/add-child`, `/(modal)/edit-child-profile`, `/(modal)/edit-child-sen` | guardian sharing and child profile ownership | `POST /v1/families/:familyId/guardians`, `POST /v1/athletes`, `PATCH /v1/athletes/:athleteId`, `PUT /v1/athletes/:athleteId/consents` | `family-athlete` |
| `/settings`, `/settings/help`, `/settings/privacy*`, `/settings/terms`, `/settings/account` | placement-gated legal/account surfaces | `GET /v1/me`, `GET /v1/me/sessions`, `POST /v1/me/sessions/revoke-all`, `POST /v1/me/data-deletion-requests` | `identity-access` + `retention-legal` |
| `/manage` | operations shell for coach/admin | `GET /v1/manage/summary`, `POST /v1/admin/break-glass/start`, `POST /v1/admin/break-glass/:id/end` | `trust-safeguarding` + `retention-legal` |

## How To Check All Critical Routes
1. Run placement gate: `npm run gate:pre-api-placement`
2. Run trust/ops contract tests: `npm run test:safety`
3. Run runtime profile proof (login + route access): `npm run ui:flows:pre-api-core`
4. Run trust-specific runtime profile: `npm run ui:flows:trust-core`
5. For each route cluster in this file, verify endpoint contract exists in `docs/backend-api/ROUTE_INVENTORY_V1.md` or spine traceability docs.
6. Fail readiness if any cluster lacks endpoint mapping, owner key, or authz/audit rule reference.

## How To Smash It (Pre-API Failure Strategy)
1. Double-submit stress: repeat `POST` actions (book, cancel, register, concern, invoice transitions) with same and different idempotency keys.
2. Concurrency stress: run two sessions against the same booking/session/invoice and force race conflicts.
3. Authz abuse: cross-role attempts for child medical, safeguarding cases, and finance transitions.
4. Offline/retry chaos: cut network at submit, replay writes, and assert exactly-once behavior.
5. Payload abuse: oversize notes/objectives/media metadata, invalid enums, and malformed IDs.
6. Deep-link abuse: load protected routes directly without expected context params and assert safe failure (`401/403/404`, no leakage).

## Pre-API Exit Checklist
- Every route cluster above has endpoint + owner mapping.
- Every write endpoint in mapped clusters has idempotency requirement.
- Conflict-prone writes define `409` behavior and UI handling.
- Sensitive reads/writes have audit event coverage.
- Runtime route checks and trust tests are green on latest run.
