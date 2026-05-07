# Feature Prune Sprints

Date: 2026-05-06
Source: `docs/product-reality/FEATURE_TRIAGE_BOARD_2026-05-06.md`
Goal: remove AI-added or low-value product mass before deployment, while protecting the booking, discovery map, family trust, coach revenue, and club operations core.

## Execution Rule

Run these before spending more effort polishing routes marked `DELETE` or `POST-LAUNCH`.

Each sprint must end with:

- route constants and links cleaned up
- deleted routes removed from loading manifests and capture scripts
- smallest matching runtime-truth doc updated
- `npm run typecheck`
- `npm run test:compile`
- `npm run audit:loading-routes`
- `git diff --check`
- one atomic commit

## Protected Product Core

Do not delete or demote:

- booking search, booking flow, booking detail, cancellation, reporting, feedback
- discover map and local coach/session search
- availability, schedule, calendar, recurring booking
- family calendar, child profile, medical, emergency, consent, family sharing
- roster, health, concerns, safeguarding-adjacent flows
- invoices, earnings, payment attempt flow
- verification
- messages, notifications, invites
- club hub, staff, squads, schedule, events, group sessions

## `PRUNE-01` Delete Obvious Non-Core Destinations

Status: `DONE`

Objective:

- Remove standalone features already classified as `DELETE` and not required for the launch product.

Route scope:

- `app/family/spending.tsx`
- `app/referrals/invite.tsx`
- `app/compare/index.tsx`
- `app/compare/[ids].tsx`
- `app/drills/challenges.tsx`
- `app/drills/create-challenge.tsx`
- `app/development/seed-health.tsx`
- `app/results-program.tsx`
- `app/development/results-program.tsx`
- `app/analytics/retention.tsx`

Implementation notes:

- Remove every visible entry point to these routes before deleting route files.
- Remove related `Routes.*` constants/builders from `navigation/routes.ts`.
- Remove related entries from `navigation/loading-route-manifest.js` and screenshot/UI flow scripts.
- Delete tests, hooks, components, and services that become unreachable only because these routes were deleted.
- Keep `discover/map.tsx`; it is protected.

Acceptance:

- The app no longer advertises family spending, referral invite, coach compare, drill challenges, results-program, seed-health, or retention analytics as launch surfaces.
- No route helper points to a deleted route.
- Loading route audit passes.

Completed:

- Removed the route files, visible entrypoints, route helpers, route manifests, screenshots/UI-flow entries, dead services, route-private components/hooks, and tests for the deleted launch cuts.
- Preserved `app/discover/map.tsx` and left the active progress-loop internals for `app/development/progress-loop.tsx` untouched.

## `PRUNE-02` Protect And Harden Discover Map

Status: `DONE`

Objective:

- Treat Discover Map as a centerpiece, not a nice-to-have.

Route scope:

- `app/discover/map.tsx`
- `app/discover-sessions.tsx`
- relevant map/search services and hooks
- any entry points from `book-coach.tsx`, coach profiles, favourites, and home surfaces

Implementation notes:

- Ensure map entry points are easy to find from coach/session discovery.
- Make the map a conversion surface: search/filter, view coach/session, and book without wandering.
- Remove leftover generic browsing or comparison language that competes with map discovery.
- Keep map loading, empty, permission-denied, and location-unavailable states truthful.

Acceptance:

- Discover Map is clearly part of the core discovery and booking journey.
- Users can move from map result to coach/session detail to booking.
- No deleted compare/referral/results-program paths remain as alternate discovery destinations.

Completed:

- Added explicit map entry points to Bookings Discover and Discover Sessions.
- Kept map result frames stable during warm refresh and empty-result states.
- Added profile and booking actions directly to map result cards.
- Removed leftover comparison language from favourites and the stale deleted retention stack entry.

## `PRUNE-03` Merge Duplicate Family And Ops Surfaces

Status: `DONE`

Objective:

- Keep family and coach ops focused on action, not dashboards.

Route scope:

- `app/family/index.tsx`
- `app/family/[legacy].tsx`
- `app/family/calendar.tsx`
- `app/family/recurring.tsx`
- `app/family/sharing.tsx`
- `app/manage/index.tsx`
- `app/manage/[legacy].tsx`
- `app/manage/bookings.tsx`
- `app/manage/head-coach.tsx`
- `app/settings/blocked-dates.tsx`
- `app/availability/calendar.tsx`
- `app/availability/block-date.tsx`

Implementation notes:

- Family overview should be a small action gateway or redirect, not a summary dashboard.
- Family spending links should resolve to invoices/bookings where needed, not a separate family finance screen.
- Blocked dates should live under availability/calendar behavior, not settings clutter.
- Keep manage redirects only for compatibility; remove them once link audit proves they are not needed.

Acceptance:

- Parent-like users land in calendar/recurring/trust actions quickly.
- Coach ops paths do not bounce through generic manage pages.
- There is one clear place for blocked dates.

Completed:

- Reduced `/family` to a direct action gateway for calendar, recurring plans, children, guardian sharing, and booking.
- Removed the unused family overview hook and dashboard-only family cards that duplicated stronger child/calendar surfaces.
- Removed the standalone settings blocked-dates route and pointed coaching settings to the availability block-date flow.
- Verified `/manage` remains compatibility-only routing instead of a generic coach operations dashboard.

## `PRUNE-04` Narrow Development And Training

Status: `DONE`

Objective:

- Keep development features that tie to real sessions, coach feedback, athlete progress, and proof. Remove gamified or self-help product mass.

Route scope:

- `app/development/my-progress.tsx`
- `app/development/child-progress/[childId].tsx`
- `app/development/athlete/[athleteId]/index.tsx`
- `app/development/session/[sessionId].tsx`
- `app/development/session-history.tsx`
- `app/development/progress-loop.tsx`
- `app/development/media-gallery.tsx`
- `app/development/badges.tsx`
- `app/badges/index.tsx`
- `app/(tabs)/badges.tsx`
- `app/children/badges/[childId].tsx`
- `app/goals/*`
- `app/drills/*`
- `app/skills/*`
- `app/videos/*`
- `app/athlete/journal.tsx`

Implementation notes:

- Preserve session-linked progress, session history, coach notes, video proof, and child/athlete progress.
- Narrow drills/goals/skills to coach assignment and session feedback.
- Remove challenge/gamification remnants after `PRUNE-01`.
- Move athlete journal to `POST-LAUNCH` unless a real session-linked use case is defined.

Acceptance:

- Development feels like football coaching follow-through, not a generic habit app.
- Routes that remain have clear links to bookings, sessions, coaches, or family progress.

Completed:

- Removed standalone goals, drills, skills, athlete journal, all-badges, badges tab, and child-badges routes.
- Removed route-only goal, drill, and badge gallery components/hooks that no longer have a launch path.
- Kept session-linked development surfaces: my progress, child/athlete progress, session detail, session history, media gallery, videos, and development badges.
- Repointed badge/feedback notifications into the development spine and removed the legacy analytics-goals alias.

## `PRUNE-05` Narrow Community, Updates, Profiles, And Reviews

Status: `DONE`

Objective:

- Keep relationship surfaces professional and operational.

Route scope:

- `app/(tabs)/feed.tsx`
- `app/(modal)/create-post.tsx`
- `app/(modal)/create-club-post.tsx`
- `app/(modal)/post-detail.tsx`
- `app/community/index.tsx`
- `app/community/[groupId].tsx`
- `app/profile/[userId].tsx`
- `app/(tabs)/coach-profile.tsx`
- `app/coach/[id].tsx`
- `app/coach/[coachId]/public.tsx`
- `app/rate-coach.tsx`
- `app/review/*`
- `app/favourites/index.tsx`

Implementation notes:

- Keep club/coach updates, not generic friend-feed behavior.
- Keep reviews as booking-linked proof, not plain star comments.
- Keep favourites only if they support repeat booking or map discovery.
- Public profiles should support identity, trust, proof, and booking conversion.

Acceptance:

- No feed/profile route feels like a social network clone.
- Review and update surfaces support trust and conversion.

Completed:

- Removed the generic personal post composer and its route/helper/hook/component; updates creation now stays on the club/staff composer path.
- Removed the generic `/rate-coach` chooser and its route/helper/hook/components; reviews now stay booking-linked through `review/[bookingId]`, with `review/create` acting only as a compatibility redirect when a booking is present.
- Removed the standalone `/community` group directory/create surface and its orphan cards/forms/tests while preserving `/community/[groupId]` for squad/private operational coordination.
- Removed deleted route entries from loading manifests, screenshot capture, UI story capture, and flow-check scripts.
- Kept feed, post detail, club post creation, public profiles, coach profiles, favourites, and booking-linked review surfaces for trust, proof, and conversion follow-up.

## `PRUNE-06` Hide Or Merge Post-Launch Settings And Analytics

Status: `READY`

Objective:

- Remove release blockers caused by nice-to-have settings and analytics depth.

Route scope:

- `app/settings/appearance.tsx`
- `app/settings/smart-slots.tsx`
- `app/settings/calendar-sync.tsx`
- `app/settings/travel-radius.tsx`
- `app/analytics/dashboard.tsx`
- `app/analytics/revenue.tsx`
- `app/analytics/[athleteId].tsx`
- `app/analytics/[athleteId]/goals.tsx`

Implementation notes:

- Keep travel radius and calendar sync if functional because they directly support discovery and scheduling.
- Move appearance/theme customization out of launch.
- Merge athlete analytics into development where possible.
- Prefer earnings/invoices over broad analytics dashboards.

Acceptance:

- Settings support real operations, trust, and account control.
- Analytics no longer creates a second product world.

## `PRUNE-VERIFY-01` Reduced Product Rehearsal

Status: `OPEN`

Objective:

- Verify the reduced app feels coherent and no deleted feature remains in navigation, docs, scripts, route manifest, or UI flow checks.

Validation:

- `npm run typecheck`
- `npm run test:compile`
- `npm run audit:loading-routes`
- `npm run ui:flows:preflight`
- `npm run ui:flows:coach-core`
- `npm run ui:flows:parent-core`
- `npm run ui:flows:athlete-core`
- `git diff --check`

Acceptance:

- Deleted features are gone from app routes, route helpers, and visible entry points.
- Kept/narrowed features still cover the protected product core.
- Discover Map is validated as a centerpiece discovery path.
- Remaining launch work can return to `UI-LOAD-05` through `PROD-VERIFY-01`.
