# Risk Register

Date: 2026-04-01

## 1. Scaffold auth can still create a fake authenticated context

- Severity: Critical
- Why it matters: The API can still assign a default scaffold user and wide role set when no bearer token is present. That makes the current auth seam unsafe for any real environment and can hide authz bugs during development.
- Evidence: `apps/api/src/plugins/auth-placeholder.ts`, `docs/newsprints/sprints/BACKLOG.md`.
- Mitigation: Complete `AUTH-02` before spending more time on launch-polish work.

## 2. Trust-sensitive child data has split ownership

- Severity: Critical
- Why it matters: Medical and emergency data is backend-authoritative in one path and legacy app-owned in another. That creates drift risk, incomplete auditability, and unclear permission boundaries.
- Evidence: `services/family/family-health-service.ts`, `apps/api/src/modules/family-athlete/routes.ts`, `services/child-service.ts`, `app/(modal)/edit-child-profile.tsx`, `hooks/use-child-context.tsx`.
- Mitigation: Move all trust-sensitive child fields behind `/v1/athletes/*` and strip them out of the legacy child profile path.

## 3. Booking creation is still bypassable for delegated actors

- Severity: High
- Why it matters: The repo now presents booking creation as a single authoritative path, but delegated flows can still skip the API and create local-only bookings. That undermines trust, billing, and audit expectations.
- Evidence: `services/booking/booking-crud-service.ts`, `apps/api/src/modules/booking/routes.ts`, `services/invite/session-invite-service.ts`.
- Mitigation: Define delegated booking authz on the backend and delete the local fallback.

## 4. Launch-critical surfaces still look more real than they are

- Severity: High
- Why it matters: Schedule, events, progress, reviews, and storefront flows have enough UI depth to look done, but many still run on local storage, seed data, or legacy `/api/*` routes. That can mislead prioritization and QA.
- Evidence: `services/club-schedule-service.ts`, `services/event/event-rsvp-service.ts`, `services/event/event-attendance-service.ts`, `services/progress/progress-feedback-service.ts`, `services/progress/progress-goals-service.ts`, `services/analytics/analytics-query-service.ts`, `services/analytics/analytics-export-service.ts`, `services/analytics/analytics-tracking-service.ts`, `services/coach-service.ts`, `services/review-service.ts`, `hooks/use-coach-profile.ts`.
- Mitigation: Re-scope the month to backend-authoritative launch slices only and cut the rest.

## 5. No meaningful production observability

- Severity: High
- Why it matters: The app can pass local checks and still fail invisibly in production because Sentry is not actually wired across the client and API.
- Evidence: `app.config.ts`, `constants/config.ts`, `docs/newsprints/sprints/BACKLOG.md`.
- Mitigation: Ship `OBS-01` immediately after the auth seam or in parallel with a narrow owner.

## 6. Green checks can create false confidence

- Severity: Medium
- Why it matters: The current validation stack is real and useful, but it proves mostly compile-time and module-level seed behavior. It does not prove end-to-end frontend authority, launch auth, or production instrumentation.
- Evidence: `package.json`, `apps/api/package.json`, `npm run typecheck`, `npm run test:compile`, `npm --prefix apps/api run typecheck`, `npm --prefix apps/api run test`, `npm run audit:architecture`.
- Mitigation: Use the current checks as regressions gates, not as launch-readiness proof.

## 7. Route ownership is cleaner than UI ownership

- Severity: Medium
- Why it matters: `/v1` route coverage has improved, but several frontend surfaces still bypass the intended `services/api-client.ts` and route ownership ideals by calling `fetch('/api/*')` or local storage stores directly.
- Evidence: `services/child-service.ts`, `services/event/event-rsvp-service.ts`, `services/event/event-attendance-service.ts`, `services/analytics/analytics-query-service.ts`, `services/analytics/analytics-export-service.ts`, `services/analytics/analytics-tracking-service.ts`, `services/auth-service.ts`.
- Mitigation: Stop adding new launch work on legacy `/api/*` paths and convert only the month-critical surfaces.

## 8. Doc drift can still confuse execution

- Severity: Medium
- Why it matters: The live execution order is clear in `docs/newsprints/sprints/BACKLOG.md`, but older product-reality audits still exist and can be mistaken for current plan truth.
- Evidence: `docs/newsprints/sprints/BACKLOG.md`, `docs/newsprints/sprints/laststep.md`, `docs/product-reality/SPOND_MARKETPLACE_HOME_OF_FOOTBALL_AUDIT_2026-03-19.md`.
- Mitigation: Keep using `BACKLOG.md` and `laststep.md` as the execution tracker and treat older audits as historical context only.
