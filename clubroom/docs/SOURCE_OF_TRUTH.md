# Clubroom Source Of Truth

Last updated: 2026-07-15
Purpose: the smallest durable truth map for Clubroom. If this conflicts with executable code, trust code and update this file.

## Product

Clubroom is a football-only operating system for paid football development.

The product loop is:

1. discover a trusted coach, club, squad, session, or activity
2. check eligibility, readiness, consent, safety, and availability
3. book or register
4. invoice, pay, reconcile, or refund through backend authority
5. deliver the session/activity
6. record attendance, feedback, proof, and trust evidence
7. rebook, continue, report, or escalate

Do not grow Clubroom into a generic football social app. Feeds, profiles, comments, matches, media, badges, and community only belong when they support booking, delivery, development proof, trust, coordination, or revenue.

## Runtime State

- Primary user surface: Expo Router app under `app/`.
- Backend: Fastify API under `apps/api`, registered under `/v1`.
- Shared packages: `packages/config`, `packages/db`, and `packages/shared-contracts`.
- Frontend data access goes through `services/api-client.ts`.
- Route ownership goes through `navigation/routes.ts`.
- Storage keys come from `constants/storage-keys.ts`.
- Club governance executable truth lives in `contracts/club-governance.ts` and `packages/shared-contracts/src/club/`.
- Clubroom V1 product truth is DB/API-backed: real product data belongs behind Fastify `/v1` contracts and the `db` backend, not local mock/demo mirrors.
- Normal app runtime is API-first. Retained mock compatibility is test-only scaffolding while remaining `/v1` cutover work is completed; do not add new mock-first product paths.
- Pre-API live mode is compatibility wiring only, not live product truth.
- Runtime `/v1` auth uses bearer JWT/session handling. Header identity override is test-harness only.
- Non-test API data backend defaults to `db`; seed/fixture paths are for explicit tests, import/bootstrap tooling, or named temporary seams only.
- Hosted payments and payout provider flows are still simulated behind backend provider boundaries. The app must not mark money state as paid from a client callback alone.
- Backend release readiness is guarded by `/v1/ready` and `npm --prefix apps/api run release:preflight`.
- Sentry wiring exists for Expo native/web and API release builds. Native app-hang tracking is disabled only in development clients to prevent simulator/debug noise; release builds retain app-hang monitoring. Production issue review and release rehearsal remain active work.

## Architecture Rules

- Add or change service behavior behind the existing service facade when one exists.
- Keep server-owned product data behind named `/v1` contracts in non-mock mode.
- For V1 product behavior, prefer a DB-backed `/v1` route before adding any mock/demo storage. If an API does not exist yet, fail closed, return an honest empty/no-op state, or record a named cutover task instead of inventing local authority.
- Mock/demo fixtures are allowed only for test harnesses, deterministic seed/import tooling, or unavoidable temporary provider gaps; they must not claim production success or become the source of truth.
- Keep `Result<T, ServiceError>` service flow unless the local service already uses a different established pattern.
- Do not add local-storage authority for trust-sensitive or money-sensitive data.
- Do not add parallel route strings when `navigation/routes.ts` should own the route.
- Do not add native `Alert.alert` or `Alert.prompt` to normal product flows.

## Sensitive Rules

- Default deny.
- Assignment controls visibility.
- Access is not transitive.
- Club membership alone does not grant coach-private, medical, safeguarding, or finance access.
- Assistant access is narrower than coach access unless explicitly widened.
- Sensitive reads, overrides, reassignments, escalations, money transitions, and safeguarding actions should be auditable.

## Current Product Priorities

1. Prove the paid development loop end to end in real API mode.
2. Finish backend-authoritative cutover for remaining trust, payment, booking, registration, and progress seams.
3. Tighten UI action quality: no dead controls, no fake success, no duplicated actions, no missing accessibility labels.
4. Keep docs thin. Put transient reviews under `reviews/`, not `docs/`.

## Canonical Docs

Start here:

1. `docs/START_HERE.md`
2. `docs/SOURCE_OF_TRUTH.md`
3. `docs/KNOWLEDGE_SPINE.md`
4. `docs/APP_REPORT.md` only for broad project status or PM review
5. exactly one task-specific deep doc

Deep docs:

- Runtime modes: `docs/architecture/runtime-modes.md`
- Service ownership: `docs/architecture/service-ownership-map.md`
- Entity model: `docs/architecture/entity-relationship-map.md`
- Club roles and permissions: `contracts/club-governance.ts`, then `docs/architecture/club-relationship-rules.md`
- Club schedule/activity model: `docs/architecture/club-activity-model.md`
- Auth, trust, and permissions: `docs/trust/auth-and-permission-boundaries.md`, then `docs/backend-api/AUTHZ_AUDIT_AND_SECURITY.md`
- UI loading/error/empty states: `docs/ui/loading-error-empty-state-matrix.md`
- API work: `docs/backend-api/README.md`, then `docs/backend-api/ROUTE_INVENTORY_V1.md`
- AI implementation loop: `docs/AI_DEVELOPMENT_PIPELINE.md`, `docs/templates/AI_TASK_PACKET.md`

## Non-Canonical Or Removed

Do not recreate docs for old audit dumps, dated product-reality packs, old sprint packs, or completed handoff reports. Use current code, the canonical docs above, and fresh review output under `reviews/`.

`docs/backend-api/test-data/marketplace` is fixture data used by code and tests, not planning prose.
