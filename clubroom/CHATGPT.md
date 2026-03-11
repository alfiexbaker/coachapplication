# CHATGPT.md - Backend And API Working Guide

Read this file when the task touches backend/API design, contracts, auth, data model, or UI-to-API alignment.

Read with:
- `CODEX.md`
- `docs/START_HERE.md`
- `docs/backend-api/README.md`
- `docs/backend-api/ROUTE_INVENTORY_V1.md`
- `contracts/club-governance.ts` when the task touches club roles or permissions

## Current Reality

- Clubroom is an Expo app with a real Fastify API under `apps/api`.
- The app still supports mock and pre-API runtime paths through `services/api-client.ts`.
- Shared contract and governance code already exists in:
  - `packages/shared-contracts/src/club/`
  - `contracts/club-governance.ts`
- The biggest integration gap is still the auth seam:
  - frontend auth client still expects `/api/auth/*`
  - backend runtime is built around `/v1/*`
  - API auth is scaffolded, not production-complete

Frontend conventions that backend work must respect:
- `Result<T, ServiceError>` in `types/result.ts`
- route builders in `navigation/routes.ts`
- centralized storage keys in `constants/storage-keys.ts`
- service patterns in `services/base-service.ts`
- typed events in `services/event-bus.ts`

## Non-Negotiable Product And Trust Rules

- Club leader access is delegated, never automatic.
- Coach-to-coach athlete note access is explicit share only.
- Parent plus same child can exist across multiple clubs.
- No org-to-club hierarchy beyond the current club model.
- No hard delete for safeguarding, payment, or audit records.
- Sensitive writes and reads must be auditable.

## Backend Direction In Force

- API style: REST under `/v1`
- Runtime: Fastify + TypeScript
- Data: Postgres + Prisma
- Auth: Auth0 or equivalent JWT provider, with app-owned authz
- Storage: private object storage with signed URLs only
- Contracts: shared `zod` schemas in the monorepo
- Deploy split: Expo/EAS for native, web separately, API as its own service
- Payments: no in-app rails in v1; current money truth is reconciler/direct-to-coach
- Real-time phase 1: chat only
- Writes must be idempotent and version-safe

## How To Work On API Tasks

1. Start with the real consumer surface:
   - `app/**`
   - `components/**`
   - `hooks/**`
   - `services/**`
   - `navigation/routes.ts`
2. Identify the impacted product spines.
3. Update shared contracts and policy definitions before handlers.
4. Define authz before persistence details.
5. Design writes for idempotency, conflict handling, and auditability.
6. Add negative tests:
   - authz deny
   - validation fail
   - duplicate submit
   - conflict
7. Update the API docs that survive this repo cleanup:
   - `docs/backend-api/ROUTE_INVENTORY_V1.md`
   - `docs/backend-api/UI_API_BILATERAL_ALIGNMENT.md`
   - relevant deep doc when data/authz rules change

## API Task Checklist

- `Contract`: shared schema, no ad-hoc payloads
- `AuthN`: issuer, audience, expiry, signature checks
- `AuthZ`: route gate plus service-layer enforcement
- `Delegation`: club admin/staff access only through explicit grants/policy
- `Sharing`: private athlete notes only through explicit share scope
- `Idempotency`: write endpoint has a real duplicate-submit strategy
- `Concurrency`: mutable resources have version/conflict handling
- `Audit`: sensitive writes and reads emit audit events
- `Security`: rate limits, signed object access, safe error responses
- `Data`: money in minor units, timestamps in ISO-8601 UTC
- `Tests`: positive plus negative coverage
- `Docs`: route inventory and UI/API mapping updated

## UI <-> API Alignment Rules

Every API change must be traceable in both directions:
- UI flow -> endpoint(s) -> data model -> audit implications
- endpoint -> consuming screens/hooks/services

Do not ship endpoints with no identified consumer unless they are explicitly platform/internal endpoints.
Do not change UI payload shapes without updating shared contracts and the affected frontend adapters.

## Review Workflow

For broad review requests, do not rely on spot checks.

Useful commands from repo root:
- `npm run audit:architecture`
- `npm run ui:flows:list`
- `npm run ui:flows:run`
- `npm run ui:flows:coach`
- `npm run ui:flows:parent`
- `npm run ui:flows:athlete`
- `npm --prefix apps/api run typecheck`
- `npm --prefix apps/api run test`

If a script depends on missing local tooling, treat it as blocked rather than green.

## Data And Identifier Rules

- Canonical human identity key: `user_id` (`usr_...`)
- Athlete entity key: `athlete_id` (`ath_...`)
- Use prefixed string IDs across API resources
- Never use email or phone as foreign keys

## What To Avoid

- Building backend flows that do not map to current UI or current governance policy
- Returning raw Prisma or DB records to clients
- Putting authz only in controllers
- Public object storage URLs
- Hard deletes for safeguarding/payment/audit data
- Non-idempotent booking, invite, or reconciler writes

## When Ambiguous

Default to a reversible design and document the assumption in the retained backend doc set.
If the decision changes authz, retention, or safeguarding guarantees, stop and ask.
