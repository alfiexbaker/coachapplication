# Sprint 00 - Foundation and Monorepo Scaffolding

## Goal
Establish the backend project skeleton, shared contracts package, database package, and CI gates without changing product behavior yet.

## Dependencies
- None

## Scope
- Workspace/monorepo setup (incremental, no forced mobile move yet)
- `apps/api` Fastify app scaffold
- `packages/shared-contracts` scaffold (`zod` + enums + error codes)
- `packages/db` scaffold (Prisma schema + migrations + generated client)
- `packages/config` env schemas
- Base logging, request ID, health endpoint, readiness endpoint
- Base CI jobs for API lint/typecheck/tests/migrations

## Codebase Alignment Anchors
- `package.json` (existing scripts)
- `docs/SOURCE_OF_TRUTH.md`
- `types/result.ts` (error/result mapping baseline)

## Tables / Schema (initial)
- `users` (minimal shape)
- `schema_migrations` (Prisma managed)
- no product tables yet beyond bootstrap if team wants smaller scope

## Endpoints (initial)
- `GET /v1/health`
- `GET /v1/ready`
- optional `GET /v1/meta/version`

## Security / Auth / Audit Gates
- Env validation required at boot
- Request ID middleware enabled
- Structured logging only (no raw console logs)
- Central error handler returns stable API error shape
- No secret values logged

## UI/API Alignment Checks
- None required for user flows yet, but document route versioning policy and contract package structure

## Test Gates
- API boots with valid env and fails fast with invalid env
- Health and readiness endpoints return expected schemas
- CI runs lint, typecheck, unit smoke tests, Prisma validate/migration check

## Exit Criteria
- Backend repo scaffold merged
- Contracts package and DB package available for Sprint 01+
- CI baseline passing
