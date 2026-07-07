# Runtime Modes

Validated: 2026-04-16
Purpose: describe the app's actual runtime modes and the current integration seams between the Expo app and the API package.

## Canonical Sources

- `constants/config.ts`
- `services/api-client.ts`
- `services/auth-service.ts`
- `services/pre-api-live-mode-service.ts`
- `packages/config/src/env.ts`
- `apps/api/src/app.ts`

## Mode 1: Mock Local-First

Flags:

- `EXPO_PUBLIC_USE_MOCK=true`

Behavior:

- Feature services read and write through `apiClient`.
- `apiClient` persists to AsyncStorage-backed storage in app mode.
- This is now an explicit compatibility/demo mode, not the default runtime direction.

Use when:

- validating UI flows
- working on explicitly demo-only behavior without backend dependency
- extending retained mock compatibility paths

## Mode 2: Pre-API Live

Flags:

- `EXPO_PUBLIC_USE_MOCK=true`
- `EXPO_PUBLIC_PRE_API_LIVE_MODE=true`
- `EXPO_PUBLIC_PRE_API_LIVE_SEED_ON_AUTH=true`

Behavior:

- Retained as an inert compatibility mode.
- `services/pre-api-live-mode-service.ts` preserves the `start()` / `stop()` caller contract but no longer seeds relational data, creates synthetic messages/feed/notifications, or mutates booking/progress/invoice local state.
- `services/relational-demo-seed-service.ts` preserves the `ensureRelationalDemoSeeded()` caller contract but no longer creates or repairs local demo users, bookings, offerings, invites, family, club, safety, messaging, review, or coach-directory records.
- Live product behavior should come from real `/v1` services instead.

Use when:

- only while removing older pre-API flag wiring
- not for validating live product behavior

## Mode 3: Real API

Flags:

- `EXPO_PUBLIC_USE_MOCK=false`
- `EXPO_PUBLIC_PRE_API_LIVE_MODE=false`

Target behavior:

- Frontend still goes through `apiClient`
- Reads and writes should hit the Fastify API instead of local persistence
- This is now the default runtime direction for app/API development.

## Validated Repo Reality

Current validated runtime state:

- `constants/config.ts` defaults `api.baseUrl` to `http://localhost:4000`
- `constants/config.ts` now defaults `api.useMock` to `false`
- `constants/config.ts` now defaults pre-API live mode to `false`
- `services/auth-service.ts` derives its API origin from that config and calls `/v1/auth/*`
- `packages/config/src/env.ts` defaults the API server to port `4000`
- `packages/config/src/env.ts` now defaults `API_DATA_BACKEND` to `db` outside `NODE_ENV=test`; API tests explicitly set `NODE_ENV=test API_DATA_BACKEND=seed`
- `apps/api/src/app.ts` registers `/v1/*` route modules, including auth
- `apps/api/src/plugins/auth-context.ts` verifies bearer JWTs at runtime, while header auth override is limited to the API test harness
- `apps/api/src/lib/auth-runtime.ts` owns JWT issuance, refresh rotation, and runtime session revocation for `/v1/auth/*` and `/v1/me/sessions*`
- `apps/api/src/lib/ops-runtime.ts` now owns production startup validation plus `/v1/ready` readiness evaluation for config, database, and object-storage state
- `npm --prefix apps/api run release:preflight` now uses the same ops runtime to fail release builds when production guardrails are not met
- `apps/api/src/app.ts` wires the custom security plugin and explicit `API_TRUST_PROXY` Fastify setting; keep `API_TRUST_PROXY=false` for direct local/staging binds and set it to `true` only behind a trusted reverse proxy. Audit IP hashes use Fastify's resolved `request.ip` and never parse raw `x-forwarded-for` directly, so forwarded client IPs are only honored after proxy trust is enabled.
- Expo app config now defaults `web.output` to `single` for normal dev startup, and `npm run export:web` opts into `static` with `EXPO_WEB_OUTPUT=static`; local `expo start` no longer needs the static renderer unless explicitly requested
- Metro excludes root `.env*` files from the bundle graph. Staging env files are process inputs for Expo/API commands and smoke tooling, not app modules.
- `apiClient` keeps device/session runtime keys such as auth tokens, active child selection, offline queue, form drafts, sanitized onboarding resume drafts, and lightweight client preferences in local storage even when real API mode is enabled. Sensitive add-child medical/safeguarding drafts are not locally saved/restored. Server-owned product data must use explicit `/v1` service endpoints; the old generic `/api/:key` storage bridge is blocked in API mode, and generic reads/writes/removes for server-owned keys fail closed instead of returning caller fallbacks.
- Root `userService` does not treat local `USERS` as live authority in API mode. It can map the signed-in `AUTH_USER` session profile for compatibility display, but profile writes use `/v1/auth/me` and general user search fails closed until `/v1/users/search` exists.
- Coach review legacy read-model keys are mock/demo compatibility only. Booking-linked review status and submission use `/v1/bookings/:bookingId/reviews/me` and `/v1/bookings/:bookingId/reviews`, and coach profile review tabs read verified public reviews from `/v1/coaches/:coachId/reviews`.
- Rebook entry from booking detail uses `/v1/bookings/:bookingId/rebook-context` in real API mode before creating a new local booking draft, so repeat-booking context is copied only from backend-visible booking truth.
- Saved coach/favourite reads and writes use `/v1/me/favourite-coaches*` in real API mode. Local `favourites` storage remains mock/demo-only and cannot target another user in API mode.
- Squad invite local mirrors (`SQUAD_INVITES`, `SQUAD_SESSION_INVITES`, and `SQUAD_INVITE_HISTORY`) are mock/demo-only. API-mode session invites use `/v1/invites`; create requests fail validation before any backend write when the caller supplies unresolved placeholder context such as generic coach, parent, athlete, or focus labels. Dedicated squad invite/history authority is still missing.
- Booking series and initial recurring-plan booking generation now use `/v1/booking-series` in real API mode for create, list/detail, and cancel. Local booking-series and recurring-plan storage remain mock-mode behavior, while unsupported recurring mutations fail closed until backend semantics are added. Live booking cancellation uses `/v1/bookings/:bookingId/cancel` through `bookingService`; booking detail edits for scheduled time, duration, location, service type, objectives, notes, and GBP price use `PATCH /v1/bookings/:bookingId` with expected-version checks and audit events. Cancellation records read from `/v1/cancellation-records`, and family no-show reads plus proof-backed record/correction use `/v1/families/:familyId/no-shows`. Bare no-show counter writes remain mock/demo-only and fail closed in API mode unless the caller supplies booking or group-registration proof.
- Booking list/detail reads use `/v1/bookings*` in API mode and may mirror successful responses in memory for runtime projection only. Failed API reads return empty/null rather than falling back to stale local booking mirrors.
- Event RSVP submission now posts to `/v1/events/:eventId/rsvp`; real `db` mode writes `EventRsvp` through Prisma and audits allowed and denied paths. Session RSVP create/respond/list/count/reminder/delete now uses `/v1/group-sessions/:sessionId/rsvps*` and `/v1/session-rsvps*`; real `db` mode writes `SessionRsvp`, queues reminder `Notification` rows, and does not persist local `SESSION_RSVPS` outside mock mode. Club event list reads can use `/v1/clubs/:clubId/schedule` projections, while event detail/create/publish/cancel/reminder and event attendance/check-in use dedicated `/v1` authorities. Club create, detail, visibility, commercial-mode, and soft-delete management now use `/v1/clubs` and `/v1/clubs/:clubId`; real `db` mode stores `Club.city`, `Club.country`, and `Club.commercialMode` alongside soft-delete metadata. Head-coach task and standard create/update now use `/v1/clubs/:clubId/head-coach/tasks*` and `/v1/clubs/:clubId/head-coach/standards*`; real `db` mode writes `HeadCoachTask` and `HeadCoachStandard` and the oversight read projects those rows through the same scope gate. Coach verification status reads now use `/v1/coaches/:coachId/verification-status` in API mode; child booking DBS gates call that backend status route and fail closed when the route fails or returns missing/expired DBS. Coach-self verification evidence submission now uses `/v1/coaches/me/verifications/:type/documents`, attaching only private, available media owned by that coach; a new pending evidence upload does not downgrade a still-current approved verification, and reviewer/admin verification mutations still fail closed until dedicated `/v1` approval contracts exist. Academy is currently a club compatibility label: academy reads and compatible branding, invite, join, role, and removal writes route through club `/v1` contracts; academy-only create/delete/commercial-mode/visibility UI should use the club management contracts rather than a parallel authority.
- Legacy global school invite-code admin is mock-only; API mode uses club-scoped `/v1/clubs/:clubId/invite-codes*` through club settings and `clubAuthorityService`, and `hooks/use-invite-codes.ts` fails closed before local `clubroom.invite_codes` reads/writes.
- Coach-self availability templates and overrides use `/v1/coaches/me/availability/templates*` and `/v1/coaches/me/availability/overrides*` in API mode. Delegated/non-self availability template and override reads return empty models, and delegated/non-self writes fail closed until `/v1/coaches/:coachId/availability/templates*` and `/v1/coaches/:coachId/availability/overrides*` exist. Booking and invite slot reads continue to use `/v1/coaches/:coachId/availability/slots`; local invite-hold conflict summaries are mock/demo-only. The coach schedule hook no longer reads legacy `SESSION_OFFERINGS` or `BLOCKED_DATES` mirrors.
- Coach-self scheduling rules and cancellation policies use `/v1/coaches/me/scheduling-rules` in API mode. Non-self coach scheduling reads now use default rules and no cancellation policy instead of local `SCHEDULING_RULES`/`CANCELLATION_POLICIES` mirrors until `/v1/coaches/:coachId/scheduling-rules` exists; non-self writes fail closed.
- Coach roster local storage (`ROSTER` and `ROSTER_REMOVAL_HISTORY`) is mock/demo-only. API mode uses `/v1/coaches/:coachId/roster*` for booking-derived roster reads, durable coach-athlete roster links, status/tag/focus/notification overlays, private roster notes, soft removal, removal history, and undo. Roster removal hides the coach-athlete relationship, preserves athlete and booking history, and audits success/deny paths instead of hard-deleting athlete data; API roster list/detail/removal-history read failures surface backend errors instead of rendering empty local state.
- Athlete goal reads and create/update/delete now use `/v1/athletes/:athleteId/goals` and `/v1/goals/:goalId`; manual progress override uses `PATCH /v1/goals/:goalId/progress`; milestone create/update/complete/reopen/delete now uses `/v1/goals/:goalId/milestones*`. Athlete analytics and skill history reads now use `/v1/athletes/:athleteId/analytics` and `/v1/athletes/:athleteId/skills/history`, derived from backend progress, skill-assessment, and goal truth. Athlete badge-award reads now use db-aware `/v1/athletes/:athleteId/badges` and `/v1/sessions/:sessionId/badges`; badge award creation uses `/v1/athletes/:athleteId/badge-awards`; badge share/feed/seen helpers use audited `/v1/badge-awards/:awardId/*` action routes and no longer write local badge storage in API mode. Squad activity reads now use `/v1/athletes/:athleteId/squad-activity`, derived from backend squad assignment, completed bookings, public notes, public feedback, and badge awards while excluding coach-only/private feedback. Termly progress report generation can aggregate backend-backed services, and saved termly report snapshot persistence/history now uses `/v1/athletes/:athleteId/termly-reports` with backend `TermlyReportSnapshot` rows in API mode. Weekly recap notification due dispatch now uses `/v1/athletes/:athleteId/weekly-recaps/dispatch`, creates durable `Notification` rows, dedupes by week, and audits send/skip/deny decisions instead of writing local notification mirrors in API mode. Assigned-coach skill updates now use `POST /v1/athletes/:athleteId/skill-updates` and write audited `AthleteSkillAssessment` rows. Coach observations now use `/v1/athletes/:athleteId/coach-observations` and `/v1/coach-observations/:observationId` in API mode, backed by tagged `SessionNote` rows and assigned-coach athlete health write scope. Coach analytics reads now use `GET /v1/coaches/:coachId/analytics`, derived from backend booking, invoice, feedback, and skill-assessment truth. Drill library reads now use db-aware `/v1/drills`, with coach self/admin auth and audited reads across `Drill`, `DrillAssignment`, and `AssignmentSubmission`; direct drill library mutations and drill-assignment mutations remain mock/demo-only until dedicated `/v1/drills*` and `/v1/drill-assignments*` write contracts exist. My Progress homework completion reads task state from `/v1/athletes/:athleteId/practice-tasks` and writes `/v1/practice-tasks/:taskId/completion` in API mode; legacy `HOMEWORK_COMPLETION` proof URI storage is mock/demo-only. Real `db` mode reads/writes Prisma `Goal`/`Goal.progress`/`GoalMilestone` rows and reads/writes Prisma progress/skill rows; the seed importer carries that graph.
- Family-facing children hub session counts and average ratings now use the same `/v1/athletes/:athleteId/analytics` path through `analyticsQueryService`; it no longer reads local `coach_sessions` mirrors. API-mode child and family aggregate read failures surface as load errors instead of empty child lists, empty calendars, null progress, or zeroed overview defaults.
- Session completion no longer reads or writes legacy `session_offerings` storage in API mode. Individual booking completion uses `/v1/bookings/:bookingId/complete`; group attendance uses `/v1/group-session-registrations/:registrationId/attendance`; completed-booking `COACH_SESSIONS` ingestion and progress-report `COACH_SESSIONS` reads remain mock/demo-only. The legacy per-athlete development feedback editor now fails closed in API mode before local `COACH_SESSIONS` reads/writes until its load context is backed by `/v1/session-feedback` instead of device storage. Session-completion group/parent message shortcuts also fail closed before local `MESSAGES` reads/writes in API mode until the completion flow maps to real `/v1/message-threads/:threadId/messages` thread ids.
- Emergency quick-view reads use `/v1/athletes/:athleteId/medical`, `/v1/athletes/:athleteId/emergency-contacts`, and `/v1/athletes/:athleteId/consents` in API mode. API mode fails closed when those live reads fail and does not fall back to cached or empty emergency data; it may only coalesce in-flight duplicate reads, not serve a persistent frontend TTL cache. Mock/offline cache behavior is mock/demo-only. Consent replacements preserve prior `ChildConsent` rows via `supersededById`, and child profile SEN replacements soft-remove prior `ChildSenTag` rows instead of hard-deleting sensitive history.
- Coach roster consent dashboard aggregation uses `/v1/coaches/:coachId/roster/consents` in API mode, derived from the backend roster projection and athlete health consent rows. Local roster-derived consent summaries remain mock/demo-only.
- Booking-linked safety reports and athlete concern creation use `/v1/safeguarding/incidents` in API mode. Generic profile/message/review reports use `/v1/reports`. Legacy concern list/status-update helpers fail closed in API mode until a dedicated `/v1` concern list/update contract exists.
- User blocking uses `/v1/blocks` in API mode. The backend stores `UserBlock` rows, soft-removes unblocks, audits block list/status/create/remove actions, and `/v1/users/search` excludes active block relationships in either direction. Local `BLOCKED_USERS` storage remains mock/demo-only.
- User/coach follows, follow notification preferences, and follow requests use `/v1/follows` and `/v1/follow-requests` in API mode. The backend stores `UserFollow`/`UserFollowRequest` rows, blocks relationships when either side has an active block, soft-removes unfollows, audits reads/writes, and accepts follow requests into mutual follows; local `FOLLOWS` and `FOLLOW_REQUESTS` storage remains mock/demo-only.
- Coach discovery/profile reads no longer use local `COACH_DIRECTORY` fixtures in API mode. Discovery and public coach service rows are derived only from live `/v1/coaches/offerings`, `/v1/coaches/:coachId/offerings`, and `/v1/coaches/:coachId/reviews`; richer public profile fields need a dedicated `/v1` public coach profile/search contract.
- Community group, group-message, direct-message, and message-thread reads use `/v1/community-groups` and `/v1/message-threads` in API mode. Local `PARENT_GROUPS`, `GROUP_MESSAGES`, `MESSAGE_THREADS`, `MESSAGES`, and `MESSAGE_DELETED_IDS` overlays are mock/demo-only and are not merged into API-mode read results.
- Trust-ops retention run and self data-deletion request reads use `/v1/admin/retention-runs` and `/v1/me/data-deletion-requests` in API mode. Real `db` mode reads Prisma/fixture retention/deletion rows through the trust-access repository and audits sensitive reads instead of using the seed store.
- Notification inbox reads, read receipts, dismissals, clear-all, and preferences use `/v1/me/notifications*` in API mode. Local `NOTIFICATIONS` overlays and demo notification seeding are mock-only; client-side notification create/send helpers fail closed in API mode because the backend route that owns the product action must create real notification rows.
- Native calendar sync preferences remain device-local in every runtime mode because they control the current device's calendar integration. `calendar-service.ts` no longer calls legacy `/api/users/:id/calendar-settings`; server-owned bookings, sessions, and club events still come from their `/v1` authorities before export.
- Account privacy settings now use `GET/PATCH /v1/me/privacy-settings` in API mode and persist to backend-owned `UserPrivacySetting`; local privacy setting storage is mock/demo-only.
- Coach payout methods and withdrawals use audited simulated-provider `/v1/coaches/me/payout-methods*` and `/v1/coaches/me/withdrawals*` routes in API mode; no real money is wired. Saved direct-payment instruction reads and edits use `/v1/coaches/me/payment-instructions`, persist to backend `CoachPaymentInstruction`, and audit changed fields without storing raw bank text in audit metadata. Local payment instruction storage remains mock/demo-only.
- Coach travel radius settings use `/v1/coaches/me/travel-settings` in API mode, persist on `CoachProfile.travelRadiusMiles`, `acceptsTravelSessions`, and `acceptsRemoteSessions`, and audit reads/writes. Local `COACH_TRAVEL_SETTINGS` storage remains mock/demo-only.
- Coach trial-session settings, usage, and trial-to-regular conversion tracking use `/v1/coaches/:coachId/trial-offering`, `/v1/trial-offerings`, `/v1/coaches/:coachId/trial-usages`, and `/v1/coaches/:coachId/trial-conversions` in API mode. The backend stores `CoachTrialOffering` rows, derives usage/conversion proof from booking-backed audit events, and local `TRIAL_*` storage remains mock/demo-only. API-mode conversion checks require the coach scope and fail closed instead of returning a local/default conversion state.
- Static web export uses `utils/runtime-environment.ts` to detect Expo static rendering. Local storage reads/writes become no-ops during static rendering, and constructor-time service hydration must be guarded because route-module evaluation happens before the browser runtime exists.

Implication:

- The auth transport seam is now contract-aligned for local development.
- Runtime `/v1` auth no longer accepts client-supplied identity headers in the app/server path.
- Runtime `/v1` auth is no longer using the temporary dev-session token model.
- Mock mode remains an explicit compatibility/demo mode. Pre-API live mode is retained as no-op compatibility wiring while live product behavior moves to `/v1`.
- Backend `/v1` routes are real and API mode is the default direction, but broader endpoint migration and authz follow-through still need work before every retained surface is db-backed.
- Production server startup now fails fast on blocking config mistakes instead of booting with silent auth/payment misconfiguration.
- `/v1/ready` no longer returns placeholder `unknown` checks; it reports real `ready`, `degraded`, or `down` status and returns `503` when the runtime is not release-ready.
- Release preflight now runs under production semantics with checked-in Prisma migrations. The remaining blockers are real production env/db/storage requirements plus any still-unmigrated seed-only routes.

## Staging Readiness Tooling

Use `node ./scripts/db-staging-preflight.js` before switching a serious rehearsal to `API_DATA_BACKEND=db`.
The preflight loads `.env.staging.local` by default when present, without overriding already-exported shell variables.

The preflight checks:

- staging env requirements for database, JWT, password reset email delivery, dev-outbox disabled state, simulated payment return origins, simulated payment secret, object storage, and Sentry warnings
- checked-in Prisma schema and migration presence
- local tool availability for API tests, root typecheck, Prettier, and Expo

Use `node ./scripts/db-staging-preflight.js --strict` as the hard gate once the staging environment values are expected to exist.
Use `node ./scripts/db-staging-preflight.js --write` to write transient outputs under `reviews/`.

For API-mode staging startup, start Fastify with the same staging env the app and smoke runner use: `npm --prefix apps/api run dev:staging` or `npm run api:dev:staging`.
The canonical staging command is intentionally non-watch so readiness smoke does not depend on local file-watcher limits.
Use `npm --prefix apps/api run dev:staging:watch` only when active API editing needs reload behavior and the local OS watcher limit can support it.
Use `npm run smoke:api-mode` before starting Expo in API mode. It loads `.env.staging.local`, confirms `EXPO_PUBLIC_USE_MOCK=false`, and verifies the configured Fastify API responds at `/v1/ready`.
If the configured API URL is a LAN address, the API must bind to `API_HOST=0.0.0.0`; otherwise loopback can respond while the app-configured origin still fails.
Use `npm run smoke:api-mode:strict` before release-ready staging rehearsal; strict mode requires `/v1/ready` to report `ready`, not merely reachable.

Use `npm run smoke:staging` after migrations and seed import are applied to prove the db-backed API path against the configured staging Supabase project.
The smoke run loads `.env.staging.local` when present and verifies bearer auth, identity, coach profile/offerings, bookable slots, direct booking creation, invoice generation, simulated payment confirmation, coach delivery completion with attendance/session-note proof readback, allowed family/athlete sensitive reads, denied unrelated-athlete sensitive reads, group-session creation/registration, private signed upload/readback, and community/media read surfaces.
It treats release-only delivery/observability config (`PASSWORD_RESET_EMAIL_DELIVERY_MISSING`, legacy `PASSWORD_RESET_EMAIL_WEBHOOK_MISSING`, `PASSWORD_RESET_DEV_OUTBOX_ENABLED`, `SENTRY_DSN_MISSING`, and `SENTRY_RELEASE_DEFAULT`) as smoke warnings because strict staging preflight owns those release blockers, but fails on database, object-storage, auth, booking, payment, family, or media route drift.

Use `npm run launch:readiness` for the launch automation runner. It writes timestamped and latest reports under `reviews/`, runs `audit:worktree:strict`, `verify:slice:full`, `audit:agentic`, `audit:db:stage:strict`, `smoke:password-reset-webhook`, `smoke:api-mode:strict`, `smoke:staging`, and `ui:flows:run`, starts local staging API/UI servers when needed, rejects stale local API servers with launch-incompatible rate limits, paces the browser flow gate, and records live payment-provider cutover as deferred while keeping simulated/manual money-state safety in scope. The strict DB staging preflight connects to the configured Supabase/Postgres database and checks applied Prisma migrations plus schema columns required by current `/v1` db-mode routes.

## Safe Working Rules

1. Do not bypass `apiClient` in feature code.
2. When touching auth or API URL config, update both the app-side config and the API package assumptions together.
3. When switching a flow from mock to real API, keep the service contract stable and move the source of truth behind the service boundary.
4. Use `EXPO_PUBLIC_USE_MOCK=true` and `API_DATA_BACKEND=seed` only as explicit demo/test compatibility opt-ins.
