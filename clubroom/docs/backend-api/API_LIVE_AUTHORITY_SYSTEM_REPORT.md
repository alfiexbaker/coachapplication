# API Live Authority System Report

Snapshot date: 2026-07-16

This is a progress matrix, not a new source of truth. Canonical runtime truth remains in:

- `docs/backend-api/ROUTE_INVENTORY_V1.md`
- `docs/architecture/service-ownership-map.md`
- `docs/architecture/entity-relationship-map.md`
- `packages/db/prisma/schema.prisma`

## Current Read

Overall progress toward "all product features use live `/v1` backend authority" is roughly 97% API-runtime operational and about 90% whole-app confidence for the current v1 cutover.

The API spine is real: the current route inventory has no remaining `planned` or `scaffolded` `/v1` rows, and auth, club authority, coach self and public profile projection, booking, cancellation-record reads, invoices, simulated payments/payouts, family/athlete, medical/consent, coach verification status, progress, detailed session feedback, media, notifications, account privacy, club events, event athlete invites, roster management, delegated availability, and trust-admin audit surfaces have `/v1` routes and focused tests. The app is not yet external-release complete. Remaining risk is mostly proof depth: mobile E2E role coverage, high-fanout read performance, provider smokes, and route-by-route security proof still being applied slice by slice.

## Latest Hard Validation

Checked from this workspace.

- 2026-07-08: `npm run smoke:api-mode:strict` passed against the staging-configured API origin; readiness returned `ready`.
- 2026-07-08: `npm run audit:db:stage:strict` passed with `.env.staging.local`, DB status ready, 40/40 migrations applied, 0 blockers, and 0 warnings.
- 2026-07-08: `npm run smoke:staging` passed 29/29 checks with 0 warnings and 0 failures, including live auth, club create/archive, booking, invoice, simulated payment, simulated payout, direct-payment instructions, session feedback, family/athlete sensitive reads, safeguarding denial audit, group sessions, drills, private upload, community/media reads, and post-smoke DB write verification.
- 2026-07-08: coach follow toggles now use `/v1/follows`; follow suggestions fail closed when live coach search fails; API-mode coach discovery hydration fails closed; uncached injury mutations patch through `/v1/injuries`; drill assignment detail uses `GET /v1/drill-assignments/:assignmentId`.
- 2026-07-08: product-facing service logs were aligned to archive/remove/revoke/cancel wording where behavior is soft removal or lifecycle cleanup; `npm run test:compile`, root `npm run typecheck`, and `npm run audit:api-boundaries` passed.
- 2026-07-08: API-mode concern auto-escalation now fails closed when the required safeguarding action append fails; focused concern-service tests, root typecheck, and API-boundary audit passed.
- 2026-07-08: API-mode badge share, seen, bulk seen, and feed-post actions now fail closed when the backend rejects action-state writes; focused badge API-mode tests, root typecheck, and API-boundary audit passed.
- 2026-07-08: `/v1/invoices` and `/v1/invoices/:invoiceId` were reclassified from scaffolded to implemented in the route inventory/OpenAPI because the runtime already reads Prisma-backed invoice list/detail data, enforces owner/payer/admin/club-finance visibility, and audits sensitive finance reads. Simulated hosted payments and payouts remain provider-boundary API flows; no real money movement is wired.
- 2026-07-08: Core booking list/detail/create/cancel/reopen routes were reclassified from scaffolded to implemented in the route inventory/OpenAPI after checking the live `/v1/bookings*` route handlers and DB-fixture coverage for visible reads, idempotent creates, cancellation invoice voiding, active payment-attempt cancellation, and reopen invoice restoration.
- 2026-07-08: Session invite create/list/detail/cancel/remind/dismiss/respond routes were reclassified from scaffolded to implemented in the route inventory/OpenAPI after checking `/v1/invites*` handlers and `p0-core` coverage for owner/target visibility, idempotent create, reminders, dismissals, terminal response replay/deny behavior, direct booking creation, recurring booking-series creation, and invite audit rows.
- 2026-07-08: Coach availability slot reads were reclassified from scaffolded to implemented in the route inventory/OpenAPI after checking `/v1/coaches/:coachId/availability/slots`, route coverage for booked slots, pending invite hold exclusion, scheduling-rule filtering, and staging smoke usage before invite create/accept flows.
- 2026-07-08: `/v1/me` was reclassified from scaffolded to implemented in the route inventory/OpenAPI after checking `identityRoutes`, seed/db identity repositories, seeded membership coverage, and dual-mode response-shape parity.
- 2026-07-09: `/v1/health`, `/v1/meta/version`, and `/v1/meta/seed-health` were reclassified from scaffolded to implemented in the route inventory/OpenAPI after checking handler code plus security, p0, and wave2plus route coverage.
- 2026-07-08: API-mode session invite history/detail/open/closed/squad/available reads now fail closed when `/v1/invites*` authority fails, while preserving `null` for real invite-detail not-found responses. Missing parent context for pending invite reads is now a validation error instead of a fake empty inbox.
- 2026-07-08: API-mode bulk/group invite projections now fail closed when `/v1/invites?groupId=*` authority fails, and mock mode no longer falls through to live invite authority for missing local groups.
- 2026-07-08: API-mode family child progress now fails closed when athlete analytics cannot be loaded, instead of returning a `null` progress summary; focused family-member API-mode tests, root typecheck, and API-boundary audit passed.
- 2026-07-09: API-mode booking list reads now call `/v1/bookings` on every list request and surface backend failures instead of serving the runtime memory mirror inside the old cache TTL.
- 2026-07-09: API-mode match detail reads now preserve `null` only for real `/v1/matches/:matchId` not-found responses and fail closed on missing auth or other API failures.
- 2026-07-09: API-mode video annotation update/delete actions now preserve benign absence only for real not-found responses and surface backend failures instead of returning `null`/`false`.
- 2026-07-09: API-mode co-guardian message access checks now preserve default-deny for real missing threads but surface `/v1/message-threads` authority failures instead of returning `false`.
- 2026-07-09: API-mode earnings facade reads now surface `/v1/coaches/me/earnings`, payout-method, and withdrawal API failures instead of returning zero balances or empty money lists; payout/provider behavior remains simulated behind backend `/v1` routes.
- 2026-07-09: API-mode booking cancel/reopen lifecycle actions now surface `/v1/bookings/:bookingId/cancel` and `/v1/bookings/:bookingId/reopen` authority failures instead of returning `undefined`.
- 2026-07-09: Favourite demo-seed detection now returns an explicit `Result<boolean>` and stays mock-only; API mode returns `ok(false)` without local favourite storage reads.
- 2026-07-09: API-mode user profile reads now use `/v1/users/:userId` with backend profile visibility, minor, relationship, block, and audit gates instead of local auth/user storage.
- 2026-07-11: API-mode signup email availability now fails closed when `/v1/auth/check-email` is unavailable instead of treating unknown availability as available.
- 2026-07-08: API-mode generic booking status updates now surface the required explicit lifecycle-route rejection instead of returning `undefined`; focused booking CRUD API-mode tests, root typecheck, and API-boundary audit passed.
- 2026-07-08: API-mode self-booking preference reads/writes now surface `/v1/me/booking-preferences` failures instead of returning disabled/false; focused self-booking preference tests, root typecheck, and API-boundary audit passed. React Doctor remained 84/100 because of pre-existing `ChildProvider` cascading state and large-component findings in touched files.
- 2026-07-08: focused API-mode strictness slices passed `npm run test:compile`, root `npm run typecheck`, focused service tests, and `npm run audit:api-boundaries` for practice-task reads, squad reads, self-assessment prompt reads, and family child updates.
- 2026-07-08: API config now rejects `API_DATA_BACKEND=seed` outside `NODE_ENV=test`; validation confirmed development seed startup is rejected, `NODE_ENV=test API_DATA_BACKEND=seed` remains allowed, root/API typechecks passed, and `npm --prefix apps/api run test` passed 242/242.
- 2026-07-08: API-mode generic storage now rejects onboarding resume drafts and generic form-draft prefixes; onboarding clears legacy local draft data with `removeLocal` and only persists drafts in mock test mode. `npm run test:compile`, root `npm run typecheck`, focused storage boundary tests 13/13, and `npm run audit:api-boundaries` passed.
- 2026-07-08: API-mode onboarding completion now reads the backend `User.onboardingComplete` profile field instead of the legacy local `ONBOARDING_COMPLETE` flag; generic writes for that flag fail closed outside mock mode. `npm run test:compile`, root `npm run typecheck`, focused auth/storage tests 42/42, and `npm run audit:api-boundaries` passed.
- 2026-07-08: `UI_BASE_URL=http://localhost:8090 node ./scripts/ui-flow-checks-50.mjs --roles=parent,athlete,admin --fail-on=medium --out-dir=/tmp/ui-flow-checks-50-rerun7` passed 36/36 route checks with 0 high and 0 medium findings: parent 22/22, athlete 13/13, admin 1/1.
- 2026-07-08: focused money-provider verification passed in seed API mode: `coach-club/earnings.routes.test.ts` 4/4, `coach-club/payment-instructions.routes.test.ts` 2/2, and `wave2plus/routes.test.ts` 59/59. Payout/payment completion remains API-backed and simulated; no real funds are wired.
- 2026-07-08: `npm run verify:slice:full` passed 11/11 after the latest API-mode mock-boundary hardening and coach offering cleanup: app/API/UI gates passed, API tests passed 238/238, DB staging status was ready, 40 migrations were present, public-table RLS audit found 0 missing RLS tables, and there were 0 blockers/warnings.
- 2026-07-08: `npm run audit:api-boundaries` passed with 0 findings.
- 2026-07-16: `node scripts/api-boundary-audit.js` passed with 0 findings, and route-inventory status scan found no `/v1` rows outside `implemented`.
- 2026-07-16: focused source inspection confirmed family calendar/booking reads, booking confirmation club context, generated test-account credential permissions, password-reset token echo guards, practice logs, athlete analytics/skills/goals, progress reports, privacy settings, data-deletion requests, user directory reads, family permission reads, community/media reads, scheduling/cancellation policy reads, and simulated payout flows are API-authoritative or mock-only by explicit runtime gate.
- 2026-07-16: destructive marketplace P0 seed import now requires explicit local/staging confirmation before Prisma connection or table clearing, rejects production-looking runtime labels/URLs, and is covered by subprocess guard tests.
- Supabase MCP is configured in `.mcp.json` for project `oucxazyrimujqmakxfiv`, but callable Supabase MCP tools were not exposed in this Codex session; the local `supabase` CLI is also not installed. DB verification therefore used the repo's Prisma/staging preflight and smoke tooling instead of MCP/CLI advisors.

## Google-Engineer Read

This is not yet release-grade end to end, but it is no longer prototype-only work. The current standard is strongest where the path has all of these properties:

- backend-authenticated `/v1` route
- Supabase/Postgres-backed persistence or an explicit supported simulated provider
- default-deny authz with assignment or ownership checks
- soft-delete/archive/remove semantics instead of destructive ambiguity
- audit rows for success, deny, and error paths
- focused API tests plus staging smoke coverage

The biggest slop risk is not one missing abstraction. It is any feature that still silently writes server-owned data through local storage, renders raw audit action strings, or keeps a visible control in API mode without a backend authority.

## Category Matrix

| Category | Subcategory | Authority now | Relationship shape | Status |
| --- | --- | --- | --- | --- |
| Identity | Auth/session/profile/search/blocking | `/v1/auth/*`, `/v1/me/sessions*`, `/v1/users/search`, `/v1/blocks` | `User` 1-to-many `AuthSession`; `User` 1-to-1 `UserProfile`; `User` optionally links 1-to-1 `Athlete` for self-managed athlete accounts; `User` many-to-many self relationship via `UserBlock` | Implemented for auth/session/profile, privacy-bounded search, and server-owned block relationships; search no longer reads local `USERS` or `BLOCKED_USERS` in API mode and excludes active block relationships |
| Family | Guardians/children | `/v1/families*`, `/v1/athletes*`, guardian invites | `Family` many-to-many `User` via memberships; `GuardianChildLink` gates athlete access | Implemented |
| Trust health | Medical, emergency, consent, safeguarding | `/v1/athletes/:athleteId/medical`, contacts, consents, safeguarding incidents; `/v1/coaches/:coachId/roster/consents` | `Athlete` 1-to-many sensitive records; guardian/scoped-coach access only | Single-athlete health/consent routes and roster consent projection are implemented and audit-sensitive |
| Coach trust | DBS/verification status | `/v1/coaches/:coachId/verification-status`, `/v1/coaches/me/verifications/:type/documents` | `CoachProfile` 1-to-many `CoachVerification`; document evidence remains coach-self private | Status reads and coach-self document evidence submission implemented and audited; reviewer approval/admin writes still planned |
| Coach profile | Marketplace profile basics, rich self-profile metadata, public projection, and travel settings | `/v1/coaches/me/profile`, `/v1/coaches/offerings`, `/v1/coaches/:coachId/offerings`, `/v1/coaches/me/travel-settings`, `/v1/auth/me` | `User` 1-to-1 `UserProfile`; `User` 1-to-1 `CoachProfile` with travel radius, remote/in-person flags, website, max price, social links, experience, and language metadata | Self-owned bio/rate/specialty/qualification basics, rich edit-profile metadata, public offering-index projection including governed display name, and travel settings are implemented and audited |
| Coach growth | Trial session settings/usages/conversions | `/v1/coaches/:coachId/trial-offering`, `/v1/trial-offerings`, `/v1/coaches/:coachId/trial-usages`, `/v1/coaches/:coachId/trial-conversions` | `CoachProfile` 1-to-1 `CoachTrialOffering`; coach/family/booking 1-to-many usage and conversion records | Trial offering settings/discovery plus usage/conversion tracking are API-backed, booking-proofed, visibility-scoped, archived instead of hard-deleted, and audited |
| Clubs | Club/academy | `/v1/clubs*`, members, squads, invite codes, branding | `Club` 1-to-many memberships/squads/events/matches; "academy" is compatibility naming over club authority | Implemented core; create, invite-code read/create/join, archive, and member removal history are backend-authoritative and audited; academy-specific writes fail closed |
| Scheduling | Availability/templates/overrides/rules | `/v1/coaches/me/availability*`, `/v1/coaches/:coachId/availability*`, `/v1/coaches/me/scheduling-rules`, `/v1/coaches/:coachId/scheduling-rules` | `CoachProfile` 1-to-many availability rows plus 1-to-1 scheduling rules/policy | Implemented for coach self, delegated availability management, repeated override creates, bookable slot reads, and non-self scheduling rules/policy projection; non-self writes remain fail-closed |
| Roster | Coach-athlete roster, notes, removal history | `/v1/coaches/:coachId/roster*` | `CoachAthleteRosterEntry` links coach-to-athlete; coach-private notes are private `SessionNote` rows; removal history is durable soft-removal state | Roster list/detail, consent dashboard, create/update/remove, coach-private notes, removal history, and undo are API-backed and audited; remaining risk is end-to-end role flow coverage |
| Booking | Bookings/series/invites/session notes/cancellations/no-shows | `/v1/bookings*`, `/v1/booking-series*`, `/v1/cancellation-records*`, `/v1/families/:familyId/no-shows`, invite routes | `Booking` links coach, payer, participants, status events, invoices; cancellation records are a read projection over cancelled bookings; family no-show counts derive from `AttendanceRecord` and group-registration proof | Core booking and invite routes are implemented/runtime-tested; cancellation record list/lookup, proof-backed family no-show count/read/correction, and per-athlete booking completion attended/no-show/effort proof are implemented and audited |
| Events | Club events, athlete invites, RSVP, attendance | `/v1/clubs/:clubId/events`, `/v1/events*` | `Club` 1-to-many `ClubEvent`; event 1-to-many RSVP/attendance/invite notifications | Event-scoped API implemented; user calendar reads compose existing `/v1` routes; specific-athlete targeting now routes through `/v1/events/:eventId/invites/athletes` |
| Group sessions | Sessions, registrations, RSVPs | `/v1/group-sessions*`, `/v1/session-rsvps*` | `GroupSession` 1-to-many registrations/RSVPs | Implemented; registration, attendance, invoice/thread side effects, and RSVP routes are backend-owned |
| Money | Invoices/payments/direct instructions | `/v1/invoices*`, `/v1/payment-attempts/:id/simulated-complete`, `/v1/coaches/me/payment-instructions` | `Invoice` 1-to-many payment attempts/events; `CoachProfile` 1-to-1 `CoachPaymentInstruction` | Implemented; payment provider is simulated, and coach direct-payment copy is API-backed without reusing payout-provider bank details |
| Payout | Payout methods/withdrawals | `/v1/coaches/me/payout-methods*`, `/v1/coaches/me/withdrawals*` | `CoachProfile` 1-to-many payout methods/withdrawals | Implemented as simulated provider; no real money movement |
| Progress | Goals, milestones, practice logs, tasks | `/v1/athletes/:athleteId/goals`, `/v1/goals*`, practice/task routes | `Athlete` 1-to-many goals/logs/tasks; assignments gate coach access | Implemented and audited |
| Analytics | Athlete and coach analytics | `/v1/athletes/:athleteId/analytics`, `/skills/history`, `/v1/coaches/:coachId/analytics` | Derived from bookings, feedback, skill assessments, invoices | Implemented; peer averages now API-derived |
| Media/community | Uploads, videos, comments, messages | `/v1/uploads*`, `/v1/videos*`, posts/comments/messages | Content belongs to coach/group/club/thread with visibility gates | Implemented core; some compatibility facades remain |
| Notifications / safeguarding | Inbox/preferences/read state, support issue fanout, concern compatibility views | `/v1/me/notifications*`, `/v1/safeguarding/incidents` | `Notification` belongs to one user; booking-linked support incidents notify responsible coach/staff; legacy concerns project from `SafeguardingIncident` and append `SafeguardingIncidentAction` rows | Implemented reads/mutations plus support fanout; API-mode concern create/list/resolve/status flows use backend incident authority and audited sensitive reads |
| Account preferences | Profile/discovery/data-sharing and self-booking settings | `/v1/me/privacy-settings`, `/v1/me/booking-preferences` | `User` 1-to-1 `UserPrivacySetting`; `User` 1-to-1 `UserBookingPreference` | Implemented; privacy and booking-preference reads/writes are self-scoped and audited |
| Coach venue presets | Coach schedule location shortcuts | `/v1/coaches/me/venues*` | `CoachProfile` 1-to-many `CoachLocation` | Implemented; coach self only, audited, soft-archive on removal |
| Local UI state | Dismissals and device prefs | Device local via allowlisted keys | No backend authority | Intentional local-only state |

## Decisions Made

- Club and academy are treated as the same organisation concept for now. Academy compatibility reads and supported writes use club `/v1` authority; visibility and approval settings map to club `visibility` and `joinPolicy` rather than a separate academy authority.
- HTTP `DELETE` can remain RESTful, but audit/display effects should say `archive`, `remove`, `dismiss`, `revoke`, `cancel`, or `void` as appropriate.
- Payout and payment completion routes work through the API but remain simulated by design. No real funds are wired.
- Simulated payout method deletion is a backend removal effect and should audit as `coach_payout_methods.remove`, not a hard delete.
- Legacy concerns are not a separate live authority. API mode projects them from `/v1/safeguarding/incidents`, and status changes are append-only incident actions.
- Swagger is Swagger UI over OpenAPI 3.1. Google AIP conformance is explicitly not claimed.
- Client generic storage is blocked in API mode unless a key is explicitly local UI/device state.
- Cancellation records are not a duplicate table for now. They are a live read projection over cancelled `Booking` rows and `BookingStatusEvent` metadata; family no-show counts are backed by attendance/no-show proof through `/v1/families/:familyId/no-shows`, and per-athlete booking completion now writes attended/no-show notes and effort through `/v1/bookings/:bookingId/complete`.

## Engineering Quality Matrix

| Area | Current bar | Evidence | Remaining risk |
| --- | --- | --- | --- |
| Runtime authority | Better than prototype; not fully release-grade | API-mode generic storage is being locked down, academy now aliases club authority, and sensitive local mirrors are being removed or fail-closed | Every legacy service still needs the same API-mode local-write scan |
| Security/authz | Security-first slices, but not a completed audit | Default-deny club governance, assignment-scoped reads, hashed/salted demo credentials, public-table RLS verification, and audited sensitive writes | Route-level grant coverage and Supabase/RLS proof need to be repeated for all high-risk routes |
| Data integrity | Strong where recently touched | Booking/payment paths use idempotency/version/audit patterns; child and club removals now use remove/archive semantics | Scaffolded routes still need transaction and rollback checks before production release |
| Scalability | Needs targeted hardening | Local API-mode UI testing exposed Supabase session-pool exhaustion on high-fanout notifications/messages requests | Reduce frontend request fanout, batch/cache noisy reads, and use the correct Supabase pool mode/settings before launch |
| Observability/audit | Backend audit posture is improving | Product-facing service logs now prefer archive/remove/revoke/cancel wording where behavior is soft removal or lifecycle cleanup, generated OpenAPI exposes operation effects, and the trust-admin overview returns display-safe audit labels/effects | Future admin audit UI must render `displayLabel` / `displayEffect` instead of raw `action` strings |
| API documentation | Useful internal Swagger, not an external developer portal | `/v1/docs` serves Swagger UI over generated OpenAPI 3.1; generated operations have domain tags, readable operation IDs, and lifecycle effects for remove/archive routes | It is not Google AIP-standard; remaining docs polish is route-specific examples and richer request/response schemas |
| Payments/payouts | Correct for staging/demo | Payment completion and payout routes remain API-driven simulated provider flows | Must keep production provider credentials disabled until a real payment processor contract exists |
| Repository hygiene | Improved with path-scoped slices | Recent backend/trust changes are committed as focused slices | Continue path-scoped commits and avoid broad opportunistic cleanup |

## Main Gaps

- Supabase MCP server is configured for project `oucxazyrimujqmakxfiv`, but callable Supabase MCP database tools were not visible in this session, and the local `supabase` CLI is not installed. Fallback Prisma/staging verification confirmed DB connectivity, 40/40 migrations applied, demo coach/parent rows, salted `scrypt` password hashes, public-table RLS enabled, and no raw `.delete` audit actions. Current 2026-07-16 work used code/test proof only because the completed slice did not change DB schema or persistence behavior.
- 2026-07-07 staging demo credential reset updated 28 `@clubroom.demo` users, verified 28 salted `scrypt` `PasswordCredential` rows, verified 8 attached coach accounts, and wrote ignored DB-derived credentials to `docs/backend-api/test-data/TEST_ACCOUNTS.staging.local.txt`. Fixture-derived local credentials remain in `docs/backend-api/test-data/TEST_ACCOUNTS.local.txt`.
- Staging DB preflight accepts the configured password-reset email delivery provider; the remaining launch blocker is the provider smoke, which must prove the configured provider credentials before go-live. Brevo API keys are now supported alongside the existing webhook and SMTP paths.
- Launch readiness now requires `audit:worktree:strict`, `verify:slice:full`, `audit:agentic`, `audit:db:stage:strict`, `smoke:password-reset-webhook`, `smoke:api-mode:strict`, `smoke:staging`, and `ui:flows:run`. This proves the staged path and blocks false-ready reports when password-reset provider delivery is broken.
- Club, squad, member, guardian, athlete, payout-method, invite-code, video, comment, and registration removal paths must continue using archive/remove/revoke/cancel/void wording in audit display. Current club, athlete, video, comment, and message removal checks already soft-remove rows and audit `*.remove`/`*.archive` actions; legacy `.delete` audit rows for athlete, video, video annotation, message, and comment are display-normalized to precise human copy such as "Athlete removed" or "Video archived".
- User event calendar reads are API-backed by fan-out over existing club/event/RSVP routes; add a dedicated `/v1/me/events` aggregate only if that fan-out becomes too slow.
- Rich coach self-profile fields in the edit screen now have DB schema/API storage and public offering-index projection for governed display name, website, social links, structured experience history, structured languages, and maximum price/range semantics.
- Coach roster mutations, coach-private roster notes, roster soft-removal, removal history, and undo are now explicit `/v1/coaches/:coachId/roster*` contracts with audited API-mode service wiring; remaining roster risk is end-to-end role flow coverage, not missing route authority.
- Trial usage counts and trial-to-regular conversions now use `/v1/coaches/:coachId/trial-usages` and `/v1/coaches/:coachId/trial-conversions` with booking proof and audit coverage; remaining trial risk is broader product analytics coverage, not missing route authority.
- Delegated/admin availability template and override read/create/update/remove now uses real `/v1/coaches/:coachId/availability/templates*` and `/v1/coaches/:coachId/availability/overrides*` contracts; read failures fail closed instead of rendering fake empty availability, and repeated override batches write through individual audited `/v1` override creates instead of local mirrors.
- Squad-to-session invite sends and frontend history/selection projections now use `/v1/invites` with `SQUAD_ONLY` squad metadata and membership-checked visibility, while local squad invite/history mirrors stay mock-only.
- Event RSVP list/detail visibility is currently active-club-member scoped; if RSVP notes or guest counts are treated as sensitive, split self reads from staff attendee reads.
- Long-tail API-mode service paths still need the same fail-closed classification already applied to practice tasks, squads, self-assessment prompts, family child updates, uncached injury mutations, coach follow toggles, coach discovery hydration, drill assignment detail, and follow suggestions. Remaining candidates include lower-value recommendation/report-style reads where empty, `null`, or `false` can mean either "no data" or "API failure".
- Some legacy mock/demo service files remain on disk; each must be either gated to mock mode, mapped to `/v1`, or documented as fail-closed.
- Full mobile role E2E coverage is not complete.
- CI should enforce "no generic storage bridge for server-owned API-mode data".
- Trust-admin audit overviews now decorate raw audit actions with display-safe `displayLabel` / `displayEffect` fields; future admin audit UI must render those fields rather than raw action names.
- Swagger UI is a usable OpenAPI viewer, not a final external developer portal. The generated spec now has no generic `API` tag, unique readable operation IDs, and no DELETE operation names/summaries containing raw "delete"; remaining docs polish is route-specific examples, richer request/response schemas, and a docs-quality check that generated OpenAPI aligns with every committed `/v1` route.

## Recent Verified Slices

- Coach follow toggles now use `/v1/follows` for status, create, and remove in API mode instead of returning a local success.
- Follow suggestions now fail closed when live coach search fails instead of returning an empty recommendation list.
- Coach discovery hydration now fails closed when `/v1/coaches/offerings` fails.
- Uncached injury updates, healed state, and recovery-note mutations now patch through `/v1/injuries` instead of requiring a local cached detail row.
- Drill assignment detail now uses `GET /v1/drill-assignments/:assignmentId` with sensitive read audit coverage.
- Product-facing service logs now prefer archive/remove/revoke/cancel wording for soft removal and lifecycle cleanup paths.
- API-mode concern auto-escalation now fails closed if the required safeguarding incident action cannot be appended, preventing false escalated states.
- API-mode badge share, seen, bulk seen, and feed-post actions now surface backend failures instead of returning silent success.
- API-mode family child progress now surfaces analytics backend failures instead of returning `null` progress.
- API-mode generic booking status updates now fail closed and require explicit lifecycle routes such as cancel or complete.
- API-mode self-booking preference reads and writes now surface backend failures; booking UI defaults safely and blocks confirmation if the preference cannot be verified.
- API-mode practice-task reads now fail closed on auth/API failure instead of returning empty task queues.
- API-mode squad list/detail reads now fail closed on API failure while still returning `null` for real not-found responses.
- API-mode self-assessment prompt reads now fail closed on auth/API failure while preserving `null` for a successful no-prompt response.
- API-mode family child updates now surface backend update failures instead of returning `null`.
- Demo/test credential coverage guard with hashed/salted DB credentials.
- Staging demo credentials reset and verified on 2026-07-07: 28 demo users, 28 salted `scrypt` hashes, 8 attached coach accounts.
- Family health and safety emergency reads now always fetch live `/v1/athletes/:athleteId/medical`, `/emergency-contacts`, and `/consents` data in API mode; in-flight duplicate reads may coalesce, but the frontend no longer serves a persistent TTL cache for trust-sensitive health data.
- Trust-admin audit display now normalizes legacy `.delete` rows for athlete, video, video annotation, message, and comment actions into precise human labels such as "Athlete removed" or "Video archived".
- Swagger/OpenAPI grouping now has no generic `API` tag; generated operations use domain tags, unique readable operation IDs, lifecycle effects, and no DELETE operation names/summaries containing raw "delete".
- Coach verification status now reads from `/v1/coaches/:coachId/verification-status`; child-booking DBS gates use backend status instead of local demo storage.
- Coach verification evidence submission now attaches private, available, coach-owned media objects through `/v1/coaches/me/verifications/:type/documents` and audits success/deny paths.
- Swagger/OpenAPI `/v1/docs` and generated `/v1/openapi.json`.
- Goal and milestone audit actions changed from delete wording to archive semantics.
- Athlete skill comparison averages now come from the API analytics payload in live mode.
- Seen-status storage explicitly scoped to local walkthrough and UI dismissal state only.
- User event calendar reads moved off local mirrors by composing existing club event and RSVP APIs.
- Simulated payout method removal now audits as remove instead of delete.
- Session template, squad, and session RSVP cleanup audit actions now use archive/remove semantics.
- Offline mutation queue storage is mock-only. API mode rejects queued local product writes, clears legacy `OFFLINE_QUEUE` data with explicit local cleanup, and requires writes to retry through explicit `/v1` service flows.
- API-mode current-user lookup now treats local `AUTH_USER` as a session cache only; when memory cache is empty it fetches `/v1/auth/me`, updates `AUTH_USER` from the backend response, and avoids bootstrapping identity from stale local storage.
- Booking session-feedback entry now completes non-completed bookings through `bookingService.completeBooking()` and the `/v1/bookings/:bookingId/complete` lifecycle contract before opening backend session notes; the mock `coach_sessions` / `session_bookings` bridge remains after the API branch only.
- Booking step analytics has no live `/v1` telemetry contract yet; API mode now skips local `BOOKING_STEP_ANALYTICS_EVENTS` persistence explicitly instead of relying on the generic storage bridge to fail.
- Read-only staging DB verification confirmed public-table RLS is enabled and demo credentials are hashed/salted.
- Strict API-mode readiness smoke passed against the configured local/staging API, including database and object-storage readiness.
- Strict staging DB preflight passed on 2026-07-07 with 40/40 Prisma migrations applied and required staged route columns present.
- Full staging smoke passed on 2026-07-07 with 29/29 checks, 0 warnings, and 0 failures; verified live DB auth, self-booking preference DB/audit readback, invite create/cancel/accept booking creation, booking, invoice, simulated payment, simulated payout, direct-payment instruction DB/audit redaction, booking completion proof, session-feedback homework DB/audit/parent-completion readback, sensitive read allow/deny, report/block audit readback, safeguarding denied-read/list/action audit readback, club create/invite-code/join/archive audit readback, match invites, group-session registration, drill lifecycle DB/audit readback, private object storage, community/media reads, and post-smoke DB writes.
- Coach direct-payment instructions are now covered by the staging smoke: it patches `/v1/coaches/me/payment-instructions`, verifies the `CoachPaymentInstruction` row, verifies read/update audit rows, and proves raw payee/bank/note copy is not stored in audit metadata.
- Club create, invite-code list/create, invite-code join, and club archive are now covered by the staging smoke with direct DB state checks and audit readback; API membership responses now normalize roles to contract values such as `OWNER`, `COACH`, and `MEMBER`.
- Safeguarding incident create/list/read/action routes now audit deny/error paths as well as success paths, and the staging smoke proves denied safeguarding reads produce sensitive `DENY` audit rows while allowed list/action paths persist and audit backend truth.
- API-mode child booking creation now fails closed instead of trusting mock coach verification storage.
- Account privacy settings now read/write self-owned `/v1/me/privacy-settings` instead of local storage in API mode.
- Self-booking preferences now read/write self-owned `/v1/me/booking-preferences`, persist `UserBookingPreference`, and keep local `ALLOW_BOOK_SELF` storage mock/demo-only.
- Squad invite local mirrors are now mock-only instead of persisting invite/history state in API mode.
- Squad-to-session invite sends now preserve `SQUAD_ONLY`, `squadIds`, and linked session metadata through `/v1/invites`; `/v1/invites` projects metadata-backed `squadIds`, validates squad membership on create, and blocks unrelated parent reads by guessed squad id.
- Coach edit profile now saves identity and coach marketplace fields through `/v1/auth/me` and `/v1/coaches/me/profile`; rich self-profile fields are persisted through `CoachProfile` instead of local-only form state.
- Account settings and edit-profile email/phone edits now use `/v1/auth/me` in API mode instead of writing local `USERS` records; email writes normalize to lower-case, reject duplicate addresses, and audit field names without storing raw email values in audit metadata.
- Root user service no longer reads local `USERS` as a live directory in API mode; it maps only the signed-in auth profile, blocks local profile writes, and now uses `/v1/users/search` for privacy-bounded user lookup. Search requires authentication, refuses blank/one-character directory browsing, hides unassigned minors and private profiles, supports exact-email invitation lookup, and audits sensitive reads without persisting raw query text.
- Booking completion Swagger/OpenAPI now documents no-show attendance and effort-gap output.
- Direct selected-user and manual-email club member invites now use the audited `/v1/clubs/:clubId/invites` contract from the Invite Members screen. Existing accounts are targeted by user id; unregistered emails are stored as HMAC email-target pending invites and delivered through the configured provider or recorded without claiming email delivery.
- Club Detail member panels now load `/v1/clubs/:clubId/members` through `clubService.getMembers()` in API mode; self-leave still needs a dedicated audited `/v1` contract and now fails closed instead of mutating local membership mirrors.
- The legacy Club Hub tab is now mock-only; API mode redirects before mounting `useClubHub()`, sending club links to backend-owned Club Detail and invite-code links to My Clubs.
- Create Squad now resolves club context from `/v1/clubs` in API mode before writing through the existing `/v1/clubs/:clubId/squads` create path; local club lookup is mock-only.
- Club setup-complete now reloads the created club from `/v1/clubs` in API mode before showing first-run setup actions; local club lookup is mock-only.
- Post Detail now reads header/body data from `GET /v1/posts/:postId` in API mode before loading comments from `/v1/posts/:postId/comments`; local aggregated/personal feed lookup is mock-only.
- Profile posts now read viewer-scoped `/v1/posts` in API mode and filter live readable posts to the profile author; local following-feed posts are mock-only, and follow-only personal coach feeds still need a dedicated backend contract.
- Coach profile tab posts now read viewer-scoped `/v1/posts` in API mode and filter live readable posts to the coach author; local following-feed tab posts are mock-only and live read failures fail closed to an empty tab.
- Child removal now emits/records remove semantics rather than hard delete wording.
- Club destructive UI now presents archive semantics and routes through the existing club archive authority.
- Academy compatibility service was re-checked: API mode reads/writes go through club `/v1` services where supported, and unsupported settings fail closed.
- `My Clubs` now returns `/v1/clubs` authority directly in API mode and no longer renders stale local club mirrors when the API fails; staff club cards open backend-owned club detail outside mock mode.
- Member Management now derives API-mode target club and viewer role from `/v1/clubs` authority before exposing role change, removal, ban, or squad-assignment controls; local social-feed membership reads are mock-only compatibility.
- Club Settings now derives API-mode club, viewer role, and management/commercial permissions from `/v1/clubs`, surfaces invite-code authority failures, and routes read-only membership actions to My Clubs outside mock mode.
- Operations routing now chooses owner dashboard vs manage bookings from `/v1/clubs` membership authority in API mode instead of local social-feed memberships.
- Manage Bookings now derives its eligible club picker from `/v1/clubs` membership authority before loading staffing-console data; local membership and club-name lookup are mock-only compatibility.
- Head Coach Oversight now derives its eligible club picker from `/v1/clubs` membership authority before loading `/v1/clubs/:clubId/head-coach/oversight`; local membership and club-name lookup are mock-only compatibility.
- Training Schedule now derives its active API-mode club from `/v1/clubs` membership authority before loading squad and club training-session data; local club lookup is mock-only compatibility.
- Club-post composer permissions now derive API-mode club and membership context from `/v1/clubs` before publishing through `/v1/posts`; local club and membership lookup are mock-only compatibility.
- The Updates tab now reads API-mode clubs from `/v1/clubs`, feed posts from viewer-scoped `GET /v1/posts`, and post likes from `/v1/posts/:postId/reactions/toggle`; local social-feed aggregation is mock-only, and followed-coach personal-feed merge still needs a dedicated backend contract before it can be live.
- Trial offering settings/discovery now use live `/v1` `CoachTrialOffering` rows in API mode; usage/conversion service still fails closed instead of reading or writing `TRIAL_*` local storage.
- Coach travel radius and remote/in-person availability settings now use `/v1/coaches/me/travel-settings` and `CoachProfile` columns in API mode instead of unsaved defaults/client-local storage.
- Coach direct-payment instructions now use `/v1/coaches/me/payment-instructions` and `CoachPaymentInstruction` rows in API mode; reads/writes are audited and payout/payment providers remain simulated.
- Coach roster consent dashboard now uses `/v1/coaches/:coachId/roster/consents`, derived from the booking-backed roster projection plus `ChildConsent` rows; reads are sensitive/audited and no unassigned athlete consent data is exposed.
- Coach roster create/update/remove, private notes, removal history, and undo now use audited `/v1/coaches/:coachId/roster*` routes instead of local roster/removal storage in API mode.
- Trial offering, usage, and conversion flows now use audited `/v1` trial routes without client-local trial storage in API mode.
- Cancellation record list/lookup now use `/v1/cancellation-records*` in API mode, projecting from cancelled booking rows with scoped actor visibility and sensitive-read audit rows; cancellation stats derive from those records, and family no-show counts/corrections use proof-backed `/v1/families/:familyId/no-shows` instead of local counters.
- Availability template/override service now uses `/v1/coaches/:coachId/availability/templates*` and `/v1/coaches/:coachId/availability/overrides*` for delegated/non-self API-mode reads and writes, fails closed on API read errors, and creates repeated overrides as individual audited backend writes.
- Coach schedule loading now reads legacy `SESSION_OFFERINGS` and `BLOCKED_DATES` mirrors only in mock mode; API mode avoids those local schedule projections.
- Family children hub stats now derive session counts and average ratings from `/v1/athletes/:athleteId/analytics` instead of local `coach_sessions` mirrors.
- Scheduling rules service now reads non-self rules/policy through `/v1/coaches/:coachId/scheduling-rules` and ignores local `SCHEDULING_RULES` / `CANCELLATION_POLICIES` mirrors in API mode; non-self writes remain fail-closed.
- Coach roster service now reads and writes through audited `/v1/coaches/:coachId/roster*` routes in API mode, including list/detail, roster entry mutation, private notes, removal history, soft removal, and undo.
- Individual booking detailed feedback now opens a backend `/v1/session-feedback` draft, and the development feedback editor loads/saves `/v1/session-feedback` in API mode before the mock-only `COACH_SESSIONS` branch.
- Development badge recognition now reads session badge awards through `/v1/sessions/:sessionId/badges`; badge-award creation and share/feed/seen actions now use audited `/v1` backend authority instead of local badge storage in API mode.
- Badge share/feed/seen helpers now no-op in API mode instead of reading or writing local `BADGE_AWARDS` state.
- Legacy global school invite-code admin now fails closed in API mode; live invite codes remain club-scoped through `/v1/clubs/:clubId/invite-codes*`.
- Session-completion group and parent message shortcuts now resolve existing backend `/v1/message-threads` by booking or group-session context and send through `/v1/message-threads/:threadId/messages`; when no backend thread exists, they fail closed before local `MESSAGES` reads/writes.
- Logout cleanup now removes stale legacy `session_bookings` device data with explicit local cleanup instead of calling the generic API-mode storage delete path for server-owned booking data.
- Direct chat simulated replies are now mock-only, and direct-thread mark-read uses `POST /v1/message-threads/:threadId/read` in API mode with participant-scoped read receipts, `lastReadAt`, and allow/deny audit events owned by the backend.
- Invite slot holds now return empty/no-op models in API mode instead of reading or writing local `INVITE_SLOT_HOLDS`.
- Notification inbox reads now ignore local `NOTIFICATIONS` overlays in API mode; client notification create/send/demo seed helpers are mock-only, and handled badge actions use the backend read transition instead of a local handled overlay.
- User blocking now uses `/v1/blocks` and `UserBlock` rows in API mode; block list/status/create/remove paths are audited, unblock soft-removes, and user search hides active block relationships in either direction.
- Squad community group creation now uses `/v1/community-groups` with backend `squadId` authority, one active group per squad, private visibility, and squad-assigned member ingress; session group creation remains fail-closed.
- Specific-athlete club event targeting now uses `/v1/events/:eventId/invites/athletes`, validates event-club membership, queues linked athlete/guardian notifications, and audits allow/deny paths.
- Session detail ownership labels now derive from signed-in user, child context, registration names, ownership audit names, and staffing-console labels rather than local `USERS` storage.
- Club member removal history now reads `/v1/clubs/:clubId/members/removals`, is restricted to `manage_staff_and_invites`, returns soft-removed membership records, and audits success/deny sensitive reads.
- Staging DB preflight now classifies Supabase session-pool exhaustion separately from schema drift so launch checks give an actionable blocked reason instead of a generic migration failure.
- Coach roster list/detail now read `/v1/coaches/:coachId/roster` from backend booking participation with athlete/guardian labels, session counts, revenue, ratings, and session-note snippets; reads are self-coach/privileged-admin only and audited as sensitive reads.
- API-mode fixture cache hardening now keeps academy, availability, bookings, children/family, club members, community groups/messages, drills, earnings, health/injury, invites, media/video, roster, RSVP, safety/emergency, squads, and user-calendar event exports off product-runtime mock authority; retained fixture branches are test/mock compatibility only.
- Coach offering summaries no longer expose a stale event-offering bucket; public coach profile, coach detail hero, and offering showcase now use the DB-backed direct/club/public summary shape consistently.
- Message-thread summaries, family calendars, and athlete progress aggregates now use `/v1` booking/badge authorities instead of local booking/message/badge mirrors in API mode; booking labels, family calendar booking enrichment, and athlete progress badge/booking sublists are optional presentation enrichment and return empty sublists when those secondary reads fail, while primary family/progress authority reads still fail closed.
