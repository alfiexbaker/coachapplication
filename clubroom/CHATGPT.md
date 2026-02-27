# CHATGPT.md - API / Backend Working Instructions for Clubroom

This file is for future AI-assisted work in this repository when the task touches backend/API design, contracts, auth, data model, or UI-to-API alignment.

It supplements (not replaces) `AGENTS.md` and should be read with:
- `/Users/tubton/Desktop/coachapplication/clubroom/docs/SOURCE_OF_TRUTH.md`
- `/Users/tubton/Desktop/coachapplication/clubroom/docs/newsprints/`
- `/Users/tubton/Desktop/coachapplication/clubroom/docs/backend-api/`

## Current Reality (important)
- Current app is frontend-first (Expo) with AsyncStorage-backed mock data via `services/api-client.ts`.
- No production backend API exists yet.
- Frontend conventions already matter and must shape the backend:
  - `Result<T, ServiceError>` pattern in `/Users/tubton/Desktop/coachapplication/clubroom/types/result.ts`
  - route builders in `/Users/tubton/Desktop/coachapplication/clubroom/navigation/routes.ts`
  - centralized storage keys in `/Users/tubton/Desktop/coachapplication/clubroom/constants/storage-keys.ts`
  - service cache/version/soft-delete patterns in `/Users/tubton/Desktop/coachapplication/clubroom/services/base-service.ts`
  - typed event names in `/Users/tubton/Desktop/coachapplication/clubroom/services/event-bus.ts`

## Non-negotiable Product / Trust Rules (captured from planning)
- Club leader access is delegated, never automatic.
- Coach-to-coach athlete note access is explicit share only.
- Parent + same child can exist across multiple clubs.
- No org->club hierarchy (clubs only).
- No hard delete for safeguarding/payment/audit records.
- Audit all actions/changes (and sensitive reads), with retention policies + cleanup jobs.

## Approved Backend Direction (working assumptions)
- API style: REST under `/v1`
- Runtime: Fastify + TypeScript
- DB: Postgres + Prisma
- Auth: Auth0 (EU/UK-friendly tenant), API-side authz in our code
- Storage: S3-compatible object storage (private buckets, signed URLs only)
- Contracts: shared `zod` schemas in monorepo package
- Deploy: same repo, separate `apps/mobile` and `apps/api` packages (monorepo migration)
- Payments: no in-app payments in v1 (reconciler/direct-to-coach), but future-ready
- Real-time phase 1: chat only
- Offline sync API: later (but all writes must be sync-safe now: idempotency + versions)

## How to Work on API Tasks in This Repo (order matters)
1. Read the relevant spine section in `/Users/tubton/Desktop/coachapplication/clubroom/docs/SOURCE_OF_TRUTH.md`.
2. Map the user request to real UI surfaces:
   - `app/**` routes
   - `components/**`
   - `services/**`
   - `navigation/routes.ts`
3. Identify impacted product spines (Community / Booking-Revenue / Development / Trust-Ops).
4. Define or update shared contracts first (request/response schemas, enums, error codes).
5. Define authz rules before endpoint handlers (role + delegation + resource grants + consent/verification gates).
6. Design DB writes for idempotency, concurrency, and auditability.
7. Add negative tests (authz deny, validation fail, conflict, duplicate submit).
8. Document UI-to-API mapping changes in `/Users/tubton/Desktop/coachapplication/clubroom/docs/backend-api/UI_API_BILATERAL_ALIGNMENT.md` or feature docs.

## API PR / Task Checklist (must pass)
- `Contract`: Request/response schemas are shared and versioned (`zod`), no ad-hoc JSON shapes.
- `AuthN`: JWT validation checks issuer, audience, expiry, signature.
- `AuthZ`: Endpoint has route-level gate + service-layer checks + repository filters.
- `Delegation`: Club admin/staff access to coach resources only via explicit grant.
- `Sharing`: Coach-to-coach private notes access only via explicit grant scope.
- `Idempotency`: Write endpoint enforces `X-Idempotency-Key`.
- `Concurrency`: Version check (`If-Version`/`If-Match-Version`) for conflict-prone writes.
- `Audit`: Write actions and sensitive reads emit audit events.
- `Security`: Rate limits assigned, object access uses signed URLs, malware scan path respected.
- `Data`: Money stored as integer minor units; timestamps are ISO-8601 UTC.
- `Errors`: Stable error code mapping; no raw DB/stack leaks to clients.
- `Tests`: Positive + negative + conflict/double-submit coverage.
- `Docs`: Endpoint added to route list + authz matrix + UI traceability.

## UI <-> API Bilateral Alignment Rules
Every API change must be traceable in both directions:
- UI flow -> endpoint(s) -> tables -> audit events
- Endpoint -> consuming screen(s)/component(s)/service(s)

Do not ship endpoints with no identified consumer unless the task explicitly creates platform/internal-only infra endpoints.
Do not modify UI payload shapes without updating shared contracts and affected screens/services.

## Deep Review Workflow (for "check every flow/component" requests)
Use the repo's existing audit tools and outputs. Do not rely on spot checks only.

Commands (from `/Users/tubton/Desktop/coachapplication/clubroom`):
- `npm run audit:architecture`
- `npm run audit:ui`
- `npm run ui:flows:list`
- `npm run ui:flows:run`
- `npm run ui:flows:coach`
- `npm run ui:flows:parent`
- `npm run ui:flows:athlete`

Artifacts to consult:
- `/Users/tubton/Desktop/coachapplication/clubroom/docs/audits/architecture-reachability-audit-2026-02-26.json`
- `/Users/tubton/Desktop/coachapplication/clubroom/docs/audits/component-reachability-2026-02-26.csv`
- `/Users/tubton/Desktop/coachapplication/clubroom/docs/audits/architecture-hardening-report-2026-02-26.md`
- `/Users/tubton/Desktop/coachapplication/clubroom/docs/UI_FLOW_CHECKS.md`

## Data and Identifier Rules (summary)
- Canonical human identity key: `user_id` (`usr_...`) for parent/coach/admin/staff roles.
- Athlete entity key: `athlete_id` (`ath_...`), optional linked `user_id` for self-managed athletes.
- Use prefixed string IDs (UUIDv7-based) across API resources for consistency with existing frontend string IDs.
- Never use email/phone as foreign keys or identity joins.

## What to Avoid
- Creating parallel flows that duplicate existing frontend services without mapping them.
- Returning Prisma/raw DB objects directly to the client.
- Embedding authz logic only in controllers.
- Public object storage URLs.
- Hard deletes for safeguarding/payment/audit records.
- Unversioned write endpoints or non-idempotent booking/invite/reconciler writes.

## When the Task Is Ambiguous
Default to documenting assumptions in the relevant backend doc and proceed with a reversible design. If a decision changes the authz model or data retention guarantees, stop and ask.
