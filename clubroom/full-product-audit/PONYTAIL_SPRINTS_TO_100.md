# Ponytail Sprints To 100

Date: 2026-07-07
Starting score: `64/100`
Target score: `100/100`

This is the shortest path from "technically broad" to "feels like a real app".

Rule: no new feature earns sprint space unless it removes fake certainty or makes the V1 product loop real.

## What 100 Means

`100/100` does not mean every idea is built. It means:

- API mode is the default truth.
- No live screen shows fake, mock, demo, synthetic, raw, or "coming soon" content.
- Booking, schedule, session delivery, payment state, parent updates, social coordination, achievements, and trust flows are backed by V1 or honestly hidden.
- Social stays because it coordinates real football activity.
- Payments are honest: either real provider settlement exists or the UI clearly says manual/direct payment.
- Sensitive child, medical, safeguarding, and finance data is backend-authoritative and auditable.
- Native iOS and Android have been dogfooded, not just web.

## Current Truth

- Latest launch-readiness report says `ready`: `reviews/launch-readiness.md`.
- Route inventory has `347` implemented V1 rows, `24` scaffolded rows, and `2` planned rows.
- Product/API QA still found medium issues: raw IDs, raw enum labels, intermittent API fetch noise, booking review `Coach unavailable`, demo-first owner dashboard, and empty recurring bookings.
- The score is `64/100` because readiness gates can pass while the product still feels fake.

## External Setup Needed From You

Do these in parallel with Sprint 1. Do not wait until the end.

| Setup                       | Required values                                                                                                               | Why                                                             |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Staging/production Postgres | `DATABASE_URL`, migrations applied                                                                                            | V1 must run on `API_DATA_BACKEND=db`.                           |
| JWT/auth runtime            | `API_JWT_SECRET`, `API_JWT_ISSUER`, `API_JWT_AUDIENCE`                                                                        | Production auth cannot use mock assumptions.                    |
| Password reset email        | Choose Brevo API, SMTP, or webhook. Set `API_PASSWORD_RESET_EMAIL_FROM`, `API_PASSWORD_RESET_SMOKE_EMAIL`, and provider keys. | Password reset is a launch gate.                                |
| Private object storage      | `S3_ENDPOINT`, `S3_BUCKET_PRIVATE`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`                                   | Uploads, verification, media, and proof need signed storage.    |
| Sentry                      | `SENTRY_DSN`, `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`, `SENTRY_RELEASE`                 | Real app needs error visibility and release tagging.            |
| API URLs                    | `EXPO_PUBLIC_API_URL`, public API domain, return URL origins                                                                  | App and hosted payment return links must point at the real API. |
| Payment policy              | Decide `manual/direct only for V1` or `Stripe sprint`.                                                                        | Current code blocks Stripe provider as not implemented.         |
| Maps                        | `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`                                                                                             | Discovery map should not degrade silently.                      |
| Native release accounts     | Apple, Google Play, Expo/EAS credentials                                                                                      | Needed before native dogfood/release.                           |

## Score Simulation

| Sprint                                | Score | User-visible change                                                                                            |
| ------------------------------------- | ----: | -------------------------------------------------------------------------------------------------------------- |
| Now                                   |    64 | Real bones, too many almost-real surfaces.                                                                     |
| 0. Setup and freeze                   |    66 | Everybody knows what must be configured and what cannot ship.                                                  |
| 1. Kill fake life                     |    72 | No raw IDs, fake counts, demo copy, dead controls, or seeded social activity in API mode.                      |
| 2. Booking/schedule truth             |    79 | Parents and coaches can book, see schedules, review coach details, cancel, and complete without hollow states. |
| 3. Money truth                        |    84 | Invoices, earnings, payment instructions, refunds/cancellations, and payout state are honest and auditable.    |
| 4. Social as operations               |    88 | Feed, groups, messages, comments, and notifications show real coordination, not filler.                        |
| 5. Achievements and progress evidence |    91 | "Badges" become recognition/achievements tied to sessions, notes, skills, and proof.                           |
| 6. Club ops and recurring             |    94 | Owner/head-coach dashboards and recurring bookings become operational, not walkthrough-like.                   |
| 7. Trust and compliance hardening     |    97 | Verification, DBS, safeguarding, consent snapshots, data rights, and audit evidence are launch-grade.          |
| 8. Native release hardening           |   100 | iOS/Android dogfood passes, release gates are strict, and medium UI flow warnings are zero.                    |

## Sprint 0 - Setup And Freeze

Goal: stop moving the target.

Duration: `1 day`
Score: `64 -> 66`

Tasks:

1. Create `.env.staging.local` and production secret checklist from `.env.example`.
2. Decide payment path:
   - `manual/direct only for V1`, quickest
   - `Stripe provider`, slower but cleaner for score
3. Freeze feature scope:
   - keep social
   - keep achievements
   - keep video/media
   - no AI insights
   - no leaderboards
   - no generic social metrics
4. Make a release rule: API mode cannot show mock/demo/seeded data unless explicitly labelled as staging/test.

Validation:

```bash
npm run audit:db:stage:strict
npm run smoke:password-reset-webhook
npm run smoke:api-mode:strict
```

Done when:

- staging env is ready
- email smoke passes
- object storage smoke passes through `npm run smoke:staging`
- payment decision is written down

## Sprint 1 - Kill Fake Life

Goal: remove everything that makes the app feel like generated filler.

Duration: `3-5 days`
Score: `66 -> 72`

Implement:

1. Raw display cleanup:
   - Replace `ath_...`, `usr_...`, `sqd_...`, `clb_...` with display names.
   - Add service type display mappers for `one_to_one`, group session types, payment labels, and invite statuses.
   - Fail UI flow checks when raw IDs or raw enum labels appear.
2. Dead control cleanup:
   - Remove or hide `hooks/use-edit-profile.ts` photo picker "coming soon" action until upload is real.
   - Hide dev-only verification approvals unless dev mode is explicit.
3. Demo/social cleanup:
   - Remove API-mode demo notifications from `services/notification-service.ts`.
   - Replace `services/social-feed-service.ts` mock club member list with V1 relationship reads or hide that metadata.
   - Remove fake popularity, fake counts, fake rankings, and synthetic activity from API mode.
4. Analytics cleanup:
   - Mock analytics only in mock mode.
   - API mode charts must show real derived data or an honest empty state.

Likely files:

- `scripts/ui-flow-checks-50.mjs`
- `services/notification-service.ts`
- `services/social-feed-service.ts`
- `services/analytics/*`
- `hooks/use-edit-profile.ts`
- `app/verification/id.tsx`
- `app/verification/background.tsx`
- route screens listed in `reviews/ui-product-api-qa-2026-07-05.md`

Validation:

```bash
npm run typecheck
npm run audit:ui:quality
npm run ui:flows:run
```

Done when:

- medium UI flow warnings for raw IDs/demo copy are `0`
- API mode has no user-facing "coming soon"
- social still exists, but only with real coordination data

## Sprint 2 - Booking And Schedule Truth

Goal: make the paid coach loop feel real.

Duration: `1 week`
Score: `72 -> 79`

Implement:

1. Fix coach schedule:
   - `services/availability-service.ts#getCoachBookings()` must return real booking data.
   - It should use V1 booking list data in API mode.
   - In mock mode, keep mock behavior isolated.
2. Fix booking review dead end:
   - Add permission-safe public coach profile data for booking review, or carry enough display data from selected offering/draft.
   - No more `Coach unavailable` when the coach exists in V1.
3. Finish scaffolded booking routes or reclassify them:
   - `/v1/bookings GET`
   - `/v1/bookings POST`
   - `/v1/bookings/:bookingId GET`
   - `/v1/bookings/:bookingId/cancel POST`
   - `/v1/bookings/:bookingId/reopen POST`
4. Make session completion one clean workflow:
   - attendance
   - no-show
   - notes
   - parent-visible feedback
   - recognition/achievement trigger
   - notification/message thread outcome
5. Booking copy must be exact:
   - pending
   - awaiting coach confirmation
   - confirmed
   - cancelled
   - refunded/manual refund required
   - completed

Likely files:

- `services/availability-service.ts`
- `hooks/use-schedule.ts`
- `services/booking/*`
- `apps/api/src/modules/booking/routes.ts`
- `apps/api/src/modules/booking/routes.test.ts`
- `app/book/[coachId]/review.tsx`
- `app/(tabs)/schedule.tsx`
- `app/session/[id]/complete.tsx`

Validation:

```bash
npm run test:bookings
npm --prefix apps/api run test
npm run smoke:api-mode:strict
npm run ui:flows:parent-core
npm run ui:flows:coach-core
```

Done when:

- coach schedule shows real bookings
- parent booking review never dead-ends for valid V1 coaches
- cancellation/reopen/completion are backend-authoritative

## Sprint 3 - Money Truth

Goal: money cannot look fake.

Duration: `1 week`
Score: `79 -> 84`

Path A: manual/direct V1, fastest:

1. Keep `API_PAYMENT_PROVIDER=simulated`.
2. Rename user-facing copy away from "paid online" unless a real provider is involved.
3. Make manual/direct payment instructions explicit.
4. Require manual receipt metadata for `mark-paid`.
5. Keep refund/settlement copy honest.

Path B: Stripe, higher score:

1. Implement provider runtime instead of current blocked `STRIPE_PROVIDER_NOT_IMPLEMENTED`.
2. Add hosted checkout/session creation.
3. Add webhook verification.
4. Persist payment event, fee, settlement, dispute, refund, and provider reference.
5. Add idempotency and replay tests.

Do not mix the paths. Pick one.

Likely files:

- `apps/api/src/lib/payment-provider.ts`
- `apps/api/src/lib/invoice-runtime.ts`
- `apps/api/src/lib/ops-runtime.ts`
- `services/invoice-service.ts`
- `services/earnings/*`
- `components/invoices/*`
- `app/invoices/*`
- `app/earnings.tsx`

Validation:

```bash
npm run test:invoices
npm --prefix apps/api run test
npm run smoke:staging
```

Done when:

- parent and coach can understand exactly what happened with money
- simulated/manual provider states never masquerade as real settlement
- cancellations and paid invoice hard walls are proven by tests

## Sprint 4 - Social As Operations

Goal: keep social, remove filler.

Duration: `1 week`
Score: `84 -> 88`

Implement:

1. Feed item contract:
   - every feed post must be announcement, session update, event update, achievement update, media proof, or group coordination
   - no generic filler cards
2. Groups/messages:
   - keep parent groups and coach-parent messages
   - verify direct athlete messages are not treated as parent messages
   - block relationships must apply before message/thread visibility
3. Comments:
   - keep when attached to coordination
   - add clear empty/error states
   - no dead comment controls
4. Notifications:
   - only real triggers
   - quiet hours and preferences respected
   - no demo seed notifications in API mode
5. Media:
   - share only with current consent
   - takedown path exists

Likely files:

- `services/social-feed-service.ts`
- `services/community/*`
- `services/comment-service.ts`
- `services/notification-service.ts`
- `services/community-media-authority-service.ts`
- `apps/api/src/modules/social/routes.ts`
- `apps/api/src/modules/trust-ops/routes.ts`
- `app/(tabs)/feed.tsx`
- `app/community/[groupId].tsx`
- `app/chat/*`

Validation:

```bash
npm run test:messaging
npm --prefix apps/api run test
npm run ui:flows:parent-core
npm run ui:flows:athlete-core
```

Done when:

- social feels like club coordination
- fake activity is gone
- child/athlete visibility is explicitly tested

## Sprint 5 - Achievements And Progress Evidence

Goal: make achievements meaningful without overbuilding.

Duration: `3-5 days`
Score: `88 -> 91`

Implement:

1. Visible rename:
   - coach action: `Recognise`
   - parent/athlete surface: `Achievements`
   - feed item: `Recognition update`
   - internal domain: leave `BadgeAward` for now
2. Every award needs at least one evidence anchor:
   - session
   - coach note
   - skill
   - goal
   - practice task
   - media item
3. Remove scoreboard-first copy:
   - no rarity-first language
   - no public ranking
   - no fake streak pressure
4. Parent view explains why it matters.
5. Athlete view uses age-neutral language.

Likely files:

- `constants/badge-registry.ts`
- `services/badge-service.ts`
- `services/badge-definitions.ts`
- `components/badges/*`
- `components/session/badges-step.tsx`
- `components/development/child-progress-badge-list.tsx`
- `app/development/my-progress.tsx`
- `app/development/child-progress/[childId].tsx`

Validation:

```bash
npm run test:compile
node --require ./scripts/test-register.js --test .tmp-tests/__tests__/badges/*.js
npm run ui:flows:athlete-core
```

Done when:

- users see achievements/recognition, not "badges"
- no achievement claims proof it cannot show

## Sprint 6 - Club Ops And Recurring

Goal: leadership and recurring bookings must be operational.

Duration: `1 week`
Score: `91 -> 94`

Implement:

1. Owner dashboard:
   - replace walkthrough/demo-first content with today/this week operations
   - sessions due
   - unassigned work
   - overdue completions
   - staff workload
   - finance exceptions
   - safeguarding/support flags
2. Head coach dashboard:
   - standards as evidence/review/action history
   - not staff badges
3. Recurring bookings:
   - weekly plan
   - generated occurrences
   - skip week
   - pause/resume/cancel
   - coach reassignment
   - owner visibility
   - audit history
4. Finish scaffolded invite routes if still scaffolded:
   - `/v1/invites`
   - `/v1/invites/:inviteId`
   - `/v1/invites/:inviteId/respond`
   - remind/dismiss/delete

Likely files:

- `services/org-owner-dashboard-service.ts`
- `services/org-head-coach-service.ts`
- `services/org-staffing-service.ts`
- `services/recurring-booking-service.ts`
- `services/invite/*`
- `apps/api/src/modules/coach-club/*`
- `apps/api/src/modules/booking/routes.ts`
- `app/manage/head-coach.tsx`
- `app/club/[clubId]/dashboard.tsx`
- `app/family/recurring.tsx`

Validation:

```bash
npm run test:family
npm --prefix apps/api run test
npm run ui:flows:coach
npm run ui:flows:parent
```

Done when:

- owner dashboard is useful with real V1 data
- recurring bookings no longer look empty in seeded/API flow
- invite lifecycle is backend-authoritative

## Sprint 7 - Trust And Compliance Hardening

Goal: launch-grade child safety and coach trust.

Duration: `1 week`
Score: `94 -> 97`

Implement:

1. Server-side verification gates:
   - child booking requires appropriate coach verification/DBS state
   - frontend hints are not enough
2. Verification review:
   - reviewer
   - expiry
   - rejection reason
   - resubmission
   - audit trail
3. Safeguarding:
   - incident actions writable only by allowed roles
   - child-visible "I need help" path
   - no hard delete
4. Consent snapshots:
   - booking time
   - media upload time
   - media post/share time
5. Data rights:
   - export status
   - deletion/retention status
   - audit evidence for blocked deletion

Likely files:

- `services/verification-service.ts`
- `apps/api/src/modules/identity/routes.ts`
- `apps/api/src/modules/trust-ops/routes.ts`
- `apps/api/src/modules/health/routes.ts`
- `contracts/club-governance.ts`
- `app/verification/*`
- `app/health/*`
- `app/settings/privacy.tsx`

Validation:

```bash
npm run test:safety
npm run test:consent
npm --prefix apps/api run test
npm run ui:flows:trust-core
```

Done when:

- coach trust claims have source, reviewer, expiry, and audit
- child safety actions are not broad writable
- consent is snapshotted where it matters

## Sprint 8 - Native Release Hardening

Goal: stop trusting web-only checks.

Duration: `1 week`
Score: `97 -> 100`

Implement:

1. Run native iOS dogfood:
   - coach booking/session completion
   - parent booking/payment/family health
   - athlete progress/social safety
2. Run native Android dogfood with same flows.
3. Make `ui:flows:run` fail on current medium warnings once Sprint 1 fixes land.
4. Run release gate with no skipped critical flows:
   - `launch:readiness`
   - native manual/dogfood report
   - rollback rehearsal
5. Final product truth pass:
   - no raw IDs
   - no fake stats
   - no dead buttons
   - no production mock language
   - no hidden native layout breakage

Validation:

```bash
npm run launch:readiness
npm run ui:flows:run
npm run audit:agentic:strict
npm --prefix apps/api run release:preflight
```

Done when:

- launch-readiness passes
- native dogfood issues are fixed or explicitly blocked
- scorecard has no remaining product-truth blockers

## First Ten PRs

Do these first. They are the highest return.

1. Add UI-flow failure rules for raw IDs, raw enum labels, demo copy, and "coming soon".
2. Replace raw athlete/user/squad/club IDs with display-name view models.
3. Fix `services/availability-service.ts#getCoachBookings()`.
4. Fix booking review `Coach unavailable` by adding public coach display data.
5. Remove API-mode demo notifications.
6. Replace social-feed mock club member list with V1 relationship data or hide the count.
7. Hide dev-only verification approve buttons outside explicit dev mode.
8. Make money copy honest for simulated/manual provider.
9. Rename visible badges to recognition/achievements.
10. Make owner dashboard default to real operations, not walkthrough/demo content.

## Commands To Run After Every Sprint

```bash
npm run typecheck
npm run test:compile
npm --prefix apps/api run typecheck
npm --prefix apps/api run test
npm run audit:ui:quality
npm run smoke:api-mode:strict
```

Add role-specific UI flow commands for the touched role.

## Stop Doing

- Do not add another feature until the fake-life list is gone.
- Do not add a card because there is space.
- Do not show a stat without a source.
- Do not keep a route just because it exists if another route already covers the job.
- Do not rename internal badge models until the visible product language is fixed.
- Do not implement Stripe halfway. Manual/direct is better than fake real payments.

## Release Rule

The app is real when a parent can:

1. find a coach
2. understand trust state
3. book a child
4. know exactly what money state they are in
5. receive a useful session update
6. see progress evidence
7. coordinate through messages/groups
8. manage health/consent
9. report a problem
10. rebook

Anything outside that loop is secondary.
