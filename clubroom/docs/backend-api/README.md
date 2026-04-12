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
- The Expo app still supports mock and pre-API live modes.
- Shared contracts and governance sources already exist in the monorepo.
- Frontend and backend auth are now aligned on `/v1/auth/*` with JWT/session runtime handling in `apps/api`.
- Sentry is now wired across Expo native, Expo web, and `apps/api`, with release tagging plus sourcemap export/upload paths in the repo.
- The biggest unresolved seams are broader route-level authz coverage, trust-sensitive authority cleanup, and remaining launch-quality follow-through.

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

- `TECH_STACK.md`: runtime and infra choices
- `ARCHITECTURE_BLUEPRINT.md`: module boundaries and request lifecycle
- `DATA_MODEL_AND_IDENTIFIERS.md`: identifiers, tables, and data rules
- `AUTHZ_AUDIT_AND_SECURITY.md`: authz, grants, audit, and retention
- `API_CONTRACTS_ERRORS_AND_HANDLERS.md`: contract and handler conventions
- `UI_API_BILATERAL_ALIGNMENT.md`: how API work maps back to UI
- `ROUTE_INVENTORY_V1.md`: current and planned `/v1` endpoint inventory
- `PRE_API_LIVE_MODE_PLAYBOOK.md`: current mock/live-mode behavior and cutover notes
- `test-data/README.md`: fixture workflow

## Read Before Backend Work

- `CODEX.md`
- `CHATGPT.md`
- `docs/START_HERE.md`
- `docs/SOURCE_OF_TRUTH.md`
- `contracts/club-governance.ts`
- `navigation/routes.ts`
- `services/base-service.ts`
- `services/event-bus.ts`

## Useful Verification

- `npm --prefix apps/api run typecheck`
- `npm --prefix apps/api run test`
- `npm run typecheck`
- `npm run audit:architecture`
- role-specific UI flow runs when the API change affects user flows

If a script is blocked by missing local tooling, record that honestly.

## How To Keep This Pack Updated

When backend reality changes, update at least:
1. `ROUTE_INVENTORY_V1.md`
2. `UI_API_BILATERAL_ALIGNMENT.md`
3. the relevant deep doc for schema, authz, or runtime behavior
