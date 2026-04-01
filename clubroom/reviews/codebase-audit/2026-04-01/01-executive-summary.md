# Clubroom Codebase Audit

Date: 2026-04-01

## Where We Are Now

Clubroom is functional enough for local and seeded development across a few core seams, but it is not launch-safe yet. The strongest current slices are the new `/v1` auth/session lifecycle and `/v1` invite authority. `/v1` family-health has real route and service coverage, but it still relies on scaffold-first auth and client-supplied auth headers, so it is not yet a fully trustworthy launch seam. The biggest gap is that the app still mixes those improving backend seams with scaffold-first auth, legacy `/api/*` reads and writes, and app-owned local-storage flows on launch-critical surfaces such as child health edits, events, progress, reviews, and storefront conversion. Evidence: `apps/api/src/modules/auth/routes.ts`, `apps/api/src/modules/identity/routes.ts`, `apps/api/src/modules/booking/routes.ts`, `apps/api/src/modules/family-athlete/routes.ts`, `apps/api/src/plugins/auth-placeholder.ts`, `services/family/family-health-service.ts`, `services/child-service.ts`, `services/event/event-rsvp-service.ts`, `services/event/event-attendance-service.ts`, `services/progress/progress-feedback-service.ts`, `services/coach-service.ts`.

The repo is in better shape than the old planning implied: root typecheck passed, root test compile passed, API typecheck passed, API tests passed (`39/39`), and the architecture audit passed on 2026-04-01. Evidence: `npm run typecheck`, `npm run test:compile`, `npm --prefix apps/api run typecheck`, `npm --prefix apps/api run test`, `npm run audit:architecture`.

## What Is Working

- Dev-session bearer login, refresh, logout, revoke, `/v1/auth/me`, and `/v1/me/sessions*` are working in local/dev reality. Evidence: `apps/api/src/modules/auth/routes.ts`, `apps/api/src/modules/identity/routes.ts`, `apps/api/src/modules/auth/routes.test.ts`, `apps/api/src/modules/p0-core/routes.test.ts`.
- `/v1` invite reads and writes are closed for create/list/detail/respond/cancel/remind/dismiss, and direct invite acceptance creates bookings on the backend path. Evidence: `apps/api/src/modules/booking/routes.ts`, `services/invite/session-invite-authority-service.ts`, `services/invite/session-invite-service.ts`, `app/session-invites/index.tsx`, `app/session-invites/[id].tsx`, `apps/api/src/modules/p0-core/routes.test.ts`.
- Guardian and verified-coach family health access control is implemented on `/v1` for injuries, medical, emergency contacts, and consents in scaffold/dev reality. Evidence: `apps/api/src/modules/family-athlete/routes.ts`, `services/family/family-health-service.ts`, `apps/api/src/modules/family-athlete/routes.test.ts`, `apps/api/src/plugins/auth-placeholder.ts`.
- Role entry is coherent enough for seeded usage, and the updates screen has an honest empty state instead of a dead control. Evidence: `app/(tabs)/index.tsx`, `app/(tabs)/feed.tsx`.

## What Is Done

- The local/dev auth session lifecycle slice is done enough to support real bearer-session testing, but not enough for production identity. Evidence: `apps/api/src/modules/auth/routes.ts`, `apps/api/src/plugins/auth-placeholder.ts`, `docs/newsprints/sprints/BACKLOG.md`.
- Invite authority is done for the listed `/v1` operations and is ahead of the broader booking-authority seam. Evidence: `apps/api/src/modules/booking/routes.ts`, `services/invite/session-invite-authority-service.ts`.
- The backend now has route-level trust checks for family-health reads and writes, even though persistence is still seed-backed and request auth is still scaffold-first. Evidence: `apps/api/src/modules/family-athlete/routes.ts`, `apps/api/src/modules/family-athlete/routes.test.ts`, `apps/api/src/plugins/auth-placeholder.ts`.

## Biggest Blockers To “Functional In A Month”

- `AUTH-02` is still the real blocker. `auth-placeholder` falls back to scaffold headers and even a default scaffold user when no bearer token is present, which is not launch-safe. Evidence: `apps/api/src/plugins/auth-placeholder.ts`, `docs/newsprints/sprints/BACKLOG.md`.
- Trust-sensitive child profile data is split across two ownership models: `/v1/athletes/*` for family health and legacy `/api/children` plus local profile editing for allergies, medical conditions, and emergency contacts. Evidence: `services/child-service.ts`, `app/(modal)/edit-child-profile.tsx`, `hooks/use-child-context.tsx`, `services/family/family-health-service.ts`.
- Booking creation is not consistently authoritative yet. Delegated create can still skip the API and create a local booking shadow. Evidence: `services/booking/booking-crud-service.ts`, `apps/api/src/modules/booking/routes.ts`.
- Launch surfaces for schedule, events, progress, reviews, and storefront conversion still depend on local storage or legacy `/api/*` routes. Evidence: `services/club-schedule-service.ts`, `services/event/event-rsvp-service.ts`, `services/event/event-attendance-service.ts`, `services/progress/progress-feedback-service.ts`, `services/progress/progress-goals-service.ts`, `services/analytics/analytics-query-service.ts`, `services/analytics/analytics-export-service.ts`, `services/analytics/analytics-tracking-service.ts`, `services/coach-service.ts`, `services/review-service.ts`.
- `OBS-01` is still open because Sentry is only present as config/env wiring, not as meaningful app or API instrumentation. Evidence: `app.config.ts`, `constants/config.ts`, `docs/newsprints/sprints/BACKLOG.md`.

## Top 5 Recommended Next Moves

1. Finish `AUTH-02`: replace `auth-placeholder`, remove scaffold-header fallback, and make frontend auth flow through one backend-authoritative path. Evidence: `apps/api/src/plugins/auth-placeholder.ts`, `services/auth-service.ts`, `hooks/use-auth.tsx`, `docs/newsprints/sprints/BACKLOG.md`.
2. Collapse trust-sensitive child profile ownership into `/v1` family-health endpoints and remove medical/emergency writes from `child-service`. Evidence: `services/child-service.ts`, `app/(modal)/edit-child-profile.tsx`, `services/family/family-health-service.ts`.
3. Close booking authority by forcing every create path, including delegated guardian flows, through backend authz. Evidence: `services/booking/booking-crud-service.ts`, `apps/api/src/modules/booking/routes.ts`.
4. Make `LAUNCH-01` and `LAUNCH-02` real by moving schedule, RSVP, attendance, and recap-adjacent flows off legacy `/api` and app-local state. Evidence: `docs/newsprints/sprints/BACKLOG.md`, `services/club-schedule-service.ts`, `services/event/event-rsvp-service.ts`, `services/event/event-attendance-service.ts`, `hooks/use-event-detail.ts`.
5. Wire `OBS-01` before polishing storefront conversion, because the app currently has no meaningful production error visibility. Evidence: `docs/newsprints/sprints/BACKLOG.md`, `app.config.ts`, `constants/config.ts`.
