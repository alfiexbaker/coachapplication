# Runtime Modes

Validated: 2026-04-16
Purpose: describe the app's actual runtime modes and the current integration seams between the Expo app and the API package.

## Canonical Sources

- `constants/config.ts`
- `services/api-client.ts`
- `services/auth-service.ts`
- `services/pre-api-live-mode-service.ts`
- `docs/backend-api/PRE_API_LIVE_MODE_PLAYBOOK.md`
- `packages/config/src/env.ts`
- `apps/api/src/app.ts`

## Mode 1: Mock Local-First

Flags:

- `EXPO_PUBLIC_USE_MOCK=true`

Behavior:

- Feature services read and write through `apiClient`.
- `apiClient` persists to AsyncStorage-backed storage in app mode.
- This is now an explicit compatibility/demo mode, not the default runtime direction.

Use when:

- validating UI flows
- working on explicitly demo-only behavior without backend dependency
- extending retained mock compatibility paths

## Mode 2: Pre-API Live

Flags:

- `EXPO_PUBLIC_USE_MOCK=true`
- `EXPO_PUBLIC_PRE_API_LIVE_MODE=true`
- `EXPO_PUBLIC_PRE_API_LIVE_SEED_ON_AUTH=true`

Behavior:

- Still mock-backed
- Adds relational seeding plus synthetic activity pulses
- Intended to make the app feel live without switching services to real HTTP

Use when:

- running demo-quality role flows
- validating marketplace feel before API cutover
- only by explicit opt-in; this is not the default runtime

## Mode 3: Real API

Flags:

- `EXPO_PUBLIC_USE_MOCK=false`
- `EXPO_PUBLIC_PRE_API_LIVE_MODE=false`

Target behavior:

- Frontend still goes through `apiClient`
- Reads and writes should hit the Fastify API instead of local persistence
- This is now the default runtime direction for app/API development.

## Validated Repo Reality

Current validated runtime state:

- `constants/config.ts` defaults `api.baseUrl` to `http://localhost:4000`
- `constants/config.ts` now defaults `api.useMock` to `false`
- `constants/config.ts` now defaults pre-API live mode to `false`
- `services/auth-service.ts` derives its API origin from that config and calls `/v1/auth/*`
- `packages/config/src/env.ts` defaults the API server to port `4000`
- `packages/config/src/env.ts` now defaults `API_DATA_BACKEND` to `db` outside `NODE_ENV=test`; API tests explicitly set `NODE_ENV=test API_DATA_BACKEND=seed`
- `apps/api/src/app.ts` registers `/v1/*` route modules, including auth
- `apps/api/src/plugins/auth-context.ts` verifies bearer JWTs at runtime, while header auth override is limited to the API test harness
- `apps/api/src/lib/auth-runtime.ts` owns JWT issuance, refresh rotation, and runtime session revocation for `/v1/auth/*` and `/v1/me/sessions*`
- `apps/api/src/lib/ops-runtime.ts` now owns production startup validation plus `/v1/ready` readiness evaluation for config, database, and object-storage state
- `npm --prefix apps/api run release:preflight` now uses the same ops runtime to fail release builds when production guardrails are not met
- Expo app config now defaults `web.output` to `single` for normal dev startup, and `npm run export:web` opts into `static` with `EXPO_WEB_OUTPUT=static`; local `expo start` no longer needs the static renderer unless explicitly requested
- Metro excludes root `.env*` files from the bundle graph. Staging env files are process inputs for Expo/API commands and smoke tooling, not app modules.
- `apiClient` keeps device/session runtime keys such as auth tokens, active child selection, offline queue, form drafts, and lightweight client preferences in local storage even when real API mode is enabled. Server-owned product data must use explicit `/v1` service endpoints; the old generic `/api/:key` storage bridge is blocked in API mode.
- Coach review legacy read-model keys are mock/demo compatibility only. Booking-linked review status and submission use `/v1/bookings/:bookingId/reviews/me` and `/v1/bookings/:bookingId/reviews`, and coach profile review tabs read verified public reviews from `/v1/coaches/:coachId/reviews`.
- Rebook entry from booking detail uses `/v1/bookings/:bookingId/rebook-context` in real API mode before creating a new local booking draft, so repeat-booking context is copied only from backend-visible booking truth.
- Saved coach/favourite reads and writes use `/v1/me/favourite-coaches*` in real API mode. Local `favourites` storage remains mock/demo-only and cannot target another user in API mode.
- Booking series and initial recurring-plan booking generation now use `/v1/booking-series` in real API mode for create, list/detail, and cancel. Local booking-series and recurring-plan storage remain mock-mode behavior, while unsupported recurring mutations fail closed until backend semantics are added.
- Event RSVP submission now posts to `/v1/events/:eventId/rsvp`; real `db` mode writes `EventRsvp` through Prisma and audits allowed and denied paths. Club event list reads can use `/v1/clubs/:clubId/schedule` projections, while event detail/create/publish/cancel/reminder, event attendance/check-in, and academy management actions fail closed until dedicated `/v1` authorities exist.
- Static web export uses `utils/runtime-environment.ts` to detect Expo static rendering. Local storage reads/writes become no-ops during static rendering, and constructor-time service hydration must be guarded because route-module evaluation happens before the browser runtime exists.

Implication:

- The auth transport seam is now contract-aligned for local development.
- Runtime `/v1` auth no longer accepts client-supplied identity headers in the app/server path.
- Runtime `/v1` auth is no longer using the temporary dev-session token model.
- Mock mode plus pre-API live mode remain explicit compatibility/demo modes.
- Backend `/v1` routes are real and API mode is the default direction, but broader endpoint migration and authz follow-through still need work before every retained surface is db-backed.
- Production server startup now fails fast on blocking config mistakes instead of booting with silent auth/payment misconfiguration.
- `/v1/ready` no longer returns placeholder `unknown` checks; it reports real `ready`, `degraded`, or `down` status and returns `503` when the runtime is not release-ready.
- Release preflight now runs under production semantics with checked-in Prisma migrations. The remaining blockers are real production env/db/storage requirements plus any still-unmigrated seed-only routes.

## Staging Readiness Tooling

Use `node ./scripts/db-staging-preflight.js` before switching a serious rehearsal to `API_DATA_BACKEND=db`.
The preflight loads `.env.staging.local` by default when present, without overriding already-exported shell variables.

The preflight checks:

- staging env requirements for database, JWT, simulated payment return origins, simulated payment secret, object storage, and Sentry warnings
- checked-in Prisma schema and migration presence
- local tool availability for API tests, root typecheck, Prettier, and Expo

Use `node ./scripts/db-staging-preflight.js --strict` as the hard gate once the staging environment values are expected to exist.
Use `node ./scripts/db-staging-preflight.js --write` to write transient outputs under `reviews/`.

For API-mode staging startup, start Fastify with the same staging env the app and smoke runner use: `npm --prefix apps/api run dev:staging` or `npm run api:dev:staging`.
The canonical staging command is intentionally non-watch so readiness smoke does not depend on local file-watcher limits.
Use `npm --prefix apps/api run dev:staging:watch` only when active API editing needs reload behavior and the local OS watcher limit can support it.
Use `npm run smoke:api-mode` before starting Expo in API mode. It loads `.env.staging.local`, confirms `EXPO_PUBLIC_USE_MOCK=false`, and verifies the configured Fastify API responds at `/v1/ready`.
If the configured API URL is a LAN address, the API must bind to `API_HOST=0.0.0.0`; otherwise loopback can respond while the app-configured origin still fails.
Use `npm run smoke:api-mode:strict` before release-ready staging rehearsal; strict mode requires `/v1/ready` to report `ready`, not merely reachable.

Use `npm run smoke:staging` after migrations and seed import are applied to prove the db-backed API path against the configured staging Supabase project.
The smoke run loads `.env.staging.local` when present and verifies bearer auth, identity, coach profile/offerings, bookable slots, direct booking creation, invoice generation, simulated payment confirmation, family/athlete sensitive reads, group-session creation/registration, private signed upload/readback, and community/media read surfaces.
It treats `SENTRY_DSN_MISSING` as a warning because that is an external release credential, but fails on database, object-storage, auth, booking, payment, family, or media route drift.

## Safe Working Rules

1. Do not bypass `apiClient` in feature code.
2. When touching auth or API URL config, update both the app-side config and the API package assumptions together.
3. When switching a flow from mock to real API, keep the service contract stable and move the source of truth behind the service boundary.
4. Use `EXPO_PUBLIC_USE_MOCK=true` and `API_DATA_BACKEND=seed` only as explicit demo/test compatibility opt-ins.
