# Backend API Documentation Pack (Codebase-Aligned)

This folder captures the backend/API blueprint for Clubroom and ties it to the current frontend codebase.

The goal is not just to design an API in isolation. The goal is to make backend work systematically traceable to:
- actual routes in `app/`
- actual UI components in `components/`
- actual service/domain boundaries in `services/`
- product intent in `docs/SOURCE_OF_TRUTH.md`
- bug/flow history in `docs/newsprints/`

## Why this exists now
Clubroom currently runs as a frontend MVP with AsyncStorage persistence and no backend API. These docs define a secure, low-cost, production-ready backend path that preserves current product behavior and improves correctness (authz, audit, retention, idempotency, conflict handling).

## Working Assumptions Locked In
- REST API with typed shared contracts (`zod`) in same monorepo
- Postgres + Prisma
- Fastify + TypeScript
- Auth0 for authn; API-owned authz (RBAC + delegated permissions + resource grants)
- S3-compatible private object storage with signed URLs
- `/v1` versioning from day one
- Internal-only API in phase 1
- Chat is the only real-time feature in phase 1
- No in-app payments in v1 (reconciler/direct-to-coach), future payment integration preserved
- No hard delete for safeguarding/payment/audit records
- Global append-only audit trail for actions/changes + sensitive reads

## File Guide
- `TECH_STACK.md`: cost-conscious secure infra + runtime choices
- `ARCHITECTURE_BLUEPRINT.md`: modular monolith, package layout, domain boundaries, request lifecycle
- `DATA_MODEL_AND_IDENTIFIERS.md`: tables, relationships, PK/FK conventions, ID strategy, data format standards
- `AUTHZ_AUDIT_AND_SECURITY.md`: RBAC + delegated grants + resource sharing + audit/retention model
- `API_CONTRACTS_ERRORS_AND_HANDLERS.md`: contracts, endpoint patterns, handlers, error taxonomy, drift prevention
- `UI_API_BILATERAL_ALIGNMENT.md`: how to keep backend changes aligned to UI routes/components/services/flows
- `ROUTE_INVENTORY_V1.md`: planned `/v1` endpoint inventory with contract/authz/UI anchors
- `traceability/booking-revenue-v1.md`: first concrete UI<->API traceability matrix (booking/revenue)
- `SPRINT_PLAN_OVERVIEW.md`: backend build plan with sequencing and gates
- `sprints/`: detailed sprint-by-sprint implementation docs

## Codebase Anchors (read before backend design work)
- `/Users/tubton/Desktop/coachapplication/clubroom/docs/SOURCE_OF_TRUTH.md`
- `/Users/tubton/Desktop/coachapplication/clubroom/types/result.ts`
- `/Users/tubton/Desktop/coachapplication/clubroom/navigation/routes.ts`
- `/Users/tubton/Desktop/coachapplication/clubroom/constants/storage-keys.ts`
- `/Users/tubton/Desktop/coachapplication/clubroom/services/base-service.ts`
- `/Users/tubton/Desktop/coachapplication/clubroom/services/event-bus.ts`

## Existing Audit Infrastructure (use it)
From `package.json`, these scripts already support systematic review:
- `npm run audit:architecture`
- `npm run audit:ui`
- `npm run ui:flows:list`
- `npm run ui:flows:run`
- role-specific UI flow runs (`coach`, `parent`, `athlete`)

Treat these as pre-backend alignment tools. They reduce the risk of implementing endpoints that do not map to real screens or miss critical flows.

## How to Keep This Pack Updated
When adding/changing backend design decisions, update at least:
1. `ARCHITECTURE_BLUEPRINT.md` or `DATA_MODEL_AND_IDENTIFIERS.md` (if schema/domain changes)
2. `AUTHZ_AUDIT_AND_SECURITY.md` (if permissions/access patterns change)
3. `UI_API_BILATERAL_ALIGNMENT.md` (if UI/API mapping changes)
4. relevant `sprints/sprint-XX.md` (if plan sequencing/scope changes)

## Future Monorepo Target (planned)
This repo is currently single-app. The backend plan assumes migration toward:
- `apps/mobile` (current Expo app)
- `apps/api` (Fastify service)
- `packages/shared-contracts` (`zod` DTOs + enums + error codes)
- `packages/db` (Prisma schema/migrations/client)
- `packages/authz` (policies/grant evaluation)
- `packages/config` (env schemas / config)
