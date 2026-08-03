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
- The remaining release seams are the account-owner Supabase default-grant cleanup, production scanner supervision, authenticated native-device proof, and Sentry issue/sourcemap readback. Payments and payouts remain intentionally simulated until provider adapters and webhooks are selected.

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
- `apps/api/package-lock.json` is the provider-neutral API release lock. A deployment build context must include `apps/api` and `packages/{config,db,shared-contracts}`, then run `npm ci` from `apps/api`; `apps/api/.npmrc` packages those local libraries instead of depending on workstation symlinks, and `postinstall` generates Prisma plus compiled ESM/declaration outputs for all three local packages. Production `start` and `worker:upload-scan` run the compiled artifact with plain Node; `tsx` is development/test-only and can be removed by the production dependency prune. Node 20 is required. The root Expo `package-lock.json` remains separate.
- It uses the same runtime checks as `/v1/ready`, then adds release-only blockers such as missing Prisma migrations.
- `packages/db/prisma/migrations` is now checked in, and release preflight now runs under production semantics instead of development defaults.
- `npm run audit:db:stage:strict` validates staging env, checks owner-only permissions for local secret artifacts such as `.env*.local` and generated `TEST_ACCOUNTS*.txt`, connects to the configured Supabase/Postgres database, and checks applied Prisma migrations plus schema columns required by current `/v1` db-mode routes.
- `npm run launch:readiness` is the launch automation runner. It writes timestamped and latest reports under `reviews/`, runs the go-live gates (`audit:worktree:strict`, `verify:slice:full`, `audit:agentic`, `audit:db:stage:strict`, `smoke:password-reset-webhook`, `smoke:sentry:ingestion`, `smoke:api-mode:strict`, `smoke:staging`, and `ui:flows:run`), and starts local staging API, upload-scanner, and UI processes when needed. A reachable but non-ready API does not satisfy setup: scanner-only readiness failure starts a managed real scanner worker, while any other readiness failure stops the gate. The runner owns worker teardown and records live payment-provider cutover as deferred while keeping simulated/manual money-state safety in scope.
- `npm run smoke:password-reset-webhook` validates that the configured password-reset email delivery provider accepts the release payload for a controlled smoke inbox. The current runtime supports the existing webhook provider, Brevo API provider, and SMTP provider config, and this provider smoke is a required launch-readiness gate.
- `npm run smoke:sentry:ingestion` sends a tagged, PII-free API exception to the configured Sentry DSN and requires a successful ingestion HTTP response, a matching event ID, and an SDK flush. Its JSON result includes the non-secret event ID so a scoped read token can fetch that exact event instead of relying on eventually consistent issue search. It loads `.env.staging.local` by default and refuses production unless `--allow-production` or `SENTRY_SMOKE_ALLOW_PRODUCTION=1` is explicit. Ingestion alone does not prove release readback or sourcemap symbolication; those still require the separate Sentry API evidence.
- API source-map upload uses `SENTRY_API_PROJECT` when configured and falls back to `SENTRY_PROJECT` only for single-project installations. Keep `SENTRY_PROJECT` pointed at the Expo/React Native project when mobile and Fastify events use separate Sentry projects; the API DSN and `SENTRY_API_PROJECT` must identify the same backend project.
- `npm --prefix apps/api run sentry:sourcemaps` loads non-empty Sentry release settings from root `.env.staging.local` and `.env.local` without shell evaluation, while preserving explicitly exported process values. It injects debug IDs and uploads a validated artifact bundle; the token needs release upload authority, while issue/event readback additionally needs read-only `project:read` and `event:read` scopes.
- Until a real payment/payout adapter and webhook contract is implemented, release-style staging must set `API_PAYMENT_PROVIDER=simulated` explicitly; simulated completion routes remain API-owned and wire no real funds.
- Production media uploads require `API_UPLOAD_SCAN_RESULT_TOKEN` so trusted scanner callbacks can record `/v1/uploads/:uploadSessionId/scan-result` without using human admin credentials; missing scanner callback config keeps `/v1/ready` down.
- Deploy the API and `npm run worker:upload-scan` as separate continuously supervised processes from the same locked `apps/api` artifact after migrations are applied. The local launch runner supervises both only for release rehearsal; it is not production process supervision. On `SIGINT` or `SIGTERM`, the API stops accepting work, drains Fastify, disconnects Prisma, and flushes Sentry once; a 10-second timeout exits non-zero for supervisor replacement. The scanner independently stops claiming work, releases its heartbeat, and disconnects Prisma. The worker requires `DATABASE_URL`, private S3-compatible storage credentials, the callback token, fresh ClamAV definitions, and standalone `clamscan`; `API_UPLOAD_SCAN_DATABASE_DIR` may point at an explicit definitions directory. `clamdscan` is rejected until its daemon limits and stream behavior are deployed and proven. Startup and hourly revalidation prove definition freshness, a clean file, and the harmless EICAR detection file before more work is claimed. Transient Postgres reachability and connection-pool timeout errors retry with capped exponential backoff while the heartbeat expires and `/v1/ready` fails closed; non-connectivity errors still terminate for supervisor intervention, and one-shot rehearsals stop after three retries. The worker publishes a short database readiness heartbeat, upload URLs sign the exact byte count, declared MIME must match file magic, expired leases are reclaimable, exhausted/crashed attempts terminate as audited rejection, and clean bytes move to server-only sealed keys. Immediate staging deletion is best effort; a durable cleanup lease starts after URL expiry plus `API_UPLOAD_STAGING_CLEANUP_GRACE_MS` (24 hours by default), retries storage failures with audit diagnostics, and rejects abandoned expired uploads. Use `npm run api:scan:staging -- --once` for a one-batch rehearsal and `npm run api:scan:prove:staging` for signed-size, crash-recovery, ClamAV, MIME/magic, sealed-object, read-only polling, callback, replay, completion, cleanup, and database proof.
- The production guardrail remains red until production environment, database, and object-storage configuration are present, the scanner is supervised by the hosting runtime, and the owner-controlled Supabase and Sentry gates pass.
- Rollback rule: keep the previous API artifact and release identifier available, and treat any post-deploy non-ready `/v1/ready` response as a rollback signal before attempting manual data repair.

## How To Keep This Pack Updated

When backend reality changes, update at least:
1. `ROUTE_INVENTORY_V1.md`
2. the relevant deep doc for schema, authz, or runtime behavior
