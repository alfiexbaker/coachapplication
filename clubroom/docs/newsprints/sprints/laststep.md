# Last Step Handoff

Date: 2026-05-28

## Latest Update

1. Continued `PROD-API-02` / `PROD-API-04` by retiring more API-mode `SESSION_OFFERINGS` hot-path authority.
2. `app/book/[coachId]/schedule.tsx` now verifies a selected offering through `/v1/coaches/:coachId/offerings` outside mock mode before locking the schedule, and fails closed if the selected offering is gone.
3. `app/discover/map.tsx`, `hooks/use-coach-detail.ts`, and `hooks/use-public-profile.ts` now use `services/coach-offering-api.ts` in API mode; their local `SESSION_OFFERINGS` reads remain mock-only.
4. Source-of-truth docs, route inventory, and the production readiness matrix now record that booking session-type/schedule, Discover Map fast-track, and public coach profile offering sections use the backend offering route in non-mock mode; broader discover/session-listing/org surfaces still have remaining offering debt.
5. Verification: `npm run typecheck` passed, `node ./scripts/api-boundary-audit.js --update-baseline` ratcheted the boundary baseline from `256` to `254`, and `npm run verify:slice:full` passed with API tests `118/118` and `0` new API-boundary findings.

## Previous Update

1. Continued `PROD-API-02` / `PROD-API-04` with the public coach offering read/linkup slice.
2. Added backend `GET /v1/coaches/:coachId/offerings` so authenticated booking consumers can read the target coach's active, non-deleted offerings without relying on local `SESSION_OFFERINGS`.
3. Shared coach offering DTO mapping now lives in `services/coach-offering-api.ts`; `useCoachProfile` still uses `/v1/coaches/me/offerings`, while `app/book/[coachId]/session-type.tsx` uses `/v1/coaches/:coachId/offerings` outside mock mode.
4. Route inventory, source-of-truth docs, and the production readiness matrix now record that booking session-type selection no longer uses local offering authority in API mode; discover/profile surfaces still have remaining `SESSION_OFFERINGS` debt.
5. Verification: `npm --prefix apps/api run typecheck`, `npm run typecheck`, focused `LOG_LEVEL=fatal npx tsx --test src/modules/coach-club/routes.test.ts` passed (`15/15`), and `npm run verify:slice:full` passed with API tests `118/118` and `0` new API-boundary findings.

## Earlier Update

1. Continued `PROD-API-02` / `PROD-API-08` with the backend-owned comment reaction slice.
2. Added Prisma `PostCommentReaction` persistence plus import/migration support so comment likes have a real backend-owned model in `db` mode.
3. Added `POST /v1/comments/:commentId/reactions/toggle`; readable-post scope is required, actors come from auth, deleted comments reject reactions, and allowed/denied toggles are audited.
4. `comment-service.ts` now calls the reaction toggle route outside mock mode and maps backend `likesCount` / `likedByCurrentUser` into the comment UI model instead of failing closed or writing local like state.
5. Route inventory, source-of-truth docs, and the production readiness matrix now mark comment reactions as backend-authoritative; remaining operational communication risk is richer moderation/versioning.
6. Verification: `DATABASE_URL=postgresql://clubroom:clubroom@localhost:5432/clubroom?schema=public npm --prefix packages/db run prisma:validate`, `DATABASE_URL=postgresql://clubroom:clubroom@localhost:5432/clubroom?schema=public npm --prefix packages/db run prisma:generate`, `npm --prefix apps/api run typecheck`, focused `LOG_LEVEL=fatal npx tsx --test src/modules/wave2plus/routes.test.ts` passed (`38/38`), `npm run typecheck`, and `npm run verify:slice:full` passed with API tests `118/118` and `0` new API-boundary findings.

## Earlier Update

1. Continued `PROD-API-02` with the real-db session invite persistence slice.
2. `/v1/invites*` now loads real `db` mode session invites from Prisma `Invite`/`InviteTarget` rows instead of returning `503` or falling back to marketplace seed rows.
3. Session-invite create/cancel/remind/dismiss/respond now commits invite, target, and create-idempotency mutations through the Prisma-backed route adapter; direct invite acceptance still creates bookings through the backend booking repository.
4. Recurring invite partial acceptance and invite RSVP state remain fail-closed outside mock mode until their backend authority is implemented.
5. Verification: `npm --prefix apps/api run typecheck`, focused `LOG_LEVEL=fatal npx tsx --test src/modules/p0-core/routes.test.ts` passed (`24/24`), and `npm run verify:slice:api` passed with API tests `118/118` and `0` new API-boundary findings.
6. `OBS-RUNTIME-01` follow-up: Sentry MCP found no unresolved `staging` issues for `tubton/react-native` or `tubton/clubroom-api`; with `npm run api:dev:staging` running, `npm run smoke:api-mode` passed reachability and `npm run smoke:api-mode:strict` still failed because `/v1/ready` reports `DATABASE_UNAVAILABLE` for Supabase pooler user `postgres.oucxazyrimujqmakxfiv`.

## Earlier Update

1. Continued `PROD-API-01` / `PROD-API-02` with the real-db invite scaffold hard-wall slice.
2. `/v1/invites*` no longer falls back to marketplace seed rows when `API_DATA_BACKEND=db` and a real `DATABASE_URL` is configured; outside the API test db-fixture fallback, the scaffold returns `503` until a Prisma invite repository exists.
3. Added API proof that real db-mode invite reads return `SERVICE_UNAVAILABLE` instead of pretending seed invite authority is production truth.
4. Route inventory and runtime-truth docs now mark `/v1/invites*` as seed/db-fixture only until repository extraction.
5. Verification: `npm --prefix apps/api run typecheck`, focused `LOG_LEVEL=fatal npx tsx --test src/modules/p0-core/routes.test.ts` passed (`24/24`), and `npm run verify:slice:api` passed with API tests `118/118` and `0` new API-boundary findings.

## Earlier Update

1. Continued `PROD-API-02` with the remaining invite local-authority hard-wall slice.
2. `sessionInviteService.respondToRecurringInvite` now fails closed in API mode instead of accepting weekly invite choices through local `SESSION_INVITES`, local booking-series creation, local notifications, and local hold release.
3. `inviteRsvpService` now fails closed in API mode for RSVP response, counts, respondent lists, and status updates instead of writing local `INVITE_RSVPS` or syncing local invite counters.
4. Added service tests proving API-mode recurring invite response and invite RSVP writes deny without mutating local storage.
5. Verification: `npm run typecheck`, `npm run test:compile`, focused compiled invite service tests passed (`21/21`), and `npm run verify:slice:app` passed with `0` new API-boundary findings.

## Earlier Update

1. Continued `OBS-RUNTIME-01` with the API-mode startup reachability slice.
2. Added `npm --prefix apps/api run dev:staging` plus root `npm run api:dev:staging`; the staging dev command loads `.env.staging.local`, binds Fastify with `API_HOST=0.0.0.0`, and exposes the configured LAN API origin used by the app and smoke runner.
3. `scripts/api-mode-runtime-smoke.js` now reports the loaded server host/port, probes loopback when a non-loopback API origin fails, and tells agents to restart with `dev:staging` instead of the plain loopback-only dev command.
4. Runtime docs and sprint runbooks now point API-mode staging startup at `dev:staging`.
5. Verification: `npm run smoke:api-mode` passed against `http://192.168.1.127:4000` with Fastify running; `npm run smoke:api-mode:strict` still fails on Supabase `DATABASE_UNAVAILABLE` because the configured Postgres tenant/user `postgres.oucxazyrimujqmakxfiv` is not found.

## Earlier Update

1. Continued `PROD-API-02` / `PROD-API-08` with the direct/thread message send and delete authority slice.
2. Added backend-owned `POST /v1/message-threads/:threadId/messages` and `DELETE /v1/messages/:messageId`.
3. Direct/thread message creation now requires authenticated active thread participation; the sender is derived from auth, attachments are denied until backend media proof exists, idempotency replay/conflict is enforced, and allowed/denied writes are audited.
4. Message delete now requires the authenticated sender or privileged admin, soft-deletes through the backend, updates thread last-message state, audits allowed/denied deletes, and repeat deletes conflict.
5. `messagingService.sendMessage` and `messagingService.deleteMessage` now use the backend authority path outside mock mode instead of creating or hiding direct messages through local overlays.
6. Verification: `npm --prefix apps/api run typecheck`, `npm run typecheck`, `npm run test:compile`, focused `LOG_LEVEL=fatal npx tsx --test src/modules/wave2plus/routes.test.ts` passed (`38/38`), compiled messaging smoke tests passed (`6/6`), and `npm run verify:slice:full` passed with API tests `117/117` and `0` new API-boundary findings.

## Earlier Update

1. Continued `PROD-API-02` / `PROD-API-08` with the staff-led feed post creation authority slice.
2. Added backend-owned `POST /v1/posts` for staff top-level feed publishing.
3. Post creation now requires authenticated active club/group staff or privileged admin scope; the author is derived from auth, media attachments are denied until backend upload proof exists, idempotency replay/conflict is enforced, and allowed/denied writes are audited.
4. `social-feed-service.ts` now uses `createPostAuthority` and `createCoachPostAuthority` in non-mock mode; old sync `createPost` and `createCoachPost` are mock-only and fail closed in API mode, while the create-post modal surfaces backend errors inline.
5. Verification: `npm --prefix apps/api run typecheck`, `npm run typecheck`, focused `LOG_LEVEL=fatal npx tsx --test src/modules/wave2plus/routes.test.ts` passed (`36/36`), compiled social feed tests passed (`29/29`), and `npm run verify:slice:full` passed with API tests `115/115` and `0` new API-boundary findings.

## Earlier Update

1. Continued `PROD-API-02` / `PROD-API-08` with the post comment authority slice.
2. Added backend-owned `GET /v1/posts/:postId/comments`, `POST /v1/posts/:postId/comments`, `GET /v1/comments/:commentId`, and `DELETE /v1/comments/:commentId`.
3. Comment reads/writes now require readable-post scope; creates derive the author from auth, enforce one-level replies, support idempotency replay/conflict, and audit allowed/denied writes.
4. `comment-service.ts` now uses those `/v1` routes outside mock mode; local comment storage is mock-only, and comment likes deliberately fail closed in API mode until a backend comment-reaction model exists.
5. Verification: `npm --prefix apps/api run typecheck`, `npm run typecheck`, compiled comment-service tests passed (`60/60`), focused `LOG_LEVEL=fatal npx tsx --test src/modules/wave2plus/routes.test.ts` passed (`34/34`), and `npm run verify:slice:full` passed with API tests `113/113` and `0` new API-boundary findings.

## Earlier Update

1. Continued `PROD-API-02` with the notification preference authority slice.
2. Added backend-owned `PATCH /v1/me/notifications/preferences` for channel, quiet-hours, type-preference, and muted-coach state.
3. Preference writes are self-scoped from auth; forged user ownership cannot target another account, and coach mute/unmute state is stored in backend `MutedSource` rows.
4. `notificationPreferencesService` now uses the `/v1` preference route outside mock mode; local preference overlays are mock-only for these settings.
5. Verification: `npm --prefix apps/api run typecheck`, `npm run typecheck`, focused `LOG_LEVEL=fatal npx tsx --test src/modules/wave2plus/routes.test.ts` passed (`32/32`), and `npm run verify:slice:full` passed with API tests `111/111` and `0` new API-boundary findings.

## Earlier Update

1. Continued `PROD-API-02` with the notification read/dismiss authority slice.
2. Added backend-owned notification mutation routes: `POST /v1/me/notifications/:notificationId/read`, `POST /v1/me/notifications/:notificationId/dismiss`, `POST /v1/me/notifications/read-all`, and `POST /v1/me/notifications/dismiss-all`.
3. Notification read/dismiss state now requires authenticated owner scope; cross-user mutations are denied and audited, while bulk read/clear runs against the authenticated user's notifications only.
4. `notificationStore` now uses the `/v1` mutation routes outside mock mode; local read/dismiss/clear overlays are no longer API-mode authority.
5. Verification: `npm --prefix apps/api run typecheck`, `npm run typecheck`, focused `LOG_LEVEL=fatal npx tsx --test src/modules/wave2plus/routes.test.ts` passed (`30/30`), and `npm run verify:slice:full` passed with API tests `109/109` and `0` new API-boundary findings.

## Earlier Update

1. Continued `PROD-API-02` with the community group messaging write authority slice.
2. Added backend-owned `POST /v1/community-groups/:groupId/messages` and `POST /v1/community-groups/:groupId/messages/read`.
3. Group message sender/read state now comes from authenticated active group membership; outsiders are denied, message create uses idempotency replay/conflict, and allowed/denied write paths are audited.
4. `communityMessagingService` now uses the `/v1` routes outside mock mode; local group-message and read-receipt overlays are mock-only.
5. Verification: `npm --prefix apps/api run typecheck`, `npm run typecheck`, focused `LOG_LEVEL=fatal npx tsx --test src/modules/wave2plus/routes.test.ts` passed (`29/29`), and `npm run verify:slice:full` passed with API tests `108/108` and `0` new API-boundary findings.

## Earlier Update

1. Continued `PROD-API-01` with the seed-only route cleanup slice.
2. `/v1/meta/seed-health` now requires an authenticated privileged admin before exposing internal seed coverage counters.
3. `/v1/drills` now requires authentication and only allows coach self-read unless the actor is a privileged admin.
4. `OBS-RUNTIME-01` check: `npm run smoke:api-mode` passes when Fastify is running; `npm run smoke:api-mode:strict` still fails on Supabase `DATABASE_UNAVAILABLE` because the configured Postgres tenant/user is not found. Sentry MCP showed no unresolved `staging` issues for `tubton/react-native` and no unresolved issues for `tubton/clubroom-api`.
5. Verification: `npm --prefix apps/api run typecheck`, focused `LOG_LEVEL=fatal npx tsx --test src/modules/wave2plus/routes.test.ts` passed (`27/27`), and `npm run verify:slice:full` passed with API tests `106/106` and `0` new API-boundary findings.

## Earlier Update

1. Continued `PROD-API-02` with the session invite write hardening slice.
2. `POST /v1/invites` now honors same-key idempotency replay/conflict before slot validation can convert a retry into a false pending-hold failure.
3. `sessionInviteAuthorityService.createInvite` now sends a deterministic idempotency key in non-mock mode.
4. `POST /v1/invites/:inviteId/respond` now treats `ACCEPTED` and `DECLINED` as terminal for the invite target: same response replays safely, while accept-after-decline and decline-after-accept are denied and audited.
5. Verification: `npm --prefix apps/api run typecheck`, `npm run typecheck`, focused `LOG_LEVEL=fatal npx tsx --test src/modules/p0-core/routes.test.ts` passed (`23/23`), and `npm run verify:slice:full` passed with API tests `106/106` and `0` new API-boundary findings.

## Earlier Update

1. Continued `PROD-API-03` with the guardian invite acceptance/decline completion slice.
2. Added self-scoped guardian invite inbox and response routes: `GET /v1/me/guardian-invites`, `POST /v1/guardian-invites/:inviteId/accept`, and `POST /v1/guardian-invites/:inviteId/decline`.
3. Accepting a guardian invite now requires the authenticated user's email to match the invitee email, then creates backend family membership plus guardian-child links; declining leaves family access ungranted.
4. `familyRelationshipService.getPendingInvitesForUser`, `acceptInvite`, and `declineInvite` now use those `/v1` routes in non-mock mode instead of failing closed or using local invite state.
5. Verification: `npm --prefix apps/api run typecheck`, `npm run typecheck`, focused `LOG_LEVEL=fatal npx tsx --test src/modules/family-athlete/routes.test.ts` passed (`15/15`), `npm run test:family` passed (`53/53`), and `npm run verify:slice:full` passed with API tests `106/106` and `0` new API-boundary findings.

## Earlier Update

1. Continued `PROD-API-03` with the guardian sharing authority slice.
2. Added backend-owned family guardian invite/cancel/remove routes: `POST /v1/families/:familyId/guardians`, `DELETE /v1/families/:familyId/guardian-invites/:inviteId`, and `DELETE /v1/families/:familyId/guardians/:guardianId`.
3. Added `FamilyGuardianInvite` Prisma runtime schema/migration and db-fixture behavior; duplicate same-payload pending guardian invites replay, mismatched duplicate invites deny, non-admin family members deny, and primary guardians cannot be removed.
4. `familyRelationshipService` now reads `/v1/families/:familyId` and uses those `/v1` guardian sharing writes in non-mock mode instead of local family account/invite storage; the sharing hook now checks `Result` failures before showing success.
5. Verification so far: `npm --prefix packages/db run prisma:generate`, `npm --prefix apps/api run typecheck`, `npm run typecheck`, and focused `LOG_LEVEL=fatal npx tsx --test src/modules/family-athlete/routes.test.ts` passed (`13/13`).

## Earlier Update

1. Continued `PROD-API-03` with the health/injury frontend linkup cleanup slice.
2. `services/injury-service.ts` now calls `/v1/athletes/:athleteId/injuries` and `/v1/injuries/:injuryId` in non-mock mode instead of unprefixed paths.
3. Non-mock injury create/list/update/coach-read paths no longer fall back to local `STORAGE_KEYS.INJURIES`; backend denial or failure now fails closed instead of inventing local health state.
4. Non-mock actor-specific injury reads now defer to backend health authz instead of local `AUTH_USER` child lists, while mock mode keeps the local access behavior for tests/demo.
5. Verification: `npm run typecheck` passed; `npm run test:compile && node --require ./scripts/test-register.js --test .tmp-tests/__tests__/health/injury-service.test.js` passed (`37/37`); `npm run verify:slice:app` passed with `0` new API-boundary findings and `git diff --check`; `rg` found no remaining injury-service local-fallback or legacy injury `/api` path references.

## Earlier Update

1. Continued `PROD-API-02` / `PROD-API-07` with the media upload finalization and scan hard-wall slice.
2. Added `POST /v1/uploads/:uploadSessionId/complete` so upload completion is a backend-owned transition that records clean malware-scan proof before media becomes `AVAILABLE`.
3. `/v1/videos` creation now rejects pending, unscanned, quarantined, infected, or outsider-owned media instead of marking media available from video creation.
4. `video-service.ts` now calls upload init -> signed PUT upload -> backend finalize/scan -> video create in non-mock mode, and the upload hook exposes the finalizing/scanning stage.
5. Added API proof for denied pending-media video creation, allowed creation after finalization, denied outsider upload completion, quarantined/infected media denial, and upload init/complete/video deny audit events.
6. Verification: `npm --prefix apps/api run typecheck` passed; focused `LOG_LEVEL=fatal npx tsx --test src/modules/wave2plus/routes.test.ts` passed (`27/27`); `npm run verify:slice:full` passed, including app typecheck, app test compile, API typecheck, full API tests (`101/101`), API-boundary audit, UI static gates, and `git diff --check`.

## Earlier Update

1. Continued `OBS-RUNTIME-01` with the API-mode runtime smoke guardrail slice.
2. `scripts/db-staging-preflight.js` now loads `.env.staging.local` by default, masks `SENTRY_DSN`, and reports the local staging env as ready instead of falsely missing every env var.
3. Added `scripts/api-mode-runtime-smoke.js` plus `npm run smoke:api-mode` and `npm run smoke:api-mode:strict`; normal mode proves API-mode Expo has a reachable Fastify `/v1/ready`, while strict mode requires full readiness.
4. Sentry MCP review found no unresolved `staging` issues for `tubton/react-native` and no unresolved issues for `tubton/clubroom-api`.
5. Fastify was started with `.env.staging.local`; `npm run smoke:api-mode` passed, but strict readiness is still blocked by `DATABASE_UNAVAILABLE` from the configured Supabase Postgres connection.
6. Verification: `npm run smoke:api-mode`, `npm run audit:db:stage`, `npx expo install --check`, `npm run typecheck`, and `npm run verify:slice` passed; `npm run smoke:api-mode:strict` still fails on Supabase `DATABASE_UNAVAILABLE`.

## Earlier Update

1. Continued `PROD-API-02` with the remaining booking-review mirror cleanup slice.
2. Added `GET /v1/bookings/:bookingId/reviews/me` so booking detail and review screens read the signed-in booked guardian/athlete's review status from the backend in API mode.
3. Unrelated actors are denied from reading booking review status, while submitted reviews return the existing verified booking review proof.
4. API-mode booking review submission no longer writes into local legacy review read models; shared review sync storage is now mock/demo compatibility only.
5. Generic coach review submission fails closed outside mock mode so reviews must come from a completed booking context.
6. Verification: `npm run verify:slice:full` passed, including app typecheck, app test compile, API typecheck, and the full API test suite.

## Earlier Update

1. Continued `PROD-API-02` with the saved-coach/favourite authority slice.
2. Added `/v1/me/favourite-coaches*` so saved coaches are self-scoped backend relationships in API mode instead of local `favourites` storage.
3. Added `CoachFavourite` Prisma schema and migration support, plus db-fixture repository behavior for tests and local API validation.
4. Save/remove paths audit success and deny outcomes; the API ignores forged body `userId`, denies coach self-favourite, and only mutates the authenticated user's shortlist.
5. `favouriteService` now uses the backend in non-mock mode and keeps AsyncStorage favourites only for mock/demo mode.
6. Verification: `npm run verify:slice:full` passed, including app typecheck, app test compile, API typecheck, and the full API test suite.

## Earlier Update

1. Continued `PROD-API-02` with the rebook context authority slice.
2. Added `GET /v1/bookings/:bookingId/rebook-context` so repeat booking uses backend-visible booking context instead of local screen state.
3. Coach-only actors are denied from using a delivered booking as a family rebook source; booked family/athlete context returns coach, athlete, service, location, duration, objectives, and price context for the next draft.
4. `bookingService.getRebookDraftContext` now uses the backend route in non-mock mode and preserves mock-mode local mapping.
5. Booking detail `Book Again` now resolves this context before resetting/prefilling the booking draft and routing to schedule.
6. Verification: `npm run verify:slice:full` passed, including app typecheck, app test compile, API typecheck, and the full API test suite.

## Earlier Update

1. Continued `PROD-API-02` with the coach profile review read authority slice.
2. Added `GET /v1/coaches/:coachId/reviews` so coach profiles can read verified public reviews from backend session feedback instead of local review mirrors.
3. The backend read path only returns public reviews tied to completed bookings for that coach, and filters out coach-authored or unrelated feedback even if it is public-looking.
4. `coachService.getCoachReviews` now uses `/v1/coaches/:coachId/reviews` in non-mock mode; mock mode keeps the existing seeded/local merge.
5. Verification: `npm run verify:slice:full` passed, including app typecheck, app test compile, API typecheck, and the full API test suite.

## Earlier Update

1. Continued `PROD-API-02` with the review UI linkup slice.
2. `app/review/[bookingId].tsx` now loads the booking through `bookingService.getBooking`, so non-mock review context comes from `/v1/bookings/:bookingId` instead of local booking storage.
3. Review submission now calls `POST /v1/bookings/:bookingId/reviews` in non-mock mode through `services/review-sync-service.ts`; local/mock review creation remains the mock-mode fallback.
4. Successful backend review responses are best-effort mirrored into legacy review read models only for current coach profile/UI compatibility.
5. Verification: `npm run verify:slice:app` passed; the API-boundary baseline was ratcheted down after one retired legacy finding.

## Earlier Update

1. Continued `PROD-API-02` with the booking-linked review authority slice.
2. Added `POST /v1/bookings/:bookingId/reviews` as a backend authority path for verified coach reviews.
3. Review submission now requires the authenticated actor to be the booked guardian/athlete and the booking to be `COMPLETED`.
4. Duplicate review submissions replay the existing verified review instead of creating local/frontend duplicates.
5. Added audit events for successful and denied booking-review create attempts.
6. Added db-fixture API proof for completed-only review submission, coach and unrelated-parent denial, verified review persistence, duplicate replay, and review audit events.
7. Verification: API typecheck passed; focused p0 core route suite passed.

## Earlier Update

1. Continued `PROD-API-02` with the group-session cancel fan-out slice.
2. `/v1/group-sessions/:sessionId/cancel` now cancels active registrations and linked group-session bookings instead of only flipping the session row.
3. Session cancellation now applies linked invoice runtime effects: open invoices are voided, active payment attempts are canceled, and paid invoices block until backend refund approval.
4. Cancelled/draft/completed group sessions now reject direct registration attempts, so frontend/local state cannot recreate registrations, bookings, or invoices after cancellation.
5. Added API proof for denied parent session cancellation, allowed coach cancellation fan-out, post-cancel registration denial, and paid-invoice refund hard-wall denial.
6. Verification: API typecheck passed; focused booking group-session route suite passed.

## Earlier Update

1. Continued `PROD-API-02` with the invite write audit hardening slice.
2. `/v1/invites` create and `/v1/invites/:inviteId` cancel/remind/dismiss/respond now emit backend audit events for allowed write paths.
3. Denied invite create/remind/dismiss/respond/cancel actor paths now also emit `DENY` audit events before rejecting.
4. Added API proof for seed-mode invite write audit events and db-fixture direct-invite create/respond/replay audit events.
5. Verification: API typecheck passed; focused p0 core route suite passed.

## Earlier Update

1. Continued `PROD-API-02` with the booking completion progress-proof linkage slice.
2. `/v1/bookings/:bookingId/complete` now creates or updates backend-owned `SessionNote` proof when the assigned coach supplies a completion note, linked to the same booking, athlete, coach, and attendance proof IDs.
3. Booking completion status-event metadata now includes both attendance proof IDs and session-note proof IDs; denied parent completion and future-session completion do not create either proof surface.
4. `/v1/athletes/:athleteId/progress` now reads the active DB fixture/Prisma backend in `db` mode instead of always reading marketplace seed tables, so completion-created notes are visible through the existing health read gate.
5. Verification: API typecheck passed; focused p0 core route suite passed; wave2plus route suite passed.

## Earlier Update

1. Continued `PROD-API-02` with the group-session attendance audit hardening slice.
2. `/v1/group-session-registrations/:registrationId/attendance` now writes backend audit events for both mark-attended and clear-attendance operations.
3. Attendance audit metadata includes session id, athlete id, attendance date, requested attended state, and resulting registration status.
4. Added API proof for both `group_session.attendance_marked` and `group_session.attendance_cleared` audit events.
5. Verification: `npm run verify:slice:api` passed, including API typecheck and full API test suite.

## Older Update

1. Continued `PROD-API-02` with the group-session waitlist promotion payment-linkage slice.
2. Waitlist promotion now creates the promoted athlete's linked backend booking when cancellation opens capacity, including the previously missing Prisma path.
3. Billable promoted registrations now receive a sent invoice through the shared invoice runtime; `paidAt` still remains backend-payment-confirmation only.
4. Added API proof that cancellation promotes the earliest waitlisted athlete and creates a confirmed linked booking plus sent invoice.
5. Verification: `npm run verify:slice:api` passed, including API typecheck and full API test suite.

## Older Update

1. Continued `PROD-API-02` with the group-session cancellation/refund effects slice.
2. Group registration cancellation now runs linked booking invoice lifecycle effects before mutating registration state.
3. Open group-registration invoices are voided and active payment attempts are canceled on registration cancellation.
4. Paid group-registration invoices now block cancellation until the backend refund endpoint approves the refund; after refund, cancellation can proceed.
5. Verification: `npm run verify:slice:api` passed, including API typecheck and full API test suite (`97/97`).

## Older Update

1. Continued `PROD-API-02` with the group-session payment proof linkage slice.
2. Billable `/v1/group-sessions/:sessionId/register` now creates a linked backend booking and invoice, while registration `paidAt` stays unset until backend payment confirmation.
3. Hosted payment confirmation now writes group-session registration paid proof by following the authoritative invoice -> booking -> group registration link.
4. Added API proof that a parent registration creates a sent invoice, cannot fake paid state at registration time, and only gains `paidAt` after simulated hosted payment confirmation.
5. Verification: `npm run verify:slice:api` passed, including API typecheck and full API test suite (`95/95`).

## Older Update

1. Continued `PROD-API-02` with the direct invite acceptance authority slice.
2. `/v1/invites/:inviteId/respond` now creates direct-session bookings through backend booking repository authority in `db` mode instead of writing marketplace-seed booking state.
3. Invite acceptance now uses deterministic booking idempotency for replayed accepts, while preserving backend slot validation before booking creation.
4. Added API proof that direct invite acceptance in API `db` mode creates exactly one db-fixture booking, leaves the marketplace seed bookings untouched, exposes the booking through `/v1/bookings/:bookingId`, and replays without duplication.
5. Verification: `npm run verify:slice:api` passed, including API typecheck and full API test suite (`95/95`).

## Older Update

1. Continued `PROD-API-02` with the recurring invoice adjustment semantics slice.
2. Booking-series update/reschedule now backend-syncs mutable linked invoice session fields and line-item descriptions through `apps/api/src/lib/invoice-runtime.ts`; paid, void, or written-off linked invoices block the change until explicit adjustment/refund authority handles them.
3. Booking-series cancellation now applies linked booking invoice effects for each future cancelled booking: open linked invoices are voided and active hosted payment attempts are canceled.
4. Added API tests for paid-invoice update denial, open-invoice reschedule sync, denied cancel no-op, and series cancellation invoice/payment-attempt voiding.
5. Verification: `npm --prefix apps/api run typecheck` passed and `npm --prefix apps/api run test` passed (`94/94`).

## Oldest Update

1. Added a no-human-review AI development pipeline: `docs/AI_DEVELOPMENT_PIPELINE.md`, `docs/templates/AI_TASK_PACKET.md`, and `scripts/verify-slice.js`.
2. Wired `npm run verify:slice`, `verify:slice:app`, `verify:slice:api`, `verify:slice:ui`, and `verify:slice:full` into `package.json`.
3. Updated `CODEX.md`, `START_HERE.md`, `KNOWLEDGE_SPINE.md`, and `BACKLOG.md` so future AI slices use the task packet plus executable gates instead of relying on manual review.
4. Verification: `npm run verify:slice` passed. It retained existing warnings for DB staging readiness and `90` PDOS route decisions without treating them as a false green release signal.

## Prior Update

1. Sentry app project `tubton/react-native` is connected and receiving staging events.
2. Resolved the local wizard drift in code: app Sentry initialization remains centralized in `services/observability/sentry-service.ts`, with no hardcoded DSN, duplicate wrapper, or broad PII/session-replay config in `app/_layout.tsx`.
3. Added `OBS-RUNTIME-01` to the sprint backlog as the immediate runtime/observability gate.
4. Sentry triage found two setup-test issues (`REACT-NATIVE-1`, `REACT-NATIVE-4`) and two real runtime smoke issues (`REACT-NATIVE-2`, `REACT-NATIVE-3`).
5. Root cause for the real Sentry issues: the Expo app was running in API mode while the Fastify API was not listening on port `4000`.
6. Starting `npm --prefix apps/api run dev` makes `/v1/ready` respond; it remains `degraded` until API `SENTRY_DSN` is configured.

## Older Prior Update

1. Added API/UI anti-slop rules to `CODEX.md`, backend API docs, and UI/API bilateral alignment docs.
2. Added `scripts/api-boundary-audit.js` and wired `npm run audit:api-boundaries` into `npm run audit:architecture`.
3. Ran three agentic production-readiness mappers for product journeys, backend/API authority, and frontend/UI linkup.
4. Added `PRODUCTION_READINESS_MATRIX_2026-05-11.md` as the active production hardening matrix.
5. Updated `BACKLOG.md` so `PROD-API-01` runs before more broad PDOS or UI polish work.
6. Current evidence: API boundary audit passes with `256` allowed baseline findings and `0` new findings; agentic readiness passes DB staging env checks and still warns on `90` route decisions.
7. Booking create authority slice landed: direct confirmation waits for `/v1/bookings`, create uses idempotency replay/conflict checks, db-backed create writes in one transaction, and local mirrors are best-effort after API success.

## Findings To Act On

1. The rules are now strong enough to block new obvious slop, but not enough to claim elite production readiness.
2. Main risk is API/source-of-truth maturity, not static UI quality.
3. The current API boundary baseline is a ratchet, not a release pass: `102` legacy `/api/*`, `147` trust-sensitive local-storage patterns, `5` route literals, and `2` frontend raw fetches remain.
4. Booking create/list/detail/cancel/reopen/complete are improved with db-fixture parent/coach/deny proof, completion now creates backend attendance plus progress-visible session-note proof records, repeat booking context now resolves through backend-visible booking truth, saved coaches now use self-scoped backend favourite relationships, and booking review status/submission now run through completed-booking backend authority without API-mode local review mirrors; coach profile review reads now use verified backend proof; multi-week package plus initial recurring-plan creation/list/detail/cancel/pause/resume/update now use backend series authority, recurring reschedule/cancel syncs or voids mutable linked invoices while blocking settled invoices, invoice money transitions now require authoritative booking linkage, legacy earnings payment/refund writes fail closed outside mock, direct invite create/respond has backend idempotency/replay hardening, direct invite acceptance creates db-mode bookings through booking repository authority, invite writes now emit allowed/denied audit events, guardian sharing invite/list/accept/decline/cancel/remove now uses backend family authority, billable group-session registration and waitlist promotion link booking/invoice/payment proof, group registration and session cancellation now apply invoice/refund hard walls, group session cancellation fans out to registrations/bookings/attendance, cancelled sessions reject new registration, group attendance writes now emit audit events, staff-only feed post creation, post comment list/create/delete/reaction toggles, community group message send/read, direct/thread message send/delete, and notification read/dismiss/clear/preferences now use backend authority, media/video creation now requires backend upload finalization plus clean scan proof, and injury frontend linkup now uses `/v1` without local fallback outside mock. Club admin operations, full invite repository extraction, broader profile/storefront proof cleanup, and real malware scanning/storage verification remain the highest-risk gaps.
5. Production rehearsal must wait until P0 journeys have API authority plus UI linkup packets complete.

## Next Exact Action

1. Clear the Supabase staging database readiness issue that makes `npm run smoke:api-mode:strict` fail with `DATABASE_UNAVAILABLE`.
2. Keep `OBS-RUNTIME-01` green: Sentry is clean, API-mode Expo must continue to start only with `apps/api` reachable.
3. Continue backend-authoritative delivery burn-down with the next high-risk slice: full invite repository extraction, club admin operations, richer message moderation/versioning, broader profile/storefront proof cleanup, remaining `SESSION_OFFERINGS` hot paths, or guardian permission/versioning.
4. Keep remaining seed-only/scaffolded route cleanup moving; `/v1/meta/seed-health` and `/v1/drills` are now auth-gated but still not launch product surfaces.
5. Keep `node ./scripts/api-boundary-audit.js` green on every slice.
6. Do not run production rehearsal until booking, child readiness, payment/refund, attendance, proof, club operations, and compliance evidence have backend-authoritative launch paths.

## Verification For This Planning Step

- Runtime code, API tests, route inventory, and production matrix were updated in the latest slice.
- Closeout check passed: `npm run verify:slice:full`.
