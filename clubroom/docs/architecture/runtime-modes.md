# Runtime Modes

Validated: 2026-03-11
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
- This is still the default operational mode for most frontend behavior.

Use when:

- validating UI flows
- working on local product behavior without backend dependency
- extending existing mock-backed services

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

## Mode 3: Real API

Flags:

- `EXPO_PUBLIC_USE_MOCK=false`
- `EXPO_PUBLIC_PRE_API_LIVE_MODE=false`

Target behavior:

- Frontend still goes through `apiClient`
- Reads and writes should hit the Fastify API instead of local persistence

## Validated Repo Reality

Current validated runtime state:

- `constants/config.ts` defaults `api.baseUrl` to `http://localhost:4000`
- `services/auth-service.ts` derives its API origin from that config and calls `/v1/auth/*`
- `packages/config/src/env.ts` defaults the API server to port `4000`
- `apps/api/src/app.ts` registers `/v1/*` route modules, including auth
- `apps/api/src/plugins/auth-placeholder.ts` accepts bearer dev-session tokens and legacy scaffold headers

Implication:

- The auth transport seam is now contract-aligned for local development.
- Mock mode plus pre-API live mode is still the stable default for non-auth app flows.
- Backend `/v1` routes are real, but production auth and broader endpoint migration still need follow-through before the API becomes the default app runtime.

## Safe Working Rules

1. Do not bypass `apiClient` in feature code.
2. When touching auth or API URL config, update both the app-side config and the API package assumptions together.
3. When switching a flow from mock to real API, keep the service contract stable and move the source of truth behind the service boundary.
