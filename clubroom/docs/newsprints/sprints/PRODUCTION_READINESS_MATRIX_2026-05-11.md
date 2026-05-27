# Production Readiness Matrix

Date: 2026-05-11
Purpose: turn Clubroom from a broad POC into a production-ready paid football development operating system with one API authority path and one UI linkup path per feature.

## Current Runtime Evidence

Latest local evidence:

- Sentry app project `tubton/react-native` is receiving events in `staging`.
- 2026-05-27 Sentry MCP review found no unresolved `staging` issues for `tubton/react-native` and no unresolved issues for `tubton/clubroom-api`.
- `npm run audit:db:stage` now loads `.env.staging.local` and reports `ready` locally: `0` blockers, `0` warnings, `5` migrations.
- `npm run smoke:api-mode` passes when the Fastify API is running, proving API-mode startup has a reachable `/v1/ready` endpoint before Expo starts.
- `npm run smoke:api-mode:strict` currently fails because `/v1/ready` reports `DATABASE_UNAVAILABLE` from the configured Supabase Postgres connection.
- 2026-05-12 Sentry issue triage:
  - setup-test noise: `REACT-NATIVE-1` native client crash test and `REACT-NATIVE-4` manual `First error` event
  - real runtime smoke failures: `REACT-NATIVE-2` network request failure and `REACT-NATIVE-3` failed API reads for club stores
  - root cause: Expo was started in API mode while the Fastify API was not listening on port `4000`
- `curl http://127.0.0.1:4000/v1/ready` works after starting `npm --prefix apps/api run dev`; strict readiness depends on db/object-storage/Sentry checks.
- `node ./scripts/agentic-readiness-pipeline.js` -> `1 passed`, `2 warned`, `0 failed`
- `node ./scripts/api-boundary-audit.js` -> pass with `256` legacy findings baselined and `0` new findings
- `node ./scripts/pdos-route-authority-audit.js` -> `154` routes, `90` still need product/source-of-truth decisions
- `node ./scripts/ui-quality-pipeline.js` -> static UI quality pass
- `node ./scripts/loading-route-coverage-audit.js` -> `154` routes covered, `0` fallback static routes

Current blockers:

- API-mode app startup must run with `apps/api` reachable; otherwise launch-critical club reads immediately produce Sentry noise and app-facing API errors.
- API Sentry env is present in `.env.staging.local`, and unresolved Sentry issue review is clean as of 2026-05-27.
- DB staging preflight env/config is green locally, but strict API readiness is blocked by the configured Supabase Postgres connection returning `DATABASE_UNAVAILABLE`.
- API boundary debt still exists behind the baseline: `102` legacy `/api/*` paths, `147` trust-sensitive local-storage authority patterns, `5` route literals, `2` frontend raw fetches.
- Several launch-critical API routes are still `scaffolded` or `planned` in `docs/backend-api/ROUTE_INVENTORY_V1.md`.
- Static UI quality is healthier than API/source-of-truth maturity; the main deployment risk is runtime truth, not just polish.

## Production Definition

Clubroom is production-ready only when each P0 journey has both packets complete.

The current answer to "are the rules good enough?" is:

- Good enough to stop new random AI slop from entering unnoticed.
- Not yet enough to claim elite production discipline because contract tests, idempotency, audit coverage, provider safety, DB-backed invite/payment/session flows, and security denial tests are not complete across every P0 journey.
- The next step is not more feature breadth; it is turning the P0 journeys below into verified API authority plus verified UI linkup.

API authority packet:

- `/v1` endpoint contract exists and is mapped in route inventory.
- Backend owns the source of truth in `db` mode.
- Request and response schemas are typed.
- Response DTOs are serialized, not raw persistence rows.
- Authn, acting role, authz, repository filters, and deny tests exist.
- Writes have idempotency or version/conflict protection.
- Sensitive reads and all writes emit audit/security events.
- Provider/storage/job side effects are explicit and observable.

UI linkup packet:

- Route uses `navigation/routes.ts` and canonical frontend service entrypoints.
- Service maps `/v1` DTOs into UI view models.
- No product truth depends on local storage in non-mock mode.
- Loading, empty, error, permission-denied, conflict, pending, and success states exist.
- Dead controls, fake success, native alerts, and duplicate CTAs are removed.
- Role-specific flow proves the real API path, not a mock-only success path.

Elite API bar:

- Contracts are stable, documented, and shared between API tests and UI adapters.
- Every endpoint has predictable error codes, request IDs, and no raw persistence payloads.
- Every unsafe write has an idempotency strategy and conflict behavior.
- Every list/read endpoint applies repository-level visibility filters.
- Every sensitive read and all writes are auditable.
- Provider boundaries exist for payments, SMS/2FA, object storage, malware scanning, email, push, and Sentry.
- Production cannot accidentally fall back to seed stores, mock state, or local storage authority.
- CI must run API tests, app typecheck, API boundary audit, route/loading audits, and release preflight before deploy.

## P0 Journey Matrix

| Order | Journey                                  | Primary roles                         | Product value                                                                                | Canonical source of truth                                                            | UI anchors                                                                                 | Current risk                                                                                                                                                                | Done condition                                                                                                                   |
| ----- | ---------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Account, role, session readiness         | All                                   | Users enter the correct operating surface without identity drift.                            | `/v1/auth/*`, `/v1/me/sessions*`, `services/auth-service.ts`                         | auth screens, role tabs, settings/security                                                 | Mostly implemented, but route inventory still shows scaffolded `/v1/me`.                                                                                                    | JWT/session path works in staging; role redirects and revoke flows are tested; forged role headers cannot affect runtime.        |
| 2     | Coach supply go-live                     | Coach, club admin                     | A coach becomes bookable with profile, offers, availability, scheduling rules, verification. | `/v1/coaches/me/*`, `/v1/coaches/:coachId/availability/slots`                        | coach profile, availability, sessions create, verification                                 | Offer writes and profile PATCH are still planned; verification document upload remains planned.                                                                             | Coach can go from setup to bookable in db mode; missing verification/go-live blockers are explicit and fail closed.              |
| 3     | Discover to trusted booking              | Parent, athlete, coach                | User finds a nearby trusted provider and reaches a real booking decision.                    | discover service, coach profile, availability slots, `/v1/bookings`                  | `app/discover/map.tsx`, `app/book-coach.tsx`, `app/coach/[id].tsx`, `app/book/[coachId]/*` | Discover and session-type screens still touch `SESSION_OFFERINGS`; direct confirmation is now gated by `/v1/bookings` success.                                              | Map/profile/session-type/review agree on offer, price, slot, eligibility, and backend bookability.                               |
| 4     | Family and child readiness               | Parent, athlete, scoped coach, club   | Booking and delivery use safe child, medical, emergency, consent context.                    | `/v1/families/:familyId`, `/v1/athletes*`, medical, emergency, consents              | family, children, child medical/emergency, roster health                                   | Core athlete/medical routes implemented; guardian invite lifecycle now has backend authority; route audit still flags sensitive-read surfaces needing decisions.              | Readiness summary gates booking/delivery without leaking broad medical data; sensitive reads are scoped and audited.             |
| 5     | Booking lifecycle and recovery           | Parent, athlete, coach                | Booking can be created, viewed, cancelled, reopened, reported, and recovered.                | `/v1/bookings*`, `bookingService.createBooking()`                                    | booking wizard, booking detail, cancel, report problem                                     | Booking create is idempotent and db-transactional; cancel/reopen now have idempotency, expected-version checks, and status-event audit; local booking mirrors remain broad. | Backend owns create/list/detail/cancel/reopen with idempotency, conflict behavior, and tested deny paths.                        |
| 6     | Payment, invoice, reconciler             | Payer, coach, club finance            | Sessions become collectible, paid, reconciled, refunded, and exported.                       | `/v1/invoices*`, `/v1/payment-attempts*`, invoice service                            | invoices, earnings, booking payment cards                                                  | Hosted provider is simulated; invoice transitions now use the shared invoice runtime and require linked authoritative booking state; recurring reschedule/cancel now syncs or voids mutable linked invoices and blocks settled invoices. Refund endpoint has backend permission, verification-code, reason, idempotency, and audit hard walls. | Client cannot mark paid; provider/manual transitions are backend-owned; refunds require permission, SMS/2FA code, reason, audit. |
| 7     | Group sessions and holiday camps         | Coach, parent, athlete, club admin    | Group products can be sold, registered, rostered, attended, and proved.                      | `/v1/group-sessions*`, `/v1/group-session-registrations*`                            | group sessions, session create, discover sessions, roster                                  | Core group routes implemented; billable registration now links booking, invoice, hosted payment, registration paid proof, cancellation/refund hard-wall behavior, waitlist promotion booking/invoice linkage, audited attendance mark/clear writes, and session-level cancellation fan-out. | Capacity, eligibility, registration, cancellation, roster, and attendance are backend-authoritative and linked to payment/proof. |
| 8     | Coach delivery and attendance            | Coach, parent, athlete, club          | Coach sees assigned work, safety essentials, roster, attendance, completion.                 | booking/group session authority, attendance records, trust services                  | session complete, roster, schedule, coach dashboard                                        | Booking completion now has a backend coach-only transition and writes attendance plus progress-visible session-note proof; richer media/review proof linkage is still split. | Attendance and completion produce backend records that feed parent proof, coach console, and compliance evidence.                |
| 9     | Development proof, video, review, rebook | Parent, athlete, coach                | Delivery becomes visible progress, media proof, review, and repeat booking.                  | progress service, `/v1/athletes/:id/progress`, `/v1/uploads*`, `/v1/videos*`, booking-linked reviews | development routes, videos, review, profile proof                                          | Video creation now requires backend upload finalization plus latest clean malware-scan proof before media can become usable; progress reads are db-aware, completion notes feed progress, review submission/status have completed-booking API authority, and profile reviews read verified backend proof; broader storefront proof cleanup remains. | Proof is session-linked; private notes do not leak; reviews are booking-linked; rebook preserves context.                        |
| 10    | Safeguarding and incident response       | Coach, parent, safeguarding/admin     | Concerns can be raised and restricted users can act safely.                                  | `/v1/safeguarding/incidents*`, trust services                                        | report problem, raise concern, incident follow-up                                          | Core routes implemented, but broader trust-access/grant coverage remains a known seam.                                                                                      | Default deny, assigned/scope-only reads, audited writes/reads, and tested denial paths.                                          |
| 11    | Club operating loop                      | Club admin, coach, parent, compliance | Club can manage staff, squads, schedule, updates, paid activity, evidence.                   | `contracts/club-governance.ts`, `/v1/clubs*`, club schedule service                  | club hub, settings, schedule, squads, invites                                              | Club create/memberships/squads planned; legacy `club-service.ts` has high `/api/*` debt.                                                                                    | Club operations use capabilities, not ad-hoc roles; staff assignment and sensitive visibility are auditable.                     |
| 12    | Operational communication                | Club staff, coach, parent, athlete    | Staff-led feed, messages, notifications keep people coordinated.                             | `/v1/posts`, `/v1/posts/:postId/comments`, `/v1/message-threads`, `/v1/me/notifications` | feed, club posts, profile posts, chat, notifications                                       | Reads are db-aware; post comment create/delete, group message send/read, notification state, and preferences are backend-owned; remaining risk is staff-only post creation, comment reactions, message delete, and direct-message send. | Staff top-level posting only; comments controlled; message/notification state is relationship-scoped and reliable.               |

## Data Completeness Map

| Data area                            | Production owner                                       | Current state                                                                                                                                                                                              | Required before launch                                                                                        |
| ------------------------------------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Identity, auth sessions, devices     | `/v1/auth/*`, auth runtime, Prisma                     | Mostly implemented                                                                                                                                                                                         | Rate limits, full session audit, real forgot/reset behavior, staging proof                                    |
| Users, roles, acting role            | API authz runtime                                      | Implemented with known broader grant gaps                                                                                                                                                                  | No forged role headers outside test harness; deny tests for each sensitive journey                            |
| Families, athletes, guardians        | `/v1/families*`, `/v1/athletes*`                       | Core implemented; guardian invite/list/accept/decline/cancel/remove now runs through backend family authority with audited allow/deny paths and same-payload invite replay                                                                                              | Broader guardian permission/versioning and no silent save failures                                            |
| Medical, emergency, consents, SEN    | Athlete health routes                                  | Implemented core                                                                                                                                                                                           | Sensitive-read audit coverage, narrow readiness summaries, scoped coach/club access proof                     |
| Coach profile, offers, availability  | `/v1/coaches/me/*`, availability slots                 | Partial                                                                                                                                                                                                    | Profile writes, offering writes, verification document authority, no local `SESSION_OFFERINGS` hot-path truth |
| Discover map/storefront              | discover/profile services plus coach/availability APIs | Partial                                                                                                                                                                                                    | Map shows only real bookable openings; price/slot/trust proof matches booking backend                         |
| Direct bookings                      | `/v1/bookings*`                                        | Create/list/detail db-backed; lifecycle has idempotency, conflict/version checks, status-event audit, invoice cancellation/refund hard-wall behavior, completion attendance/session-note proof, and db-fixture parent/coach/deny proof | Live Stripe provider cutover, broader mirror cleanup                                                          |
| Recurring/multi-week/block packaging | `/v1/booking-series` plus future recurring-plan routes | Multi-week package create/list/detail/cancel/pause/resume/update now use backend series authority in non-mock mode, no longer write local booking mirrors, derives partial/completed state from backend booking completion, records attendance/session-note proof on completed linked bookings, and backend-syncs/voids mutable linked invoices on update/cancel | Richer recurring-plan product semantics and UI linkup                                                          |
| Session invites                      | `/v1/invites*`                                         | Scaffolded; direct invite create now has same-key idempotency replay/conflict, direct invite acceptance creates bookings through backend booking repository authority in db mode, terminal responses replay safely, accept/decline flips after response are denied, and create/cancel/remind/dismiss/respond write paths emit allowed and denied audit events | Full invite repository extraction, broader idempotency coverage for remaining writes, and UI mirror cleanup |
| Group sessions/camps                 | `/v1/group-sessions*`, registrations                   | Implemented partial; billable registration and waitlist promotion now create linked backend booking/invoice state, registration `paidAt` is written only by backend payment confirmation, registration and session cancellation now apply open-invoice voiding plus paid-invoice refund hard walls, cancelled sessions reject new registrations, and attendance mark/clear writes audit events | Contracts/serializers and broader proof linkage |
| Attendance/completion                | Booking/group delivery APIs                            | Booking completion writes backend attendance proof and session-note proof when the coach supplies a completion note; group attendance mark/clear writes audit events, and cancelled group sessions detach attendance from the live session                                         | Broader proof/media linkage                                                  |
| Progress/notes/feedback              | Progress APIs plus proof services                      | `/v1/athletes/:athleteId/progress` is db-aware for notes, feedback, and skill assessments; completion-created session notes now feed the progress surface                                                   | Broader feedback write authority and private note leakage tests                                                |
| Video/media/uploads                  | `/v1/uploads/init`, `/v1/uploads/:uploadSessionId/complete`, `/v1/videos*` | Upload init, completion, scan proof, and video creation now have a backend hard wall: pending, unscanned, outsider-owned, quarantined, or infected media cannot create videos, and upload init/complete plus denied video create paths are audited. | Real malware-scanning provider integration and storage-object verification before launch rehearsal             |
| Reviews/favourites/rebook            | Booking-linked review/rebook services                  | Partial; `GET /v1/bookings/:bookingId/reviews/me` and `POST /v1/bookings/:bookingId/reviews` now keep booking review status/submission backend-authoritative for the booked guardian/athlete, duplicate submits replay verified proof, coach profile review tabs read verified reviews from `/v1/coaches/:coachId/reviews`, repeat booking drafts read `/v1/bookings/:bookingId/rebook-context` before prefill, and saved-coach relationships use `/v1/me/favourite-coaches*` in non-mock mode | Broader profile/storefront proof cleanup                                   |
| Invoices/payments/refunds            | `/v1/invoices*`, payment attempts                      | DB-fixture invoice generation and manual money transitions link back to authoritative booking state; legacy earnings payment/refund writes fail closed in non-mock mode; hosted provider remains simulated; verified backend refund endpoint unlocks paid-booking cancellation only after full refund approval | Live Stripe boundary decision and production SMS/2FA integration                                              |
| Earnings/payouts/withdrawals         | Future `/v1` money APIs                                | Legacy `/api`                                                                                                                                                                                              | Remove fake payout processing from launch or implement proper backend authority                               |
| Clubs, memberships, squads           | `/v1/clubs*`, governance contract                      | Partial                                                                                                                                                                                                    | Club create, member ops, squads, branding/dashboard authority; no legacy `club-service.ts` `/api` operations  |
| Club schedule/events/RSVP            | Club schedule/event APIs                               | Scaffold/seed risk                                                                                                                                                                                         | DB-backed schedule/events/RSVP; idempotency/audit for RSVP/attendance                                         |
| Feed/posts/comments                  | Community/media APIs                                   | Post reads plus post comment list/create/delete now run through the shared backend community/media repository in seed and `db` modes; comment authors come from auth, readable-post scope is enforced, one-level replies and idempotency conflicts are tested, and comment likes fail closed outside mock until a comment-reaction model exists. | Staff-only post create path, controlled comment policy/versioning, and backend comment reactions                                    |
| Messaging/notifications              | Community/media APIs                                   | Message-thread reads plus group message send/read receipts now use backend authority with active group membership gates, auth-derived sender/reader, idempotent message create replay/conflict, and allowed/denied audit events; notification read/dismiss/clear and preference mutations are backend-owner scoped and audited | Message delete/direct-message send backend-owned or deferred                                                 |
| Safeguarding/incidents               | `/v1/safeguarding/incidents*`                          | Implemented partial                                                                                                                                                                                        | Stricter assignment/assignee policy, idempotency/conflicts, legal hold/encryption proof                       |
| Access grants/delegation             | Access grant APIs                                      | Read-only/planned                                                                                                                                                                                          | Create/revoke grants, finance/admin scopes, audit of grant changes                                            |
| Audit/security/retention             | Audit/security runtimes                                | Partial                                                                                                                                                                                                    | Coverage for bookings, clubs, videos, group sessions, messages, refunds, sensitive reads                      |

## Critical Blockers From Agentic Review

1. Session invite create now has same-key idempotency replay/conflict, acceptance creates authoritative db-mode bookings through the backend booking repository, terminal response replay is safe, accept/decline flips after response are denied, and create/cancel/remind/dismiss/respond writes emit allowed/denied audit events; remaining invite risk is full invite repository ownership plus broader idempotency coverage for remaining writes.
2. Direct booking confirmation is now gated behind successful `POST /v1/bookings`; keep the guard test green while lifecycle work continues.
3. Booking create/list/detail/cancel/reopen/complete now have db-fixture proof that a parent can book a child, the coach can see and complete delivery, unrelated parent/coach/athlete actors are denied, linked invoice/payment state is hardened on cancellation/reopen, completion creates attendance and progress-visible session-note proof, review status/submission are booking-authoritative in API mode, and booking mirrors are not client-local API-mode authority; remaining booking risk is broader mirror cleanup.
4. Multi-week package create/list/detail/cancel/pause/resume/update now runs through `/v1/booking-series*` in non-mock mode, writes backend `RecurringSeries` and linked bookings, keeps local mirrors non-authoritative, derives partial/completed series state from backend booking completion, records attendance/session-note proof for completed linked bookings, backend-syncs mutable linked invoices on reschedule, voids open linked invoices on cancellation, and blocks paid/settled invoice-linked changes until explicit adjustment/refund authority handles them.
5. Video/media now requires backend upload finalization and latest clean malware-scan proof before video creation; remaining launch risk is replacing the current backend finalizer with a real malware-scanning/storage verification provider.
6. Invoice manual transitions now run through the db-aware invoice runtime and require authoritative booking linkage; legacy earnings payment/refund writes fail closed outside mock; backend refunds now have the simulated verification-code hard wall and still need production SMS/2FA provider integration before launch.
7. Club schedule, events/RSVP, coach verification documents, and club admin operations still need backend authority or launch demotion.
8. Guardian sharing invite/list/accept/decline/cancel/remove now has production backend authority; remaining launch risk is broader guardian permission versioning.
9. Health/injury frontend linkup now uses `/v1/athletes/:athleteId/injuries` and `/v1/injuries/:injuryId` in non-mock mode and fails closed instead of writing local injury records when the backend denies or fails; remaining family-readiness risk is broader sensitive-read coverage.
10. Post comment create/delete, community group message send/read writes, and notification read/dismiss/clear/preference state are backend-owned in API mode; remaining community/messaging/notification write risk is staff-only post creation, comment reactions, message delete, and direct-message send.
11. Audit/security coverage is not broad enough for bookings, clubs, videos, group sessions, messages, refunds, and sensitive reads.
12. The API boundary baseline is lower but not production-clean; it is a ratchet, not a green release signal.

## Cross-Feature Source-Of-Truth Rules

- `Booking` is the central paid commitment record for `1-to-1`.
- `GroupSessionRegistration` is the central paid commitment record for group sessions and holiday camps.
- `Invoice` and `PaymentAttempt` own money state; UI never marks paid directly.
- `AttendanceRecord` and completion-linked `SessionNote` rows bridge delivery to compliance and progress.
- `SessionFeedback`, `SessionNote`, `Video`, and `Review` must link back to booking or registration context.
- `ClubMembership`, `SquadMembership`, and assignment records control visibility; club membership alone does not grant child medical, safeguarding, finance, or coach-private access.
- Feed/update visibility comes from club, squad, session, booking, followed coach, or explicit relationship. No generic global social graph for launch.

## Implementation Sprints

### `PROD-API-01` Reality Matrix And Baseline Lock

Objective:

- Make production readiness measurable and enforce that new AI code cannot add new source-of-truth drift.

Scope:

- Keep this matrix current.
- Keep `scripts/api-boundary-audit.js` green.
- Keep `docs/backend-api/ROUTE_INVENTORY_V1.md` at `0` untraced backend routes.
- Triage the `90` PDOS route decisions into keep/demote/delete/implement.

Exit gate:

- API boundary audit has no new findings.
- Route inventory traces every active backend route.
- PDOS route authority audit has a named owner/sprint for every route still needing a decision.

### `PROD-API-02` Booking Authority Burn-Down

Objective:

- Make the discover-to-book paid commitment loop backend-authoritative.

Scope:

- `/v1/bookings` list/create/detail/cancel/reopen.
- Availability slot agreement between map/profile/session-type/review/backend.
- Remove non-mock local booking and offering authority from booking hot paths.
- Add idempotency, conflict, denial, and repository-filter tests.

Exit gate:

- A parent can book a child in staging db mode.
- A coach can see the booking.
- Unauthorized parent/coach/athlete reads deny.
- Local storage is only a mirror or client runtime state.

### `PROD-API-03` Family, Medical, Consent, And Readiness

Objective:

- Make child readiness safe, narrow, and useful.

Scope:

- Family dashboard, child profile, medical, emergency, consents, guardian sharing.
- Readiness summary for booking and attendance.
- Sensitive read audit events and denial tests.

Exit gate:

- Booking/delivery can determine readiness without broad sensitive leaks.
- Coach and club access depends on assignment/squad/session/booking scope.

### `PROD-API-04` Coach Supply And Storefront Truth

Objective:

- Make discover map, coach homepage, offers, price, availability, and go-live state agree.

Scope:

- Coach profile PATCH.
- Offering writes.
- Verification document upload/status.
- Discover map result DTOs.
- Public coach profile proof/review blocks.

Exit gate:

- A coach can become bookable in staging db mode.
- The map only shows providers with real bookable openings.
- Profile, offer, and booking wizard use the same `/v1` authority.

### `PROD-API-05` Group Session, Camp, Attendance, And Roster

Objective:

- Make group sessions and holiday camps one paid operating flow.

Scope:

- Group session create/publish/cancel/register/roster/attendance.
- Waitlist decision: implement or explicitly defer.
- Link attendance and delivery proof to invoice/payment state.
- Keep `:sessionId` route aliases traced and harden attendance/payment/proof linkage.

Exit gate:

- Capacity and eligibility cannot be bypassed from the UI.
- Attendance writes feed proof and compliance.

### `PROD-API-06` Money, Refund Hard Wall, And Reconciler

Objective:

- Make money state backend-owned and auditable.

Scope:

- Invoice list/detail/generate/reminders/transitions.
- Hosted payment attempt lifecycle.
- Refund hard wall: permission, registered-number SMS/2FA code, reason, audit.
- Earnings/reconciler surfaces.

Exit gate:

- App cannot mark hosted payment paid.
- Manual overrides and refunds are gated and audited.
- Provider simulation is isolated behind a provider boundary and clearly not live provider cutover.

### `PROD-API-07` Delivery Proof And Retention Loop

Objective:

- Make every delivered session produce useful proof and repeat-business context.

Scope:

- Session completion, feedback, public/private notes, video, review, rebook, recurring/continue-plan.
- Harden progress/goals/badges behind session-linked proof and remove raw/local proof seams.

Exit gate:

- Parent sees useful proof.
- Athlete sees next work.
- Coach can rebook or continue without re-entering context.

### `PROD-API-08` Club OS, Feed Discipline, And Compliance Evidence

Objective:

- Make club operations and staff-led communication credible without broad social drift.

Scope:

- Club create, memberships, squads, staff assignment, schedule, updates.
- Staff-only top-level feed posts and controlled comments.
- Compliance exports for attendance, consent, safeguarding, finance, and sensitive reads.

Exit gate:

- Club admin can operate paid activity.
- Coaches see assigned work.
- Parents receive relevant updates.
- Exports are scoped, redacted, and audited.

### `PROD-API-09` Production Rehearsal

Objective:

- Run the real app against the real API/staging database and leave only external launch blockers.

Scope:

- Staging env, migrations, object storage, Sentry, release preflight.
- End-to-end loop: discover -> book/register -> pay -> attend -> proof -> review/rebook -> owner evidence.

Exit gate:

- No mock-only success path is required for launch-critical flows.
- All release blockers are real external provider/env items, not code truth gaps.

## Immediate Burn-Down Order

1. Trace the `19` untraced backend routes or demote them.
2. Start booking authority burn-down because it connects discover, family readiness, payment, attendance, proof, and rebook.
3. Remove local `SESSION_OFFERINGS` authority from discover/book/profile hot paths.
4. Remove local `BOOKINGS` authority from booking detail/review/progress hot paths.
5. Close invoice transition/refund hard-wall design before money UI is trusted.
6. Run staging smoke and release preflight after each authority slice.

## Hard Stop Rules

- Do not ship a UI success screen before backend success.
- Do not add new `/api/*` paths.
- Do not add new trust-sensitive local storage authority.
- Do not add new raw frontend fetches.
- Do not add new route strings outside `navigation/routes.ts`.
- Do not broaden club/admin/coach access without an explicit policy and audit event.
- Do not treat simulated payment provider behavior as live payment readiness.
