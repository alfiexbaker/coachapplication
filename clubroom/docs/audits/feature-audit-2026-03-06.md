# Feature Audit - Booking, Health, My Progress, Club, Settings

Date: 2026-03-06
Auditor: Codex
Scope: verified role flows for coach, athlete/user, parent, and academy-leader-equivalent paths across `Booking`, `Health`, `My Progress`, `Club`, and `Settings`

## Executive Summary

No audited feature is fully production-ready across coach, user, and academy leader flows.

- `Booking`: strong core service path, but discover entry is broken for all roles and multi-week cancellation is inconsistent.
- `Health`: athlete/parent flow works, but coach health is not a first-class product flow and local-mode auth is weak.
- `My Progress`: athlete/parent flow is the most complete, but coach parity is missing and multiple sections are still placeholders/demo-backed.
- `Club`: staff hub works, but club settings is only partially real; key academy-leader actions are UI-only.
- `Settings`: a few surfaces are real (`coaching`, `calendar sync`, persisted notification service), but most high-traffic settings pages are placeholders or not wired to persistence.

The current academy-leader story is not a dedicated role. It is a coach/admin account plus academy membership permissions. Route constants exist for academy pages, but there is no `app/academy/*` route tree.

## What Was Verified

### Static and architectural checks

- `npm run typecheck`: PASS
- `npm run lint:ui-actions`: PASS
- `npm run audit:ui`: PASS
- `npm run audit:architecture`: PASS

Architecture audit artifacts:

- `docs/audits/architecture-hardening-report-2026-03-06.md`
- `docs/audits/architecture-reachability-audit-2026-03-06.json`
- `docs/audits/component-reachability-2026-03-06.csv`

### UI flow verification

- `npm run ui:flows:preflight`: PASS
- `npm run ui:flows:run -- --fail-on=none --retries=1 --pause-ms=300`

UI flow summary:

- Total routes checked: 80
- Reachability: 80/80
- Medium issues: 3
- Repeated issue: `/discover-sessions` crashes for coach, parent, and athlete with `useBookingFlow must be used inside BookingFlowProvider`

### Domain test verification

- Club/academy/squad/roster pack: PASS, `88/88`
- Progress pack: PASS, `113/113`
- Settings pack: PASS, `161/161`
- Health feature pack (`InjuryCard`, `injury-service`): PASS, `79/79`
- Booking pack: FAIL, 1 real failure in multi-week series cancellation

### Repo-wide gate failures seen during health verification

`phase1-service-hardening-gates.test.js` still fails on three cross-cutting gates:

- `throw new Error` remains in `services/api-client.ts`, `services/event/event-rsvp-service.ts`, `services/video-service.ts`
- `createLogger` missing in `services/coach-payment-instructions-service.ts`, `services/progress/progress-demo-seed-lazy-service.ts`, `services/progress/progress-demo-seed-service.ts`, `services/review-sync-service.ts`
- Promise return-type hardening fails for `services/favourite-service.ts` and `services/referral-service.ts`

These are not limited to the audited features, but they matter for overall release quality.

## Role Model Observed In Code

### App roles

- `COACH`, `USER`, `PARENT`, `ADMIN` are the real top-level roles.
- Home/tab routing is role-based in `app/(tabs)/_layout.tsx` and `app/(tabs)/index.tsx`.

### Academy leader reality

- There is no first-class `ACADEMY_LEADER` auth role.
- Academy leader behavior is currently "coach/admin account with academy membership permissions".
- The real academy-leader controls are in:
  - `app/manage/bookings.tsx`
  - `hooks/use-manage-bookings.ts`
  - `app/sessions/create.tsx`
  - `app/(tabs)/club-hub.tsx`
  - `app/club/settings.tsx`

### Academy route gap

- Route builders exist for academy pages in `navigation/routes.ts`.
- No `app/academy/*` implementation exists.
- Result: academy navigation is partially modeled in code, but not delivered as a routed product surface.

## Findings By Severity

### P1

#### 1. Discover Sessions crashes for every role outside the tab provider

Impact:

- Coach, parent, and athlete all hit a booking discovery entry that throws at runtime.
- This is a top-of-funnel booking defect.

Verified evidence:

- `app/discover-sessions.tsx` calls `useDiscoverSessions()`
- `hooks/use-bookings-discover.ts` calls `useBookingFlow()`
- `context/booking-flow-context.tsx` throws if no provider exists
- `app/(tabs)/_layout.tsx` only wraps the tab tree in `BookingFlowProvider`
- `/discover-sessions` is a top-level route, not part of the tab subtree

Observed behavior:

- UI flow runner recorded the same provider error for coach, parent, and athlete.

#### 2. Club settings is only partially real; academy-leader management actions do not persist

Impact:

- The main academy-leader admin surface looks complete, but core actions are UI-only.
- This creates false confidence during sprint demos and high regression risk once live data matters.

Verified evidence:

- `hooks/use-club-settings.ts`
  - `handleSaveDetails()` only shows toast/logs
  - `handleGenerateCode()` mutates local state only
  - `handleDeleteCode()` mutates local state only
  - `handleDeleteClub()` only shows confirmations, toast, and redirect
  - `handleSaveBranding()` is the one path that persists through `clubService.updateBranding()`

Current product effect:

- Branding persists.
- Details, invite-code lifecycle, and delete-club do not.

#### 3. Multi-week series cancellation can mark the series cancelled while leaving bookings confirmed

Impact:

- Parents and staff can see a cancelled series with one or more bookings still active.
- Booking, billing, attendance, and notification logic can drift out of sync.

Verified evidence:

- `services/multi-week-booking-service.ts` iterates each booking and calls `bookingCrudService.cancel()`, then marks the series `CANCELLED` regardless of per-booking outcomes.
- `services/booking/booking-crud-service.ts` blocks cancellation when booking start time is in the past.
- Booking test failure:
  - `MultiWeekBookingService - cancelSeries()`
  - expected all bookings `CANCELLED`
  - actual: at least one booking remained `CONFIRMED`

This is a real behavioral mismatch, not a flaky test.

#### 4. Injury service local-mode authorization is too weak

Impact:

- In mock/local mode, any caller with an injury ID can read or mutate another user's injury.
- This is a Trust/Ops issue, not just a health UX issue.

Verified evidence:

- `services/injury-service.ts`
  - `getInjuryById()` returns by ID without ownership check
  - `updateInjury()` updates by ID without ownership check in fallback/local path
  - `addRecoveryNote()` updates by ID without ownership check in fallback/local path
  - `markAsHealed()` delegates to the same update path

API mode is more constrained; local/mock mode is not.

### P2

#### 5. Notification settings route points users to the placeholder screen while the persisted screen is orphaned

Impact:

- Users edit local-only notification toggles from the main settings hub.
- The real persisted notification preferences screen exists but is not in the main navigation path.

Verified evidence:

- `app/settings/index.tsx` pushes `Routes.SETTINGS_NOTIFICATIONS`
- `navigation/routes.ts` defines `SETTINGS_NOTIFICATIONS` as `/settings/notifications`
- `app/settings/notifications/index.tsx` is local `useState` only
- `app/settings/notifications/preferences.tsx` is the real persisted preferences screen
- no route constant points to `/settings/notifications/preferences`

Result:

- The working service is present.
- The user-facing route is the wrong one.

#### 6. Coach health is not a first-class feature flow

Impact:

- Athlete/parent health tracking exists.
- Coach only has an indirect injury-reporting entry point, not a dedicated shared-injury view.

Verified evidence:

- `hooks/use-health-hub.ts` and `hooks/use-injuries.ts` load via `injuryService.getUserInjuries(...)`
- `services/injury-service.ts` exposes `getAthleteInjuries(...)` for coach-view filtering
- no audited health screen uses `getAthleteInjuries(...)`
- coach injury reporting exists indirectly in `hooks/use-group-roster.ts`

Result:

- "Coach health flow" is currently operationally indirect, not productized.

#### 7. Health subject switching is presented, but not actually interactive

Impact:

- Parent-facing injury center suggests self/child context capability.
- Selection is inherited from external profile scope and cannot actually switch in-place.

Verified evidence:

- `hooks/use-injuries.ts`
  - `subjectOptions` is built
  - `handleSelectSubject()` is a no-op
  - `handleSelectNextSubject()` is a no-op

Result:

- The feature model supports switching.
- The screen implementation does not.

#### 8. Coach "My Progress" is self-progress, not athlete progress

Impact:

- The product has strong athlete/parent progress read paths.
- Coach cannot use the audited `My Progress` surface to review an athlete with coach permissions.

Verified evidence:

- `hooks/use-my-progress.ts` sets `viewerRole` to `'parent'` or `'athlete'`, never `'coach'`
- non-parent contexts default to the current user
- `progressFeedbackService` does support role-based coach/private filtering, but `useMyProgress()` never requests the coach viewer mode

Result:

- Coach progress parity is missing from the audited feature surface.

#### 9. Account and privacy settings are mostly non-persistent

Impact:

- Users can believe they changed security-sensitive preferences when they did not.

Verified evidence:

- `hooks/use-account-settings.ts`
  - save email: toast only
  - save phone: toast only
  - change password: toast only
  - deactivate account: logout only
  - delete account: persists deletion request record, but does not deactivate/delete the account
- `app/settings/privacy.tsx` is local `useState` only
- `app/settings/notifications/index.tsx` is local `useState` only

#### 10. Cancellation policy/settings product does not match the underlying service capability

Impact:

- The service layer supports custom cancellation policies.
- The settings UI tells users that custom policies are not available yet.

Verified evidence:

- `services/scheduling-rules-service.ts` has persisted cancellation policy support and tests
- `app/settings/cancellation-policy.tsx` is static content saying custom policies will come later

Result:

- Capability exists.
- The user-facing settings page is lagging behind it.

### P3

#### 11. Booking draft flow still diverges from the canonical `createBooking()` path

Impact:

- The repo guidance says booking creation should be centralized.
- Legacy draft-save code still bypasses `createBooking()` and saves directly.

Verified evidence:

- `context/booking-flow-context.tsx` calls `bookingService.createFromDraft()`
- `services/booking/booking-crud-service.ts` comment says centralized path, but implementation still uses `saveBookingDirect()`

Current risk:

- Low immediate runtime risk because this path appears latent.
- Medium maintenance risk because comments and architecture guarantees do not match implementation.

#### 12. Club-owned booking cards still expose raw `clubId`

Impact:

- Club-owned bookings can render internal identifiers instead of human labels in some contexts.

Verified evidence:

- `app/book/[coachId]/review.tsx` and `app/book/[coachId]/confirmation.tsx` resolve club and assignee labels
- `components/bookings/booking-ownership-block.tsx` still renders `Club: ${booking.clubId}`

#### 13. My Progress still contains shipped placeholders and demo framing

Impact:

- The page looks broad, but several slices are not complete product features yet.

Verified evidence:

- `app/development/my-progress.tsx` shows a demo banner in demo mode
- `components/progress/attendance-heatmap.tsx`: no detailed session drill-down
- `components/progress/player-card-placeholder.tsx`: "Sprint 3"
- `components/progress/past-sessions-placeholder.tsx`: "Sprint 2"
- `components/progress/next-challenge-placeholder.tsx`: "Sprint 4"

## Feature-by-Feature Audit

## Booking

Status: PARTIAL

### Coach flow

What works:

- Coach home and schedule routes are reachable.
- Coach can create direct sessions, group sessions, invite to existing sessions, and manage sessions.
- Booking creation is centralized for the live confirmation flow through `bookingService.createBooking(...)`.
- Validation covers:
  - block relationships
  - duplicate athlete in linked sessions
  - linked-session capacity
  - availability for ad-hoc bookings
  - DBS safeguarding gate
  - notifications and `BOOKING_CREATED` event emission

Where it lives:

- `app/manage/bookings.tsx`
- `hooks/use-manage-bookings.ts`
- `app/sessions/create.tsx`
- `services/booking/booking-crud-service.ts`

### Athlete/user flow

What works:

- Direct booking wizard path:
  - session type
  - schedule
  - details
  - review
  - confirmation
- Self-booking is explicitly gated when the account also has children.

Where it lives:

- `app/book/[coachId]/details.tsx`
- `app/book/[coachId]/review.tsx`
- `app/book/[coachId]/confirmation.tsx`

### Parent flow

What works:

- Parent can book for child.
- Parent can optionally book for self if `bookingSelfSettingService` is enabled.
- Parent child scoping is applied consistently inside the booking wizard.

### Academy leader flow

What works:

- Academy leader equivalent is "coach/admin plus academy membership permissions".
- Staff can post as self or club.
- Staff can assign another coach for club-owned sessions.
- Club-owned booking metadata carries `actingAs`, `clubId`, `ownerCoachId`, `assigneeCoachId`, `createdByUserId`, `createdByRole`.

Where it lives:

- `hooks/use-manage-bookings.ts`
- `app/manage/bookings.tsx`
- `app/sessions/create.tsx`

### Booking edge cases verified

- Linked-session duplicate booking is blocked.
- Linked-session capacity overflow is blocked.
- Ad-hoc booking availability is validated.
- DBS safeguarding is fail-closed.
- Discover-sessions top-level route is broken.
- Multi-week series cancellation is inconsistent.
- Draft-flow write path is still divergent.

## Health

Status: PARTIAL

### Coach flow

What works:

- Coach can report an injury through roster/group flow.

What does not exist as a first-class feature:

- No dedicated coach health screen backed by `getAthleteInjuries(...)`.

### Athlete/user flow

What works:

- `/health`
- `/health/injuries`
- `/health/log`
- injury detail and recovery note flows
- quick-heal flow

Verification:

- UI flow runner passed athlete health routes
- injury component/service suite passed `79/79`

### Parent flow

What works:

- Parent can scope to child via profile context
- Parent can log injuries for the selected child
- Parent can view, filter, and update recovery states

### Health edge cases verified

- Subject switch UI is not true in-screen switching.
- Local-mode ID-based mutation is not ownership-safe.
- Coach shared-view service exists but is not surfaced.

## My Progress

Status: PARTIAL

### Coach flow

Current behavior:

- Coach sees self progress, not athlete progress, on the audited `My Progress` surface.

### Athlete/user flow

What works:

- Progress scroll loads sessions, badges, feedback, media, attendance, and position data.
- Role-based filtering strips coach-only/private content for athlete view.
- Progress service, goals, skills, reports, and recap tests passed.

### Parent flow

What works:

- Parent child context is strong.
- Child-specific progress route exists.
- Parent-only visibility filtering is enforced.
- Family highlights are generated when multiple children exist.

### Progress edge cases verified

- Demo seed path can influence displayed content in development/demo environments.
- Several sections are still placeholders rather than fully interactive product surfaces.
- Coach athlete-review parity is missing.

## Club

Status: PARTIAL

### Coach flow

What works:

- Staff are routed into `Club Hub`
- feed, members, squads, sessions, matches, invites, and membership actions load
- `My Clubs` distinguishes managed clubs from member clubs

### User/member flow

What works:

- non-staff members are redirected away from staff hub to public club detail
- `My Clubs` supports join-by-code and member navigation

### Academy leader flow

What works:

- club/academy leader operations happen through club hub, manage bookings, and club settings
- club posting/assignment is permission-based

What is missing:

- no dedicated academy route tree despite academy route builders existing
- club settings is not fully persisted

### Club edge cases verified

- branding persists
- detail saves, invite-code lifecycle, and delete club do not persist
- some club-owned booking UI still leaks raw identifiers

## Settings

Status: PARTIAL

### Coach flow

Real settings:

- coaching settings persisted via `schedulingRulesService`
- calendar sync persisted via `calendarService`

Partial or placeholder:

- cancellation policy screen is static despite real service support
- smart slots is informational/demo only
- travel radius is informational only
- blocked dates is a redirect/helper screen, not a management surface

### Athlete/user and parent flow

Real settings:

- account deletion request record persistence
- booking-for-self toggle for parent-like accounts with children

Placeholder or miswired:

- account email/phone/password/deactivate mostly not persisted
- privacy settings are local state only
- notification settings main screen is local state only
- persisted notification preferences page is orphaned from the main navigation path

## Edge Case Inventory

| Area | Edge Case | Current Behavior | Risk |
| --- | --- | --- | --- |
| Booking | open discover route outside tabs | runtime crash for all 3 user roles | high |
| Booking | cancel multi-week series containing past sessions | series becomes cancelled while some bookings stay confirmed | high |
| Booking | linked session duplicate athlete | blocked correctly | low |
| Booking | linked session full | blocked correctly | low |
| Booking | parent self-booking disabled | blocked correctly with settings gate | low |
| Health | parent tries to switch subject in injury center | UI suggests switchable subject but handlers do nothing | medium |
| Health | local-mode actor mutates foreign injury by ID | allowed in fallback/local path | high |
| Health | coach wants shared injury view | service exists, screen does not | medium |
| Progress | coach wants athlete progress in audited flow | gets self view, not athlete view | medium |
| Progress | attendance drill-down | not available from heatmap modal | low |
| Club | academy leader edits details/invites/delete | UI success without persistence | high |
| Settings | user edits notification prefs from main settings | lands on non-persisted screen | medium |
| Settings | coach expects custom cancellation policy editor | service exists, UI says future | medium |
| Settings | user changes privacy options | local state only | medium |
| Settings | user deactivates account | logged out, account not truly deactivated | medium |

## Overall Readiness

If sprint planning starts from risk and user impact, the first work should be:

1. Booking reliability at discovery and series boundaries
2. Club/academy leader settings persistence
3. Settings consolidation around notifications, privacy, and account
4. Health authorization and coach-view parity
5. Progress parity and placeholder removal

The sprint input doc for that plan is:

- `docs/newsprints/sprints/FEATURE_AUDIT_SPRINT_INPUT_2026-03-06.md`
