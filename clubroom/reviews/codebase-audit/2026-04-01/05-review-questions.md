# Review Questions

Date: 2026-04-01

## 1. What does “functional in a month” mean operationally?

- Question: Is the target a private seeded beta, a limited production pilot, or a public launch?
- Why this matters: Seed-backed API slices may be acceptable for an internal beta but not for a real launch.
- Evidence: `apps/api/src/modules/p0-core/dual-mode-smoke.test.ts`, `docs/newsprints/sprints/BACKLOG.md`.

## 2. What is the intended backend authz rule for delegated booking creation?

- Question: Should guardians be able to create bookings for athletes when `bookedByUserId !== authUserId`, and if so under what exact relationship checks?
- Why this matters: The current mismatch between backend enforcement and frontend fallback is a real authority gap.
- Evidence: `apps/api/src/modules/booking/routes.ts`, `services/booking/booking-crud-service.ts`.

## 3. Should the child profile modal keep any medical or emergency fields?

- Question: Is `app/(modal)/edit-child-profile.tsx` supposed to become non-sensitive only, or should it proxy the `/v1/athletes/*` family-health endpoints?
- Why this matters: Keeping both models alive will preserve drift and audit risk.
- Evidence: `app/(modal)/edit-child-profile.tsx`, `services/child-service.ts`, `services/family/family-health-service.ts`.

## 4. Which coach surface is the intended launch home?

- Question: Should coaches land on development, schedule, or bookings at launch?
- Why this matters: `app/(tabs)/index.tsx` currently routes coaches to `CoachDevelopmentScreen`, which may not match the month-critical launch path.
- Evidence: `app/(tabs)/index.tsx`, `docs/newsprints/sprints/BACKLOG.md`.

## 5. Is the club profile a public conversion surface or a member ops surface for launch?

- Question: Does `LAUNCH-04` require a true public club storefront, or is the current member-heavy club detail screen sufficient for the month?
- Why this matters: The answer changes whether `app/club/[id].tsx` is a polish target or a scope cut.
- Evidence: `app/club/[id].tsx`, `hooks/use-club-detail.ts`, `docs/newsprints/sprints/BACKLOG.md`.

## 6. What should count as a “verified” review?

- Question: Is a linked `bookingId` enough, or must review proof be derived from a real backend booking record plus ownership checks?
- Why this matters: Current review proof is based on app-owned assumptions, not backend verification.
- Evidence: `services/review-service.ts`, `services/review-sync-service.ts`, `services/coach-service.ts`.

## 7. Should `OBS-01` wait until after launch surfaces move to `/v1`, or run in parallel?

- Question: Is Sentry a separate immediate lane with a dedicated owner, or is it blocked on finishing auth and authority work first?
- Why this matters: The backlog says `OBS-01` is next, but the repo still lacks meaningful instrumentation today.
- Evidence: `docs/newsprints/sprints/BACKLOG.md`, `docs/newsprints/sprints/laststep.md`, `app.config.ts`, `constants/config.ts`.

## 8. Which historical docs should now be treated as stale context?

- Question: Should older product-reality audits be explicitly marked historical so engineers stop reading them as active execution plans?
- Why this matters: The live execution tracker is clear, but the repo still contains older audit narratives that can dilute focus.
- Evidence: `docs/newsprints/sprints/BACKLOG.md`, `docs/newsprints/sprints/laststep.md`, `docs/product-reality/SPOND_MARKETPLACE_HOME_OF_FOOTBALL_AUDIT_2026-03-19.md`.

## 9. Do we want to audit root UI-flow scripts as part of the next pass?

- Question: Should the next audit require `npm run ui:flows:preflight` or a narrower role-specific flow script in addition to compile and API tests?
- Why this matters: Current green checks are useful, but they still leave frontend-to-backend launch seams unverified.
- Evidence: `package.json`, `npm run typecheck`, `npm run test:compile`, `npm --prefix apps/api run test`.
