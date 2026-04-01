# 30-Day Plan

Date: 2026-04-01

This plan follows the current live execution order in `docs/newsprints/sprints/BACKLOG.md` and the explicit note in `docs/newsprints/sprints/laststep.md` to continue `AUTH-02` and `OBS-01` as the month-critical lane.

## Week 1: Close The Auth Seam

- Ship: Replace `apps/api/src/plugins/auth-placeholder.ts` with production-grade auth context validation and keep `/v1/auth/*` plus `/v1/me/sessions*` stable.
- Ship: Simplify `services/auth-service.ts` and `hooks/use-auth.tsx` so the app restores identity from one backend-authoritative path.
- Ship: Preserve local/dev seed usability through explicit dev tooling, not silent scaffold fallback.
- Evidence for priority: `docs/newsprints/sprints/BACKLOG.md`, `apps/api/src/plugins/auth-placeholder.ts`, `apps/api/src/modules/auth/routes.ts`.
- Can wait: auth UI polish, profile niceties, extra onboarding.

## Week 2: Fix Trust, Booking Authority, And Observability

- Ship: Move trust-sensitive child medical/emergency data off `services/child-service.ts` and into the `/v1/athletes/*` family-health path used by `services/family/family-health-service.ts`.
- Ship: Remove or proxy the medical/emergency fields in `app/(modal)/edit-child-profile.tsx`.
- Ship: Make every booking create path backend-authoritative, including guardian/delegated flows.
- Ship: `OBS-01` Sentry across Expo native, Expo web, and `apps/api` in parallel with these risky authority cutovers.
- Evidence for priority: `services/child-service.ts`, `app/(modal)/edit-child-profile.tsx`, `services/booking/booking-crud-service.ts`, `apps/api/src/modules/booking/routes.ts`, `app.config.ts`, `constants/config.ts`.
- Can wait: broader child-profile cosmetic cleanup, non-sensitive profile enhancements, storefront polish.

## Week 3: Make Schedule And Event Workspace Real

- Ship: A first authoritative club schedule read model to replace the app-composed `services/club-schedule-service.ts` path.
- Ship: `/v1` event RSVP and attendance ownership to replace `services/event/event-rsvp-service.ts` and `services/event/event-attendance-service.ts` legacy `/api/*` behavior.
- Ship: Keep recap handoff narrow; only publish what is backed by real event/attendance truth.
- Evidence for priority: `docs/newsprints/sprints/BACKLOG.md`, `services/club-schedule-service.ts`, `hooks/use-event-detail.ts`, `app/events/[id].tsx`.
- Can wait: calendar polish, extended community extras, non-critical event embellishments.

## Week 4: Narrow Conversion

- Ship: One honest launch storefront path: public coach profile, authoritative offerings, backend-validated review proof, and a real rebook loop.
- Ship: Decide whether club profile is in scope as public conversion or only as a member ops surface; cut the losing branch for this month.
- Evidence for priority: `docs/newsprints/sprints/BACKLOG.md`, `app.config.ts`, `constants/config.ts`, `app/coach/[id].tsx`, `hooks/use-coach-detail.ts`, `services/coach-service.ts`, `services/review-service.ts`.
- Can wait: broad analytics exports, generalized marketplace polish, non-authoritative trust badges.

## What Should Be Cut This Month

- Broad analytics modernization before the auth and trust seams are closed. Evidence: `services/analytics/analytics-query-service.ts`, `services/analytics/analytics-export-service.ts`, `services/analytics/analytics-tracking-service.ts`.
- Deep progress feature expansion before the frontend uses backend-authoritative progress reads. Evidence: `services/progress/progress-feedback-service.ts`, `services/progress/progress-goals-service.ts`, `hooks/use-my-progress.ts`, `apps/api/src/modules/wave2plus/routes.test.ts`.
- Large UI polish sweeps on schedule, events, or storefront surfaces that still rely on app-owned truth. Evidence: `services/club-schedule-service.ts`, `services/event/event-rsvp-service.ts`, `services/event/event-attendance-service.ts`, `services/coach-service.ts`.

## Success Condition At Day 30

Clubroom is “functional in a month” only if a signed-in user can authenticate through a launch-safe identity path, trust-sensitive family data has one authoritative owner, booking creation is fully backend-authoritative, at least one schedule/event flow is backed by `/v1`, and production failures are observable. Evidence baseline: `docs/newsprints/sprints/BACKLOG.md`, `apps/api/src/modules/auth/routes.ts`, `apps/api/src/modules/booking/routes.ts`, `apps/api/src/modules/family-athlete/routes.ts`.
