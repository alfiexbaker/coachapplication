# Clubroom - Single Source of Truth

Last updated: 2026-03-18
Project: football coaching marketplace plus family development tracker
Status: live-featured Expo app with a real Fastify API alongside it; backend cutover and auth alignment are still in progress

## What This File Is For

This is the top-level reality doc.
It should answer:
- what the product is
- what runtime state the repo is really in
- which docs still matter
- what the highest-risk gaps are

If a statement here conflicts with an old audit or sprint note, trust this file unless current code proves otherwise.

## Current Verified Health

Verified during recent `API-01` slices on 2026-03-18:
- `npm run typecheck` -> PASS
- `npm run test:compile` -> PASS
- `npm --prefix apps/api run typecheck` -> PASS
- `npm --prefix apps/api run test` -> PASS (`29/29`)

Not re-run in this pass:
- full UI flow suites
- UI audit scripts that depend on local tool availability

## Product In One Paragraph

Clubroom is a football-only multi-role product for coaches, families, athletes, and clubs.
Coaches run availability, sessions, invites, delivery, and earnings workflows.
Parents book for children and manage trust-sensitive data such as medical, consent, and emergency information.
Athletes track progress, goals, health, and session follow-up.
Clubs manage staff, squads, visibility, and operating relationships.

## Runtime Truth

- The primary user surface is still the Expo app.
- The app can still run in mock and pre-API live modes through `services/api-client.ts`.
- A real Fastify API exists under `apps/api` and exposes `/v1` routes.
- Shared governance and contract code exists in:
  - `contracts/club-governance.ts`
  - `packages/shared-contracts/src/club/`
- Auth transport is now aligned for local development:
  - frontend auth calls `/v1/auth/*`
  - backend runtime exposes matching `/v1/auth/*` routes
  - bearer dev-session tokens are accepted by the API auth plugin
- The biggest trust seam still not finished is production identity:
  - API auth is still scaffold-first and seed-backed
  - family medical, safeguarding incident creation, and booking cancellation now use `/v1` in non-mock mode
  - booking creation/reschedule authority and wider trust/ops workflows are still not backend-authoritative by default

## Product Spines

1. Community and Growth
2. Booking, Availability and Revenue
3. Development and Analytics
4. Trust, Safety and Operations

Use these spines to classify work and avoid building duplicate flows.

## Role Truth

Coach:
- manages availability, session setup, invites, delivery, roster, clubs, and earnings-facing flows

Parent:
- manages children, bookings, consent, medical and emergency information, progress visibility, and family spending

Athlete:
- books for self, tracks goals, health, badges, journal entries, and progress

Club:
- manages membership, staffing, squads, branded identity, role visibility, and delegated operating control

## Architecture Truth

- Data access in the app should go through `services/api-client.ts`.
- Route ownership should go through `navigation/routes.ts`.
- Storage keys should come from `constants/storage-keys.ts`.
- Service error flow should use `Result<T, ServiceError>`.
- Club permissions should come from `contracts/club-governance.ts`, not ad-hoc role maps.
- Current invite and family entrypoints are:
  - `services/invite/index.ts`
  - `services/family/index.ts`

## What Is Real Versus Transitional

Real enough to build on:
- large role-based Expo surface
- consolidated service layer
- shared club governance contract
- testable Fastify API runtime

Still transitional:
- auth and session contract between app and API
- authoritative backend ownership for booking creation/change flows and broader trust/ops data
- observability across app plus API
- some local audit scripts that depend on missing shell tooling

## Highest-Value Priorities

1. Unify frontend auth and backend `/v1` authz.
2. Finish backend-authoritative cutover for the remaining sensitive domains, especially booking creation/change flows and trust/ops follow-through.
3. Wire Sentry across Expo native, Expo web, and `apps/api`.
4. Make repo-critical quality scripts honest when local tooling is missing.
5. Keep docs thin and update them when runtime truth changes.

## Canonical Docs

Read in this order:
1. `docs/START_HERE.md`
2. `docs/KNOWLEDGE_SPINE.md`
3. One deep doc that matches the task

Use these deep docs selectively:
- `docs/architecture/runtime-modes.md`
- `docs/architecture/service-ownership-map.md`
- `docs/architecture/entity-relationship-map.md`
- `docs/architecture/club-relationship-rules.md`
- `docs/trust/auth-and-permission-boundaries.md`
- `docs/ui/loading-error-empty-state-matrix.md`
- `docs/backend-api/README.md`
- `docs/product-reality/README.md`
- `docs/newsprints/README.md`

## What Was Removed

Old sprint packs, dated audit dumps, and duplicate planning stacks were intentionally deleted.
Do not resurrect them by adding new references to:
- deleted `docs/audits/*`
- deleted old sprint folders
- deleted one-off audit markdown files at repo root

Keep the doc set small and current.
