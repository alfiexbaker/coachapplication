# Backend API Documentation Pack

This folder captures the retained backend/API design docs that still match the current repo.

The goal is not to design an API in isolation.
The goal is to keep backend work traceable to:
- real routes in `app/`
- real components and hooks
- real service boundaries
- current product truth in `docs/SOURCE_OF_TRUTH.md`
- current club governance policy in `contracts/club-governance.ts`

## Current Reality

- A real Fastify API exists under `apps/api`.
- Normal Expo app runtime is API-first; retained mock branches are test-only scaffolding and pre-API live mode is retired.
- Shared contracts and governance sources already exist in the monorepo.
- Frontend and backend auth are now aligned on `/v1/auth/*` with JWT/session runtime handling in `apps/api`.
- Sentry is now wired across Expo native, Expo web, and `apps/api`, with release tagging plus sourcemap export/upload paths in the repo.
- The biggest unresolved seams are broader route-level grant coverage, live payment-provider cutover, and the remaining seed-only route migration required for full db-backed release cutover.

## Working Assumptions

- REST API under `/v1`
- Postgres + Prisma
- Fastify + TypeScript
- app-owned authz with delegated permissions and resource grants
- private object storage with signed URLs
- no in-app payments in v1
- no hard delete for safeguarding, payment, or audit records
- sensitive writes and reads must be auditable

## File Guide

- `ARCHITECTURE_BLUEPRINT.md`: module boundaries and request lifecycle
- `DATA_MODEL_AND_IDENTIFIERS.md`: identifiers, tables, and data rules
- `AUTHZ_AUDIT_AND_SECURITY.md`: authz, grants, audit, and retention
- `API_CONTRACTS_ERRORS_AND_HANDLERS.md`: contract and handler conventions
- `ROUTE_INVENTORY_V1.md`: current and planned `/v1` endpoint inventory
- `test-data/README.md`: fixture workflow

## Read Before Backend Work

- `CODEX.md`
- `docs/START_HERE.md`
- `docs/SOURCE_OF_TRUTH.md`
- `contracts/club-governance.ts`
- `navigation/routes.ts`
- `services/base-service.ts`
- `services/event-bus.ts`

## Useful Verification

- `npm --prefix apps/api run typecheck`
- `npm --prefix apps/api run test`
- `npm --prefix apps/api run release:preflight`
- `npm run typecheck`
- `npm run audit:architecture`
- role-specific UI flow runs when the API change affects user flows

If a script is blocked by missing local tooling, record that honestly.

## Release Guardrails

- `npm --prefix apps/api run release:preflight` is the production gate for API release builds.
- It uses the same runtime checks as `/v1/ready`, then adds release-only blockers such as missing Prisma migrations.
- `packages/db/prisma/migrations` is now checked in, and release preflight now runs under production semantics instead of development defaults.
- `npm run audit:db:stage:strict` validates staging env, connects to the configured Supabase/Postgres database, and checks applied Prisma migrations plus schema columns required by current `/v1` db-mode routes.
- `npm run launch:readiness` is the launch automation runner. It writes timestamped and latest reports under `reviews/`, runs the go-live gates (`audit:worktree:strict`, `verify:slice:full`, `audit:agentic`, `audit:db:stage:strict`, `smoke:password-reset-webhook`, `smoke:api-mode:strict`, `smoke:staging`, and `ui:flows:run`), starts local staging API/UI servers when needed, and records live payment-provider cutover as deferred while keeping simulated/manual money-state safety in scope.
- `npm run smoke:password-reset-webhook` validates that the configured password-reset email delivery provider accepts the release payload for a controlled smoke inbox. The current runtime supports the existing webhook provider, Brevo API provider, and SMTP provider config, and this provider smoke is a required launch-readiness gate.
- The current guardrail is intentionally red until production env, db connectivity, and object-storage config are present, and the remaining seed-only production routes are migrated or retired.
- Rollback rule: keep the previous API artifact and release identifier available, and treat any post-deploy non-ready `/v1/ready` response as a rollback signal before attempting manual data repair.

## How To Keep This Pack Updated

When backend reality changes, update at least:
1. `ROUTE_INVENTORY_V1.md`
2. the relevant deep doc for schema, authz, or runtime behavior
